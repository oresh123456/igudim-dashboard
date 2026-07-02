"""CLI orchestration: discover -> extract -> analyze -> classify -> audit -> report."""
from __future__ import annotations

import argparse
import sys

from .analyze import analyze_statement
from .classify import classify_statement
from .graph import build_dag
from .models import AuditResult, EtlStatement, SourceObject
from .plsql import extract_statements
from .report import render


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="etl-drop-audit",
        description="Find silent row-drops in a Postgres ETL. Read-only.",
    )
    sub = p.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="run the full audit and write report.html")
    run.add_argument("--schema", action="append", default=None,
                     help="schema to scan (repeatable; default: all non-system)")
    run.add_argument("--limit-sample", type=int, default=20,
                     help="dropped-row sample size per drop point; 0 = counts only, no row data")
    run.add_argument("--timeout", type=int, default=60,
                     help="per-query statement_timeout in seconds")
    run.add_argument("--out", default="report.html", help="output HTML path")
    run.add_argument("--dry-run", action="store_true",
                     help="discover+classify and print audit SQL without executing audits")
    return p


def pipeline(objects: list[SourceObject], sample_limit: int):
    statements: list[EtlStatement] = []
    for obj in objects:
        statements.extend(extract_statements(obj))
    for st in statements:
        analyze_statement(st)
    unparsed = [s for s in statements if s.error]
    points = []
    for st in statements:
        points.extend(classify_statement(st, sample_limit))
    return statements, points, unparsed


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    from . import db as dbm
    from .discover import discover
    from .runner import run_audits

    try:
        conn = dbm.connect(timeout_s=args.timeout)
    except Exception as e:  # noqa: BLE001
        print(f"connect failed — is the SSM tunnel / DB reachable? ({e})", file=sys.stderr)
        return 2

    with conn:
        objects = discover(conn, args.schema)
        print(f"discovered {len(objects)} objects")
        statements, points, unparsed = pipeline(objects, args.limit_sample)
        print(f"{len(statements)} DML statements · {len(points)} drop points · "
              f"{len(unparsed)} unparsed")

        if args.dry_run:
            for p in points:
                print(f"\n-- [{p.kind}] {p.obj_name} -> {p.target}\n-- {p.description}")
                for q in p.audit_queries:
                    print(f"-- {q.label}\n{q.sql};")
            results = [AuditResult(drop_point=p, status="NOT_RUN") for p in points]
        else:
            results = run_audits(conn, points)

    dag = build_dag(statements)
    html_text = render(dag, results, unparsed)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(html_text)
    flagged = sum(1 for r in results if r.dropped > 0)
    print(f"report written to {args.out} — {flagged} drop points with dropped rows > 0")
    return 0
