/* ============================================================================
   אבחון כישלון JOIN: תקציב (mrr_aa_budgets) ⟵⟶ רישום/בקשות תמיכה
   Why do these societies fail to join?
     510567647  מכבי עירוני נס ציונה
     511854788  הפועל רמת נגב
     513894139  עירוני נתניה           (מופיע במקור כ"ערוני" – שגיאת כתיב)
     580460269  עמותת פיסגה + מרכז

   הרקע / ROOT CAUSE
   -----------------
   ה-JOIN אינו על עמודה אחת אלא על מפתח מורכב של שלוש עמודות:
        society_id  +  branch_id  +  support_request_year
   צד התקציב  = public.mrr_aa_budgets            (society_id, branch_id, support_request_year, team_number, approved_amount)
   צד הרישום  = public.dwh_aa_fact_support_request_sport (society_id, branch_id, support_request_year)

   מספיק שאחת משלוש העמודות שונה כדי שהשורה "תיפול". מתוך ניתוח קיים (strand):
        year=29 , society=14 , branch=5  שורות נכשלות.

   שני שברים עיקריים אצל 4 האגודות האלה:
   1) society_id  – התקציב רשום תחת *מספר האגודה/החברה* (51…), אבל הרישום קיים תחת
      *מספר האיגוד/העמותה* (58…). אותה אגודה, ישות משפטית אחרת:
          513894139  → רשומה בפועל תחת 580216372
          511854788  → רשומה בפועל תחת 580360584
      המיפוי בין השניים יושב ב-mrr_aa_new_teams.society_union_code → mrr_aa_new_societyunions.
   2) year – התקציב לשנת 2025 בעוד הבקשה התואמת רשומה תחת 2026.
   (580460269 עצמה היא מספר עמותה ולכן כן קיימת בצד הרישום; היא נכשלת בעיקר על year/branch.)

   השאילתה מטה משחזרת את לוגיקת strand ומרחיבה אותה: לכל שורת תקציב שנכשלת היא
   מזהה איזו משלוש העמודות אשמה, ומחזירה את הערך ה"כמעט-תואם" מצד הרישום
   (המספר/השנה/הענף האמיתי) כדי שתראו במה בדיוק להתקן.
   ============================================================================ */


/* ===========================================================================
   ⚠ בטיחות — כל הסקריפט רץ בתוך טרנזקציית קריאה-בלבד שמתגלגלת לאחור:
     SET TRANSACTION READ ONLY  →  כל ניסיון שינוי (UPDATE/INSERT/DELETE/DDL) ייכשל מיד.
     ROLLBACK בסוף              →  גם אם משהו בכל זאת רץ, שום דבר לא נשמר במסד.
   הריצו את כל הקובץ יחד. אם מריצים שאילתה בודדת — השאירו אותה בין BEGIN ל-ROLLBACK.
   =========================================================================== */
BEGIN;
SET TRANSACTION READ ONLY;


/* ---------------------------------------------------------------------------
   שאילתה 1 — אבחון מלא לכל שורת תקציב של 4 האגודות
   --------------------------------------------------------------------------- */
WITH targets(society_id) AS (
    VALUES (510567647::int8), (511854788), (513894139), (580460269)
),

-- צד התקציב: השורות שאמורות להצטרף.  שנו כאן אם המקור אצלכם שונה.
budget AS (
    SELECT society_id,
           branch_id,
           support_request_year                       AS yr,
           team_number,
           approved_amount
    FROM   public.mrr_aa_budgets
    WHERE  society_id IN (SELECT society_id FROM targets)
),

-- צד הרישום: מה שהתקציב חייב להיתפס מולו.
-- ברירת מחדל = הטבלה הנקייה שאחרי ה-ETL. אפשר להחליף ל-stg/mrr לפי שכבת ה-JOIN שלכם.
reg AS (
    SELECT DISTINCT
           society_id,
           branch_id,
           support_request_year                       AS yr
    FROM   public.dwh_aa_fact_support_request_sport
)

SELECT
    b.society_id,
    b.branch_id,
    b.yr                                               AS budget_year,
    b.team_number,
    b.approved_amount,

    -- האם המפתח המלא (3 עמודות) נתפס?
    CASE WHEN r.society_id IS NOT NULL THEN 'MATCH' ELSE 'NO MATCH' END AS join_status,

    -- איזו עמודה בודדת אשמה (מרפים עמודה אחת בכל פעם, באותו סדר עדיפויות כמו strand)
    CASE
        WHEN r.society_id IS NOT NULL                                                                    THEN NULL
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.branch_id = b.branch_id) THEN 'year'
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.branch_id  = b.branch_id  AND x.yr        = b.yr)        THEN 'society'
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.yr        = b.yr)        THEN 'branch'
        ELSE 'no partial match (society+branch+year all differ)'
    END                                                                AS failing_key,

    -- הערכים ה"כמעט-תואמים" מצד הרישום = הערך האמיתי שאליו צריך להתאים
    (SELECT min(x.yr)         FROM reg x WHERE x.society_id = b.society_id AND x.branch_id = b.branch_id) AS reg_year_when_soc_branch_match,
    (SELECT min(x.society_id) FROM reg x WHERE x.branch_id  = b.branch_id  AND x.yr        = b.yr)        AS reg_society_when_year_branch_match,
    (SELECT min(x.branch_id)  FROM reg x WHERE x.society_id = b.society_id AND x.yr        = b.yr)        AS reg_branch_when_year_soc_match,

    -- תרגום האגודה (51…) לאיגוד/עמותה שלה (58…) — לרוב זו הסיבה ל-failing_key='society'
    u.union_code,
    u.union_society_id,
    u.union_society_name
FROM        budget b
LEFT JOIN   reg r
        ON  r.society_id = b.society_id
       AND  r.branch_id  = b.branch_id
       AND  r.yr         = b.yr
LEFT JOIN LATERAL (
        SELECT t.society_union_code AS union_code,
               su.society_id        AS union_society_id,
               su.society_name      AS union_society_name
        FROM   public.mrr_aa_new_teams        t
        JOIN   public.mrr_aa_new_societyunions su ON su.society_union_code = t.society_union_code
        WHERE  t.society_id = b.society_id
        LIMIT  1
) u ON true
ORDER BY b.society_id, b.branch_id, b.yr;


/* ---------------------------------------------------------------------------
   שאילתה 2 — סיכום: כמה שורות ואיזה תקציב "תקוע" לפי סוג הכשל
   --------------------------------------------------------------------------- */
WITH targets(society_id) AS (
    VALUES (510567647::int8), (511854788), (513894139), (580460269)
),
budget AS (
    SELECT society_id, branch_id, support_request_year AS yr, approved_amount
    FROM   public.mrr_aa_budgets
    WHERE  society_id IN (SELECT society_id FROM targets)
),
reg AS (
    SELECT DISTINCT society_id, branch_id, support_request_year AS yr
    FROM   public.dwh_aa_fact_support_request_sport
),
classified AS (
    SELECT b.approved_amount,
           CASE
               WHEN r.society_id IS NOT NULL                                                                    THEN 'MATCH'
               WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.branch_id = b.branch_id) THEN 'year'
               WHEN EXISTS (SELECT 1 FROM reg x WHERE x.branch_id  = b.branch_id  AND x.yr        = b.yr)        THEN 'society'
               WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.yr        = b.yr)        THEN 'branch'
               ELSE 'no_partial_match'
           END AS failing_key
    FROM budget b
    LEFT JOIN reg r
           ON r.society_id = b.society_id AND r.branch_id = b.branch_id AND r.yr = b.yr
)
SELECT failing_key,
       count(*)                        AS rows_cnt,
       round(sum(approved_amount)::numeric, 0) AS stranded_budget
FROM   classified
GROUP BY failing_key
ORDER BY rows_cnt DESC;


/* ---------------------------------------------------------------------------
   שאילתה 3 — טבלת התרגום אגודה→איגוד (המפתח לתיקון ה-society mismatch)
   מראה, לכל אחת מ-4 האגודות, את מספר העמותה/איגוד שאליו הרישום באמת משויך.
   --------------------------------------------------------------------------- */
SELECT DISTINCT
       t.society_id                          AS budget_society_id,     -- 51…  (כמו בתקציב)
       t.society_name                        AS society_name,
       t.society_union_code,
       su.society_id                         AS registered_under_id,   -- 58…  (כמו ברישום)
       su.society_name                       AS union_name
FROM   public.mrr_aa_new_teams        t
LEFT JOIN public.mrr_aa_new_societyunions su ON su.society_union_code = t.society_union_code
WHERE  t.society_id IN (510567647, 511854788, 513894139, 580460269)
ORDER BY t.society_id;


/* ---------------------------------------------------------------------------
   שאילתה 4 — מצא את כולם: כל שורות התקציב שנכשלות ב-JOIN (כל האגודות)
   כמו שאילתה 1 אבל בלי סינון ל-4 — על כל mrr_aa_budgets, ומחזירה רק כשלים.
   --------------------------------------------------------------------------- */
WITH budget AS (
    SELECT society_id, branch_id, support_request_year AS yr, team_number, approved_amount
    FROM   public.mrr_aa_budgets
),
reg AS (
    SELECT DISTINCT society_id, branch_id, support_request_year AS yr
    FROM   public.dwh_aa_fact_support_request_sport
)
SELECT
    b.society_id,
    s.society_name,
    b.branch_id,
    b.yr                                               AS budget_year,
    b.team_number,
    b.approved_amount,

    -- איזו עמודה בודדת אשמה (מרפים עמודה אחת בכל פעם)
    CASE
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.branch_id = b.branch_id) THEN 'year'
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.branch_id  = b.branch_id  AND x.yr        = b.yr)        THEN 'society'
        WHEN EXISTS (SELECT 1 FROM reg x WHERE x.society_id = b.society_id AND x.yr        = b.yr)        THEN 'branch'
        ELSE 'no_partial_match'
    END                                                AS failing_key,

    -- הערך האמיתי בצד הרישום (אליו צריך להתאים)
    (SELECT min(x.yr)         FROM reg x WHERE x.society_id = b.society_id AND x.branch_id = b.branch_id) AS reg_year_when_soc_branch_match,
    (SELECT min(x.society_id) FROM reg x WHERE x.branch_id  = b.branch_id  AND x.yr        = b.yr)        AS reg_society_when_year_branch_match,
    (SELECT min(x.branch_id)  FROM reg x WHERE x.society_id = b.society_id AND x.yr        = b.yr)        AS reg_branch_when_year_soc_match,

    -- תרגום האגודה (51…) לאיגוד/עמותה שלה (58…)
    u.union_code,
    u.union_society_id,
    u.union_society_name
FROM        budget b
LEFT JOIN   dwh_aa_dim_society s ON s.society_id = b.society_id
LEFT JOIN   reg r
        ON  r.society_id = b.society_id
       AND  r.branch_id  = b.branch_id
       AND  r.yr         = b.yr
LEFT JOIN LATERAL (
        SELECT t.society_union_code AS union_code,
               su.society_id        AS union_society_id,
               su.society_name      AS union_society_name
        FROM   public.mrr_aa_new_teams        t
        JOIN   public.mrr_aa_new_societyunions su ON su.society_union_code = t.society_union_code
        WHERE  t.society_id = b.society_id
        LIMIT  1
) u ON true
WHERE r.society_id IS NULL                 -- רק שורות שלא נתפסו ב-JOIN
ORDER BY b.society_id, b.branch_id, b.yr;


ROLLBACK;   -- סוף הסקריפט: גלגול לאחור — שום שינוי לא נשמר במסד
