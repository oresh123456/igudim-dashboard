"""Extract candidate DML statements from plpgsql/sql object definitions.

Generic: no assumptions about naming or schema — only that objects are
Postgres procs/functions (pg_get_functiondef output) or views (plain SELECT).
"""
from __future__ import annotations

import re

from .models import EtlStatement, SourceObject

# Statements worth auditing (things that move rows into a target).
_DML_START = re.compile(
    r"\b(INSERT\s+INTO|MERGE\s+INTO|UPDATE\s+|DELETE\s+FROM|"
    r"CREATE\s+(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?TABLE\s+[^;]+?\s+AS\b)",
    re.IGNORECASE,
)

_DOLLAR_BODY = re.compile(r"AS\s+(\$[A-Za-z_]*\$)(.*)\1", re.IGNORECASE | re.DOTALL)

# plpgsql dynamic SQL — statically unauditable, must surface as UNPARSED,
# never be silently skipped.
_DYNAMIC = re.compile(r"\bEXECUTE\b", re.IGNORECASE)


def extract_body(definition: str) -> str:
    """Return the dollar-quoted body of a pg_get_functiondef output, else the text as-is."""
    m = _DOLLAR_BODY.search(definition)
    return m.group(2) if m else definition


def _split_statements(body: str) -> list[str]:
    """Split on semicolons outside single quotes and dollar quotes."""
    parts: list[str] = []
    buf: list[str] = []
    i, n = 0, len(body)
    in_squote = False
    dollar_tag: str | None = None
    while i < n:
        ch = body[i]
        if dollar_tag:
            if body.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
        elif in_squote:
            if ch == "'":
                in_squote = False
        elif ch == "'":
            in_squote = True
        elif ch == "$":
            m = re.match(r"\$[A-Za-z_]*\$", body[i:])
            if m:
                dollar_tag = m.group(0)
                buf.append(dollar_tag)
                i += len(dollar_tag)
                continue
        elif ch == "-" and body.startswith("--", i):
            j = body.find("\n", i)
            i = n if j == -1 else j
            continue
        elif ch == ";":
            parts.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        parts.append("".join(buf))
    return parts


def extract_statements(obj: SourceObject) -> list[EtlStatement]:
    """Return one EtlStatement per candidate DML statement found in the object.

    A segment that contains a DML keyword is trimmed to start at that keyword
    (drops plpgsql prefixes like `IF ... THEN`). Parsing happens later; here we
    only locate candidates so nothing DML-shaped is silently skipped.
    """
    if obj.kind in ("view", "matview"):
        sql = obj.definition.strip().rstrip(";")
        return [EtlStatement(obj=obj, index=0, sql=sql, target=obj.full_name)]

    body = extract_body(obj.definition)
    out: list[EtlStatement] = []
    idx = 0
    for seg in _split_statements(body):
        m = _DML_START.search(seg)
        dm = _DYNAMIC.search(seg)
        if dm and (m is None or dm.start() < m.start()):
            # EXECUTE precedes any DML keyword => the DML text is inside a
            # dynamic-SQL string, not a static statement.
            out.append(
                EtlStatement(
                    obj=obj, index=idx, sql=seg.strip(),
                    error="dynamic SQL (EXECUTE) — cannot audit statically, review manually",
                )
            )
            idx += 1
        elif m:
            sql = seg[m.start():].strip()
            out.append(EtlStatement(obj=obj, index=idx, sql=sql))
            idx += 1
    return out
