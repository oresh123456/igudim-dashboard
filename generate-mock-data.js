#!/usr/bin/env node
// Generates mock-data.js with enough volume for full drilldown/filtering.
// Run: node generate-mock-data.js
// Output: mock-data.js (overwrites)

const fs = require('fs');

// ── Seeded PRNG (deterministic) ──
let _seed = 42;
function rand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed - 1) / 2147483646; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function pickWeighted(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total, cum = 0;
  for (let i = 0; i < arr.length; i++) { cum += weights[i]; if (r < cum) return arr[i]; }
  return arr[arr.length - 1];
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ============================================================
// DIMENSION TABLES
// ============================================================

const dim_association = [
  { association_id: 1001, association_name: 'התאחדות הכדורגל', provider_num: 'SP-5001', main_branch_name: 'כדורגל', main_branch_code: 'BR-001' },
  { association_id: 1002, association_name: 'איגוד הכדורסל', provider_num: 'SP-5002', main_branch_name: 'כדורסל', main_branch_code: 'BR-002' },
  { association_id: 1003, association_name: 'איגוד השחייה', provider_num: 'SP-5003', main_branch_name: 'שחייה', main_branch_code: 'BR-003' },
  { association_id: 1004, association_name: 'איגוד האתלטיקה', provider_num: 'SP-5004', main_branch_name: 'אתלטיקה', main_branch_code: 'BR-004' },
  { association_id: 1005, association_name: 'איגוד הטניס', provider_num: 'SP-5005', main_branch_name: 'טניס', main_branch_code: 'BR-005' },
  { association_id: 1006, association_name: 'איגוד הכדורעף', provider_num: 'SP-5006', main_branch_name: 'כדורעף', main_branch_code: 'BR-006' },
  { association_id: 1007, association_name: 'איגוד ההתעמלות', provider_num: 'SP-5007', main_branch_name: 'התעמלות', main_branch_code: 'BR-007' },
  { association_id: 1008, association_name: "איגוד הג'ודו", provider_num: 'SP-5008', main_branch_name: "ג'ודו", main_branch_code: 'BR-008' },
  { association_id: 1009, association_name: 'התאחדות השייט', provider_num: 'SP-5009', main_branch_name: 'שייט', main_branch_code: 'BR-009' },
  { association_id: 1010, association_name: 'איגוד הכדוריד', provider_num: 'SP-5010', main_branch_name: 'כדוריד', main_branch_code: 'BR-010' },
  { association_id: 1011, association_name: 'התאחדות ספורט נכים', provider_num: 'SP-5011', main_branch_name: 'ספורט נכים', main_branch_code: 'BR-040' },
  { association_id: 1012, association_name: 'איגוד האופניים', provider_num: 'SP-5012', main_branch_name: 'אופניים', main_branch_code: 'BR-011' },
  { association_id: 1013, association_name: 'איגוד הטאקוונדו', provider_num: 'SP-5013', main_branch_name: 'טאקוונדו', main_branch_code: 'BR-012' },
  { association_id: 1014, association_name: 'איגוד הרכיבה על סוסים', provider_num: 'SP-5014', main_branch_name: 'רכיבה על סוסים', main_branch_code: 'BR-013' },
  { association_id: 1015, association_name: 'התאחדות השחמט', provider_num: 'SP-5015', main_branch_name: 'שחמט', main_branch_code: 'BR-014' },
  { association_id: 1016, association_name: 'איגוד הקראטה', provider_num: 'SP-5016', main_branch_name: 'קראטה', main_branch_code: 'BR-015' },
  { association_id: 1017, association_name: 'ארגון הספורט של החרשים', provider_num: 'SP-5017', main_branch_name: 'ספורט חרשים', main_branch_code: 'BR-041' },
  { association_id: 1018, association_name: 'ארגון ספורט לקויות ראיה', provider_num: 'SP-5018', main_branch_name: 'ספורט לקויי ראייה', main_branch_code: 'BR-042' },
  { association_id: 1019, association_name: 'איגוד הסיוף', provider_num: 'SP-5019', main_branch_name: 'סיוף', main_branch_code: 'BR-016' },
  { association_id: 1020, association_name: 'איגוד גלישת הגלים', provider_num: 'SP-5020', main_branch_name: 'גלישת גלים', main_branch_code: 'BR-017' },
  { association_id: 1021, association_name: 'איגוד הקליעה', provider_num: 'SP-5021', main_branch_name: 'קליעה', main_branch_code: 'BR-018' },
  { association_id: 1022, association_name: 'איגוד האיגרוף', provider_num: 'SP-5022', main_branch_name: 'איגרוף', main_branch_code: 'BR-019' },
  { association_id: 1023, association_name: 'איגוד הקשתות', provider_num: 'SP-5023', main_branch_name: 'קשתות', main_branch_code: 'BR-020' },
  { association_id: 1024, association_name: 'התאחדות הראגבי', provider_num: 'SP-5024', main_branch_name: 'ראגבי', main_branch_code: 'BR-021' },
  { association_id: 1025, association_name: 'איגוד טריאתלון', provider_num: 'SP-5025', main_branch_name: 'טריאתלון', main_branch_code: 'BR-022' },
];

const dim_branchs = [
  { branch_id: 101, branch_code: 'BR-001', branch_name: 'כדורגל', personal_or_group: 'קבוצתי', branch_type: 'על', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורגל', main_branch_code: 'BR-001', status_code: 1 },
  { branch_id: 102, branch_code: 'BR-002', branch_name: 'כדורסל', personal_or_group: 'קבוצתי', branch_type: 'על', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורסל', main_branch_code: 'BR-002', status_code: 1 },
  { branch_id: 103, branch_code: 'BR-003', branch_name: 'שחייה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'שחייה', main_branch_code: 'BR-003', status_code: 1 },
  { branch_id: 104, branch_code: 'BR-004', branch_name: 'אתלטיקה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'אתלטיקה', main_branch_code: 'BR-004', status_code: 1 },
  { branch_id: 105, branch_code: 'BR-005', branch_name: 'טניס', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'טניס', main_branch_code: 'BR-005', status_code: 1 },
  { branch_id: 106, branch_code: 'BR-006', branch_name: 'כדורעף', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורעף', main_branch_code: 'BR-006', status_code: 1 },
  { branch_id: 107, branch_code: 'BR-007', branch_name: 'התעמלות', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'התעמלות', main_branch_code: 'BR-007', status_code: 1 },
  { branch_id: 108, branch_code: 'BR-008', branch_name: "ג'ודו", personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: "ג'ודו", main_branch_code: 'BR-008', status_code: 1 },
  { branch_id: 109, branch_code: 'BR-009', branch_name: 'שייט', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'שייט', main_branch_code: 'BR-009', status_code: 1 },
  { branch_id: 110, branch_code: 'BR-010', branch_name: 'כדוריד', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדוריד', main_branch_code: 'BR-010', status_code: 1 },
  { branch_id: 111, branch_code: 'BR-011', branch_name: 'אופניים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'אופניים', main_branch_code: 'BR-011', status_code: 1 },
  { branch_id: 112, branch_code: 'BR-012', branch_name: 'טאקוונדו', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'טאקוונדו', main_branch_code: 'BR-012', status_code: 1 },
  { branch_id: 113, branch_code: 'BR-013', branch_name: 'רכיבה על סוסים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'רכיבה על סוסים', main_branch_code: 'BR-013', status_code: 1 },
  { branch_id: 114, branch_code: 'BR-014', branch_name: 'שחמט', personal_or_group: 'אישי', branch_type: 'חשיבה', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'שחמט', main_branch_code: 'BR-014', status_code: 1 },
  { branch_id: 115, branch_code: 'BR-015', branch_name: 'קראטה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'קראטה', main_branch_code: 'BR-015', status_code: 1 },
  { branch_id: 116, branch_code: 'BR-016', branch_name: 'סיוף', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'סיוף', main_branch_code: 'BR-016', status_code: 1 },
  { branch_id: 117, branch_code: 'BR-017', branch_name: 'גלישת גלים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'גלישת גלים', main_branch_code: 'BR-017', status_code: 1 },
  { branch_id: 118, branch_code: 'BR-018', branch_name: 'קליעה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'קליעה', main_branch_code: 'BR-018', status_code: 1 },
  { branch_id: 119, branch_code: 'BR-019', branch_name: 'איגרוף', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'איגרוף', main_branch_code: 'BR-019', status_code: 1 },
  { branch_id: 120, branch_code: 'BR-020', branch_name: 'קשתות', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'קשתות', main_branch_code: 'BR-020', status_code: 1 },
  { branch_id: 121, branch_code: 'BR-021', branch_name: 'ראגבי', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'ראגבי', main_branch_code: 'BR-021', status_code: 1 },
  { branch_id: 122, branch_code: 'BR-022', branch_name: 'טריאתלון', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'טריאתלון', main_branch_code: 'BR-022', status_code: 1 },
  { branch_id: 123, branch_code: 'BR-023', branch_name: 'חתירה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'חתירה', main_branch_code: 'BR-023', status_code: 1 },
  { branch_id: 124, branch_code: 'BR-024', branch_name: 'היאבקות', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'היאבקות', main_branch_code: 'BR-024', status_code: 1 },
  { branch_id: 125, branch_code: 'BR-025', branch_name: 'הרמת משקולות', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'הרמת משקולות', main_branch_code: 'BR-025', status_code: 1 },
  { branch_id: 126, branch_code: 'BR-026', branch_name: 'קיאקים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'קיאקים', main_branch_code: 'BR-026', status_code: 1 },
  { branch_id: 127, branch_code: 'BR-027', branch_name: 'בדמינטון', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'בדמינטון', main_branch_code: 'BR-027', status_code: 1 },
  { branch_id: 128, branch_code: 'BR-028', branch_name: 'טניס שולחן', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'טניס שולחן', main_branch_code: 'BR-028', status_code: 1 },
  { branch_id: 129, branch_code: 'BR-029', branch_name: 'גולף', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'גולף', main_branch_code: 'BR-029', status_code: 1 },
  { branch_id: 130, branch_code: 'BR-030', branch_name: 'טיפוס ספורטיבי', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'טיפוס ספורטיבי', main_branch_code: 'BR-030', status_code: 1 },
  { branch_id: 131, branch_code: 'BR-031', branch_name: 'קיק בוקס', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'קיק בוקס', main_branch_code: 'BR-031', status_code: 1 },
  { branch_id: 132, branch_code: 'BR-032', branch_name: 'סקווש', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'סקווש', main_branch_code: 'BR-032', status_code: 1 },
  { branch_id: 133, branch_code: 'BR-033', branch_name: "ג'יו ג'יטסו", personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: "ג'יו ג'יטסו", main_branch_code: 'BR-033', status_code: 1 },
  { branch_id: 134, branch_code: 'BR-034', branch_name: 'פוטבול אמריקני', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'פוטבול אמריקני', main_branch_code: 'BR-034', status_code: 1 },
  { branch_id: 135, branch_code: 'BR-035', branch_name: 'סופטבול', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'סופטבול', main_branch_code: 'BR-035', status_code: 1 },
  { branch_id: 136, branch_code: 'BR-036', branch_name: "ברידג'", personal_or_group: 'אישי', branch_type: 'חשיבה', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: "ברידג'", main_branch_code: 'BR-036', status_code: 1 },
  { branch_id: 137, branch_code: 'BR-037', branch_name: 'דמקה', personal_or_group: 'אישי', branch_type: 'חשיבה', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'דמקה', main_branch_code: 'BR-037', status_code: 1 },
  { branch_id: 138, branch_code: 'BR-038', branch_name: 'ספורט הריקוד', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'ספורט הריקוד', main_branch_code: 'BR-038', status_code: 1 },
  { branch_id: 139, branch_code: 'BR-039', branch_name: 'סמבו', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'סמבו', main_branch_code: 'BR-039', status_code: 1 },
  { branch_id: 140, branch_code: 'BR-040', branch_name: 'ספורט נכים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'פראלימפי', is_olympic_branch: 0, is_special_needs_branch: 1, main_branch_name: 'ספורט נכים', main_branch_code: 'BR-040', status_code: 1 },
  { branch_id: 141, branch_code: 'BR-041', branch_name: 'ספורט חרשים', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'צרכים מיוחדים', is_olympic_branch: 0, is_special_needs_branch: 1, main_branch_name: 'ספורט חרשים', main_branch_code: 'BR-041', status_code: 1 },
  { branch_id: 142, branch_code: 'BR-042', branch_name: 'ספורט לקויי ראייה', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'צרכים מיוחדים', is_olympic_branch: 0, is_special_needs_branch: 1, main_branch_name: 'ספורט לקויי ראייה', main_branch_code: 'BR-042', status_code: 1 },
  { branch_id: 143, branch_code: 'BR-043', branch_name: 'כדורסל 3X3', personal_or_group: 'קבוצתי', branch_type: 'מועדף', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורסל 3X3', main_branch_code: 'BR-043', status_code: 1 },
  { branch_id: 144, branch_code: 'BR-044', branch_name: 'כדורעף חופים', personal_or_group: 'קבוצתי', branch_type: 'מועדף', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורעף חופים', main_branch_code: 'BR-044', status_code: 1 },
  { branch_id: 145, branch_code: 'BR-045', branch_name: 'כדורעף אולמות', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 1, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורעף', main_branch_code: 'BR-006', status_code: 1 },
  { branch_id: 146, branch_code: 'BR-046', branch_name: 'כדורמים', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'כדורמים', main_branch_code: 'BR-046', status_code: 1 },
  { branch_id: 147, branch_code: 'BR-047', branch_name: 'הוקי קרח', personal_or_group: 'קבוצתי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'הוקי קרח', main_branch_code: 'BR-047', status_code: 1 },
  { branch_id: 148, branch_code: 'BR-048', branch_name: 'פיתוח הגוף', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'רגיל', is_olympic_branch: 0, is_special_needs_branch: 0, main_branch_name: 'פיתוח הגוף', main_branch_code: 'BR-048', status_code: 1 },
  { branch_id: 149, branch_code: 'BR-049', branch_name: 'החלקה על הקרח', personal_or_group: 'אישי', branch_type: 'רגיל', is_sub_branch: 0, sport_type: 'אולימפי', is_olympic_branch: 1, is_special_needs_branch: 0, main_branch_name: 'החלקה על הקרח', main_branch_code: 'BR-049', status_code: 1 },
];

const dim_authority = [
  { authority_id: 5000, authority_name: 'תל אביב-יפו', crm_district: 'תל אביב', head_authority_name: 'ראש עיריית ת"א', key_authority: '5000 - תל אביב-יפו', lamas_district: 'תל אביב', municipal_status: 'עירייה', total_population: 467800, jews_others_pct: 91.8, jews_pct: 86.2, arab_pct: 4.2, muslim_pct: 65.0, christian_pct: 22.0, druze_pct: 0.0, total_males: 232100, total_females: 235700, total_israelis: 460200, socioeconomic_cluster: 8, peripherality_cluster: 5 },
  { authority_id: 5001, authority_name: 'ירושלים', crm_district: 'ירושלים', head_authority_name: 'ראש עיריית ירושלים', key_authority: '5001 - ירושלים', lamas_district: 'ירושלים', municipal_status: 'עירייה', total_population: 983300, jews_others_pct: 61.3, jews_pct: 56.8, arab_pct: 38.7, muslim_pct: 88.0, christian_pct: 4.5, druze_pct: 0.0, total_males: 490100, total_females: 493200, total_israelis: 936800, socioeconomic_cluster: 4, peripherality_cluster: 4 },
  { authority_id: 5002, authority_name: 'חיפה', crm_district: 'חיפה', head_authority_name: 'ראש עיריית חיפה', key_authority: '5002 - חיפה', lamas_district: 'חיפה', municipal_status: 'עירייה', total_population: 285700, jews_others_pct: 82.1, jews_pct: 77.5, arab_pct: 10.8, muslim_pct: 40.0, christian_pct: 52.0, druze_pct: 8.0, total_males: 140400, total_females: 145300, total_israelis: 279100, socioeconomic_cluster: 6, peripherality_cluster: 4 },
  { authority_id: 5003, authority_name: 'באר שבע', crm_district: 'דרום', head_authority_name: 'ראש עיריית ב"ש', key_authority: '5003 - באר שבע', lamas_district: 'דרום', municipal_status: 'עירייה', total_population: 213000, jews_others_pct: 93.5, jews_pct: 88.1, arab_pct: 6.5, muslim_pct: 95.0, christian_pct: 3.0, druze_pct: 0.0, total_males: 105900, total_females: 107100, total_israelis: 207400, socioeconomic_cluster: 4, peripherality_cluster: 3 },
  { authority_id: 5004, authority_name: 'ראשון לציון', crm_district: 'מרכז', head_authority_name: 'ראש עיריית ראשל"צ', key_authority: '5004 - ראשון לציון', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 254200, jews_others_pct: 96.8, jews_pct: 92.0, arab_pct: 1.2, muslim_pct: 60.0, christian_pct: 30.0, druze_pct: 0.0, total_males: 125600, total_females: 128600, total_israelis: 251500, socioeconomic_cluster: 7, peripherality_cluster: 5 },
  { authority_id: 5005, authority_name: 'נתניה', crm_district: 'מרכז', head_authority_name: 'ראש עיריית נתניה', key_authority: '5005 - נתניה', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 228800, jews_others_pct: 95.4, jews_pct: 89.7, arab_pct: 2.6, muslim_pct: 55.0, christian_pct: 35.0, druze_pct: 0.0, total_males: 112400, total_females: 116400, total_israelis: 225900, socioeconomic_cluster: 5, peripherality_cluster: 4 },
  { authority_id: 5006, authority_name: 'אשדוד', crm_district: 'דרום', head_authority_name: 'ראש עיריית אשדוד', key_authority: '5006 - אשדוד', lamas_district: 'דרום', municipal_status: 'עירייה', total_population: 225900, jews_others_pct: 97.2, jews_pct: 91.8, arab_pct: 1.3, muslim_pct: 50.0, christian_pct: 40.0, druze_pct: 0.0, total_males: 111500, total_females: 114400, total_israelis: 223100, socioeconomic_cluster: 4, peripherality_cluster: 4 },
  { authority_id: 5007, authority_name: 'רמת גן', crm_district: 'תל אביב', head_authority_name: 'ראש עיריית ר"ג', key_authority: '5007 - רמת גן', lamas_district: 'תל אביב', municipal_status: 'עירייה', total_population: 163480, jews_others_pct: 94.5, jews_pct: 90.1, arab_pct: 2.1, muslim_pct: 55.0, christian_pct: 35.0, druze_pct: 0.0, total_males: 80200, total_females: 83280, total_israelis: 161200, socioeconomic_cluster: 8, peripherality_cluster: 5 },
  { authority_id: 5008, authority_name: 'חולון', crm_district: 'תל אביב', head_authority_name: 'ראש עיריית חולון', key_authority: '5008 - חולון', lamas_district: 'תל אביב', municipal_status: 'עירייה', total_population: 197600, jews_others_pct: 97.0, jews_pct: 92.3, arab_pct: 1.0, muslim_pct: 45.0, christian_pct: 45.0, druze_pct: 0.0, total_males: 97200, total_females: 100400, total_israelis: 195800, socioeconomic_cluster: 6, peripherality_cluster: 5 },
  { authority_id: 5009, authority_name: 'פתח תקווה', crm_district: 'מרכז', head_authority_name: 'ראש עיריית פ"ת', key_authority: '5009 - פתח תקווה', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 247800, jews_others_pct: 96.5, jews_pct: 91.4, arab_pct: 1.5, muslim_pct: 50.0, christian_pct: 40.0, druze_pct: 0.0, total_males: 122100, total_females: 125700, total_israelis: 244500, socioeconomic_cluster: 6, peripherality_cluster: 5 },
  { authority_id: 5010, authority_name: 'הרצליה', crm_district: 'תל אביב', head_authority_name: 'ראש עיריית הרצליה', key_authority: '5010 - הרצליה', lamas_district: 'תל אביב', municipal_status: 'עירייה', total_population: 99400, jews_others_pct: 96.1, jews_pct: 92.8, arab_pct: 1.4, muslim_pct: 40.0, christian_pct: 45.0, druze_pct: 0.0, total_males: 48700, total_females: 50700, total_israelis: 98100, socioeconomic_cluster: 9, peripherality_cluster: 5 },
  { authority_id: 5011, authority_name: 'רעננה', crm_district: 'מרכז', head_authority_name: 'ראש עיריית רעננה', key_authority: '5011 - רעננה', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 78200, jews_others_pct: 97.6, jews_pct: 94.2, arab_pct: 0.8, muslim_pct: 30.0, christian_pct: 50.0, druze_pct: 0.0, total_males: 38400, total_females: 39800, total_israelis: 77600, socioeconomic_cluster: 9, peripherality_cluster: 5 },
  { authority_id: 5012, authority_name: 'כפר סבא', crm_district: 'מרכז', head_authority_name: 'ראש עיריית כפ"ס', key_authority: '5012 - כפר סבא', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 105400, jews_others_pct: 97.3, jews_pct: 93.5, arab_pct: 1.1, muslim_pct: 40.0, christian_pct: 40.0, druze_pct: 0.0, total_males: 51800, total_females: 53600, total_israelis: 104200, socioeconomic_cluster: 8, peripherality_cluster: 5 },
  { authority_id: 5013, authority_name: 'מודיעין', crm_district: 'מרכז', head_authority_name: 'ראש עיריית מודיעין', key_authority: '5013 - מודיעין', lamas_district: 'מרכז', municipal_status: 'עירייה', total_population: 95600, jews_others_pct: 99.1, jews_pct: 96.0, arab_pct: 0.2, muslim_pct: 20.0, christian_pct: 50.0, druze_pct: 0.0, total_males: 47100, total_females: 48500, total_israelis: 95200, socioeconomic_cluster: 8, peripherality_cluster: 4 },
  { authority_id: 5014, authority_name: 'אשקלון', crm_district: 'דרום', head_authority_name: 'ראש עיריית אשקלון', key_authority: '5014 - אשקלון', lamas_district: 'דרום', municipal_status: 'עירייה', total_population: 148400, jews_others_pct: 96.8, jews_pct: 91.2, arab_pct: 1.7, muslim_pct: 70.0, christian_pct: 20.0, druze_pct: 0.0, total_males: 73100, total_females: 75300, total_israelis: 146200, socioeconomic_cluster: 4, peripherality_cluster: 3 },
  { authority_id: 5015, authority_name: 'נצרת', crm_district: 'צפון', head_authority_name: 'ראש עיריית נצרת', key_authority: '5015 - נצרת', lamas_district: 'צפון', municipal_status: 'עירייה', total_population: 78600, jews_others_pct: 0.5, jews_pct: 0.0, arab_pct: 99.5, muslim_pct: 60.0, christian_pct: 39.0, druze_pct: 0.0, total_males: 38800, total_females: 39800, total_israelis: 78200, socioeconomic_cluster: 3, peripherality_cluster: 3 },
  { authority_id: 5016, authority_name: 'אילת', crm_district: 'דרום', head_authority_name: 'ראש עיריית אילת', key_authority: '5016 - אילת', lamas_district: 'דרום', municipal_status: 'עירייה', total_population: 53200, jews_others_pct: 88.4, jews_pct: 82.0, arab_pct: 3.8, muslim_pct: 70.0, christian_pct: 20.0, druze_pct: 0.0, total_males: 26800, total_females: 26400, total_israelis: 51600, socioeconomic_cluster: 4, peripherality_cluster: 1 },
  { authority_id: 5017, authority_name: 'בית שמש', crm_district: 'ירושלים', head_authority_name: 'ראש עיריית בית שמש', key_authority: '5017 - בית שמש', lamas_district: 'ירושלים', municipal_status: 'עירייה', total_population: 142800, jews_others_pct: 99.4, jews_pct: 98.0, arab_pct: 0.2, muslim_pct: 30.0, christian_pct: 40.0, druze_pct: 0.0, total_males: 71200, total_females: 71600, total_israelis: 142200, socioeconomic_cluster: 3, peripherality_cluster: 4 },
  { authority_id: 5018, authority_name: 'דימונה', crm_district: 'דרום', head_authority_name: 'ראש עיריית דימונה', key_authority: '5018 - דימונה', lamas_district: 'דרום', municipal_status: 'עירייה', total_population: 36100, jews_others_pct: 95.8, jews_pct: 89.4, arab_pct: 2.6, muslim_pct: 80.0, christian_pct: 10.0, druze_pct: 0.0, total_males: 17800, total_females: 18300, total_israelis: 35400, socioeconomic_cluster: 2, peripherality_cluster: 1 },
  { authority_id: 5019, authority_name: 'עכו', crm_district: 'צפון', head_authority_name: 'ראש עיריית עכו', key_authority: '5019 - עכו', lamas_district: 'צפון', municipal_status: 'עירייה', total_population: 50700, jews_others_pct: 67.8, jews_pct: 63.5, arab_pct: 32.2, muslim_pct: 74.0, christian_pct: 18.0, druze_pct: 8.0, total_males: 25100, total_females: 25600, total_israelis: 49800, socioeconomic_cluster: 3, peripherality_cluster: 2 },
  { authority_id: 5020, authority_name: 'כרמיאל', crm_district: 'צפון', head_authority_name: 'ראש עיריית כרמיאל', key_authority: '5020 - כרמיאל', lamas_district: 'צפון', municipal_status: 'עירייה', total_population: 48900, jews_others_pct: 94.2, jews_pct: 90.1, arab_pct: 5.2, muslim_pct: 65.0, christian_pct: 15.0, druze_pct: 20.0, total_males: 24100, total_females: 24800, total_israelis: 48200, socioeconomic_cluster: 5, peripherality_cluster: 2 },
  { authority_id: 5021, authority_name: 'טבריה', crm_district: 'צפון', head_authority_name: 'ראש עיריית טבריה', key_authority: '5021 - טבריה', lamas_district: 'צפון', municipal_status: 'עירייה', total_population: 46300, jews_others_pct: 82.0, jews_pct: 78.0, arab_pct: 18.0, muslim_pct: 80.0, christian_pct: 15.0, druze_pct: 5.0, total_males: 22800, total_females: 23500, total_israelis: 45600, socioeconomic_cluster: 2, peripherality_cluster: 2 },
  { authority_id: 5022, authority_name: 'קריית שמונה', crm_district: 'צפון', head_authority_name: 'ראש עיריית ק"ש', key_authority: '5022 - קריית שמונה', lamas_district: 'צפון', municipal_status: 'עירייה', total_population: 25100, jews_others_pct: 96.0, jews_pct: 92.5, arab_pct: 3.5, muslim_pct: 60.0, christian_pct: 20.0, druze_pct: 20.0, total_males: 12400, total_females: 12700, total_israelis: 24800, socioeconomic_cluster: 3, peripherality_cluster: 1 },
];

const dim_society = [
  { society_id: 2001, society_name: 'מכבי תל אביב', authority_code: 'AU-5000', authority_name: 'תל אביב-יפו' },
  { society_id: 2002, society_name: 'הפועל ירושלים', authority_code: 'AU-5001', authority_name: 'ירושלים' },
  { society_id: 2003, society_name: 'מכבי חיפה', authority_code: 'AU-5002', authority_name: 'חיפה' },
  { society_id: 2004, society_name: 'הפועל באר שבע', authority_code: 'AU-5003', authority_name: 'באר שבע' },
  { society_id: 2005, society_name: 'בית"ר ירושלים', authority_code: 'AU-5001', authority_name: 'ירושלים' },
  { society_id: 2006, society_name: 'מכבי נתניה', authority_code: 'AU-5005', authority_name: 'נתניה' },
  { society_id: 2007, society_name: 'הפועל תל אביב', authority_code: 'AU-5000', authority_name: 'תל אביב-יפו' },
  { society_id: 2008, society_name: 'אליצור אשקלון', authority_code: 'AU-5014', authority_name: 'אשקלון' },
  { society_id: 2009, society_name: 'הפועל חולון', authority_code: 'AU-5008', authority_name: 'חולון' },
  { society_id: 2010, society_name: 'מכבי ראשון לציון', authority_code: 'AU-5004', authority_name: 'ראשון לציון' },
  { society_id: 2011, society_name: 'איל"ן', authority_code: 'AU-5007', authority_name: 'רמת גן' },
  { society_id: 2012, society_name: 'בני הרצליה', authority_code: 'AU-5010', authority_name: 'הרצליה' },
  { society_id: 2013, society_name: 'הפועל פתח תקוה', authority_code: 'AU-5009', authority_name: 'פתח תקווה' },
  { society_id: 2014, society_name: 'הפועל כאוכב', authority_code: 'AU-5015', authority_name: 'נצרת' },
  { society_id: 2015, society_name: 'הפועל רעננה', authority_code: 'AU-5011', authority_name: 'רעננה' },
  { society_id: 2016, society_name: 'מכבי כפר סבא', authority_code: 'AU-5012', authority_name: 'כפר סבא' },
  { society_id: 2017, society_name: 'הפועל קטמון ירושלים', authority_code: 'AU-5001', authority_name: 'ירושלים' },
  { society_id: 2018, society_name: 'מ.ס. אשדוד', authority_code: 'AU-5006', authority_name: 'אשדוד' },
  { society_id: 2019, society_name: 'הפועל אילת', authority_code: 'AU-5016', authority_name: 'אילת' },
  { society_id: 2020, society_name: 'מועדון התעמלות מודיעין', authority_code: 'AU-5013', authority_name: 'מודיעין' },
  { society_id: 2021, society_name: "מועדון ג'ודו ת\"א", authority_code: 'AU-5000', authority_name: 'תל אביב-יפו' },
  { society_id: 2022, society_name: 'מועדון השחייה הפועל', authority_code: 'AU-5000', authority_name: 'תל אביב-יפו' },
  { society_id: 2023, society_name: 'הפועל שעריים', authority_code: 'AU-5004', authority_name: 'ראשון לציון' },
  { society_id: 2024, society_name: 'מ.ס. בני יהודה', authority_code: 'AU-5000', authority_name: 'תל אביב-יפו' },
  { society_id: 2025, society_name: 'מועדון ספורט הקרב מודיעין', authority_code: 'AU-5013', authority_name: 'מודיעין' },
  { society_id: 2026, society_name: 'הפועל כרמיאל', authority_code: 'AU-5020', authority_name: 'כרמיאל' },
  { society_id: 2027, society_name: 'מכבי עכו', authority_code: 'AU-5019', authority_name: 'עכו' },
  { society_id: 2028, society_name: 'הפועל דימונה', authority_code: 'AU-5018', authority_name: 'דימונה' },
  { society_id: 2029, society_name: 'מכבי קריית שמונה', authority_code: 'AU-5022', authority_name: 'קריית שמונה' },
  { society_id: 2030, society_name: 'הפועל טבריה', authority_code: 'AU-5021', authority_name: 'טבריה' },
];

// Society → authority_id mapping (for FK lookups)
const societyAuth = {};
dim_society.forEach(s => {
  const code = s.authority_code.replace('AU-', '');
  societyAuth[s.society_id] = parseInt(code);
});

// Association → branch mapping
const assocToBranch = {};
dim_association.forEach(a => {
  const br = dim_branchs.find(b => b.branch_code === a.main_branch_code);
  if (br) assocToBranch[a.association_id] = br;
});

// ── Teams generation: each society gets 1-4 teams ──
const dim_teams = [];
const leagueTypes = ['ליגה עליונה', 'ליגה לאומית', 'ליגת אזורית', 'ליגת נוער'];
const leagueNames = { 'ליגה עליונה': 'ליגת העל', 'ליגה לאומית': 'ליגה לאומית', 'ליגת אזורית': 'ליגה אזורית', 'ליגת נוער': 'ליגת נוער ארצית' };
const teamSuffixes = ['בוגרים', 'נוער', 'נשים', 'ילדים'];
let teamCounter = 1;
dim_society.forEach(soc => {
  const numTeams = randInt(1, 4);
  for (let t = 0; t < numTeams; t++) {
    const suffix = teamSuffixes[t] || 'בוגרים';
    dim_teams.push({
      team_code: `TM-${String(teamCounter).padStart(3, '0')}`,
      society_id: soc.society_id,
      team_number: t + 1,
      team_achievement_score: +(rand() * 60 + 30).toFixed(1),
      team_name: `${soc.society_name} — ${suffix}`
    });
    teamCounter++;
  }
});

// ============================================================
// GENERATE fact_support_request_spo
// ============================================================
const fact_sr = [];
let srCounter = 0;
const years = [2025, 2026];
const requestTypes = ['איגוד', 'קבוצה', 'אישי', 'אליפות אירופה'];

// --- 1. One "איגוד" request per association per year ---
for (const year of years) {
  for (const assoc of dim_association) {
    srCounter++;
    const br = assocToBranch[assoc.association_id] || dim_branchs[0];
    const maleCnt = randInt(200, 12000);
    const femaleCnt = randInt(100, 8000);
    const maleScore = +(maleCnt * (rand() * 0.15 + 0.1)).toFixed(1);
    const femaleScore = +(femaleCnt * (rand() * 0.12 + 0.08)).toFixed(1);
    const passProf = rand() > 0.1 ? 'כן' : 'לא';
    const passAdmin = rand() > 0.08 ? 'כן' : 'לא';
    const passThresh = (passProf === 'כן' && passAdmin === 'כן') ? 'עבר' : 'לא עבר';
    fact_sr.push({
      support_request_code: `SR-${year}-A${String(srCounter).padStart(3, '0')}`,
      request_type: 'איגוד', request_type_filter: 'איגוד',
      branch_id: br.branch_id, branch_name: br.branch_name,
      request_name: assoc.association_name,
      association_id: assoc.association_id, association_name: assoc.association_name,
      society_id: null, society_name: null,
      team_code: null, team_number: null, team_name: null,
      league_type: null, league_name: null,
      authority_id: null, authority_name: null,
      male_cnt: maleCnt, female_cnt: femaleCnt,
      male_score: maleScore, female_score: femaleScore,
      achievement_score: null,
      male_achievement_score: +(maleScore * (rand() * 0.3 + 0.3)).toFixed(1),
      female_achievement_score: +(femaleScore * (rand() * 0.3 + 0.25)).toFixed(1),
      professional_score: +(rand() * 30 + 65).toFixed(1),
      coach_association_score: +(rand() * 30 + 55).toFixed(1),
      branch_cost_score: +(rand() * 40 + 35).toFixed(1),
      women_promotion_score: +(rand() * 40 + 40).toFixed(1),
      excellent_center_score: +(rand() * 40 + 40).toFixed(1),
      is_pass_professional_condition: passProf,
      is_pass_admin_condition: passAdmin,
      is_pass_threshold_condition: passThresh,
      support_request_year: year
    });
  }
}

// --- 2. "קבוצה" requests: each team for each year ---
for (const year of years) {
  for (const team of dim_teams) {
    srCounter++;
    const soc = dim_society.find(s => s.society_id === team.society_id);
    const authId = societyAuth[team.society_id];
    const auth = dim_authority.find(a => a.authority_id === authId);
    // pick a random association/branch for this team
    const assoc = pick(dim_association);
    const br = assocToBranch[assoc.association_id] || dim_branchs[0];
    const isWomen = team.team_name.includes('נשים');
    const maleCnt = isWomen ? 0 : randInt(12, 30);
    const femaleCnt = isWomen ? randInt(12, 25) : randInt(0, 5);
    const lt = pick(leagueTypes);
    const passProf = rand() > 0.15 ? 'כן' : 'לא';
    const passAdmin = rand() > 0.1 ? 'כן' : 'לא';
    const passThresh = (passProf === 'כן' && passAdmin === 'כן') ? 'עבר' : 'לא עבר';
    fact_sr.push({
      support_request_code: `SR-${year}-T${String(srCounter).padStart(3, '0')}`,
      request_type: 'קבוצה', request_type_filter: 'אגודה',
      branch_id: br.branch_id, branch_name: br.branch_name,
      request_name: soc.society_name,
      association_id: assoc.association_id, association_name: assoc.association_name,
      society_id: soc.society_id, society_name: soc.society_name,
      team_code: team.team_code, team_number: team.team_number, team_name: team.team_name,
      league_type: lt, league_name: leagueNames[lt],
      authority_id: authId, authority_name: auth ? auth.authority_name : null,
      male_cnt: maleCnt, female_cnt: femaleCnt,
      male_score: +(maleCnt * (rand() * 3 + 1.5)).toFixed(1),
      female_score: +(femaleCnt * (rand() * 3 + 1.5)).toFixed(1),
      achievement_score: +team.team_achievement_score * (year === 2026 ? 1 : 0.94),
      male_achievement_score: isWomen ? 0 : +(team.team_achievement_score * (rand() * 0.5 + 0.3)).toFixed(1),
      female_achievement_score: isWomen ? +(team.team_achievement_score * (rand() * 0.5 + 0.3)).toFixed(1) : +(team.team_achievement_score * (rand() * 0.2)).toFixed(1),
      professional_score: +(rand() * 30 + 60).toFixed(1),
      coach_association_score: +(rand() * 30 + 50).toFixed(1),
      branch_cost_score: +(rand() * 40 + 30).toFixed(1),
      women_promotion_score: isWomen ? +(rand() * 20 + 70).toFixed(1) : +(rand() * 30 + 20).toFixed(1),
      excellent_center_score: +(rand() * 40 + 35).toFixed(1),
      is_pass_professional_condition: passProf,
      is_pass_admin_condition: passAdmin,
      is_pass_threshold_condition: passThresh,
      support_request_year: year
    });
  }
}

// --- 3. "אישי" requests: ~60 individual athletes across branches & societies ---
const individualBranches = dim_branchs.filter(b => b.personal_or_group === 'אישי');
for (const year of years) {
  for (let i = 0; i < 30; i++) {
    srCounter++;
    const br = pick(individualBranches);
    const soc = pick(dim_society);
    const authId = societyAuth[soc.society_id];
    const auth = dim_authority.find(a => a.authority_id === authId);
    const assoc = dim_association.find(a => a.main_branch_code === br.branch_code) || pick(dim_association);
    const maleCnt = randInt(3, 25);
    const femaleCnt = randInt(2, 20);
    const passProf = rand() > 0.12 ? 'כן' : 'לא';
    const passAdmin = rand() > 0.08 ? 'כן' : 'לא';
    const passThresh = (passProf === 'כן' && passAdmin === 'כן') ? 'עבר' : 'לא עבר';
    fact_sr.push({
      support_request_code: `SR-${year}-I${String(srCounter).padStart(3, '0')}`,
      request_type: 'אישי', request_type_filter: 'אגודה',
      branch_id: br.branch_id, branch_name: br.branch_name,
      request_name: soc.society_name,
      association_id: assoc.association_id, association_name: assoc.association_name,
      society_id: soc.society_id, society_name: soc.society_name,
      team_code: null, team_number: null, team_name: null,
      league_type: null, league_name: null,
      authority_id: authId, authority_name: auth ? auth.authority_name : null,
      male_cnt: maleCnt, female_cnt: femaleCnt,
      male_score: +(maleCnt * (rand() * 4 + 2)).toFixed(1),
      female_score: +(femaleCnt * (rand() * 4 + 1.5)).toFixed(1),
      achievement_score: null,
      male_achievement_score: +(rand() * 50 + 10).toFixed(1),
      female_achievement_score: +(rand() * 40 + 8).toFixed(1),
      professional_score: +(rand() * 35 + 55).toFixed(1),
      coach_association_score: +(rand() * 30 + 50).toFixed(1),
      branch_cost_score: +(rand() * 35 + 30).toFixed(1),
      women_promotion_score: +(rand() * 40 + 30).toFixed(1),
      excellent_center_score: +(rand() * 35 + 35).toFixed(1),
      is_pass_professional_condition: passProf,
      is_pass_admin_condition: passAdmin,
      is_pass_threshold_condition: passThresh,
      support_request_year: year
    });
  }
}

// --- 4. "אליפות אירופה" requests: ~10 per year ---
const europeAssocs = [1003, 1004, 1005, 1006, 1007, 1008, 1012, 1019, 1022, 1025];
for (const year of years) {
  for (const aid of europeAssocs) {
    srCounter++;
    const assoc = dim_association.find(a => a.association_id === aid);
    const br = assocToBranch[aid] || dim_branchs[0];
    const maleCnt = randInt(4, 12);
    const femaleCnt = randInt(2, 8);
    fact_sr.push({
      support_request_code: `SR-${year}-E${String(srCounter).padStart(3, '0')}`,
      request_type: 'אליפות אירופה', request_type_filter: 'איגוד',
      branch_id: br.branch_id, branch_name: br.branch_name,
      request_name: `נבחרת ${br.branch_name}`,
      association_id: aid, association_name: assoc.association_name,
      society_id: null, society_name: null,
      team_code: null, team_number: null, team_name: null,
      league_type: null, league_name: null,
      authority_id: null, authority_name: null,
      male_cnt: maleCnt, female_cnt: femaleCnt,
      male_score: +(maleCnt * (rand() * 30 + 20)).toFixed(1),
      female_score: +(femaleCnt * (rand() * 25 + 15)).toFixed(1),
      achievement_score: null,
      male_achievement_score: +(rand() * 100 + 80).toFixed(1),
      female_achievement_score: +(rand() * 80 + 40).toFixed(1),
      professional_score: +(rand() * 10 + 88).toFixed(1),
      coach_association_score: +(rand() * 12 + 82).toFixed(1),
      branch_cost_score: +(rand() * 15 + 65).toFixed(1),
      women_promotion_score: +(rand() * 20 + 60).toFixed(1),
      excellent_center_score: +(rand() * 10 + 82).toFixed(1),
      is_pass_professional_condition: 'כן',
      is_pass_admin_condition: 'כן',
      is_pass_threshold_condition: 'עבר',
      support_request_year: year
    });
  }
}

// ============================================================
// GENERATE fact_athlete
// ============================================================
const fact_athlete = [];
let athCounter = 0;
const ageCats = { 'ילדים': [6, 12], 'נוער': [13, 17], 'בוגרים': [18, 35], 'ותיקים': [36, 50] };
const ageCatWeights = [15, 25, 50, 10]; // distribution
const genders = ['זכר', 'נקבה'];

// Generate athletes from support requests that have society/team context
const srWithSociety = fact_sr.filter(r => r.society_id !== null);

for (const sr of srWithSociety) {
  // Generate athletes for each SR: total = male_cnt + female_cnt, capped at a sample
  const totalAthletes = Math.min(sr.male_cnt + sr.female_cnt, 8); // cap per SR for file size
  const maleRatio = sr.male_cnt / (sr.male_cnt + sr.female_cnt + 0.001);

  for (let i = 0; i < totalAthletes; i++) {
    athCounter++;
    const isMale = rand() < maleRatio;
    const gender = isMale ? 'זכר' : 'נקבה';
    const catName = pickWeighted(Object.keys(ageCats), ageCatWeights);
    const [minAge, maxAge] = ageCats[catName];
    const age = randInt(minAge, maxAge);
    const hasInsurance = rand() > 0.08 ? 'כן' : 'לא';
    const hasMedical = rand() > 0.12 ? 'כן' : 'לא';
    const passThresh = (hasInsurance === 'כן' && hasMedical === 'כן' && rand() > 0.05) ? 'כן' : 'לא';

    fact_athlete.push({
      athlete_code: `ATH-${String(athCounter).padStart(4, '0')}`,
      athlete_id: 10000 + athCounter,
      request_type: sr.request_type === 'קבוצה' ? 'קבוצתי' : 'אישי',
      association_id: sr.association_id, association_name: sr.association_name,
      society_id: sr.society_id, society_name: sr.society_name,
      team_number: sr.team_number,
      athlete_gender: gender,
      athlete_final_score: +(rand() * 70 + 15).toFixed(1),
      team_code: sr.team_code, team_name: sr.team_name,
      league_type: sr.league_type,
      age: age,
      athlete_age_category: catName,
      athlete_has_insurance: hasInsurance,
      athlete_has_medical_check: hasMedical,
      is_pass_threshold_condition: passThresh,
      branch_id: sr.branch_id, branch_name: sr.branch_name,
      authority_id: sr.authority_id, authority_name: sr.authority_name,
      support_request_year: sr.support_request_year,
      support_request_code: sr.support_request_code
    });
  }
}

// ============================================================
// OUTPUT mock-data.js
// ============================================================
const helpers = `
// ============================================================
// Helper functions for aggregation & drilldown
// ============================================================
MOCK.helpers = {
  groupBy(arr, field) {
    return arr.reduce((acc, r) => {
      const k = r[field] ?? '__null__';
      (acc[k] = acc[k] || []).push(r);
      return acc;
    }, {});
  },
  sumField(arr, field) { return arr.reduce((s, r) => s + (r[field] || 0), 0); },
  avgField(arr, field) { const vals = arr.filter(r => r[field] != null); return vals.length ? vals.reduce((s, r) => s + r[field], 0) / vals.length : 0; },
  countWhere(arr, pred) { return arr.filter(pred).length; },
  uniqueValues(arr, field) { return [...new Set(arr.map(r => r[field]).filter(v => v != null))].sort(); },
  filterMulti(arr, filters) {
    return arr.filter(r => Object.entries(filters).every(([k, v]) => v == null || v === '' || v === 'הכל' || r[k] == v));
  },
  lookupAssociation(id) { return MOCK.dim_association.find(a => a.association_id === id); },
  lookupBranch(id) { return MOCK.dim_branchs.find(b => b.branch_id === id); },
  lookupAuthority(id) { return MOCK.dim_authority.find(a => a.authority_id === id); },
  lookupSociety(id) { return MOCK.dim_society.find(s => s.society_id === id); },
  lookupTeam(code) { return MOCK.dim_teams.find(t => t.team_code === code); },
  filterByYear(arr, year) { return arr.filter(r => r.support_request_year === year); },
  filterByGender(arr, g) { return arr.filter(r => r.athlete_gender === g); },
  filterByBranch(arr, id) { return arr.filter(r => r.branch_id === id); },
  filterByAgeRange(arr, min, max) { return arr.filter(r => r.age >= min && r.age <= max); },
  genderTotals(requests) {
    return {
      male: requests.reduce((s, r) => s + (r.male_cnt || 0), 0),
      female: requests.reduce((s, r) => s + (r.female_cnt || 0), 0)
    };
  },
  scoreTotals(requests) {
    return {
      male_score: requests.reduce((s, r) => s + (r.male_score || 0), 0),
      female_score: requests.reduce((s, r) => s + (r.female_score || 0), 0),
      male_achievement: requests.reduce((s, r) => s + (r.male_achievement_score || 0), 0),
      female_achievement: requests.reduce((s, r) => s + (r.female_achievement_score || 0), 0),
      professional: requests.reduce((s, r) => s + (r.professional_score || 0), 0),
      women_promotion: requests.reduce((s, r) => s + (r.women_promotion_score || 0), 0),
      excellent_center: requests.reduce((s, r) => s + (r.excellent_center_score || 0), 0),
      coach_association: requests.reduce((s, r) => s + (r.coach_association_score || 0), 0),
      branch_cost: requests.reduce((s, r) => s + (r.branch_cost_score || 0), 0)
    };
  },
  athleteWithDemographics(athlete) {
    const auth = MOCK.dim_authority.find(a => a.authority_id === athlete.authority_id);
    return auth ? { ...athlete, ...auth } : athlete;
  },
  requestWithBranch(req) {
    const br = MOCK.dim_branchs.find(b => b.branch_id === req.branch_id);
    return br ? { ...req, personal_or_group: br.personal_or_group, branch_type: br.branch_type, is_olympic_branch: br.is_olympic_branch, sport_type: br.sport_type, is_special_needs_branch: br.is_special_needs_branch } : req;
  },
  topN(arr, field, n) {
    return [...arr].sort((a, b) => (b[field] || 0) - (a[field] || 0)).slice(0, n);
  }
};`;

const output = `// ============================================================
// Mock Data Layer — matches STT_Aigudim_Agudut_Gold.xlsx
// All data is fictional. Use MOCK.* to build new visuals.
// Generated by generate-mock-data.js — do not edit manually.
// ============================================================

const MOCK = {};

MOCK.dim_association = ${JSON.stringify(dim_association, null, 1)};

MOCK.dim_branchs = ${JSON.stringify(dim_branchs, null, 1)};

MOCK.dim_authority = ${JSON.stringify(dim_authority, null, 1)};

MOCK.dim_society = ${JSON.stringify(dim_society, null, 1)};

MOCK.dim_teams = ${JSON.stringify(dim_teams, null, 1)};

MOCK.fact_support_request_spo = ${JSON.stringify(fact_sr, null, 1)};

MOCK.fact_athlete = ${JSON.stringify(fact_athlete, null, 1)};

${helpers}
`;

fs.writeFileSync('mock-data.js', output, 'utf8');

// Stats
console.log('Generated mock-data.js');
console.log(`  dim_association: ${dim_association.length}`);
console.log(`  dim_branchs: ${dim_branchs.length}`);
console.log(`  dim_authority: ${dim_authority.length}`);
console.log(`  dim_society: ${dim_society.length}`);
console.log(`  dim_teams: ${dim_teams.length}`);
console.log(`  fact_support_request_spo: ${fact_sr.length}`);
console.log(`  fact_athlete: ${fact_athlete.length}`);

// Coverage check
const reqTypes = new Set(fact_sr.map(r => r.request_type));
const reqFilters = new Set(fact_sr.map(r => r.request_type_filter));
const srYears = new Set(fact_sr.map(r => r.support_request_year));
const athGenders = new Set(fact_athlete.map(a => a.athlete_gender));
const athAgeCats = new Set(fact_athlete.map(a => a.athlete_age_category));
const athInsurance = new Set(fact_athlete.map(a => a.athlete_has_insurance));
const athMedical = new Set(fact_athlete.map(a => a.athlete_has_medical_check));
const athThresh = new Set(fact_athlete.map(a => a.is_pass_threshold_condition));
const srThresh = new Set(fact_sr.map(r => r.is_pass_threshold_condition));
const leagueTypesUsed = new Set(fact_sr.map(r => r.league_type).filter(Boolean));
const branchesUsed = new Set(fact_sr.map(r => r.branch_id));
const authsUsed = new Set(fact_sr.map(r => r.authority_id).filter(Boolean));
const assocsUsed = new Set(fact_sr.map(r => r.association_id));
const socUsed = new Set(fact_sr.map(r => r.society_id).filter(Boolean));

console.log('\nCoverage:');
console.log(`  request_types: ${[...reqTypes].join(', ')}`);
console.log(`  request_type_filters: ${[...reqFilters].join(', ')}`);
console.log(`  years: ${[...srYears].join(', ')}`);
console.log(`  genders: ${[...athGenders].join(', ')}`);
console.log(`  age_categories: ${[...athAgeCats].join(', ')}`);
console.log(`  athlete insurance: ${[...athInsurance].join(', ')}`);
console.log(`  athlete medical: ${[...athMedical].join(', ')}`);
console.log(`  athlete threshold: ${[...athThresh].join(', ')}`);
console.log(`  SR threshold: ${[...srThresh].join(', ')}`);
console.log(`  league_types: ${[...leagueTypesUsed].join(', ')}`);
console.log(`  branches used: ${branchesUsed.size}/${dim_branchs.length}`);
console.log(`  authorities used: ${authsUsed.size}/${dim_authority.length}`);
console.log(`  associations used: ${assocsUsed.size}/${dim_association.length}`);
console.log(`  societies used: ${socUsed.size}/${dim_society.length}`);
