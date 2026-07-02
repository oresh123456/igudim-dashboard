"""Build read-only audit SQL from a statement's SELECT AST.

All queries are pure SELECT count(*)/sample queries generated from the parsed
AST — nothing here writes. Generic: table/column names come from the AST only.
"""
from __future__ import annotations

from functools import reduce

from sqlglot import exp

DIALECT = "postgres"


def conjuncts(where: exp.Where | None) -> list[exp.Expression]:
    if where is None:
        return []
    node = where.this
    if isinstance(node, exp.And):
        return list(node.flatten())
    return [node]


def references_alias(node: exp.Expression, alias: str) -> bool:
    return any(c.table == alias for c in node.find_all(exp.Column))


def set_where(select: exp.Select, parts: list[exp.Expression]) -> None:
    if parts:
        cond = reduce(lambda a, b: exp.and_(a, b), parts)
        select.set("where", exp.Where(this=cond))
    else:
        select.set("where", None)


def _bare(select: exp.Select) -> exp.Select:
    """Copy without ORDER/LIMIT — irrelevant for counting."""
    s = select.copy()
    s.set("order", None)
    s.set("limit", None)
    return s


def count_sql(select: exp.Select) -> str:
    inner = _bare(select)
    return exp.select("count(*)").from_(inner.subquery("_q")).sql(dialect=DIALECT)


def sample_sql(select: exp.Select, limit: int) -> str:
    s = _bare(select)
    s.set("expressions", [exp.Star()])
    return s.limit(limit).sql(dialect=DIALECT)


def survived_sql(select: exp.Select) -> str:
    return count_sql(select)


def pre_filter_select(select: exp.Select) -> exp.Select:
    s = select.copy()
    s.set("where", None)
    return s


def outer_to_inner_dropped_select(
    select: exp.Select, alias: str, null_col: str
) -> exp.Select:
    """Rows the null-rejecting WHERE kills: keep other predicates, require unmatched."""
    s = select.copy()
    keep = [c for c in conjuncts(s.args.get("where")) if not references_alias(c, alias)]
    keep.append(
        exp.Is(this=exp.column(null_col, table=alias), expression=exp.Null())
    )
    set_where(s, keep)
    return s


def inner_join_dropped_select(
    select: exp.Select, join_index: int, alias: str, right_col: str
) -> exp.Select:
    """Convert join #join_index to LEFT, count rows with no match."""
    s = select.copy()
    joins = s.args.get("joins") or []
    j = joins[join_index]
    j.set("side", "LEFT")
    j.set("kind", None)
    keep = [c for c in conjuncts(s.args.get("where")) if not references_alias(c, alias)]
    keep.append(
        exp.Is(this=exp.column(right_col, table=alias), expression=exp.Null())
    )
    set_where(s, keep)
    return s


def null_key_sql(table_sql: str, alias: str, col: str) -> str:
    return (
        exp.select("count(*)")
        .from_(f"{table_sql} AS {alias}")
        .where(exp.Is(this=exp.column(col, table=alias), expression=exp.Null()))
        .sql(dialect=DIALECT)
    )


def fanout_sql(table_sql: str, alias: str, cols: list[str]) -> str:
    col_exprs = [exp.column(c, table=alias) for c in cols]
    inner = (
        exp.select(*col_exprs, "count(*) AS _n")
        .from_(f"{table_sql} AS {alias}")
        .group_by(*col_exprs)
        .having("count(*) > 1")
    )
    return exp.select("count(*)").from_(inner.subquery("_d")).sql(dialect=DIALECT)
