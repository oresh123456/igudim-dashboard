# Building-permit data sources — swarm run 2026-07-17p

Goal: where to obtain building-permit (היתרי בנייה) data to catch sports-facility **existence** outside the self-reported קובץ המתקנים spine. 8 agents (4 national / 4 authority), 270 findings, 39 distinct sources.

## Verdict: NO national permit tap exists publicly. Coverage must be built per-authority — and the efficient unit is the VENDOR, not the city.

## NATIONAL tier — exhausted, no clean feed
- **רישוי זמין** (the one national chokepoint all committees route permits through since Amendment 101): **transactional / account-required only.** No open API, no export, no CKAN, no ArcGIS. 403/DNS-fail on every probe. *If it ever exposes a status-lookup/API it would obsolete everything below — flagged as top FOI/reverse-engineer target, not available today.*
- **data.gov.il**: 0 permit datasets across ~15 terms + 5 national orgs (מנהל התכנון, רמ"י, בינוי, מסים, פנים). Confirmed dead.
- **iplan ArcGIS**: planning-only (PlanningPublic + Utilities folders); no licensing/permit service. Confirms earlier finding.
- **mavat SV3 — ועדות מקומיות meeting/decision search**: national, no-auth, live rolling — BUT parcel/address only inside PDF text; **no structured cross-ref, sport not filterable.** PDF-locked.
- **CBS**: aggregate series API (no cross-ref) + **research-room microdata** (חדר מחקר, account-required, on-site; per-permit availability unconfirmed → email info@cbs.gov.il).
- **Ministry of Housing `hitkadmuthabnia`**: national, Month/Automat — but housing-marketing projects only, structurally sport-blind.
- **Ministry of Labor "active building sites"** (reposted via Haifa DataCity, daily, national): "construction in progress" signal with address — **no use-type, can't isolate sport**. Adjacent lead.
- GovMap / מפ"י BNTL / רמ"י: national geo (gush/helka, address) but **no permit dataset** joinable; land/geo authorities bot-blocked (under-explored).
- Madlan / commercial vendors: no confirmed public permits API.

## AUTHORITY tier — REAL and buildable
**Best-in-class proof:** **Tel Aviv IView2 `MapServer/772` — בקשות והיתרי בניה.**
`https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/772/query?where=1=1&outFields=*&f=json`
No auth · Esri REST JSON · `date_import=17/07/2026` (today → daily) · address + polygon geometry (spatial-join to facility) · sport = **partial** (free-text `sug_bakasha`/`tochen_bakasha`, match ספורט/בריכה/מגרש/אולם). Single authority.

**The scaling insight — onboard by VENDOR (one integration ≈ many authorities):**
- **Complot** (`<authority>.complot.co.il`): permit-request search + building-file + gush/helka locator. Confirmed authorities: **Haifa, Rishon LeZion, Sderot, Emek HaYarden, Kiryat Gat, Givot Alonim, Galil Tahton** (+more). Cloudflare 403 to bots (human/browser works); sport = partial (text-match).
- **Bartech-net** (`<authority>.bartech-net.co.il`, `rin.bartech-net.co.il/SearchPermitApplication`): confirmed **Kiryat Ono, Azor, Nof HaGalil, Hof HaCarmel, Arad, Golan, Hadera, Akko, Yoav, Emek HaMaayanot, Lachish, Menashe, Rosh HaAyin** (+more). No category field.
- **Complot GISNET v5** (`v5.gis-net.co.il/v5/<city>`): Netanya etc.
- Own-ArcGIS large cities: TLV (772), Ashdod `gis.ashdod.muni.il/arcgis/rest/services`, others — systematic scan of `gis.<city>.muni.il/arcgis/rest/services` recommended.

**DataCity CKAN platform** (Jerusalem, Haifa, Kfar Saba, Netanya, Ma'ale Adumim + Beer Sheva peer): uniform CKAN API, infra ready — **but permits are NOT a standard dataset today** (only Haifa building-sites = national repost; Jerusalem TAMA-38 = stale ~3yr, narrow). Watch, don't build on yet.

**No-feed floor:** small councils (e.g. Lachish RC engineering dept) = contact-only / physical notice-board (לוח מודעות) → those route to Bartech-net for the digital layer; genuinely PDF/manual authorities exist below the vendor line.

## Cross-cutting limits
- **No source cleanly isolates sport** — everywhere it's free-text match on permit description, never a coded facet.
- **Cross-ref keys vary**: TLV = address+geometry (no gush/helka); Complot = gush/helka; Bartech = address/gush-helka. Normalize on address + ITM/geometry, with gush/helka where present.
- Vendor portals are Cloudflare-protected → need browser-rendered fetch, not plain HTTP.

## Recommended next moves (priority)
1. **Build the TLV 772 puller now** (live, no-auth, spatial) — proves the pipeline end-to-end for one big city.
2. **One integration per vendor** (Complot, Bartech-net) → unlocks ~20 authorities at once; handle Cloudflare via headless browser.
3. **FOI / reverse-engineer רישוי זמין** — the only path to a true national tap; email Ministry of Interior planning admin + probe for a status-lookup XHR.
4. **Email CBS research room** — confirm per-permit microdata availability for national coverage (aggregate otherwise).
33 next-round leads captured in `findings.jsonl` (run 2026-07-17p) for a follow-up frontier.
