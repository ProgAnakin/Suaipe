-- The second factor in the database (20261011000003_mfa_gate_in_database.sql): table by table and RPC by RPC,
-- a token that is NOT aal2 (password only) is refused once `app_config.require_mfa` is on — and nothing the
-- kiosk needs is refused even then. Runs after security.sql, in the same database (reuses its `qa` helpers).
\set ON_ERROR_STOP off
\o /dev/null

\set M '''11111111-1111-4111-8111-111111111111'''
\set R '''22222222-2222-4222-8222-222222222222'''
\set C '''33333333-3333-4333-8333-333333333333'''
\set X '''44444444-4444-4444-8444-444444444444'''

-- as_user with an explicit assurance level: aal1, aal2, or 'none' (a token without the claim at all)
CREATE FUNCTION qa.as_aal(p_aal text, p_role text, p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('qa.aal', p_aal, true);
  r := qa.as_user(p_role, p_uid, p_sql);
  PERFORM set_config('qa.aal', '', true);
  RETURN r;
END $$;

-- security.sql ended with a flood of leads: age every row so the global 120-per-minute ceiling of
-- check_email_insert_limit does not refuse the inserts below (it is tested there, not here)
UPDATE public.quiz_sessions SET created_at = created_at - interval '10 minutes';
-- the product-images bucket is created by hand in a real project (docs/deployment.md); the test needs one
INSERT INTO storage.buckets(id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
SELECT qa.restore();

-- ── A. the switch is OFF by default: applying the migration changes nothing ───────────────────────────
SELECT qa.check('switch: the migration ships it OFF', 'off', (SELECT value FROM public.app_config WHERE key = 'require_mfa'));
SELECT qa.check('OFF: a manager at aal1 still reads the leads', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions),
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('OFF: a manager at aal1 still calls the staff RPCs', 'ok rows=' || (SELECT count(*) FROM public.store_roles),
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.list_store_roles_admin()$q$));
SELECT qa.check('OFF: a token with no aal claim at all still works', 'ok rows=1',
  qa.as_aal('none', 'authenticated', :M::uuid, $q$SELECT * FROM public.get_my_store_role()$q$));

-- ── B. switch ON ────────────────────────────────────────────────────────────────────────────────────────
UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa';

-- leads (PII)
SELECT qa.check('ON · leads: a manager at aal1 sees none', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('ON · leads: a manager at aal2 sees them', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('ON · leads: a token without an aal claim is not aal2', 'ok rows=0', qa.as_aal('none', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('ON · leads: a store responsible at aal1 sees none', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :R::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('ON · leads: a store responsible at aal2 sees their store', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions WHERE store_id = 'milano'), qa.as_aal('aal2', 'authenticated', :R::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('ON · leads: redeeming through a direct UPDATE at aal1 touches nothing', 'ok rows=0',
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$UPDATE public.quiz_sessions SET code_redeemed = true WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003'$q$));

-- the staff-only RPCs
SELECT qa.check('ON · mark_code_redeemed at aal1 is refused', 'ERROR 42501: mfa required', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000003')$q$));
SELECT qa.check('ON · mark_code_redeemed at aal2 works', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000003')$q$));
SELECT qa.check('ON · purge_sessions_older_than at aal1 is refused', 'ERROR 42501: mfa required', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT public.purge_sessions_older_than(1)$q$));
SELECT qa.restore();
SELECT qa.check('ON · purge_sessions_older_than at aal2 works', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT public.purge_sessions_older_than(1)$q$));
SELECT qa.restore();
SELECT qa.check('ON · purge_audit_log_older_than at aal1 is refused', 'ERROR 42501: mfa required', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT public.purge_audit_log_older_than(730)$q$));
SELECT qa.check('ON · purge_audit_log_older_than at aal2 works', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT public.purge_audit_log_older_than(730)$q$));
SELECT qa.check('ON · list_store_roles_admin at aal1 is refused', 'ERROR 42501: mfa required', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.list_store_roles_admin()$q$));
SELECT qa.check('ON · list_store_roles_admin at aal2 works', 'ok rows=' || (SELECT count(*) FROM public.store_roles), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.list_store_roles_admin()$q$));
SELECT qa.check('ON · upsert_store_role_admin at aal1 is refused (a stolen password cannot grant itself a role)', 'ERROR 42501: mfa required',
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT public.upsert_store_role_admin('nobody@example.com', 'manager', NULL)$q$));
SELECT qa.check('ON · …and no role was created', '0', (SELECT count(*)::text FROM public.store_roles WHERE user_id = :X::uuid));
SELECT qa.check('ON · upsert_store_role_admin at aal2 works', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT public.upsert_store_role_admin('nobody@example.com', 'consulente', NULL)$q$));
SELECT qa.check('ON · delete_store_role_admin at aal1 is refused', 'ERROR 42501: mfa required',
  qa.as_aal('aal1', 'authenticated', :M::uuid, format($q$SELECT public.delete_store_role_admin(%L)$q$, (SELECT id FROM public.store_roles WHERE user_id = :X::uuid))));
SELECT qa.check('ON · delete_store_role_admin at aal2 works', 'ok rows=1',
  qa.as_aal('aal2', 'authenticated', :M::uuid, format($q$SELECT public.delete_store_role_admin(%L)$q$, (SELECT id FROM public.store_roles WHERE user_id = :X::uuid))));
SELECT qa.check('ON · get_my_store_role at aal1: the account has no role', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.get_my_store_role()$q$));
SELECT qa.check('ON · get_my_store_role at aal2', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.get_my_store_role()$q$));

-- tables only staff touch
SELECT qa.check('ON · store_roles at aal1: not even your own row', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :C::uuid, $q$SELECT * FROM public.store_roles$q$));
SELECT qa.check('ON · store_roles at aal2: your own row', 'ok rows=1', qa.as_aal('aal2', 'authenticated', :C::uuid, $q$SELECT * FROM public.store_roles$q$));
SELECT qa.check('ON · audit log at aal1: a manager cannot write', 'ERROR',
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$INSERT INTO public.manager_audit_log(user_id,user_email,product_id,action,store_id) VALUES ('11111111-1111-4111-8111-111111111111','manager@example.com','p1','product_toggle','milano')$q$));
SELECT qa.check('ON · audit log at aal2: a manager writes', 'ok rows=1',
  qa.as_aal('aal2', 'authenticated', :M::uuid, $q$INSERT INTO public.manager_audit_log(user_id,user_email,product_id,action,store_id) VALUES ('11111111-1111-4111-8111-111111111111','manager@example.com','p1','product_toggle','milano')$q$));
SELECT qa.check('ON · audit log at aal1: a manager reads none', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.manager_audit_log$q$));
SELECT qa.check('ON · audit log at aal2: a manager reads it', 'ok rows=' || (SELECT count(*) FROM public.manager_audit_log), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.manager_audit_log$q$));
INSERT INTO public.quiz_funnel_events(funnel_key,event_type,store_id) VALUES ('a0000000-0000-4000-8000-0000000000f1','claimed','milano');
SELECT qa.check('ON · funnel events at aal1: none', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_funnel_events$q$));
SELECT qa.check('ON · funnel events at aal2: a manager reads them', 'ok rows=' || (SELECT count(*) FROM public.quiz_funnel_events), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_funnel_events$q$));
SELECT qa.check('ON · e-mail template at aal1: a manager reads none', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.email_template$q$));
SELECT qa.check('ON · e-mail template at aal1: a manager cannot edit', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$UPDATE public.email_template SET sender_name = 'X'$q$));
SELECT qa.check('ON · e-mail template at aal2: a manager reads it', 'ok rows=' || (SELECT count(*) FROM public.email_template), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.email_template$q$));

-- the public catalogue: writes need aal2, reads never do
SELECT qa.check('ON · catalogue write at aal1 is refused', 'ERROR',
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$INSERT INTO public.custom_products(id,name,description,price,tags,faq,status) VALUES ('mfa-x','x','x','1',ARRAY['audio'],'[]','active')$q$));
SELECT qa.check('ON · catalogue write at aal2 works', 'ok rows=1',
  qa.as_aal('aal2', 'authenticated', :M::uuid, $q$INSERT INTO public.custom_products(id,name,description,price,tags,faq,status) VALUES ('mfa-x','x','x','1',ARRAY['audio'],'[]','active')$q$));
DELETE FROM public.custom_products WHERE id = 'mfa-x';
SELECT qa.check('ON · a store responsible edits their store at aal1: refused', 'ERROR',
  qa.as_aal('aal1', 'authenticated', :R::uuid, $q$INSERT INTO public.product_settings(product_id, store_id, active) VALUES ('mfa-p','milano',true)$q$));
SELECT qa.check('ON · a store responsible edits their store at aal2: works', 'ok rows=1',
  qa.as_aal('aal2', 'authenticated', :R::uuid, $q$INSERT INTO public.product_settings(product_id, store_id, active) VALUES ('mfa-p','milano',true)$q$));
DELETE FROM public.product_settings WHERE product_id = 'mfa-p';
SELECT qa.check('ON · quiz cards update at aal1 changes nothing', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$UPDATE public.quiz_cards SET active = active$q$));
SELECT qa.check('ON · quiz cards update at aal2 works', 'ok rows=' || (SELECT count(*) FROM public.quiz_cards), qa.as_aal('aal2', 'authenticated', :M::uuid, $q$UPDATE public.quiz_cards SET active = active$q$));

-- uploads
SELECT qa.check('ON · an upload at aal1 is refused', 'ERROR',
  qa.as_aal('aal1', 'authenticated', :M::uuid, $q$INSERT INTO storage.objects(bucket_id, name, owner) VALUES ('product-images', 'mfa-test.png', '11111111-1111-4111-8111-111111111111')$q$));
SELECT qa.check('ON · an upload at aal2 works', 'ok rows=1',
  qa.as_aal('aal2', 'authenticated', :M::uuid, $q$INSERT INTO storage.objects(bucket_id, name, owner) VALUES ('product-images', 'mfa-test.png', '11111111-1111-4111-8111-111111111111')$q$));
DELETE FROM storage.objects WHERE name = 'mfa-test.png';

-- ── C. what must keep working, switch ON, aal1 — the kiosk with a leftover half-finished staff session ──────
SELECT qa.check('ON · kiosk: the claim works for an authenticated session at aal1', 'ok rows=1',
  qa.as_aal('aal1', 'authenticated', :X::uuid, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('mfa-kiosk@example.com','p1',70,'milano',now())$q$));
SELECT qa.check('ON · kiosk: funnel events can be written at aal1', 'ok rows=1',
  qa.as_aal('aal1', 'authenticated', :X::uuid, $q$INSERT INTO public.quiz_funnel_events(funnel_key,event_type,store_id) VALUES ('a0000000-0000-4000-8000-0000000000f2','quiz_started','milano')$q$));
SELECT qa.check('ON · kiosk: the catalogue is readable at aal1 (custom_products)', 'ok rows=' || (SELECT count(*) FROM public.custom_products), qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT * FROM public.custom_products$q$));
SELECT qa.check('ON · kiosk: the quiz cards are readable at aal1', 'ok rows=' || (SELECT count(*) FROM public.quiz_cards), qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT * FROM public.quiz_cards$q$));
SELECT qa.check('ON · kiosk: the store settings are readable at aal1', 'ok rows=', qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT * FROM public.product_settings$q$));
SELECT qa.check('ON · kiosk: the global status is readable at aal1', 'ok rows=', qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT * FROM public.product_global_status$q$));
SELECT qa.check('ON · kiosk: the e-mail cooldown check works at aal1', 'ok rows=1', qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT * FROM public.check_email_cooldown('someone@example.com')$q$));
SELECT qa.check('ON · kiosk: anon still reads the catalogue', 'ok rows=' || (SELECT count(*) FROM public.quiz_cards), qa.as_aal('none', 'anon', NULL, $q$SELECT * FROM public.quiz_cards$q$));
SELECT qa.check('ON · kiosk: anon can still claim', 'ok rows=1',
  qa.as_aal('none', 'anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('mfa-anon@example.com','p1',70,'milano',now())$q$));

-- ── D. the switch itself ──────────────────────────────────────────────────────────────────────────────────
UPDATE public.app_config SET value = ' ON ' WHERE key = 'require_mfa';
SELECT qa.check('switch: case and spaces do not matter', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
UPDATE public.app_config SET value = 'yes' WHERE key = 'require_mfa';
SELECT qa.check('switch: a typo ("yes") enforces instead of silently not', 'ok rows=0', qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
DELETE FROM public.app_config WHERE key = 'require_mfa';
SELECT qa.check('switch: no row at all means OFF (the pre-migration behaviour)', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions), qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
UPDATE public.app_config SET value = 'off' WHERE key = 'require_mfa';
INSERT INTO public.app_config(key, value) VALUES ('require_mfa', 'off') ON CONFLICT (key) DO UPDATE SET value = 'off';
SELECT qa.check('switch: set back to off, aal1 works again (instant rollback)', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions), qa.as_aal('aal1', 'authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));

-- ── E. nobody can flip the switch or call the helpers' internals from the API ──────────────────────────────
SELECT qa.check('the switch lives in app_config: a signed-in manager cannot read or change it', 'ok rows=0',
  qa.as_aal('aal2', 'authenticated', :M::uuid, $q$SELECT * FROM public.app_config$q$));
SELECT qa.check('…nor update it', 'ok rows=0', qa.as_aal('aal2', 'authenticated', :M::uuid, $q$UPDATE public.app_config SET value = 'off'$q$));
SELECT qa.check('the helpers are not exposed as API routes (private schema)', '0',
  (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('mfa_satisfied', 'require_mfa')));
SELECT qa.check('anon has no business with the private helpers (least privilege)', 'ERROR 42501',
  qa.as_aal('none', 'anon', NULL, $q$SELECT private.mfa_satisfied()$q$));
SELECT qa.check('…a signed-in user may evaluate it (their policies do) and it only reports on their own token', 'ok rows=1',
  qa.as_aal('aal1', 'authenticated', :X::uuid, $q$SELECT private.mfa_satisfied()$q$));

-- ── F. a later migration cannot quietly drop the gate ─────────────────────────────────────────────────────
SELECT qa.check('every staff-only SECURITY DEFINER function in public checks the second factor', 'none',
  (SELECT coalesce(string_agg(p.proname, ', '), 'none')
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      -- the functions the kiosk (anonymous visitors) must be able to call
      AND p.proname NOT IN ('check_email_cooldown', 'check_login_rate_limit', 'record_login_attempt', 'verify_staff_pin', 'check_email_insert_limit')
      AND p.prosrc !~ 'require_mfa|mfa_satisfied'));

-- report ---------------------------------------------------------------------------------------------------------
\o
\pset format aligned
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS res, name, expected, left(actual, 100) AS actual FROM qa.results WHERE NOT ok OR :'verbose' = 'on' ORDER BY n;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM qa.results;
