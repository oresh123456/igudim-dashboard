-- ============================================================
-- אבחון: אילו אגודות (society_id) לא מתחברות לכסף, וכמה כסף "נופל"
-- ------------------------------------------------------------
-- כסף גולמי (לפני הנפילה): public.mrr_aa_budgets            (approved_amount)
-- כסף סופי  (מה ששרד):     public.dwh_aa_fact_support_request_sport
-- צד הרישום:               public.dwh_aa_fact_athlete_by_branch_society
-- מפתח חיבור: society_id + branch_id + support_request_year (+ team_number)
-- קריאה בלבד בלבד (כמו כלל הפרויקט: BEGIN READ ONLY)
-- הערכים (raw / kept / dropped) מתקבלים מהרצת השאילתות למטה על ידך.
-- ============================================================


-- ---------- שאילתה 1: התאמת כסף לכל אגודה — גולמי / נשמר / נפל ----------
BEGIN READ ONLY;
WITH targets(society_id, society_name) AS (
    VALUES (510567647::bigint, 'מכבי עירוני נס ציונה'),
           (511854788,         'הפועל רמת נגב'),
           (513894139,         'עירוני נתניה'),
           (580460269,         'עמותת פיסגה + מרכז')
),
budget AS (   -- כל הכסף הגולמי, עם דגל האם השורה שרדה לפאקט הסופי
    SELECT b.society_id, b.approved_amount,
           EXISTS (
               SELECT 1 FROM public.dwh_aa_fact_support_request_sport f
               WHERE f.society_id          IS NOT DISTINCT FROM b.society_id
                 AND f.branch_id           IS NOT DISTINCT FROM b.branch_id
                 AND f.support_request_year IS NOT DISTINCT FROM b.support_request_year
                 AND f.team_number         IS NOT DISTINCT FROM b.team_number
           ) AS survived
    FROM public.mrr_aa_budgets b
    JOIN targets t ON t.society_id = b.society_id
)
SELECT
    t.society_id,
    t.society_name,
    COALESCE(SUM(b.approved_amount), 0)                               AS raw_amount,      -- גולמי
    COALESCE(SUM(b.approved_amount) FILTER (WHERE b.survived), 0)     AS kept_amount,     -- נשמר
    COALESCE(SUM(b.approved_amount) FILTER (WHERE NOT b.survived), 0) AS dropped_amount,  -- נפל
    COUNT(b.*) FILTER (WHERE NOT b.survived)                          AS dropped_rows
FROM targets t
LEFT JOIN budget b ON b.society_id = t.society_id
GROUP BY t.society_id, t.society_name
ORDER BY t.society_id;
COMMIT;


-- ---------- שאילתה 2: פירוט כל שורה שנפלה — סכום + המפתח הנכשל ----------
BEGIN READ ONLY;
WITH targets(society_id) AS (
    VALUES (510567647::bigint),(511854788),(513894139),(580460269)
),
reg AS (   -- צד הרישום (ניתן להחליף לטבלת הרישום הקנונית, למשל dim_teams)
    SELECT DISTINCT society_id, branch_id, support_request_year AS yr
    FROM public.dwh_aa_fact_athlete_by_branch_society
)
SELECT
    b.society_id,
    b.branch_id, b.branch_name, b.team_number,
    b.support_request_year AS budget_year,
    b.approved_amount      AS amount_dropped,        -- <<< הסכום שנפל
    CASE
        WHEN EXISTS (SELECT 1 FROM reg r WHERE r.society_id=b.society_id AND r.branch_id=b.branch_id AND r.yr=b.support_request_year)
            THEN 'מחובר'
        WHEN EXISTS (SELECT 1 FROM reg r WHERE r.society_id=b.society_id AND r.branch_id=b.branch_id)
            THEN 'year — הרישום קיים לאותה אגודה+ענף בשנה אחרת'
        WHEN EXISTS (SELECT 1 FROM reg r WHERE r.society_id=b.society_id AND r.yr=b.support_request_year)
            THEN 'branch — הרישום קיים לאותה אגודה+שנה בענף אחר'
        WHEN EXISTS (SELECT 1 FROM reg r WHERE r.branch_id=b.branch_id AND r.yr=b.support_request_year)
            THEN 'society — האגודה אינה רשומה לאותו ענף+שנה'
        ELSE 'אין רישום תואם כלל'
    END AS failing_key
FROM public.mrr_aa_budgets b
JOIN targets t ON t.society_id = b.society_id
WHERE NOT EXISTS (   -- רק שורות שלא שרדו לפאקט הסופי
    SELECT 1 FROM public.dwh_aa_fact_support_request_sport f
    WHERE f.society_id          IS NOT DISTINCT FROM b.society_id
      AND f.branch_id           IS NOT DISTINCT FROM b.branch_id
      AND f.support_request_year IS NOT DISTINCT FROM b.support_request_year
      AND f.team_number         IS NOT DISTINCT FROM b.team_number
)
ORDER BY b.society_id, b.approved_amount DESC;
COMMIT;
