"""Execute audit queries read-only; a failing/timing-out query never aborts the run."""
from __future__ import annotations

import psycopg

from .models import AuditResult, DropPoint


def run_audits(conn: psycopg.Connection, points: list[DropPoint]) -> list[AuditResult]:
    results = []
    for p in points:
        res = AuditResult(drop_point=p)
        for q in p.audit_queries:
            try:
                with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    cur.execute(q.sql)
                    rows = cur.fetchall()
                conn.commit()
                if q.is_sample:
                    res.samples = [
                        {k: (str(v) if v is not None else None) for k, v in r.items()}
                        for r in rows
                    ]
                else:
                    res.counts[q.label] = next(iter(rows[0].values())) if rows else None
            except psycopg.errors.QueryCanceled:
                conn.rollback()
                res.status = "TIMEOUT"
                res.counts.setdefault(q.label, None)
            except psycopg.Error as e:
                conn.rollback()
                res.status = "ERROR"
                res.error = str(e).strip().splitlines()[0]
                res.counts.setdefault(q.label, None)
        if p.kind == "WHERE_FILTER" and res.status == "OK":
            pre, surv = res.counts.get("pre_filter"), res.counts.get("survived")
            if isinstance(pre, int) and isinstance(surv, int):
                res.counts["dropped"] = pre - surv
        results.append(res)
    return results
