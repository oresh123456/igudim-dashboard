"""Parse candidate DML statements with sqlglot (postgres dialect).

Fills EtlStatement.ast + target; parse failure => .error set (UNPARSED,
surfaced in the report — never silently skipped).
"""
from __future__ import annotations

from sqlglot import exp, parse_one

from .models import EtlStatement

DIALECT = "postgres"


def _table_name(t: exp.Table) -> str:
    parts = [p.name for p in (t.args.get("catalog"), t.args.get("db")) if p]
    parts.append(t.name)
    return ".".join(parts)


def analyze_statement(st: EtlStatement) -> EtlStatement:
    if st.error:  # pre-flagged (e.g. dynamic SQL) — keep as UNPARSED
        return st
    try:
        ast = parse_one(st.sql, read=DIALECT)
    except Exception as e:  # noqa: BLE001 - any parse failure => UNPARSED
        st.error = f"parse error: {e}"
        return st

    st.ast = ast
    if st.target is None:
        target: exp.Table | None = None
        if isinstance(ast, (exp.Insert, exp.Create, exp.Merge)):
            this = ast.this
            if isinstance(this, exp.Schema):  # INSERT INTO t (cols)
                this = this.this
            if isinstance(this, exp.Table):
                target = this
        elif isinstance(ast, (exp.Update, exp.Delete)):
            if isinstance(ast.this, exp.Table):
                target = ast.this
        if target is not None:
            st.target = _table_name(target)
        else:
            st.error = "no target table found"
    return st


def main_select(st: EtlStatement) -> exp.Select | None:
    """The SELECT that feeds the target, if the statement has one."""
    ast = st.ast
    if ast is None:
        return None
    if isinstance(ast, exp.Select):
        return ast
    inner = ast.args.get("expression")
    if isinstance(inner, exp.Select):
        return inner
    if isinstance(inner, exp.Subquery) and isinstance(inner.this, exp.Select):
        return inner.this
    found = ast.find(exp.Select)
    return found


def source_tables(select: exp.Select) -> list[str]:
    """All physical tables referenced in FROM/JOINs (recursively incl. CTEs' innards)."""
    return sorted({_table_name(t) for t in select.find_all(exp.Table)})
