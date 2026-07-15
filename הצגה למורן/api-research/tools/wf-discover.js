// API/data-source DISCOVERY swarm for Moran's strategic sports dashboard
// (Israeli Ministry of Culture & Sport — Sports Administration).
// Goal: find PUBLIC APIs / open data / creative enrichment sources that can ENHANCE the
// dashboard. NOT implementation. Priority lens = SPATIAL sports data + creative cross-referencing
// (e.g. geocode office records via Google Places, POI layers, accessibility analysis).
//
// Run: Workflow({ scriptPath: "api-research/tools/wf-discover.js", args: { run, round } })
// Returns { run, coverage[], findings[], suggest[] } for the orchestrator to merge.

export const meta = {
  name: 'api-discovery-swarm',
  description: 'Discover public APIs/data to enhance Moran sports dashboard; spatial-priority',
  phases: [{ title: 'Discover', detail: 'one agent per source area' }],
};

let A = args; if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } } A = A || {};
const RUN = A.run || 'r1';
const MODEL = A.model || undefined;
const EFFORT = A.effort || 'high';
const ONLY = Array.isArray(A.only) ? A.only : null;  // re-run subset of target keys
const PARTS = A.partsDir || null;   // absolute dir for per-agent <key>.part durability files (incremental capture)
const RETRIES = A.retries || 2;     // total attempts per agent (1 + retry) on truncation/connection-drop

// ---- Shared context every agent gets about the dashboard ----
const CTX = `Dashboard = strategic management dashboard for the Israeli Ministry of Culture & Sport (מינהל הספורט / Sports Administration). Target platform AWS QuickSight. Tabs: (1) Supports/grants the ministry distributes to sports federations(איגודים)/clubs(אגודות) per support-tests(מבחני תמיכה); (2) Local-authority holistic file(תיק יישוב) with heat maps, athletes-per-branch, budget-vs-participation; (3) Supported-organization card(גוף נתמך) — nonprofit financial+governance, GuideStar-style, "dependence on support" metric; (4) Performance & gender(ביצועים ומגדר) — athletes, achievements, gender view; (5) SLA/ops; (6) Impact & efficiency — participation-rate vs population, budget efficiency; (7) links. Israel-focused, Hebrew/RTL. Already using: data.gov.il CKAN (nonprofit registry moj-amutot), GuideStar Israel API, CBS(למ"ס) population.`;

// The office already holds records of sports orgs/clubs/federations/facilities (names, maybe
// addresses, budgets, branches). A KEY creative goal: ENRICH those internal records with external
// data — above all EXACT LOCATION (geocoding) + spatial context.

// ---- Targets. Spatial-priority ones first; ~half are explicitly geospatial/creative. ----
const TARGETS = [
  // ===== SPATIAL / GEO (priority) =====
  { key:'google-maps-platform', label:'Google Maps Platform for geocoding & enriching Israeli sports org/facility records',
    subject:'Geocoding API, Places API (Text Search / Place Details / Nearby), Address Validation. Batch-geocode Hebrew Israeli addresses/org names to lat-lng; pull categories, ratings, opening hours, photos. Pricing tiers, free monthly credit, rate limits, ToS on storing coordinates.',
    hints:['geocoding Hebrew addresses Israel','Places API Nearby Search sport','Google Maps pricing 2026 free tier','can you cache/store lat lng terms'] },
  { key:'google-places-sport-poi', label:'Google Places as a sports-facility POI discovery layer for Israel',
    subject:'Using Places (types: gym, stadium, sports_complex, swimming_pool, park) to DISCOVER facilities near a locality and cross-reference with office club lists. What POI attributes are exposed, coverage quality in Israel, Hebrew names.',
    hints:['Places API place types sports','Nearby Search radius stadium gym Israel','place details fields'] },
  { key:'osm-overpass-sport', label:'OpenStreetMap / Overpass API — free sports facility geodata for Israel',
    subject:'Overpass queries for leisure=pitch/sports_centre/stadium/swimming_pool, sport=* tags; Nominatim free geocoding; coverage & tag richness in Israel; bulk export GeoJSON. Free alternative to Google.',
    hints:['overpass turbo sport=* Israel','nominatim geocoding Hebrew','leisure=sports_centre coverage Israel','OSM data quality Israel'] },
  { key:'govmap-israel-gis', label:'GovMap (govmap.gov.il) — official Israeli national GIS API',
    subject:'Government GIS: address geocoding to ITM coordinates, parcels(גוש חלקה), layers, WMS/WFS, REST API. Does it expose sports facilities/public buildings layers? Auth/keys, free usage, Hebrew address search.',
    hints:['govmap api geocode address','govmap WFS layers','ManaZ merkaz mipuy','govmap developer'] },
  { key:'datagovil-geo-sport', label:'data.gov.il — geospatial + sports facility datasets (GeoJSON/shapefile)',
    subject:'Datasets: sports facilities(מתקני ספורט), local-authority boundaries(גבולות רשויות), settlements points, public institutions, with CKAN API + geometry. Also ministry-of-sport datasets. List concrete dataset ids + resource formats.',
    hints:['data.gov.il מתקני ספורט','data.gov.il גבולות רשויות מקומיות GeoJSON','CKAN datastore_search geometry','ministry culture sport datasets'] },
  { key:'wikidata-sparql-venues', label:'Wikidata/Wikipedia — sports clubs, venues & athletes WITH coordinates',
    subject:'SPARQL for Israeli sports clubs/stadiums with coordinate location(P625), founding, league, home venue; athletes with place of birth. Free, linked, spatial. Cross-reference to office club names.',
    hints:['wikidata sparql sports club Israel coordinates','P625 stadium Israel','athlete place of birth wikidata'] },
  { key:'gtfs-accessibility', label:'GTFS Israel public transport — spatial ACCESSIBILITY of sports facilities',
    subject:'Israel MoT GTFS feed + GTFS-realtime; compute travel-time/isochrones to nearest sports facility per neighborhood; equity/accessibility analysis. Also OpenTripPlanner/routing APIs.',
    hints:['Israel GTFS gov MoT feed','isochrone API sports facility','public transport accessibility analysis','OpenTripPlanner Israel'] },
  { key:'socioeconomic-spatial', label:'CBS socio-economic index + spatial join for equity heat maps',
    subject:'CBS(למ"ס) socio-economic index of localities & statistical areas(אזורים סטטיסטיים), peripherality index, with geographic keys to join to sports participation/support spending. GeoJSON of statistical areas.',
    hints:['CBS socioeconomic index localities 2021','אזורים סטטיסטיים GeoJSON','peripherality index Israel','LMS statistical areas boundaries'] },
  { key:'toto-pais-facilities', label:'Toto / Mifal HaPayis funded sports facilities — spatial inventory',
    subject:'Sports-Betting Board(המועצה להסדר ההימורים/טוטו) & Mifal HaPayis(מפעל הפיס) fund/build sports facilities(אולמות, מגרשים, בריכות). Any registry/map/open data of funded facilities with locations? Funding amounts per locality.',
    hints:['טוטו מתקני ספורט מפה','מפעל הפיס מתקנים רשימה','toto winner facilities list','sports facilities national plan Israel'] },
  { key:'mapping-viz-tools', label:'Spatial viz & routing tools compatible with QuickSight/HTML dashboards',
    subject:'Mapbox, Leaflet+free tiles, deck.gl, MapTiler, Esri/ArcGIS free tier — for heat maps, choropleth, isochrones. What fits QuickSight custom-visual/embedding constraints; Israel GeoJSON district/authority boundaries sources.',
    hints:['QuickSight custom shape map GeoJSON Israel','Mapbox pricing free tier','choropleth Israel authorities','isochrone API providers'] },

  // ===== ORGANIZATION / NONPROFIT ENRICHMENT =====
  { key:'guidestar-israel-deep', label:'GuideStar Israel (גיידסטאר) API — full capability audit',
    subject:'Organizations API v1.4 (Justice Ministry): endpoints, fields (proper-management/ניהול תקין, section-46, govt supports, deficit year, services to govt), auth/account process, rate limits, cost, ToS. What it gives beyond data.gov.il registry.',
    hints:['guidestar israel api documentation','גיידסטאר API ארגונים','section 46 approval api','guidestar developer access'] },
  { key:'datagovil-amutot-deep', label:'data.gov.il nonprofit registry(רשם העמותות) + corporations authority — deep',
    subject:'moj-amutot dataset + related (הקדשות, חברות לתועלת הציבור, foreign-state donations). CKAN datastore fields: income, employees, volunteers, members, purposes, status, address. Multi-year? update cadence.',
    hints:['data.gov.il moj amutot fields','רשות התאגידים open data','foreign state donation dataset','company registry Israel API'] },
  { key:'impact-ratings-midot', label:'Impact/effectiveness ratings & philanthropy platforms (Israel)',
    subject:'Midot(מידות) effectiveness ratings, JGive/Round Up giving data, Sheatufim, philanthropy databases. Any API/open data on nonprofit effectiveness, donations, program outcomes to enrich the supported-org card.',
    hints:['מידות דירוג עמותות API','JGive data','Israel philanthropy database','nonprofit effectiveness ratings'] },
  { key:'gov-support-budget', label:'Government support transfers & open budget — tmichot to sports bodies',
    subject:'Open Budget(התקציב הפתוח / budget.gov.il), Accountant-General(חשב כללי/מרכבה) support payments(תמיכות), gov.il tenders/support results. Actual amounts transferred to specific federations/clubs — cross-ref office data.',
    hints:['תקציב פתוח API תמיכות','מרכבה תמיכות מקוונות','gov.il support results sport','open budget Israel api'] },

  // ===== SPORTS PERFORMANCE / ACHIEVEMENTS =====
  { key:'intl-sports-results', label:'International sports results/rankings APIs — achievements & medals',
    subject:'Olympics/Olympedia, world-federation rankings, results DBs; nationality/host-city (spatial angle). Free vs paid sports-data APIs (API-Sports, TheSportsDB, Sportradar). Coverage of Israeli athletes.',
    hints:['TheSportsDB api free','olympedia data','world ranking api federation','Israeli athletes results database'] },
  { key:'sport-participation-surveys', label:'Sports participation & physical-activity data (population level)',
    subject:'CBS social survey physical-activity, Ministry health activity data, Eurobarometer/OECD/WHO sport participation, national fitness surveys. Per-capita participation vs population for the impact tab.',
    hints:['CBS social survey physical activity Israel','OECD sport participation','WHO physical activity data api','ministry of health activity Israel'] },
  { key:'federations-membership', label:'Sports federations / clubs registries & membership (Israel)',
    subject:'Olympic Committee Israel(הוועד האולימפי), Elitzur/Maccabi/Hapoel/ASA org structures, league tables, registered-athletes counts, club rosters. Any structured/open data or scrapable directories to cross-ref office lists.',
    hints:['וועד אולימפי ישראל איגודים רשימה','registered athletes Israel counts','league tables api Israel football basketball','sport associations directory'] },

  // ===== CREATIVE / CROSS-CUTTING SIGNALS =====
  { key:'web-social-signals', label:'Web & social presence as an enrichment signal for clubs/orgs',
    subject:'Creative: enrich office club records with website, social handles, activity level via Google Knowledge Graph, Wikidata, Bing/SerpAPI, Facebook/Instagram public pages. Digital-footprint as proxy for org vitality.',
    hints:['Google Knowledge Graph Search API','SerpApi organization enrichment','clearbit-like enrichment Israel','social presence as proxy activity'] },
  { key:'demographics-gender-spatial', label:'Population by age/gender/locality — for gender + per-capita spatial views',
    subject:'CBS population by locality × age × gender (for participation rates and gender gap maps), youth population (sports target age). API/downloadable with geographic keys. Also immigrants/minorities breakdowns.',
    hints:['CBS population by locality age gender api','למ"ס אוכלוסייה לפי יישוב גיל מגדר','youth population by authority','CBS px-web api'] },
  { key:'weather-terrain-outdoor', label:'Environmental context for outdoor/seasonal sports (creative, lower priority)',
    subject:'IMS(שירות מטאורולוגי) weather API, elevation/terrain, air quality — context for outdoor sports scheduling/participation, water sports, marathons. Free Israeli/global sources with spatial coverage.',
    hints:['IMS israel weather api','open-meteo elevation','air quality api Israel','environment ministry open data'] },
];

const SCHEMA = {
  type:'object', additionalProperties:false, required:['coverage','findings'],
  properties:{
    coverage:{ type:'array', items:{ type:'object', additionalProperties:false, required:['key','type','raw','status'],
      properties:{ key:{type:'string'}, type:{enum:['url','query','site','area']}, raw:{type:'string'},
        status:{enum:['mined','partial','blocked','dead','pending']}, area:{type:'string'}, yield:{type:'string'},
        why:{type:'string'} } } },   // terse rejection reason when the source did NOT become a finding (#2 documentation)
    findings:{ type:'array', items:{ type:'object', additionalProperties:false, required:['entity','field','value','source_key'],
      properties:{
        entity:{type:'string'},   // the API / data source / creative idea name
        field:{type:'string'},    // one of the ENUM fields below
        value:{type:'string'},
        source_key:{type:'string'},
        status:{enum:['verified','estimate']},
        note:{type:'string'} } } },
    suggest:{ type:'array', items:{ type:'object', additionalProperties:false, required:['kind'],
      properties:{ kind:{type:'string'}, raw:{type:'string'}, why:{type:'string'} } } },
  },
};

function buildPrompt(t){
  const partPath = PARTS ? `${PARTS}/${t.key}.part` : null;
  const partBlock = partPath ? `

## INCREMENTAL CAPTURE — durability (do this so an interruption never loses your work)
Your durability file: ${partPath}
As soon as you FINISH examining EACH source (not at the end), append its records to that file via Bash, so if you are cut off mid-run everything up to that point survives. Use a single-quoted heredoc so quotes/Hebrew/$ pass literally:
  mkdir -p "${PARTS}"
  cat >> "${partPath}" <<'JSONL'
  {"_t":"coverage","key":"<canonical-key>","type":"url|query","status":"mined|partial|blocked|dead","area":"${t.key}","why":"<terse tag: dup|404|off-topic|low-value or short phrase>"}
  {"_t":"finding","entity":"<source name>","field":"access|auth|cost|data_provided|spatial|enrichment_idea|dashboard_use|israel_coverage|reliability","value":"<...>","source_key":"<canonical-key>"}
  JSONL
Write one JSON object per line, valid JSON, no trailing commas. This is a BACKUP — you must STILL return the full StructuredOutput at the end (that stays authoritative).` : '';
  return `You are a DISCOVERY research agent for a data/BI team. You are NOT implementing anything — you are scouting the open web for PUBLIC APIs, open datasets, and CREATIVE data-enrichment ideas that could enhance a dashboard.

## Dashboard context
${CTX}

## Your assigned source area
${t.label}
Focus: ${t.subject}
Search hints: ${(t.hints||[]).join(' · ')}

## PRIORITY LENS — spatial sports data + creative cross-referencing
Weight SPATIAL angles heavily. The office already holds internal records of sports orgs/clubs/federations/facilities (names, budgets, maybe partial addresses). A prime creative goal is ENRICHING those records with external data — above all EXACT LOCATION (geocoding org names/addresses to lat-lng), then spatial context (nearby facilities, accessibility, socio-economic area, catchment population). Think like an analyst hunting for leverage, not just cataloguing.

## What to return (StructuredOutput only)
For EACH concrete source/API/idea you find, emit findings[] rows (entity = the source/API/idea name) using these FIELD names (use exactly these strings in "field"):
- "provider" — who runs it
- "access" — base URL / endpoint / how to reach it
- "auth" — none | api-key | account-required | oauth, and how to get it
- "cost" — free / free-tier limits / paid pricing (be specific with numbers/quotas if found)
- "data_provided" — what fields/data it exposes
- "spatial" — its geospatial capability & how it helps map/locate/geocode (write "none" if not spatial)
- "enrichment_idea" — a concrete creative way to join it to the office's internal records (esp. by location)
- "dashboard_use" — which tab/visual it powers
- "israel_coverage" — how well it covers Israel / Hebrew (be honest; "global only" is a valid answer)
- "reliability" — official/primary vs community vs commercial; freshness/update cadence; caveats/ToS limits (e.g. can you store coordinates?)

Rules:
- Prefer PRIMARY sources; verify endpoints exist (fetch docs). For JS/SPA pages fetch via r.jina.ai/<url>.
- Set finding.status "verified" when you confirmed from official docs, "estimate" otherwise.
- coverage[]: emit ONE ROW PER SOURCE YOU TOUCH — no exceptions (canonical key = drop scheme/www/trailing slash; queries as "engine:collapsed text"), honest status, plus a terse "why" whenever it did NOT become a finding (dup | 404 | off-topic | low-value | blocked | short phrase). Every fetch is accounted for as either a finding or an explained rejection — never silently drop a source you looked at.
- suggest[]: creative leads worth a deeper dive next round (esp. spatial/cross-reference ideas), and any adjacent source area we didn't assign.
- Quality over quantity, but be thorough — aim to surface every genuinely useful source in your area. It's fine to spend real effort.${partBlock}`;
}

// retry wrapper: agent() returns null on truncation/connection-drop after the runtime's own retries;
// re-dispatch up to RETRIES times total (fresh research, clean keys). The .part file also survives a drop.
async function agentWithRetry(prompt, opts){
  let r = null;
  for (let i=1; i<=RETRIES; i++){
    r = await agent(prompt, opts);
    if (r) return r;
    if (i < RETRIES) log(`retry ${opts.label} (${i}/${RETRIES} dropped — likely truncation)`);
  }
  return r;  // null after all attempts -> detected downstream via journal started-vs-result + salvaged from .part
}

phase('Discover');
const RUNSET = ONLY ? TARGETS.filter((t)=>ONLY.includes(t.key)) : TARGETS;
const results = await parallel(
  RUNSET.map((t)=>()=>
    agentWithRetry(buildPrompt(t), { label:`disc:${t.key}`, phase:'Discover', schema:SCHEMA,
      ...(MODEL?{model:MODEL}:{}), ...(EFFORT?{effort:EFFORT}:{}) }).then((r)=>({t,r}))
  )
);

const coverage=[], findings=[], suggest=[];
for (const item of results.filter(Boolean)){
  const {t,r}=item; if(!r) continue;
  for (const c of r.coverage||[]) coverage.push({...c, run:RUN, agent:t.key, targets:[t.key]});
  for (const f of r.findings||[]) findings.push({...f, run:RUN, agent:t.key});
  for (const s of r.suggest||[]) suggest.push({...s, run:RUN, agent:t.key});
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${RUNSET.length} agents`);
return { run:RUN, coverage, findings, suggest };
