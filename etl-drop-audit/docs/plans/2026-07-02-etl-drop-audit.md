# etl-drop-audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generic Postgres silent-drop auditor — discovers ETL procs/views from catalogs, parses them, classifies drop-points, runs read-only audit SQL, emits a single-file HTML DAG report.

**Architecture:** Python CLI, pipeline of pure stages: `discover → plsql-extract → analyze (sqlglot) → classify → audit_sql → runner → graph → report`. Only `db/discover/runner` touch the DB (read-only enforced at session level); everything else is pure functions over strings/ASTs — unit-testable without a DB.

**Tech Stack:** Python ≥3.11, psycopg 3 (`psycopg[binary]`), sqlglot (postgres dialect), python-dotenv, pytest. No JS deps — report SVG is generated in Python.

## Global Constraints

- **Genericity (hard rule from spec):** no hardcoded schema/table/proc names, no naming-convention assumptions (`sp_*`, `mrr_/stg_/dwh_`). Everything from catalogs + parsed SQL. Schema filter = CLI arg.
- **Read-only:** connection opts `-c default_transaction_read_only=on`, `conn.read_only = True`; runner never issues DML.
- **Never silently skip:** any statement that looks like DML but can't be parsed → UNPARSED list in report.
- **Timeouts:** `statement_timeout` from `--timeout` (default 60s); a timed-out audit = status TIMEOUT, run continues.
- **Hebrew/PII:** report UTF-8, `dir="auto"` on data cells; `--limit-sample 0` = counts-only.
- Repo = `C:\Users\or.bar\Desktop\igudim_DB`, all paths below relative to `etl-drop-audit/`. Commit prefix `etl-drop-audit:`.
- Run tests from `etl-drop-audit/` with `python -m pytest tests/ -v`.

## File Structure

```
etl-drop-audit/
  pyproject.toml
  .gitignore                 (.env, __pycache__, *.html)
  .env.example
  README.md
  src/etl_drop_audit/
    __init__.py
    __main__.py              python -m etl_drop_audit
    models.py                dataclasses shared by all stages
    plsql.py                 plpgsql body → candidate DML statements + suspects
    analyze.py               DML text → EtlStatement (sqlglot AST, target, selects)
    classify.py              EtlStatement → DropPoint list (5 classes)
    audit_sql.py             DropPoint/select AST → audit SQL strings
    graph.py                 statements → table DAG + topo layers
    report.py                results → report.html string
    db.py                    read-only connection + fetch helpers
    discover.py              catalog queries → SourceObject list
    runner.py                execute audit SQL → AuditResult list
    cli.py                   argparse + orchestration
  tests/
    fixtures/real_procs.json (copy of the 3-proc dump)
    test_plsql.py
    test_analyze.py
    test_classify.py
    test_audit_sql.py
    test_graph.py
    test_report.py
    test_discover.py
    test_runner.py
    test_cli.py
```

---

### Task 1: Scaffold + models

**Files:**
- Create: `pyproject.toml`, `.gitignore`, `.env.example`, `src/etl_drop_audit/__init__.py`, `src/etl_drop_audit/models.py`
- Test: `tests/test_models.py`

**Interfaces:**
- Produces: dataclasses `SourceObject(schema,name,kind,definition)`, `EtlStatement(obj,index,sql,target,ast,error)`, `JoinInfo(right_alias,right_table_sql,join_type,condition_sql,keys)`, `DropPoint(id,kind,obj_name,target,description,audit_queries)`, `AuditResult(drop_point,counts,samples,status,error)`. All later tasks import from `etl_drop_audit.models`.

- [ ] **Step 1: Write the failing test**

`tests/test_models.py`:
```python
from etl_drop_audit.models import (
    SourceObject, EtlStatement, JoinInfo, DropPoint, AuditResult,
)


def test_models_construct():
    obj = SourceObject(schema="public", name="sp_x", kind="procedure", definition="...")
    st = EtlStatement(obj=obj, index=0, sql="INSERT INTO t SELECT 1", target="t")
    j = JoinInfo(right_alias="r", right_table_sql='"public"."b"', join_type="LEFT",
                 condition_sql="a.k = r.k", keys=[("a.k", "r.k")])
    dp = DropPoint(id="sp_x:0:join0:OUTER_TO_INNER", kind="OUTER_TO_INNER",
                   obj_name="sp_x", target="t", description="d")
    res = AuditResult(drop_point=dp)
    assert st.error is None and st.ast is None
    assert dp.audit_queries == {}
    assert res.status == "OK" and res.counts == {} and res.samples == []
    assert j.keys[0] == ("a.k", "r.k")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'etl_drop_audit'`

- [ ] **Step 3: Write scaffold + implementation**

`pyproject.toml`:
```toml
[project]
name = "etl-drop-audit"
version = "0.1.0"
description = "Generic Postgres ETL silent-row-drop auditor (read-only)"
requires-python = ">=3.11"
dependencies = [
    "psycopg[binary]>=3.1",
    "sqlglot>=25.0",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
pythonpath = ["src"]
```

`.gitignore`:
```
.env
__pycache__/
*.pyc
*.egg-info/
report*.html
.pytest_cache/
```

`.env.example`:
```
PGHOST=localhost
PGPORT=5432
PGDATABASE=
PGUSER=
PGPASSWORD=
```

`src/etl_drop_audit/__init__.py`: empty file.

`src/etl_drop_audit/models.py`:
```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SourceObject:
    """A proc/function/view pulled from the catalog."""
    schema: str
    name: str
    kind: str  # 'procedure' | 'function' | 'view'
    definition: str

    @property
    def qualified_name(self) -> str:
        return f"{self.schema}.{self.name}"


@dataclass
class EtlStatement:
    """One DML statement extracted from a SourceObject."""
    obj: SourceObject
    index: int
    sql: str
    target: str | None = None       # qualified target table SQL
    ast: Any | None = None          # sqlglot Expression, None if unparsed
    error: str | None = None        # set -> UNPARSED in report

    @property
    def id(self) -> str:
        return f"{self.obj.qualified_name}:{self.index}"


@dataclass
class JoinInfo:
    right_alias: str                # alias (or name) of the joined relation
    right_table_sql: str | None     # real table SQL if exp.Table, else None
    join_type: str                  # 'INNER'|'LEFT'|'RIGHT'|'FULL'|'CROSS'
    condition_sql: str
    keys: list[tuple[str, str]] = field(default_factory=list)  # (left_col, right_col)


@dataclass
class DropPoint:
    id: str
    kind: str  # INNER_JOIN | OUTER_TO_INNER | NULL_KEY | WHERE_FILTER | FANOUT
    obj_name: str
    target: str | None
    description: str
    audit_queries: dict[str, str] = field(default_factory=dict)  # label -> SQL


@dataclass
class AuditResult:
    drop_point: DropPoint
    counts: dict[str, int | None] = field(default_factory=dict)
    samples: list[dict] = field(default_factory=list)
    status: str = "OK"  # OK | TIMEOUT | ERROR
    error: str | None = None

    @property
    def dropped(self) -> int:
        """Headline number for sorting/coloring: max of drop-ish counts."""
        vals = [v for k, v in self.counts.items()
                if v is not None and k.startswith(("dropped", "null_key", "dup_"))]
        return max(vals, default=0)
```

- [ ] **Step 4: Install + run test to verify it passes**

Run: `python -m pip install -e ".[dev]"` then `python -m pytest tests/test_models.py -v`
Expected: PASS (1 test)

- [ ] **Step 5: Copy fixture + commit**

Copy `..\קבצים טכניים\_SELECT_p_proname_pg_get_functiondef_p_oid_AS_definition_FROM_pg_202606181507.json` to `tests/fixtures/real_procs.json`.

```bash
git add etl-drop-audit
git commit -m "etl-drop-audit: scaffold + models"
```

---

### Task 2: plsql.py — extract DML from plpgsql bodies

**Files:**
- Create: `src/etl_drop_audit/plsql.py`
- Test: `tests/test_plsql.py`

**Interfaces:**
- Produces: `extract_body(definition: str) -> str`; `split_statements(body: str) -> list[str]`; `dml_statements(definition: str) -> tuple[list[str], list[str]]` returning `(dml, suspects)` — `suspects` = chunks containing DML keywords that didn't match a known shape (report as UNPARSED, never dropped).
- Consumes: nothing (pure).

- [ ] **Step 1: Write the failing test**

`tests/test_plsql.py`:
```python
import json
import pathlib

from etl_drop_audit.plsql import extract_body, split_statements, dml_statements

FIXTURES = pathlib.Path(__file__).parent / "fixtures"


def load_real_procs() -> dict[str, str]:
    raw = json.loads((FIXTURES / "real_procs.json").read_text(encoding="utf-8"))
    rows = next(iter(raw.values()))  # DBeaver export: {query: [rows]}
    return {r["proname"]: r["definition"] for r in rows}


def test_extract_body_dollar_quoted():
    d = "CREATE PROCEDURE f()\nAS $procedure$\nBEGIN\nINSERT INTO t SELECT 1;\nEND;\n$procedure$"
    body = extract_body(d)
    assert "INSERT INTO t" in body
    assert "CREATE PROCEDURE" not in body


def test_split_ignores_semicolons_in_strings_and_parens():
    body = "INSERT INTO t SELECT 'a;b', (SELECT max(x) FROM u); DELETE FROM q;"
    stmts = split_statements(body)
    assert len(stmts) == 2
    assert stmts[0].startswith("INSERT")
    assert stmts[1].startswith("DELETE")


def test_dml_statements_real_proc_with_join():
    procs = load_real_procs()
    dml, suspects = dml_statements(procs["sp_stg_aa_dim_teams"])
    assert len(dml) == 1
    assert "left join mrr_aa_new_supportrequests" in dml[0].lower()
    assert suspects == []


def test_dml_skips_truncate_raise_diagnostics():
    procs = load_real_procs()
    dml, _ = dml_statements(procs["sp_dwh_aa_dim_teams"])
    assert len(dml) == 1
    assert dml[0].upper().startswith("INSERT")


def test_dml_inside_if_block_is_found():
    d = ("AS $x$ BEGIN IF v_year > 2020 THEN "
         "INSERT INTO t SELECT * FROM s; END IF; END; $x$")
    dml, suspects = dml_statements(d)
    assert len(dml) == 1 and dml[0].startswith("INSERT")


def test_undetected_dml_shape_becomes_suspect():
    d = "AS $x$ BEGIN EXECUTE 'INSERT INTO ' || tbl || ' SELECT 1'; END; $x$"
    dml, suspects = dml_statements(d)
    assert dml == []
    assert len(suspects) == 1  # dynamic SQL -> surfaced, not silently skipped
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_plsql.py -v`
Expected: FAIL — `ModuleNotFoundError`/`ImportError` on `etl_drop_audit.plsql`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/plsql.py`:
```python
"""Extract candidate DML statements from plpgsql definitions.

Never silently skip: chunks containing DML keywords that don't match a
recognized statement shape are returned as `suspects`.
"""
from __future__ import annotations

import re

_DOLLAR = re.compile(r"\$[A-Za-z_0-9]*\$")
_COMMENT_LINE = re.compile(r"^\s*--[^\n]*\n", re.MULTILINE)
_DML_START = re.compile(
    r"^(INSERT\s+INTO|CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\b.*?\bAS\b|"
    r"UPDATE\b|DELETE\s+FROM|MERGE\b|SELECT\b.*?\bINTO\b)",
    re.IGNORECASE | re.DOTALL,
)
_DML_ANYWHERE = re.compile(r"\b(INSERT|UPDATE|DELETE|MERGE)\b", re.IGNORECASE)
# plpgsql control-flow prefixes to peel before checking for DML
_PREFIX = re.compile(
    r"^\s*(BEGIN|LOOP|ELSE|END\s+IF|END\s+LOOP|"
    r"IF\b.*?\bTHEN|ELSIF\b.*?\bTHEN|WHILE\b.*?\bLOOP|FOR\b.*?\bLOOP)\s+",
    re.IGNORECASE | re.DOTALL,
)
# statements that are noise, not data flow
_NOISE = re.compile(
    r"^\s*(TRUNCATE|RAISE|GET\s+DIAGNOSTICS|DECLARE|RETURN|COMMIT|ROLLBACK|"
    r"PERFORM|CALL|SET|ANALYZE|VACUUM|CREATE\s+INDEX|DROP)\b",
    re.IGNORECASE,
)


def extract_body(definition: str) -> str:
    """Return the dollar-quoted body of a proc/function, else input unchanged."""
    m = _DOLLAR.search(definition)
    if not m:
        return definition
    tag = m.group(0)
    start = m.end()
    end = definition.find(tag, start)
    return definition[start:end] if end != -1 else definition[start:]


def split_statements(body: str) -> list[str]:
    """Split on top-level semicolons (outside single-quotes and parens)."""
    stmts: list[str] = []
    buf: list[str] = []
    depth = 0
    in_squote = False
    i, n = 0, len(body)
    while i < n:
        ch = body[i]
        if in_squote:
            buf.append(ch)
            if ch == "'":
                if i + 1 < n and body[i + 1] == "'":
                    buf.append("'")
                    i += 1
                else:
                    in_squote = False
        elif ch == "'":
            in_squote = True
            buf.append(ch)
        elif ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth = max(depth - 1, 0)
            buf.append(ch)
        elif ch == ";" and depth == 0:
            if "".join(buf).strip():
                stmts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
        i += 1
    if "".join(buf).strip():
        stmts.append("".join(buf).strip())
    return stmts


def _clean(stmt: str) -> str:
    """Strip comment lines and peel plpgsql control-flow prefixes."""
    s = _COMMENT_LINE.sub("", stmt).strip()
    while True:
        m = _PREFIX.match(s)
        if not m:
            return s
        s = s[m.end():].strip()


def dml_statements(definition: str) -> tuple[list[str], list[str]]:
    """Return (recognized DML statements, suspect chunks)."""
    dml: list[str] = []
    suspects: list[str] = []
    for raw in split_statements(extract_body(definition)):
        s = _clean(raw)
        if not s:
            continue
        if _DML_START.match(s):
            dml.append(s)
        elif _NOISE.match(s):
            continue
        elif _DML_ANYWHERE.search(s):
            suspects.append(s)
    return dml, suspects
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_plsql.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/plsql.py etl-drop-audit/tests/test_plsql.py
git commit -m "etl-drop-audit: plsql statement extraction (suspects never dropped)"
```

---

### Task 3: analyze.py — sqlglot parse → EtlStatement + joins

**Files:**
- Create: `src/etl_drop_audit/analyze.py`
- Test: `tests/test_analyze.py`

**Interfaces:**
- Consumes: `plsql.dml_statements`, `models.*`.
- Produces:
  - `analyze_object(obj: SourceObject) -> list[EtlStatement]` — parses each DML (views wrapped as `INSERT INTO <view> <definition>` surrogate so views get a target); parse failure → `EtlStatement.error` set.
  - `main_select(ast) -> sqlglot.exp.Select | None` — the top-level SELECT of Insert/Create/Select.
  - `driving_table(select) -> tuple[str, str]` — `(table_sql, alias)` of the FROM relation.
  - `joins_of(select) -> list[JoinInfo]`.

- [ ] **Step 1: Write the failing test**

`tests/test_analyze.py`:
```python
import sqlglot

from etl_drop_audit.analyze import analyze_object, driving_table, joins_of, main_select
from etl_drop_audit.models import SourceObject

PROC = SourceObject(
    schema="public", name="sp_test", kind="procedure",
    definition="""
CREATE OR REPLACE PROCEDURE public.sp_test() LANGUAGE plpgsql AS $procedure$
BEGIN
  TRUNCATE TABLE public.tgt;
  INSERT INTO public.tgt (a, b)
  SELECT t.a, r.b
  FROM src_main t
  LEFT JOIN src_lookup r ON t.k = r.k
  WHERE r.k IS NOT NULL;
END;
$procedure$""",
)


def test_analyze_object_extracts_target_and_ast():
    stmts = analyze_object(PROC)
    assert len(stmts) == 1
    st = stmts[0]
    assert st.error is None
    assert "tgt" in st.target
    assert st.ast is not None


def test_main_select_and_driving_table():
    st = analyze_object(PROC)[0]
    sel = main_select(st.ast)
    table_sql, alias = driving_table(sel)
    assert "src_main" in table_sql
    assert alias == "t"


def test_joins_of_left_join_with_keys():
    st = analyze_object(PROC)[0]
    j = joins_of(main_select(st.ast))
    assert len(j) == 1
    assert j[0].join_type == "LEFT"
    assert j[0].right_alias == "r"
    assert "src_lookup" in j[0].right_table_sql
    assert j[0].keys == [("t.k", "r.k")]


def test_view_gets_view_name_as_target():
    v = SourceObject(schema="public", name="v_x", kind="view",
                     definition="SELECT a.x FROM a JOIN b ON a.i = b.i")
    stmts = analyze_object(v)
    assert len(stmts) == 1
    assert stmts[0].error is None
    assert "v_x" in stmts[0].target
    assert len(joins_of(main_select(stmts[0].ast))) == 1


def test_unparseable_dml_marked_error():
    bad = SourceObject(schema="public", name="sp_bad", kind="procedure",
                       definition="AS $x$ BEGIN INSERT INTO t SELECT FROM WHERE; END; $x$")
    stmts = analyze_object(bad)
    assert len(stmts) == 1
    assert stmts[0].error is not None


def test_default_join_is_inner():
    v = SourceObject(schema="public", name="v_y", kind="view",
                     definition="SELECT a.x FROM a JOIN b ON a.i = b.i")
    j = joins_of(main_select(analyze_object(v)[0].ast))
    assert j[0].join_type == "INNER"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_analyze.py -v`
Expected: FAIL — import error on `etl_drop_audit.analyze`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/analyze.py`:
```python
from __future__ import annotations

import sqlglot
from sqlglot import exp

from . import plsql
from .models import EtlStatement, JoinInfo, SourceObject

DIALECT = "postgres"


def analyze_object(obj: SourceObject) -> list[EtlStatement]:
    if obj.kind == "view":
        # surrogate INSERT so views carry a target like procs do
        candidates = [f'INSERT INTO "{obj.schema}"."{obj.name}" {obj.definition}']
        suspects: list[str] = []
    else:
        candidates, suspects = plsql.dml_statements(obj.definition)

    out: list[EtlStatement] = []
    for i, sql in enumerate(candidates):
        st = EtlStatement(obj=obj, index=i, sql=sql)
        try:
            tree = sqlglot.parse_one(sql, read=DIALECT)
            st.ast = tree
            st.target = _target_of(tree)
        except Exception as e:  # sqlglot raises ParseError and friends
            st.error = f"parse error: {e}"
        out.append(st)
    for j, s in enumerate(suspects):
        out.append(EtlStatement(obj=obj, index=len(candidates) + j, sql=s,
                                error="unrecognized DML shape (dynamic SQL?)"))
    return out


def _target_of(tree: exp.Expression) -> str | None:
    if isinstance(tree, exp.Insert):
        t = tree.this
        if isinstance(t, exp.Schema):  # INSERT INTO tbl (cols...)
            t = t.this
        return t.sql(dialect=DIALECT) if t is not None else None
    if isinstance(tree, exp.Create):
        return tree.this.sql(dialect=DIALECT) if tree.this is not None else None
    if isinstance(tree, (exp.Update, exp.Delete, exp.Merge)):
        return tree.this.sql(dialect=DIALECT) if tree.this is not None else None
    return None


def main_select(tree: exp.Expression) -> exp.Select | None:
    if isinstance(tree, exp.Select):
        return tree
    inner = tree.args.get("expression")
    if isinstance(inner, exp.Select):
        return inner
    if isinstance(inner, exp.Subquery) and isinstance(inner.this, exp.Select):
        return inner.this
    return None


def driving_table(select: exp.Select) -> tuple[str, str]:
    """(table_sql, alias) of the FROM relation. alias falls back to name."""
    from_ = select.args.get("from")
    rel = from_.this
    if isinstance(rel, exp.Table):
        table_sql = rel.sql(dialect=DIALECT)
        alias = rel.alias_or_name
        # strip alias from table_sql if present ("src_main AS t" -> "src_main")
        bare = rel.copy()
        bare.set("alias", None)
        return bare.sql(dialect=DIALECT), alias
    return rel.sql(dialect=DIALECT), rel.alias_or_name


def joins_of(select: exp.Select) -> list[JoinInfo]:
    infos: list[JoinInfo] = []
    for j in select.args.get("joins", []):
        side = (j.side or "").upper()
        kind = (j.kind or "").upper()
        join_type = side or kind or "INNER"
        if join_type == "OUTER":
            join_type = side or "FULL"
        rel = j.this
        right_alias = rel.alias_or_name
        right_table_sql = None
        if isinstance(rel, exp.Table):
            bare = rel.copy()
            bare.set("alias", None)
            right_table_sql = bare.sql(dialect=DIALECT)
        cond = j.args.get("on")
        keys: list[tuple[str, str]] = []
        if cond is not None:
            for eq in cond.find_all(exp.EQ):
                l, r = eq.left, eq.right
                if isinstance(l, exp.Column) and isinstance(r, exp.Column):
                    # normalize so the right-alias column is second
                    if l.table == right_alias and r.table != right_alias:
                        l, r = r, l
                    keys.append((l.sql(dialect=DIALECT), r.sql(dialect=DIALECT)))
        infos.append(JoinInfo(
            right_alias=right_alias,
            right_table_sql=right_table_sql,
            join_type=join_type,
            condition_sql=cond.sql(dialect=DIALECT) if cond is not None else "",
            keys=keys,
        ))
    return infos
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_analyze.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Run real-fixture regression + commit**

Add to `tests/test_analyze.py`:
```python
from tests.test_plsql import load_real_procs


def test_real_proc_stg_aa_dim_teams_parses():
    procs = load_real_procs()
    obj = SourceObject(schema="public", name="sp_stg_aa_dim_teams",
                       kind="procedure", definition=procs["sp_stg_aa_dim_teams"])
    stmts = analyze_object(obj)
    parsed = [s for s in stmts if s.error is None]
    assert len(parsed) == 1
    sel = main_select(parsed[0].ast)
    js = joins_of(sel)
    assert js[0].join_type == "LEFT"
    assert js[0].keys == [("t.support_request_code", "r.support_request_code")]
```
Note: if `from tests.test_plsql import ...` fails, add empty `tests/__init__.py`.

Run: `python -m pytest tests/ -v` → all PASS.

```bash
git add etl-drop-audit/src/etl_drop_audit/analyze.py etl-drop-audit/tests
git commit -m "etl-drop-audit: sqlglot analyze stage (targets, driving table, joins)"
```

---

### Task 4: classify.py — the 5 drop classes

**Files:**
- Create: `src/etl_drop_audit/classify.py`
- Test: `tests/test_classify.py`

**Interfaces:**
- Consumes: `analyze.main_select/driving_table/joins_of`, `models.*`.
- Produces: `classify_statement(st: EtlStatement) -> list[DropPoint]` — DropPoint ids formatted `"{st.id}:join{n}:{KIND}"` / `"{st.id}:where:WHERE_FILTER"`. `audit_queries` left empty (filled by Task 5).

Classification rules (generic, framework of record):
- `INNER_JOIN`: join_type INNER — unmatched driving rows dropped.
- `OUTER_TO_INNER`: LEFT (or RIGHT) join + WHERE references a column of the outer-side alias with any predicate other than `IS NULL` — outer join silently behaves as inner.
- `NULL_KEY`: any equi-join — driving-side key NULLs can never match (one DropPoint per join having keys).
- `WHERE_FILTER`: statement has a WHERE — rows excluded by filter (emitted once per statement; overlaps OUTER_TO_INNER by design, description says so).
- `FANOUT`: any equi-join whose right side is a real table — duplicate right-side keys inflate rows.

- [ ] **Step 1: Write the failing test**

`tests/test_classify.py`:
```python
from etl_drop_audit.analyze import analyze_object
from etl_drop_audit.classify import classify_statement
from etl_drop_audit.models import SourceObject


def stmt_of(sql: str):
    obj = SourceObject(schema="public", name="v_t", kind="view", definition=sql)
    return analyze_object(obj)[0]


def kinds(sql: str) -> set[str]:
    return {dp.kind for dp in classify_statement(stmt_of(sql))}


def test_inner_join_flagged():
    k = kinds("SELECT a.x FROM a JOIN b ON a.i = b.i")
    assert "INNER_JOIN" in k
    assert "OUTER_TO_INNER" not in k


def test_left_join_alone_not_flagged_as_drop():
    k = kinds("SELECT a.x FROM a LEFT JOIN b ON a.i = b.i")
    assert "INNER_JOIN" not in k and "OUTER_TO_INNER" not in k
    assert "NULL_KEY" in k and "FANOUT" in k


def test_outer_to_inner_where_not_null():
    k = kinds("SELECT a.x FROM a LEFT JOIN b ON a.i = b.i WHERE b.i IS NOT NULL")
    assert "OUTER_TO_INNER" in k


def test_outer_to_inner_where_equality():
    k = kinds("SELECT a.x FROM a LEFT JOIN b ON a.i = b.i WHERE b.status = 'ok'")
    assert "OUTER_TO_INNER" in k


def test_anti_join_is_null_not_flagged():
    k = kinds("SELECT a.x FROM a LEFT JOIN b ON a.i = b.i WHERE b.i IS NULL")
    assert "OUTER_TO_INNER" not in k


def test_where_filter_flagged():
    k = kinds("SELECT a.x FROM a WHERE a.year > 2020")
    assert k == {"WHERE_FILTER"}


def test_straight_copy_no_droppoints():
    assert kinds("SELECT a.x FROM a") == set()


def test_droppoint_ids_are_stable():
    dps = classify_statement(stmt_of(
        "SELECT a.x FROM a JOIN b ON a.i = b.i WHERE a.y > 0"))
    ids = [dp.id for dp in dps]
    assert len(ids) == len(set(ids))
    assert any(":join0:INNER_JOIN" in i for i in ids)
    assert any(":where:WHERE_FILTER" in i for i in ids)


def test_unparsed_statement_yields_nothing():
    st = stmt_of("SELECT a.x FROM a")
    st.error, st.ast = "parse error", None
    assert classify_statement(st) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_classify.py -v`
Expected: FAIL — import error on `etl_drop_audit.classify`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/classify.py`:
```python
from __future__ import annotations

from sqlglot import exp

from .analyze import DIALECT, joins_of, main_select
from .models import DropPoint, EtlStatement


def _null_rejecting_refs(where: exp.Expression, alias: str) -> list[str]:
    """Columns of `alias` referenced in WHERE by any predicate except IS NULL."""
    refs: list[str] = []
    for col in where.find_all(exp.Column):
        if (col.table or "") != alias:
            continue
        parent = col.parent
        is_plain_is_null = (
            isinstance(parent, exp.Is)
            and isinstance(parent.expression, exp.Null)
            and not isinstance(parent.parent, exp.Not)
        )
        if not is_plain_is_null:
            refs.append(col.sql(dialect=DIALECT))
    return refs


def classify_statement(st: EtlStatement) -> list[DropPoint]:
    if st.error is not None or st.ast is None:
        return []
    select = main_select(st.ast)
    if select is None:
        return []

    dps: list[DropPoint] = []
    where = select.args.get("where")
    obj_name = st.obj.qualified_name

    def add(kind: str, suffix: str, description: str) -> None:
        dps.append(DropPoint(
            id=f"{st.id}:{suffix}:{kind}", kind=kind, obj_name=obj_name,
            target=st.target, description=description,
        ))

    for n, j in enumerate(joins_of(select)):
        if j.join_type == "INNER":
            add("INNER_JOIN", f"join{n}",
                f"INNER JOIN {j.right_alias}: driving rows without a match are dropped "
                f"(ON {j.condition_sql})")
        elif j.join_type in ("LEFT", "RIGHT") and where is not None:
            refs = _null_rejecting_refs(where.this, j.right_alias)
            if refs:
                add("OUTER_TO_INNER", f"join{n}",
                    f"{j.join_type} JOIN {j.right_alias} + WHERE on {', '.join(refs)} "
                    f"silently behaves as INNER — unmatched rows dropped")
        if j.keys:
            add("NULL_KEY", f"join{n}k",
                f"join keys {j.keys}: driving rows with NULL key can never match")
            if j.right_table_sql is not None:
                add("FANOUT", f"join{n}f",
                    f"duplicate keys in {j.right_table_sql} multiply driving rows "
                    f"(opposite failure: silent row inflation)")

    if where is not None:
        add("WHERE_FILTER", "where",
            f"WHERE {where.this.sql(dialect=DIALECT)} excludes rows "
            f"(overlaps OUTER_TO_INNER when the filter is the null-check)")
    return dps
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_classify.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Real-fixture regression + commit**

Add to `tests/test_classify.py`:
```python
from tests.test_plsql import load_real_procs


def test_real_proc_flagged_outer_to_inner():
    procs = load_real_procs()
    obj = SourceObject(schema="public", name="sp_stg_aa_dim_teams",
                       kind="procedure", definition=procs["sp_stg_aa_dim_teams"])
    st = [s for s in analyze_object(obj) if s.error is None][0]
    assert "OUTER_TO_INNER" in {dp.kind for dp in classify_statement(st)}
```

Run: `python -m pytest tests/ -v` → all PASS.

```bash
git add etl-drop-audit/src/etl_drop_audit/classify.py etl-drop-audit/tests/test_classify.py
git commit -m "etl-drop-audit: drop-point classification (5 classes)"
```

---

### Task 5: audit_sql.py — generate audit queries

**Files:**
- Create: `src/etl_drop_audit/audit_sql.py`
- Test: `tests/test_audit_sql.py`

**Interfaces:**
- Consumes: `analyze.*`, `classify.classify_statement`, `models.*`.
- Produces: `attach_audits(st: EtlStatement, drop_points: list[DropPoint], sample_limit: int) -> None` — fills each `dp.audit_queries` (label → SQL). Labels used by runner/report: `source_count`, `survived_count`, `dropped_count`, `null_key_count`, `dup_key_extra_rows`, `prewhere_count`, `sample` (absent when `sample_limit == 0`). Also `statement_counts(st) -> dict[str, str]` with `source_count`/`survived_count` for edge labels.
- All generated SQL must round-trip through `sqlglot.parse_one(sql, read="postgres")` (asserted in tests). CTEs: if the statement has a WITH clause it is copied onto every generated query.

- [ ] **Step 1: Write the failing test**

`tests/test_audit_sql.py`:
```python
import sqlglot

from etl_drop_audit.analyze import analyze_object
from etl_drop_audit.audit_sql import attach_audits, statement_counts
from etl_drop_audit.classify import classify_statement
from etl_drop_audit.models import SourceObject


def prepared(sql: str, sample_limit: int = 20):
    obj = SourceObject(schema="public", name="v_t", kind="view", definition=sql)
    st = analyze_object(obj)[0]
    dps = classify_statement(st)
    attach_audits(st, dps, sample_limit=sample_limit)
    return st, dps


def all_queries(dps):
    return [(dp, label, q) for dp in dps for label, q in dp.audit_queries.items()]


def test_every_audit_query_parses_as_postgres():
    _, dps = prepared(
        "SELECT a.x FROM a LEFT JOIN b ON a.i = b.i WHERE b.i IS NOT NULL")
    assert dps
    for _, _, q in all_queries(dps):
        sqlglot.parse_one(q, read="postgres")  # raises on invalid SQL


def test_outer_to_inner_has_dropped_and_sample():
    _, dps = prepared(
        "SELECT a.x FROM a LEFT JOIN b ON a.i = b.i WHERE b.i IS NOT NULL")
    dp = next(d for d in dps if d.kind == "OUTER_TO_INNER")
    dropped = dp.audit_queries["dropped_count"]
    assert "LEFT JOIN" in dropped.upper() and "IS NULL" in dropped.upper()
    assert "COUNT" in dropped.upper()
    sample = dp.audit_queries["sample"]
    assert "LIMIT 20" in sample.upper()


def test_sample_limit_zero_means_no_sample_queries():
    _, dps = prepared(
        "SELECT a.x FROM a JOIN b ON a.i = b.i", sample_limit=0)
    for dp in dps:
        assert "sample" not in dp.audit_queries


def test_null_key_count_targets_driving_key():
    _, dps = prepared("SELECT a.x FROM a JOIN b ON a.i = b.i")
    dp = next(d for d in dps if d.kind == "NULL_KEY")
    q = dp.audit_queries["null_key_count"]
    assert "a.i IS NULL" in q.replace('"', "")


def test_fanout_counts_duplicate_keys():
    _, dps = prepared("SELECT a.x FROM a JOIN b ON a.i = b.i")
    dp = next(d for d in dps if d.kind == "FANOUT")
    q = dp.audit_queries["dup_key_extra_rows"]
    assert "GROUP BY" in q.upper() and "HAVING" in q.upper()


def test_where_filter_has_pre_and_post_counts():
    _, dps = prepared("SELECT a.x FROM a WHERE a.y > 0")
    dp = next(d for d in dps if d.kind == "WHERE_FILTER")
    assert "prewhere_count" in dp.audit_queries
    assert "survived_count" in dp.audit_queries


def test_statement_counts_shape():
    st, _ = prepared("SELECT a.x FROM a JOIN b ON a.i = b.i")
    c = statement_counts(st)
    assert set(c) == {"source_count", "survived_count"}
    for q in c.values():
        sqlglot.parse_one(q, read="postgres")


def test_with_clause_is_propagated():
    st, dps = prepared(
        "WITH c AS (SELECT i FROM raw) SELECT a.x FROM a JOIN c ON a.i = c.i")
    for _, _, q in all_queries(dps):
        assert q.upper().startswith("WITH")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_audit_sql.py -v`
Expected: FAIL — import error on `etl_drop_audit.audit_sql`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/audit_sql.py`:
```python
"""Generate read-only audit SQL per drop-point by rewriting the parsed AST.

Every query is built from a copy of the original SELECT so aliases,
quoting and schema qualification survive verbatim.
"""
from __future__ import annotations

import re

import sqlglot
from sqlglot import exp

from .analyze import DIALECT, driving_table, joins_of, main_select
from .models import DropPoint, EtlStatement

_JOIN_DP = re.compile(r":join(\d+)")


def _count_star() -> exp.Expression:
    return sqlglot.parse_one("count(*)", read=DIALECT)


def _with_of(st: EtlStatement) -> exp.With | None:
    w = st.ast.args.get("with") if st.ast is not None else None
    if w is None:
        sel = main_select(st.ast)
        w = sel.args.get("with") if sel is not None else None
    return w


def _finalize(select: exp.Select, st: EtlStatement) -> str:
    w = _with_of(st)
    if w is not None and select.args.get("with") is None:
        select.set("with", w.copy())
    return select.sql(dialect=DIALECT)


def _bare_count(select: exp.Select, upto_join: int | None, st: EtlStatement,
                where_sql: str | None) -> exp.Select:
    """copy of select: joins[:upto], projection count(*), no where/group/etc."""
    s = select.copy()
    joins = s.args.get("joins", [])
    if upto_join is not None:
        s.set("joins", joins[: upto_join + 1])
    s.set("expressions", [_count_star()])
    for a in ("where", "group", "having", "order", "limit", "distinct", "with"):
        s.set(a, None)
    if where_sql:
        s = s.where(where_sql, dialect=DIALECT)
    return s


def _force_left(select: exp.Select, join_index: int) -> exp.Select:
    s = select.copy()
    j = s.args["joins"][join_index]
    j.set("side", "LEFT")
    j.set("kind", None)
    return s


def statement_counts(st: EtlStatement) -> dict[str, str]:
    """Edge-label queries: rows in the driving table, rows surviving the stmt."""
    select = main_select(st.ast)
    table_sql, _ = driving_table(select)
    source = f"SELECT count(*) FROM {table_sql}"
    inner = select.copy()
    inner.set("with", None)
    survived_sel = sqlglot.parse_one(
        f"SELECT count(*) FROM ({inner.sql(dialect=DIALECT)}) _q", read=DIALECT)
    return {
        "source_count": source,
        "survived_count": _finalize(survived_sel, st),
    }


def attach_audits(st: EtlStatement, drop_points: list[DropPoint],
                  sample_limit: int) -> None:
    select = main_select(st.ast)
    if select is None:
        return
    joins = joins_of(select)
    _, drive_alias = driving_table(select)

    for dp in drop_points:
        m = _JOIN_DP.search(dp.id)
        n = int(m.group(1)) if m else None

        if dp.kind in ("INNER_JOIN", "OUTER_TO_INNER"):
            j = joins[n]
            if not j.keys:
                dp.audit_queries["dropped_count"] = (
                    f"-- no equi-key found; ON is: {j.condition_sql}\nSELECT NULL")
                continue
            rkey = j.keys[0][1]
            forced = _force_left(select, n)
            counted = _bare_count(forced, n, st, f"{rkey} IS NULL")
            dp.audit_queries["dropped_count"] = _finalize(counted, st)
            if sample_limit > 0:
                sample = _force_left(select, n)
                sample.set("joins", sample.args["joins"][: n + 1])
                sample.set("expressions",
                           [sqlglot.parse_one(f"{drive_alias}.*", read=DIALECT)])
                for a in ("where", "group", "having", "order", "limit",
                          "distinct", "with"):
                    sample.set(a, None)
                sample = sample.where(f"{rkey} IS NULL", dialect=DIALECT)
                sample = sample.limit(sample_limit)
                dp.audit_queries["sample"] = _finalize(sample, st)

        elif dp.kind == "NULL_KEY":
            j = joins[n]
            preds = " OR ".join(f"{lk} IS NULL" for lk, _ in j.keys)
            counted = _bare_count(select, max(n - 1, 0) if n > 0 else None,
                                  st, preds)
            if n == 0:  # only the driving table needed
                counted.set("joins", [])
            dp.audit_queries["null_key_count"] = _finalize(counted, st)

        elif dp.kind == "FANOUT":
            j = joins[n]
            rkey_col = j.keys[0][1].split(".")[-1]
            dp.audit_queries["dup_key_extra_rows"] = (
                f"SELECT coalesce(sum(c - 1), 0) FROM "
                f"(SELECT {rkey_col}, count(*) AS c FROM {j.right_table_sql} "
                f"GROUP BY {rkey_col} HAVING count(*) > 1) _d"
            )

        elif dp.kind == "WHERE_FILTER":
            pre = _bare_count(select, None, st, None)
            dp.audit_queries["prewhere_count"] = _finalize(pre, st)
            dp.audit_queries.update(
                {"survived_count": statement_counts(st)["survived_count"]})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_audit_sql.py -v`
Expected: PASS (8 tests). If `s.where(..., dialect=...)`/`s.limit(...)` signatures differ in the installed sqlglot version, adapt to `s.where(sqlglot.parse_one(cond, read=DIALECT))` — assert via the round-trip test, not by trusting memory.

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/audit_sql.py etl-drop-audit/tests/test_audit_sql.py
git commit -m "etl-drop-audit: audit SQL generation (AST rewrite, CTE-safe)"
```

---

### Task 6: graph.py — table DAG + topo layers

**Files:**
- Create: `src/etl_drop_audit/graph.py`
- Test: `tests/test_graph.py`

**Interfaces:**
- Consumes: `analyze.main_select/driving_table/joins_of`, `models.EtlStatement`.
- Produces:
  - `@dataclass Edge: src: str; dst: str; stmt_id: str` (in graph.py).
  - `build_graph(statements: list[EtlStatement]) -> tuple[set[str], list[Edge]]` — nodes = normalized table names (lowercased, quotes stripped); one edge per (source table → target) per statement (driving table AND every joined real table are sources).
  - `layers(nodes: set[str], edges: list[Edge]) -> list[list[str]]` — Kahn topological layering; on cycle, remaining nodes become the last layer (never infinite-loop).
  - `normalize(name: str) -> str`.

- [ ] **Step 1: Write the failing test**

`tests/test_graph.py`:
```python
from etl_drop_audit.analyze import analyze_object
from etl_drop_audit.graph import build_graph, layers, normalize
from etl_drop_audit.models import SourceObject


def stmts(*sqls):
    out = []
    for i, (name, sql) in enumerate(sqls):
        obj = SourceObject(schema="public", name=name, kind="view", definition=sql)
        out.extend(analyze_object(obj))
    return out


def test_normalize_strips_quotes_and_lowers():
    assert normalize('"public"."DWH_x"') == "public.dwh_x"
    assert normalize("stg_y") == "stg_y"


def test_build_graph_edges_from_driving_and_joined():
    nodes, edges = build_graph(stmts(
        ("tgt1", "SELECT a.x FROM src_a a LEFT JOIN src_b b ON a.i = b.i")))
    assert {e.src for e in edges} == {"src_a", "src_b"}
    assert all(e.dst == "public.tgt1" for e in edges)
    assert "src_a" in nodes and "public.tgt1" in nodes


def test_layers_topological():
    nodes, edges = build_graph(stmts(
        ("mid", "SELECT r.x FROM raw r"),
        ("final", "SELECT m.x FROM public.mid m"),
    ))
    ls = layers(nodes, edges)
    flat = {n: i for i, layer in enumerate(ls) for n in layer}
    assert flat["raw"] < flat["public.mid"] < flat["public.final"]


def test_cycle_does_not_hang():
    from etl_drop_audit.graph import Edge
    nodes = {"a", "b"}
    edges = [Edge("a", "b", "s1"), Edge("b", "a", "s2")]
    ls = layers(nodes, edges)
    assert sum(len(l) for l in ls) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_graph.py -v`
Expected: FAIL — import error on `etl_drop_audit.graph`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/graph.py`:
```python
from __future__ import annotations

from dataclasses import dataclass

from .analyze import driving_table, joins_of, main_select
from .models import EtlStatement


@dataclass
class Edge:
    src: str
    dst: str
    stmt_id: str


def normalize(name: str) -> str:
    return name.replace('"', "").strip().lower()


def build_graph(statements: list[EtlStatement]) -> tuple[set[str], list[Edge]]:
    nodes: set[str] = set()
    edges: list[Edge] = []
    for st in statements:
        if st.error is not None or st.ast is None or st.target is None:
            continue
        select = main_select(st.ast)
        if select is None:
            continue
        dst = normalize(st.target)
        nodes.add(dst)
        sources: list[str] = []
        table_sql, _ = driving_table(select)
        sources.append(table_sql)
        for j in joins_of(select):
            if j.right_table_sql is not None:
                sources.append(j.right_table_sql)
        for s in sources:
            src = normalize(s)
            nodes.add(src)
            edges.append(Edge(src=src, dst=dst, stmt_id=st.id))
    return nodes, edges


def layers(nodes: set[str], edges: list[Edge]) -> list[list[str]]:
    """Kahn layering; cycle remnants are dumped into a final layer."""
    indeg = {n: 0 for n in nodes}
    out: dict[str, set[str]] = {n: set() for n in nodes}
    for e in edges:
        if e.dst not in out[e.src]:
            out[e.src].add(e.dst)
            indeg[e.dst] += 1
    result: list[list[str]] = []
    current = sorted(n for n in nodes if indeg[n] == 0)
    seen: set[str] = set()
    while current:
        result.append(current)
        seen.update(current)
        nxt: set[str] = set()
        for n in current:
            for m in out[n]:
                indeg[m] -= 1
                if indeg[m] == 0:
                    nxt.add(m)
        current = sorted(nxt)
    leftover = sorted(nodes - seen)
    if leftover:
        result.append(leftover)
    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_graph.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/graph.py etl-drop-audit/tests/test_graph.py
git commit -m "etl-drop-audit: table DAG + topo layers"
```

---

### Task 7: report.py — single-file HTML report

**Files:**
- Create: `src/etl_drop_audit/report.py`
- Test: `tests/test_report.py`

**Interfaces:**
- Consumes: `models.AuditResult/EtlStatement`, `graph.Edge/layers`.
- Produces: `render(results: list[AuditResult], statements: list[EtlStatement], nodes: set[str], edges: list[Edge], edge_counts: dict[str, dict[str, int | None]]) -> str` — full HTML document. `edge_counts` keyed by `stmt_id` with `source_count`/`survived_count`.
  - Sections: summary table (sorted by `AuditResult.dropped` desc) → SVG DAG → per-drop-point details (`id="dp-<slug>"`, counts + sample table) → UNPARSED (statements with `error`).
  - Red edge (`stroke:#c0392b`) when any drop point on that stmt has `dropped > 0`; edges are `<a href="#stmt-...">` anchors.
  - Every data cell: `dir="auto"`; document `<meta charset="utf-8">`.

- [ ] **Step 1: Write the failing test**

`tests/test_report.py`:
```python
from etl_drop_audit.graph import Edge
from etl_drop_audit.models import AuditResult, DropPoint, EtlStatement, SourceObject
from etl_drop_audit.report import render


def make_fixture():
    obj = SourceObject(schema="public", name="sp_x", kind="procedure", definition="")
    ok = EtlStatement(obj=obj, index=0, sql="INSERT INTO t SELECT ...", target="t")
    bad = EtlStatement(obj=obj, index=1, sql="EXECUTE 'INSERT ...'",
                       error="unrecognized DML shape (dynamic SQL?)")
    dp = DropPoint(id="public.sp_x:0:join0:OUTER_TO_INNER", kind="OUTER_TO_INNER",
                   obj_name="public.sp_x", target="t", description="LEFT+WHERE")
    res = AuditResult(drop_point=dp, counts={"dropped_count": 42},
                      samples=[{"team_name": "הפועל חיפה", "k": None}])
    nodes = {"src", "t"}
    edges = [Edge("src", "t", ok.id)]
    counts = {ok.id: {"source_count": 100, "survived_count": 58}}
    return [res], [ok, bad], nodes, edges, counts


def test_report_contains_all_sections():
    html = render(*make_fixture())
    assert '<meta charset="utf-8">' in html
    assert "42" in html                      # dropped count
    assert "הפועל חיפה" in html               # hebrew sample survives
    assert 'dir="auto"' in html
    assert "UNPARSED" in html and "dynamic SQL" in html
    assert "<svg" in html


def test_red_edge_when_drops():
    html = render(*make_fixture())
    assert "#c0392b" in html


def test_edge_label_in_out():
    html = render(*make_fixture())
    assert "100" in html and "58" in html


def test_counts_only_no_sample_section():
    results, stmts, nodes, edges, counts = make_fixture()
    results[0].samples = []
    html = render(results, stmts, nodes, edges, counts)
    assert "הפועל חיפה" not in html


def test_timeout_status_visible():
    results, stmts, nodes, edges, counts = make_fixture()
    results[0].status = "TIMEOUT"
    html = render(results, stmts, nodes, edges, counts)
    assert "TIMEOUT" in html
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_report.py -v`
Expected: FAIL — import error on `etl_drop_audit.report`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/report.py`:
```python
"""Single-file HTML report: summary, SVG DAG, drop-point details, UNPARSED."""
from __future__ import annotations

import html as _html

from .graph import Edge, layers
from .models import AuditResult, EtlStatement

NODE_W, NODE_H, COL_GAP, ROW_GAP = 220, 34, 300, 56


def _esc(v) -> str:
    return _html.escape("" if v is None else str(v))


def _slug(s: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in s)


def _svg_dag(nodes: set[str], edges: list[Edge],
             edge_counts: dict[str, dict], red_stmts: set[str]) -> str:
    cols = layers(nodes, edges)
    pos: dict[str, tuple[int, int]] = {}
    for ci, col in enumerate(cols):
        for ri, n in enumerate(col):
            pos[n] = (40 + ci * (NODE_W + COL_GAP), 40 + ri * (NODE_H + ROW_GAP))
    width = 80 + len(cols) * (NODE_W + COL_GAP)
    height = 80 + max((len(c) for c in cols), default=1) * (NODE_H + ROW_GAP)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" '
             f'height="{height}" font-family="monospace" font-size="12">']
    for e in edges:
        (x1, y1), (x2, y2) = pos[e.src], pos[e.dst]
        sx, sy = x1 + NODE_W, y1 + NODE_H // 2
        tx, ty = x2, y2 + NODE_H // 2
        color = "#c0392b" if e.stmt_id in red_stmts else "#7f8c8d"
        w = 3 if e.stmt_id in red_stmts else 1.5
        c = edge_counts.get(e.stmt_id, {})
        label = ""
        if c.get("source_count") is not None and c.get("survived_count") is not None:
            dropped = c["source_count"] - c["survived_count"]
            label = f'{c["source_count"]} → {c["survived_count"]}' + (
                f" (−{dropped})" if dropped > 0 else "")
        mx, my = (sx + tx) // 2, (sy + ty) // 2 - 6
        parts.append(
            f'<a href="#stmt-{_slug(e.stmt_id)}">'
            f'<path d="M{sx},{sy} C{sx+60},{sy} {tx-60},{ty} {tx},{ty}" '
            f'stroke="{color}" stroke-width="{w}" fill="none"/>'
            f'<text x="{mx}" y="{my}" text-anchor="middle" '
            f'fill="{color}">{_esc(label)}</text></a>')
    for n, (x, y) in pos.items():
        parts.append(
            f'<g><rect x="{x}" y="{y}" width="{NODE_W}" height="{NODE_H}" rx="6" '
            f'fill="#ecf0f1" stroke="#2c3e50"/>'
            f'<text x="{x + NODE_W // 2}" y="{y + 21}" '
            f'text-anchor="middle">{_esc(n[:32])}</text></g>')
    parts.append("</svg>")
    return "".join(parts)


def _sample_table(samples: list[dict]) -> str:
    if not samples:
        return ""
    cols = list(samples[0].keys())
    head = "".join(f"<th>{_esc(c)}</th>" for c in cols)
    rows = "".join(
        "<tr>" + "".join(f'<td dir="auto">{_esc(r.get(c))}</td>' for c in cols)
        + "</tr>" for r in samples)
    return (f"<h4>sample dropped rows ({len(samples)})</h4>"
            f"<table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>")


def render(results: list[AuditResult], statements: list[EtlStatement],
           nodes: set[str], edges: list[Edge],
           edge_counts: dict[str, dict]) -> str:
    results = sorted(results, key=lambda r: r.dropped, reverse=True)
    red = {r.drop_point.id.rsplit(":", 2)[0] for r in results if r.dropped > 0}

    summary_rows = "".join(
        f'<tr><td><a href="#dp-{_slug(r.drop_point.id)}">{_esc(r.drop_point.id)}</a></td>'
        f"<td>{_esc(r.drop_point.kind)}</td>"
        f'<td dir="auto">{_esc(r.drop_point.target)}</td>'
        f"<td>{r.dropped}</td><td>{_esc(r.status)}</td></tr>"
        for r in results)

    details = []
    for r in results:
        counts = "".join(f"<li><code>{_esc(k)}</code>: {_esc(v)}</li>"
                         for k, v in r.counts.items())
        queries = "".join(
            f"<details><summary>{_esc(l)}</summary><pre>{_esc(q)}</pre></details>"
            for l, q in r.drop_point.audit_queries.items())
        err = f"<p class='err'>{_esc(r.error)}</p>" if r.error else ""
        details.append(
            f'<section id="dp-{_slug(r.drop_point.id)}">'
            f"<h3>{_esc(r.drop_point.id)} — {_esc(r.drop_point.kind)} "
            f"[{_esc(r.status)}]</h3>"
            f'<p dir="auto">{_esc(r.drop_point.description)}</p>'
            f"<ul>{counts}</ul>{err}{_sample_table(r.samples)}{queries}</section>")

    unparsed = [s for s in statements if s.error is not None]
    unparsed_html = "".join(
        f'<section><h4 dir="auto">{_esc(s.id)}</h4>'
        f"<p>{_esc(s.error)}</p><pre>{_esc(s.sql[:2000])}</pre></section>"
        for s in unparsed)

    stmt_anchors = "".join(
        f'<section id="stmt-{_slug(s.id)}"><h3 dir="auto">{_esc(s.id)} '
        f"→ {_esc(s.target)}</h3><pre>{_esc(s.sql[:4000])}</pre></section>"
        for s in statements if s.error is None)

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ETL drop audit</title>
<style>
body{{font-family:system-ui,sans-serif;margin:24px;max-width:1400px}}
table{{border-collapse:collapse;margin:8px 0}}
td,th{{border:1px solid #bbb;padding:4px 8px;text-align:left}}
pre{{background:#f6f6f6;padding:8px;overflow-x:auto}}
.err{{color:#c0392b}} section{{margin-bottom:28px}}
svg{{border:1px solid #ddd;max-width:100%;height:auto}}
</style></head><body>
<h1>ETL silent-drop audit</h1>
<h2>Summary (worst first)</h2>
<table><thead><tr><th>drop point</th><th>kind</th><th>target</th>
<th>dropped/dup rows</th><th>status</th></tr></thead>
<tbody>{summary_rows}</tbody></table>
<h2>Pipeline DAG</h2>
{_svg_dag(nodes, edges, edge_counts, red)}
<h2>Drop points</h2>
{"".join(details)}
<h2>Statements</h2>
{stmt_anchors}
<h2>UNPARSED — needs human eyes (never silently skipped)</h2>
{unparsed_html or "<p>none</p>"}
</body></html>"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_report.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/report.py etl-drop-audit/tests/test_report.py
git commit -m "etl-drop-audit: HTML report (SVG DAG, samples, UNPARSED)"
```

---

### Task 8: db.py + discover.py — read-only connection + catalog queries

**Files:**
- Create: `src/etl_drop_audit/db.py`, `src/etl_drop_audit/discover.py`
- Test: `tests/test_discover.py`

**Interfaces:**
- Produces:
  - `db.connect(timeout_s: int = 60) -> psycopg.Connection` — env-var driven, `options="-c default_transaction_read_only=on -c statement_timeout=<ms>"`, `conn.read_only = True`.
  - `db.fetch_all(conn, sql, params=None) -> list[dict]`.
  - `discover.PROC_SQL`, `discover.VIEW_SQL` (module constants), `discover.discover(conn, schemas: list[str] | None) -> list[SourceObject]` — `schemas=None` → all non-system.
- Unit tests use a `FakeConn` — no live DB in the suite.

- [ ] **Step 1: Write the failing test**

`tests/test_discover.py`:
```python
from etl_drop_audit.db import build_options
from etl_drop_audit.discover import PROC_SQL, VIEW_SQL, discover


class FakeCursor:
    def __init__(self, rows_by_marker):
        self.rows_by_marker = rows_by_marker
        self.executed = []
        self._rows = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        for marker, rows in self.rows_by_marker.items():
            if marker in sql:
                self._rows = rows
                return
        self._rows = []

    def fetchall(self):
        return self._rows

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeConn:
    def __init__(self, rows_by_marker):
        self.cursor_obj = FakeCursor(rows_by_marker)

    def cursor(self, row_factory=None):
        return self.cursor_obj


def test_build_options_read_only_and_timeout():
    opts = build_options(timeout_s=45)
    assert "default_transaction_read_only=on" in opts
    assert "statement_timeout=45000" in opts


def test_catalog_sql_excludes_system_schemas():
    for q in (PROC_SQL, VIEW_SQL):
        assert "pg_catalog" in q and "information_schema" in q


def test_discover_maps_rows_to_source_objects():
    conn = FakeConn({
        "pg_proc": [{"schema": "public", "name": "sp_a", "kind": "procedure",
                     "definition": "CREATE PROCEDURE ..."}],
        "pg_views": [{"schema": "public", "name": "v_b", "kind": "view",
                      "definition": "SELECT 1"}],
    })
    objs = discover(conn, schemas=None)
    assert {(o.kind, o.name) for o in objs} == {("procedure", "sp_a"), ("view", "v_b")}
    # schemas=None must be passed as NULL param, not crash
    assert all(p == {"schemas": None} for _, p in conn.cursor_obj.executed)


def test_discover_passes_schema_filter():
    conn = FakeConn({"pg_proc": [], "pg_views": []})
    discover(conn, schemas=["etl", "public"])
    assert all(p == {"schemas": ["etl", "public"]}
               for _, p in conn.cursor_obj.executed)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_discover.py -v`
Expected: FAIL — import errors

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/db.py`:
```python
from __future__ import annotations

import os

import psycopg
from psycopg import rows


def build_options(timeout_s: int) -> str:
    return (f"-c default_transaction_read_only=on "
            f"-c statement_timeout={timeout_s * 1000}")


def connect(timeout_s: int = 60) -> psycopg.Connection:
    conn = psycopg.connect(
        host=os.environ.get("PGHOST", "localhost"),
        port=int(os.environ.get("PGPORT", "5432")),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ.get("PGPASSWORD", ""),
        options=build_options(timeout_s),
    )
    conn.read_only = True  # second layer: psycopg-level session characteristic
    return conn


def fetch_all(conn, sql: str, params=None) -> list[dict]:
    with conn.cursor(row_factory=rows.dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

`src/etl_drop_audit/discover.py`:
```python
from __future__ import annotations

from .db import fetch_all
from .models import SourceObject

PROC_SQL = """
SELECT n.nspname AS schema,
       p.proname AS name,
       CASE p.prokind WHEN 'p' THEN 'procedure' ELSE 'function' END AS kind,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE p.prokind IN ('f', 'p')
  AND l.lanname IN ('sql', 'plpgsql')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (%(schemas)s::text[] IS NULL OR n.nspname = ANY(%(schemas)s::text[]))
"""

VIEW_SQL = """
SELECT schemaname AS schema,
       viewname AS name,
       'view' AS kind,
       definition
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (%(schemas)s::text[] IS NULL OR schemaname = ANY(%(schemas)s::text[]))
"""


def discover(conn, schemas: list[str] | None) -> list[SourceObject]:
    params = {"schemas": schemas}
    objs: list[SourceObject] = []
    for q in (PROC_SQL, VIEW_SQL):
        for r in fetch_all(conn, q, params):
            objs.append(SourceObject(schema=r["schema"], name=r["name"],
                                     kind=r["kind"], definition=r["definition"]))
    return objs
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_discover.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/db.py etl-drop-audit/src/etl_drop_audit/discover.py etl-drop-audit/tests/test_discover.py
git commit -m "etl-drop-audit: read-only db layer + catalog discovery"
```

---

### Task 9: runner.py — execute audits, degrade gracefully

**Files:**
- Create: `src/etl_drop_audit/runner.py`
- Test: `tests/test_runner.py`

**Interfaces:**
- Consumes: `db.fetch_all`, `models.*`.
- Produces:
  - `run_audits(conn, drop_points: list[DropPoint]) -> list[AuditResult]` — per query: single scalar → `counts[label]`; `sample` label → `samples`; `psycopg.errors.QueryCanceled` → status TIMEOUT + `conn.rollback()`, continue; other exception → status ERROR + rollback, continue. WHERE_FILTER: adds derived `counts["dropped_count"] = prewhere - survived` when both present.
  - `run_edge_counts(conn, statements, statement_counts_fn) -> dict[str, dict[str, int | None]]` — per parsed statement, failures → `None` values, never raise.

- [ ] **Step 1: Write the failing test**

`tests/test_runner.py`:
```python
import psycopg.errors

from etl_drop_audit.models import DropPoint
from etl_drop_audit.runner import run_audits, run_edge_counts


class FakeConn:
    def __init__(self, answers):
        """answers: dict sql -> rows (list[dict]) or Exception instance."""
        self.answers = answers
        self.rolled_back = 0

    def rollback(self):
        self.rolled_back += 1


def fake_fetch(conn, sql, params=None):
    ans = conn.answers[sql]
    if isinstance(ans, Exception):
        raise ans
    return ans


def dp(kind, queries):
    return DropPoint(id=f"x:0:j:{kind}", kind=kind, obj_name="x", target="t",
                     description="", audit_queries=queries)


def test_scalar_counts_and_samples(monkeypatch):
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)
    conn = FakeConn({
        "Q1": [{"count": 42}],
        "QS": [{"a": 1, "b": "x"}, {"a": 2, "b": "y"}],
    })
    res = run_audits(conn, [dp("OUTER_TO_INNER",
                               {"dropped_count": "Q1", "sample": "QS"})])
    assert res[0].counts["dropped_count"] == 42
    assert len(res[0].samples) == 2
    assert res[0].status == "OK"


def test_timeout_marks_and_continues(monkeypatch):
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)
    conn = FakeConn({
        "QT": psycopg.errors.QueryCanceled(),
        "Q2": [{"count": 7}],
    })
    res = run_audits(conn, [
        dp("INNER_JOIN", {"dropped_count": "QT"}),
        dp("NULL_KEY", {"null_key_count": "Q2"}),
    ])
    assert res[0].status == "TIMEOUT"
    assert res[1].status == "OK" and res[1].counts["null_key_count"] == 7
    assert conn.rolled_back >= 1


def test_error_marks_and_continues(monkeypatch):
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)
    conn = FakeConn({"QE": RuntimeError("boom")})
    res = run_audits(conn, [dp("FANOUT", {"dup_key_extra_rows": "QE"})])
    assert res[0].status == "ERROR"
    assert "boom" in res[0].error


def test_where_filter_derives_dropped(monkeypatch):
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)
    conn = FakeConn({"QP": [{"count": 100}], "QW": [{"count": 58}]})
    res = run_audits(conn, [dp("WHERE_FILTER",
                               {"prewhere_count": "QP", "survived_count": "QW"})])
    assert res[0].counts["dropped_count"] == 42


def test_run_edge_counts_failure_yields_none(monkeypatch):
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)
    conn = FakeConn({"CS": [{"count": 10}], "CV": RuntimeError("nope")})

    class St:
        id = "s1"
        error = None
        ast = object()

    out = run_edge_counts(conn, [St()],
                          lambda st: {"source_count": "CS", "survived_count": "CV"})
    assert out["s1"]["source_count"] == 10
    assert out["s1"]["survived_count"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_runner.py -v`
Expected: FAIL — import error on `etl_drop_audit.runner`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/runner.py`:
```python
from __future__ import annotations

import psycopg.errors

from .db import fetch_all
from .models import AuditResult, DropPoint


def _scalar(rows: list[dict]) -> int | None:
    if not rows:
        return None
    first = rows[0]
    for v in first.values():
        return v
    return None


def run_audits(conn, drop_points: list[DropPoint]) -> list[AuditResult]:
    results: list[AuditResult] = []
    for dp in drop_points:
        res = AuditResult(drop_point=dp)
        for label, sql in dp.audit_queries.items():
            try:
                rows = fetch_all(conn, sql)
                if label == "sample":
                    res.samples = rows
                else:
                    res.counts[label] = _scalar(rows)
            except psycopg.errors.QueryCanceled:
                conn.rollback()
                res.status = "TIMEOUT"
                res.error = f"{label}: statement_timeout exceeded"
            except Exception as e:
                conn.rollback()
                res.status = "ERROR"
                res.error = f"{label}: {e}"
        pre, post = res.counts.get("prewhere_count"), res.counts.get("survived_count")
        if pre is not None and post is not None:
            res.counts["dropped_count"] = pre - post
        results.append(res)
    return results


def run_edge_counts(conn, statements, statement_counts_fn) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for st in statements:
        if st.error is not None or st.ast is None:
            continue
        counts: dict[str, int | None] = {}
        try:
            queries = statement_counts_fn(st)
        except Exception:
            continue
        for label, sql in queries.items():
            try:
                counts[label] = _scalar(fetch_all(conn, sql))
            except Exception:
                conn.rollback()
                counts[label] = None
        out[st.id] = counts
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_runner.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit/src/etl_drop_audit/runner.py etl-drop-audit/tests/test_runner.py
git commit -m "etl-drop-audit: audit runner (TIMEOUT/ERROR degrade, never abort)"
```

---

### Task 10: cli.py + __main__.py + README — orchestration + e2e

**Files:**
- Create: `src/etl_drop_audit/cli.py`, `src/etl_drop_audit/__main__.py`, `README.md`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: everything above.
- Produces: `cli.main(argv: list[str] | None = None) -> int`; `cli.run_pipeline(conn, schemas, sample_limit, out_path) -> str` (returns out_path). Args: `--schema` (append, default None=all), `--limit-sample` (int, default 20), `--timeout` (int seconds, default 60), `--out` (default `report.html`). Exit 0 on success; on connect failure prints `connect failed — is the SSM tunnel running?` and exits 2.

- [ ] **Step 1: Write the failing test**

`tests/test_cli.py`:
```python
import json
import pathlib

import etl_drop_audit.cli as cli
from tests.test_plsql import load_real_procs


class FakeConn:
    def __init__(self, defs):
        self.defs = defs

    def rollback(self):
        pass


def test_run_pipeline_end_to_end(tmp_path, monkeypatch):
    procs = load_real_procs()

    def fake_discover(conn, schemas):
        from etl_drop_audit.models import SourceObject
        return [SourceObject(schema="public", name=k, kind="procedure",
                             definition=v) for k, v in procs.items()]

    def fake_fetch(conn, sql, params=None):
        return [{"count": 5}]  # every audit/count query returns 5

    monkeypatch.setattr(cli, "discover", fake_discover)
    monkeypatch.setattr("etl_drop_audit.runner.fetch_all", fake_fetch)

    out = tmp_path / "r.html"
    cli.run_pipeline(FakeConn(procs), schemas=None, sample_limit=0,
                     out_path=str(out))
    html = out.read_text(encoding="utf-8")
    assert "OUTER_TO_INNER" in html            # the known real drop point
    assert "sp_stg_aa_dim_teams" in html
    assert "<svg" in html


def test_main_connect_failure_exit_2(monkeypatch, capsys):
    def boom(timeout_s):
        raise OSError("refused")
    monkeypatch.setattr(cli, "connect", boom)
    rc = cli.main(["--out", "x.html"])
    assert rc == 2
    assert "SSM tunnel" in capsys.readouterr().err


def test_arg_defaults(monkeypatch):
    ns = cli.parse_args([])
    assert ns.schema is None and ns.limit_sample == 20
    assert ns.timeout == 60 and ns.out == "report.html"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_cli.py -v`
Expected: FAIL — import error on `etl_drop_audit.cli`

- [ ] **Step 3: Write implementation**

`src/etl_drop_audit/cli.py`:
```python
from __future__ import annotations

import argparse
import sys

from dotenv import load_dotenv

from . import audit_sql, graph, report
from .analyze import analyze_object
from .classify import classify_statement
from .db import connect
from .discover import discover
from .runner import run_audits, run_edge_counts


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="etl-drop-audit",
        description="Find silent row-drops in Postgres ETL procs/views. "
                    "Read-only: session opens with "
                    "default_transaction_read_only=on.")
    p.add_argument("--schema", action="append", default=None,
                   help="schema to scan (repeatable; default: all non-system)")
    p.add_argument("--limit-sample", type=int, default=20, dest="limit_sample",
                   help="sample rows per drop point; 0 = counts only (no PII)")
    p.add_argument("--timeout", type=int, default=60,
                   help="statement_timeout seconds per audit query")
    p.add_argument("--out", default="report.html", help="output HTML path")
    return p.parse_args(argv)


def run_pipeline(conn, schemas, sample_limit: int, out_path: str) -> str:
    objs = discover(conn, schemas)
    statements = [s for o in objs for s in analyze_object(o)]
    parsed = [s for s in statements if s.error is None and s.ast is not None]

    drop_points = []
    for st in parsed:
        dps = classify_statement(st)
        audit_sql.attach_audits(st, dps, sample_limit=sample_limit)
        drop_points.extend(dps)

    results = run_audits(conn, drop_points)
    edge_counts = run_edge_counts(conn, parsed, audit_sql.statement_counts)
    nodes, edges = graph.build_graph(parsed)

    html = report.render(results, statements, nodes, edges, edge_counts)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


def main(argv=None) -> int:
    load_dotenv()
    ns = parse_args(argv)
    try:
        conn = connect(timeout_s=ns.timeout)
    except Exception as e:
        print(f"connect failed — is the SSM tunnel running? ({e})",
              file=sys.stderr)
        return 2
    try:
        out = run_pipeline(conn, ns.schema, ns.limit_sample, ns.out)
    finally:
        conn.close()
    print(f"report written: {out}")
    return 0
```

`src/etl_drop_audit/__main__.py`:
```python
import sys

from .cli import main

sys.exit(main())
```

`README.md`:
```markdown
# etl-drop-audit

Finds **silent row-drops** in a Postgres ETL (stored procs + views) and
renders a single-file HTML report with a pipeline DAG. Generic — assumes
nothing about your schema, only the stack (Postgres, plpgsql).

## Drop classes detected
| kind | meaning |
|---|---|
| INNER_JOIN | unmatched driving rows dropped |
| OUTER_TO_INNER | LEFT/RIGHT join + WHERE null-rejecting filter = silent INNER |
| NULL_KEY | NULL join keys can never match |
| WHERE_FILTER | rows excluded by filter |
| FANOUT | duplicate keys inflate rows (silent duplication) |

## Read-only guarantee
Session opens with `default_transaction_read_only=on` (+ psycopg
`read_only=True`) — Postgres itself rejects any write. Per-query
`statement_timeout` (default 60s).

## Usage
1. copy `.env.example` → `.env`, fill `PG*` values
2. start your tunnel (e.g. AWS SSM port-forward to localhost:5432)
3. `python -m pip install -e .`
4. `python -m etl_drop_audit --schema public --out report.html`
   - `--limit-sample 0` → counts only, no row samples (no PII in report)
5. open `report.html`

Unparseable / dynamic-SQL statements are listed under **UNPARSED** —
this tool never silently skips (that would be ironic).
```

- [ ] **Step 4: Run full suite**

Run: `python -m pytest tests/ -v`
Expected: PASS (all tests, ~40)

- [ ] **Step 5: Commit**

```bash
git add etl-drop-audit
git commit -m "etl-drop-audit: cli orchestration + e2e test + README"
```

---

### Task 11: Manual integration run (this deployment — not part of generic suite)

**Files:** none created (report output is gitignored).

- [ ] **Step 1: Preconditions** — user starts SSM tunnel; `.env` filled (user does this).
- [ ] **Step 2: Smoke** — `python -m etl_drop_audit --schema public --limit-sample 5 --timeout 60 --out report.html`
  Expected: `report written: report.html`, exit 0. If exit 2 → tunnel down.
- [ ] **Step 3: Verify known drop point** — open report; confirm `sp_stg_aa_dim_teams` appears with kind OUTER_TO_INNER and a real dropped count; DAG shows `mrr_aa_new_teams → stg_aa_dim_teams` red if drops > 0.
- [ ] **Step 4: Read-only proof** — in DBeaver same user: `SHOW default_transaction_read_only;` during a run is optional; simpler: confirm the tool's session by checking report generated with zero DDL/DML — plus optionally run `python - <<'PY'` snippet attempting `CREATE TEMP TABLE` through `db.connect()` and confirm Postgres error `cannot execute CREATE TABLE in a read-only transaction`.
- [ ] **Step 5: Commit nothing** (report gitignored); note findings for the user.

---

## Self-review (done at authoring)

- Spec coverage: discover ✓(T8) plsql ✓(T2) analyze ✓(T3) classify 5 classes ✓(T4) audit SQL ✓(T5) read-only 3 layers ✓(T8 opts + read_only; role optional out of scope) timeouts ✓(T8 build_options, T9 TIMEOUT status) UNPARSED-never-silent ✓(T2 suspects, T3 error, T7 section) DAG+topo ✓(T6) HTML/Hebrew/PII ✓(T7, `--limit-sample 0`) CLI/env ✓(T10) genericity ✓(no schema names in src; only tests/fixtures carry real names as data) integration ✓(T11).
- Placeholders: none; every step has full code.
- Type consistency: `EtlStatement.id` used by graph Edge.stmt_id + report anchors ✓; `audit_queries` labels match runner (`sample`, `prewhere_count`, `survived_count`, `dropped_count`, `null_key_count`, `dup_key_extra_rows`) ✓; `AuditResult.dropped` keys off `dropped*/null_key*/dup_*` prefixes — matches labels ✓.
- Known risk flagged in-plan: sqlglot builder-API signatures (T5 step 4 note) — tests assert round-trip parse, so drift surfaces immediately.
