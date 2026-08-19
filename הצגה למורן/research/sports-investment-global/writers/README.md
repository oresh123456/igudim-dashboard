# Output writers — the pluggable seam

Findings are stored **format-neutral** in `findings.jsonl`, one JSON object per line:

```json
{ "entity": "...", "field": "...", "value": "...", "source_key": "...", "run": "...", "agent": "...", "date": "..." }
```

A **writer** is a pure projection `findings.jsonl → <some format>`. The swarm never knows or cares which writer you use. Swapping output format = swapping the writer, zero changes to dispatch/ledgers.

## Contract

Every writer takes the same first two positional args:

```
<writer> <findings.jsonl path> <output path> [options...]
```

- reads the neutral schema above,
- projects it to the target format,
- writes `output path`.

Anything format-specific — field→column mapping, sheet names, text encoding, number parsing, unit conversion — lives **inside the writer** (or its own config), never in the swarm.

## Bundled writers

| Writer | Format | Notes |
|---|---|---|
| `to-csv.ps1` | CSV | `-Encoding utf8BOM` by default (Hebrew opens correctly in Excel). One row per finding. |
| `to-jsonl.ps1` | JSONL | Filter/select/reshape passthrough. Good for feeding another tool. |
| `to-md.ps1` | Markdown | Table grouped by `entity`. Good for a human-readable report / handoff. |

## Adding a writer (e.g. xlsx, google-sheets, a wide pivot)

Copy the signature. Two common shapes:

- **Long/tidy** (default): one output row per finding — trivial for csv/jsonl/md.
- **Wide/pivot**: pivot `entity` → rows, `field` → columns, `value` → cells. Put the `field → column` map and sheet layout in a small `*-config.json` next to the writer. This is where an `xlsx` writer (Excel COM) or a Google Sheets writer belongs — the neutral schema is the only thing they share with the swarm.

Example xlsx stub (not bundled — write when needed):
```powershell
# to-xlsx.ps1  findings.jsonl  out.xlsx  columnmap.json  [sheet]
# 1) read findings.jsonl  2) pivot entity x field  3) Excel.Application COM: map field->col via columnmap.json, write, Save.
```

Keep the swarm's `findings[]` vocabulary (`entity`/`field`) as project config passed per run — do not bake column names into the dispatcher.
