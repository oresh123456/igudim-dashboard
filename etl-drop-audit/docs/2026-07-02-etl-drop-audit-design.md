# etl-drop-audit — design

**Goal:** find every silent row-drop in the SQL layer of the ETL (Postgres stored procs), quantify it, visualize it. Run by a business expert directly — no data-engineer loop, provably read-only.

**Genericity rule (hard):** code assumes ONLY the stack (Postgres + plpgsql procs/views), never this system's schema. No hardcoded table names, proc-name prefixes (`sp_*`, `mrr_/stg_/dwh_`), column names, or layer conventions. Everything is discovered from catalogs and parsed SQL. Schema filter is a CLI arg (default: all non-system schemas). Pipeline layers in the DAG derive from actual INSERT-target ← FROM-source edges, not naming.

## Context

- Pipeline: Glue (src→bronze→silver, out of scope — drops are SQL-side) → Postgres procs `sp_stg_*` (mrr→stg: joins+filters = drop zone) → `sp_dwh_*` (stg→dwh: straight copy).
- Confirmed drop pattern in `sp_stg_aa_dim_teams`: `LEFT JOIN mrr_aa_new_supportrequests r ON … WHERE r.support_request_code IS NOT NULL` — LEFT turned INNER, unmatched teams vanish unlogged.
- DB reachable at `localhost:5432` via user-run AWS SSM port-forward tunnel (same as DBeaver).

## Architecture — python CLI, 3 stages, one command

```
etl-drop-audit run  →  discover → analyze → audit → report.html
```

### 1. Discover
- Connect psycopg using standard `PG*` env vars from `.env`.
- Pull all proc/function defs from `pg_proc` (`pg_get_functiondef`) + view defs from `pg_views`; schemas from `--schema` arg (default: all non-system).
- Filter: bodies containing `INSERT INTO … SELECT` / `CREATE TABLE AS` / `UPDATE … FROM` (procs) / any view with joins.

### 2. Analyze (sqlglot, postgres dialect)
Per statement, extract:
- **join inventory:** target table, source tables, join type, join keys.
- **drop-point classification:**
  - `INNER_JOIN` — unmatched rows dropped
  - `OUTER_TO_INNER` — LEFT/RIGHT join + WHERE null-check on inner side (the confirmed pattern)
  - `NULL_KEY` — rows whose join key IS NULL can never match
  - `WHERE_FILTER` — plain filter dropping rows
  - `FANOUT` — dup keys on the many-side inflating rows (opposite failure, same family)
- Emit audit SQL per drop-point: source count, survived count, dropped-by-join, dropped-by-filter, null-key count, + `LIMIT 20` sample of dropped rows.
- plpgsql parsing: strip proc wrapper (DECLARE/BEGIN/END, RAISE, GET DIAGNOSTICS, TRUNCATE) with regex, feed inner SQL statements to sqlglot. Statements sqlglot can't parse → listed in report as UNPARSED (never silently skipped — this tool of all tools must not silently drop).

### 3. Audit + report
- Run audit SQL, all read-only.
- Emit single-file `report.html` (no server, embedded JS):
  - **DAG** built from discovered edges (INSERT target ← FROM sources); node = table, edge = proc/statement; edge label `in → out (−dropped)`; red edge = drops > 0. Layering by topological sort, not name convention.
  - Click edge → breakdown by drop class + sample dropped rows (Hebrew-safe, UTF-8).
  - Summary table sorted by dropped-row count; UNPARSED list at bottom.

## Read-only guarantee (3 layers)

1. Connection opts: `default_transaction_read_only=on` — Postgres rejects any write in-session, even if the tool bugs out.
2. Every query wrapped `BEGIN READ ONLY … COMMIT`.
3. Optional later: dedicated `readonly_audit` role (not a blocker).

Plus safety valves: `statement_timeout=60s` per query (no runaway COUNTs), `--limit-sample N` for sample size.

## Config

`.env` (gitignored, user-filled): standard `PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD`.
CLI args: `--schema` (repeatable) · `--limit-sample N` (default 20; `0` = counts-only, no row samples/PII) · `--timeout SECONDS` (default 60) · `--out report.html`.
Precondition here: SSM tunnel up → `PGHOST=localhost PGPORT=5432`; but tool is deployment-agnostic (any reachable PG).

## Out of scope (v1)

Glue/spark level · scheduling/CI · auto-fixing procs · non-public schemas.

## Error handling

- Tunnel down → clear message "connect failed — is the SSM tunnel running?"
- Unparseable proc → UNPARSED section, run continues.
- Audit query timeout → marked TIMEOUT in report, run continues.

## Testing

- Unit: synthetic plpgsql fixtures ONLY — one per drop class + straight-copy (no false positive) + unparseable → UNPARSED. No real proc dumps in the repo (repo itself must show zero system knowledge; genericity rule extends to fixtures). The confirmed OUTER_TO_INNER pattern is covered by a synthetic equivalent.
- Integration (manual, this deployment): run against live DB read-only; assert report renders + `sp_stg_aa_dim_teams` flagged. Not part of the generic test suite.
