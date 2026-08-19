// Research-swarm dispatcher TEMPLATE. Copy to <project>/tools/wf-gather.js and adapt
// the SCHEMA `entity`/`field` vocabulary + buildPrompt to the project. Everything else is generic.
//
// Run via the Workflow tool:
//   Workflow({ scriptPath: "tools/wf-gather.js", args: { run, targets, dns, maxAgents, model, effort, perAgentTokens } })
// It returns { run, coverage[], findings[], suggest[] } for the orchestrator to Import-Run into ledgers.
// NOTE: Workflow scripts cannot touch the filesystem — the main agent merges the return value.

export const meta = {
  name: 'research-swarm-gather',
  description: 'Fan out N pure agents to gather/enrich web data; budget-capped; format-neutral findings',
  phases: [{ title: 'Gather', detail: 'one agent per disjoint target' }],
};

// --- args (accept object OR JSON string) ---
let A = args;
if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } }
A = A || {};
const RUN = A.run || 'run';
const MODEL = A.model || undefined;          // haiku | sonnet | opus | undefined(inherit)
const EFFORT = A.effort || undefined;        // low | medium | high | xhigh | max
const MAX_AGENTS = A.maxAgents || 24;
const PER_AGENT_EST = A.perAgentTokens || 12000;
const DNS = A.dns || {};                      // { "<target.key>": ["off-limits-canon-key", ...] }
let TARGETS = [{"key":"agg-eurostat-cofog-sport","label":"Eurostat — govt expenditure on sport (COFOG 08.1)","subject":"CROSS-COUNTRY OFFICIAL AGGREGATOR. Eurostat general government expenditure on 'Recreational and sporting services' (COFOG group GF0801), dataset gov_10a_exp. Extract, per available country+year, total govt sport expenditure and per-capita (or % of GDP). entity=each country name; fields: gov_sport_budget_annual, gov_sport_spend_per_capita, gov_sport_pct_gdp, population. Put year+currency(EUR) in value; set as_of; status=verified.","hints":["ec.europa.eu/eurostat","dataset gov_10a_exp COFOG GF0801 recreational and sporting services","Eurostat 'Government expenditure on recreation, culture and religion' statistics explained","download the tsv/csv data export and parse it (file tier)"]},{"key":"agg-oecd-sport-spend","label":"OECD / UNESCO — public sport expenditure cross-country","subject":"CROSS-COUNTRY OFFICIAL AGGREGATOR. OECD national accounts / OECD reports and UNESCO on public expenditure on sport & recreation across member countries. entity=each country; fields: gov_sport_budget_annual, gov_sport_spend_per_capita, gov_sport_pct_gdp. year+currency in value; as_of; status=verified.","hints":["oecd.org data explorer recreation and sport government expenditure","stats.oecd.org COFOG","UNESCO sport policy expenditure reports","Council of Europe / EU Sport Satellite Accounts"]},{"key":"united-states","label":"United States — public sport investment per capita/athlete","subject":"OFFICIAL public/government investment in sport for the United States. Note: US has no sport ministry; look at federal (USOPC is non-govt), state/municipal parks & recreation spending (Census of Governments), and Team USA/USOPC audited financials for spend per athlete. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+currency+as_of; status=verified.","hints":["census.gov Annual Survey of State and Local Government Finances parks & recreation","usopc.org audited financial statements athletes funded","bea.gov recreation","official only — no news estimates"]},{"key":"canada","label":"Canada — Sport Canada funding per capita/athlete","subject":"OFFICIAL public sport investment for Canada. Sport Canada / Canadian Heritage funding, Athlete Assistance Program (AAP) per-athlete grants, Own the Podium. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+CAD+as_of; status=verified.","hints":["canada.ca Sport Canada funding departmental results report","Athlete Assistance Program AAP monthly stipend number of carded athletes","statcan.gc.ca population"]},{"key":"united-kingdom","label":"United Kingdom — UK Sport / Sport England funding","subject":"OFFICIAL public sport investment for the UK. UK Sport (elite/Olympic) + Sport England (grassroots) National Lottery + Exchequer funding; cost per medal/athlete. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+GBP+as_of; status=verified.","hints":["uksport.gov.uk investment historical funding figures","sportengland.org annual report funding","ONS population","cost per medal published by UK Sport"]},{"key":"germany","label":"Germany — federal sport funding (BMI/DOSB)","subject":"OFFICIAL public sport investment for Germany. Federal Ministry of the Interior (BMI) Sportförderung budget, Leistungssport funding; DOSB registered members. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["bmi.bund.de Sportförderung Haushalt","dosb.de Bestandserhebung Mitglieder (registered members)","destatis.de population","Bundeshaushalt Einzelplan sport"]},{"key":"france","label":"France — Agence nationale du Sport / ministry","subject":"OFFICIAL public sport investment for France. Ministère des Sports budget, Agence nationale du Sport (ANS), licences sportives count. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["sports.gouv.fr budget chiffres-clés du sport","agencedusport.fr","INJEP licences sportives fédérations","insee.fr population"]},{"key":"italy","label":"Italy — Sport e Salute / CONI funding","subject":"OFFICIAL public sport investment for Italy. Sport e Salute S.p.A. state funding, Dipartimento per lo Sport, CONI; tesserati (registered athletes). fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["sport.governo.it finanziamento","sportesalute.it bilancio","coni.it tesserati numbers","istat.it population"]},{"key":"spain","label":"Spain — Consejo Superior de Deportes (CSD)","subject":"OFFICIAL public sport investment for Spain. Consejo Superior de Deportes budget (presupuesto), licencias deportivas federadas. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["csd.gob.es presupuesto estadística licencias deportivas","ine.es population","memoria CSD subvenciones federaciones"]},{"key":"netherlands","label":"Netherlands — VWS sport budget / NOC*NSF","subject":"OFFICIAL public sport investment for the Netherlands. Ministry VWS sport budget, NOC*NSF membership (leden). fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["rijksoverheid.nl VWS sportbegroting","nocnsf.nl ledental sportclubs","cbs.nl population and sport expenditure statistics"]},{"key":"sweden","label":"Sweden — RF / government sport grant","subject":"OFFICIAL public sport investment for Sweden. Government statsbidrag to Riksidrottsförbundet (RF), members. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+SEK+as_of; status=verified.","hints":["rf.se statsanslag medlemmar","regeringen.se idrott anslag budget","scb.se population"]},{"key":"norway","label":"Norway — Kulturdepartementet / NIF (spillemidler)","subject":"OFFICIAL public sport investment for Norway. Spillemidler til idrett (gaming funds), NIF membership. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+NOK+as_of; status=verified.","hints":["regjeringen.no spillemidler idrett","idrettsforbundet.no medlemmer nøkkeltall","ssb.no population"]},{"key":"finland","label":"Finland — Ministry of Education & Culture sport","subject":"OFFICIAL public sport investment for Finland. OKM (Opetus- ja kulttuuriministeriö) liikunta budget, Olympic Committee. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["minedu.fi liikunta määrärahat","olympiakomitea.fi","tilastokeskus stat.fi population"]},{"key":"denmark","label":"Denmark — Kulturministeriet / DIF (Udlodningsmidler)","subject":"OFFICIAL public sport investment for Denmark. Udlodningsmidler til idræt, DIF/DGI membership. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+DKK+as_of; status=verified.","hints":["kum.dk idræt udlodningsmidler","dif.dk medlemstal","dst.dk population"]},{"key":"poland","label":"Poland — Ministerstwo Sportu i Turystyki","subject":"OFFICIAL public sport investment for Poland. Ministry of Sport and Tourism budget, registered athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+PLN+as_of; status=verified.","hints":["gov.pl/sport budżet","gov.pl statystyka osoby ćwiczące","stat.gov.pl GUS Kultura fizyczna sport report","population"]},{"key":"ireland","label":"Ireland — Sport Ireland funding","subject":"OFFICIAL public sport investment for Ireland. Sport Ireland investment, high performance funding, carded athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+EUR+as_of; status=verified.","hints":["sportireland.ie annual report funding investment","gov.ie sport budget","cso.ie population"]},{"key":"switzerland","label":"Switzerland — BASPO / Swiss Olympic","subject":"OFFICIAL public sport investment for Switzerland. Bundesamt für Sport (BASPO) budget, J+S Jugend+Sport, Swiss Olympic members. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+CHF+as_of; status=verified.","hints":["baspo.admin.ch budget Jugend und Sport","swissolympic.ch Mitglieder","bfs.admin.ch population"]},{"key":"australia","label":"Australia — Australian Sports Commission / AIS","subject":"OFFICIAL public sport investment for Australia. Australian Sports Commission (ASC)/AIS funding, sport participation. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+AUD+as_of; status=verified.","hints":["ausport.gov.au annual report funding investment sports","AusPlay participation data","abs.gov.au population"]},{"key":"new-zealand","label":"New Zealand — Sport NZ / HPSNZ","subject":"OFFICIAL public sport investment for New Zealand. Sport New Zealand + High Performance Sport NZ investment, carded athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+NZD+as_of; status=verified.","hints":["sportnz.org.nz annual report investment","hpsnz.org.nz carded athletes","stats.govt.nz population"]},{"key":"japan","label":"Japan — Japan Sports Agency budget","subject":"OFFICIAL public sport investment for Japan. Japan Sports Agency (Suptsu-cho) budget, JSC, registered athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+JPY+as_of; status=verified.","hints":["mext.go.jp/sports budget 予算","japan sports agency English budget overview","jpnsport.go.jp","stat.go.jp population"]},{"key":"south-korea","label":"South Korea — MCST sport budget / KSPO","subject":"OFFICIAL public sport investment for South Korea. Ministry of Culture, Sports and Tourism sport budget, KSPO, registered athletes (등록선수). fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+KRW+as_of; status=verified.","hints":["mcst.go.kr 체육 예산 budget","sports.or.kr KSOC registered athletes 등록선수","kostat.go.kr population"]},{"key":"china","label":"China — General Administration of Sport budget","subject":"OFFICIAL public sport investment for China. General Administration of Sport of China budget, registered athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+CNY+as_of; status=verified.","hints":["sport.gov.cn 体育总局 部门预算 budget","stats.gov.cn National Bureau of Statistics sport expenditure","registered athletes 注册运动员"]},{"key":"singapore","label":"Singapore — Sport Singapore (SportSG)","subject":"OFFICIAL public sport investment for Singapore. Sport Singapore budget, MCCY, spexScholarship athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+SGD+as_of; status=verified.","hints":["myactivesg.com / sportsingapore.gov.sg annual report","mccy.gov.sg budget","spexScholarship number of athletes","singstat.gov.sg population"]},{"key":"india","label":"India — Ministry of Youth Affairs & Sports","subject":"OFFICIAL public sport investment for India. Department of Sports budget, SAI, Khelo India, TOPS athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+INR+as_of; status=verified.","hints":["yas.nic.in / sportsauthorityofindia.nic.in budget","indiabudget.gov.in Ministry of Youth Affairs and Sports demand for grants","TOPS Target Olympic Podium Scheme athletes","census population"]},{"key":"israel","label":"Israel — Ministry of Culture & Sport / Sports Authority","subject":"OFFICIAL public sport investment for Israel. Ministry of Culture and Sport sport budget (מנהל הספורט), registered athletes (ספורטאים רשומים / איגודים). fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+ILS+as_of; status=verified.","hints":["gov.il משרד התרבות והספורט מנהל הספורט תקציב","מבחני תמיכה איגודי ספורט","cbs.gov.il הלשכה המרכזית לסטטיסטיקה population registered athletes"]},{"key":"uae","label":"United Arab Emirates — sport spending","subject":"OFFICIAL public sport investment for the UAE. General Authority of Sports / federal budget for sport. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+AED+as_of; status=verified.","hints":["u.ae government portal sports authority","mof.gov.ae federal budget","fcsc.gov.ae statistics population","official sources only"]},{"key":"qatar","label":"Qatar — sport investment","subject":"OFFICIAL public sport investment for Qatar. Ministry of Sports and Youth / Qatar Olympic Committee / Aspire; national budget sport allocation. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+QAR+as_of; status=verified.","hints":["gco.gov.qa / msy.gov.qa budget","psa.gov.qa Planning and Statistics Authority population","official government budget documents only"]},{"key":"saudi-arabia","label":"Saudi Arabia — Ministry of Sport budget","subject":"OFFICIAL public sport investment for Saudi Arabia. Ministry of Sport budget, sport federations, registered athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+SAR+as_of; status=verified.","hints":["mos.gov.sa Ministry of Sport","mof.gov.sa national budget statement sector allocations","stats.gov.sa GASTAT population"]},{"key":"south-africa","label":"South Africa — Dept Sport, Arts & Culture","subject":"OFFICIAL public sport investment for South Africa. Department of Sport, Arts and Culture (DSAC) / Sport & Recreation budget vote, registered participants. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+ZAR+as_of; status=verified.","hints":["srsa.gov.za / dsac.gov.za annual report budget vote","treasury.gov.za Estimates of National Expenditure sport recreation","statssa.gov.za population"]},{"key":"brazil","label":"Brazil — Ministério do Esporte budget","subject":"OFFICIAL public sport investment for Brazil. Ministério do Esporte orçamento, Bolsa Atleta beneficiaries, registered athletes. fields: gov_sport_budget_annual, gov_sport_spend_per_capita, registered_athletes, gov_sport_spend_per_athlete, population. year+BRL+as_of; status=verified.","hints":["gov.br/esporte orçamento","Bolsa Atleta número de atletas beneficiados","ibge.gov.br population","portaltransparencia.gov.br"]}] || (Array.isArray(A.targets) ? A.targets : []);  // Build-Dispatcher bakes targets here; args.targets is the un-baked fallback

// --- budget guard: slice to what we can afford, LOG every drop ---
if (budget.total) {
  const afford = Math.floor(budget.remaining() / PER_AGENT_EST);
  if (afford < TARGETS.length) {
    log(`budget caps run to ${afford}/${TARGETS.length} targets (${PER_AGENT_EST} tok/agent)`);
    TARGETS = TARGETS.slice(0, Math.max(0, afford));
  }
}
if (TARGETS.length > MAX_AGENTS) {
  log(`maxAgents caps run to ${MAX_AGENTS}/${TARGETS.length} targets`);
  TARGETS = TARGETS.slice(0, MAX_AGENTS);
}
if (!TARGETS.length) { log('no targets to dispatch'); return { run: RUN, coverage: [], findings: [], suggest: [] }; }

// --- StructuredOutput schema (adapt entity/field to the project) ---
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    coverage: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['key', 'type', 'raw', 'status'],
        properties: {
          key: { type: 'string' },                                   // CANONICAL key (see swarm-lib)
          type: { enum: ['url', 'query', 'site', 'area'] },
          raw: { type: 'string' },
          status: { enum: ['mined', 'partial', 'blocked', 'dead', 'pending'] },
          area: { type: 'string' },
          yield: { type: 'string' },
          remaining: { type: 'string' },
          endpoint_status: { enum: ['live', 'context', 'auth', 'browser', 'file', 'image', 'dead', 'error', 'na'] },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['entity', 'field', 'value', 'source_key'],
        properties: {
          entity: { type: 'string' },      // project vocabulary — NOT an excel row/sheet
          field: { type: 'string' },       // project vocabulary — NOT a column index
          value: { type: 'string' },       // the fact; keep human-readable (may still carry year/marker text)
          source_key: { type: 'string' },  // canonical key of the coverage row it came from
          status: { enum: ['verified', 'estimate'] }, // OPTIONAL reconcile signal → feeds the `verification` rule (omit if unknown; rule then abstains)
          as_of: { type: 'string' },       // OPTIONAL ISO date the figure is "as of" → feeds the `recency` rule (omit if unknown; rule abstains)
          note: { type: 'string' },
        },
      },
    },
    suggest: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['kind'],
        properties: { kind: { type: 'string' }, raw: { type: 'string' }, why: { type: 'string' } },
      },
    },
  },
  required: ['coverage', 'findings'],
};

function buildPrompt(t) {
  const off = (DNS[t.key] || []);
  const dnsBlock = off.length
    ? `\n## DO NOT SEARCH (already covered — find NEW sources only)\n${off.map((k) => `- ${k}`).join('\n')}`
    : '';
  return `You are a research agent gathering data for: ${t.label || t.key}
Subject/context: ${t.subject || '(none)'}
Hints: ${(t.hints || []).join('; ') || '(none)'}

Find data on the open web. For JS/SPA pages, fetch via r.jina.ai/<url>.
Return ONLY the StructuredOutput object:
- coverage[]: one row per source you TOUCHED (canonicalize keys: drop scheme/www/#/trailing-slash + tracking params; queries as "engine:collapsed text"). Set status honestly (mined/partial/blocked/dead). Record every failure as its own row with the real reason.
- findings[]: the facts as { entity, field, value, source_key }. source_key must match a coverage key. When known, ALSO set structured signals: status ("verified" from a primary/filing source vs "estimate" from a secondary) and as_of (ISO date the figure applies to) — these feed the reconciliation rules; omit either if unknown (the rule abstains, never guesses).
- suggest[]: optional next-action hints (new sources, deeper targets).${dnsBlock}`;
}

phase('Gather');
const results = await parallel(
  TARGETS.map((t) => () =>
    agent(buildPrompt(t), {
      label: `gather:${t.key}`,
      phase: 'Gather',
      schema: SCHEMA,
      ...(MODEL ? { model: MODEL } : {}),
      ...(EFFORT ? { effort: EFFORT } : {}),
    }).then((r) => ({ t, r }))
  )
);

// --- aggregate; stamp provenance; hand back for Import-Run ---
const coverage = [], findings = [], suggest = [];
for (const item of results.filter(Boolean)) {
  const { t, r } = item;
  if (!r) continue;
  for (const c of r.coverage || []) coverage.push({ ...c, run: RUN, agent: t.key, date: A.date || null, targets: [t.key] });
  for (const f of r.findings || []) findings.push({ ...f, run: RUN, agent: t.key, date: A.date || null });
  for (const s of r.suggest || []) suggest.push({ ...s, run: RUN, agent: t.key });
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${TARGETS.length} agents`);
return { run: RUN, coverage, findings, suggest };
