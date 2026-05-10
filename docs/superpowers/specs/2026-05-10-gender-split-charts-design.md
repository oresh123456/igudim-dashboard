# Gender Split Across Dashboard Charts — Design

**Date:** 2026-05-10
**Scope:** `dashboard.html` + `app.js`. No data changes.

## Goal

Wherever the STT (`STT_Aigudim_Agudut_Gold.xlsx`) and the mock data expose a gendered breakdown of a metric, present it as a stacked or grouped bar (men vs. women) instead of a single aggregate. This was previously only present on the dedicated women's-sport page (`wg`).

## Data sources for the split

- `MOCK.fact_support_request_spo` paired columns: `male_cnt` / `female_cnt`, `male_score` / `female_score`, `male_achievement_score` / `female_achievement_score`.
- `MOCK.fact_athlete.athlete_gender` ∈ {`זכר`, `נקבה`} — used by AF/AA pages.
- `total_budget` is a single per-request number — **not gendered**, no derivation.
- Women-only fields (`women_promotion_score`, `female_coaches_cnt`, `female_management_cnt`) — already used on `wg`, no male equivalent.

## Color convention

Reuse existing constants:
- Men: `TEAL` (`#0D5F73`)
- Women: `WOMEN` (`#86198F`)

This matches the `wg` page so the meaning of each color is consistent across the whole dashboard.

## Per-page changes

### 1. Athletes / Federations (`af`)

| Chart | Change |
|---|---|
| `af_byFederation` | Single bar → **stacked** (`זכר`/`נקבה`). Use `stackHbarOpts`. |
| `af_genderByFed` | **Keep** — explicitly framed as "top 8 by gender", complements the new stacked view. |
| `af_olympic`, `af_branchType` | Unchanged (overall ratios). |
| `af_byAge`, `af_ageGroupM`, `af_ageGroupW` | Unchanged (already gendered). |
| `af_yoyComparison` | 4 datasets: `2026 ז`, `2026 נ`, `2025 ז`, `2025 נ`. Grouped horizontal bars per federation. |
| `af_yoyTotal` | Each year-bar **stacked** by gender. |

### 2. Athletes / Associations (`aa`)

| Chart | Change |
|---|---|
| `aa_byAssoc` | Stacked ז/נ. |
| `aa_byCity` | Stacked ז/נ. |
| `aa_byTeam` | Stacked ז/נ. (Team names already include "— נשים" suffix where applicable; the stack still adds clarity by making the breakdown explicit.) |
| `aa_byPeriphery`, `aa_bySocio` | Grouped bars ז/נ — same pattern as existing `wg_periByGender` / `wg_socioByGender`. |
| `aa_byAge`, `aa_ageGroupM`, `aa_ageGroupW` | Unchanged (already gendered). |
| `aa_yoyComparison` | 4 datasets: `2026 ז`, `2026 נ`, `2025 ז`, `2025 נ`. |
| `aa_yoyTotal` | Each year-bar **stacked** by gender. |

### 3. Budget / Federations (`bf`)

`total_budget` itself is not gendered, so we don't fabricate a split. Two charts already pair budget with a gendered side-metric — we expose that breakdown in the data label:

| Chart | Change |
|---|---|
| `bf_byAthletes` | Data-label changes from `₪15.4M | 5,584` to `₪15.4M | 5,584ז · 175נ`. Bar still represents `total_budget`. |
| `bf_byAchievement` | Data-label adds male/female achievement scores: `₪15.4M | 386ז · 8נ נק'`. |
| All other charts | Unchanged. |

### 4. Budget / Associations (`ba`)

| Chart | Change |
|---|---|
| `ba_byAthletes` | Same data-label change as `bf_byAthletes`. |
| `ba_byAchievement` | Same data-label change as `bf_byAchievement`. |
| All other charts | Unchanged. |

### 5. Women's Sport (`wg`)

No change — already gendered.

## Non-goals

- No new data files, no STT changes.
- No structural change to `dim_association` (each איגוד remains one entity, not split into two rows).
- No backwards-compat shims for the removed/changed chart datasets.

## Risks and notes

- Stacked-bar data labels are currently disabled in `stackHbarOpts` (`dataLabels:{display:false}`). For the new stacked charts this is fine — the legend shows the gender colors and tooltips give exact numbers.
- The 4-dataset YoY (af/aa) needs a coherent visual: option chosen is **2-color × 2-tone** — `TEAL`/`TEAL_L` for 2026/2025 men, `WOMEN`/`WOMEN_L` for 2026/2025 women — using existing constants only.
- `af_genderByFed` will look similar to the new `af_byFederation` in 8/10 federations. Keeping per user direction; risk is mild redundancy, mitigated by the chart's explicit "8 leaders" framing.
