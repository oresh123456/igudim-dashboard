### Wikidata Query Service (SPARQL endpoint)  _(area: None)_
- **provider**: Wikimedia Foundation (Wikidata project)
- **access**: https://query.wikidata.org/sparql?query=<url-encoded-SPARQL>&format=json (also web UI at query.wikidata.org)
- **auth**: none required, but must send a compliant User-Agent header or risk being blocked
- **cost**: free; throttled to 60s cumulative processing/min per client, max 5 parallel queries/IP, 30 error-queries/min, hard 60s per-query timeout, 429+Retry-After on breach
- **data_provided**: full Wikidata knowledge graph: entities, properties (P17 country, P625 coords, P115 home venue, P118 league, P571 inception, P19 birthplace, P106 occupation, P1083 capacity, P131 admin location, etc.)
- **spatial**: P625 gives WGS84 lat/lon (WKT Point) directly on clubs, venues, and birthplaces - no geocoding step needed, just a SPARQL join
- **enrichment_idea**: Fuzzy-match office's internal federation/club/facility name strings against Wikidata labels+aliases (P17=Israel filter) to pull exact P625 coordinates, home venue, founding year, league tier - fills gaps in internal address data with near-zero manual geocoding cost
- **dashboard_use**: תיק יישוב (heat maps of facilities/clubs per authority) and גוף נתמך card (venue location, founding date, league context)
- **israel_coverage**: good for top-tier clubs (all 12 Premier League + 15 Liga Leumit football clubs found w/ coords) and major venues; thin/inconsistent for lower divisions, amateur clubs, and non-mainstream sports; labels available in Hebrew (SERVICE wikibase:label lang 'he') but not always populated - many results fell back to English
- **reliability**: community-edited (not an official Israeli government source) but data is CC0-licensed - coordinates/facts CAN be stored/cached downstream freely, no ToS restriction found; freshness = live/real-time against current DB; caveat: broad classes like 'sports venue' (Q1076486) pull noise (marinas, ski resort, military bases mistagged) and at least one entry had visibly wrong coordinates (Hapoel Hadera F.C. resolved to Bavaria, Germany) - needs a sanity bounding-box filter on Israel's lat/lon before trusting

### Wikidata - Israeli football/basketball clubs w/ home-venue coordinates  _(area: None)_
- **provider**: Wikidata (community-curated, via Wikipedia infobox imports)
- **access**: SPARQL pattern: ?club wdt:P17 wd:Q801; wdt:P31/wdt:P279* wd:Q476028 (football) or wd:Q13393265 (basketball); wdt:P115 ?venue; ?venue wdt:P625 ?coord
- **auth**: none
- **cost**: free, same WDQS throttle as above
- **data_provided**: 57 football clubs (12 Premier League, 15 Liga Leumit, rest lower tiers) + 17 basketball clubs, each with club name, home venue, venue coordinates, league name
- **spatial**: exact lat/lon of home stadium/arena per club via P625 on the P115 venue link
- **enrichment_idea**: Join to internal 'תמיכות' (support) records by club name -> auto-plot every supported club's home venue on the תיק יישוב map, cluster by local authority, then overlay support amounts as a choropleth/bubble layer - turns a flat grants table into a spatial support-density map with zero manual address entry
- **dashboard_use**: תמיכות tab (map supported clubs), תיק יישוב tab (facility density per authority), גוף נתמך card (show club's home venue on a mini-map)
- **israel_coverage**: strong for top 2 football tiers and top basketball clubs; weaker below that - note some venue coords are shared across multiple clubs that groundshare (e.g. Maccabi/Hapoel Tel Aviv both point to same stadium coord), so venue-level dedup needed before using as a location proxy for the club itself
- **reliability**: community/secondary source (ultimately sourced from Wikipedia infoboxes, not an official league feed); CC0 so storable; one confirmed bad-coordinate case found (Hapoel Hadera F.C. -> Germany) - spot-check before production use

### Wikidata - Israeli athletes with place-of-birth coordinates  _(area: None)_
- **provider**: Wikidata
- **access**: SPARQL: ?person wdt:P27 wd:Q801; wdt:P106 wd:Q2066131 (or subclass path wdt:P106/wdt:P279* for footballer/basketball-player etc.); wdt:P19 ?birthplace; ?birthplace wdt:P625 ?coord
- **auth**: none
- **cost**: free, WDQS throttle applies
- **data_provided**: athlete name, birthplace name+coords, (extendable to sport, sex/gender P21, sports discipline, medals). Strict occupation=athlete match only returns 65 people (undercount) - broadening to subclass occupations (footballer, basketball player, judoka etc.) needed for full Israeli roster coverage
- **spatial**: birthplace-level coordinates (city/town granularity, not exact address) - usable for 'where do our athletes/medalists come from' choropleth, not for facility-level pinning
- **enrichment_idea**: Cross-reference notable/Olympic athletes' birthplace to local-authority polygons already used in תיק יישוב -> add a 'notable athletes produced' badge/count per authority, correlating with participation-rate and budget-efficiency metrics in the Impact & Efficiency tab
- **dashboard_use**: ביצועים ומגדר tab (notable achievers by hometown, gender split via P21), Impact & Efficiency tab (talent-output vs investment by authority)
- **israel_coverage**: only covers notable enough to have a Wikidata/Wikipedia article (mostly Olympic/international-level); sample skewed toward 1972 Munich Olympic team and older/historic athletes; many are foreign-born naturalized citizens (birthplace outside Israel) so 'birthplace' != 'home authority' - use with caution as a proxy for local development pipeline
- **reliability**: community-sourced, sparse for grassroots/non-elite athletes (which is most of what the ministry actually funds) - best treated as a 'notable alumni' enrichment layer, not a comprehensive athlete registry

### Wikidata - Sports venues/facilities in Israel with coordinates  _(area: None)_
- **provider**: Wikidata
- **access**: SPARQL: ?venue wdt:P17 wd:Q801; wdt:P31/wdt:P279* wd:Q1076486 (sports venue); wdt:P625 ?coord; optional P1083 capacity, P131 admin location
- **auth**: none
- **cost**: free, WDQS throttle applies
- **data_provided**: 170 venue-type entities: stadiums (w/ some capacity figures e.g. Haberfeld Stadium 6,000), tennis centers, marinas, pools, skate parks, ski resort, plus noisy non-sport entries (IDF bases, a cafe) tagged under the broad class - needs cleanup/whitelist by subclass (stadium Q483110, arena Q838948, swimming pool Q1476883, etc.)
- **spatial**: direct P625 coordinates per facility; P131 gives containing city/settlement for join to authority polygons
- **enrichment_idea**: Build a facility basemap layer for תיק יישוב independent of club affiliation - every marina/tennis-center/pool/stadium becomes a point; count facilities per authority as a 'sports infrastructure density' KPI, then overlay against CBS population to compute facilities-per-capita for the impact/efficiency tab
- **dashboard_use**: תיק יישוב heat map (facility density layer), Impact & Efficiency tab (facilities per capita)
- **israel_coverage**: decent for named/notable facilities (marinas, major stadiums, tennis centers all present) but almost certainly misses most municipal/neighborhood-level sports halls and courts the ministry actually funds - Wikidata only has what someone wrote a Wikipedia article for
- **reliability**: community-sourced, CC0 (storable); confirmed data-quality noise in the broad venue class (needs subclass filtering) and at least one bad coordinate elsewhere in the dataset (see football clubs entity) - treat as supplementary/notable-only layer, not a substitute for an official facilities registry

### Wikidata weekly RDF dumps (bulk alternative)  _(area: None)_
- **provider**: Wikimedia Foundation
- **access**: https://dumps.wikimedia.org/wikidatawiki/entities/ (full RDF/JSON dumps, updated weekly)
- **auth**: none
- **cost**: free
- **data_provided**: entire Wikidata graph as static files - avoids WDQS live-query rate limits if the office wants to build a one-time local enrichment batch (e.g. QuickSight-side ETL) instead of hitting the live endpoint repeatedly
- **spatial**: same P625 coordinates as live endpoint, just batch-extractable
- **enrichment_idea**: For a QuickSight ETL pipeline, a one-time/weekly dump-and-filter (grep Israel-tagged sports entities out of the dump) is more production-appropriate than live SPARQL calls from a dashboard refresh job - avoids the 60s/min throttle entirely
- **dashboard_use**: backend ETL for any tab using Wikidata-sourced spatial data, avoids live-query dependency in production
- **israel_coverage**: same coverage as live endpoint (it's the same underlying DB, just batched)
- **reliability**: official Wikimedia distribution channel, weekly cadence, large file size (multi-GB) - only worth it if building a recurring ETL rather than a one-off enrichment pass

### Israel MoT GTFS Static Feed  _(area: None)_
- **provider**: הרשות הארצית לתחבורה ציבורית / Ministry of Transport and Road Safety
- **access**: ftp://gtfs.mot.gov.il/israel-public-transportation.zip (nightly full republish); dev docs PDF at gov.il/BlobFolder/.../Gtfs Documentation v3.pdf
- **auth**: none — anonymous FTP, no key/registration
- **cost**: free, no quota (it's a static zip pull, not a rate-limited API)
- **data_provided**: standard GTFS: stops.txt (lat/lon of every bus/rail/light-rail stop, ~30,455 stops), routes, trips, stop_times, calendar, fare_attributes/fare_rules, agency (36 agencies), rolling 60-day schedule horizon; stop names translated to English+Arabic
- **spatial**: every stop has WGS84 lat/lon; shapes.txt gives route polylines — base layer for any transit-accessibility calc
- **enrichment_idea**: Build a nearest-transit-stop distance/walk-time field for every internal sports facility/club address (once geocoded); flag facilities >X min walk from any stop as 'transit-underserved' for the equity/accessibility tab; also use stop density as a covariate in local-authority tikYishuv heat maps
- **dashboard_use**: Tab 2 (tik yishuv) heat maps + Tab 6 (impact & efficiency) accessibility/equity metric
- **israel_coverage**: national, all public bus/rail/light-rail operators (36 agencies) — this IS the Israel-native source, not an adapted global one
- **reliability**: official primary government source, republished nightly; no explicit written license/ToS found (checked bus.gov.il, none surfaced) — verify reuse/storage terms with legal before publishing derived coordinates in a public-facing dashboard, though de-facto reuse is common (Hasadna's open-bus project redistributes it)

### SIRI-SM Real-Time Feed (MoT)  _(area: None)_
- **provider**: Ministry of Transport and Road Safety (National Public Transport Authority)
- **access**: proprietary SIRI-SM webservice (SIRI Stop Monitoring), not GTFS-Realtime; endpoint requires registration per MoT dev docs (not independently confirmed — PDF unreadable via fetch)
- **auth**: account-required (per Hasadna project notes); exact registration process not verified this pass
- **cost**: unclear/free for registered developers — not confirmed
- **data_provided**: live vehicle GPS positions, real vs scheduled arrival deltas per stop
- **spatial**: live lat/lon per vehicle
- **enrichment_idea**: low priority for this dashboard (strategic/BI, not ops-real-time) — better consumed via the Open Bus Stride API mirror below instead of raw SIRI
- **dashboard_use**: not recommended directly; see Stride API instead
- **israel_coverage**: national
- **reliability**: official primary, but access process opaque/unverified this pass — deprioritize vs. static GTFS for a strategic dashboard

### Open Bus Stride API (Hasadna)  _(area: None)_
- **provider**: The Public Knowledge Workshop / Hasadna (הסדנא לידע ציבורי) — civic-tech NGO, community reprocessing of MoT GTFS+SIRI
- **access**: https://open-bus-stride-api.hasadna.org.il (REST, OpenAPI/Swagger at /docs, schema at /openapi.json)
- **auth**: none observed (public Swagger docs, no key prompt in schema fetch) — verify before high-volume use
- **cost**: free, community-run, no published quota
- **data_provided**: REST-ified GTFS: /gtfs_routes, /gtfs_stops (with coords+city), /gtfs_rides, /gtfs_ride_stops, /gtfs_agencies; PLUS real-time-derived: /siri_routes, /siri_rides, /siri_ride_stops, /siri_vehicle_locations (live lon/lat), /siri_snapshots (historical); pre-built 'Route Timetable' / 'Stop Arrivals' / 'Rides Execution' query views
- **spatial**: stop-level and live-vehicle-level lat/lon via simple REST/JSON — much easier to consume in QuickSight ETL than raw GTFS zip + SIRI XML
- **enrichment_idea**: Use /gtfs_stops as the join target for a nearest-stop lookup against internal facility/org lat-lng (once geocoded), producing a 'PT accessibility score' per facility (count of stops within Xm, count of routes serving them, headway via gtfs_rides) — feeds directly into Tab 6 impact/efficiency and Tab 2 tik-yishuv without needing to parse raw GTFS
- **dashboard_use**: Tab 2 tik-yishuv heat maps, Tab 6 impact & efficiency accessibility metric
- **israel_coverage**: national, mirrors the full MoT feed
- **reliability**: community/NGO-run (not government primary) but reputable (Hasadna is Israel's established civic-tech org, ~1000+ commits, active); freshness tied to MoT's own nightly GTFS + SIRI cadence; treat as a convenience mirror, not authoritative — cite MoT as original source in any published dashboard

### TravelTime Isochrone API  _(area: None)_
- **provider**: TravelTime (commercial UK company)
- **access**: REST API, docs at docs.traveltime.com/api/reference/isochrones; also a no-code Isochrone Playground at playground.traveltime.com/isochrones
- **auth**: api-key — free developer signup
- **cost**: has a free tier for developers; paid plans described as flat-fee/unlimited-usage rather than per-request metering (marketing claim, exact free-tier request cap not confirmed this pass)
- **data_provided**: reachable-area polygons (isochrones) for driving, cycling, walking, AND public transport (uses real GTFS timetables + walk-to-station/transfer time)
- **spatial**: core function IS spatial: given a point + time budget + PT mode, returns the exact reachable polygon — this is the strongest direct fit for 'accessibility to nearest sports facility' analysis found this pass
- **enrichment_idea**: For each major sports facility, generate a 15/30/45-min public-transport isochrone; intersect with CBS statistical-area population+SES layer already in use to compute 'population within 30min PT of a facility' per local authority — a genuinely new equity metric for Tab 6/Tab 2. Reverse direction also works: isochrone FROM a neighborhood centroid TO find which facilities are reachable, for a 'coverage gap' map.
- **dashboard_use**: Tab 2 tik-yishuv heat map (new isochrone/coverage layer), Tab 6 impact & efficiency accessibility-vs-population metric
- **israel_coverage**: CONFIRMED 'Full' coverage for Israel on all 3 relevant modes: public transport, driving, walking (docs.traveltime.com/api/overview/supported-countries, verified live) — notably better-documented Israel support than any other isochrone vendor checked
- **reliability**: commercial/primary vendor, ingests official GTFS per-country (presumably the same MoT feed) — freshness tied to their ingestion cadence, not verified directly; caveat: commercial ToS likely restricts caching/storing raw polygons beyond a TTL — check ToS before persisting isochrone geometries in the warehouse

### openrouteservice Isochrones API  _(area: None)_
- **provider**: HeiGIT / GIScience research group, Heidelberg University
- **access**: REST API, https://api.openrouteservice.org/v2/isochrones/{profile}; docs giscience.github.io/openrouteservice
- **auth**: api-key — free signup at openrouteservice.org
- **cost**: free tier: 2,500 requests/day and 40,000/month overall, 40 concurrent; isochrones endpoint specifically capped at 500/day; per-request caps: 5 locations, 10 intervals
- **data_provided**: GeoJSON reachable-area polygons; profiles are driving-car, cycling, foot-walking, wheelchair — NO public-transit profile (OSM road-network routing only)
- **spatial**: walking/driving/cycling isochrones from any point, worldwide (OSM-based, so Israel coverage = whatever OSM has mapped, generally good in urban areas)
- **enrichment_idea**: Complement TravelTime with WALKING isochrones specifically (e.g. '10-min walkshed' around each facility) to assess last-mile/pedestrian accessibility separate from PT — cheap free-tier fit since only 500/day needed if run as a monthly batch job, not live
- **dashboard_use**: Tab 2 tik-yishuv walking-distance layer (secondary to TravelTime's PT isochrones)
- **israel_coverage**: global/OSM-based, not Israel-specific; quality depends on OSM road-network completeness in Israel (generally decent in cities, weaker in periphery) — 'global only' provider, not a native Israel source
- **reliability**: primary/official for the ORS project itself (academic-run, well-established, widely cited incl. NYT usage); free-tier daily caps make it batch-only, not suitable for live dashboard queries at scale

### Mapbox Isochrone API  _(area: None)_
- **provider**: Mapbox (commercial)
- **access**: docs.mapbox.com/api/navigation/isochrone/
- **auth**: api-key, credit card required to activate free tier
- **cost**: usage-based, per-1000-requests billing above a monthly free volume (exact free number not confirmed)
- **data_provided**: driving/walking/cycling isochrones only
- **spatial**: isochrone polygons, but NO public-transit mode — CONFIRMED NOT SUITABLE for this project's PT-accessibility goal; ruled out in favor of TravelTime
- **enrichment_idea**: not recommended — no transit support, would require a 3rd-party extension project (e.g. github.com/blumdrew/transit-isochrones) to bolt on GTFS, adding maintenance burden for no gain over TravelTime
- **dashboard_use**: none recommended for this use case
- **israel_coverage**: global only, OSM-based
- **reliability**: commercial primary, well-maintained, but wrong tool for a public-transport equity metric — documented here to justify NOT using it

### GovMap Geocoding API  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל) — official government mapping authority | Survey of Israel / Ministry (govmap.gov.il), the State's official mapping portal
- **access**: govmap.geocode({keyword, type}) — JavaScript client function (govmap.api.js), part of the embeddable GovMap widget; docs at api.govmap.gov.il/docs | JS SDK function govmap.geocode({keyword, type}) loaded via https://www.govmap.gov.il/govmap/api/govmap.api.js — documented as a client-side JS function, not confirmed as a plain server-callable REST endpoint in docs excerpt fetched
- **auth**: api-key/token required at map init (token: 'YOUR_API_TOKEN') — registration process/cost not confirmed this pass, but govmap.gov.il is a free public government portal | account-required — API token via registration on govmap.gov.il (email-based signup per docs intro)
- **cost**: presumed free (government portal); exact registration/quota terms not confirmed this pass | free tier implied (government portal), no pricing details found in fetched pages
- **data_provided**: address-string → X,Y coordinate (ITM — Israel Transverse Mercator, NOT WGS84 lat/lon, needs reprojection), with match-quality code (1=exact, 2=fuzzy single, 3=multiple candidates) | Address string -> X/Y coordinates (ITM), plus ResultCode (1=exact single match, 2=partial single match, 3=multiple/no match with candidate list). Sibling function 'search-and-locate' resolves gush/helka (parcel) <-> address.
- **spatial**: THE official Israeli address geocoder — likely more accurate for Hebrew addresses/gush-chelka than Google/Nominatim; also exposes 400+ official layers via URL params including a dedicated 'מתקני ספורט' (sports facilities) layer (lay=SPORT / lay=400, viewable at govmap.gov.il/?lay=400) | This IS the official Israeli street-address geocoder — the authoritative tool for turning internal club/facility street addresses into precise lat/lng (far more accurate than locality-centroid fallback).
- **enrichment_idea**: PRIMARY geocoding leverage play: run every internal club/federation/facility address through govmap.geocode() to get authoritative ITM coordinates (convert to WGS84), THEN cross the official 'מתקני ספורט' GovMap layer against internal facility records to catch facilities the office doesn't yet have coordinates for, or conversely flag GovMap facilities missing from internal records (data-quality audit) | Batch-geocode every supported organization's registered address through GovMap to get exact building-level coordinates; then compute distance to nearest sports facility, catchment-area population (via CBS statistical-area layer), and accessibility context — the core 'exact location' enrichment the office wants.
- **dashboard_use**: backend ETL step feeding lat/lng into every spatial tab (Tab 2 tik-yishuv, Tab 6 impact/efficiency, Tab 4 performance heat maps) — not a visual itself, an enabling geocoder | Tab 2 תיק יישוב and Tab 3 גוף נתמך location pins, precise heat-map placement
- **israel_coverage**: 100% — it IS the Israeli national geocoder, full Hebrew address support | best-in-class for Israel — official national address/parcel database, Hebrew addresses
- **reliability**: official primary (Survey of Israel / government portal); JS-client-only design (no plain REST confirmed) may complicate server-side batch geocoding for ETL — worth a follow-up check for a REST geocode endpoint or fallback to Nominatim/Google for batch jobs | Official primary (State of Israel). Caveat found: documented interface is JS-function based (designed for embedding in a map widget), so a server-side ETL batch-geocoding job may need a headless-browser wrapper or a separate confirmed REST contract — flagged in docs as requiring English/ASCII-encoded params (Hebrew needs URL-encoding); ToS/storage terms for caching results not found in this pass — verify before persisting geocodes at scale.

### Efshari Bari Sports Facilities Map  _(area: None)_
- **provider**: אפשריבריא (Efshari Bari) — joint program of Ministry of Health, Ministry of Education, AND Ministry of Culture & Sport itself
- **access**: efsharibari.health.gov.il/active-life/exercising/sports-facilities-map/ — public web map; no API/export link found on the page itself
- **auth**: none for viewing; raw data access unclear, contact efsharibari@moh.gov.il
- **cost**: free (government site); data-export terms unknown
- **data_provided**: per facility: type, location, physical condition, suitability for international competitions, operating organization/body (גוף מפעיל — likely maps directly to the office's 'גוף נתמך' concept), disability accessibility, parking availability
- **spatial**: facility-level locations, filterable map — exact geocoding format (address vs lat/lng) not confirmed, page is likely a JS map (ArcGIS/Leaflet) with an underlying feature service worth reverse-engineering (check network calls)
- **enrichment_idea**: HIGH-VALUE lead since Ministry of Culture & Sport co-owns this data: request direct data-sharing (internal government channel, not scraping) to get the 'operating organization' + 'international competition suitability' + accessibility fields joined onto internal facility/גוף נתמך records by name/location match — likely the single best enrichment source found this pass because it's co-produced by the same ministry, not a 3rd party
- **dashboard_use**: Tab 3 (גוף נתמך card) facility/operator cross-reference, Tab 2 tik-yishuv facility inventory, Tab 4 performance (international-competition-ready venues)
- **israel_coverage**: national, purpose-built for Israel by 3 Israeli ministries incl. this office's own ministry
- **reliability**: official primary, and uniquely co-owned by the target ministry — but no machine-readable export confirmed; needs an internal-channel data request rather than public API scraping (recommend flagging to the office's own Efshari Bari contacts rather than technical scraping)

### GovMap 'מתקני ספורט' (Sports Facilities) Layer  _(area: None)_
- **provider**: Survey of Israel / GovMap national portal, layer id lay=400 (also referenced as lay=SPORT)
- **access**: viewable at govmap.gov.il/?lay=400 or ?lay=SPORT; programmatic access would go through the same GovMap API/layer-query functions as geocoding
- **auth**: same as GovMap API (token-based for programmatic use; free browsing)
- **cost**: free (government portal)
- **data_provided**: national point layer of sports facilities as maintained by Survey of Israel (fields not itemized this pass — needs a layer-metadata fetch)
- **spatial**: native GIS point layer, ITM coordinates, part of Israel's authoritative base-map — a second independent facility-location source to cross-validate against Efshari Bari and internal records
- **enrichment_idea**: Three-way reconciliation: internal facility records vs GovMap sports layer vs Efshari Bari map — mismatches/gaps between the three are themselves a data-quality finding worth surfacing to the office (e.g. facilities the office funds but that don't appear on the national layer, or vice versa)
- **dashboard_use**: Tab 2 tik-yishuv facility inventory / data-quality audit
- **israel_coverage**: national, official
- **reliability**: official primary (Survey of Israel); programmatic extraction method (WFS/REST vs JS-only) not yet confirmed — needs a follow-up technical check

### moj-amutot: עמותות רשומות (Registered Nonprofits Registry)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority (רשות התאגידים) — via data.gov.il CKAN
- **access**: CKAN datastore_search: https://data.gov.il/api/3/action/datastore_search?resource_id=be5b7935-3922-45d4-9638-08871b17ec95 ; SQL: datastore_search_sql ; bulk CSV: https://e.data.gov.il/dataset/c5ac01fb.../resource/be5b7935.../download/be5b7935....csv (48.1MB)
- **auth**: none — fully open API/CSV, no key required
- **cost**: free, unlimited (standard CKAN rate limits only, none published)
- **data_provided**: 22 fields per org: org number, reg date, Hebrew/English name, status + status date, primary/secondary activity classification, last-report year, revenue (מחזור כספי), total expenses, volunteer/employee/member counts, activity regions (איזורי פעילות), Ottoman-era name, address (city/street/apt/zip), free-text purposes. 75,429 records.
- **spatial**: Address fields only (city/street/house-no/zip) — NO lat/lng. Must be geocoded externally.
- **enrichment_idea**: Match sports federations/clubs by name+city+org-number against internal support-recipient list to pull financial size (revenue/expenses), volunteer/employee/member counts and 'activity areas' — feeds the גוף נתמך card's size/scale context and cross-checks internal budget figures against self-reported revenue. Geocode the address (see govmap/postal-code entries below) to plot every federation/club HQ on the local-authority heat map.
- **dashboard_use**: Tab 3 (גוף נתמך card — size/financials), Tab 2 (תיק יישוב heat map, once geocoded), Tab 6 (impact/efficiency budget context)
- **israel_coverage**: 100% — this IS the Israeli registry, Hebrew native
- **reliability**: Official/primary (Ministry of Justice), updated WEEKLY (whole package metadata_modified 2026-07-14), license 'Other (Open)' — copy/distribute/derivative-works permitted, no ToS barrier found on storing derived fields (e.g. geocoded coords)

### moj-amutot: תרומות מישות מדינית זרה (Foreign State/Entity Donations)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority
- **access**: resource_id=35cb40b5-3f13-4bca-9ce2-488085913107 via datastore_search / CSV 5.0MB
- **auth**: none
- **cost**: free
- **data_provided**: org number+name, donation date/year/quarter, foreign donor entity+type-code, amount NIS + original currency + FX rate, purpose text, conditions text. 13,683 records.
- **spatial**: none
- **enrichment_idea**: Join by org-number onto גוף נתמך card as a 'external funding sources' side-panel — directly strengthens the 'dependence on support' metric by showing whether ministry support is the org's only income or one of several (incl. foreign govt/embassy grants).
- **dashboard_use**: Tab 3 (גוף נתמך — dependence-on-support metric)
- **israel_coverage**: full, Hebrew
- **reliability**: official, part of weekly-updated moj-amutot package

### moj-amutot: אישור ניהול תקין (Proper Management Approval)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority
- **access**: resource_id=cb12ac14-7429-4268-bc03-460f48157858, CSV 39.5MB
- **auth**: none
- **cost**: free
- **data_provided**: org number+name, approval year, application-submitted flag, approval-granted flag/status text, last-update date. 330,434 records = multi-year panel (one row per org per year) going back years — good for year-over-year governance-compliance trend.
- **spatial**: none
- **enrichment_idea**: This IS the GuideStar-style 'good governance' seal — join on org-number to power a direct compliance/governance indicator on the גוף נתמך card (has-valid-certificate y/n + streak of consecutive years), and could gate/flag support eligibility in the supports tab.
- **dashboard_use**: Tab 3 (גוף נתמך — governance/compliance indicator), Tab 1 (supports eligibility flag)
- **israel_coverage**: full, Hebrew
- **reliability**: official, weekly package cadence, multi-year historical panel

### moj-amutot: חברות רשומות לתועלת הציבור (Public Benefit Companies, חל"צ)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority
- **access**: resource_id=85e40960-5426-4f4c-874f-2d1ec1b94609, CSV 695KB
- **auth**: none
- **cost**: free
- **data_provided**: 28 fields: company number, reg date, Hebrew/English name, status, purposes, activity classification+domain, last financial-report year, self-reported revenue, volunteer/employee counts, activity regions/locations, registered AND mailing addresses (incl. PO box), last audit date.
- **spatial**: address fields (city/street/apt/zip) x2 (registered + mailing) — no coordinates
- **enrichment_idea**: Covers supported orgs incorporated as חל''צ rather than עמותה (some larger sports/facility-operating bodies use this structure) — union with the nonprofit registry by name-fuzzy-match to avoid missing entities in the גוף נתמך universe.
- **dashboard_use**: Tab 3 (גוף נתמך card, entity coverage)
- **israel_coverage**: full, Hebrew
- **reliability**: official, weekly package cadence

### רשם ההקדשות (Trust/Endowment Registry, Corporations Authority)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority
- **access**: package id a52c0585-8af8-42bd-8c5c-03c6550682ea; 3 CSV resources: general info (f70898aa), trust directors (fa63c259), trustee asset management (1e4263cc)
- **auth**: none
- **cost**: free
- **data_provided**: 7 fields: case/file number, reg date, trust name, purposes (free text), funding method, case status. 3,305 records. Separate resources list trust directors and asset managers by name.
- **spatial**: none
- **enrichment_idea**: Low relevance to sports federations directly, but the 'purposes' free-text can be keyword-filtered (ספורט/נוער/אתלטיקה) to surface sport-related philanthropic trusts as a potential co-funding lead list, not for the dashboard itself.
- **dashboard_use**: none directly — background research only
- **israel_coverage**: full, Hebrew
- **reliability**: official; update cadence not stated on this sub-package (parent moj/corp-authority cadence likely similar to amutot)

### רשימת הקדשות בית דין רבני (Rabbinical Court Trust List)  _(area: None)_
- **provider**: Rabbinical Courts Administration (בתי הדין הרבניים)
- **access**: resource id 9b430249-d387-47f7-a544-4d0328bff163, XLSX single file
- **auth**: none
- **cost**: free
- **data_provided**: religious-trust registry, single XLSX, not itemized in this pass
- **spatial**: none observed
- **enrichment_idea**: Not relevant to sports dashboard — niche religious-trust registry, skip.
- **dashboard_use**: none
- **israel_coverage**: full, Hebrew
- **reliability**: official but update cadence 'NotConstant'/manual, last modified Jan 2025 — stale-ish, low value

### ica_companies — מאגר חברות רשם החברות (Israeli Company Registry, incl. status/violations)  _(area: None)_
- **provider**: Ministry of Justice, Corporations Authority (רשם החברות)
- **access**: CSV https://e.data.gov.il/dataset/246d949c.../resource/f004176c.../download/f004176c....csv ; likely also datastore_search via resource_id f004176c-b85f-4542-8901-7b3176f9a054
- **auth**: none
- **cost**: free
- **data_provided**: company id, English name, registration number, status (active/suspended/liquidation - forced or voluntary/receivership), company type, reg date, status date, address, rank/tier, doc attachments. 253MB, updated DAILY.
- **spatial**: address field present but unstructured/no coords
- **enrichment_idea**: Cross-check any supported entity registered as a for-profit/other company (e.g. a facility-management or events company contracted by a federation) for active/liquidation status — a red-flag input for SLA/ops tab (Tab 5) risk flags.
- **dashboard_use**: Tab 5 (SLA/ops — vendor/company risk flag), Tab 3 (secondary, for חל''צ-adjacent entities)
- **israel_coverage**: full, Hebrew/English names
- **reliability**: official, daily updates, data-quality score 3.95/5 self-reported by portal

### citiesandsettelments — רשימת ישובים בישראל (Israel Settlements List)  _(area: None)_
- **provider**: data.gov.il (source ministry not fully identified, likely Interior/CBS-adjacent)
- **access**: resource_id=55a24991-c3d3-4c5f-83bf-855db318d1b2 via datastore_search
- **auth**: none
- **cost**: free
- **data_provided**: 10 fields: settlement code (סמל_ישוב — the standard CBS join key), Hebrew+transliterated name, district code/name, CBS-bureau code/name, regional-council code/name. 1,272 records.
- **spatial**: no coordinates, but IS the canonical settlement-code lookup that lets you join nonprofit addresses (city name) to CBS population/socio-economic datasets already in use — the missing link between free-text city and CBS's coded geography.
- **enrichment_idea**: Normalize every nonprofit/club city-name field to סמל_ישוב via this table, then join straight into existing CBS population pipeline for Tab 2 (תיק יישוב) and Tab 6 (participation-rate vs population) without needing full geocoding for city-level aggregation.
- **dashboard_use**: Tab 2 (תיק יישוב heat map join key), Tab 6 (impact/efficiency)
- **israel_coverage**: full, all 1,272 Israeli settlements incl. regional councils
- **reliability**: official reference table, low-churn (settlement codes rarely change)

### GovMap API (Survey of Israel — geocode function)  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל) / gov.il official mapping platform
- **access**: JS SDK: govmap.geocode({keyword, type}) — type is FullResult or AccuracyOnly; also URL-parameter and iframe-embed tiers documented at api.govmap.gov.il/docs
- **auth**: account-required — API token passed into createMap({token:...}); sign-up flow/cost not detailed in fetched docs pages
- **cost**: unclear from docs fetched — govmap.gov.il is a free public-facing gov service, but the tokened API's pricing/quota wasn't stated on the intro/geocode pages; needs a registration-flow check next round
- **data_provided**: address text -> Israeli Transverse Mercator (ITM) X,Y coordinates + ResultCode (1=exact,2=fuzzy,3=multiple/none) + candidate list when ambiguous
- **spatial**: PRIMARY use case — this is Israel's official geocoder, built on the national address/parcel base, almost certainly far more accurate for Hebrew Israeli addresses than global geocoders (house-number-level, understands ישוב+רחוב+מספר without needing full string normalization)
- **enrichment_idea**: THE core spatial enrichment: geocode every nonprofit/club/facility address (city+street+house-number from moj-amutot) through GovMap to get exact lat/lng (after ITM->WGS84 conversion), then overlay on Tab 2's heat map, compute distance to nearest sports facility, and derive catchment population via CBS statistical-area polygons (also GovMap-hosted layers).
- **dashboard_use**: Tab 2 (תיק יישוב heat maps), Tab 6 (impact/efficiency spatial catchment), underlies all location-based visuals
- **israel_coverage**: 100% — Israel's authoritative national geocoder
- **reliability**: official/primary (Survey of Israel, government mapping authority); freshness/update cadence and full ToS (esp. can-you-cache-coordinates) not confirmed from docs fetched — recommend a direct sign-up + ToS read next round

### BudgetKey / Open Budget Israel API (next.obudget.org)  _(area: None)_
- **provider**: The Public Knowledge Workshop / הסדנא לידע ציבורי (Hasadna) — civil-tech NGO running the OpenBudget project; mirrors data sourced from the Treasury Accountant-General (מרכבה) and other gov systems
- **access**: https://next.obudget.org/api/query?query=<SQL SELECT> for raw Postgres queries; https://next.obudget.org/ for full-text Elasticsearch search; both return JSON with rows[] and a download_url for full CSV export
- **auth**: none for read/Query/Search/SimpleDB (confirmed — ran anonymous queries successfully); OAuth2 (Google/GitHub) only needed for the Lists API (saved collections/write ops)
- **cost**: Free, no API key. Query API cached 1hr, Search/SimpleDB cached 10min. SimpleDB responses capped at 120KB; no documented hard rate limit but be a good citizen (open civic infra, not enterprise-hosted)
- **data_provided**: supports_by_payment_year / history_supports_payments: recipient, entity_id, amount_approved, amount_paid, amount_advance, budget_code, supporting_ministry, year_paid/years_requested, entity_kind, request_type. support_programs: budget-code-level rollups incl. average_utilization (approved vs paid), per entity_kind breakdown, year span — a ready-made efficiency metric. entities_data: legal-entity registry cross-referenced with contracts_count/supports_count. Plus tenders, gov_decisions, contract_spending, muni_budget, ottoman_associations (pre-1980 nonprofits)
- **spatial**: entities_geo table: 533,291 rows, one geocoded record per entity_id with lat/lng + full Google Geocoding API JSON (accuracy, formatted address, place_id). Verified: JOIN of entities_geo to supports_by_payment_year on entity_id returns real lat/lng for orgs funded by 'משרד התרבות והספורט' (some nulls where geocoding failed, but coverage is broad — 533k total)
- **enrichment_idea**: entity_id here is the same key space as ח"פ/מספר עמותה used in moj-amutot and GuideStar (already in use). Build one crosswalk: internal federation/club record → entity_id → (a) supports_by_payment_year for a full multi-year, multi-ministry funding history (not just this office's own tmichot) — reveals total dependence-on-support across ALL government sources, not just this ministry; (b) entities_geo for instant lat/lng without paying for a geocoder; (c) support_programs.average_utilization as a new 'absorption efficiency' KPI per federation/budget line
- **dashboard_use**: Tab1 (supports/grants) — historical multi-year payment trend per federation, cross-ministry total; Tab3 (supported-org card) — 'dependence on support' computed from ALL-government support total, not just this office's; Tab6 (impact/efficiency) — approved-vs-paid utilization rate as budget-efficiency metric; Tab2 (local-authority file) — map layer of funded-org locations
- **israel_coverage**: Israel-only, fully Hebrew, sourced from Israeli state systems specifically — not a global/generic tool
- **reliability**: Primary-adjacent: not the government's own API but a well-established civil-tech mirror (used by journalists/Knesset researchers) of official Treasury/Accountant-General (מרכבה) data. Freshness/update cadence undocumented and likely irregular (depends on ministry publication cycles — some rows had null year_paid). No ToS blocker found on storing coordinates (the geocode cache is itself public open data). Caveat: verify any specific figure against the ministry's own igudim_2024/tmichot records before using in an official dashboard — treat as cross-check/enrichment, not sole source of truth

### data.gov.il igudim_2024 (Ministry's own federation-support dataset)  _(area: None)_
- **provider**: משרד התרבות והספורט עצמו (the Ministry itself), published on data.gov.il, contact tmichotsport@most.gov.il
- **access**: CKAN datastore_search API: https://data.gov.il/api/3/action/datastore_search?resource_id=851a1e2c-0e74-485a-a70d-9d6dd001a9f9 ; also raw CSV download
- **auth**: none — public CKAN endpoint
- **cost**: free, no rate limit documented (standard data.gov.il CKAN instance)
- **data_provided**: 93 rows, one per federation/branch (ענף): תחום, מספר בקשה, מס' ספק (supplier number), שם הענף, סה"כ תקציב סופי לתמיכה באיגודים, סכום מבוקש, סך תמיכה מאושר לאחר מגב, ניקוד מצטבר לענף — this is literally the 2024 approved support model for sport federations
- **spatial**: none directly, but מס' ספק (supplier/vendor number) is the internal ERP join key — can crosswalk to the office's own supplier master and from there to any address already on file
- **enrichment_idea**: Use as ground-truth to validate internal support figures shown on Tab1, and surface ניקוד מצטבר לענף (accumulated competitive score) as a new dimension — e.g. score-vs-funding scatter to flag branches funded out of proportion to their competitive ranking
- **dashboard_use**: Tab1 (supports/grants) — cross-check + new scoring KPI
- **israel_coverage**: exact — this is the Ministry's own 2024 data, not a third-party mirror
- **reliability**: Primary, official. But Frequency/Update metadata = 'NoUpdate'/'Manual' — this is a static point-in-time publication of the 2024 approved model, not a live feed; check data.gov.il periodically for a next-year successor dataset rather than expecting auto-refresh

### data.gov.il מתקני ספורט בישראל (dataset 408)  _(area: None)_
- **provider**: משרד התרבות והספורט (Ministry), published on data.gov.il
- **access**: https://data.gov.il/dataset/408 — 2 resources (need to pull individual resource_ids via package_show for CSV/XLSX datastore access)
- **auth**: none
- **cost**: free
- **data_provided**: 6,500+ sports facilities: כתובת, נ"צ/מיקום, סוג מתקן, האם ניתן לשימוש פרטי, נגישות לנכים, חניה, התאמה לתחרויות בינלאומיות (per official description)
- **spatial**: Has address text but package metadata explicitly flags is_geographic:'No' — i.e. no ready lat/lng column, needs geocoding, but is the richest facility-address list available and it's the office's own domain data
- **enrichment_idea**: Geocode all 6,500 addresses (batch via Google/govmap/Nominatim) to build the first real facility layer for the local-authority (תיק יישוב) heat map; spatial-join facility points to CBS statistical-area population + socio-economic index to compute a true 'facilities per capita by area' catchment metric, and link facilities to the federations/clubs that use them via name/address matching for a facility-utilization view
- **dashboard_use**: Tab2 (local-authority holistic file) — heat map + facility markers; Tab6 (impact/efficiency) — facility density vs participation rate
- **israel_coverage**: full Israel, Hebrew, official ministry registry
- **reliability**: Primary/official, but metadata_modified 2023-03-21 and Frequency:'NA' — freshness uncertain, description says the registry 'is updated from time to time as facilities update' with no fixed cadence; verify currency before relying on it for facility counts

### budget.gov.il (Open Budget portal, Ministry of Finance)  _(area: None)_
- **provider**: Ministry of Finance / Budget Division — official government portal (distinct entity from the Hasadna/BudgetKey civil-tech mirror above, though conceptually similar 'open budget' framing)
- **access**: https://www.gov.il/he/departments/topics/subject-state-budget/govil-landing-page and related budget-execution pages — no API doc surfaced in this pass, needs a dedicated follow-up fetch of the site itself (likely JS-heavy SPA)
- **auth**: unknown — not verified this round
- **cost**: presumed free (public gov.il portal) — unconfirmed
- **data_provided**: Per search-result description: aggregates 30+ government/non-government sources — budget, budget changes, tenders, calls for funding, support-tests (מבחני תמיכה), government decisions, ministry spending on supports and procurement
- **spatial**: unknown — not verified this round
- **enrichment_idea**: If it exposes support-test (מבחני תמיכה) results with structured fields, could be a second independent cross-check source alongside BudgetKey + igudim_2024 for a 3-way reconciliation of reported support amounts
- **dashboard_use**: Tab1/Tab6 — potential, pending verification
- **israel_coverage**: Israel-specific, official MOF site
- **reliability**: Would be primary/official (Ministry of Finance) if confirmed — highest-authority tier for budget-execution figures, but not yet fetched/verified in this pass

### GovMap Developer API (JS SDK)  _(area: None)_
- **provider**: המרכז למיפוי ישראל / מפ"י — Survey of Israel (national mapping agency), which operates the govmap.gov.il portal
- **access**: Docs at https://api.govmap.gov.il/docs/ ; embed JS SDK, then call govmap.geocode(), govmap.getLayerData(), govmap.searchAndLocate(), govmap.getMapUrl(), govmap.createMap(mapDivID, settings)
- **auth**: account-required: register (email) to get a Token; token is bound to a specific domain and won't work elsewhere — this complicates server-side/QuickSight batch use since it's designed for browser embedding on one registered domain
- **cost**: Free per general claims about GovMap portal ("site usage is free, any entity can upload layers after registration"); no tiered pricing/quota page found in the doc set fetched
- **data_provided**: geocode(address)->{X,Y in ITM, ResultCode 1-3}; getLayerData(layerName,{x,y},radiusMeters)->array of nearby entities+distance from named layers (examples seen: bus_stops, GASSTATIONS, PARCEL_HOKS, KSHTANN_ASSETS, PARCEL_ALL); searchAndLocate() bidirectionally converts address<->gush/helka (cadastral lot/parcel) with settlementCode/streetCode; getMapUrl() returns a shareable state URL+params
- **spatial**: Core national geocoder (address->ITM X/Y), reverse parcel lookup, and radius/proximity search against named GIS layers — exactly the 'exact location + nearby context' capability the office needs
- **enrichment_idea**: Batch-geocode every internal sports org/club/facility address via govmap.geocode to attach ITM X/Y; then radius-query getLayerData for nearby infrastructure (bus stops, gas stations, other layers) to build an accessibility/context score per record; use searchAndLocate to attach the gush/helka parcel ID to each facility for land-ownership/zoning cross-checks
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps and facility mapping; Tab 3 (גוף נתמך) location context on the org card; Tab 6 (impact & efficiency) catchment/accessibility analysis
- **israel_coverage**: Israel-only, this IS the national geocoder/parcel registry — full address & cadastral coverage. Hebrew addresses accepted but must be URL-encoded since the system's field/param syntax is English-only
- **reliability**: Official/primary (national mapping agency). Caveats: (1) token is domain-locked, awkward for a batch ETL / QuickSight pipeline vs a browser page; (2) docs never state data refresh cadence; (3) docs never state whether returned coordinates may be stored/cached downstream (ToS/privacy page for Survey of Israel would need checking before persisting results)

### GovMap Open GeoServer (WMS/WFS, no auth)  _(area: None)_
- **provider**: Survey of Israel — a separate, fully open GeoServer instance behind the GovMap ecosystem
- **access**: https://open.govmap.gov.il/geoserver/opendata/wms and /wfs — standard OGC GetCapabilities/GetFeature calls, e.g. ...wfs?service=wfs&version=2.0.0&request=GetFeature&typeName=opendata:muni_il&outputFormat=application/json
- **auth**: none — no token, no account; plain HTTP GET works (confirmed live, no auth headers used)
- **cost**: Free, unlimited (no quota mechanism visible — plain GeoServer)
- **data_provided**: 7 verified feature types: Nikuz (drainage), SUB_GUSH_ALL / SUB_GUSH_ALL_ITM (cadastral sub-blocks), PARCEL_ALL / Parcels_ITM (cadastral parcels = gush/helka polygons), nechalim1 (streams), muni_il (409 local-authority boundary polygons with fields Muni_Heb, Muni_Eng, Sug_Muni, CR_LAMAS/CR_PNIM municipal code, Machoz district, Eshkol_MPn regional cluster, Sign_Date)
- **spatial**: Full vector geometries (polygons) in EPSG:2039 (ITM), downloadable as GeoJSON directly via WFS GetFeature — usable for point-in-polygon joins, choropleths, or converting into a GIS/QuickSight-ready shape file
- **enrichment_idea**: muni_il's CR_LAMAS field is the exact join key already used for CBS/LAMAS population data — pull these polygons to build a real local-authority choropleth for Tab 2/6, and point-in-polygon every geocoded facility/org against muni_il to auto-verify or backfill the 'local authority' field, and against PARCEL_ALL to attach gush/helka + land context for free (no token needed)
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps/choropleth by local-authority polygon; Tab 6 (impact & efficiency) participation-vs-population per authority polygon
- **israel_coverage**: Full Israel national coverage for the 7 layers exposed; Hebrew fields present natively (e.g. Muni_Heb)
- **reliability**: Official/primary, no ToS gate (fully open+unauthenticated). Only 7 layers exposed in this public 'opendata' workspace (a small slice of GovMap's ~340-layer catalog which mostly sits behind the token-gated JS API); GetCapabilities does not expose an update-cadence/last-modified field — freshness unconfirmed

### Ministry Sports Facilities Registry (data.gov.il dataset 408)  _(area: None)_
- **provider**: משרד התרבות והספורט / מינהל הספורט — the Ministry's own Sports Administration, published on data.gov.il under org 'culture_and_sports'
- **access**: Dataset page https://data.gov.il/dataset/408 ; live queryable JSON via CKAN datastore API: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d (paginate with &offset=). Static CSV/XLSX attachments also exist but the CSV download is bot-protected (see reliability)
- **auth**: none
- **cost**: Free, license 'Other (Open)'
- **data_provided**: Per-facility (8,777 records live in the datastore): רשות מקומית, ישוב, מספר זיהוי, סוג מתקן, שם המתקן, שכונה/רחוב/מספר בית, ציר X/ציר Y (native ITM coords), מספר המבנים, בעלי המתקן, גוף מפעיל, טלפון/דואל איש קשר, מספר מושבים, פנוי לפעילות, גידור/תאורה קיימת, נגישות לנכים, חניה לרכבים, מצב המתקן, מתקן תקני לתחרויות, שימוש לתחרויות רשמיות, שנת הקמה, משרת בית ספר
- **spatial**: ALREADY GEOCODED — every facility carries native ITM X/Y (same CRS/EPSG:2039 as GovMap), so no geocoding step is needed at all for this dataset; it is the office's own pre-coordinated facility register
- **enrichment_idea**: This is the master spatial layer for the whole 'spatial sports' lens: plot directly on a GovMap/QuickSight geo visual using the existing ITM X/Y; point-in-polygon it against GovMap's muni_il to cross-validate the רשות מקומית field and catch mismatches; radius-join against internal club/federation addresses (once those are geocoded via the GovMap API) to compute 'facilities within N km of club X' catchment/accessibility metrics; fold נגישות לנכים + מתקן תקני לתחרויות into an impact/efficiency facility-quality index
- **dashboard_use**: Tab 2 (תיק יישוב) — athletes-per-branch/heat maps needs exactly this facility layer; Tab 6 (impact & efficiency)
- **israel_coverage**: Israel-only, ~8,777 facilities nationwide, all fields Hebrew-native
- **reliability**: PRIMARY (it's the Ministry's own dataset) but the static CSV/XLSX attachments are stamped last-modified 2021-07-25 — 5 years stale as of Jul 2026 — while the live CKAN datastore returned total=8777 records (vs ~6,500 cited in older secondary write-ups), suggesting the datastore may be refreshed independently of the file attachment; cadence unconfirmed, worth asking the internal data owner whether this is their live source-of-truth. Also: the raw CSV download URL is blocked by a bot-detection JS challenge when fetched headlessly (curl returned an obfuscated JS page, not data) — use the CKAN datastore_search JSON endpoint instead, which returns clean data directly with no such block

### TheSportsDB  _(area: None)_
- **provider**: TheSportsDB.com (community/crowd-sourced project, run by "theapiguy") | TheSportsDB (commercial/community sports data provider, UK-based)
- **access**: REST/JSON, v1: https://www.thesportsdb.com/api/v1/json/{key}/... ; v2 (header auth): https://www.thesportsdb.com/api/v2/json/ | REST API, thesportsdb.com/api.php — free tier + paid V2 tier
- **auth**: none for free tier — public test key "123" in URL path; v2 uses X-API-KEY header; paid keys via Patreon | api-key — free key on signup; $9/month for dedicated production key + V2 API access
- **cost**: free tier: key=123, 30 req/min, limited search scope (e.g. team search only returns "Arsenal" as demo). Patreon $9/mo unlocks full v1+v2, 100 req/min, livescores | free tier available; $9/mo Patreon-style tier adds 2-min livescores, video highlights, dedicated key
- **data_provided**: teams, players, events/fixtures, scores, venues, TV listings, artwork/logos; search by name returns entity + ID for follow-up lookups | League standings/tables, fixtures, results, team rosters, logos/artwork — confirmed via earlier search that it lists 'Israeli Premier League' and 'Israeli Liga Leumit' as tracked leagues
- **spatial**: venue name/city per event only, no lat/lng natively — would need separate geocoding step | none (team city name only, no coordinates)
- **enrichment_idea**: pull Israeli team/league rosters + fixture venues, geocode venue city names, overlay on the local-authority (תיק יישוב) heat map to show which municipalities host active competitive teams vs only grassroots clubs | Pull Israeli top-division football/basketball standings + club rosters as a lightweight external cross-check on internal league/club counts for tab 4 (performance) — low priority since coverage likely limited to top-tier pro leagues, not the grassroots clubs/federations the ministry actually funds
- **dashboard_use**: tab 4 (ביצועים ומגדר) — team/event context; possibly tab 2 (תיק יישוב) if venue-city mapped | Tab 4 (Performance & gender) as a secondary results/standings feed for top leagues only
- **israel_coverage**: no explicit Israel documentation found; coverage is crowd-sourced so Israeli lower-league/individual-sport depth is likely thin — verify per-league before relying on it | Partial — only top professional leagues (Ligat HaAl, Liga Leumit) per search snippets; no grassroots/club-registry depth, not Hebrew-native (English metadata)
- **reliability**: community-maintained, not an official federation source; freshness varies by sport/contributor activity; free tier explicitly demo-limited so not production-safe without paid key | Commercial/community, global scope not Israel-focused — treat as a nice-to-have secondary feed, not authoritative for Israeli sport structure

### API-Sports (api-sports.io)  _(area: None)_
- **provider**: API-Sports (commercial, same group as API-Football)
- **access**: REST, one base endpoint per sport (e.g. v3.football.api-sports.io); official docs blocked by bot-check during this research (403 on direct + proxy fetch)
- **auth**: api-key header, free signup, no credit card required
- **cost**: free forever: 100 req/day, all endpoints; Pro $19/mo=7,500 req/day; Ultra $29/mo=75,000/day; Mega $39/mo=150,000/day
- **data_provided**: 2,000+ competitions, 15+ yrs history across ~9 sports (football, basketball, handball, rugby, volleyball, American football, baseball, hockey, F1) — team-sport-centric, NOT Olympic individual sports (no athletics/judo/swimming/sailing)
- **spatial**: venue/city per fixture only; no geocoding service
- **enrichment_idea**: low value for this dashboard's Olympic/achievement focus — team-sport leagues (football/basketball) could supplement a future "top league" context but does not cover the individual Olympic sports where Israel actually wins medals (judo, sailing, gymnastics)
- **dashboard_use**: marginal — possibly a "related pro leagues" widget, not core to tab 4
- **israel_coverage**: unverified — Israeli Premier League (football/basketball) likely present since coverage is broad, but not confirmed; docs inaccessible in this session
- **reliability**: commercial, real-time updates every ~15s for live sports; free tier daily-quota only, fine for batch ETL not live dashboards

### Sportradar Sports Data API  _(area: None)_
- **provider**: Sportradar AG (Swiss, official/licensed data partner for many federations)
- **access**: developer.sportradar.com marketplace, per-sport REST feeds
- **auth**: account required, sales-negotiated API key; 30-day free trial with production-identical data at lower rate limits
- **cost**: no public pricing; custom contracts, reports suggest five-figure USD/month for odds-grade feeds — almost certainly out of budget for a ministry BI dashboard
- **data_provided**: 80+ sports, 500+ leagues, 750,000+ events/yr — the deepest commercial coverage found, including Olympic sports
- **spatial**: venue-level data, no dedicated geocoding tool
- **enrichment_idea**: not recommended given cost — flag only as a benchmark of what "complete" coverage looks like, or worth a 30-day trial to bulk-export Israeli-athlete Olympic history once, not as a live integration
- **dashboard_use**: none recommended at current budget assumption
- **israel_coverage**: likely broad (global commercial feed) but unverified for Israel-specific granularity
- **reliability**: official/licensed primary-tier commercial provider, real-time, contractual SLAs — highest reliability tier found but gated by cost

### Olympedia.org  _(area: None)_
- **provider**: OlyMADMen (volunteer community of Olympic historians/statisticians)
- **access**: HTML pages only, e.g. olympedia.org/countries/ISR, /editions/{n}, /sports/{code}; no API endpoint exists
- **auth**: none (public site), but no API means scraping is the only programmatic route
- **cost**: free to browse; scraping effort cost only
- **data_provided**: per-NOC (incl. ISR) athlete counts, medal tallies by sport/edition, most-successful-competitor rankings, flagbearers, full 1896–2024 historical results, considered the most complete/accurate free Olympic historical DB by researchers
- **spatial**: none directly, but every result is tied to a Games edition whose host city is known and geocodable (host-city angle)
- **enrichment_idea**: scrape/download full ISR athlete+medal history once (or use the pre-scraped Kaggle mirror below) to build a permanent "Israel at the Olympics" achievement timeline feeding tab 4; join athlete birth-town (where listed) to municipality for local-authority pride/heat-map framing
- **dashboard_use**: tab 4 (ביצועים ומגדר) — historical medal/achievement timeline, gender splits (has gender participation tables per edition)
- **israel_coverage**: excellent — dedicated ISR country page with full participation history since 1952, all editions, all sports, gender-split tables
- **reliability**: volunteer-maintained but widely regarded (by Kaggle/academic reuse) as the gold-standard free historical Olympic dataset; static/updated per-Games not real-time; scraping ToS not explicitly checked — confirm before bulk-scraping

### Kaggle "120 Years of Olympic History" dataset  _(area: None)_
- **provider**: Kaggle user heesoo37, originally scraped from sports-reference.com (May 2018)
- **access**: static CSV download, kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results
- **auth**: Kaggle account required to download (free)
- **cost**: free
- **data_provided**: athlete_events.csv: 271,116 rows — athlete name, sex, age, height/weight, team/NOC, Games, year, season, city (host city), sport, event, medal. noc_regions.csv maps NOC codes to regions
- **spatial**: host "city" field per Games (text, needs geocoding) — good raw material for a one-time geocode-once lookup table of ~50 host cities (not per-athlete location, but usable for a "host city" world-map visual)
- **enrichment_idea**: filter Team=="Israel"/NOC==ISR, join medal rows to build the historical achievement table for tab 4 with zero scraping; geocode the ~15 distinct host cities once (small static lookup) for a "where Israeli athletes competed" world map micro-viz
- **dashboard_use**: tab 4 — historical medal count, gender-participation trend line (has sex field per athlete/year, ideal for the gender view)
- **israel_coverage**: present but ISR rows will be a small slice of 271k; only through Rio 2016 — needs supplementing with 2020/2024/2026 data (Olympedia or Wikidata) for currency
- **reliability**: community dataset, frozen snapshot (2018, data through 2016) — not maintained/updated, use only as historical backbone, not for recent Games

### Wikidata SPARQL (Olympics domain)  _(area: None)_
- **provider**: Wikimedia Foundation / Wikidata community (incl. WikiProject Olympics)
- **access**: public SPARQL endpoint at query.wikidata.org/sparql; also REST API and entity dumps
- **auth**: none required
- **cost**: free, CC0 licensed data
- **data_provided**: structured entities: athlete (P27 country of citizenship), medal (P166 award received), sport, Games edition (P361 part of), and critically — coordinate location (P625) is a standard Wikidata property on host-city/venue items
- **spatial**: strong — host cities and many venues are Wikidata items with native P625 coordinate location; a single SPARQL query can return Israeli medalist + sport + Games + host-city lat/lng in one shot, no separate geocoding step needed
- **enrichment_idea**: best low-effort spatial win in this area: one SPARQL query joins Israeli-citizenship medalists to their Games' host-city coordinates for a ready-to-plot world map layer on tab 4 ("Israeli achievements around the world"); can also pull athlete birthplace (P19) which sometimes resolves to an Israeli town — potential (weak, coverage-dependent) link back to local-authority tab 2
- **dashboard_use**: tab 4 — historical achievements map/table; freshest updates for major medals since edited by the crowd shortly after events
- **israel_coverage**: good for medalists/notable athletes (dedicated "list of Olympic medalists for Israel" Q97233646, "Israel at the Olympics" Q754401); weaker/incomplete for non-medal participants and grassroots data
- **reliability**: crowd-edited, generally accurate for high-profile Olympic facts (heavily watched pages) but not authoritative/official; verify against Olympedia/IOC for critical figures; query service has fair-use rate limits (documented separately, not fetched this session)

### World Athletics (unofficial GraphQL wrapper)  _(area: None)_
- **provider**: World Athletics (data owner) — no official API; community reverse-engineered wrappers (e.g. github.com/kaijchang/worldathletics, github.com/nimarion/worldathletics)
- **access**: hidden GraphQL endpoint on AWS behind worldathletics.org, accessed via community Python packages (PyPI: worldathletics)
- **auth**: requires scraped GraphQL credentials (a companion tool "worldathletics_key_updater" exists specifically to keep refreshing them) — fragile, breaks when World Athletics rotates keys
- **cost**: free but unsupported/unofficial; official RFP doc shows World Athletics licenses its results/stats service commercially to select partners, no public self-serve pricing
- **data_provided**: per-athlete career results by year (marks, places, venues, scores); world rankings/records/leaderboards notably NOT exposed by the community wrapper
- **spatial**: venue name per competition result, no coordinates
- **enrichment_idea**: low priority given fragility (credential rotation) — only worth it if the dashboard needs current track & field marks for named Israeli athletes not covered elsewhere
- **dashboard_use**: tab 4, athletics-specific supplement only
- **israel_coverage**: as good as World Athletics' own site for any registered athlete, but not Israel-specific — pull per-athlete-name only
- **reliability**: unofficial reverse-engineered access to a commercial data owner's private API — breakage risk high, likely against World Athletics ToS for production/commercial reuse by a government body; do not build a dependency on it without legal sign-off

### IJF Judobase / data.ijf.org  _(area: None)_
- **provider**: International Judo Federation (official federation, judo is Israel's strongest Olympic sport)
- **access**: data.ijf.org backs judobase.ijf.org and ijf.org/wrl (world ranking list) and /country/{code} pages; a community Python wrapper (github.com/DavidDzgoev/judobase) and Perl module document the reverse-engineered calls
- **auth**: none apparent for read access (wrappers hit it without keys), but no official published docs found — unofficial use only
- **cost**: free (no public pricing/paywall found)
- **data_provided**: world ranking list (WRL) by weight category, per-country athlete/result pages (ijf.org/country/isr would exist), contest/technique-level results, medal history
- **spatial**: competition host venue/city per event, no coordinates natively
- **enrichment_idea**: since judo is Israel's #1 medal sport (6 of 13 medals through 2022), a dedicated judo ranking/result feed materially deepens tab 4's achievement story beyond generic Olympic data — track current-ranked Israeli judoka (not just past medalists) for a "rising talent" panel
- **dashboard_use**: tab 4, judo-specific achievement/ranking widget
- **israel_coverage**: good — Israel is a top judo nation, IJF tracks all federation members including Israel Judo Association athletes by name
- **reliability**: official federation as data owner, but access is via undocumented/reverse-engineered endpoints — same fragility/ToS caveat as World Athletics; verify terms before production use

### World Sailing rankings (sailing.org/rankings)  _(area: None)_
- **provider**: World Sailing (official federation; sailing is one of Israel's Olympic medal sports)
- **access**: HTML ranking tables only (fleet racing, match racing, para sailing, esailing) — no API found
- **auth**: n/a (no API)
- **cost**: free to view, scraping-only for structured use
- **data_provided**: current athlete rankings by sailing class/discipline
- **spatial**: none exposed
- **enrichment_idea**: low priority — no API means only manual/periodic scraping is viable; useful only as a once-a-quarter manual pull to keep a "top ranked Israeli sailors" stat current
- **dashboard_use**: tab 4, minor supplement
- **israel_coverage**: unverified depth but Israel is an active sailing nation (medals in 1996/2004/2008)
- **reliability**: official federation source but no programmatic access — treat as manual reference only

### SportsDataIO Olympics API  _(area: None)_
- **provider**: SportsDataIO (commercial reseller, official data partnerships)
- **access**: sportsdata.io/olympics-api, REST, per-Games product
- **auth**: account + API key, has a free-trial program (sportsdata.io/free-trial)
- **cost**: commercial, pricing not public — request quote; free trial available
- **data_provided**: schedules, events, athlete stats/profiles, country stats, news, images, full event lifecycle real-time updates for the Games
- **spatial**: venue-level, no dedicated geocoding
- **enrichment_idea**: only worth evaluating if the ministry wants LIVE in-Games coverage (e.g. during an actual Olympics window) rather than historical/achievement analytics — otherwise redundant with free Wikidata+Olympedia+Kaggle combo
- **dashboard_use**: tab 4, live-Games mode only (low priority for a strategic/retrospective dashboard)
- **israel_coverage**: unverified, presumably full country-stats coverage since global commercial product
- **reliability**: commercial reseller of official-partner data, real-time SLA-backed — high reliability but paid

### OpenStreetMap Overpass API + Nominatim (spatial geocoding layer)  _(area: None)_
- **provider**: OpenStreetMap Foundation (open community-mapped geodata)
- **access**: Overpass: overpass-api.de/api/interpreter (Overpass QL queries, e.g. leisure=sports_centre / leisure=pitch / leisure=stadium within Israel via geocodeArea); Nominatim: nominatim.openstreetmap.org/search|reverse
- **auth**: none — but Nominatim requires a valid identifying User-Agent/Referer header, no generic library defaults
- **cost**: free public instance, hard-capped at 1 req/sec (bulk jobs: single-thread, ≤4 req/min if run over a full day) — for the ministry's full internal org/club/facility list, self-host a Nominatim instance instead of hammering the public one
- **data_provided**: Overpass: raw OSM POIs (sports centres, pitches, stadiums, swimming pools, gyms) with tags + coordinates; Nominatim: forward geocoding (address→lat/lng) and reverse geocoding (lat/lng→address/municipality)
- **spatial**: THE core geocoding tool for this priority lens — converts internal org/club/facility name+address text into exact lat/lng, and independently lets you pull all mapped sports facilities in Israel to cross-check against/fill gaps in the office's own facility registry
- **enrichment_idea**: batch-geocode every supported club/federation/facility address in the internal DB via a self-hosted Nominatim instance (public instance's 1 req/sec + no-bulk policy makes it unsuitable for a full-registry run) to get exact lat/lng; then Overpass-query all leisure=pitch/sports_centre/stadium nodes in Israel to detect facilities the ministry's own registry is MISSING (spatial gap analysis) and to compute "nearest facility" / catchment-population context for tab 2 (תיק יישוב) and tab 6 (impact/efficiency, participation-rate vs population)
- **dashboard_use**: tab 2 (תיק יישוב heat maps), tab 6 (impact/efficiency spatial context) — foundational geocoding layer, not a data source in itself
- **israel_coverage**: community-mapped — generally solid in Israeli cities/urban areas, patchier in peripheral/Arab-sector/Bedouin localities (known OSM completeness bias); must sanity-check coverage per region before trusting it for equity-sensitive analysis
- **reliability**: open/community data, ODbL license — must attribute; public API strictly rate-limited (1 req/sec) and results MUST be cached client-side per ToS; for anything beyond light lookups, self-hosting (Docker image available) is the documented/expected path for bulk/production use

### science.co.il — Israeli Olympic Medalists list  _(area: None)_
- **provider**: science.co.il (independent Israel-focused reference site)
- **access**: static HTML page, science.co.il/sports/olympics/Medalists.php, no API
- **auth**: none
- **cost**: free
- **data_provided**: curated list of all Israeli Olympic medalists since 1992 with sport/medal/year
- **spatial**: none
- **enrichment_idea**: cross-check/validation source only — compare against Wikidata+Olympedia pulls to catch discrepancies before publishing the tab 4 achievement table (cheap QA step, not a primary feed)
- **dashboard_use**: QA/validation for tab 4, not a live feed
- **israel_coverage**: Israel-specific by design, but manually maintained and only covers medalists (not full participant roster)
- **reliability**: independent hobbyist site, not official — use only as a secondary cross-check, not a primary source

### GuideStar Israel website (guidestar.org.il)  _(area: None)_
- **provider**: Israeli Ministry of Justice, IT Systems Division (אגף מערכות מידע) — joint gov't project with JDC/Joint Israel, built by NPTech
- **access**: Web only: search UI at /search-malkars, per-org profile pages at /organization/{amuta-number} with sub-pages /people and /contact. NO documented REST/JSON API, NO developer portal, NO bulk export beyond what's separately on data.gov.il. (Do not confuse with the unrelated US 'Candid GuideStar' API at apiportal.guidestar.org — different org, different country, no relation.)
- **auth**: None to VIEW any org's profile (auto-generated for all ~44,500 nonprofits, no login/fee). To EDIT/add supplementary org info: org must fax/email a signed paper registration form (name, ID, role, signature) to info@guidestar.org.il / fax +972-8-9155961; gets emailed a password. No API key mechanism exists at all — there is nothing to authenticate a machine client against.
- **cost**: Free to browse. No paid tier because no API/bulk product is sold or offered — unlike US GuideStar/Candid which sells API access.
- **data_provided**: Per-org: ID number, founding year, official objectives, official registered address, proper-management certification status (ניהול תקין), tax-donation deduction approval (סעיף 46 / section-46 equivalent — called 'אישור זיכוי ממס לתרומות'), activity sector/domain, office holders (בעלי תפקידים), employee & volunteer counts, annual turnover, GOVERNMENT-MINISTRY SUPPORT AMOUNTS BY YEAR (תמיכות ממשרדי ממשלה), engagements/contracts with government bodies (התקשרויות עם מוסדות ממשלתיים), donation info, plus downloadable official documents: registration certificate, proper-mgmt certificate, financial reports, narrative reports, and the list of the organization's 5 highest-paid employees. Sourced by aggregating Registrar of Associations + Ministry of Finance + Tax Authority + Comptroller's office data, PLUS org-self-reported supplementary fields.
- **spatial**: Single official registered address per org (street/settlement, not lat-lng) plus self-reported 'places of operation'/geographic regions in the search filter (north/south/center/Jerusalem/TA/Haifa buckets only — coarse, not exact). No geocoding, no coordinates exposed anywhere in the product.
- **enrichment_idea**: For each sports federation/club/nonprofit already in the office's internal records: (1) match by amuta/org number or fuzzy name to GuideStar's org profile to pull government-support-by-year, section-46 status, and proper-management status not present in the office's own DB; (2) take the official address text and geocode it (Google Geocoding API / Nominatim) to get lat-lng; (3) use that lat-lng to compute a 'dependence on support' spatial layer — join budget-per-support-source against local-authority socio-economic index and population catchment for tab 3's supported-org card and tab 6's impact/efficiency view. Since there's no API, this must be done as a one-time/periodic scrape or via a direct ask to info@guidestar.org.il for a bulk data extract (their own PDF invites orgs/researchers to contact them; worth testing for institutional bulk-access requests too).
- **dashboard_use**: Tab 3 (Supported-organization card / גוף נתמך): proper-management flag, section-46 flag, gov-support breakdown by year and by ministry, deficit/financial-report figures, top-5-earner disclosure, office holders. Tab 1 (Supports): cross-check which supported federations/clubs hold valid proper-management certification (a threshold condition for eligibility) as a compliance flag.
- **israel_coverage**: Israel-only, Hebrew (site also mentions Arabic support elsewhere); covers all ~44,500 registered nonprofits/public-benefit-companies/endowments + general companies from the Companies Registrar (400,000+ corporations total).
- **reliability**: Official/primary (Ministry of Justice-operated, sourced from Registrar of Associations/Tax Authority/MoF/Comptroller records). Field coverage per org DEPENDS on whether that org filed its online reports — office's PDF explicitly caveats data completeness varies by org. No stated update cadence for the website itself (underlying data.gov.il CSV extracts of the same registry update weekly). ToS/scraping permissions could not be confirmed (JS-rendered ToS page didn't return content to our fetch tools) — treat automated scraping as unconfirmed/needs-legal-check before building a pipeline on it.

### data.gov.il moj-amutot (Registrar of Associations bulk CSV — GuideStar's own underlying source data)  _(area: None)_
- **provider**: Israeli Ministry of Justice, Registrar of Associations (רשם העמותות) — the SAME registry that feeds GuideStar's core fields, published as open bulk data independent of the GuideStar UI
- **access**: CKAN REST API, e.g. https://data.gov.il/api/3/action/datastore_search?resource_id={id} or package_show?id=moj-amutot; 5 resources incl. registered-associations, foreign-political-donations, proper-mgmt-certification, public-benefit-companies CSVs
- **auth**: none — open CKAN dataset, no key needed
- **cost**: free, no quota observed on public CKAN action API
- **data_provided**: 23 fields per org: number, registration date, Hebrew/English name, status, activity classification (primary+secondary — can flag sport-sector orgs), last-financial-report year, turnover/income, total expenses, volunteer count, employee count, member count, activity regions, Ottoman-society legacy name, FULL ADDRESS split into settlement/street/apartment-number/postal-code, objectives text. Separate resource: proper-mgmt certification per org per year (330k+ records).
- **spatial**: Structured address (settlement + street + house/apt number + postal code) for every org — directly geocodable (Google Geocoding/Nominatim) to lat-lng at building precision, no scraping needed. This is a BETTER machine-access path to most of GuideStar's core address data than the GuideStar website itself.
- **enrichment_idea**: Bulk-geocode all ~44,500 orgs' postal addresses once (batch job, cache lat-lng), then spatial-join every sports federation/club/nonprofit already tracked internally by fuzzy-matching org number/name — instantly gives exact coordinates for the office's own internal roster PLUS turnover/expense/staffing baselines to sanity-check self-reported grant applications, all without touching the GuideStar site at all.
- **dashboard_use**: Tab 2 (local-authority heat maps): geocoded org addresses as point layer. Tab 3 (supported-org card): turnover/expense/staff baseline fields. Tab 6 (impact/efficiency): org density per settlement.
- **israel_coverage**: Israel-only, Hebrew; full national registry, updated weekly per dataset metadata
- **reliability**: Official/primary, same authority as GuideStar, weekly-updated bulk CSV — MORE machine-friendly and MORE reliably accessible than scraping guidestar.org.il, but has FEWER fields than the GuideStar website (no section-46 status, no gov-support-by-year breakdown, no office holders, no top-5-earner list in this bulk export — those richer fields currently exist ONLY on the GuideStar website UI, unconfirmed if obtainable in bulk elsewhere).

### GuideStar Israel bulk/institutional data request (info@guidestar.org.il)  _(area: None)_
- **provider**: GuideStar Israel team (Ministry of Justice)
- **access**: Direct email/fax contact channel only (info@guidestar.org.il, fax +972-8-9155961) — no self-serve mechanism found; this is a lead to pursue, not a confirmed data channel
- **auth**: unknown — would require direct outreach as a government body (the office IS the Ministry of Culture & Sport, a peer government entity, which may carry more weight than a public request)
- **cost**: unknown, not documented anywhere found
- **data_provided**: unknown — potentially the full richer field set (section-46, gov-support-by-year, office holders, top-5-earners) not available via data.gov.il's bulk CSVs
- **spatial**: unknown
- **enrichment_idea**: As a sister government office, formally request an inter-agency data-sharing arrangement or bulk export covering section-46 status + gov-support-by-year + office holders for the ~1,000-3,000 sports-sector orgs (filter by GuideStar's own 'sport' activity classification) — far higher yield than scraping and avoids ToS ambiguity.
- **dashboard_use**: Tab 3 supported-org card, all richer fields
- **israel_coverage**: Israel-only by definition
- **reliability**: Would be official/primary if granted; unverified whether GuideStar team offers this in practice — untested lead only

### CBS Social Survey — Physical Activity (הסקר החברתי)  _(area: None)_
- **provider**: הלשכה המרכזית לסטטיסטיקה (Israel CBS)
- **access**: Annual press releases + PDF data digests (e.g. cbs.gov.il/he/mediarelease/...19_24_267b.pdf); underlying microdata via CBS Time-Series/SDMX API or by request
- **auth**: none for published PDFs/press releases; microdata may require researcher request
- **cost**: free
- **data_provided**: % adults 20+ doing physical activity (moderate/vigorous), by sex/age/religion/ethnicity/education/income; 2023 wave: ~55% do PA, ~22% vigorous; breakdowns by Jewish/Arab, sector
- **spatial**: none at individual level; some breakdowns by district/large city possible in full tables, not geocoded
- **enrichment_idea**: Use as the national/segment baseline denominator for the Impact tab's 'participation rate vs population' KPI — compare ministry-funded club participation counts per demographic segment against this survey's population PA rates to compute a normalized 'reach index'
- **dashboard_use**: Impact & efficiency tab: benchmark line/KPI for participation-rate-vs-population
- **israel_coverage**: primary Israeli source, full Hebrew, national + sector breakdowns
- **reliability**: official/primary (CBS); annual cadence; latest confirmed wave 2023 (published Aug 2024); PDF-only for detailed cross-tabs, no clean API for this specific dataset

### CBS Time-Series API (SDMX)  _(area: None)_
- **provider**: Israel CBS
- **access**: https://api.cbs.gov.il/index/catalog/tree (catalog) and SDMX-based data endpoints per https://www.cbs.gov.il/en/Pages/Api-interface.aspx and API-Time-Series.aspx docs
- **auth**: none, but a User-Agent header is mandatory on every request
- **cost**: free
- **data_provided**: time-series across population, health, education, employment, tourism, crime, prices etc; SDMX standard series + CBS dictionaries for code lookups
- **spatial**: none built-in geocoding; series can be filtered by district/locality code where CBS publishes that granularity
- **enrichment_idea**: Pull population-by-locality time series programmatically to auto-refresh the per-capita denominator in the Impact tab instead of manual CBS PDF re-entry each year
- **dashboard_use**: Impact & efficiency tab; tik-yishuv population base for heat maps
- **israel_coverage**: full — this is Israel's national statistics agency, Hebrew+English
- **reliability**: official/primary; ongoing/rolling updates per series; documentation is thin/sparse on exact query syntax, community MCP wrappers exist (github.com/amirrosi/israeli-cbs-mcp, LiorVainer/data-israel) suggesting the raw API is usable but not fully self-documenting

### CBS Socio-Economic Index of Local Authorities (מדד חברתי-כלכלי)  _(area: None)_
- **provider**: Israel CBS
- **access**: published as periodic PDF/Excel releases on cbs.gov.il (subject page: מדד חברתי-כלכלי של הרשויות המקומיות); not confirmed as a live API, but locality-level decile tables are downloadable
- **auth**: none
- **cost**: free
- **data_provided**: socio-economic decile (1-10, low-to-high) per local authority AND per sub-locality 'statistical area' — built from 14 variables (demographics, education, standard of living, employment/pensions); used by government for budget allocation (מענקי איזון)
- **spatial**: indirect — indexed by locality code and by named statistical-area polygons (CBS also publishes the statistical-area GIS boundary layer separately), not point coordinates itself
- **enrichment_idea**: Join to every local-authority/tik-yishuv record by locality code to add a 'socio-economic decile' dimension — lets the Impact tab compute budget-efficiency and participation gaps controlled for affluence, and can subdivide within big cities using statistical-area boundaries once facility coordinates are point-in-polygon matched
- **dashboard_use**: Impact & efficiency tab (normalize budget/participation by affluence); tik-yishuv tab (sub-city socio-economic overlay on heat map)
- **israel_coverage**: full, this is the official Israeli government index used for real budget decisions
- **reliability**: official/primary, highest-trust source (used by Ministry of Interior for actual grants); updated irregularly (~every 3-5 yrs, latest widely cited release covers ~2019-2022 data per Knesset research center docs) — check for a fresher release before using

### WHO Global Health Observatory — Insufficient Physical Activity indicators  _(area: None)_
- **provider**: World Health Organization
- **access**: OData REST API: https://ghoapi.azureedge.net/api/{IndicatorCode} e.g. NCD_PAA, NCD_PAC (adult insufficient-PA prevalence), plus policy-existence indicators (NCD_CCS_PA_*)
- **auth**: none — fully open, no key
- **cost**: free, no documented rate limit
- **data_provided**: % of adults/adolescents with insufficient physical activity, age-standardized + crude, by country/sex/year (Bayesian modeled estimates from GPAQ/IPAQ surveys); also binary policy indicators (national PA guidelines exist Y/N, workplace/community PA policy Y/N) per country
- **spatial**: country-level only, none finer
- **enrichment_idea**: Use as an international benchmark tile next to the CBS domestic participation KPI ('Israel vs WHO Europe region insufficient-activity rate') — cheap credibility-boosting comparison, pull once a year via the free API
- **dashboard_use**: Impact & efficiency tab: small international-benchmark KPI/callout
- **israel_coverage**: Israel included as a WHO member state estimate, but it's a modeled/interpolated figure not a direct Israeli survey — global tool applied to Israel, not an Israel-specific source
- **reliability**: official/primary (WHO); model-based estimates updated periodically (multi-year lag typical for GHO); good for cross-country context, not for granular Israeli trend tracking

### Global Observatory for Physical Activity (GoPA!) Country Card — Israel  _(area: None)_
- **provider**: GoPA! academic consortium (contact for Israel: Tel Aviv University Sylvan Adams Sports Institute)
- **access**: static PDF: https://new.globalphysicalactivityobservatory.com/New%20Country%20cards/Israel.pdf
- **auth**: none
- **cost**: free
- **data_provided**: Israel-specific PA surveillance/research/policy capacity summary, global PA ranking (18th of 176 countries for 18+ adults), pyramid capacity scores (Low/Medium/High)
- **spatial**: none
- **enrichment_idea**: One-line footnote/context stat ('Israel ranked 18/176 globally for adult physical activity') for an exec-summary callout; low ongoing utility since it's a static periodic PDF not an API
- **dashboard_use**: Impact tab: single benchmark stat/footnote only
- **israel_coverage**: dedicated Israel card exists but content is a coarse capacity summary, not detailed data
- **reliability**: academic/community-run (not a government body); refreshed roughly every few years (2025 edition referenced); low update cadence, not suited for a live dashboard feed

### OECD Data Explorer / SDMX API  _(area: None)_
- **provider**: OECD
- **access**: https://data-explorer.oecd.org (UI) + SDMX REST API described at oecd.org/en/data/insights/data-explainers/2024/09/api.html; query by DSD_CODE@DATAFLOW_CODE
- **auth**: none — free public API, no key
- **cost**: free; rate-limited to 60 data downloads/hour
- **data_provided**: broad OECD statistical warehouse (economy, wellbeing, social); a 'sport participation' figure (45.2% adolescents 11-17 doing regular sport) surfaced in search but could not confirm a dedicated OECD sport-participation dataflow on this pass — likely sourced from PISA/HBSC wellbeing modules rather than a standalone OECD sport dataset
- **spatial**: none, country/region level only
- **enrichment_idea**: If a specific sport/PA dataflow is confirmed on a follow-up pass, use as an OECD-peer benchmark row next to CBS national figures; otherwise low priority for this dashboard
- **dashboard_use**: Impact tab: optional peer-country benchmark, pending confirmation of a relevant dataflow
- **israel_coverage**: Israel is a full OECD member so is included in OECD statistics generally, but coverage of a sport-specific indicator for Israel is unconfirmed
- **reliability**: official/primary (OECD); needs a follow-up dataflow search (query 'dataflowId:' in Data Explorer) before relying on it — do not build against this until a concrete sport dataflow ID is verified

### Eurobarometer — Sport and Physical Activity (Special EB 412/472/525)  _(area: None)_
- **provider**: European Commission (via GESIS / data.europa.eu)
- **access**: microdata + PDF reports on data.europa.eu and gesis.org/eurobarometer; e.g. Special Eurobarometer 525 (Sept 2022)
- **auth**: free registration on GESIS for microdata; PDF summaries fully open
- **cost**: free
- **data_provided**: sport/PA frequency, minutes of moderate/vigorous activity, walking, sitting time, club vs informal participation — rich EU household survey micro-data
- **spatial**: country-level only within the EU
- **enrichment_idea**: Not directly usable for Israel since Israel isn't surveyed; only value is as a methodology template (question wording) if the ministry ever wants to design a comparable local survey
- **dashboard_use**: not directly usable — no dashboard tile; reference only
- **israel_coverage**: global/EU only — Israel is NOT an EU member and is not surveyed in this series
- **reliability**: official/primary EU source; periodic (roughly every 3-5 years: 2013/2018/2022); excluded from this dashboard's scope due to no Israel coverage

### data.gov.il — מתקני ספורט בישראל (Sports Facilities Dataset)  _(area: None)_
- **provider**: Ministry of Culture and Sport itself (משרד התרבות והספורט) — this is the office's own published open dataset
- **access**: CKAN datastore API: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d (verified live); also CSV + XLSX direct download; dataset landing page https://data.gov.il/dataset/408
- **auth**: none
- **cost**: free, open license
- **data_provided**: ~6,500+ facility records: local authority, settlement, neighborhood, street+house number, facility type & name, X/Y coordinates (Israel/ITM grid), owner, operating body, contact, seating capacity, fencing/lighting, disability access, parking, condition, competition-standard flag, year established, whether it serves a specific school
- **spatial**: HIGH — includes point coordinates (ITM/EPSG:2039 X,Y) per facility plus full postal address; directly convertible to lat/lng with a projection transform (e.g. pyproj EPSG:2039→4326)
- **enrichment_idea**: This is the single best spatial enrichment source available: geocode every internal club/federation facility record by fuzzy-matching name+locality against this dataset to pull exact lat/lng, then compute nearest-facility distance, facility density per neighborhood, and overlay on the tik-yishuv heat map together with the CBS socio-economic decile of that statistical area — also flags 'shared facility' cases where multiple clubs/federations use the same physical site
- **dashboard_use**: Tik-yishuv tab (heat maps, athletes-per-branch), Impact tab (facility density vs participation), Supported-org card (link org to its home facility)
- **israel_coverage**: full, Hebrew, nationwide — and it's the ministry's own dataset so field semantics should already be familiar internally
- **reliability**: official/primary (published by the ministry itself via CKAN/data.gov.il), CC-open license typical of data.gov.il; CAVEAT — last confirmed update 2021-07-25, so coordinates/ownership may be stale for newer facilities; verify freshness with the internal dataset owner before treating it as current

### data.gov.il — סל הספורט: מנהלי מחלקות ספורט ברשויות מקומיות  _(area: None)_
- **provider**: Ministry of Culture and Sport
- **access**: direct CSV download: https://e.data.gov.il/dataset/0721250c-68ad-49ba-8b99-6bff0166ebf4/resource/3b653afb-3348-4ac3-aaba-6deadab9a262/download/most.db.532.csv ; also via CKAN package id 532
- **auth**: none
- **cost**: free, CC-BY licensed
- **data_provided**: registry of local-authority sports-department managers/contacts, per municipality
- **spatial**: none directly, but joins by local-authority name/code to any spatial layer keyed on locality
- **enrichment_idea**: Use to auto-populate a 'municipal sports contact' field on the tik-yishuv card — low effort, high operational value for the ops/SLA tab (who to contact per authority)
- **dashboard_use**: Tik-yishuv tab / SLA-ops tab: contact directory
- **israel_coverage**: full, Israel-specific, Hebrew
- **reliability**: official/primary (own ministry dataset); update cadence unconfirmed, small file (~54KB) so cheap to re-pull often

### GovMap API (Survey of Israel)  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל) / gov.il
- **access**: https://api.govmap.gov.il/docs/ — 3 modes: URL-parameter linking, HTML iframe embed, JS SDK (create-map, search, geocode functions); base map at govmap.gov.il; sports-facilities map layer visible at govmap.gov.il/?lay=400 (=SPORT layer, likely rendering the data.gov.il dataset 408)
- **auth**: domain-bound token required for the JS API (register the calling domain); URL-embed mode may not need a token — exact registration process not confirmed in this pass
- **cost**: appears free for government/public use but exact pricing/quota not confirmed — needs direct registration/contact with GovMap team to verify
- **data_provided**: address/parcel search, official geocoding (address→ITM coordinates), map layer browsing (incl. a dedicated sports-facilities layer), custom layer creation
- **spatial**: HIGH — this IS Israel's official geocoding + basemap service; authoritative for address-to-coordinate conversion nationwide, plus parcel/cadastral and sports-facility layers
- **enrichment_idea**: Primary geocoder for turning the office's internal club/federation street addresses into precise coordinates (more authoritative for Israel than Google/OSM geocoding); also pull the built-in SPORT layer to cross-check/refresh the data.gov.il facilities dataset over time
- **dashboard_use**: Backend enrichment step feeding tik-yishuv heat maps and supported-org location pins (not a QuickSight-native visual itself — used upstream in ETL to produce lat/lng columns)
- **israel_coverage**: full — this is the definitive Israeli national mapping authority, Hebrew notes: field/value text must be URL-encoded since only numeric/English chars pass raw
- **reliability**: official/primary (government survey authority); ToS/coordinate-storage rights for downstream caching not confirmed — verify terms before persisting geocoded coordinates at scale

### אפשריבריא Sports Facilities Map (Ministry of Health public map)  _(area: None)_
- **provider**: Ministry of Health, jointly with Ministry of Education and Ministry of Culture & Sport
- **access**: public web map: https://efsharibari.health.gov.il/active-life/exercising/sports-facilities-map/
- **auth**: none (public web page)
- **cost**: free
- **data_provided**: facility type, location, condition, international-competition suitability, operating body, disability access, parking — same field categories as data.gov.il dataset 408, strongly suggesting it's a front-end over the same source
- **spatial**: interactive map, presumably geocoded, but no separate downloadable API was found on this page — treat data.gov.il dataset 408 as the actual data source instead
- **enrichment_idea**: Low priority as a separate source since it likely duplicates dataset 408; worth a quick devtools/network check to see if it calls an underlying JSON API not yet discovered (could be fresher than the 2021 CSV)
- **dashboard_use**: Tik-yishuv tab — as a cross-check for facility-data freshness only
- **israel_coverage**: full, Hebrew, cross-ministry initiative
- **reliability**: official/primary (multi-ministry), but exact backing data source/update cadence unconfirmed on this pass

### Sports Facilities in Israel (מתקני ספורט בישראל) - Ministry dataset #408  _(area: None)_
- **provider**: Ministry of Culture and Sport (מנהל הספורט), published via data.gov.il CKAN
- **access**: CKAN datastore_search API: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d (live query, paginated); also raw CSV resource
- **auth**: none — fully open, no key required
- **cost**: free, license 'other-open' (isopen:true)
- **data_provided**: 8,777 facility records: רשות מקומית, ישוב, מספר זיהוי, סוג מתקן, שם המתקן, שכונה/רחוב/מספר בית, ציר X/Y (ITM coords), בעלי המתקן, גוף מפעיל, טלפון/דואל איש קשר, מספר מושבים, נגישות לנכים, חניה, מצב המתקן, שימוש לתחרויות רשמיות, שנת הקמה, משרת בית ספר
- **spatial**: Every record has native Israeli Transverse Mercator (ITM/EPSG:2039) X/Y coordinates ('ציר X','ציר Y') — exact facility location, no geocoding needed, just a coordinate-system reprojection to WGS84
- **enrichment_idea**: Join internal club/federation/local-authority records to this facility list by רשות מקומית + facility name text-match, then inherit exact ITM->lat/lng for every internal org that plays/trains at a listed facility; also use נגישות לנכים + מצב המתקן + תקני לתחרויות as facility-quality/accessibility overlay for tab 2 (תיק יישוב) heat maps and tab 6 (budget-vs-participation efficiency, e.g. athletes-per-facility density)
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps/facility density; Tab 6 (Impact & efficiency) facility-per-population and budget-efficiency; Tab 3 (supported-org card) as a location/verification anchor
- **israel_coverage**: Israel-only, Hebrew, sourced directly from the Ministry itself (same office as this dashboard) — near-total national coverage of registered facilities
- **reliability**: Primary/official — same ministry (owner_org='culture_and_sports'). CAVEAT: last_modified on the resource is 2021-07-25 — data is ~5 years stale as of today (2026); no fixed refresh cadence declared (Frequency:'NA'). Verify currency before relying on it for active-facility status

### Sal HaSport local-authority sport-dept managers (סל הספורט) - dataset #532  _(area: None)_
- **provider**: Ministry of Culture and Sport, data.gov.il
- **access**: CSV download only (https://e.data.gov.il/dataset/.../resource/3b653afb-...); datastore_active=false so no live query API, must download+parse the file
- **auth**: none
- **cost**: free, CC-BY license
- **data_provided**: List of sport-department managers per local authority (מנהלי מחלקות ספורט ברשויות המקומיות) — names/contacts per municipality
- **spatial**: none directly (one row per local authority, no coordinates) — join key is the authority name itself
- **enrichment_idea**: Cross-ref internal municipal contacts for tab 2 (תיק יישוב) so field/data-quality follow-ups route to the correct real sport-dept manager per authority
- **dashboard_use**: Tab 2 (local-authority file) contact/ops metadata; Tab 5 (SLA/ops)
- **israel_coverage**: Israel-only, Hebrew, official Ministry list of local authorities
- **reliability**: Primary/official but single-shot: metadata_modified 2019-11-10, no update since creation, no live API — treat as a one-time contact snapshot, verify before operational use

### BudgetKey (מפתח התקציב) - Hasadna Open Budget project  _(area: None)_
- **provider**: Public Knowledge Workshop / Hasadna (NGO), civic-tech aggregator of Israeli government fiscal data — not a government office itself
- **access**: Query API (SQL SELECT) + Search API + SimpleDB API at next.obudget.org/api/*; web UI at next.obudget.org; SQL console at data.obudget.org (redash)
- **auth**: none for read queries (Query/Search API open); JWT via Google/GitHub OAuth only needed for the Lists API (saving/writing lists)
- **cost**: free; Query API capped at max 1000 rows/page; responses cached 1hr (query) / 10min (search)
- **data_provided**: Entities (orgs/companies/associations incl. sport federations), Support Programs (מבחני תמיכה-style programs), Support Transactions (individual payments, 1997-2025), Procurement Contracts, State Budget Book, Budget Change Requests. Verified live: Israel Basketball Association org page shows NIS 82.6M gov funding over 3yr across 36 documented Ministry-of-Culture-and-Sport transfers, 2023 revenue NIS 58.45M, sector rank #1 by turnover/gov-funding/employees
- **spatial**: none (fiscal/org data, no coordinates)
- **enrichment_idea**: Cross-validate/backfill the office's own support-test (מבחני תמיכה) payment history against BudgetKey's independently-scraped support_transactions table per federation — useful as an external audit trail and for filling gaps pre-dating internal DB records (data back to 1997); also pull peer-federation revenue/funding-dependence ratios directly for tab 3's 'dependence on support' metric as a sanity cross-check against GuideStar figures
- **dashboard_use**: Tab 1 (supports/grants) historical cross-check; Tab 3 (supported-org card) dependence-on-support metric validation
- **israel_coverage**: Israel-specific, Hebrew UI, built specifically from Israeli government fiscal sources
- **reliability**: Community/NGO-run (not primary government source) — treat as secondary/derived data, cross-check against internal Ministry records before using numbers in official reporting; project is community-maintained so update cadence/pipeline health should be spot-checked (some component repos marked as active, data described as pipeline-refreshed from 20+ sources)

### GovMap API (Survey of Israel geocoding/mapping)  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל), government mapping portal
- **access**: api.govmap.gov.il — URL-parameter navigation, HTML embed, and JS functions incl. a geocode function (api.govmap.gov.il/docs/javascript-functions/geocode); registration with email required per search results
- **auth**: account-required (email registration) — exact key mechanism not confirmed this round (docs page is JS-rendered, blocked full read)
- **cost**: appears free for the public portal; rate limits/cost tier not confirmed — needs a follow-up fetch of the full docs (JS-rendered, blocked by plain WebFetch)
- **data_provided**: Israel-wide cadastral/planning layers, address search, sports-facility layer visible at govmap.gov.il/?lay=400, statistical-area layer at ?lay=13
- **spatial**: Official Israeli address-to-coordinate geocoding (ITM/EPSG:2039 native), the authoritative government geocoder for Israel
- **enrichment_idea**: Primary geocoder to convert internal club/federation/facility street addresses to exact lat/lng, since it is the same coordinate reference (ITM) as the Ministry's own sports-facilities dataset #408 — enables one consistent spatial join across both internal and Ministry-open data
- **dashboard_use**: Underlying geocoding engine for all map/heat-map visuals across tabs 2, 4, 6
- **israel_coverage**: Israel-only, full national authoritative coverage, Hebrew (site notes API text/numeric fields must be English — non-Hebrew field names for query params)
- **reliability**: Primary/official (Survey of Israel) — but full ToS/storage terms not verified this round; recommend a dedicated follow-up read of api.govmap.gov.il/docs (needs JS rendering, plain WebFetch got only the shell)

### Nominatim / OpenStreetMap geocoding  _(area: None)_
- **provider**: OpenStreetMap Foundation (OSMF), community-run
- **access**: nominatim.openstreetmap.org/search / /reverse (public demo instance) or self-hosted
- **auth**: none, but must send a valid HTTP Referer or User-Agent identifying the app
- **cost**: free; public instance capped at 1 req/sec absolute max, scripts running long-term/at intervals limited to 4 req/min; bulk one-time jobs allowed only single-machine, results must be cached locally
- **data_provided**: Forward/reverse geocoding, address search, place lookup from OSM data
- **spatial**: Full forward/reverse geocoding worldwide incl. Israel, coverage quality depends on OSM community mapping density in each area
- **enrichment_idea**: Fallback/cross-check geocoder for internal addresses that GovMap fails to match (e.g. informal facility names); use for validating GovMap results via a second independent source
- **dashboard_use**: Secondary/backup geocoder for tabs 2, 4, 6 spatial joins
- **israel_coverage**: Global — Israel coverage is community-mapped, generally decent in cities, patchier in small settlements/Arab towns; not authoritative like GovMap
- **reliability**: Community-run, ODbL license requires share-alike on redistributed data (fine for internal analytical use, caveat if republishing derived datasets publicly); public demo instance not meant for production-scale bulk geocoding — self-host for real volume

### CBS Socio-Economic Index of Localities/Statistical Areas (מדד חברתי-כלכלי)  _(area: None)_
- **provider**: Central Bureau of Statistics (הלשכה המרכזית לסטטיסטיקה)
- **access**: Delivered as an ArcGIS-based interactive web map (govmap.gov.il/?lay=13 also hosts statistical-area layer); no dedicated CBS bulk-download API found — data otherwise published as static PDF/Excel yearbooks
- **auth**: none for viewing the map/PDFs
- **cost**: free, official government statistics
- **data_provided**: Socio-economic cluster/rank (1-10 or 1-20 scale) per local authority, per settlement-within-regional-council, and per statistical area within cities — latest published edition is 2021 (search results also referenced 2019 media release)
- **spatial**: Geographic units are statistical areas (~3,000-5,000 residents each within cities >10k pop) and local-authority boundaries — pairs naturally with facility ITM coordinates for area-level socio-economic overlay
- **enrichment_idea**: Spatially join each geocoded club/facility/federation branch to its containing statistical area's socio-economic cluster — lets the dashboard show whether support/budget allocation correlates with (or should compensate for) the socio-economic level of the served population, directly feeding tab 6's participation-rate-vs-population and budget-efficiency metrics with an equity lens
- **dashboard_use**: Tab 6 (Impact & efficiency) equity/socio-economic overlay; Tab 2 (תיק יישוב) heat map context layer
- **israel_coverage**: Israel-only, full national coverage, Hebrew, the authoritative national socio-economic index
- **reliability**: Primary/official (CBS) but infrequent refresh — last full edition found is 2021 (roughly every 3-5 years historically); no live API confirmed, likely requires a manual/periodic PDF-or-map re-pull rather than automated ingestion

### Israel Olympic Committee member federations (הוועד האולימפי בישראל)  _(area: None)_
- **provider**: Israel Olympic Committee (olympicsil.co.il), private nonprofit, registered as ע"ר 580040707 on GuideStar Israel
- **access**: olympicsil.co.il website (not directly fetchable this round — needs JS render / direct visit); GuideStar Israel record at guidestar.org.il/organization/580040707 gives its own nonprofit filing data (a source already in use per dashboard context)
- **auth**: none (public website)
- **cost**: free to browse
- **data_provided**: List of ~20 Olympic-recognized federations (gymnastics, tennis, handball, cycling, judo, athletics, sailing, disabled sports [ההתאחדות לספורט נכים], boxing, golf, wrestling, taekwondo, table tennis, fencing, shooting, rugby) with likely links to each federation's own site
- **spatial**: none directly
- **enrichment_idea**: Use as a canonical master-list to reconcile/validate the office's internal federation roster — flag any internally-tracked federation NOT on this Olympic-recognized list (governance/legitimacy flag) and vice versa (recognized federations receiving no internal support = a possible dashboard/tab-1 gap)
- **dashboard_use**: Tab 1 (supports/grants) federation master-list reconciliation; Tab 4 (performance) Olympic-recognition status badge
- **israel_coverage**: Israel-specific, Hebrew, but only covers Olympic-discipline federations — misses non-Olympic sports the ministry may still fund
- **reliability**: Primary for Olympic recognition status but not fetched/verified directly this round — needs a follow-up direct site visit to confirm structure and any scrapable directory

### Israel Football Association clubs directory (football.org.il/clubs)  _(area: None)_
- **provider**: ההתאחדות לכדורגל בישראל (Israel Football Association), est. 1928
- **access**: football.org.il/clubs/ — blocked with HTTP 403 on plain fetch this round, likely needs browser rendering or different user-agent
- **auth**: none apparent (public site)
- **cost**: free to browse, no official API found
- **data_provided**: Presumed: official club directory across all divisions (not just top league) — unverified structure
- **spatial**: unknown — would need to confirm if club pages list a home ground/address
- **enrichment_idea**: If it lists a home stadium per club, join to Ministry facility dataset #408 (same facility name/city) to inherit ITM coordinates for every football club, and cross-reference division/tier as a proxy for competitive level in tab 4
- **dashboard_use**: Tab 4 (Performance & gender), Tab 1 (grants) club-roster reconciliation for football specifically
- **israel_coverage**: Israel-specific, Hebrew, football-only (single sport)
- **reliability**: Primary/official for football but unverified this round (403 blocked) — worth a follow-up with browser rendering

### BudgetKey (מפתח התקציב) — entities_geo table  _(area: None)_
- **provider**: Public Knowledge Workshop / הסדנא לידע ציבורי (Hasadna) — Israeli civic-tech nonprofit; open-source project 'OpenBudget'
- **access**: https://next.obudget.org/api/query?query=SELECT+...+FROM+entities_geo — raw SQL-over-HTTP query API (also /search/<doc-type> full-text and /api/tables/<table>/query)
- **auth**: none for reads (verified live, no key needed); JWT auth only needed for the private 'Lists' write API
- **cost**: free, open data/open source; query API caches ~1hr (query) / 10min (search) — no published rate limit but be a good citizen
- **data_provided**: entity_id, location (Hebrew address string), lat, lng, provider (source='Google' geocoder), geojson — pre-geocoded coordinates for 533,291 Israeli legal entities (companies + nonprofits/amutot), keyed by the SAME registry/entity_id used by moj-amutot and GuideStar Israel
- **spatial**: DIRECT geocoding lookup: entity_id -> lat/lng/full address, no need to run our own geocoder. Since entity_id = official registry number (moj-amutot/GuideStar), this is a near-zero-effort join key.
- **enrichment_idea**: Join internal federation/club/nonprofit registry numbers (already used for moj-amutot/GuideStar lookups) directly against entities_geo.entity_id to backfill exact lat/lng for every supported org WITHOUT geocoding addresses ourselves. Feeds tab2 (תיק יישוב) heat maps and tab6 catchment-population overlays immediately.
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps / facility mapping; Tab 6 (Impact & efficiency) catchment-population overlays; any map visual needing org locations
- **israel_coverage**: Israel-only, full national coverage of registered entities; Hebrew addresses
- **reliability**: Community/civic-tech (Hasadna), not a government primary source, but built by piping official government registries + Google geocoding; open-source pipelines on GitHub (OpenBudget/budgetkey-data-pipelines) so lineage is auditable; freshness/update cadence not confirmed in this pass — verify snapshot date before relying on it for production dashboard; storing coordinates locally should be fine (Google-geocoded, publicly re-published data) but confirm ToS on re-hosting

### BudgetKey (מפתח התקציב) — supports_by_payment_year / supports_by_request_year tables  _(area: None)_
- **provider**: Public Knowledge Workshop / Hasadna, sourced from Ministry of Finance's tmichot.mof.gov.il support-payments disclosures
- **access**: same query API: https://next.obudget.org/api/query?query=SELECT+...+FROM+supports_by_payment_year
- **auth**: none for reads
- **cost**: free
- **data_provided**: amount_advance, amount_approved, amount_paid, amount_total, budget_code, entity_id, entity_kind, entity_name, recipient, recipient_entity_id, request_type, support_title, supporting_ministry, year_paid, years_requested — i.e. EVERY government ministry's support/grant payment to EVERY entity, per year; sports-ministry coverage inferred from tmichot.mof.gov.il source but not confirmed by a clean query this pass (hit a jsonb LIKE cast error)
- **spatial**: none directly, but entity_id joins to entities_geo for location
- **enrichment_idea**: For the 'dependence on support' metric (tab3 supported-org card): sum amount_paid across ALL supporting_ministry per entity_id per year from this table = TOTAL government support the org receives; compare against the office's own (Sport Ministry) grant amount for the same org/year to compute '% of total government funding that comes from us' — a much stronger dependence signal than support-vs-self-reported-revenue alone. Also flags orgs quietly getting large parallel support from Culture/Welfare/Education ministries.
- **dashboard_use**: Tab 3 (גוף נתמך) dependence-on-support metric; Tab 1 (Supports/grants) cross-ministry benchmarking; Tab 6 budget-efficiency comparisons
- **israel_coverage**: full national coverage of Israeli govt support/grant payments, Hebrew fields
- **reliability**: Civic-tech mirror of the official MoF tmichot.mof.gov.il disclosure data (primary-adjacent, not the raw government API itself); a jsonb type-casting quirk was hit on a LIKE filter (minor query-syntax issue, not a data-quality flag); verify update freshness/lag against tmichot.mof.gov.il before treating as current-year authoritative

### אתר התמיכות (tmichot.mof.gov.il)  _(area: None)_
- **provider**: Israeli Ministry of Finance — official portal for all government ministry grants/support to public institutions and nonprofits
- **access**: https://tmichot.mof.gov.il/ — web UI with 'search by submitter'/statistics tools; no API or bulk export located directly on-site
- **auth**: none for public search
- **cost**: free, government site
- **data_provided**: support/grant history per submitting organization, filterable by year and ministry; support-test criteria database; ~2,700 public institutions receive support annually per government sources found in search
- **spatial**: none confirmed directly
- **enrichment_idea**: Use as the PRIMARY-SOURCE cross-check for BudgetKey's supports tables (validate/refresh); since sports orgs are explicitly covered, pull other-ministry support amounts per org to enrich the dependence-on-support metric with an official-source citation
- **dashboard_use**: Tab 1 & Tab 3 — authoritative benchmark/validation source
- **israel_coverage**: full, it IS the Israeli government's own support portal
- **reliability**: official/primary government source, highest reliability; but no machine-readable export found in this pass — likely needs a data.gov.il CKAN dataset counterpart (unconfirmed, flagged in suggest)

### Midot (מידות) — Tav Midot effectiveness rating  _(area: None)_
- **provider**: Midot, part of SFI Group — Israeli nonprofit-effectiveness rating org
- **access**: https://midot.org.il/ website + per-org rating pages; no API found
- **auth**: none to view; org must apply/pay to be RATED (assessment process), but published ratings are publicly viewable
- **cost**: free to view ratings; org-side assessment process likely paid/fee-based (not confirmed)
- **data_provided**: Composite effectiveness score (pass threshold 75) across 5 weighted clusters: Planning, Implementation, Learning & Measurement, Leadership, Finance — only for orgs that opted into the (likely limited-count) rating process
- **spatial**: none
- **enrichment_idea**: For sports federations/clubs that hold the Midot mark, surface the effectiveness score + cluster breakdown as a qualitative overlay on the supported-org card (tab3) — flag orgs with 'Tav Midot' as a governance quality signal distinct from financial-only metrics
- **dashboard_use**: Tab 3 (גוף נתמך) — governance/effectiveness badge
- **israel_coverage**: Israel-specific, Hebrew, but coverage is LOW — likely only a few hundred orgs nationally opt into the paid/effortful rating process (not confirmed count); sports-sector orgs may have zero coverage
- **reliability**: official/primary for its own rating (Midot is the authority), but sparse coverage and no API means manual per-org lookup/scraping only — low ROI unless a handful of major federations happen to be rated

### Midot — Financial Resilience Index for Social Orgs (מדד איתנות פיננסית, Midot x Code for Israel)  _(area: None)_
- **provider**: Midot + Code for Israel (volunteer civic-tech collab)
- **access**: https://midot.org.il/ngos-ranking (tool) — per-org scores also surfaced on JGive/GuideStar Israel org pages under 'transparency metrics'; no API or bulk download found; source GitHub repo not locatable (checked Code-For-Israel org's 12 repos, none matched)
- **auth**: none to view
- **cost**: free
- **data_provided**: Relative percentile score (5 verbal levels, low-to-excellent) computed from 3 financial parameters derived from the nonprofit's self-reported revenue report, compared against peer orgs of similar annual turnover (>100,000 NIS eligibility floor); org score + category average shown
- **spatial**: none
- **enrichment_idea**: Since methodology (3 financial ratios from revenue reports, peer-percentile by turnover bucket) is publicly documented and inputs are the SAME GuideStar filing data the office already pulls via GuideStar Israel API, consider REPLICATING this index in-house rather than scraping — gives full control + covers every org, not just ones with a scraped page
- **dashboard_use**: Tab 3 (גוף נתמך) financial-health badge / percentile-vs-peers chart
- **israel_coverage**: Israel-wide in principle (any org w/ turnover >100k NIS that filed a revenue report), Hebrew
- **reliability**: community/volunteer-built (not government-official) but methodology transparent and public; no API means only per-org web lookup is possible — not practical for bulk dashboard ingestion, hence the 'replicate in-house' suggestion above

### JGive donation platform  _(area: None)_
- **provider**: JGive (Israeli online giving/crowdfunding platform for registered nonprofits)
- **access**: www.jgive.com — public campaign pages only; no public API found
- **auth**: n/a (no API)
- **cost**: free to browse campaigns; platform itself charges nonprofits transaction/processing fees (basic track has none per marketing copy) — not a data-access cost
- **data_provided**: Per-campaign public fundraising totals for 3,000+ Israeli nonprofits; platform-wide stats (NIS ~400M total giving 2025, ~70% donor growth over 5yrs) only available as press-release aggregates, not queryable
- **spatial**: none
- **enrichment_idea**: Low priority: could manually check if a specific federation/club runs a JGive campaign to add a 'public fundraising activity' flag on the supported-org card, but no systematic/bulk join possible without an API
- **dashboard_use**: Tab 3 — optional manual-lookup flag only, not a systematic feed
- **israel_coverage**: Israel-specific, Hebrew/English, but only orgs that actively fundraise on the platform
- **reliability**: commercial platform, no API/ToS for data extraction confirmed — treat as not viable for automated ingestion

### המפה החברתית (Social Map)  _(area: None)_
- **provider**: unidentified operator in fetched content (likely Midot/civil-society-sector affiliated per data-tools listing); aggregates GuideStar + government funding data
- **access**: https://socialmap.org.il/ — web interface only; no API/download found
- **auth**: none to browse
- **cost**: free, public-facing
- **data_provided**: 19,023 active organizations across 71 sectors; ₪21.3B in government funding tracked over 3 years; org defined 'active' if filed a GuideStar report in last 3 years; quarterly updates
- **spatial**: unconfirmed — name implies mapping but per-org location display not confirmed in this pass; worth a follow-up visual check (site likely JS-heavy)
- **enrichment_idea**: Its 71-sector taxonomy could be a ready-made categorical crosswalk to classify supported orgs beyond 'sport' (e.g. sport+welfare dual-purpose orgs); largely redundant with BudgetKey+GuideStar Israel already in use, so treat as secondary
- **dashboard_use**: Tab 3/6 — sector benchmarking context only
- **israel_coverage**: Israel-wide, Hebrew
- **reliability**: secondary aggregator of GuideStar data (not primary); quarterly update cadence stated; no API means low practical value given GuideStar Israel API is already the office's direct primary source

### שער להערכה (Gate to Evaluation)  _(area: None)_
- **provider**: gate2evaluation.org — aggregated database of social-program evaluation studies conducted in Israel (found via Midot data-tools listing)
- **access**: https://www.gate2evaluation.org/ — web search interface; not independently verified this pass, not fetched directly
- **auth**: unknown — not fetched
- **cost**: unknown — not fetched
- **data_provided**: program-evaluation research studies (methodology + outcome findings) for Israeli social programs — could benchmark expected participation/outcome rates for sport programs
- **spatial**: none expected
- **enrichment_idea**: Search for existing evaluations of sport-participation or youth-sport programs to source realistic benchmark rates for tab6 impact/efficiency comparisons, rather than inventing thresholds internally
- **dashboard_use**: Tab 6 (Impact & efficiency) — benchmark sourcing, not a live data feed
- **israel_coverage**: Israel-specific per name/context, not independently confirmed
- **reliability**: not verified this pass — flagged for a follow-up fetch, not a firm finding

### Overpass API (overpass-api.de)  _(area: None)_
- **provider**: Community-run public Overpass instance (OSM ecosystem infrastructure); overpass-turbo.eu provides the companion web IDE/export UI over the same data.
- **access**: POST/GET https://overpass-api.de/api/interpreter with Overpass QL query string (data= param); alternate mirrors exist (e.g. kumi.systems, gall.openstreetmap.de). Web IDE: overpass-turbo.eu.
- **auth**: none
- **cost**: Free. Anonymous rate limit = 2 concurrent query slots per IP (verified via /api/status). No hard request quota but public instance visibly congests under load — hit 429 rate-limited and 504 timeout responses repeatedly during testing today.
- **data_provided**: Full OSM tag set for any query: leisure=pitch/sports_centre/stadium/swimming_pool geometries, sport=* (173 distinct values seen in IL+PS: basketball 1935, soccer 1537, tennis 1017, swimming 604, fitness 378, plus ~168 more incl. multi-sport combos), name/name:he/name:ar/name:en, addr:city/street, access, opening_hours where mapped.
- **spatial**: Full geometry output — node lat/lon directly, way/relation centroid via 'out center' or full polygon via 'out geom'; overpass-turbo can export straight to GeoJSON.
- **enrichment_idea**: Fuzzy-match internal club/facility names against OSM name/name:he tags to pull exact lat/lon + polygon geometry for facilities the office only has as text records; use that geometry for catchment-radius joins against CBS statistical areas (population/socio-economic index).
- **dashboard_use**: תיק יישוב heat maps, athletes-per-branch facility map, facility-density/accessibility layer feeding Impact & Efficiency tab.
- **israel_coverage**: Good volume — 10,440 pitch/sports_centre/stadium/swimming_pool features counted nationwide. BUT Hebrew name tagging (name:he) is inconsistent: sample pull from a mixed Jerusalem/West-Bank bbox showed most stadiums carry name:ar/name:en with only a minority also carrying name:he — don't assume every facility has a Hebrew label even inside Israel proper.
- **reliability**: Community/volunteer-maintained, not an official government source; data is live and continuously updated (timestamp_osm_base confirmed current to the hour). Public instance is fragile under sustained/parallel use (observed 429s and 504s in a single test session) — for a production QuickSight ETL, self-host Overpass or switch to the Geofabrik bulk extract instead of hitting the live API. OSM data is ODbL: fine to store derived coordinates for internal enrichment; redistributing a bulk extract requires attribution/share-alike.

### Nominatim  _(area: None)_
- **provider**: OpenStreetMap Foundation — the official reference geocoder for OSM data.
- **access**: https://nominatim.openstreetmap.org/search (forward) and /reverse (reverse geocoding), free-text or structured params.
- **auth**: None required in principle, but a valid identifying User-Agent or Referer is mandatory per policy — and in practice the public instance appears to hard-block requests from this session's (cloud/datacenter) IP regardless (403 'Access denied' even with a descriptive custom User-Agent + Referer).
- **cost**: Free but heavily throttled: 1 request/sec max, bulk/batch work discouraged (single-thread, ≤4 req/min for longer scripts), caching of results mandatory on caller's side. Heavier needs → self-host or commercial provider.
- **data_provided**: Structured address components (house number, street, city, county, state, postcode, country) plus lat/lon for a query; reverse lookup returns the same from coordinates; administrative boundary polygons available too.
- **spatial**: Core function IS geocoding/reverse-geocoding — exact lat/lon plus admin hierarchy for any Israeli address string.
- **enrichment_idea**: Batch-geocode the office's internal club/facility postal addresses (where only text address exists) into lat/lon for the תיק יישוב map; reverse-geocode any existing raw coordinates to backfill missing city/street/postcode fields on the גוף נתמך card.
- **dashboard_use**: Any tab needing point locations from text addresses — תיק יישוב map, גוף נתמך address validation, Supports tab facility pins.
- **israel_coverage**: Same underlying OSM dataset as Overpass, so Hebrew/Arabic address coverage is decent in major cities and weaker in the periphery; quality is only as good as OSM's address tagging in that area (not independently verified here beyond the block issue).
- **reliability**: Official/primary OSM project, but the free public instance is explicitly a courtesy service with a restrictive ToS and — confirmed in this session — appears to actively block requests from cloud/server IP ranges (403 on every attempt). For a production/server-side ETL job, plan on either self-hosting Nominatim or using a commercial Nominatim-backed reseller (e.g. LocationIQ, Geoapify — not yet verified, flagged in suggestions) rather than depending on the public endpoint.

### Photon (komoot)  _(area: None)_
- **provider**: komoot (outdoor navigation company) — open-source OSM-based geocoder, run as a public OSM-adjacent project.
- **access**: https://photon.komoot.io/api/?q=<query>&limit=N (GET, plain query params, JSON/GeoJSON response).
- **auth**: none
- **cost**: Free public instance, fair-use only ('extensive usage will be throttled', no published numeric quota). Open-source and self-hostable (github.com/komoot/photon) for guaranteed capacity.
- **data_provided**: Structured geocoding hits: name, street, district, city, county, state, country, postcode, osm_type/osm_id, osm_key/osm_value (so you can tell a hit is leisure=sports_hall vs amenity=place_of_worship etc.), lat/lon.
- **spatial**: Forward geocoding (typeahead-style, typo-tolerant) and reverse geocoding, returns point coordinates plus full admin hierarchy.
- **enrichment_idea**: Use as the primary batch geocoder for internal facility/org names+addresses instead of Nominatim, since it worked reliably from this environment when Nominatim was blocked outright; cross-check a sample against Overpass name-matches for QA before trusting at scale.
- **dashboard_use**: תיק יישוב map pin placement, גוף נתמך card location field, fallback geocoder wherever Nominatim access fails.
- **israel_coverage**: Verified working end-to-end: a raw Hebrew-text query for a Ramat Gan sports hall returned the correct leisure=sports_hall OSM feature with a complete, correctly-transliterated Israeli address (street/district/city/postcode). Caveat: the lang=he UI-language parameter is NOT supported (only default/de/en/fr) — Hebrew text search itself still works via 'default', it just isn't specially tuned/tokenized for Hebrew the way de/en/fr are.
- **reliability**: Community/company-run OSS project on top of OSM data; single free public instance with no availability guarantee ('availability not guaranteed, terms may change' per komoot's own page). Good practical fallback given it was reachable when Nominatim's public endpoint 403'd from this same network.

### Geofabrik Israel-and-Palestine extract  _(area: None)_
- **provider**: Geofabrik GmbH — long-standing, widely-trusted OSM regional-extract host used across the GIS industry.
- **access**: https://download.geofabrik.de/asia/israel-and-palestine.html — direct downloads: israel-and-palestine-latest.osm.pbf, -latest-free.shp.zip (Shapefile), -latest.gpkg.zip (GeoPackage); monthly dated archives also kept.
- **auth**: none
- **cost**: Free.
- **data_provided**: Full OSM planet subset clipped to Israel+Palestine — every tag including all leisure=*/sport=*/amenity=* features and full geometries, not just a curated POI subset.
- **spatial**: Complete vector geodata ready for GIS import (GeoPackage/Shapefile) or offline filtering of the PBF with osmium-tool/osmosis to pull just leisure/sport tags without touching any live API.
- **enrichment_idea**: Run as a scheduled batch ETL step: download the daily .pbf, filter with osmium to leisure=pitch/sports_centre/stadium/swimming_pool + sport=*, spatial-join against internal facility/club records (via geocoded coordinates) entirely offline — avoids all Overpass/Nominatim rate-limit and IP-block issues hit during live testing.
- **dashboard_use**: Back-end/ETL data source feeding map layers across תיק יישוב and ביצועים ומגדר tabs — the production-grade alternative to querying live Overpass at dashboard-refresh time.
- **israel_coverage**: Verified continuously updated — latest snapshot was ~8 hours old at check time, containing all OSM data up to the prior day; monthly archived snapshots also available for reproducible ETL runs.
- **reliability**: Official/primary community mirror, industry-standard for production GIS pipelines (used by QGIS, PostGIS imports etc.); ODbL licensed with contributor PII already stripped from the public files, so safe to store/derive from for internal analytics.

### HOTOSM Israel Points of Interest export (HDX)  _(area: None)_
- **provider**: Humanitarian OpenStreetMap Team (HOT), published via UN OCHA's Humanitarian Data Exchange (data.humdata.org).
- **access**: https://data.humdata.org/dataset/hotosm_isr_points_of_interest — download buttons for GeoPackage, Shapefile, GeoJSON, KML, plus JSON metadata and an HTML report.
- **auth**: none for download (site itself blocks generic bot fetches with a 403, but the dataset page/files are publicly downloadable via browser)
- **cost**: Free.
- **data_provided**: Curated POI layer (amenity/shop/tourism/man_made tag categories) for all of Israel; GeoJSON ~6.2MB, Shapefile ~8.4MB, GeoPackage ~8.5MB.
- **spatial**: Ready-to-use point geometries in standard GIS formats, no processing needed.
- **enrichment_idea**: Lighter-weight alternative to the full Geofabrik extract when the dashboard team only needs a general POI backdrop layer (schools, health, transit landmarks) around sports facilities for context, without standing up an osmium pipeline.
- **dashboard_use**: תיק יישוב map POI backdrop/context layer.
- **israel_coverage**: Crowd-sourced from the same OSM base; HOT's own listing states the data 'cannot be considered to be exhaustive' — urban areas well-mapped, remote/peripheral regions weaker.
- **reliability**: Reputable humanitarian-org derivative of OSM, refreshed monthly, ODbL licensed.

### Taginfo (Geofabrik regional instance)  _(area: None)_
- **provider**: Geofabrik's regional deployment of Jochen Topf's Taginfo tool, scoped to the Israel-and-Palestine extract.
- **access**: https://taginfo.geofabrik.de/asia/israel-and-palestine/api/4/key/values?key=<tag> (JSON API), plus a browsable web UI at the same host.
- **auth**: none
- **cost**: Free.
- **data_provided**: Tag-value frequency statistics for the region, not geodata itself. Verified: 173 distinct sport= values used in IL+PS with counts (basketball 1935, soccer 1537, tennis 1017, swimming 604, fitness 378, running 119, table_tennis 95, cycling 77, climbing 72, skateboard 70, plus many multi-value/compound tags like 'soccer;basketball').
- **spatial**: none
- **enrichment_idea**: Not a data source for the dashboard itself — use it upfront as an ETL-design check: confirm the dashboard's sport-category taxonomy/lookup table actually covers the long tail of real sport= values in Israeli OSM data (e.g. padel, teqball, canoe_polo appear) before building Overpass/Geofabrik filters, so obscure sports don't silently fall through unmapped.
- **dashboard_use**: ETL/QA support for ביצועים ומגדר sport-category breakdowns; not a runtime visual data source.
- **israel_coverage**: Statistics are exactly as complete as the underlying regional OSM extract (same data as the Geofabrik download).
- **reliability**: Official companion tool in the OSM/Geofabrik ecosystem, refreshed alongside each daily extract update.

### CBS מדד חברתי-כלכלי (Socio-Economic Index of Localities/Settlements/Statistical Areas)  _(area: None)_
- **provider**: הלשכה המרכזית לסטטיסטיקה — CBS/למ"ס, Israel's national statistics bureau
- **access**: Interactive ArcGIS map on CBS topic page; per-locality PDF ranking tables (e.g. 24_24_230t1.pdf); also exposed as a viewable layer in the GovMap portal (layer id 218044 = 'מדד חברתי כלכלי 2021 לאזורים סטטיסטיים 2011')
- **auth**: none to view PDFs/interactive map; GovMap free registration+token needed to query programmatically
- **cost**: free — official government statistics
- **data_provided**: Index value + national rank + cluster (1-10, or 1-21 within homogeneous groups) per locality, per settlement-within-regional-council, and per statistical area inside municipalities/local councils. Built from demography, education, employment/pensions, income, motorization, housing.
- **spatial**: Yes — value attaches to a geographic unit (locality code or statistical-area code) and is visualized spatially by CBS itself; joinable to the companion statistical-area polygon layer or to locality boundaries via code
- **enrichment_idea**: Geocode every internal club/facility address, spatial-join the point to a CBS statistical-area polygon (or query GovMap's socio-econ layer directly at that point), attach the resulting cluster/index to each sports org — powers 'support ₪ vs socio-economic level' and 'athletes per capita by cluster' equity views
- **dashboard_use**: תיק יישוב equity heat maps; Impact & efficiency tab (participation-rate/budget-efficiency vs socio-economic level)
- **israel_coverage**: Full — national index covering all localities and statistical areas, Hebrew source
- **reliability**: Primary/official (CBS). Latest full run is 2021 vintage (released 2024). CAVEAT: statistical-area boundaries get redrawn between censuses (2011 vs 2022 geometry) — must track which boundary vintage a given index value refers to before spatial-joining.

### CBS אזורים סטטיסטיים — Statistical Areas boundary geodatabase  _(area: None)_
- **provider**: CBS/למ"ס
- **access**: Direct public zip downloads (File Geodatabase), e.g. https://www.cbs.gov.il/he/Documents/statisticalareas_2020_demography.gdb.zip (catalog 50502י); also 2017/2018/2019 vintages with readme PDFs; separately hosted as ArcGIS Hub items for 2011 and 2022 vintages (icbs-gis.maps.arcgis.com) though a public REST FeatureServer endpoint could not be confirmed (pages are JS-rendered, blocked headless fetch)
- **auth**: none — public direct download
- **cost**: free
- **data_provided**: Polygon boundaries of statistical areas nested within municipalities/local councils, bundled with demographic attributes (population by age/sex etc.), plus statistical-area code and locality code (סמל יישוב) join keys
- **spatial**: This IS the polygon base layer for point-in-polygon spatial joins — geocode a facility/org address, test which statistical-area polygon it falls in, then pull any CBS statistical-area-level table (income, socio-econ index, population) via that code
- **enrichment_idea**: Pre-process this geodatabase once (via GDAL/QGIS/ArcPy, since QuickSight isn't a GIS engine) into a lookup table of statistical-area polygons; run all internal facility/org geocoded points through it in ETL to permanently tag each with a statistical-area code
- **dashboard_use**: תיק יישוב heat maps; spatial base layer underlying any location-based visual across tabs
- **israel_coverage**: Full, official national boundaries
- **reliability**: Primary/official; boundaries redrawn between censuses (2011 vs 2022 vintages differ) — pick one vintage and stay consistent. Format is Esri File Geodatabase — needs GDAL/ArcPy/QGIS to convert to GeoJSON/CSV before any QuickSight-adjacent pipeline can use it (not natively QuickSight-consumable).

### CBS מדד פריפריאליות — Peripherality Index of Localities & Local Authorities (2020)  _(area: None)_
- **provider**: CBS/למ"ס
- **access**: CBS media-release/publication PDFs (e.g. 24_22_420b.pdf) with locality-level ranking tables; no confirmed open CSV/API/GIS dataset found on data.gov.il (0 results) or elsewhere in this pass
- **auth**: none
- **cost**: free
- **data_provided**: Peripherality index value + rank per locality/local authority, 2020 vintage; constructed from a Potential-Accessibility component (proximity to all other localities weighted by their population) plus a travel-time-to-center component
- **spatial**: Partial — value attaches to a locality (point/area) but is not itself a polygon/GIS layer; must be joined to locality boundaries or geocoded points via locality code
- **enrichment_idea**: Cross with the socio-economic index for a 2-axis 'periphery × deprivation' segmentation of local authorities — justifies differentiated support-test weighting for peripheral/weak authorities in the Supports/grants tab
- **dashboard_use**: Impact & efficiency tab; תיק יישוב periphery flag
- **israel_coverage**: Full — all Israeli localities and local authorities
- **reliability**: Primary/official but only PDF/table format confirmed — no machine-readable (CSV/API/GIS) source found despite searching data.gov.il directly (0 hits); would require manual/PDF-table extraction unless a hidden CSV exists elsewhere

### data.gov.il — Social-Economic Cluster of Localities 2019 (CSV)  _(area: None)_
- **provider**: data.gov.il (Israel's open-data portal), republishing CBS-sourced numbers, org listed as the digital-government office
- **access**: Exact CSV download URL: https://data.gov.il/dataset/df3b0e8d-b76a-4186-a6e1-df8eada5ef27/resource/7c860e04-9f8d-41c2-9f24-6249958d2081/download/-2019.csv ; also queryable via CKAN API package_search/package_show (dataset id 'social_economic_cluster')
- **auth**: none
- **cost**: free
- **data_provided**: Socio-economic cluster classification per locality, 2019 vintage, single CSV (~300KB)
- **spatial**: None directly (tabular, locality-code keyed only) — needs join to a locality boundary/point layer for mapping
- **enrichment_idea**: Fastest machine-readable path (plain CSV, no GDB/GIS tooling needed) to tag every locality referenced in the ministry's internal support-grant records with a socio-economic cluster for the Impact & efficiency tab — pending confirmation of the exact join column (expected סמל יישוב)
- **dashboard_use**: Supports/grants tab (equity-adjusted funding analysis); Impact & efficiency tab
- **israel_coverage**: Full, all localities, Hebrew CSV
- **reliability**: Secondary hop (data.gov.il republishing CBS numbers, 2019 vintage — older than CBS's own 2021 run). Verify column headers/join key by opening the CSV directly before building a pipeline on it.

### CBS API interface (SDMX Time Series DataBank)  _(area: None)_
- **provider**: CBS/למ"ס
- **access**: https://www.cbs.gov.il/en/Pages/Api-interface.aspx describes SDMX-standard REST queries against the Time Series DataBank, Price Indices, and CBS Dictionaries; exact URL template/query syntax not fully detailed in the fetched excerpt
- **auth**: None confirmed mandatory beyond a required User-Agent header on requests
- **cost**: free
- **data_provided**: Broad socio-economic time series: population, environment, quality of life, energy, construction, health, education, agriculture, trade, employment, etc.
- **spatial**: None confirmed — tabular time series; geographic breakdown granularity (national/district vs statistical-area) not confirmed in this pass
- **enrichment_idea**: Pull national/district trend context programmatically to auto-refresh KPI benchmark comparisons each year rather than manual PDF re-reads
- **dashboard_use**: Any tab needing refreshed national benchmark KPIs (Impact & efficiency, Performance & gender)
- **israel_coverage**: Full, Hebrew/English
- **reliability**: Primary/official; SDMX is a recognized international statistical-exchange standard. Exact endpoint mechanics not verified in this pass — needs a follow-up doc read.

### GovMap API — geocode function  _(area: None)_
- **provider**: govmap.gov.il, Israel's national government mapping portal (operated via the state mapping/Survey infrastructure)
- **access**: https://api.govmap.gov.il/docs/javascript-functions/geocode ; JS call govmap.geocode({keyword, type: FullResult|AccuracyOnly})
- **auth**: API token required, obtained via free registration with an email address at govmap.gov.il
- **cost**: free — no pricing found; it is a government service
- **data_provided**: Address free-text search → matching coordinates (X/Y) with a ResultCode: 1=single exact match, 2=partial match (e.g. street found, no house number), 3=multiple/no results (candidate address list only, no coordinates)
- **spatial**: Yes — this is a national-grade Israeli address geocoder purpose-built for exactly the office's 'org address → lat/lng' need
- **enrichment_idea**: Batch-geocode every internal sports-org/facility address through this as the FIRST step of the spatial-enrichment chain — feeds heat maps, catchment analysis, nearest-facility lookups, and statistical-area joins
- **dashboard_use**: תיק יישוב heat maps; base geocoding step feeding every location-based visual across tabs
- **israel_coverage**: Full — this is the Israeli government's own geocoder built on the national address/parcel database; expected to outperform global geocoders on Hebrew/local address formats
- **reliability**: Primary/official government service. Coordinate system (ITM vs WGS84) and storage/caching ToS for geocoded results were NOT confirmed in the docs fetched — verify before persisting coordinates at scale.

### GovMap API — getLayerData (point + radius layer query)  _(area: None)_
- **provider**: govmap.gov.il
- **access**: https://api.govmap.gov.il/docs/javascript-functions/get-layer-data ; JS call govmap.getLayerData({LayerName, Point:{x,y}, Radius})
- **auth**: token required (set at map/session init)
- **cost**: free
- **data_provided**: All entities of a named government layer within a radius (meters) of a point, with distances + the layer's info-bubble fields. Example layer names seen in docs: bus_stops, GASSTATIONS, PARCEL_HOKS, KSHTANN_ASSETS — full layer catalog not enumerated in the fetched excerpt, but the CBS socio-economic index is confirmed present as a layer inside the GovMap portal (id 218044).
- **spatial**: Yes — direct point-in-radius/point-in-polygon style lookup against government layers, no local GIS processing needed
- **enrichment_idea**: After geocoding an org's address, call getLayerData against the CBS socio-economic/statistical-area layer to fetch that exact point's cluster/index directly from government infrastructure — skips downloading/parsing the national geodatabase. Same mechanism can pull 'nearby facilities/bus stops/schools' context to enrich a גוף נתמך (supported-org) card.
- **dashboard_use**: גוף נתמך card enrichment; תיק יישוב heat maps; catchment/accessibility metrics
- **israel_coverage**: Full
- **reliability**: Primary/official. Full layer-name catalog and rate limits NOT found in this pass — needs a follow-up (a 'list layers' endpoint or manual portal browse) before building a pipeline on it.

### OSM Nominatim (supporting/fallback geocoder + POI source)  _(area: None)_
- **provider**: OpenStreetMap Foundation / community
- **access**: https://nominatim.openstreetmap.org (public demo instance) or self-host the open-source Nominatim server
- **auth**: none for the public demo instance
- **cost**: free; public instance capped at ~1 request/second per its usage policy — self-host or use a commercial provider for bulk/production use
- **data_provided**: Forward/reverse geocoding worldwide from OSM data; also queryable for OSM-tagged sports POIs (leisure=pitch, leisure=sports_centre, leisure=stadium)
- **spatial**: Yes — global geocoder plus a crowd-mapped POI database
- **enrichment_idea**: Use as a fallback/cross-check for GovMap geocode misses; also mine OSM for informally-mapped sports facilities/pitches NOT in the ministry's own internal facility list, as a facility-discovery/completeness-check angle
- **dashboard_use**: תיק יישוב facility layer; gap-detection for missing internal facility records
- **israel_coverage**: Partial — quality depends on community mapping density; generally strong in major cities, patchier in periphery and some Arab/Haredi towns
- **reliability**: Community-maintained, not authoritative. Continuous crowd updates (no fixed cadence). Strict usage policy on the free public instance (1 req/s, attribution required, no heavy bulk scraping) — treat as a supplement to GovMap, not primary.

### AWS QuickSight native Layer Maps (custom shape/GeoJSON)  _(area: None)_
- **provider**: AWS (built into QuickSight)
- **access**: Dataset > Add Layer > upload .geojson directly in QuickSight authoring UI
- **auth**: none beyond normal QuickSight author permissions
- **cost**: included in QuickSight license; no extra API cost
- **data_provided**: n/a — it's a rendering capability, not a data source; joins your data to uploaded polygon boundaries by a key field
- **spatial**: choropleth/filled-polygon rendering only; polygon geometry ONLY — no lines/points; GeoJSON file capped at 100MB
- **enrichment_idea**: Upload Israel local-authority or CBS statistical-area GeoJSON as the shape layer, join on official settlement/authority code (סמל יישוב) to power a native choropleth for tab 2 (תיק יישוב) and tab 6 (impact/efficiency) heat maps without any external map tool
- **dashboard_use**: Tab 2 (תיק יישוב) heat map, Tab 6 (Impact & efficiency) choropleth of participation-rate vs population
- **israel_coverage**: full — you supply the GeoJSON yourself (e.g. Israeli authority boundaries), so coverage = whatever boundary file you feed it
- **reliability**: official AWS feature, primary; but points geometry unsupported means you can't plot facility pins natively this way — use for polygon choropleth only, points need custom-visual-content workaround

### Ministry of Interior — Gvulot Shiput (jurisdiction boundaries)  _(area: None)_
- **provider**: משרד הפנים (Israeli Ministry of Interior)
- **access**: https://gvulot-shiput-statutory-moinil.opendata.arcgis.com/ (Esri ArcGIS Open Data hub); also gov.il page gov.il/he/departments/dynamiccollectors/boundaries-judgment
- **auth**: none — public open-data portal, likely direct GeoJSON/Shapefile download or Esri feature-service query (?f=geojson)
- **cost**: free, government open data
- **data_provided**: official, LEGALLY-BINDING (סטטוטורי) current + historical local-authority jurisdiction boundary polygons, plus other MOI geographic layers
- **spatial**: authoritative polygon boundaries for every local authority in Israel — likely the best source for the choropleth base layer (more authoritative than CBS statistical areas for authority-level, since it's the legal boundary)
- **enrichment_idea**: Use as the canonical polygon set to spatial-join geocoded club/facility lat-lng points to their containing local authority when the internal record only has a fuzzy municipality name — resolves ambiguous/typo'd authority names via point-in-polygon instead of string matching
- **dashboard_use**: Tab 2 (תיק יישוב) base map polygons; Tab 6 impact/efficiency choropleth
- **israel_coverage**: full, Israel-only, Hebrew, this is the source-of-truth ministry
- **reliability**: official/primary (regulator itself); boundaries change occasionally (annexations/mergers) so re-pull periodically; page is a JS-heavy ArcGIS Hub site, could not confirm update cadence or exact download format by automated fetch — recommend manual browser check

### CBS (למ״ס) Statistical Areas 2022  _(area: None)_
- **provider**: הלשכה המרכזית לסטטיסטיקה (Israel Central Bureau of Statistics)
- **access**: cbs.gov.il/he/Pages/geo-layers.aspx (SHP download) and hub.arcgis.com/datasets/IsraelData::statistical-areas-2022 (ArcGIS Hub feature layer, standard Esri REST query API likely supports f=geojson)
- **auth**: none for viewing/download; standard CBS licensing (custom license, not fully open — check terms before redistribution)
- **cost**: free
- **data_provided**: 3,857 statistical-area polygons for the 2022 census; subdivides cities >40K residents, quarters for cities >100K; ties to CBS demographic/socioeconomic tables by area code
- **spatial**: sub-municipal polygon granularity (finer than authority-level) in ITM (Israel New Grid) CRS — needs reprojection to WGS84 for web maps/QuickSight
- **enrichment_idea**: Point-in-polygon join geocoded facility/club coordinates to statistical area, then pull in CBS's socioeconomic-index (מדד חברתי-כלכלי) and population-by-age tables per area — gives catchment-population and socioeconomic-context columns for every internal record without manual tagging
- **dashboard_use**: Tab 6 (Impact & efficiency) — participation rate vs population at sub-city granularity; Tab 2 heat maps
- **israel_coverage**: full national coverage, Hebrew field names, this IS the Israeli statistics agency
- **reliability**: official/primary, last updated 2022-02-15 (census-cycle cadence, so infrequent refresh); custom license terms not fully confirmed — verify redistribution/storage rights before embedding in a shipped dashboard

### data.gov.il — מתקני ספורט (Sports Facilities dataset)  _(area: None)_
- **provider**: Ministry of Culture & Sport itself (this is the office's own published dataset on data.gov.il / visible on GovMap layer 400)
- **access**: https://data.gov.il/dataset/408 (CKAN dataset, resource id f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d); also viewable at govmap.gov.il/?lay=400
- **auth**: none — public CKAN resource, likely downloadable as CSV/XLSX and via CKAN datastore_search API like the other data.gov.il datasets already in use (moj-amutot)
- **cost**: free, government open data
- **data_provided**: ~6,500 sports facility records: name, address, coordinates, operating body, availability for private use, disability accessibility, parking, suitability for international competitions
- **spatial**: ALREADY has lat/lng per facility per the dataset description — this is a ready-made point layer, no geocoding needed if coordinates are populated/clean
- **enrichment_idea**: This is the single highest-leverage internal-adjacent dataset: join it to the office's own club/federation records by facility name/address fuzzy-match to backfill exact coordinates for orgs that only have a facility name on file; then use those coordinates to compute per-club distance-to-nearest-facility, facility density per authority, and feed the isochrone/catchment analysis for tab 6
- **dashboard_use**: Tab 2 (תיק יישוב) — athletes-per-branch + facility map overlay; Tab 6 impact/efficiency
- **israel_coverage**: full, Israel-only, Hebrew, and specifically curated by the ministry itself — should be the most trustworthy spatial dataset in this whole area
- **reliability**: official/primary (own ministry data); could not confirm update cadence or exact field list via automated fetch (page is JS-rendered / fetch returned empty) — recommend a team member open it directly in a browser or via CKAN API (data.gov.il/api/3/action/datastore_search?resource_id=...) to verify schema and freshness

### GovMap API (Survey of Israel / מרכז למיפוי ישראל)  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל), under gov.il
- **access**: JS SDK loaded via govmap.gov.il, functions incl. govmap.geocode(), govmap.searchAndLocate(), govmap.createMap() etc; docs at api.govmap.gov.il/docs
- **auth**: account-required — free registration gets an API token bound to your specific domain (token invalid on other domains); functions require token in map-init config
- **cost**: free (government service); no published rate limits found in docs excerpt
- **data_provided**: geocode(): address text -> X/Y coords + accuracy ResultCode (1=exact,2=fuzzy-unique,3=ambiguous/none); searchAndLocate(): address<->gush/helka (land parcel) bidirectional lookup with settlementCode/streetCode
- **spatial**: official Israeli address geocoder — best-authority option for turning internal club/org street addresses into exact lat-lng (coordinate system not confirmed WGS84 vs ITM — verify before use, Survey of Israel typically outputs ITM which needs reprojection)
- **enrichment_idea**: Batch-geocode every internal org/club address through GovMap (or its underlying REST if extractable — the API is packaged as a client-side JS function, so a server-side batch job may need to reverse-engineer the underlying endpoint or use a headless-browser wrapper); ALSO use searchAndLocate to attach gush/helka land-parcel IDs to facility-owning orgs, enabling cross-reference with land-registry/planning data
- **dashboard_use**: Backend enrichment step feeding Tab 2/3/6 maps (geocode step happens in ETL, not live in QuickSight)
- **israel_coverage**: full — this is Israel's national mapping agency's own geocoder, best possible Israel address coverage, Hebrew native
- **reliability**: official/primary; caveat — API is designed as a client-side (browser, domain-locked token) JS integration, not obviously a server-to-server batch REST API, so bulk offline geocoding of a whole org database may require running it in a headless browser context or finding an unofficial REST wrapper (community repo github.com/yovavsanders/govmap has example HTML/geocode pages worth inspecting further)

### Mapbox (Geocoding + Isochrone + Static/Vector Tiles)  _(area: None)_
- **provider**: Mapbox Inc. (commercial, US)
- **access**: api.mapbox.com/geocoding/v5, api.mapbox.com/isochrone/v1, plus Mapbox GL JS for tiles
- **auth**: api-key (access token), free account signup
- **cost**: per-SKU free tiers, roughly 50K-100K free requests/month per API (geocoding, directions, matrix, isochrone each have own free quota); geocoding ~$0.75/1K after free tier for basic, up to $4-5/1K for advanced
- **data_provided**: global geocoding, isochrone polygons by drive/walk/cycle time, vector/raster basemap tiles, directions/matrix routing
- **spatial**: strong — geocoding to lat/lng, isochrone catchment polygons directly usable for 'facility accessibility' analysis
- **enrichment_idea**: Generate 15/30-min drive-time isochrones around each sports facility, spatial-join against CBS statistical-area population to compute a 'reachable population' KPI per facility for tab 6 efficiency metrics
- **dashboard_use**: Tab 6 impact/efficiency catchment analysis; Tab 2 basemap tiles for heat map if not using QuickSight native map
- **israel_coverage**: global coverage via commercial+OSM data blend; Israel geocoding quality generally good but not government-grade for Hebrew addresses (secondary to GovMap for precision)
- **reliability**: commercial, well-documented, reliable SLA; ToS generally allows storing derived/geocoded coordinates — verify current ToS before persisting at scale; ok for QuickSight custom-visual iframe embed since it's a normal web page

### MapTiler  _(area: None)_
- **provider**: MapTiler (commercial, Switzerland)
- **access**: api.maptiler.com tile/style endpoints; also downloadable Israel OSM vector-tile extract at data.maptiler.com/downloads/tileset/osm/asia/israel-and-palestine/
- **auth**: api-key, free account
- **cost**: Free plan: 100,000 tile requests/month, no credit card; Flex $25/mo, Unlimited $295/mo; the downloadable Israel extract is free ONLY for non-commercial/eval/education — production use of the offline download requires a paid On-prem license
- **data_provided**: basemap vector/raster tiles, geocoding, static maps
- **spatial**: basemap tile rendering; can self-host Israel OSM extract for offline/on-prem use (relevant if the dashboard must run air-gapped)
- **enrichment_idea**: Use only as basemap under custom-visual-content iframe maps (Leaflet/deck.gl) for tabs needing a real street/terrain basemap under facility pins — not a data-enrichment source itself
- **dashboard_use**: basemap layer for any custom Leaflet/deck.gl map embedded via QuickSight custom visual content
- **israel_coverage**: good — OSM-based, dedicated Israel extract available; Hebrew label support depends on OSM data quality
- **reliability**: commercial, hosted CDN; free tile quota resets monthly with hard stop (no surprise billing) — fine for internal dashboard traffic volumes

### OpenRouteService (isochrones/routing)  _(area: None)_
- **provider**: HeiGIT / Heidelberg University (academic/nonprofit, OSM-based)
- **access**: api.openrouteservice.org/v2/isochrones/{profile}
- **auth**: api-key, free signup at openrouteservice.org
- **cost**: free tier: 2,500 requests/day, 40,000/month, 40 concurrent; paid HeiGIT plans above that
- **data_provided**: isochrone polygons (time or distance based, multiple transport profiles), routing/directions, matrix
- **spatial**: isochrone catchment-area generation from any lat-lng, OSM road-network based
- **enrichment_idea**: Free alternative to Mapbox isochrone for computing facility catchment areas at no cost within free-tier volume — good fit given dashboard's likely low query volume (per-facility batch, not live user traffic)
- **dashboard_use**: Tab 6 impact/efficiency — catchment population vs facility location
- **israel_coverage**: global via OSM road network; Israel road-network completeness in OSM is generally decent in cities, patchier in periphery/Arab towns — spot-check before relying on it for rural authorities
- **reliability**: open-source project run by an academic institute (HeiGIT), not enterprise SLA-backed; fine for batch ETL enrichment, riskier for a live-query production feature

### TravelTime API (isochrones)  _(area: None)_
- **provider**: TravelTime (commercial, UK)
- **access**: docs.traveltime.com REST API, isochrones/distance-matrix/directions endpoints
- **auth**: api-key, free signup + email verification
- **cost**: unusual model — flat-fee UNLIMITED usage plans rather than per-request pricing (unlike Mapbox/ORS); exact free-tier request cap not confirmed
- **data_provided**: isochrones by public transport, walking, cycling, driving (+ferry combos), distance matrix
- **spatial**: multi-modal isochrone generation, notably including PUBLIC TRANSIT travel-time — differentiator vs Mapbox/ORS which are road-network only
- **enrichment_idea**: If Israel public-transit coverage confirmed, use transit-mode isochrones to assess whether sports facilities are reachable by bus/train for underserved populations — much more socially meaningful for an equity/impact metric than driving-time
- **dashboard_use**: Tab 6 impact/efficiency — transit-accessibility KPI
- **israel_coverage**: UNCONFIRMED — vendor claims 200+ countries but Israel/transit-data presence not verified in docs excerpt; check their 'Transit Coverage Map' tool before relying on this
- **reliability**: commercial vendor, primary source for their own API but Israel coverage claim unverified by me — flag for follow-up before adopting

### Nominatim (OpenStreetMap geocoder)  _(area: None)_
- **provider**: OpenStreetMap Foundation (community/nonprofit)
- **access**: nominatim.openstreetmap.org/search, /reverse
- **auth**: none, but MUST send identifying User-Agent/Referer
- **cost**: free, but hard-capped at 1 request/second, batch jobs limited to 4 req/min — NOT viable for bulk-geocoding thousands of internal org addresses in reasonable time on the public instance
- **data_provided**: forward/reverse geocoding from OSM data, worldwide
- **spatial**: address-to-coordinate and reverse; results must be cached client-side per policy
- **enrichment_idea**: Fallback/cross-check geocoder for addresses GovMap fails to resolve; given the rate limit, self-host a Nominatim instance (open-source, Docker image available) if bulk geocoding thousands of org records — public endpoint too slow
- **dashboard_use**: ETL fallback geocoder, not a live dashboard component
- **israel_coverage**: depends entirely on OSM data completeness for Israel — generally solid in cities, weaker for smaller yishuvim/street-level rural addresses
- **reliability**: community-run, public instance explicitly not for production/heavy use; caching results is REQUIRED by policy — note the policy actually encourages storing coordinates locally, unlike some commercial geocoders that forbid persistence

### OSM raw tile servers (tile.openstreetmap.org)  _(area: None)_
- **provider**: OpenStreetMap Foundation
- **access**: tile.openstreetmap.org/{z}/{x}/{y}.png
- **auth**: none required, but heavy/bulk use gets IP-blocked without warning
- **cost**: free but explicitly NOT for embedding in a production app — donation-funded, limited capacity
- **data_provided**: rendered raster basemap tiles
- **spatial**: basemap tiles only, no geocoding
- **enrichment_idea**: n/a — do NOT use for this dashboard; use CARTO free basemaps, MapTiler, or Mapbox instead, all of which explicitly permit production embedding
- **dashboard_use**: none recommended
- **israel_coverage**: same OSM data as everyone else, full but N/A given ToS block
- **reliability**: explicitly prohibits bulk/prefetch/offline patterns; a government dashboard hitting this at any real traffic risks a silent block — flagged as a DO-NOT-USE for production

### CARTO free basemap tiles (Positron/Voyager/Dark Matter)  _(area: None)_
- **provider**: CARTO (basemap CDN, separate from their paid analytics platform)
- **access**: https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{scale}.png (or vector .json style for MapLibre/Mapbox GL)
- **auth**: none for the basemap tile CDN itself
- **cost**: free, commonly used as a Leaflet default basemap; note this is DISTINCT from the CARTO SaaS analytics platform which has NO free tier (only 14-day trial) — don't confuse the two
- **data_provided**: clean light-gray (Positron) / colorful (Voyager) / dark (Dark Matter) basemap styles, OSM-derived, 0-20 zoom
- **spatial**: basemap tiles only, ideal minimalist backdrop for choropleth/point overlays (Positron style specifically designed to not compete visually with data)
- **enrichment_idea**: Best-fit basemap for a custom Leaflet map embedded in QuickSight's custom-visual-content iframe, since it matches the dashboard's clean/navy design language (Positron gray works well under --navy/--sky brand colors)
- **dashboard_use**: basemap for Tab 2/6 custom map visuals
- **israel_coverage**: OSM-derived, same coverage caveats as OSM generally, but full render everywhere
- **reliability**: widely used community default (via leaflet-providers), no official published rate limit found — recommend confirming current ToS/fair-use terms directly with CARTO before heavy production reliance since exact quota wasn't found in this pass

### Esri/ArcGIS Online free tier geocoding  _(area: None)_
- **provider**: Esri
- **access**: developers.arcgis.com REST geocode-service /findAddressCandidates, /geocodeAddresses
- **auth**: api-key via free ArcGIS developer account
- **cost**: 20,000 non-stored geocodes/month free on a developer account; up to 1,000,000 non-stored geocode transactions/mo without consuming credits on some plan tiers; credits only consumed when STORING geocoded results (~<5 credits per 125 addresses stored)
- **data_provided**: global address geocoding + candidate matching, plus access to Esri's Living Atlas layers (demographics, land use) as a bonus
- **spatial**: strong global geocoder; Israel address quality not independently confirmed here (Esri's World Geocoder Israel precision typically street-level in cities)
- **enrichment_idea**: Secondary/cross-validation geocoder to GovMap — geocode the same address with both and flag mismatches >X meters as a data-quality signal on the internal org record
- **dashboard_use**: ETL enrichment step, not live in dashboard
- **israel_coverage**: unconfirmed precision for Israel specifically in this pass — flag for a quick test-geocode before adopting
- **reliability**: official/primary, enterprise-grade, but STORING results consumes paid credits — only the free tier is for non-stored/on-the-fly lookups, so a batch backfill of a permanent coordinates column would burn credits

### deck.gl  _(area: None)_
- **provider**: OpenJS Foundation / vis.gl (open source, originally Uber)
- **access**: npm package deck.gl, self-hosted in any web page
- **auth**: none — it's a client-side JS library, not a hosted API
- **cost**: free, open source (MIT-family license)
- **data_provided**: n/a — rendering library only, needs a data source + tile provider underneath
- **spatial**: WebGL2-accelerated large-scale point/heatmap/hexbin/arc layers — much better than QuickSight native maps for dense point clouds (e.g. plotting all athletes/clubs simultaneously) or animated flow maps (funding flows authority-to-authority)
- **enrichment_idea**: Build a standalone HTML page with deck.gl HeatmapLayer over all geocoded club/athlete points, host it, embed via QuickSight 'custom visual content' iframe for a rich heat map QuickSight's native visual types can't produce (dense point heat, not just polygon choropleth)
- **dashboard_use**: Tab 2 (תיק יישוב) athlete-density heat map; Tab 4 performance-by-branch spatial view
- **israel_coverage**: n/a (rendering library, not a data source)
- **reliability**: widely-adopted, actively maintained open-source project; QuickSight custom-visual-content requires the hosted page to support being shown in an iframe (X-Frame-Options must allow it) — a real constraint to plan for when hosting the deck.gl page

### Leaflet + free tile providers  _(area: None)_
- **provider**: Leaflet (OpenJS Foundation, open source)
- **access**: npm/CDN leaflet.js, pair with any tile provider (CARTO/MapTiler/Mapbox)
- **auth**: none for the library itself; auth depends on chosen tile provider
- **cost**: free, open source (BSD-2)
- **data_provided**: n/a — lightweight mapping library
- **spatial**: lightweight, simpler alternative to deck.gl for straightforward marker clusters, choropleth (Leaflet.markercluster, Leaflet-providers plugins), much smaller bundle for a fast-loading QuickSight iframe
- **enrichment_idea**: Simplest path to an interactive Israel choropleth+markers page (authority boundaries from MOI + facility points from data.gov.il) embeddable via QuickSight custom-visual-content — lower engineering cost than deck.gl for a first version
- **dashboard_use**: any tab needing an interactive point/choropleth map beyond QuickSight native capability
- **israel_coverage**: n/a (library); full via whichever tile+boundary data you feed it
- **reliability**: extremely mature/stable, de-facto standard for lightweight web maps; same iframe/X-Frame-Options hosting constraint as deck.gl applies

### מתקני ספורט בישראל (data.gov.il dataset 408, resource f8dbd3ed)  _(area: None)_
- **provider**: משרד התרבות והספורט - יחידת מתקני ספורט (Ministry of Culture & Sport's own Sports Facilities Unit), published via data.gov.il/CKAN
- **access**: CKAN datastore API: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d (supports q=, filters=, limit/offset for full pagination); also raw CSV download https://e.data.gov.il/dataset/db2941a4-d5d7-4a1f-893f-e456bfc6c774/resource/f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d/download/copy-of-25.7.21.csv and an aggregated-by-authority XLSX resource (2304b5de-c720-4b5c-bbc7-4cbab85e0ae8)
- **auth**: none - fully open CKAN API, no key required
- **cost**: free, no quota observed (standard CKAN, page-through with limit/offset)
- **data_provided**: 8,777 facility records, 26 fields: facility name/type/status, local authority, street+house number, neighborhood, owner (בעלי המתקן), operating body (גוף מפעיל), contact phone/email, fencing, lighting, parking, wheelchair accessibility, seating capacity, competition-standard flag (מתקן תקני לתחרויות), year built, and ITM X/Y coordinates per facility. Secondary XLSX resource aggregates counts by local authority.
- **spatial**: Every record has ITM (Israel Transverse Mercator, EPSG:2039) X/Y coordinates already (e.g. X=186634 Y=660017 for a hall in Or Yehuda) - directly convertible to WGS84 lat/lng with one pyproj transform, no geocoding step needed.
- **enrichment_idea**: Fuzzy-join internal federation/club/agudah records to this registry on (facility name + local authority) to instantly pull exact lat/lng for every facility the office already tracks by name only. Separately, filter q="פיס" (62+ hits, e.g. 'אולם ספורט פיס קהילתי', 'אולם פיס אבו גוש') and q="טוטו" against the שם המתקן field to auto-flag Toto/Pais-branded facilities as a proxy for lottery-funded construction where no explicit funder field exists. Owner/operating-body fields can also link facilities to the nonprofit/club entities used in the 'גוף נתמך' tab.
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps + athletes-per-branch; Tab 4/6 impact-efficiency (facility density vs. population/participation); Tab 1 supports (verify a funded facility physically exists); base spatial layer for all maps.
- **israel_coverage**: Full national coverage, all fields in Hebrew, all 8,777 records geolocated within Israel.
- **reliability**: Primary/official - published by the same Ministry (משרד התרבות והספורט) that owns the dashboard, via its own Sports Facilities Unit (est. 2019, contact Mitkanim@most.gov.il). Snapshot filename suggests last full refresh ~25.7.21 (Jul 2021) - verify current cadence via dataset page before relying on it as 'live'. Standard data.gov.il open-data terms generally permit storing/republishing coordinates; confirm exact license text on the dataset page before bulk copy into QuickSight.

### יחידת מתקני ספורט - משרד התרבות והספורט (Ministry's own Sports Facilities Unit)  _(area: None)_
- **provider**: Ministry of Culture & Sport, internal unit est. Jan 2019
- **access**: https://www.gov.il/he/departments/units/sports_facilities - lists open calls (קולות קוראים), procedures, a facilities-mapping link, and reporting forms; email Mitkanim@most.gov.il for direct data requests / fresher-than-open-data extracts
- **auth**: account-required for the internal mapping/reporting tools; page itself is public
- **cost**: free (gov.il page)
- **data_provided**: Unit centralizes ALL support for establishing/renovating/upgrading sports facilities nationally - i.e. this unit is almost certainly the source-of-truth owner of dataset 408; page does not itself expose data but names the owning unit and contact for a fresher/internal pull
- **spatial**: references a 'mapping of sports facilities' system link (not independently verified as a public API)
- **enrichment_idea**: Since this is the Ministry's own unit, worth an internal ask (not scraping) for a live/current export superseding the 2021 open-data snapshot, plus whichever internal ID scheme links facilities to support-test (מבחן תמיכה) grant records - that ID would make the facility<->grant join exact instead of fuzzy-name.
- **dashboard_use**: Tab 1 supports/grants (facility-linked grant validation); data governance/refresh source for the spatial layer
- **israel_coverage**: full, Hebrew, this IS the national program
- **reliability**: primary/official - internal ministry unit, the actual data owner

### אפשריבריא Sports Facilities Map (Ministry of Health)  _(area: None)_
- **provider**: Ministry of Health, in partnership with Ministry of Education and Ministry of Culture & Sport
- **access**: https://efsharibari.health.gov.il/active-life/exercising/sports-facilities-map/ - public-facing map/landing page, interactive map tool not independently fetched (likely JS embed)
- **auth**: none for viewing
- **cost**: free
- **data_provided**: same attribute set described as dataset 408 (type, location, condition, international-competition suitability, operator, disabled access, parking) - strongly suggests it's a front-end over the same Ministry facilities registry
- **spatial**: interactive map by design; underlying tile/API service not confirmed
- **enrichment_idea**: Low priority vs. dataset 408 directly - only worth revisiting if dataset 408's CSV proves stale and this map surfaces a more current live feed.
- **dashboard_use**: reference/QA only for now
- **israel_coverage**: full, Hebrew
- **reliability**: official (cross-ministry) but update cadence/source unconfirmed

### GovMap 'מתקני ספורט' layer (govmap.gov.il)  _(area: None)_
- **provider**: Survey of Israel / national GovMap portal (government mapping infrastructure)
- **access**: https://www.govmap.gov.il/?lay=SPORT (interactive JS map viewer); no public REST/ArcGIS endpoint for this specific national layer was found (only municipal-level, e.g. Tel Aviv's own ArcGIS IView2 server, which is a different local-only sports layer)
- **auth**: none to view; API access if it exists likely needs account-required GovMap API key
- **cost**: free to view
- **data_provided**: visual point layer of sports facilities on the national base map (likely rendering dataset 408 or its successor)
- **spatial**: national authoritative basemap + facility layer - best used as a visual cross-check that internal-record geocoding via dataset 408 lines up correctly, not as a bulk-pull API
- **enrichment_idea**: Use as ground-truth visual QA layer when validating geocoded internal facility records, and as a base map source for other GovMap layers (cadastral, socio-economic index polygons) that could give catchment-area context around each facility.
- **dashboard_use**: not directly QuickSight-embeddable; more a validation/design-reference tool
- **israel_coverage**: full, Hebrew, this is THE national government map
- **reliability**: official/primary map infrastructure; freshness of this particular layer unconfirmed

### obudget.org - Israel Open Budget (מפתח התקציב)  _(area: None)_
- **provider**: הידע הפתוח / Public Knowledge Workshop (civic-tech NGO), aggregates official government CKAN + Treasury budget-book data
- **access**: https://next.obudget.org/i/org/law_mandated_organization/500500384 (Council for Regulation of Sports Betting profile page); site documents a public API (linked from footer, exact base URL not captured this pass)
- **auth**: none (public civic data)
- **cost**: free
- **data_provided**: Ministry-to-Council budget transfers: ₪13.18M over reported window shown on this view, plus a larger ₪732M Ministry allocation broken into program buckets (e.g. ₪570.4M Corona sports relief across 7 supports, ₪59.6M athlete encouragement across 5 supports). No locality or facility-level breakdown on this page.
- **spatial**: none observed on this entity page
- **enrichment_idea**: Pull historical Ministry->Toto-Council transfer time series as a budget-context KPI/sparkline on the Supports tab (tab 1), separate from facility-level spatial work.
- **dashboard_use**: Tab 1 (supports/grants) - macro budget KPI, not facility-level
- **israel_coverage**: full, Hebrew
- **reliability**: community/NGO aggregator (not the primary government source itself) but widely used by Israeli data journalists/civic-tech; sources cited as official CKAN/budget-book files - treat as secondary, verify against Treasury source before using in the official dashboard

### שמות יישובים עם קואורדינטות (locality-centroid coordinates dataset)  _(area: None)_
- **provider**: likely Survey of Israel / data.gov.il, also mirrored on Esri's ArcGIS Hub (data-israeldata.opendata.arcgis.com)
- **access**: https://data.gov.il/dataset/828 (403/404 on direct fetch this pass - try browser or CKAN API with correct id/slug) and mirror https://hub.arcgis.com/datasets/a589d87604c6477ca4afb78f205b98fb_0
- **auth**: none expected (open dataset)
- **cost**: free
- **data_provided**: locality name -> centroid coordinates lookup table (schema not directly verified this pass)
- **spatial**: locality-level centroid geocoding - useful fallback join key when internal records only have a locality name and no address/facility match in dataset 408
- **enrichment_idea**: Use as the base geocoding lookup for any internal record (club, federation, grant) that only carries a locality/authority name, before falling back to full geocoding - cheap first pass ahead of address-level geocoders.
- **dashboard_use**: Tab 2 (תיק יישוב) map centering, Tab 6 impact-efficiency choropleths
- **israel_coverage**: full national locality list expected, Hebrew
- **reliability**: needs re-verification - direct fetch failed (403/404) this pass, existence confirmed only via search snippets and an ArcGIS Hub mirror

### 'זוכה לקהילה' (Winner for Community) Toto facility-construction program  _(area: None)_
- **provider**: המועצה להסדר ההימורים בספורט (Council for Regulation of Sports Betting / Toto-Winner)
- **access**: no structured/downloadable list found publicly; only narrative press coverage (ynet, globes) and the council's own promotional pages (playsmart.co.il, winner.co.il)
- **auth**: n/a - no data endpoint found
- **cost**: n/a
- **data_provided**: program facts only: ₪60M allocated for 'hundreds' of community sports fields/facilities nationwide, co-financed by the local authority on a differential scale by CBS socio-economic ranking; separate ₪14M special grant for Gaza-envelope/southern localities (0-40km from border, no co-financing required); ₪150M over 5 years mentioned in another program variant. No locality-by-locality public breakdown found.
- **spatial**: none published - this is exactly the gap dataset 408 fills once cross-referenced by facility name pattern
- **enrichment_idea**: Since Toto/Winner doesn't publish a locality list, use dataset 408's name-pattern trick (facilities literally named 'אולם/מגרש פיס...') plus a Freedom-of-Information request to the Council as the two practical ways to reconstruct which localities/facilities the program actually funded.
- **dashboard_use**: Tab 1 supports/grants - contextual program description; not directly ingestible as structured data yet
- **israel_coverage**: full program, Hebrew, but data not published in structured form
- **reliability**: official program but transparency is low (press releases + narrative pages only, no dataset); figures come from news coverage (globes, ynet), not primary filings

### IMS Envista API (Israel Meteorological Service)  _(area: None)_
- **provider**: Israel Meteorological Service (שירות מטאורולוגי ישראלי), government body
- **access**: Base: https://api.ims.gov.il/v1/envista/ ; endpoints incl. /regions/{REG_ID}, /stations/{ST_ID}/data/latest, /stations/{ST_ID}/data/{CH_ID}/latest, /stations/{ST_ID}/data/earliest, /stations/{ST_ID}/data?from=YYYY/MM/DD&to=YYYY/MM/DD
- **auth**: api-key (APIToken header). Must email ims@ims.gov.il / go through ims.gov.il/en/ObservationDataAPI, agree to terms of use, to get a token — not self-serve instant signup
- **cost**: Free (government service); no published rate limit found in docs fetched
- **data_provided**: ~85-90 automatic stations nationwide; channels: temp (TD/TDmax/TDmin), rainfall mm, wind speed+direction, relative humidity %, solar radiation W/m2, pressure mb; near-real-time (10 & 1-minute granularity) plus historical/daily aggregates
- **spatial**: Every station has lat/lon and a region ID (e.g. Jerusalem Givat Ram station at 31.771,35.197) — usable directly as a point layer; not a geocoder itself but the station grid can be spatially joined to facilities by nearest-station or interpolation
- **enrichment_idea**: Join each sports facility/club (once geocoded) to its nearest IMS station by lat/lon distance; pull historical rain/temp/wind for event dates to correlate weather with attendance/cancellations for outdoor sports (marathons, water sports, athletics) — feed a 'weather risk' overlay on the local-authority heat map tab
- **dashboard_use**: Tab 2 (tik yishuv) heat map context layer; tab 6 (impact/efficiency) — weather-adjusted participation analysis for outdoor/seasonal sports
- **israel_coverage**: Full Israel coverage, official primary source, Hebrew+English UI; this IS the Israeli source (best possible coverage)
- **reliability**: Official/primary (government meteorological authority), near-real-time updates (1-10 min); requires signed terms-of-use + manual key request (friction, not instant); unofficial community wrappers exist (py-weatheril, ims-envista) if manual approval is a blocker

### Open-Meteo Elevation API  _(area: None)_
- **provider**: Open-Meteo (open-source weather/geo API project)
- **access**: https://api.open-meteo.com/v1/elevation?latitude=..&longitude=.. — accepts up to 100 coordinate pairs per request
- **auth**: none for non-commercial use; api-key only if commercial tier needed
- **cost**: Free, no signup, up to 10,000 calls/day non-commercial
- **data_provided**: Terrain elevation (meters) per lat/lon point, from Copernicus DEM 2021 GLO-90 (90m resolution)
- **spatial**: Direct point elevation lookup worldwide at 90m resolution — not a geocoder, but pairs perfectly with any lat/lon the office already has or gets from GovMap geocoding
- **enrichment_idea**: Once facilities/clubs are geocoded, batch-fetch elevation to flag mountain/altitude training sites, or compute terrain ruggedness around outdoor venues (hiking, cycling, running clubs) to contextualize participation patterns vs. terrain difficulty
- **dashboard_use**: Tab 2 (tik yishuv) facility context; tab 6 impact/efficiency for outdoor-sport siting analysis
- **israel_coverage**: Global dataset, no Israel gap; no Hebrew (numeric data only, non-issue)
- **reliability**: Community/open-source project (not government) but backed by primary ESA Copernicus DEM data; CC BY 4.0 attribution required; static terrain data so freshness is a non-issue

### Open-Meteo Forecast API  _(area: None)_
- **provider**: Open-Meteo
- **access**: https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=..; also historical-forecast and archive endpoints
- **auth**: none for non-commercial
- **cost**: free non-commercial; exact daily call cap not stated on this page (elevation API sibling states 10k/day, likely similar order)
- **data_provided**: Temp, wind, precipitation, cloud cover, pressure, soil temp/moisture, solar radiation; 7-16 day forecast + historical archive (useful for past-event weather)
- **spatial**: Any global lat/lon, auto-selects highest-resolution regional model ('Best Match') — simpler global fallback/cross-check vs IMS's Israel-only stations
- **enrichment_idea**: Use as a no-key fallback/cross-check to IMS (which requires manual key approval) — good for quick prototyping of weather-vs-participation correlation before IMS access is granted
- **dashboard_use**: Tab 6 impact/efficiency; prototyping layer before IMS key arrives
- **israel_coverage**: Global model, includes Israel but not Israel-specialized (no dedicated high-res local model called out); no Hebrew UI (JSON API, non-issue)
- **reliability**: Community/open project aggregating primary national weather models (ECMWF, DWD, etc.); good freshness, but not the Israeli government's own instrument network like IMS

### Open-Meteo Air Quality API  _(area: None)_
- **provider**: Open-Meteo (uses Copernicus CAMS data)
- **access**: https://air-quality-api.open-meteo.com/v1/air-quality?latitude=..&longitude=..
- **auth**: none for non-commercial
- **cost**: free non-commercial, no key
- **data_provided**: Hourly PM10/PM2.5, CO, NO2, SO2, O3, pollen (alder/birch/grass/mugwort/olive/ragweed), dust, ammonia, methane, European+US AQI indices
- **spatial**: Point query by lat/lon; Israel falls under the coarser 45km global CAMS model (Europe gets 11km) — resolution is coarse for city-level precision
- **enrichment_idea**: Cross-reference outdoor-training-day air quality against Sviva's official local monitoring (finer-grained) — use Open-Meteo as a global fallback for areas Sviva doesn't station-cover, Sviva as ground truth where it does
- **dashboard_use**: Tab 6 impact/efficiency; outdoor training scheduling context
- **israel_coverage**: Covered only by coarse 45km global model, not the finer 11km European grid — meaningfully weaker than a dedicated Israeli source
- **reliability**: Community aggregator of primary CAMS model output; not government-official for Israel specifically

### Sviva (Israel Ministry of Environmental Protection) national air monitoring network  _(area: None)_
- **provider**: המשרד להגנת הסביבה (Ministry of Environmental Protection)
- **access**: Public map/portal at air.sviva.gov.il; developer page at sviva.gov.il/.../NationalAirMonitoing/Pages/Developers.aspx returned connection error on fetch — needs manual browser visit to confirm REST endpoints
- **auth**: unknown — not confirmed (fetch failed)
- **cost**: presumably free (government service) — unconfirmed
- **data_provided**: Real-time air pollution index per monitoring station across Israel; also a GovMap layer 'מדד זיהום אוויר בזמן אמת' at govmap.gov.il/?lay=298
- **spatial**: Station-based point network across Israel, denser than global models, has a dedicated GovMap layer
- **enrichment_idea**: If a REST/JSON feed exists behind the Developers page (worth a follow-up fetch with a different method — the connection reset may be transient/blocked bot access), join nearest station to each sports facility for a 'safe-to-train-outdoors' index by locality
- **dashboard_use**: Tab 6 impact/efficiency, tab 2 tik yishuv facility context
- **israel_coverage**: This IS the dedicated Israeli official network — best possible coverage if API confirmed; currently unverified access
- **reliability**: Official/primary government source (highest reliability tier) if the developer API is real; needs a follow-up verification pass (fetch failed with ECONNRESET, may need retry, different UA, or manual browser check)

### Ministry of Health beach/sea water quality monitoring (מי רחצה)  _(area: None)_
- **provider**: משרד הבריאות (Ministry of Health) + local authorities
- **access**: Public map at health.gov.il/Subjects/Environmental_Health/Pages/ShoresMap.aspx; a third-party visualization exists at gosurf.co.il/quality; the gis.health.gov.il/beach-advisory/ endpoint we tried is dead (301 to error page) — site was restructured
- **auth**: unknown — no API found, only a web map + PDF annual reports (sea-shore-2024, sea-shore-2020)
- **cost**: free (government publication), but no structured API confirmed — would require scraping the map or parsing PDF reports
- **data_provided**: Bacterial water quality sampling per beach: Mediterranean, Kinneret, Red Sea; sampled every 2 weeks in bathing season (May-Oct), monthly in winter
- **spatial**: Per-named-beach records — would need geocoding of beach names to lat/lon (candidate for GovMap geocode); no ready-made coordinate API confirmed
- **enrichment_idea**: For water-sports clubs (swimming, sailing, surfing, triathlon) near a specific beach, join contamination/closure history to explain participation dips or safety-flag venues on the tik-yishuv map
- **dashboard_use**: Tab 2 tik yishuv (coastal authorities), tab 6 impact/efficiency for water sports
- **israel_coverage**: Full Israeli coastline (Med, Kinneret, Red Sea), Hebrew-native, official government reporting
- **reliability**: Official/primary but publication-only (web map + annual PDF reports), not a machine-readable API as far as verified — would need scraping or a data.gov.il dataset search as follow-up

### Open-Meteo Marine Weather API  _(area: None)_
- **provider**: Open-Meteo
- **access**: https://marine-api.open-meteo.com/v1/marine?latitude=..&longitude=..
- **auth**: none for non-commercial
- **cost**: free non-commercial (same family as other Open-Meteo APIs)
- **data_provided**: Wave height/direction/period, wind+swell wave components, sea surface temp, ocean currents, sea level/tides
- **spatial**: Point query, Mediterranean covered at 5-9km resolution via European/global wave models (DWD EWAM ~5km, MeteoFrance/ECMWF ~8-9km)
- **enrichment_idea**: For sailing/surfing/open-water-swim clubs geocoded on the coast, pull wave-height/wind history to flag training-day conditions or explain seasonal participation swings; complements (not replaces) Ministry of Health water-quality data for a full 'safe-to-swim' picture
- **dashboard_use**: Tab 6 impact/efficiency for water sports; tab 2 tik yishuv for coastal authorities
- **israel_coverage**: Mediterranean coast covered by global/European wave models at ~5-9km; not Israel-dedicated but usable
- **reliability**: Community aggregator of primary meteorological-agency wave models (DWD, ECMWF, MeteoFrance); not Israel-official

### GovMap Geocoding API (Survey of Israel)  _(area: None)_
- **provider**: Survey of Israel / Israel government mapping portal (govmap.gov.il)
- **access**: govmap.geocode({keyword, type}) JS function, part of api.govmap.gov.il JS SDK; also raw URL-parameter map embedding per api.govmap.gov.il/docs/intro
- **auth**: api-key (token required at map init: token:'YOUR_API_TOKEN') — acquisition process not detailed in docs fetched, likely requires registration with Survey of Israel
- **cost**: not stated in docs fetched — presumed free for government/public use given it's a government portal, needs confirmation
- **data_provided**: Free-text address search -> X/Y coordinates + ResultCode accuracy (1=exact single match, 2=partial single match, 3=multiple/no results with candidate list); also broader layer catalog (parcels, bus stops, gas stations, nature reserves, air quality, trails)
- **spatial**: THE core Israeli geocoder — converts any Hebrew address/place text to coordinates in Israel's own ITM (Israel Transverse Mercator) system, needing conversion to WGS84 lat/lon for standard mapping; exactly the 'exact location' enrichment the priority lens calls for
- **enrichment_idea**: HIGH PRIORITY: batch-geocode every internal sports-org/club/facility address or name-plus-locality through govmap.geocode to get precise X/Y, convert to lat/lon, then join to every other spatial source in this list (IMS nearest-station, elevation, air quality, CBS socio-economic cluster, beach proximity) — this is the foundational join key for the whole spatial-enrichment program, not just environmental context
- **dashboard_use**: Cross-cutting: tab 2 tik yishuv heat maps, tab 3 supported-org card, tab 6 impact/efficiency — anywhere a lat/lon is needed for an internal record
- **israel_coverage**: Best possible — this is Israel's own official national geocoder/mapping authority, full Hebrew address support
- **reliability**: Official/primary (Survey of Israel government authority); token-gated so not fully open — registration process needs follow-up; docs are Hebrew-primary

### Israel Nature and Parks Authority trail/reserve data (רשות הטבע והגנים)  _(area: None)_
- **provider**: רשות הטבע והגנים (Israel Nature and Parks Authority)
- **access**: Web-only trail search at parks.org.il and a dedicated GovMap layer (govmap.gov.il/?lay=150 sites, ?lay=390 trails/maslulim) — no standalone documented REST API found in this pass
- **auth**: unknown — likely same GovMap token mechanism if accessed via GovMap API layers
- **cost**: free (government), access mechanism unconfirmed
- **data_provided**: Nature reserves, national parks, marked hiking/cycling trails with search criteria (water sources, caves, archaeological sites, wildlife)
- **spatial**: Rich spatial layer of trail geometries and reserve boundaries already on GovMap — could locate outdoor-sport (hiking/trail-running/cycling) venues relative to clubs
- **enrichment_idea**: For trail-running/hiking/cycling federations, compute distance-to-nearest-trail or reserve for each geocoded club to contextualize outdoor training access — needs a follow-up pass to confirm if data.gov.il hosts this as a downloadable dataset (CKAN) rather than only a map layer
- **dashboard_use**: Tab 2 tik yishuv, tab 6 impact/efficiency for outdoor/trail sports
- **israel_coverage**: Full Israel, official authority, Hebrew-native
- **reliability**: Official/primary but API existence unconfirmed this pass — flagged for deeper dive (check data.gov.il CKAN catalog directly for a 'רשות הטבע והגנים' or 'שבילים' dataset)

### Google Knowledge Graph Search API  _(area: None)_
- **provider**: Google (Google Cloud / Google for Developers)
- **access**: GET https://kgsearch.googleapis.com/v1/entities:search?query=...&key=API_KEY (live-tested, endpoint responds)
- **auth**: api-key — standard Google Cloud API key from console.cloud.google.com, no OAuth needed
- **cost**: Free within standard Google Cloud API quota (no published per-call price for this endpoint; low-volume lookups effectively free)
- **data_provided**: JSON-LD entity: name, description, image, official website URL, entity type, relevance score, Wikipedia/Freebase-derived detailedDescription
- **spatial**: none directly (no coordinates field) — but returned website URL is a jump-off point for geocoding via other APIs
- **enrichment_idea**: Query each club/federation's official Hebrew name -> get canonical name variants, description, and website URL to seed the geocoding pipeline and detect if Google itself 'knows' the org (existence = baseline digital-footprint signal)
- **dashboard_use**: Supported-organization card (tab 3) — 'digital presence' badge / website link; Impact&Efficiency as a cheap vitality flag
- **israel_coverage**: Partial — large national federations likely indexed; small local אגודות probably absent from KG. Hebrew query support confirmed via languages=he param
- **reliability**: Official/primary Google source; freshness tied to Google's web crawl+Wikidata sync, no fixed cadence; ToS allows caching per Google Cloud terms but re-verify before bulk storage

### Wikidata (SPARQL Query Service + REST API)  _(area: None)_
- **provider**: Wikimedia Foundation / Wikidata community
- **access**: https://query.wikidata.org/sparql (SPARQL GET/POST) and MediaWiki wbsearchentities API for name lookup
- **auth**: none for read queries (anonymous), rate-limited — hit HTTP 429 in our own test, so a User-Agent + backoff/caching layer is required for production use
- **cost**: free, open data (CC0)
- **data_provided**: Structured entity graph: P31/P279 (instance/subclass of 'sports club'/'sports organization'), P17 (country), P625 (coordinate location), P856 (official website), P2013 (Facebook), P2003 (Instagram), P1128 (employees/members)
- **spatial**: YES — P625 gives lat/lon directly (WGS84) for any club/venue that has a Wikidata item; can SPARQL-filter P17=Israel + P31/P279*=sports club/venue and pull coords+website in one query
- **enrichment_idea**: Fuzzy-match internal club/federation names to Wikidata labels (he/en aliases) to pull P625 coordinates + P856 website + P2013/P2003 social links in one shot — a free geocoding+social-handle bootstrap for the subset of orgs notable enough to have a Wikidata item (major federations, historic clubs, stadiums)
- **dashboard_use**: תיק יישוב (tab 2) heat map seed points; Supported-org card (tab 3) website/social badges
- **israel_coverage**: Good for major national federations/clubs/stadiums (well-documented internationally via sports Wikipedia articles); weak/near-zero for small local אגודות or municipal youth clubs
- **reliability**: Official/primary but crowd-edited — treat as community-verified not authoritative; freshness varies per item (some stale for years); public endpoint enforces query timeouts (~60s) and IP rate limits, so production use needs a mirrored/local SPARQL endpoint or the paginated REST API for scale

### Google Places API (New) — Text Search / Place Details  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: POST https://places.googleapis.com/v1/places:searchText and /v1/places/{place_id} (Place Details)
- **auth**: api-key — Google Cloud project with Places API enabled + billing account required
- **cost**: Free thresholds: 10,000/mo Essentials, 5,000/mo Pro, 1,000/mo Enterprise SKUs; then Text Search Pro $32/1000, Enterprise (adds rating/hours/phone/website) $35/1000, Enterprise+Atmosphere (reviews) $40/1000
- **data_provided**: displayName, formattedAddress, location(lat/lng), types, photos (Pro); + rating, userRatingCount, openingHours, phoneNumber, websiteUri, priceLevel (Enterprise tier)
- **spatial**: YES — direct lat/lng per matched place, plus can search 'sports club near <lat,lng>' for nearby-facility cross-referencing
- **enrichment_idea**: Text-search each internal club/agudah name -> get exact coordinates + Google rating + review count + website in one call. rating+userRatingCount doubles as a crude 'public engagement/reputation' proxy, complementing the assigned web/social-presence angle while nailing the spatial priority in the same query
- **dashboard_use**: תיק יישוב heat map (tab 2) — precise club/facility pins; Supported-org card (tab 3) — 'public rating' + website chip
- **israel_coverage**: Strong — Google Maps has broad Israeli POI/business coverage incl. Hebrew names; smaller informal clubs may still be unlisted
- **reliability**: Official/primary, near-real-time freshness (crowd+business-owner updated); ToS: caching of Place IDs/coordinates allowed for limited periods per Google Maps Platform terms — re-check current caching policy before persisting long-term (used to be a 30-day cache limit, may have changed)

### Google Geocoding API  _(area: None)_
- **provider**: Google (Google Maps Platform) | Google (Google Maps Platform, part of Google Cloud)
- **access**: GET https://maps.googleapis.com/maps/api/geocode/json?address=...&key=API_KEY | REST: GET https://maps.googleapis.com/maps/api/geocode/json?address=...&key=API_KEY (also XML output); client libs for Java/Python/Go/Node under Apache 2.0
- **auth**: api-key, billing account required | api-key: Google Cloud project API key, billing account required (credit card on file) even to use free tier
- **cost**: $5 per 1,000 requests — cheapest Google option for pure address-to-coordinate conversion (vs Places Text Search $32-40/1000) | $5.00 per 1,000 requests after free allowance; 10,000 free calls/month for this SKU (Essentials tier free-per-SKU model, effective since Mar 2025, replacing the old flat $200 credit)
- **data_provided**: lat/lng, formatted address, address components (city/street/postal code), place_id, location_type (precision indicator) | lat/lng, place_id, formatted_address, structured address_components (street, city, postal code, country), address 'types', partial-match flag, viewport bounds
- **spatial**: YES — this IS the geocoder; use for bulk address->coordinate conversion of internal records that already have street addresses but no lat/lng | Core geocoding (address->lat/lng) and reverse geocoding (lat/lng->address); supports region-biasing (bounds/region/components params) to prefer Israel results and reduce mismatches for Hebrew addresses
- **enrichment_idea**: Batch-geocode every internal club/agudah address once, cache lat/lng in the DWH (cheaper than repeated Places lookups), then join to CBS statistical-area polygons for socio-economic/catchment-population context | Batch-geocode every internal org/club/federation record's free-text Hebrew address (or facility name) to lat/lng + place_id; use region=IL/components=country:IL biasing; then join to CBS statistical-area polygons and other internal geo layers (tiק יישוב heat maps, catchment population) using the returned coordinates
- **dashboard_use**: תיק יישוב heat map (tab 2); Impact&Efficiency catchment-population calc (tab 6) | Tab 2 (תיק יישוב heat maps/facility mapping) and Tab 6 (impact/efficiency: catchment population per facility) — foundational geocoding layer feeding map visuals
- **israel_coverage**: Strong for street-level Israeli addresses; Hebrew input supported | Good — Hebrew listed as a supported language/locale on the docs; region-biasing to IL supported; real-world accuracy for Israeli street addresses is generally solid but rural/Arabic-named streets and new construction can be weaker (not independently benchmarked here)
- **reliability**: Official/primary, frequently updated; standard Google Maps Platform ToS applies to storage of results — verify current caching/storage clause before long-term persistence | Official/primary Google product, continuously updated. STRICT ToS: raw lat/lng may only be cached temporarily for 30 consecutive calendar days (then must delete), OR cached indefinitely only to support direct end-user-facing app functionality with per-end-user data isolation (cannot be used as a shared internal DB replacement / cannot skip re-calling the API). place_id is the one field explicitly cacheable indefinitely with no restriction. This matters a lot for a BI dashboard that wants a permanent internal lat/lng table — as written the ToS does not clearly permit that use case; legal review recommended before treating geocoded coordinates as a permanent internal dataset.

### GovMap API (Survey of Israel / מפ״י)  _(area: None)_
- **provider**: Survey of Israel (המרכז למיפוי ישראל), government of Israel
- **access**: api.govmap.gov.il — JS functions, URL-param embeds, and an 'advanced search' (geocode) function per api.govmap.gov.il/docs/javascript-functions/geocode
- **auth**: account-required — no auth on the intro docs page itself, but access requests go through govmap@survey.gov.il or portal registration; likely a token issued after approval
- **cost**: not published — government service, plausibly free for public-sector/internal government use (this IS a ministry dashboard, so worth a direct email to govmap@survey.gov.il)
- **data_provided**: Address geocoding + ~340 official GIS layers: cadastral/property boundaries, zoning/planning, infrastructure, cellular antennas, roads, utilities, public institutions — includes a 'מתקני ספורט' (sports facilities) map layer (lay=400)
- **spatial**: YES — the most authoritative Israeli geocoder + a huge official layer catalogue (zoning, socio-economic overlays, facility layers) for real spatial-context enrichment, not just point coordinates
- **enrichment_idea**: Best-in-class geocoder for Israeli addresses (built for exactly this kind of government use case); overlay internal club/facility coordinates onto GovMap's zoning/planning and socio-economic layers to auto-derive 'area type' and accessibility context per club — direct hit on the priority spatial-context goal
- **dashboard_use**: תיק יישוב heat map (tab 2) as the primary basemap/geocoder; Impact&Efficiency (tab 6) area-context overlays
- **israel_coverage**: Best possible — it IS the Israeli government's own mapping system, full Hebrew support (note: docs say non-Hebrew/ASCII fields need URL-encoding, so integration needs care)
- **reliability**: Official/primary, government-maintained; as a fellow government body the ministry may get privileged/free access — worth a direct inter-agency request rather than treating as a generic external API

### Nominatim (OpenStreetMap)  _(area: None)_
- **provider**: OpenStreetMap Foundation (community-run public instance)
- **access**: https://nominatim.openstreetmap.org/search?q=...&format=json
- **auth**: none required, but must send a valid HTTP Referer or descriptive User-Agent
- **cost**: free on the public instance, hard-capped at 1 request/second, no bulk/systematic queries allowed — for real production volume must self-host Nominatim (free software, own server cost) or use a paid host like Geoapify
- **data_provided**: lat/lon, display_name, address breakdown, OSM place type/importance
- **spatial**: YES — free fallback/cross-check geocoder against Google/GovMap results
- **enrichment_idea**: Use as a free secondary geocoder to sanity-check GovMap/Google results and fill gaps for free during prototyping, before committing budget to a paid geocoder for the full production run
- **dashboard_use**: תיק יישוב heat map (tab 2) — prototyping/backup geocoder
- **israel_coverage**: Variable — depends on OSM community mapping density in Israel; major roads/settlements good, small facility-level POIs inconsistent
- **reliability**: Community-maintained, ODbL license requires attribution; public instance has no uptime/performance guarantee and explicitly discourages 'serious business usage' — not suitable as sole production geocoder for a government dashboard

### data.gov.il Sports Facilities Dataset (מתקני ספורט בישראל)  _(area: None)_
- **provider**: data.gov.il (Israeli government open-data portal, CKAN), dataset 408
- **access**: CKAN datastore_search API: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d (JSON, paginated); also raw CSV/XLSX download at data.gov.il/dataset/408
- **auth**: none — same open CKAN pattern already used for moj-amutot
- **cost**: free, license 'Other (Open)'
- **data_provided**: ~6,500 rows x 26 fields: local authority, settlement, facility ID, facility type, facility name, neighborhood, street, house number, ITM coordinates (ציר X / ציר Y), status, operating body, owner, accessibility, parking, lighting, seating capacity, international-competition suitability, year built
- **spatial**: YES — direct ITM (Israel Transverse Mercator, EPSG:2039) X/Y grid coordinates per facility; needs a coordinate-system conversion (ITM->WGS84, a standard/solved transform) to plot on lat/lng maps
- **enrichment_idea**: Fuzzy-match this dataset's facility name/operator/settlement to the office's internal club/federation records by name+city — instantly gets exact coordinates, capacity, accessibility, and 'operating body' for a huge share of records with zero paid API calls, since it's a government facilities census overlapping directly with the office's own domain
- **dashboard_use**: תיק יישוב heat map + athletes-per-branch (tab 2) — primary facility layer; Impact&Efficiency (tab 6) facility-density vs participation
- **israel_coverage**: Full — this IS an Israel-only government census, Hebrew native
- **reliability**: Official/primary government dataset, but last updated 2021 per the portal metadata — stale, verify current freshness before relying on facility status/ownership fields; consider it a strong one-time enrichment pass rather than a live feed

### Facebook Graph API — Page Public Content Access  _(area: None)_
- **provider**: Meta
- **access**: https://graph.facebook.com/{page-id}?fields=... (Graph API v25.0, current as of the search)
- **auth**: account-required + heavy gate: Meta developer account, app creation, Page Public Content Access permission, App Review (use-case + screencast), Business Verification, then a system-user access token — NOT a quick-start API
- **cost**: free (no per-call pricing), but the App Review + Business Verification process is the real cost — expect weeks of approval lead time
- **data_provided**: page posts, comments, reaction breakdown (like/love/haha/wow/care), follower count, category, engagement metrics, media URLs, timestamps; Page object itself also exposes a 'location' field (street/city/lat-lng) when the page owner filled it in
- **spatial**: partial — Page 'location' field can carry lat/lng if the club filled its FB Page address, otherwise none
- **enrichment_idea**: For clubs with a known FB Page URL, pull follower_count + posting cadence (post timestamps) as a 'digital vitality' score; cross-check the Page's self-reported location against the office's internal address to flag data-quality mismatches
- **dashboard_use**: Supported-org card (tab 3) — 'digital vitality' sub-metric alongside financial dependence-on-support metric
- **israel_coverage**: Very good — Facebook Pages are the dominant social channel for Israeli local clubs/עמותות, likely better coverage than Instagram for smaller/older organizations
- **reliability**: Official/primary, but access-gated and policy-fragile (Meta periodically tightens Page Public Content Access review); ToS restricts storing certain data long-term and requires periodic re-consent/re-review — budget ongoing compliance overhead, not a set-and-forget integration

### Instagram Graph API — Business Discovery  _(area: None)_
- **provider**: Meta
- **access**: GET /{ig-user-id}?fields=business_discovery.username({target}){followers_count,media_count,biography,website,username}
- **auth**: account-required — the QUERYING account must itself be an Instagram Business/Creator account linked to a Facebook Page + app permissions/App Review, even though the TARGET account just needs to be public
- **cost**: free (subject to standard Graph API rate limits)
- **data_provided**: followers_count, follows_count, media_count, biography, website, name, username, profile_picture_url — count only, no follower list
- **spatial**: none directly, but 'website' field is another jump-off point for geocoding
- **enrichment_idea**: For clubs/federations with a known public IG business handle, pull followers_count as a lightweight 'reach' proxy and biography/website for cross-validation against the office's registered contact info
- **dashboard_use**: Supported-org card (tab 3) digital-vitality sub-metric
- **israel_coverage**: Good for younger/urban clubs and elite athletes/federations; weaker for smaller local אגודות that skew toward Facebook or no social presence at all
- **reliability**: Official/primary but has the same access-gate friction as Facebook Graph API (needs an owned Business/Creator IG account to even call it) — practically requires the ministry to set up its own IG Business account first just to use this endpoint

### SerpApi (Google Search / Google Maps engines)  _(area: None)_
- **provider**: SerpApi LLC (third-party commercial scraper of Google SERPs)
- **access**: https://serpapi.com/search?engine=google_maps or engine=google (REST, JSON)
- **auth**: api-key, account required (sign up at serpapi.com)
- **cost**: 100 free searches/mo trial; Starter $25/mo=1,000 searches; up to Big Data $275/mo=30,000 searches; Enterprise from $3,750/mo
- **data_provided**: Parsed Google Maps 'local pack' results: name, address, coordinates, rating, review count, category, phone, website, opening hours — essentially Google Places data without needing a Google Cloud billing account
- **spatial**: YES — google_maps engine returns coordinates per result, same as Places API but via scraping rather than official API
- **enrichment_idea**: Cheaper/simpler alternative to standing up a Google Cloud Places API billing account for small pilot batches — search each club name via engine=google_maps to get address+coords+rating+website in one parsed call
- **dashboard_use**: תיק יישוב heat map (tab 2), Supported-org card (tab 3) as a Places-API substitute
- **israel_coverage**: Same as underlying Google Maps coverage — strong, since it's just a parsed proxy of Google's own results
- **reliability**: Commercial third-party, not official Google product — scraping-based means it can break when Google changes SERP layout; a government dashboard may prefer the official Places API despite higher setup friction, for ToS-cleanliness and long-term stability

### Foursquare Places API  _(area: None)_
- **provider**: Foursquare Labs
- **access**: docs.foursquare.com/developer/reference — Search, Nearby, Venue Details endpoints
- **auth**: api-key, account required
- **cost**: free tier: 10,000 Pro-endpoint calls/mo; beyond that $15 CPM; Premium fields (photos/tips/hours/ratings) have no free tier, from $18.75/1000
- **data_provided**: 100M+ global POIs incl. category, address, coordinates; Premium tier adds hours/photos/ratings/tips
- **spatial**: YES — POI search with coordinates, nearby-venue search by lat/lng radius
- **enrichment_idea**: Secondary/cross-check POI source for sports venues, and useful for 'nearby facilities' catchment analysis (e.g. how many other sports POIs within 2km of a club) independent of Google's ecosystem
- **dashboard_use**: תיק יישוב (tab 2) nearby-facility density analysis
- **israel_coverage**: Global coverage claimed (200+ countries) but POI density in Israel for niche sports clubs likely thinner than Google Maps — not verified directly
- **reliability**: Commercial, official Foursquare product; update cadence not specified in search results

### BuiltWith API  _(area: None)_
- **provider**: BuiltWith Pty Ltd
- **access**: api.builtwith.com — domain-based technology lookup, free-api endpoint available
- **auth**: api-key, free tier available (api.builtwith.com/free-api)
- **cost**: free tier 1 req/sec, limited fields (tech-group counts + last-updated only); paid from ~$295/mo Basic, ~2,000 calls/$100 add-on credits
- **data_provided**: detected web technologies (CMS, analytics, hosting, ads) per domain, plus 'last detected'/'last updated' timestamps for tech additions/removals
- **spatial**: none
- **enrichment_idea**: For clubs that DO have a website, use BuiltWith's 'last updated' technology-change timestamp as a rough freshness/maintenance-activity proxy — a site whose stack hasn't changed in 5 years vs one actively maintained (new analytics/CMS added) signals different levels of organizational digital investment. Niche use, free tier likely enough given small org count
- **dashboard_use**: Supported-org card (tab 3) digital-vitality sub-metric (secondary, low priority)
- **israel_coverage**: global tool, no Israel-specific gap expected (works on any domain)
- **reliability**: Commercial, established product; free tier too thin for real dashboard use, paid tier expensive relative to likely value for this use case

### Similarweb API  _(area: None)_
- **provider**: Similarweb Ltd (Israeli company, coincidentally)
- **access**: docs.similarweb.com/api-v5 — Web Intelligence / Digital Rank endpoints
- **auth**: account-required, Enterprise sales contract
- **cost**: no free API tier; API bundled only with Enterprise/custom contracts, estimated $500-10,000+/mo, credit-based per-endpoint pricing
- **data_provided**: website traffic estimates, engagement (visit duration, bounce rate, pages/visit), traffic sources, audience overlap/competitors
- **spatial**: none directly (traffic-by-country breakdown exists but not facility-level)
- **enrichment_idea**: Traffic-volume proxy for organizational digital reach — but cost is almost certainly disproportionate to the value for a nonprofit-sports-club dataset; flag as low priority / probably skip
- **dashboard_use**: not recommended given cost — would only touch tab 3 digital-vitality metric
- **israel_coverage**: good — Israeli company, strong global+local web coverage
- **reliability**: Official/primary commercial data vendor, monthly-updated estimates (not exact, statistically modeled traffic) — enterprise pricing makes this a poor fit for this project's likely budget

### Google Custom Search JSON API  _(area: None)_
- **provider**: Google
- **access**: https://www.googleapis.com/customsearch/v1 — CAUTION: closed to new customers
- **auth**: api-key + Programmable Search Engine ID — but not available for NEW sign-ups; existing customers only, must migrate off by Jan 1 2027
- **cost**: 100 free queries/day, then $5/1000 up to 10k/day — moot since new customers can't sign up
- **data_provided**: web search results (title, snippet, URL) — would have been useful for 'find the official website of club X'
- **spatial**: none
- **enrichment_idea**: DEAD END for new integrations — do not plan around this. Google recommends Vertex AI Search as replacement, which is enterprise-tier and heavier than needed here. Alternative: just use Knowledge Graph Search API + Wikidata for website discovery instead
- **dashboard_use**: n/a — not usable for a new project
- **israel_coverage**: n/a
- **reliability**: official but being sunset for new customers — avoid building on this

### Bing/Azure Entity Search API  _(area: None)_
- **provider**: Microsoft (Azure Cognitive Services)
- **access**: n/a — fully retired
- **auth**: n/a
- **cost**: n/a — service decommissioned entirely on Aug 11 2025
- **data_provided**: n/a
- **spatial**: none
- **enrichment_idea**: DEAD END — do not plan around Bing search-family APIs. Replacement 'Grounding with Bing Search' is $35/1000 queries, an LLM-grounding product not a direct SERP JSON API, and 40-483% pricier than the old tiers
- **dashboard_use**: n/a
- **israel_coverage**: n/a
- **reliability**: n/a — retired product

### Clearbit Enrichment API  _(area: None)_
- **provider**: Clearbit (acquired by HubSpot, Dec 2023)
- **access**: standalone API/free tier/logo API all sunset — folded into HubSpot Breeze, logo API sunset Dec 1 2025
- **auth**: n/a standalone — would require a HubSpot subscription now
- **cost**: no free tier anymore (removed Apr 30 2025)
- **data_provided**: n/a for this project — was company firmographic enrichment by domain/email
- **spatial**: none (was HQ address at best)
- **enrichment_idea**: DEAD END as a standalone tool, and even historically was US/B2B-SaaS-focused with weak Israeli-nonprofit coverage. Do not pursue; see suggest[] for commercial alternatives if B2B-style enrichment is ever wanted
- **dashboard_use**: n/a
- **israel_coverage**: was weak even before shutdown — global B2B-SaaS-oriented dataset, not built for small Israeli nonprofits
- **reliability**: n/a — product effectively discontinued for this use case

### OpenCorporates API  _(area: None)_
- **provider**: OpenCorporates Ltd
- **access**: api.opencorporates.com
- **auth**: api-key, account required; usage limits vary by plan
- **cost**: tiered paid plans, see opencorporates.com/pricing (specific numbers not retrieved)
- **data_provided**: ~360,000 Israeli companies (Israel Corporations Authority registry, synced weekly from Israel's Open Data portal) incl. directors/officers, filings, status
- **spatial**: none confirmed (registered address text only, not geocoded)
- **enrichment_idea**: Mostly redundant with the already-used moj-amutot CKAN source for nonprofits; possible marginal value is cross-referencing a club's FOR-PROFIT affiliated entities (e.g. a club's commercial arm/sponsor company) which moj-amutot (nonprofit-only) wouldn't surface
- **dashboard_use**: Supported-org card (tab 3) — secondary/edge-case governance cross-check
- **israel_coverage**: confirmed present (Israel Corporations Authority registry), but nonprofit-specific (עמותות) coverage vs the for-profit company registry not verified — may only cover חברות not עמותות
- **reliability**: Community/open-data aggregator (not the primary government source itself — data.gov.il/moj-amutot remains more authoritative for Israeli nonprofits specifically)

### CBS Residents by Locality & Age Groups (data.gov.il CKAN)  _(area: None)_
- **provider**: Israel Central Bureau of Statistics (למ"ס), published via data.gov.il portal
- **access**: CKAN datastore_search API: https://data.gov.il/api/3/action/datastore_search?resource_id=64edd0ee-3d5d-43ce-8562-c336c24dbc1f (or datastore_search_sql for filtering); also raw CSV download
- **auth**: none — public CKAN API, no key required
- **cost**: free, no quota observed (standard CKAN, default limit 100/req but resource is small, ~1300 localities)
- **data_provided**: Per locality: סמל_ישוב (locality code), שם_ישוב (name), נפה/district, לשכת_מנא (labor office), מועצה_אזורית (regional council if applicable), total pop (סה"כ), and 6 age bands: 0-5, 6-18, 19-45, 46-55, 56-64, 65+. No gender split.
- **spatial**: Locality code (סמל ישוב) is the standard CBS geographic key — joins directly to CBS geo-layers, GovMap layers, and any dataset keyed by locality code. No coordinates itself.
- **enrichment_idea**: Join office's internal club/federation records (once geocoded to locality) on סמל_ישוב to compute participation-rate = athletes/branch ÷ local youth population (age 6-18 band) per locality — direct feed for the Impact & Efficiency tab and תיק יישוב per-capita views.
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps/per-capita, Tab 6 (Impact & Efficiency) participation-rate vs population, Tab 4 gender view (age denominator only, gender needs separate source)
- **israel_coverage**: full Israel, all ~1300 localities incl. unregistered/small settlements bucketed; Hebrew field names/values
- **reliability**: Official primary source (CBS via data.gov.il). Actively maintained — resource updated 2026-07-12 (weekly cadence per dataset metadata), 22 historical snapshot resources back to 2019. No gender breakdown is the main limitation.

### CBS 2022 Census Interactive Dashboard  _(area: None)_
- **provider**: Israel Central Bureau of Statistics
- **access**: https://census.cbs.gov.il/en (also /he) — per-geography query UI, e.g. https://census.cbs.gov.il/en/geographic-area?id=1fd1aec&tabName=Population+characteristics ; offers PDF/CSV export per query. No documented bulk REST API found in this pass.
- **auth**: none — public web tool
- **cost**: free
- **data_provided**: Population characteristics (incl. age, gender per site description) queryable at national / district / sub-district / natural area / metropolitan area / cluster of local authorities / municipal status / locality / quarter / sub-quarter / statistical-area levels — the finest official geographic granularity available for census data.
- **spatial**: Strong — drills down to statistical sub-quarter (intra-city) level, far finer than locality. Best available granularity for within-city heat maps.
- **enrichment_idea**: Once internal club addresses are geocoded to lat/lng, snap to CBS statistical-area polygon (via the GIS layer, see below) and pull that area's exact age/gender population as the true local catchment for the club — far more precise than city-level denominators.
- **dashboard_use**: Tab 2 (תיק יישוב) intra-city heat maps, Tab 6 impact/efficiency at sub-locality resolution
- **israel_coverage**: full Israel, official 2022 census, Hebrew+English UI
- **reliability**: Official primary, most authoritative population source (full census, not estimate). Freshness: 2022 census snapshot (not updated in real time). No confirmed bulk API — likely requires manual/scripted per-geography export or a follow-up call to CBS info@cbs.gov.il for bulk file.

### CBS Time Series API (apis.cbs.gov.il/series)  _(area: None)_
- **provider**: Israel Central Bureau of Statistics
- **access**: https://apis.cbs.gov.il/series/catalog/level, /series/catalog/path, /series/data/list, /series/data/path. Example: https://apis.cbs.gov.il/series/data/list?id=3763&startperiod=01-2000&endperiod=12-2019&format=xml&download=false&lang=en
- **auth**: none documented, but User-Agent header is mandatory on all CBS API queries per CBS API interface page
- **cost**: free; pagination max 1000 rows/page
- **data_provided**: National/district-level time series across population, economy, health etc — indicator series by code, not a locality-level cross-tab. Good for national/district trend KPI cards, not spatial joins.
- **spatial**: none (or coarse district-level only) — not the right tool for locality-level maps
- **enrichment_idea**: Use for a national trendline KPI ('national youth population growth') as context alongside the locality-level maps, not for the spatial join itself.
- **dashboard_use**: Tab 4/6 trend KPI cards (national context)
- **israel_coverage**: full Israel, Hebrew+English (lang param)
- **reliability**: Official primary CBS source; SDMX-standard sibling API also available for interoperable metadata

### CBS Statistical-Area GIS Layers (geo-layers)  _(area: None)_
- **provider**: Israel Central Bureau of Statistics
- **access**: Direct ZIP/GDB downloads e.g. /he/Documents/statisticalareas_2020_demography.gdb.zip (catalog #50502י, demography year 2020); older years 2017-2019 also archived at cbs.gov.il/he/Documents/שכבות גיאוגרפיות/
- **auth**: none — direct public download
- **cost**: free
- **data_provided**: Polygon boundaries of CBS statistical areas (2011 definition, sub-city granularity) bundled with demographic attributes for that year (population counts). Format is a File Geodatabase (.gdb) inside a zip — needs GIS tooling (GDAL/ArcPy/geopandas) to read.
- **spatial**: Core spatial asset: actual polygon geometries for statistical areas (intra-city granularity), the geographic key needed for point-in-polygon joins once club addresses are geocoded to lat/lng.
- **enrichment_idea**: Geocode each internal club/facility address (via GovMap or a commercial geocoder) to lat/lng, then point-in-polygon against this statistical-area layer to attach the exact local catchment population, and render true choropleth heat maps under clubs/facilities rather than city-level shading.
- **dashboard_use**: Tab 2 (תיק יישוב) heat maps — the actual polygon layer the QuickSight map visual would render underneath points
- **israel_coverage**: full Israel, official CBS boundary definitions
- **reliability**: Official primary. Caveat: layers are static annual snapshots (latest found dated demography-2020, i.e. stale relative to 2026); boundary geometry itself (2011 definition) is more stable than the attached demographic attributes — prefer re-joining fresh population numbers from the CKAN table rather than trusting the bundled 2017-2020 counts.

### Settlement Names with Coordinates (שמות יישובים עם קואורדינטות)  _(area: None)_
- **provider**: Listed as 'Systematics Data Admin', republished on IsraelData ArcGIS Hub open-data portal
- **access**: ArcGIS REST FeatureServer: https://services8.arcgis.com/JcXY3lLZni6BK4El/arcgis/rest/services/CITY/FeatureServer/0 (standard Esri REST query API — supports GeoJSON/JSON output via ?f=geojson&where=1=1&outFields=*)
- **auth**: none — public ArcGIS Hub feature service
- **cost**: free
- **data_provided**: 1,240 Israeli settlement records with names and coordinates (ITM — Israel Transverse Mercator projection tagged in metadata)
- **spatial**: Direct locality-name-to-point-coordinate lookup — cheapest possible first-pass geocode: if internal org records only have a locality/city name (no street address), this instantly gives a usable lat/lng centroid with zero geocoding cost.
- **enrichment_idea**: For every supported org/club/federation record with only a locality name, do a straight string-match join to get an instant centroid point for map placement (fallback tier before investing in full street-address geocoding via GovMap for higher precision).
- **dashboard_use**: Tab 2/3/4 map visuals — quick locality-centroid pins for any record lacking exact address
- **israel_coverage**: full Israel, 1,240 settlements, Hebrew names
- **reliability**: Community/secondary republish (not CBS-branded directly), custom license, last substantive update 2018 (metadata refreshed 2019) — treat as STALE for any newly-established locality since; verify locality list against the fresher CBS CKAN table (locality codes) before relying on it as source of truth.

### New Olim (Immigrants) by Absorbing Locality  _(area: None)_
- **provider**: Ministry of Immigrant Absorption (משרד העלייה והקליטה), via data.gov.il
- **access**: CKAN datastore, resource_id d735ad06-8bde-41aa-8350-a15a36bac18f (2014-2023 snapshot) and 98f17aed-8f6a-49a0-94e6-0338cdf99365 (2009-2018); e.g. https://data.gov.il/api/3/action/datastore_search?resource_id=d735ad06-8bde-41aa-8350-a15a36bac18f
- **auth**: none — public CKAN API
- **cost**: free
- **data_provided**: Per locality (yeshuv, yeshuv_code): total olim (amount), breakdown by origin country (f_ussr, ethiopia, india, france, usa, argentina, britain, other), num_of_residents, olim_percent, regional_council, region, office.
- **spatial**: Keyed by yeshuv_code — same CBS locality code system, directly joinable to all other locality-keyed sources here
- **enrichment_idea**: Overlay olim_percent per locality on the gender/participation map to flag localities with high immigrant concentration (e.g. Ethiopian, ex-USSR) where sports-program outreach or targeted support-test criteria might need adjustment — a minorities/equity lens for Tab 4 and Tab 6.
- **dashboard_use**: Tab 4 (ביצועים ומגדר) equity breakdown, Tab 6 impact/efficiency context filter
- **israel_coverage**: full Israel, all absorbing localities, Hebrew source (transliterated field names)
- **reliability**: Official primary (Ministry of Immigrant Absorption). Latest resource covers 2014-2023, last modified 2024-03-12 — reasonably fresh but not live/real-time; a separate 'new-olim-by-years' dataset exists for national yearly trend.

### CBS Socio-Economic Cluster / Index by Locality  _(area: None)_
- **provider**: Israel Central Bureau of Statistics, published via data.gov.il by the Government CIO office
- **access**: CKAN dataset id df3b0e8d-b76a-4186-a6e1-df8eada5ef27 ('אשכול כלכלי חברתי'), CSV resource 7c860e04-9f8d-41c2-9f24-6249958d2081, datastore active; underlying CBS also publishes official PDF tables per year e.g. https://www.cbs.gov.il/he/mediarelease/doclib/2024/230/24_24_230t1.pdf
- **auth**: none
- **cost**: free
- **data_provided**: Per locality: socio-economic decile (1-10) and cluster ranking, computed from 14 variables (demographic composition, education, standard of living, employment, pensions). CKAN resource is for 2019 data year.
- **spatial**: Locality-keyed (same code system) plus CBS also publishes statistical-area-level socio-economic index for large cities — pairs with the GIS statistical-area layer for intra-city socio-economic heat maps
- **enrichment_idea**: Join socio-economic decile onto every locality/org record to compute 'budget per capita adjusted for socio-economic need' — flags localities receiving disproportionately low support relative to both population AND economic disadvantage, sharpening the Impact & Efficiency tab beyond a flat per-capita ratio.
- **dashboard_use**: Tab 6 (Impact & Efficiency) — need-adjusted budget efficiency metric; Tab 2 תיק יישוב context
- **israel_coverage**: full Israel, all local authorities officially ranked by CBS
- **reliability**: Official primary (CBS methodology). CAVEAT: CKAN copy is 2019 vintage (last modified 2023-10-14); CBS itself has since published a newer 2021 index (PDF only, at cbs.gov.il/he/mediarelease/...230...) — recommend sourcing the freshest year from CBS media-release PDFs rather than the CKAN mirror if currency matters.

### Google Places API (New) - Text Search  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: POST https://places.googleapis.com/v1/places:searchText with JSON body {textQuery, ...}; response fields controlled via X-Goog-FieldMask header
- **auth**: api-key: X-Goog-Api-Key header, same GCP project/billing setup as Geocoding
- **cost**: Pro SKU (name/address/location/types/photos/hours): $32.00 per 1,000 requests, 5,000 free/month. Essentials ID-Only SKU (place_id/name/attributions only): cheaper, ~$5/1,000-tier bracket per pricing page. Enterprise SKU (ratings/contacts/pricing/specialty data): higher tier.
- **data_provided**: place_id, display name, formatted address, lat/lng, viewport, place types, business status, opening hours, phone, website, rating, review count/summaries, photos, accessibility info, EV-charging/transit details for relevant types
- **spatial**: Free-text query (e.g. 'מרכז ספורט הפועל תל אביב') returns ranked matching places with coordinates — good for resolving fuzzy/incomplete internal org names into an exact location + canonical place_id when a structured address is missing
- **enrichment_idea**: For internal club/facility records that only have a name (not a clean address), run Text Search with 'org name + city' in Hebrew to resolve a place_id + coordinates + category + open/closed status; flag orgs where no confident match is found as a data-quality gap for the office to chase manually
- **dashboard_use**: Tab 3 (גוף נתמך card — verify org is a real, currently-operating place with an address) and Tab 2 (תיק יישוב facility mapping)
- **israel_coverage**: Hebrew (עברית) is an explicitly listed supported languageCode; coverage of Israeli businesses/facilities depends on Google's crowd-sourced Places database density, generally strong in cities, weaker for small/informal sports clubs that may not have a Google Business listing at all
- **reliability**: Official/primary; Places data (hours, ratings, photos) refreshed by Google on its own crowd-sourced cadence, not controlled by caller. ToS: lat/lng from Places API same 30-day temp-cache / limited-indefinite-cache rule as Geocoding; place_id (Google ID) cacheable indefinitely. Other place fields (name, rating, hours, photos) are NOT covered by the indefinite exemption and are subject to the general no-caching-except-as-permitted rule — do not build a permanent internal mirror of ratings/hours/photos without separate legal review.

### Google Places API (New) - Nearby Search  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: POST https://places.googleapis.com/v1/places:searchNearby with JSON body {includedTypes, locationRestriction:{circle:{center,radius}}}, X-Goog-FieldMask header required
- **auth**: api-key: X-Goog-Api-Key header
- **cost**: Same Pro SKU pricing as Text Search: $32.00 per 1,000 requests, 5,000 free/month (per official pricing page, same SKU family)
- **data_provided**: Same field set as Text Search (place_id, name, address, location, types, hours, ratings, photos etc.) but results are radius-bounded around a center point instead of text-matched
- **spatial**: Circular radius search up to 50,000m around a lat/lng, filtered by includedTypes (up to 50 place types) — core tool for 'what's around this facility' queries
- **enrichment_idea**: Once an internal facility is geocoded, run Nearby Search around it (e.g. 'gym','stadium','school','park') to compute a 'nearby sports/education infrastructure density' score per facility/local-authority — a proxy for accessibility and competition/complementary-facility saturation for the תיק יישוב tab. Note: no dedicated sports-facility place type was confirmed in the docs excerpt fetched (needs a follow-up check against the full Table A/B place-types list) — general types like 'gym', 'stadium', 'park' exist in Google's type taxonomy from general knowledge but should be verified.
- **dashboard_use**: Tab 2 (תיק יישוב — heat maps, facility density, accessibility context) and Tab 6 (impact/efficiency — infrastructure-per-capita context)
- **israel_coverage**: Same as Text Search — depends on Google's Places listing density in Israel; strong in cities, weaker in periphery/Arab and small towns
- **reliability**: Official/primary; same 30-day lat/lng caching + indefinite place_id caching ToS as other Places endpoints

### Google Places API (New) - Place Details  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: GET https://places.googleapis.com/v1/places/{place_id} with X-Goog-FieldMask header (per official Places API family pattern; endpoint not independently re-fetched this round, taken from consistent Places API v1 doc pattern seen in Text/Nearby Search)
- **auth**: api-key: X-Goog-Api-Key header
- **cost**: Tiered by field mask: Essentials (id/location/basic) $5.00/1,000 (10,000 free/month); Pro (adds address/types/hours/photos) $17.00/1,000 (5,000 free/month); Enterprise (adds ratings/reviews/contact/pricing) $20.00/1,000 (1,000 free/month)
- **data_provided**: Full record for a known place_id: name, address, coordinates, types, opening hours, phone, website, rating, reviews, photos, accessibility, price level
- **spatial**: Returns authoritative coordinates + address for a place_id already resolved via Text/Nearby Search or Geocoding — used to fill in remaining rich detail once location is known
- **enrichment_idea**: After resolving a place_id for a supported org via Text Search, call Place Details (Essentials tier only, to control cost) periodically to refresh open/closed business status — flag orgs whose Google listing shows CLOSED_PERMANENTLY as a red flag for the 'dependence on support' / governance risk metric on the גוף נתמך card
- **dashboard_use**: Tab 3 (גוף נתמך card — operating-status sanity check)
- **israel_coverage**: Same Places-database dependency as Text/Nearby Search
- **reliability**: Official/primary; pricing tiers strongly incentivize requesting only the fields you need (field masking) since Enterprise-tier fields are 4x the Essentials price

### Google Address Validation API  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: POST to Address Validation API endpoint (v1) — accepts an address object, returns validated/standardized components (endpoint path not independently confirmed this round beyond overview page)
- **auth**: api-key: same GCP project/API key pattern as other Maps Platform APIs
- **cost**: Pro tier $17.00 per 1,000 requests (5,000 free/month); Enterprise tier $25.00 per 1,000 requests (1,000 free/month)
- **data_provided**: Standardized/corrected address, per-component validation status (confirmed/unconfirmed/inferred), geocode coordinates, address precision/granularity level, postal-service metadata
- **spatial**: Produces a validated address + geocode as a byproduct, but its main value is address-quality scoring, not primary geocoding
- **enrichment_idea**: NOT USABLE for this project — Israel is absent from Google's official coverage table, so free-text or partial Hebrew addresses in internal records cannot be validated/standardized by this API. Skip; rely on plain Geocoding API + manual QA instead.
- **dashboard_use**: None recommended for Israel — do not build a dependency on this API for this dashboard
- **israel_coverage**: NOT SUPPORTED — Israel does not appear in the official Address Validation API coverage table (~35 countries/regions covered, Israel not among them)
- **reliability**: Official/primary but explicitly out of scope for Israel per Google's own coverage documentation — do not budget effort here

### Google Maps Platform - free tier & subscription structure  _(area: None)_
- **provider**: Google (Google Maps Platform billing model, effective policy change March 1 2025)
- **access**: Pay-as-you-go (per-SKU free monthly calls + per-1,000 overage price) OR fixed subscription plans: Starter $100/mo (50,000 calls, Geocoding+Dynamic Maps only), Essentials $275/mo (100,000 calls, adds Geocoding/Autocomplete/Geolocation/Place Details/Text Search/Address Validation), Pro $1,200/mo (250,000 calls), Enterprise custom
- **auth**: account-required: Google Cloud project + billing account (credit card) mandatory even to use free-tier calls
- **cost**: New customers get $300 one-time trial credit. Ongoing free tier is now per-SKU monthly free calls (not a pooled $200 credit as before Mar 2025): Essentials-tier SKUs 10,000 free/mo, Pro-tier SKUs 5,000 free/mo, Enterprise-tier SKUs 1,000 free/mo — each API/field-combination is its own SKU with its own free bucket, they do not pool together
- **data_provided**: n/a — this is the billing/account layer, not a data source
- **spatial**: n/a — governs cost of the spatial APIs above
- **enrichment_idea**: For a one-time bulk backfill of internal org records (likely a few thousand rows), Geocoding API cost is trivial (10,000 free/mo covers a full backfill in one month at $0). Ongoing ad-hoc lookups for new orgs stay inside free tier almost indefinitely given likely low org-registration volume. Budget mainly for Places Text Search Pro ($32/1,000) if doing an org-name-resolution pass on many unaddressed records — worth estimating internal record count first to size the one-time cost.
- **dashboard_use**: Cost-planning input for whichever tabs consume geocoded/Places data (Tab 2, Tab 3, Tab 6)
- **israel_coverage**: Billing/account layer is global, not country-specific
- **reliability**: Official Google billing terms; note the March-2025 policy shift from flat $200 monthly credit to per-SKU free-call buckets is a real, fairly recent change — worth re-verifying at implementation time since Google has changed Maps Platform pricing before

### Places API (New) — Nearby Search  _(area: None)_
- **provider**: Google (Google Maps Platform, part of Google Cloud)
- **access**: POST https://places.googleapis.com/v1/places:searchNearby — body: locationRestriction (circle center lat/lng + radius 0-50000m), includedTypes (up to 50 Table A types e.g. gym/stadium/sports_complex/swimming_pool/park), rankPreference POPULARITY|DISTANCE, languageCode, regionCode, maxResultCount 1-20
- **auth**: api-key — Google Cloud project API key sent via X-Goog-Api-Key header; billing account required on the project even to use free quota
- **cost**: Nearby Search Pro SKU: 5,000 free calls/month, then $32.00/1000 calls (0-100k tier) sliding down to $2.40/1000 at 5M+/month
- **data_provided**: Array of Place objects (per requested FieldMask): displayName, formattedAddress, location, types, businessStatus, rating, userRatingCount, websiteUri, phone, opening hours, photos
- **spatial**: Core spatial tool: returns lat/lng for every facility found within a circle around ANY point (e.g. a locality centroid) — this IS the discovery layer
- **enrichment_idea**: For every locality/authority in the office DB, geocode its centroid, run Nearby Search with includedTypes=[gym,stadium,sports_complex,swimming_pool,athletic_field,fitness_center] radius ~5km, then fuzzy-match returned displayName against internal club/agudah name list (Hebrew) to auto-tag facilities as 'known' (already funded) vs 'discovered' (unlisted competitor/unregistered facility) — surfaces gaps in the office's own facility registry
- **dashboard_use**: Tab 2 (תיק יישוב) — facility heat map / athletes-per-branch context layer; Tab 6 (Impact & efficiency) — facility density vs population catchment
- **israel_coverage**: No Israel-specific quality report found; Hebrew supported via languageCode=he for names/addresses. Practical caveat: Google Places data in Israel skews toward businesses that self-list on Google Business Profile — public municipal sports facilities (school gyms, public pools, community centers) are often thin or missing, while commercial gyms are well covered. Treat as supplementary, not authoritative census.
- **reliability**: Official/primary Google source, continuously crowdsourced+business-owner updated (freshness varies per POI, no fixed cadence). ToS caveat: returned lat/lng may only be CACHED up to 30 consecutive calendar days before deletion required; place_id is exempt and may be stored indefinitely — plan internal DB storage around place_id + periodic re-fetch of coordinates, not permanent raw lat/lng storage

### Places API (New) — Place Details  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: GET https://places.googleapis.com/v1/places/{place_id} with mandatory X-Goog-FieldMask header listing exact fields (no default field set — omitting mask errors)
- **auth**: api-key, same Google Cloud project key as Nearby/Text Search
- **cost**: Billed at highest SKU tier touched by requested fields: Essentials $5.00/1000 (10k free/mo) for location/formattedAddress/types; Pro $17.00/1000 (5k free/mo) for displayName/businessStatus/accessibilityOptions; Enterprise $20.00/1000 (1k free/mo) for rating/userRatingCount/websiteUri/nationalPhoneNumber — pull only Essentials fields if budget-constrained
- **data_provided**: Per-place detail: displayName (localizable), formattedAddress, location, types, businessStatus, rating, userRatingCount, websiteUri, nationalPhoneNumber, accessibilityOptions (wheelchair access etc.), opening hours, photos
- **spatial**: Returns precise lat/lng (location field, Essentials tier) plus formattedAddress for a known place_id — used to resolve a candidate hit from Nearby/Text Search into a confirmed geocoded facility record
- **enrichment_idea**: accessibilityOptions field could feed a facility-accessibility indicator into the תיק יישוב tab (wheelchair-accessible sports facilities near a locality) — a dimension the office likely doesn't track internally
- **dashboard_use**: Tab 2 (תיק יישוב) facility cards/tooltips on the heat map; Tab 3 (גוף נתמך) as a secondary contact/address verification signal for a nonprofit's listed facility
- **israel_coverage**: Same caveat as Nearby Search — commercial coverage good, public/municipal facility coverage inconsistent; displayName localization to Hebrew depends on whether the business owner set a Hebrew name on Google Business Profile
- **reliability**: Official/primary; same 30-day coordinate caching / indefinite place_id caching ToS constraint applies

### Places API (New) — Text Search  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: POST https://places.googleapis.com/v1/places:searchText — body: textQuery (free text), includedType, locationBias (circle/rectangle), languageCode=he for Hebrew, X-Goog-FieldMask header required
- **auth**: api-key, same project key
- **cost**: Text Search Pro SKU: 5,000 free calls/month, then $32.00/1000 sliding to $2.40/1000 at 5M+ — same pricing curve as Nearby Search Pro
- **data_provided**: Array of Place objects matching a free-text query (e.g. an exact org name + city), same field set as Nearby Search per FieldMask
- **spatial**: locationBias narrows text matching to a geographic circle/rectangle around the locality tied to the internal record, then returns a lat/lng for the best match
- **enrichment_idea**: Primary geocoding-by-name workflow: for internal club/agudah/federation records lacking any address, run Text Search with textQuery = '<org Hebrew name> <city>' + locationBias set to the org's known locality — resolves org name strings directly to a place_id + lat/lng without needing a clean address first (better than Geocoding API when internal records only have a name, not a street address)
- **dashboard_use**: Backend enrichment ETL step feeding Tab 2 (תיק יישוב) and Tab 3 (גוף נתמך) location fields; not a direct visual
- **israel_coverage**: Hebrew languageCode supported per docs; match quality depends on how the org registered itself on Google (many small nonprofits/agudot may have no Google Business Profile at all, yielding no match)
- **reliability**: Official/primary; fuzzy free-text matching means false positives possible (e.g. matching a similarly-named but unrelated club) — any auto-match should be flagged for manual review, not auto-committed to the DB

### Places Aggregate API (Area Insights)  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: ComputeInsights method — request an insight type of INSIGHT_COUNT (returns a place count) or INSIGHT_PLACES (returns place_ids, only when count<=100), filterable by circle/region/custom polygon, place type, operating status, price level, rating
- **auth**: api-key, Google Cloud project (separate API to enable from base Places API)
- **cost**: Not surfaced on the overview page — pricing not confirmed in this pass, needs a dedicated pricing-page check next round
- **data_provided**: Aggregate counts (or up to 100 place_ids) of places matching type+status+rating filters inside an arbitrary polygon/circle — e.g. 'how many gyms/pools inside this local-authority boundary'
- **spatial**: Strongest spatial fit of the whole family: accepts a CUSTOM POLYGON, so a local authority's actual municipal boundary (not just a radius) can be used to count sports facilities inside it directly
- **enrichment_idea**: Feed each local authority's official municipal-boundary polygon (from CBS/GovMap) into ComputeInsights with includedTypes=[gym,stadium,swimming_pool,sports_complex] → get a single 'external facility count' number per authority to sit next to the office's own internal facility count for that authority in Tab 2 — an instant gap/audit metric (office knows of 3 funded facilities, Google shows 11 total facility-type POIs in the boundary) without needing individual place records
- **dashboard_use**: Tab 2 (תיק יישוב) — 'facility density' KPI/heat-map layer; Tab 6 (Impact & efficiency) — facilities-per-capita denominator alongside CBS population
- **israel_coverage**: Israel (IL) explicitly confirmed as a covered country on the official coverage table
- **reliability**: Official/primary, newer product (less battle-tested than core Places API); count-only mode avoids the 30-day coordinate caching issue entirely since no lat/lng is returned for INSIGHT_COUNT

### Geocoding API  _(area: None)_
- **provider**: Google (Google Maps Platform)
- **access**: GET https://maps.googleapis.com/maps/api/geocode/json?address=...&key=... — also supports reverse geocoding (lat/lng or place_id → address)
- **auth**: api-key, same Google Cloud project as Places APIs
- **cost**: 10,000 free calls/month, then $5.00/1000 (0-100k tier) sliding to $0.38/1000 at 5M+/month — cheapest of the location APIs, ideal for a one-time bulk-geocode pass over the internal org/club address list
- **data_provided**: formatted_address, geometry.location (lat/lng), place_id, address_components (street/city/postal/country parsed parts)
- **spatial**: The direct address→lat/lng workhorse — best fit when internal records DO have a usable street address (vs Text Search which is better for name-only records)
- **enrichment_idea**: Bulk-geocode every supported organization's registered address (from moj-amutot/office records) once, store place_id permanently + address_components (city/neighborhood) — this becomes the join key that unlocks EVERY other spatial enrichment (CBS statistical-area lookup by lat/lng, Nearby Search catchment analysis, Aggregate API polygon membership) across all dashboard tabs. This is the foundational first step before any of the other Places APIs are useful.
- **dashboard_use**: Backend one-time/periodic ETL enrichment step underlying Tab 2 (תיק יישוב), Tab 3 (גוף נתמך location), Tab 6 (Impact & efficiency spatial joins) — not itself a visual
- **israel_coverage**: No explicit Israel note found; docs state 'functionality varies by region' generically. Hebrew addresses generally geocode reasonably given Israel's Google Maps investment, but street-level accuracy in smaller Arab-sector or peripheral localities may be weaker — flagged as unverified, worth a spot-check with real office address samples before committing to a bulk run
- **reliability**: Official/primary. Same 30-day lat/lng caching ToS limit applies UNLESS coordinates are kept alongside a place_id and periodically refreshed, or used only transiently for a spatial join computed at query time rather than stored as a permanent DB column

### Google Maps Platform pricing/billing model  _(area: None)_
- **provider**: Google Cloud
- **cost**: No blanket free tier anymore — as of 2025-03-01 the old $200/month credit was replaced by per-SKU monthly free-call quotas (varies 1k-10k depending on SKU); a Google Cloud project with billing enabled is mandatory even to stay within free quota. Optional flat subscription tiers exist as an alternative: Starter $100/mo (50k calls), Essentials $275/mo (100k calls), Pro $1200/mo (250k calls)

### מתקני ספורט בישראל — Ministry of Culture & Sports national facility registry (data.gov.il pkg 408)  _(area: None)_
- **provider**: data.gov.il CKAN portal, dataset owned by organization 'culture_and_sports' (משרד התרבות והספורט itself — this is the ministry's OWN open dataset)
- **access**: CKAN package id 408 / uuid db2941a4-d5d7-4a1f-893f-e456bfc6c774. CSV resource: https://e.data.gov.il/dataset/db2941a4-d5d7-4a1f-893f-e456bfc6c774/resource/f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d/download/copy-of-25.7.21.csv ; also XLSX 'רשימת מתקני הספורט לפי רשויות'. Programmatic: https://data.gov.il/api/3/action/datastore_search?resource_id=f8dbd3ed-2c62-4d0e-bbaa-b6a15a0e5f7d
- **auth**: none — public CKAN datastore_search, no key
- **cost**: free, no quota published (standard CKAN, generous default limits)
- **data_provided**: ~6,500 facility rows, 27 fields: local authority, settlement, facility ID/type/name, neighborhood, street+house number, ITM X/Y coords, #buildings, owner, operating body, contact phone/email, seating capacity, availability, fencing, lighting, disability access, parking, condition, competition-standard flag, official-competition-use flag, year established, whether it serves a school
- **spatial**: HAS native ITM (Israel Transverse Mercator, EPSG:2039) X/Y per facility — every facility is already exactly geocoded by the ministry itself; convert to WGS84 lat/lng with a standard pyproj transform (EPSG:2039→EPSG:4326), no geocoding needed at all
- **enrichment_idea**: This IS likely the office's own facility master data (or a close twin) already carrying exact coordinates — reproject to WGS84, point-in-polygon against statistical_areas_2022 to attach socio-economic index + population catchment per facility, and spatial-join to local-authority boundaries for tab-2 heat maps and tab-6 budget-vs-participation-per-capita; also cross-check 'serves school' flag against the national schools FeatureServer by nearest-point
- **dashboard_use**: Tab 2 (local-authority file heat maps, athletes-per-branch), Tab 6 (impact/efficiency — facility density vs population)
- **israel_coverage**: Israel-only by definition, full Hebrew fields, national scope (6500+ facilities across all authorities in the sample checked, e.g. Abu Ghosh)
- **reliability**: PRIMARY/official — published by the ministry itself, but STALE: last modified 2021-07-25 (5 years old as of 2026), so new facilities / status changes since then will be missing — flag as caveat, recommend cross-checking against internal current records

### data.gov.il CKAN API (generic)  _(area: None)_
- **provider**: Israeli government open-data portal (digital govt/CIO), standard CKAN software
- **access**: Base https://data.gov.il/api/3/action/ — package_search?q=..., package_show?id=..., datastore_search?resource_id=...&limit=...; confirmed all three work directly (no need for browser rendering, unlike the SPA frontend)
- **auth**: none for read endpoints
- **cost**: free, standard CKAN default limits (datastore_search caps ~32000 rows/request typically; not confirmed for this instance)
- **spatial**: no confirmed native geo bbox filter on this instance's datastore_search; some CKAN deployments add ckanext-spatial for package-level bbox search via package_search extras.ext_bbox, but not verified enabled here
- **data_provided**: catalog of hundreds of Israeli govt open datasets across all ministries incl. sports, environment, health, planning
- **enrichment_idea**: use package_search as the discovery layer, then datastore_search for structured pulls — good for periodic refresh jobs pulling facility/nonprofit/boundary-adjacent tables into the DWH
- **dashboard_use**: cross-cutting ETL source for tabs 1,2,3,6
- **israel_coverage**: full — this is the Israeli national open-data portal
- **reliability**: official/primary per-dataset but freshness varies wildly by publishing ministry (some datasets years stale, e.g. the sports facility one) — always check each dataset's 'last modified' individually

### Municipal sports-facility datasets — Beer Sheva (sport-br7) and Haifa  _(area: None)_
- **provider**: Beer Sheva Municipality / Haifa Municipality, hosted on data.gov.il
- **access**: Beer Sheva pkg d25f8679-13bc-4082-bf6e-6156e1d2df60 offers 14+ resource variants incl. GeoJSON (ef828426-99d7-44c3-8fc0-b7b4bfeec6cf), SHP zip, CSV, XML, plus multiple coordinate-system variants; Haifa pkg 49fd47dc-0eb7-4950-8bf4-23e0ad22fc9f only offers XLS
- **auth**: none
- **cost**: free
- **data_provided**: gyms, pools, fitness centers, courts — municipal venue lists with location
- **spatial**: Beer Sheva ships ready-to-use GeoJSON + SHP directly (better than the national ministry dataset's raw ITM CSV); Haifa is XLS only, no confirmed coords
- **enrichment_idea**: use Beer Sheva's GeoJSON as a validation/cross-check sample against the national ministry list for that city (catches staleness in the 2021 national file); pattern-match other municipalities that might publish similarly on data.gov.il
- **dashboard_use**: Tab 2 local-authority file (drill-down validation for specific cities)
- **israel_coverage**: only these 2 cities found this way — not comprehensive; would need per-municipality search to find more
- **reliability**: official/primary (municipality-published) but Haifa's freshness/date unclear from metadata; fragmented, no unified national municipal layer

### IsraelData Open Data Portal (Survey of Israel / Mapi)  _(area: None)_
- **provider**: המרכז למיפוי ישראל (Survey of Israel / Mapi), hosted as ArcGIS Hub org 'IsraelData' at data-israeldata.opendata.arcgis.com
- **access**: Hub: https://data-israeldata.opendata.arcgis.com ; DCAT catalog: .../api/feed/dcat-us/1.1.json ; direct GeoJSON downloads: .../api/download/v1/items/{itemId}/geojson?layers=N ; org REST service root: https://services8.arcgis.com/JcXY3lLZni6BK4El/arcgis/rest/services?f=json listing 63 FeatureServer/MapServer services, each queryable at .../<service>/FeatureServer/0/query?f=geojson&where=1=1
- **auth**: none for the FeatureServer query endpoints tested (public REST, standard Esri query params)
- **cost**: free, public open-data portal
- **data_provided**: 63 services incl.: שכבת_יישובים_2021_נתוני_מפקד_2022 (national settlements layer + 2022 census data), statistical_areas_2022 (national statistical-area polygons), schools, kindergarten, universities, academic institutions, cemeteries, defibrillators, parcels/blocks cadastral (חלקות/גושים), roads, industrial areas, CITY (settlement points, SETL_CODE key), district/sub-district/planning-area boundaries
- **spatial**: full national GIS layers with true polygon/point geometry in ITM(2039)/WGS84, downloadable as GeoJSON/SHP/KML/FileGDB/GeoPackage, plus OGC WFS/WMS on some layers (e.g. district boundaries via ags.iplan.gov.il) — this is the strongest spatial backbone found for the whole project: settlement points + statistical-area polygons + schools all share the SETL_CODE join key
- **enrichment_idea**: pipeline: (1) reproject ministry facility ITM X/Y → WGS84; (2) point-in-polygon join to statistical_areas_2022 to attach the statistical-area code; (3) join that code to the CBS socio-economic-cluster CSV (by locality) to get a per-facility socio-economic context; (4) nearest-neighbor join facility↔schools FeatureServer to validate 'serves school'; (5) spatial-join facility→CITY/settlement point to auto-fill/validate the 'ישוב' field on any internal record missing it
- **dashboard_use**: Tab 2 (local-authority heat maps — base map layers + statistical-area choropleth), Tab 6 (catchment population / participation-rate-vs-population via statistical areas + settlement census data)
- **israel_coverage**: full national coverage, Hebrew field values (though many technical field NAMES are English/coded, e.g. SETL_CODE, USG_GROUP)
- **reliability**: official/primary — run by Israel's national mapping authority; parcels layer confirmed updated Nov 2025 (recent); statistical_areas_2022 tied to the 2022 census — best-maintained spatial backbone found in this scan; no ToS text retrieved this session (assume standard Israeli open-govt terms, verify before bulk-storing coordinates commercially)

### Ministry of Interior — Statutory Jurisdiction Boundaries Portal  _(area: None)_
- **provider**: משרד הפנים (Ministry of Interior)
- **access**: https://gvulot-shiput-statutory-moinil.opendata.arcgis.com — 100+ separate per-municipality dataset items (pattern: .../datasets/moinil::<city>-גבולות-שיפוט-סטטוטוריים); landing page also at gov.il/he/departments/dynamiccollectors/boundaries-judgment
- **auth**: none confirmed for the public hub pages; not confirmed for underlying REST/download
- **cost**: free
- **data_provided**: official statutory jurisdiction (municipal) boundary polygon per local authority, current + historical
- **spatial**: polygon boundaries — but delivered as 100+ SEPARATE per-city dataset items rather than one unified national layer (DCAT distribution listed as text/html web pages, actual GeoJSON/SHP download presumably behind each item's ArcGIS Hub download button, not verified this session)
- **enrichment_idea**: use as the authoritative polygon to spatial-join facility lat/lng → official municipal boundary (cross-check vs the free-text 'רשות מקומית' field, catches data-entry mismatches); prefer IsraelData's settlement layer for a single bulk pull if a unified layer isn't found, use this portal only for authoritative polygon shape
- **dashboard_use**: Tab 2 (local-authority file — choropleth boundary shapes)
- **israel_coverage**: full — all Israeli local authorities, official government source
- **reliability**: official/primary, but fragmented (100+ items to fetch instead of 1) and legal disclaimer notes data 'does not constitute proof for any legal proceeding' — fine for a dashboard, not for legal boundary disputes

### GovMap.gov.il API (national geoportal)  _(area: None)_
- **provider**: Survey of Israel / national mapping portal (gov.il)
- **access**: govmap.gov.il ; API examples/docs page at govmap.gov.il/sites/api_examples.html listing JS functions incl. geocode/searchAndLocate for address search
- **auth**: account-required — registration with email needed for API access (exact token flow not retrieved this session)
- **cost**: unknown/likely free for a govt-registered account; not confirmed
- **data_provided**: address search/geocoding, parcel/plot lookup, many thematic map layers (incl. local authority layer, sport facilities possibly)
- **spatial**: core value: address→ITM coordinate geocoding for Israel specifically (better tuned to Israeli addressing than global geocoders); also serves as the authoritative visual map layer source
- **enrichment_idea**: if internal records have only free-text addresses (no coords), batch-geocode via GovMap instead of Google/global geocoders — better hit-rate on Israeli street/settlement names and returns native ITM directly usable with the other Mapi layers
- **dashboard_use**: backend ETL geocoding step feeding all spatial tabs
- **israel_coverage**: full — Israel-specific national mapping portal, Hebrew UI
- **reliability**: official/primary; NEEDS FOLLOW-UP — could not retrieve endpoint specs, quotas, or ToS on data storage this session (JS-heavy docs page, registration wall); recommend a manual registration + docs review next round

### CBS Social-Economic Cluster dataset (אשכול חברתי-כלכלי 2019)  _(area: None)_
- **provider**: הלשכה המרכזית לסטטיסטיקה (CBS), published via data.gov.il by the CIO org
- **access**: pkg social_economic_cluster / df3b0e8d-b76a-4186-a6e1-df8eada5ef27; CSV: https://data.gov.il/dataset/df3b0e8d-b76a-4186-a6e1-df8eada5ef27/resource/7c860e04-9f8d-41c2-9f24-6249958d2081/download/-2019.csv
- **auth**: none
- **cost**: free
- **data_provided**: socio-economic cluster/rank (1-10 scale, standard CBS methodology) per locality/municipality, for 2019
- **spatial**: none directly (no geometry) — but joins to any spatial locality layer (IsraelData settlements, or facility 'רשות מקומית' text field) by locality name/code
- **enrichment_idea**: join to every facility/club/federation record by local authority to power the 'impact & efficiency' tab's equity lens — e.g. participation rate vs socio-economic cluster, or budget skew toward wealthier vs poorer authorities
- **dashboard_use**: Tab 6 (impact & efficiency — equity/socio-economic cut), Tab 2 (local-authority file context)
- **israel_coverage**: full, all Israeli localities, Hebrew
- **reliability**: official/primary (CBS) but STALE — 2019 figures (CBS typically updates this index every ~3-4 years; a newer edition may exist and should be searched for specifically next round)

