// ============================================================
// app.js — data-driven dashboard engine
// Reads MOCK.* from data.js, populates filters, renders charts
// ============================================================
(function() {
'use strict';

// ── Lookup caches ──
const branchMap = {}; MOCK.dim_branchs.forEach(b => branchMap[b.branch_id] = b);
const authMap = {};   MOCK.dim_authority.forEach(a => authMap[a.authority_id] = a);
const BR = id => branchMap[id];
const AU = id => authMap[id];

// ── Tab switching ──
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');
tabs.forEach(t => t.addEventListener('click', () => {
  const tgt = t.dataset.tab;
  tabs.forEach(x => x.classList.toggle('active', x === t));
  pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + tgt));
  renderPage(tgt);
}));

// ── Chart.js defaults ──
Chart.defaults.font.family = "'Heebo', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#1A1A1A';
Chart.defaults.borderColor = '#E5E1D8';

const TEAL = '#0D5F73', TEAL_L = '#5BB1C7', TEAL_P = '#B8DDE9';
const AMBER = '#B45309', AMBER_L = '#EBA75C', AMBER_P = '#F7DBB1';
const WOMEN = '#86198F', WOMEN_L = '#C57FCF', WOMEN_P = '#E8C8ED';
const ENT_C = ['#9F1239','#C2410C','#92400E','#A16207','#3F6212','#0F766E','#1D4ED8','#5B21B6','#86198F','#9D174D','#7C2D12','#1F2937'];

const fmtM = v => '₪' + v.toLocaleString('he-IL') + 'M';
const fmtN = v => v.toLocaleString('he-IL');

// ── Data labels plugin ──
Chart.register({
  id: 'dataLabels',
  afterDatasetsDraw(chart, args, opts) {
    if (opts && opts.display === false) return;
    const ctx = chart.ctx, ct = chart.config.type;
    const fmt = (opts && opts.formatter) || (v => typeof v === 'number' ? v.toLocaleString('he-IL') : String(v));
    ctx.save(); ctx.font = '600 10px Heebo, sans-serif'; ctx.fillStyle = '#1A1A1A';
    chart.data.datasets.forEach((ds, di) => {
      if (ds.dataLabels && ds.dataLabels.display === false) return;
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((el, idx) => {
        const raw = ds.data[idx]; if (raw == null) return;
        let val, txt;
        if (typeof raw === 'object') { val = raw.y; txt = raw.name || fmt(raw.y); }
        else { val = raw; txt = fmt(val); }
        if (ct === 'doughnut' || ct === 'pie') {
          const p = el.tooltipPosition(); ctx.fillStyle = '#FFF'; ctx.font = '700 12px Heebo, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(val + '%', p.x, p.y);
          ctx.fillStyle = '#1A1A1A'; ctx.font = '600 10px Heebo, sans-serif'; return;
        }
        const isH = ct === 'bar' && chart.options.indexAxis === 'y';
        if (isH) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, el.x + 4, el.y); }
        else if (ct === 'line') { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.y - 5); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.y - 4); }
      });
    });
    ctx.restore();
  }
});

// ── Option factories ──
function hbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:false}, tooltip:{rtl:true, callbacks:{label:c=>fmt(c.parsed.x)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function pieOpts() {
  return { responsive:true, maintainAspectRatio:false, cutout:'52%',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:11},color:'#1A1A1A',boxWidth:10,boxHeight:10,padding:12}},
              tooltip:{rtl:true,callbacks:{label:c=>c.label+': '+c.parsed+'%'}} } };
}
function lineOpts(fmt,xT,showLbl) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmt(c.parsed.y)}}, dataLabels:{formatter:fmt,display:showLbl!==false} },
    scales:{ x:{title:{display:!!xT,text:xT,font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#6B6B6B'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function grpHbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,reverse:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.x)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function grpVbarOpts(fmt,xT) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.y)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{title:{display:!!xT,text:xT,font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function yoyTotOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmt(c.parsed.y)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{grid:{display:false},ticks:{font:{size:11,weight:'500'},color:'#6B6B6B'},border:{display:false}},
             y:{display:false,beginAtZero:true,grace:'20%'} }, layout:{padding:{top:22,bottom:4}} };
}
function threshOpts() {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,align:'start',labels:{font:{size:11},color:'#1A1A1A',boxWidth:10,boxHeight:10,padding:8}},
              tooltip:{rtl:true,filter:i=>i.parsed.x>0,callbacks:{label:c=>c.dataset.label+' — דורש השלמה'}}, dataLabels:{display:false} },
    scales:{ x:{stacked:true,beginAtZero:true,ticks:{stepSize:1,precision:0,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},
               title:{display:true,text:'מספר שטרם השלימו',font:{size:11},color:'#9A9A9A'}},
             y:{stacked:true,position:'right',ticks:{font:{size:13,weight:'500'},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function dualLineOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.y)}}, dataLabels:{display:false} },
    scales:{ x:{title:{display:true,text:'גיל (שנים)',font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#6B6B6B'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function stackHbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:11},color:'#1A1A1A',boxWidth:10,boxHeight:10,padding:10}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.x)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{stacked:true,ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{stacked:true,position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}

// ── Chart instance store ──
const CI = {};
function mc(id, cfg) { if (CI[id]) CI[id].destroy(); const el = document.getElementById(id); if (el) CI[id] = new Chart(el, cfg); }

// ── Data helpers ──
function grpSum(arr, k, v) {
  const m = {}; arr.forEach(r => { const key = r[k]||'לא ידוע'; m[key] = (m[key]||0) + (r[v]||0); });
  return Object.entries(m).sort((a,b) => b[1]-a[1]);
}
function grpCnt(arr, k) {
  const m = {}; arr.forEach(r => { const key = r[k]||'לא ידוע'; m[key] = (m[key]||0) + 1; });
  return Object.entries(m).sort((a,b) => b[1]-a[1]);
}

// ── Filter DOM helpers ──
function pg(id) { return document.getElementById('page-' + id); }
function sel(pageEl, label) {
  for (const f of pageEl.querySelectorAll('.filter')) {
    const l = f.querySelector('label'); if (l && l.textContent.trim() === label) return f.querySelector('select');
  } return null;
}
function sv(pageEl, label) { const s = sel(pageEl, label); const v = s ? s.value : ''; return (!v || v === 'הכל') ? '' : v; }
function ageR(pageEl) {
  const ins = pageEl.querySelectorAll('.age-num');
  return ins.length === 2 ? [parseInt(ins[0].value)||0, parseInt(ins[1].value)||120] : [0,120];
}
function fillSel(s, opts) {
  if (!s) return; const cur = s.value;
  s.innerHTML = '<option value="">הכל</option>';
  opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; s.appendChild(op); });
  if (cur && opts.includes(cur)) s.value = cur;
}
function setKPI(pageEl, vals) {
  const els = pageEl.querySelectorAll('.kpi-value');
  vals.forEach((v,i) => { if (els[i]) els[i].textContent = v; });
}

// ── Matching helpers ──
function mOlympic(bid, fv) {
  if (!fv) return true; const b = BR(bid); if (!b) return true;
  if (fv === 'אולימפי') return b.is_olympic_branch === 1;
  if (fv === 'פרה-אולימפי') return b.sport_type === 'פראלימפי' || b.sport_type === 'צרכים מיוחדים';
  if (fv === 'לא אולימפי') return b.is_olympic_branch === 0 && b.sport_type !== 'פראלימפי' && b.sport_type !== 'צרכים מיוחדים';
  return true;
}
function mSport(bid, fv) {
  if (!fv) return true; const b = BR(bid); return b ? b.personal_or_group === fv : true;
}

// ── Filter SR ──
function fSR(reqs, p, assocLabel) {
  const a = sv(p, assocLabel||'איגוד'), br = sv(p,'ענף'), ol = sv(p,'סיווג אולימפי'),
        st = sv(p,'סוג ענף'), soc = sv(p,'אגודה'), tm = sv(p,'קבוצה'), comp = sv(p,'תחרויות');
  return reqs.filter(r => {
    if (a && r.association_name !== a) return false;
    if (br && r.branch_name !== br) return false;
    if (!mOlympic(r.branch_id, ol)) return false;
    if (!mSport(r.branch_id, st)) return false;
    if (soc && r.society_name !== soc) return false;
    if (tm && r.team_name !== tm) return false;
    if (comp === 'אליפות אירופה' && r.request_type !== 'אליפות אירופה') return false;
    if (comp === 'שום תחרות' && r.request_type === 'אליפות אירופה') return false;
    return true;
  });
}

// ── Filter Athletes ──
function fATH(ath, p, assocLabel) {
  const a = sv(p, assocLabel||'איגוד'), br = sv(p,'ענף'), ol = sv(p,'סיווג אולימפי'),
        st = sv(p,'סוג ענף'), gn = sv(p,'מגדר'), soc = sv(p,'אגודה'), tm = sv(p,'קבוצה');
  const [aMin, aMax] = ageR(p);
  return ath.filter(r => {
    if (a && r.association_name !== a) return false;
    if (br && r.branch_name !== br) return false;
    if (!mOlympic(r.branch_id, ol)) return false;
    if (!mSport(r.branch_id, st)) return false;
    if (gn === 'נשים' && r.athlete_gender !== 'נקבה') return false;
    if (gn === 'גברים' && r.athlete_gender !== 'זכר') return false;
    if (soc && r.society_name !== soc) return false;
    if (tm && r.team_name !== tm) return false;
    if (r.age < aMin || r.age > aMax) return false;
    return true;
  });
}

// ── Age distribution helper ──
function ageDist(athletes, gender) {
  const counts = {};
  athletes.filter(a => !gender || a.athlete_gender === gender)
    .forEach(a => { const age = a.age; counts[age] = (counts[age]||0) + 1; });
  const labels = []; const data = [];
  for (let i = 6; i <= 50; i++) { labels.push(String(i)); data.push(counts[i]||0); }
  return { labels, data };
}

// ── Authority-based grouping ──
function byCluster(athletes, field, gender) {
  const m = {};
  athletes.filter(a => !gender || a.athlete_gender === gender).forEach(a => {
    const auth = AU(a.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + 1;
  });
  return m;
}
function byClusterScore(athletes, field, gender) {
  const m = {};
  athletes.filter(a => !gender || a.athlete_gender === gender).forEach(a => {
    const auth = AU(a.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + (a.athlete_final_score||0);
  });
  return m;
}
function srByCluster(reqs, field, valField) {
  const m = {};
  reqs.forEach(r => {
    const auth = AU(r.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + (r[valField]||0);
  });
  return m;
}


// ============================================================
// RENDER: Budget / Federations (BF)
// ============================================================
function renderBF() {
  const p = pg('bf');
  const all = MOCK.fact_support_request_spo.filter(r => r.request_type_filter === 'איגוד');
  const f = fSR(all, p, 'איגוד');
  const r26 = f.filter(r => r.support_request_year === 2026);
  const r25 = f.filter(r => r.support_request_year === 2025);

  const tot = r26.reduce((s,r) => s+(r.total_budget||0), 0);
  const ids = new Set(r26.map(r => r.association_id));
  const avg = ids.size ? tot/ids.size : 0;
  const oIds = new Set(r26.filter(r => BR(r.branch_id)?.is_olympic_branch===1).map(r=>r.association_id));
  setKPI(p, ['₪'+(tot/1e6).toFixed(1)+'M', fmtN(ids.size), '₪'+(avg/1e6).toFixed(2)+'M', fmtN(oIds.size)]);

  // by federation
  const byA = grpSum(r26, 'association_name', 'total_budget');
  const t10 = byA.slice(0,10);
  mc('bf_byFederation', { type:'bar', data:{ labels:t10.map(e=>e[0]),
    datasets:[{data:t10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // olympic doughnut
  const oB = r26.filter(r => BR(r.branch_id)?.is_olympic_branch===1).reduce((s,r)=>s+(r.total_budget||0),0);
  const oP = tot ? Math.round(oB/tot*100) : 0;
  mc('bf_olympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[oP,100-oP], backgroundColor:[TEAL,TEAL_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // branch type doughnut
  const tB = r26.filter(r => BR(r.branch_id)?.personal_or_group==='קבוצתי').reduce((s,r)=>s+(r.total_budget||0),0);
  const tP = tot ? Math.round(tB/tot*100) : 0;
  mc('bf_branchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[tP,100-tP], backgroundColor:[TEAL,TEAL_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // threshold breakdown
  const fail = r26.filter(r => r.is_pass_threshold_condition === 'לא עבר');
  const fNames = [...new Set(fail.map(r=>r.association_name))].slice(0,12);
  mc('bf_thresholdBreakdown', { type:'bar', data:{ labels:['סף מקצועי','סף מנהלי','סף מלא (שניהם)'],
    datasets: fNames.map((nm,i) => {
      const my = fail.filter(r=>r.association_name===nm);
      const pf = my.some(r=>r.is_pass_professional_condition==='לא')?1:0;
      const af = my.some(r=>r.is_pass_admin_condition==='לא')?1:0;
      return {label:nm, data:[pf,af,(pf&&af)?1:0], backgroundColor:ENT_C[i%ENT_C.length], borderColor:'#FFF', borderWidth:1.5, barThickness:38};
    })}, options:threshOpts() });

  // YoY comparison
  const m26 = Object.fromEntries(grpSum(r26,'association_name','total_budget'));
  const m25 = Object.fromEntries(grpSum(r25,'association_name','total_budget'));
  const names = byA.slice(0,10).map(e=>e[0]);
  mc('bf_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>+((m26[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2},
      {label:'2025', data:names.map(n=>+((m25[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtM) });

  // YoY total
  const t25 = r25.reduce((s,r)=>s+(r.total_budget||0),0);
  mc('bf_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[+(t25/1e6).toFixed(1),+(tot/1e6).toFixed(1)], backgroundColor:[TEAL_L,TEAL], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtM) });
}


// ============================================================
// RENDER: Budget / Associations (BA)
// ============================================================
function renderBA() {
  const p = pg('ba');
  const all = MOCK.fact_support_request_spo.filter(r => r.request_type_filter === 'אגודה');
  const f = fSR(all, p, 'איגוד');  // BA page has no 'איגוד' filter; it has 'אגודה'
  const r26 = f.filter(r => r.support_request_year === 2026);
  const r25 = f.filter(r => r.support_request_year === 2025);

  const tot = r26.reduce((s,r)=>s+(r.total_budget||0),0);
  const socIds = new Set(r26.filter(r=>r.society_id).map(r=>r.society_id));
  const avg = socIds.size ? tot/socIds.size : 0;
  const tmCodes = new Set(r26.filter(r=>r.team_code).map(r=>r.team_code));
  setKPI(p, ['₪'+(tot/1e6).toFixed(1)+'M', fmtN(socIds.size), '₪'+(avg/1e6).toFixed(2)+'M', fmtN(tmCodes.size)]);

  // by society
  const bySoc = grpSum(r26, 'society_name', 'total_budget');
  const t10 = bySoc.slice(0,10);
  mc('ba_byAssoc', { type:'bar', data:{ labels:t10.map(e=>e[0]),
    datasets:[{data:t10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // by city (authority)
  const byCity = grpSum(r26, 'authority_name', 'total_budget');
  const cT10 = byCity.filter(e=>e[0]!=='לא ידוע').slice(0,10);
  mc('ba_byCity', { type:'bar', data:{ labels:cT10.map(e=>e[0]),
    datasets:[{data:cT10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // by peripherality
  const periMap = srByCluster(r26, 'peripherality_cluster', 'total_budget');
  const periLabels = ['1 - פריפריאלי','2','3','4','5 - מרכז'];
  mc('ba_byPeriphery', { type:'bar', data:{ labels:periLabels,
    datasets:[{data:[1,2,3,4,5].map(k=>+((periMap[k]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:22}]}, options:hbarOpts(fmtM) });

  // by socioeconomic
  const socioMap = srByCluster(r26, 'socioeconomic_cluster', 'total_budget');
  mc('ba_bySocio', { type:'line', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{data:[1,2,3,4,5,6,7,8,9,10].map(k=>+((socioMap[k]||0)/1e6).toFixed(1)),
      borderColor:TEAL, backgroundColor:'rgba(13,95,115,.1)', fill:true, tension:.35, pointRadius:3,
      pointBackgroundColor:TEAL, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2}]},
    options:lineOpts(fmtM,'אשכול סוציו-אקונומי') });

  // by team
  const byTm = grpSum(r26.filter(r=>r.team_name), 'team_name', 'total_budget');
  const tmT10 = byTm.slice(0,10);
  mc('ba_byTeam', { type:'bar', data:{ labels:tmT10.map(e=>e[0]),
    datasets:[{data:tmT10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // threshold breakdown
  const fail = r26.filter(r => r.is_pass_threshold_condition === 'לא עבר');
  const fNames = [...new Set(fail.map(r=>r.society_name||r.association_name))].slice(0,12);
  mc('ba_thresholdBreakdown', { type:'bar', data:{ labels:['סף מקצועי','סף מנהלי','סף מלא (שניהם)'],
    datasets: fNames.map((nm,i) => {
      const my = fail.filter(r=>(r.society_name||r.association_name)===nm);
      const pf = my.some(r=>r.is_pass_professional_condition==='לא')?1:0;
      const af = my.some(r=>r.is_pass_admin_condition==='לא')?1:0;
      return {label:nm, data:[pf,af,(pf&&af)?1:0], backgroundColor:ENT_C[i%ENT_C.length], borderColor:'#FFF', borderWidth:1.5, barThickness:38};
    })}, options:threshOpts() });

  // YoY
  const m26 = Object.fromEntries(grpSum(r26,'society_name','total_budget'));
  const m25 = Object.fromEntries(grpSum(r25,'society_name','total_budget'));
  const names = bySoc.slice(0,10).map(e=>e[0]);
  mc('ba_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>+((m26[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2},
      {label:'2025', data:names.map(n=>+((m25[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtM) });
  const t25 = r25.reduce((s,r)=>s+(r.total_budget||0),0);
  mc('ba_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[+(t25/1e6).toFixed(1),+(tot/1e6).toFixed(1)], backgroundColor:[TEAL_L,TEAL], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtM) });
}


// ============================================================
// RENDER: Athletes / Federations (AF)
// ============================================================
function renderAF() {
  const p = pg('af');
  const ath = fATH(MOCK.fact_athlete, p, 'איגוד');
  const ath26 = ath.filter(a => a.support_request_year === 2026);
  const ath25 = ath.filter(a => a.support_request_year === 2025);

  const total = ath26.length;
  const fedIds = new Set(ath26.map(a=>a.association_id));
  const avg = fedIds.size ? Math.round(total/fedIds.size) : 0;
  const femPct = total ? ((ath26.filter(a=>a.athlete_gender==='נקבה').length/total)*100).toFixed(1)+'%' : '0%';
  setKPI(p, [fmtN(total), fmtN(fedIds.size), fmtN(avg), femPct]);

  // by federation
  const byFed = grpCnt(ath26, 'association_name');
  mc('af_byFederation', { type:'bar', data:{ labels:byFed.slice(0,10).map(e=>e[0]),
    datasets:[{data:byFed.slice(0,10).map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // olympic doughnut
  const oC = ath26.filter(a => BR(a.branch_id)?.is_olympic_branch===1).length;
  const oP = total ? Math.round(oC/total*100) : 0;
  mc('af_olympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[oP,100-oP], backgroundColor:[AMBER,AMBER_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // branch type doughnut
  const tC = ath26.filter(a => BR(a.branch_id)?.personal_or_group==='קבוצתי').length;
  const tP = total ? Math.round(tC/total*100) : 0;
  mc('af_branchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[tP,100-tP], backgroundColor:[AMBER,AMBER_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // gender by federation
  const topFeds = byFed.slice(0,8).map(e=>e[0]);
  const maleByFed = topFeds.map(n => ath26.filter(a=>a.association_name===n&&a.athlete_gender==='זכר').length);
  const femByFed = topFeds.map(n => ath26.filter(a=>a.association_name===n&&a.athlete_gender==='נקבה').length);
  mc('af_genderByFed', { type:'bar', data:{ labels:topFeds,
    datasets:[
      {label:'גברים', data:maleByFed, backgroundColor:AMBER, borderRadius:2, barThickness:16},
      {label:'נשים', data:femByFed, backgroundColor:AMBER_L, borderRadius:2, barThickness:16}
    ]}, options:stackHbarOpts(fmtN) });

  // age distribution
  const mAge = ageDist(ath26, 'זכר');
  const fAge = ageDist(ath26, 'נקבה');
  mc('af_byAge', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים', data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // YoY
  const byFed26 = Object.fromEntries(grpCnt(ath26,'association_name'));
  const byFed25 = Object.fromEntries(grpCnt(ath25,'association_name'));
  const names = byFed.slice(0,10).map(e=>e[0]);
  mc('af_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>byFed26[n]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'2025', data:names.map(n=>byFed25[n]||0), backgroundColor:AMBER_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtN) });
  mc('af_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[ath25.length, ath26.length], backgroundColor:[AMBER_L,AMBER], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtN) });
}


// ============================================================
// RENDER: Athletes / Associations (AA)
// ============================================================
function renderAA() {
  const p = pg('aa');
  const ath = fATH(MOCK.fact_athlete, p, 'איגוד-אם');
  const a26 = ath.filter(a=>a.support_request_year===2026);
  const a25 = ath.filter(a=>a.support_request_year===2025);

  const total = a26.length;
  const socIds = new Set(a26.filter(a=>a.society_id).map(a=>a.society_id));
  const avg = socIds.size ? Math.round(total/socIds.size) : 0;
  const tmCodes = new Set(a26.filter(a=>a.team_code).map(a=>a.team_code));
  setKPI(p, [fmtN(total), fmtN(socIds.size), fmtN(avg), fmtN(tmCodes.size)]);

  // by society
  const bySoc = grpCnt(a26, 'society_name');
  mc('aa_byAssoc', { type:'bar', data:{ labels:bySoc.slice(0,10).map(e=>e[0]),
    datasets:[{data:bySoc.slice(0,10).map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // by city
  const byCity = grpCnt(a26, 'authority_name');
  const cT10 = byCity.filter(e=>e[0]!=='לא ידוע').slice(0,10);
  mc('aa_byCity', { type:'bar', data:{ labels:cT10.map(e=>e[0]),
    datasets:[{data:cT10.map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // by peripherality
  const periM = byCluster(a26, 'peripherality_cluster');
  mc('aa_byPeriphery', { type:'bar', data:{ labels:['1 - פריפריאלי','2','3','4','5 - מרכז'],
    datasets:[{data:[1,2,3,4,5].map(k=>periM[k]||0), backgroundColor:AMBER, borderRadius:2, barThickness:22}]}, options:hbarOpts(fmtN) });

  // by socioeconomic
  const socM = byCluster(a26, 'socioeconomic_cluster');
  mc('aa_bySocio', { type:'line', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{data:[1,2,3,4,5,6,7,8,9,10].map(k=>socM[k]||0),
      borderColor:AMBER, backgroundColor:'rgba(180,83,9,.1)', fill:true, tension:.35, pointRadius:3,
      pointBackgroundColor:AMBER, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2}]},
    options:lineOpts(fmtN,'אשכול סוציו-אקונומי') });

  // by team
  const byTm = grpCnt(a26.filter(a=>a.team_name), 'team_name');
  mc('aa_byTeam', { type:'bar', data:{ labels:byTm.slice(0,10).map(e=>e[0]),
    datasets:[{data:byTm.slice(0,10).map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:16}]}, options:hbarOpts(fmtN) });

  // age distribution
  const mAge = ageDist(a26,'זכר'), fAge = ageDist(a26,'נקבה');
  mc('aa_byAge', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים', data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // YoY
  const m26 = Object.fromEntries(grpCnt(a26,'society_name'));
  const m25 = Object.fromEntries(grpCnt(a25,'society_name'));
  const names = bySoc.slice(0,10).map(e=>e[0]);
  mc('aa_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>m26[n]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'2025', data:names.map(n=>m25[n]||0), backgroundColor:AMBER_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtN) });
  mc('aa_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[a25.length, a26.length], backgroundColor:[AMBER_L,AMBER], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtN) });
}


// ============================================================
// RENDER: Women's Sport (WG)
// ============================================================
function renderWG() {
  const p = pg('wg');
  // SR data for counts
  const allSR = MOCK.fact_support_request_spo;
  const fsr = fSR(allSR, p, 'איגוד');
  const sr26 = fsr.filter(r=>r.support_request_year===2026);
  // Athlete data for demographics
  const ath = fATH(MOCK.fact_athlete, p, 'איגוד');
  const a26 = ath.filter(a=>a.support_request_year===2026);
  const females26 = a26.filter(a=>a.athlete_gender==='נקבה');

  const femTotal = sr26.reduce((s,r)=>s+(r.female_cnt||0),0);
  const femCoaches = sr26.reduce((s,r)=>s+(r.female_coaches_cnt||0),0);
  const femMgmt = sr26.reduce((s,r)=>s+(r.female_management_cnt||0),0);
  const totalAll = sr26.reduce((s,r)=>s+(r.male_cnt||0)+(r.female_cnt||0),0);
  const femPct = totalAll ? ((femTotal/totalAll)*100).toFixed(1)+'%' : '0%';
  setKPI(p, [fmtN(femTotal), fmtN(femCoaches), fmtN(femMgmt), femPct]);

  // YoY gender trend (2025 vs 2026)
  const sr25 = fsr.filter(r=>r.support_request_year===2025);
  const mAch25 = sr25.reduce((s,r)=>s+(r.male_achievement_score||0),0);
  const fAch25 = sr25.reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const mAch26 = sr26.reduce((s,r)=>s+(r.male_achievement_score||0),0);
  const fAch26 = sr26.reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const mChg = mAch25 ? ((mAch26-mAch25)/mAch25*100) : 0;
  const fChg = fAch25 ? ((fAch26-fAch25)/fAch25*100) : 0;
  const gap = fChg - mChg;
  mc('wg_yoyGenderTrend', { type:'line', data:{ labels:['2025','2026'],
    datasets:[
      {label:'גברים — שינוי %', data:[0, +mChg.toFixed(1)], borderColor:AMBER, fill:false, tension:.3, pointRadius:4, pointBackgroundColor:AMBER, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2},
      {label:'נשים — שינוי %', data:[0, +fChg.toFixed(1)], borderColor:WOMEN, fill:false, tension:.3, pointRadius:4, pointBackgroundColor:WOMEN, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2},
      {label:'ההפרש (נשים − גברים)', data:[0, +gap.toFixed(1)], borderColor:'#1F2937', backgroundColor:'rgba(31,41,55,.08)', fill:true, tension:.3, pointRadius:5, pointBackgroundColor:'#1F2937', pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2.5}
    ]}, options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
        tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+(c.parsed.y>0?'+':'')+c.parsed.y.toFixed(1)+'%'}},
        dataLabels:{formatter:v=>(v>0?'+':'')+v.toFixed(1)+'%'} },
      scales:{ x:{ticks:{font:{size:12,weight:'500'},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
               y:{ticks:{callback:v=>(v>0?'+':'')+v+'%',font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}} } } });

  // women by branch
  const wByBr = grpCnt(females26, 'branch_name');
  mc('wg_byBranch', { type:'bar', data:{ labels:wByBr.slice(0,10).map(e=>e[0]),
    datasets:[{data:wByBr.slice(0,10).map(e=>e[1]), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // branch type doughnut
  const wTeam = females26.filter(a => BR(a.branch_id)?.personal_or_group==='קבוצתי').length;
  const wTot = females26.length || 1;
  const wTP = Math.round(wTeam/wTot*100);
  mc('wg_byBranchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[wTP,100-wTP], backgroundColor:[WOMEN,WOMEN_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // olympic doughnut
  const wOly = females26.filter(a => BR(a.branch_id)?.is_olympic_branch===1).length;
  const wOP = Math.round(wOly/wTot*100);
  mc('wg_byOlympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[wOP,100-wOP], backgroundColor:[WOMEN,WOMEN_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // women's teams by federation
  const wTmByFed = grpSum(sr26.filter(r=>r.female_cnt>0), 'association_name', 'female_cnt');
  mc('wg_teamsByFed', { type:'bar', data:{ labels:wTmByFed.slice(0,10).map(e=>e[0]),
    datasets:[{data:wTmByFed.slice(0,10).map(e=>e[1]), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // women's teams by society
  const wTmBySoc = grpSum(sr26.filter(r=>r.female_cnt>0&&r.society_name), 'society_name', 'female_cnt');
  mc('wg_teamsByAssoc', { type:'bar', data:{ labels:wTmBySoc.slice(0,10).map(e=>e[0]),
    datasets:[{data:wTmBySoc.slice(0,10).map(e=>e[1]), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // female coaches by federation
  const coByFed = grpSum(sr26, 'association_name', 'female_coaches_cnt');
  mc('wg_coachesByFed', { type:'bar', data:{ labels:coByFed.slice(0,10).map(e=>e[0]),
    datasets:[{data:coByFed.slice(0,10).map(e=>e[1]), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // female management by federation
  const mgByFed = grpSum(sr26, 'association_name', 'female_management_cnt');
  mc('wg_managementByFed', { type:'bar', data:{ labels:mgByFed.slice(0,10).map(e=>e[0]),
    datasets:[{data:mgByFed.slice(0,10).map(e=>e[1]), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // age by gender
  const mAge = ageDist(a26,'זכר'), fAge = ageDist(a26,'נקבה');
  mc('wg_ageByGender', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים', data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // socioeconomic by gender
  const mSocio = byCluster(a26, 'socioeconomic_cluster', 'זכר');
  const fSocio = byCluster(a26, 'socioeconomic_cluster', 'נקבה');
  mc('wg_socioByGender', { type:'bar', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[
      {label:'גברים', data:[1,2,3,4,5,6,7,8,9,10].map(k=>mSocio[k]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'נשים', data:[1,2,3,4,5,6,7,8,9,10].map(k=>fSocio[k]||0), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול סוציו-אקונומי') });

  // peripherality by gender
  const mPeri = byCluster(a26, 'peripherality_cluster', 'זכר');
  const fPeri = byCluster(a26, 'peripherality_cluster', 'נקבה');
  mc('wg_periByGender', { type:'bar', data:{ labels:['1 - פריפריאלי','2','3','4','5 - מרכז'],
    datasets:[
      {label:'גברים', data:[1,2,3,4,5].map(k=>mPeri[k]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'נשים', data:[1,2,3,4,5].map(k=>fPeri[k]||0), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול פריפריאליות') });
}


// ============================================================
// RENDER: Women's Score (WS)
// ============================================================
function renderWS() {
  const p = pg('ws');
  const allSR = MOCK.fact_support_request_spo;
  const fsr = fSR(allSR, p, 'איגוד');
  const sr26 = fsr.filter(r=>r.support_request_year===2026);
  const sr25 = fsr.filter(r=>r.support_request_year===2025);
  const ath = fATH(MOCK.fact_athlete, p, 'איגוד');
  const a26 = ath.filter(a=>a.support_request_year===2026);

  const femAch = sr26.reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const wpScore = sr26.reduce((s,r)=>s+(r.women_promotion_score||0),0);
  const maleAch = sr26.reduce((s,r)=>s+(r.male_achievement_score||0),0);
  const ratio = maleAch ? (femAch/maleAch).toFixed(2) : '0';
  const totalAch = femAch + maleAch;
  const pctAch = totalAch ? ((femAch/totalAch)*100).toFixed(1)+'%' : '0%';
  setKPI(p, [fmtN(Math.round(femAch)), fmtN(Math.round(wpScore)), ratio, pctAch]);

  // promo trend
  const wp25 = sr25.reduce((s,r)=>s+(r.women_promotion_score||0),0);
  mc('ws_promoTrend', { type:'line', data:{ labels:['2025','2026'],
    datasets:[{data:[Math.round(wp25), Math.round(wpScore)],
      borderColor:WOMEN, backgroundColor:'rgba(134,25,143,.10)', fill:true, tension:.3, pointRadius:4,
      pointBackgroundColor:WOMEN, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2.5}]},
    options:lineOpts(fmtN,'שנה') });

  // score by branch
  const byBr = grpSum(sr26, 'branch_name', 'female_achievement_score');
  mc('ws_byScoreBranch', { type:'bar', data:{ labels:byBr.slice(0,10).map(e=>e[0]),
    datasets:[{data:byBr.slice(0,10).map(e=>Math.round(e[1])), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // branch type doughnut
  const tS = sr26.filter(r=>BR(r.branch_id)?.personal_or_group==='קבוצתי').reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const tP = femAch ? Math.round(tS/femAch*100) : 0;
  mc('ws_byScoreBranchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[tP,100-tP], backgroundColor:[WOMEN,WOMEN_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // olympic doughnut
  const oS = sr26.filter(r=>BR(r.branch_id)?.is_olympic_branch===1).reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const oP = femAch ? Math.round(oS/femAch*100) : 0;
  mc('ws_byScoreOlympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[oP,100-oP], backgroundColor:[WOMEN,WOMEN_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // age score by gender
  const mAgeS = {}, fAgeS = {};
  a26.forEach(a => {
    if (a.age >= 6 && a.age <= 50) {
      if (a.athlete_gender === 'זכר') mAgeS[a.age] = (mAgeS[a.age]||0) + (a.athlete_final_score||0);
      else fAgeS[a.age] = (fAgeS[a.age]||0) + (a.athlete_final_score||0);
    }
  });
  const ageLabels = []; for (let i=6;i<=50;i++) ageLabels.push(String(i));
  mc('ws_ageScoreByGender', { type:'line', data:{ labels:ageLabels,
    datasets:[
      {label:'גברים — ניקוד', data:ageLabels.map((_,i)=>Math.round(mAgeS[i+6]||0)), borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים — ניקוד', data:ageLabels.map((_,i)=>Math.round(fAgeS[i+6]||0)), borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // socio score by gender
  const mSocS = byClusterScore(a26, 'socioeconomic_cluster', 'זכר');
  const fSocS = byClusterScore(a26, 'socioeconomic_cluster', 'נקבה');
  mc('ws_socioScoreByGender', { type:'bar', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[
      {label:'גברים — ניקוד', data:[1,2,3,4,5,6,7,8,9,10].map(k=>Math.round(mSocS[k]||0)), backgroundColor:AMBER, borderRadius:2},
      {label:'נשים — ניקוד', data:[1,2,3,4,5,6,7,8,9,10].map(k=>Math.round(fSocS[k]||0)), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול סוציו-אקונומי') });

  // peri score by gender
  const mPeriS = byClusterScore(a26, 'peripherality_cluster', 'זכר');
  const fPeriS = byClusterScore(a26, 'peripherality_cluster', 'נקבה');
  mc('ws_periScoreByGender', { type:'bar', data:{ labels:['1 - פריפריאלי','2','3','4','5 - מרכז'],
    datasets:[
      {label:'גברים — ניקוד', data:[1,2,3,4,5].map(k=>Math.round(mPeriS[k]||0)), backgroundColor:AMBER, borderRadius:2},
      {label:'נשים — ניקוד', data:[1,2,3,4,5].map(k=>Math.round(fPeriS[k]||0)), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול פריפריאליות') });

  // women's score by socio (line)
  const fSocLine = srByCluster(sr26, 'socioeconomic_cluster', 'female_achievement_score');
  mc('ws_byScoreSocio', { type:'line', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{data:[1,2,3,4,5,6,7,8,9,10].map(k=>Math.round(fSocLine[k]||0)),
      borderColor:WOMEN, backgroundColor:'rgba(134,25,143,.10)', fill:true, tension:.3, pointRadius:3,
      pointBackgroundColor:WOMEN, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2}]},
    options:lineOpts(fmtN,'אשכול סוציו-אקונומי') });

  // women's score by peripherality (bar)
  const fPeriLine = srByCluster(sr26, 'peripherality_cluster', 'female_achievement_score');
  mc('ws_byScorePeri', { type:'bar', data:{ labels:['1 - פריפריאלי','2','3','4','5 - מרכז'],
    datasets:[{data:[1,2,3,4,5].map(k=>Math.round(fPeriLine[k]||0)), backgroundColor:WOMEN, borderRadius:2, barThickness:22}]},
    options:hbarOpts(fmtN) });

  // women's score by city
  const fByCity = grpSum(sr26.filter(r=>r.authority_name), 'authority_name', 'female_achievement_score');
  mc('ws_byScoreCity', { type:'bar', data:{ labels:fByCity.slice(0,12).map(e=>e[0]),
    datasets:[{data:fByCity.slice(0,12).map(e=>Math.round(e[1])), backgroundColor:WOMEN, borderRadius:2, barThickness:16}]},
    options:hbarOpts(fmtN) });
}


// ============================================================
// FILTER POPULATION + WIRING
// ============================================================
function populateFilters() {
  const assocNames = MOCK.dim_association.map(a=>a.association_name).sort();
  const branchNames = [...new Set(MOCK.dim_branchs.map(b=>b.branch_name))].sort();
  const societyNames = MOCK.dim_society.map(s=>s.society_name).sort();
  const teamNames = MOCK.dim_teams.map(t=>t.team_name).sort();

  // BF
  let p = pg('bf');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'ענף'), branchNames);

  // BA
  p = pg('ba');
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);

  // AF
  p = pg('af');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'ענף'), branchNames);

  // AA
  p = pg('aa');
  fillSel(sel(p,'איגוד-אם'), assocNames);
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);

  // WG
  p = pg('wg');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);

  // WS
  p = pg('ws');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);
}

function wireFilters() {
  ['bf','ba','af','aa','wg','ws'].forEach(pageId => {
    const p = pg(pageId);
    // Wire all selects
    p.querySelectorAll('.filter select').forEach(s => {
      s.addEventListener('change', () => renderPage(pageId));
    });
    // Wire age inputs
    p.querySelectorAll('.age-num').forEach(inp => {
      inp.addEventListener('change', () => renderPage(pageId));
    });
    // Wire reset button
    const resetBtn = p.querySelector('.filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        p.querySelectorAll('.filter select').forEach(s => s.value = '');
        p.querySelectorAll('.age-num').forEach((inp, i) => inp.value = i === 0 ? '6' : '50');
        renderPage(pageId);
      });
    }
  });
}

// ============================================================
// PAGE ROUTER
// ============================================================
const renderers = { bf:renderBF, ba:renderBA, af:renderAF, aa:renderAA, wg:renderWG, ws:renderWS };
function renderPage(id) { if (renderers[id]) renderers[id](); }

// ============================================================
// INIT
// ============================================================
populateFilters();
wireFilters();
renderBF(); // eager render first page

})();
