# research-swarm — durability & documentation improvements (design)

Status: **PROJECT-LOCAL BUILT + VALIDATED 2026-07-15** (`api-research/tools/harvest-lib.ps1`, `wf-discover.js`, `test-harvest.ps1`). Not yet upstreamed. Build **project-local first** (done), then **upstream to the user-scope skill** (`~/.claude/skills/research-swarm`). See CLAUDE.md guardrail.

## Build status
- ✅ `harvest-lib.ps1`: Read-DropReport, Get-AgentLabel, Export-Provenance, Read-PartFile (malformed-tolerant), Merge-Round (return-primary + .part salvage, run-stamped/idempotent), Get-UnreportedFetches, Write-State.
- ✅ `wf-discover.js`: `agentWithRetry` (RETRIES attempts), incremental `.part` capture via Bash heredoc, coverage-row-per-fetch + `why` (schema + prompt).
- ✅ `test-harvest.ps1`: ALL PASS — synthetic (part-bucket, salvage-no-double-count, idempotency, unreported-diff, state) + REAL run wf_b2fff1e9-f62 (drops=3, provenance=445 w/ statuses+labels).
- ✅ LIVE smoke (run smoke-1, target mapping-viz-tools): agent wrote valid `.part` mid-run (0 malformed), `why` populated (incl. 4 `dead` sources with rejection reasons), machine-key filename. #2+#3 proven on a real agent.
- ✅ `Complete-Round` per-round wrapper (Merge→Provenance→State); reads workflow result from the task `.output` file under `.result`. Integrated test on the real smoke return: coverage=20 (return preferred, `.part` NOT double-counted), findings=120, salvaged=0, drops=0, unreported=0.
- ✅ `Get-UnreportedFetches` refined to WebFetch-only (searches are exploration, not sources) — removed false positives (11→0 on smoke).
- ✅ `test-golden.ps1` — TIER 1 golden (deterministic, no LLM) vs data_climate's real 43-run ledgers. 21 checks PASS. Locks Read-DoNotSearch known answers (5750 rows → 4597 distinct keys → **3605 off / 992 revisit**, invariant off+revisit==distinctKeys) + Write-State schema-tolerance (no `entity`→entities=0 no crash; no `why`→"none recorded"; `live` status unmodeled→ranks 0→revisit).
- ✅ FIXED (caught by golden): `Read-DoNotSearch` dedup was **case-inconsistent** — canonical keys are case-SENSITIVE on path (`Get-CanonUrl` lowercases host only, 4597 distinct) but the `$best` hashtable was case-INSENSITIVE → collapsed 13 path-case-variant keys to 4584, silently marking a not-yet-mined variant off-limits. Fix: `$best`/`$revisit` now ordinal `Dictionary[string,object]` (match the ordinal `$off` HashSet + canonicalization). Restores the handoff's intended 3605/992. Carry this fix into the upstream skill lib.
- ✅ `test-golden-t2.ps1` — TIER 2 LIVE known-answer (run `golden-t2`, 3 agents: datagovil-geo-sport, govmap-israel-gis, osm-overpass-sport). **ALL PASS** (171k tokens, 0 errors). Proved end-to-end on a real swarm: #3 all 3 `.part` valid+non-empty, 0 malformed, written live; #1 STATE derived, drops=0; no `.part` double-count (37==37 return-preferred); ACCEPT known-answer = dataset 408 datastore w/ ITM X/Y + 31 geo findings + real `spatial` field; #2 = 10 documented rejections w/ `why`; REJECT known-answer = Nominatim surfaced WITH "1 req/s, no bulk" caveat. Isolated in scratchpad (production ledgers untouched).
- ⚠ FINDING (caught by Tier 2 live, invisible to Tier-1 synthetic): the **#2 unreported-fetch backstop over-flags** (19/37 this run) because provenance canonicalization (`Get-CanonUrl` on the raw fetched URL) and the agent's self-reported coverage key diverge — provenance keeps `.html`, pagination/`limit`/`rows`/`f=json` query params, URL-encoded Hebrew, and the `r.jina.ai/<url>` reader-proxy prefix; the agent writes a human-canonical key without them. Sources ARE captured (no data loss) but the STATE review queue fills with noise → erodes signal. Fix before upstream (all touch shared `Get-CanonUrl` → re-verify dispatch dedup after): strip `r.jina.ai/`+reader-proxy prefixes; percent-decode before canonicalizing; strip pagination params (`rows,limit,offset,page,f`) — or strip ALL query for the diff only. A few of the 19 are GENUINE (rolled-up ArcGIS probe fetches) — backstop working as intended there.
- ⏳ TODO: fix unreported-diff precision (above); full 20-agent round-2 at scale; upstream to skill (`templates/wf-gather.js` + `scripts/harvest-lib.ps1`) + update `tests/test-skill.ps1` (align w/ data_climate's `test-projectmap.ps1` conventions), carrying BOTH fixes (case-sensitive dedup + unreported precision).

## Per-round sequence (operator recipe)
```
1. read STATE.md (compact context)
2. Build-DnsMap(coverage.jsonl) -> dns arg          # dispatch dedup, disk->script->args
3. Workflow(wf-discover.js, {run, partsDir, dns, ...})  # agents write <key>.part incrementally
4. $R = (Get-Content <task>.output | ConvertFrom-Json).result
5. Complete-Round -Result $R -WorkflowDir <wfdir> -PartsDir <partsDir> -Coverage .. -Findings .. -Provenance .. -StateOut STATE.md -AllWorkflowDirs @(all run dirs)
   # = Merge-Round (+ .part salvage for drops) -> Export-Provenance -> Write-State
6. re-read STATE.md: any UNRECOVERED failures -> re-dispatch those; review UNREPORTED queue
```

## Governing principle
Structured findings + canonical keys stay **PRIMARY** (efficiency, clean dedup/compare, cheap cross-session pickup). We do **not** invert to transcript-as-truth (LLM-parsing transcripts every run = the token blowup we reject). We add **durability + detection + a resume anchor** *around* the clean-key core — never replacing it, never fattening the fragile findings blob.

## Three distinct worries → three mechanisms

**#1 — Orchestrator must resume weeks later (session/handoff layer)**
→ **`STATE.md`, derived.** A deterministic pass regenerates it from the ledgers. Holds: coverage% + off-limits map, pending frontier, unrecovered failures (#3), unreported-fetch queue (#2), decisions digest.
- Entered **at skill activation** (regenerate → read), rewritten **after each `Import-Run` merge**.
- **Strictly derived, never hand-edited** (matches global anti-drift rule). Points *into* the ledgers for detail.

**#3 — Agent stopped before finishing → gathered work dropped (agent durability)**
→ **Incremental capture.** Each agent owns a file (`agents/<key>.part`) and writes **one checkpoint per source explored** via Bash (pure agents CAN touch FS — REFERENCE.md:144). Interrupt/truncation → the file holds everything up to the stop. The structured return demotes to a **pointer**.
- Recovery ladder (cheapest first): **detect** (journal `started` vs `result` diff, zero-token) → **auto-retry** in-workflow wrapper (`agentWithRetry`, 1–2 attempts, clean keys) → **salvage** from the agent's own `.part`/transcript (last resort only) → **explicit-flag** in STATE.md (never silent).

**#2 — We genuinely miss info an agent found but didn't surface (agent completeness)**
→ **Coverage-row-per-fetch, by construction.** Every source touched gets a `coverage[]` row with `status` + a **terse `why`** (tag + short phrase, e.g. `dup`, `404`, `off-topic`, `"low-quality, no sport data"`). No un-accounted fetches by design. This doubles as the **decision documentation**.
- Backstop: deterministic **fetched (provenance) vs reported (coverage) diff** — surfaces disobeyed rows as an "unreported fetches" review queue in STATE.md.
- Cost: measured ~**<1%** output overhead (this run: 340 coverage rows already exist across 20 agents / 1.59M tokens; delta ≈ few rows + terse `why` ≈ ~9k tokens total). Keep `why` **terse** — the one knob that could balloon. Zero added truncation risk because it folds into the incremental per-source checkpoint (#3), not the one big blob.

## Deferred (revisit with evidence, do NOT build now)
- Instruct agents to **prefer (never enforce)** a decision-schema for the `why`/notes. Decide empirically after reading real agent reports — does a schema cut parse cost, or is it too narrow and disable agents? Leave the skill without it for now.

## File layout — separated by purpose so the orchestrator limits context
Key distinction: "enters orchestrator LLM context" ≠ "consumed by the swarm." Scripts read big ledgers from disk and hand back compact projections; only the projections (and `findings.jsonl`) enter the context window.

| File | Holds | Consumed by |
|---|---|---|
| `STATE.md` (derived) | compact digest (coverage summary, frontier, failures#3, unreported#2, decisions) | **orchestrator context — default entry at activation** |
| `findings.jsonl` | clean-key facts | orchestrator context, when synthesizing |
| `coverage.jsonl` (+`why`) | effort log = **DISPATCH MAP** + self-reported decisions | **`Build-DnsMap` → dispatch dedup (disk→script→`dns` arg, NOT context)**; STATE deriver; provenance diff |
| `provenance.jsonl` | machine-observed tool-call trail | derive/diff scripts only |
| `agents/<key>.part` | per-agent incremental capture | merged by `Import-Run`; salvage source |

Default **context** = `STATE.md` + `findings.jsonl`. Verbose ledgers are out of the default *context* load path but are **script-consumed** — `coverage.jsonl` stays load-bearing for dispatch, it just flows through `Build-DnsMap`, never raw into the window.

## Dispatch uniqueness (unchanged in principle, one new ordering rule)
Uniqueness = **disjoint target partitioning** (intra-round, orchestrator assigns each agent a distinct target) **+ `Build-DnsMap(coverage.jsonl)`** (cross-round off-limits). Both script-driven; neither needs raw coverage in context. The dispatch map was always a projection of coverage produced at dispatch time.

NEW RULE from incremental capture: an interrupted agent's coverage rows sit in its `.part`, not yet in `coverage.jsonl`. So **merge `.part` files into `coverage.jsonl` BEFORE rebuilding the dns map**, else a re-dispatch re-searches what the dead agent already mined. Per-round sequence:
```
read STATE.md → Import-Run (merge returns + .part → coverage.jsonl)
  → Build-DnsMap(coverage.jsonl) → dns arg → dispatch disjoint targets
  → merge → re-derive STATE.md
```
Benefit: interrupted work still contributes to dedup, so re-runs skip it.

## Build order
1. Project-local in `api-research/tools/` (retry wrapper, detect pass, incremental capture, coverage `why`, STATE.md deriver, fetched-vs-reported diff).
2. Prove on a real round-2.
3. Upstream proven version into the skill (`templates/wf-gather.js` + new `scripts/*-lib.ps1`), update `tests/test-skill.ps1`.

## Unresolved
- STATE.md: any **authored** narrative the ledgers can't derive, or 100% derived? (leaning 100% derived)
- Incremental checkpoint granularity: per-source vs per-N-findings (leaning per-source).
- Salvage: LLM-reparse the `.part` vs mechanical — only matters if retry also fails.
