"""Classify drop-points in a parsed statement and attach audit queries.

Drop classes:
  INNER_JOIN     — unmatched left rows silently dropped by an inner join
  OUTER_TO_INNER — LEFT/RIGHT join + null-rejecting WHERE on the outer side
  NULL_KEY       — rows whose join key IS NULL can never match
  WHERE_FILTER   — plain WHERE filter dropping rows
  FANOUT         — duplicate join keys on the many side inflating rows
"""
from __future__ import annotations

from sqlglot import exp

from . import audit_sql as aq
from .analyze import main_select
from .models import AuditQuery, DropPoint, EtlStatement

DIALECT = "postgres"


def _sql(e: exp.Expression) -> str:
    return e.sql(dialect=DIALECT)


def _alias_map(select: exp.Select) -> dict[str, exp.Table]:
    """alias/name -> physical Table for FROM + JOIN sources (skip subqueries/CTEs)."""
    out: dict[str, exp.Table] = {}
    cte_names = {c.alias_or_name for c in select.find_all(exp.CTE)}
    # sqlglot arg key is "from" in <30, "from_" in >=30
    frm = select.args.get("from") or select.args.get("from_")
    sources = []
    if frm is not None:
        sources.append(frm.this)
    for j in select.args.get("joins") or []:
        sources.append(j.this)
    for s in sources:
        if isinstance(s, exp.Table) and s.name not in cte_names:
            out[s.alias_or_name] = s
    return out


def _eq_pairs(on: exp.Expression) -> list[tuple[exp.Column, exp.Column]]:
    pairs = []
    for eq in on.find_all(exp.EQ):
        l, r = eq.this, eq.expression
        if isinstance(l, exp.Column) and isinstance(r, exp.Column):
            pairs.append((l, r))
    return pairs


def _table_sql(t: exp.Table) -> str:
    bare = t.copy()
    bare.set("alias", None)
    return _sql(bare)


def classify_statement(st: EtlStatement, sample_limit: int) -> list[DropPoint]:
    select = main_select(st)
    if st.error or select is None:
        return []

    points: list[DropPoint] = []
    aliases = _alias_map(select)
    where = select.args.get("where")
    where_parts = aq.conjuncts(where)
    joins = select.args.get("joins") or []

    def add(kind: str, desc: str, queries: list[AuditQuery]) -> None:
        points.append(
            DropPoint(
                id=f"{st.id}/{kind}/{len(points)}",
                kind=kind,
                obj_name=st.obj.full_name,
                target=st.target,
                description=desc,
                audit_queries=queries,
            )
        )

    for ji, join in enumerate(joins):
        on = join.args.get("on")
        if on is None:
            continue
        alias = join.this.alias_or_name
        side = (join.side or "").upper()
        kind = (join.kind or "").upper()
        pairs = _eq_pairs(on)
        right_cols = [c.name for l, r in pairs for c in (l, r) if c.table == alias]
        left_cols = [(c.table, c.name) for l, r in pairs for c in (l, r) if c.table != alias]

        is_inner = side == "" and kind in ("", "INNER")
        is_outer = side in ("LEFT", "RIGHT", "FULL")

        if is_inner and right_cols:
            dropped_sel = aq.inner_join_dropped_select(select, ji, alias, right_cols[0])
            add(
                "INNER_JOIN",
                f"inner join to {alias} ({_sql(on)}) — unmatched rows dropped",
                [
                    AuditQuery("dropped", aq.count_sql(dropped_sel)),
                    AuditQuery("sample", aq.sample_sql(dropped_sel, sample_limit), is_sample=True),
                ] if sample_limit else [AuditQuery("dropped", aq.count_sql(dropped_sel))],
            )

        if is_outer:
            # null-rejecting WHERE predicate on the outer side => join is
            # effectively INNER: the confirmed silent-drop pattern.
            rejecting = [
                c for c in where_parts
                if aq.references_alias(c, alias)
                and not (isinstance(c, exp.Is) and isinstance(c.expression, exp.Null))
            ]
            if rejecting:
                null_col = right_cols[0] if right_cols else None
                for c in rejecting[0].find_all(exp.Column):
                    if c.table == alias:
                        null_col = c.name
                        break
                if null_col:
                    dropped_sel = aq.outer_to_inner_dropped_select(select, alias, null_col)
                    queries = [AuditQuery("dropped", aq.count_sql(dropped_sel))]
                    if sample_limit:
                        queries.append(
                            AuditQuery("sample", aq.sample_sql(dropped_sel, sample_limit), is_sample=True)
                        )
                    add(
                        "OUTER_TO_INNER",
                        f"{side} JOIN {alias} + WHERE {' AND '.join(_sql(c) for c in rejecting)}"
                        " — outer join silently turned inner",
                        queries,
                    )

        # NULL_KEY: left-side key columns that are NULL never match.
        if (is_inner or is_outer) and left_cols:
            for tbl_alias, col in left_cols:
                t = aliases.get(tbl_alias)
                if t is None:
                    continue
                add(
                    "NULL_KEY",
                    f"{tbl_alias}.{col} IS NULL never matches join to {alias}",
                    [AuditQuery("dropped", aq.null_key_sql(_table_sql(t), tbl_alias, col))],
                )

        # FANOUT: duplicate keys on the joined side inflate rows.
        if right_cols and alias in aliases:
            add(
                "FANOUT",
                f"duplicate join keys ({', '.join(right_cols)}) in {alias} inflate rows",
                [AuditQuery("dup_keys", aq.fanout_sql(_table_sql(aliases[alias]), alias, right_cols))],
            )

    if where is not None:
        pre = aq.pre_filter_select(select)
        queries = [
            AuditQuery("pre_filter", aq.count_sql(pre)),
            AuditQuery("survived", aq.survived_sql(select)),
        ]
        add(
            "WHERE_FILTER",
            f"WHERE {_sql(where.this)} — rows filtered out",
            queries,
        )

    return points
