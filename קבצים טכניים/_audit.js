const fs=require('fs');
eval(fs.readFileSync('data.js','utf8').replace('const MOCK','var MOCK'));
const sr = MOCK.fact_support_request_spo;
const ath = MOCK.fact_athlete;
const br = MOCK.dim_branchs;

console.log('=== DIMENSIONS ===');
console.log('Associations:', MOCK.dim_association.length);
console.log('Branches:', br.length);
console.log('Authorities:', MOCK.dim_authority.length);
console.log('Societies:', MOCK.dim_society.length);
console.log('Teams:', MOCK.dim_teams.length);

console.log('\n=== FACTS ===');
console.log('SR:', sr.length, '| Athletes:', ath.length);

console.log('\n=== REQUEST TYPES ===');
const byType = {}; sr.forEach(r => { byType[r.request_type] = (byType[r.request_type]||0)+1; });
console.log(byType);
const byFilter = {}; sr.forEach(r => { byFilter[r.request_type_filter] = (byFilter[r.request_type_filter]||0)+1; });
console.log('By filter:', byFilter);

console.log('\n=== YEARS ===');
const byYear = {}; sr.forEach(r => { byYear[r.support_request_year] = (byYear[r.support_request_year]||0)+1; });
console.log(byYear);

console.log('\n=== BRANCH COVERAGE ===');
const srBr = new Set(sr.map(r=>r.branch_id));
const athBr = new Set(ath.map(a=>a.branch_id));
const unused = br.filter(b => !srBr.has(b.branch_id));
console.log('In SR:', srBr.size+'/'+br.length, '| In athletes:', athBr.size+'/'+br.length);
if (unused.length) console.log('Unused:', unused.map(b=>b.branch_name).join(', '));

console.log('\n=== AUTHORITY COVERAGE ===');
const srAu = new Set(sr.filter(r=>r.authority_id).map(r=>r.authority_id));
const athAu = new Set(ath.filter(a=>a.authority_id).map(a=>a.authority_id));
const unusedAu = MOCK.dim_authority.filter(a => !athAu.has(a.authority_id));
console.log('In SR:', srAu.size+'/'+MOCK.dim_authority.length, '| In athletes:', athAu.size+'/'+MOCK.dim_authority.length);
if (unusedAu.length) console.log('Unused:', unusedAu.map(a=>a.authority_name).join(', '));

console.log('\n=== SOCIETY COVERAGE ===');
const srSoc = new Set(sr.filter(r=>r.society_id).map(r=>r.society_id));
const unusedSoc = MOCK.dim_society.filter(s => !srSoc.has(s.society_id));
console.log('In SR:', srSoc.size+'/'+MOCK.dim_society.length);
if (unusedSoc.length) console.log('Unused:', unusedSoc.map(s=>s.society_name).join(', '));

console.log('\n=== TEAM COVERAGE ===');
const srTm = new Set(sr.filter(r=>r.team_code).map(r=>r.team_code));
const athTm = new Set(ath.filter(a=>a.team_code).map(a=>a.team_code));
console.log('In SR:', srTm.size+'/'+MOCK.dim_teams.length, '| In athletes:', athTm.size+'/'+MOCK.dim_teams.length);

console.log('\n=== ATHLETE ENUMS ===');
const count = (arr, field) => { const m={}; arr.forEach(r=>{m[r[field]]=(m[r[field]]||0)+1}); return m; };
console.log('Gender:', count(ath,'athlete_gender'));
console.log('Age cat:', count(ath,'athlete_age_category'));
console.log('Insurance:', count(ath,'athlete_has_insurance'));
console.log('Medical:', count(ath,'athlete_has_medical_check'));
console.log('Threshold:', count(ath,'is_pass_threshold_condition'));
console.log('League:', count(ath.filter(a=>a.league_type),'league_type'));
console.log('Age range:', Math.min(...ath.map(a=>a.age))+' - '+Math.max(...ath.map(a=>a.age)));

console.log('\n=== SR NUMERIC FIELDS ===');
['total_budget','professional_score','coach_association_score','branch_cost_score',
 'women_promotion_score','excellent_center_score','male_achievement_score','female_achievement_score',
 'male_score','female_score','male_cnt','female_cnt','female_coaches_cnt','female_management_cnt',
 'achievement_score'].forEach(f => {
  const nz = sr.filter(r=>r[f]!=null&&r[f]!==0).length;
  console.log('  '+f+': '+(nz>0?nz+'/'+sr.length+' non-zero':'*** ZERO/MISSING ***'));
});

console.log('\n=== SR THRESHOLD BREAKDOWN ===');
console.log('is_pass_threshold:', count(sr,'is_pass_threshold_condition'));
console.log('is_pass_professional:', count(sr,'is_pass_professional_condition'));
console.log('is_pass_admin:', count(sr,'is_pass_admin_condition'));

console.log('\n=== PERIPHERALITY DISTRIBUTION ===');
[1,2,3,4,5].forEach(k => {
  const auIds = new Set(MOCK.dim_authority.filter(a=>a.peripherality_cluster===k).map(a=>a.authority_id));
  const c = ath.filter(a=>auIds.has(a.authority_id)).length;
  console.log('  Cluster '+k+': '+c+' athletes');
});

console.log('\n=== SOCIOECONOMIC DISTRIBUTION ===');
[1,2,3,4,5,6,7,8,9,10].forEach(k => {
  const auIds = new Set(MOCK.dim_authority.filter(a=>a.socioeconomic_cluster===k).map(a=>a.authority_id));
  const c = ath.filter(a=>auIds.has(a.authority_id)).length;
  console.log('  Cluster '+k+': '+c+' athletes');
});

console.log('\n=== CROSS-DIMENSIONAL: אגודה SR with authority ===');
const aguda = sr.filter(r=>r.request_type_filter==='אגודה');
console.log('אגודה SR with authority_id:', aguda.filter(r=>r.authority_id).length+'/'+aguda.length);
console.log('Athletes with authority_id:', ath.filter(a=>a.authority_id).length+'/'+ath.length);

console.log('\n=== OLYMPIC SPLIT ===');
console.log('is_olympic_branch values:', [...new Set(br.map(b=>b.is_olympic_branch))]);
console.log('sport_type values:', [...new Set(br.map(b=>b.sport_type))]);
console.log('Olympic branches:', br.filter(b=>b.is_olympic_branch===1).length);
console.log('Non-olympic:', br.filter(b=>b.is_olympic_branch===0).length);
