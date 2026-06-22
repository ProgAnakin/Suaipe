-- ════════════════════════════════════════════════════════════════════════════
-- DEMO SEED — populate the /stats dashboard with realistic-looking data
-- ════════════════════════════════════════════════════════════════════════════
-- OPTIONAL. Not a migration — never auto-applied. Run by hand in the Supabase
-- SQL editor to fill the analytics (funnel, leaderboard, match histogram,
-- hourly/7-day charts, codes generated/used) for a portfolio-ready demo.
--
-- Generates:
--   • 100 fake quiz_sessions  — spread across the 4 stores and the last 28 days,
--     match% 45–98, ~92% "email sent", ~32% codes redeemed, 5 languages, varied
--     names/products (gentle bestseller skew toward Aurae Pulse Pro / Pulsar).
--   • A descending funnel      — 240 quiz_started → 165 result_shown → 100 claimed.
--
-- ⚠️  BEFORE RUNNING — DISABLE THE EMAIL WEBHOOK
--     Supabase Dashboard → Database → Webhooks → on-session-created → toggle OFF,
--     or in the SQL editor:
--       ALTER TABLE public.quiz_sessions DISABLE TRIGGER "on-session-created";
--     Inserting into quiz_sessions fires that webhook, so it would try to email
--     all 100 fake addresses via Brevo. Re-enable it after the seed finishes:
--       ALTER TABLE public.quiz_sessions ENABLE TRIGGER "on-session-created";
--
-- 🧹  TO REMOVE THE DEMO DATA LATER (all rows are tagged):
--     DELETE FROM quiz_sessions      WHERE email LIKE '%@suaipe-demo.app';
--     DELETE FROM quiz_funnel_events WHERE funnel_key LIKE 'demo-%';
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Wipe any previous demo run first, so this script is safe to re-run.
DELETE FROM public.quiz_sessions      WHERE email LIKE '%@suaipe-demo.app';
DELETE FROM public.quiz_funnel_events WHERE funnel_key LIKE 'demo-%';

-- ── 100 demo sessions ───────────────────────────────────────────────────────
-- Per-row randomness is computed in the SELECT list over generate_series (so it
-- is evaluated once PER ROW) and bundled in a MATERIALIZED CTE so the values used
-- more than once in a row (timestamp, product, discount) stay consistent.
-- ⚠ The previous version put these picks in *uncorrelated* CROSS JOIN LATERAL
--   subqueries, which Postgres evaluates ONCE for all 100 rows — so every row
--   came out with the same name / product / store. Keep the picks inline here.
WITH r AS MATERIALIZED (
  SELECT
    g,
    (1 + floor(random() * 12)::int)  AS pidx,          -- product slot (12 → bestseller skew)
    (1 + floor(random() * 78)::int)  AS email_n,       -- ~78 unique addresses → some returning
    (45 + floor(random() * 54)::int) AS match_percent, -- 45..98 (fills all brackets)
    (random() < 0.92)                AS email_sent,    -- ~92% delivered
    (random() < 0.32)                AS redeemed,      -- ~32% codes redeemed
    (ARRAY[5,10,15])[1 + floor(random() * 3)::int]                              AS disc,
    (ARRAY['rio-de-janeiro','lisboa','dublino','milano'])[1 + floor(random() * 4)::int] AS store_id,
    (ARRAY['it','it','it','it','en','pt','es','fr'])[1 + floor(random() * 8)::int]      AS lang,
    (ARRAY['Marco','Giulia','Luca','Sofia','Matteo','Chiara','Lorenzo','Aurora','Andrea','Martina',
           'Ana','João','Maria','Pedro','Beatriz','Tiago','Sean','Aoife','Conor','Niamh'])
      [1 + floor(random() * 20)::int] AS nome,
    (ARRAY['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Silva','Santos','Oliveira','Costa',
           'Murphy','Kelly','O''Brien','Walsh','Ryan','Conti','Greco','Bruno','Gallo','Lombardi'])
      [1 + floor(random() * 20)::int] AS cognome,
    (date_trunc('day', now())
       - (floor(random() * 28)        || ' days')::interval
       + ((10 + floor(random() * 11)) || ' hours')::interval     -- store hours 10..20
       + (floor(random() * 60)        || ' minutes')::interval)  AS ts,
    jsonb_build_object(
      '1', random() < .5, '2', random() < .5, '3', random() < .5, '4', random() < .5,
      '5', random() < .5, '6', random() < .5, '7', random() < .5, '8', random() < .5
    ) AS answers
  FROM generate_series(1, 100) AS g
)
INSERT INTO public.quiz_sessions
  (email, nome, cognome, answers, matched_product_id, match_percent, email_sent,
   store_id, product_name, product_price, product_image, discount_code,
   discount_percent, code_redeemed, code_redeemed_at, language,
   consent_given_at, created_at)
SELECT
  'demo+' || email_n || '@suaipe-demo.app',
  nome,
  cognome,
  answers,
  (ARRAY['aurae-pulse-pro','aurae-pulse-pro','pulsar-recover-x','pulsar-recover-x','lunaring-halo',
         'brevia-gopress','vibewave-open','voltik-snapcell','aeris-glow','echobox-riff','nimbus-sip','lumio-air'])[pidx],
  match_percent,
  email_sent,
  store_id,
  (ARRAY['Aurae Pulse Pro','Aurae Pulse Pro','Pulsar Recover X','Pulsar Recover X','Lunaring Halo',
         'Brevia GoPress','VibeWave Open','Voltik SnapCell','Aeris Glow','EchoBox Riff','Nimbus Sip','Lumio Air'])[pidx],
  (ARRAY['€89,00','€89,00','€99,00','€99,00','€99,00','€119,00','€79,00','€54,00','€89,00','€64,00','€45,00','€149,00'])[pidx],
  '/products/' ||
    (ARRAY['aurae-pulse-pro','aurae-pulse-pro','pulsar-recover-x','pulsar-recover-x','lunaring-halo',
           'brevia-gopress','vibewave-open','voltik-snapcell','aeris-glow','echobox-riff','nimbus-sip','lumio-air'])[pidx]
    || '.png',
  'SUP-' || upper(substr(md5(random()::text || g::text), 1, 8)) || lpad(disc::text, 2, '0'),
  disc,
  redeemed,
  CASE WHEN redeemed THEN ts + ((1 + floor(random() * 72)) || ' hours')::interval ELSE NULL END,
  lang,
  ts,
  ts
FROM r;

-- ── Funnel events — descending funnel (240 → 165 → 100) ─────────────────────
INSERT INTO public.quiz_funnel_events (funnel_key, event_type, store_id, created_at)
SELECT
  'demo-' || et.t || '-' || g,
  et.t,
  (ARRAY['rio-de-janeiro','lisboa','dublino','milano'])[1 + floor(random()*4)::int],
  date_trunc('day', now())
    - (floor(random() * 28)        || ' days')::interval
    + ((10 + floor(random() * 11)) || ' hours')::interval
FROM (VALUES ('quiz_started', 240), ('result_shown', 165), ('claimed', 100)) AS et(t, n)
CROSS JOIN LATERAL generate_series(1, et.n) AS g;

COMMIT;

-- Sanity check (optional):
-- SELECT store_id, count(*) FROM quiz_sessions WHERE email LIKE '%@suaipe-demo.app' GROUP BY store_id;
-- SELECT event_type, count(*) FROM quiz_funnel_events WHERE funnel_key LIKE 'demo-%' GROUP BY event_type;
