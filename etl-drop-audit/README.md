# etl-drop-audit

Generic, **read-only** Postgres ETL silent-drop auditor. Point it at any
Postgres database: it discovers all plpgsql/sql procs, functions and views
from the system catalogs, parses their DML with sqlglot, classifies
silent-drop patterns, runs count/sample audit queries, and writes a
single-file `report.html` with a pipeline DAG (red edges = confirmed drops).

**Genericity (hard rule):** the code assumes only the tech stack
(Postgres + plpgsql). Zero hardcoded schema/table/proc/column names, zero
naming-convention logic. Everything is discovered at runtime.

## Drop classes

| class | meaning |
|---|---|
| `INNER_JOIN` | unmatched rows silently dropped by an inner join |
| `OUTER_TO_INNER` | LEFT/RIGHT join + null-rejecting WHERE on the outer side — outer join silently turned inner |
| `NULL_KEY` | rows whose join key IS NULL can never match |
| `WHERE_FILTER` | plain WHERE filter dropping rows |
| `FANOUT` | duplicate join keys on the many side inflating rows |

Statements that look like DML but cannot be parsed are listed as
**UNPARSED** in the report — never silently skipped.

## Setup

```
pip install -e .[dev]
cp .env.example .env   # fill standard PG* vars (libpq)
```

DB must be reachable (e.g. via an SSM port-forward tunnel to `localhost:5432`).

## Run

```
python -m etl_drop_audit run                       # all non-system schemas
python -m etl_drop_audit run --schema public       # repeatable
python -m etl_drop_audit run --limit-sample 0      # counts only, no row data (no PII)
python -m etl_drop_audit run --dry-run             # print audit SQL, execute nothing
python -m etl_drop_audit run --timeout 120 --out audit.html
```

## Read-only guarantee

1. Session opened with `default_transaction_read_only=on` — Postgres itself
   rejects any write, even if the tool bugs out.
2. `conn.read_only = True` at the driver level.
3. Every generated audit query is a pure `SELECT`.

Plus `statement_timeout` per query (default 60s) so no runaway counts.

## Tests

```
python -m pytest tests/ -v
```

Synthetic fixtures only — the repo contains no knowledge of any specific system.
