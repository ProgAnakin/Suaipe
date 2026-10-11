-- Behavioural security tests: attack the schema built from supabase/migrations as every role
-- (anon, a role-less user, consulente, consulente_responsabile, manager, service_role) and check
-- what each may read, write, delete and call. Run with supabase/tests/run.sh.
-- Each check records PASS/FAIL in qa.results; the runner exits non-zero if any failed.
\set ON_ERROR_STOP off
\o /dev/null
DROP SCHEMA IF EXISTS qa CASCADE;
CREATE SCHEMA qa;
CREATE TABLE qa.results(n serial, name text, expected text, actual text, ok boolean);

CREATE FUNCTION qa.as_user(p_role text, p_uid uuid, p_sql text, p_headers text DEFAULT '{}') RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; res text; claims text;
BEGIN
  claims := json_build_object('sub', p_uid, 'role', p_role)::text;
  PERFORM set_config('request.jwt.claims', claims, true);
  PERFORM set_config('request.headers', p_headers, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    res := 'ok rows=' || n;
  EXCEPTION WHEN others THEN
    res := 'ERROR ' || SQLSTATE || ': ' || left(SQLERRM, 90);
  END;
  RESET ROLE;
  PERFORM set_config('request.headers', '', true);
  RETURN res;
END $$;

CREATE FUNCTION qa.check(p_name text, p_expected text, p_actual text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO qa.results(name, expected, actual, ok) VALUES (p_name, p_expected, p_actual, p_actual LIKE p_expected || '%');
$$;

-- fixtures ------------------------------------------------------------------------------------
INSERT INTO auth.users(id, email) VALUES
 ('11111111-1111-4111-8111-111111111111','manager@example.com'),
 ('22222222-2222-4222-8222-222222222222','resp@example.com'),
 ('33333333-3333-4333-8333-333333333333','cons@example.com'),
 ('44444444-4444-4444-8444-444444444444','nobody@example.com');
INSERT INTO public.store_roles(user_id, role, store_id) VALUES
 ('11111111-1111-4111-8111-111111111111','manager',NULL),
 ('22222222-2222-4222-8222-222222222222','consulente_responsabile','milano'),
 ('33333333-3333-4333-8333-333333333333','consulente',NULL);
INSERT INTO public.quiz_sessions(id,email,matched_product_id,match_percent,store_id,nome,cognome,created_at,email_sent,discount_code)
VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','old1@example.com','p1',80,'milano','Old','One', now()-interval '10 days', true,'SUP-AAAAAAA105'),
 ('aaaaaaaa-0000-4000-8000-000000000002','old2@example.com','p1',80,'lisboa','Old','Two', now()-interval '10 days', true,'SUP-AAAAAAA205'),
 ('aaaaaaaa-0000-4000-8000-000000000003','new1@example.com','p1',80,'milano','New','One', now(), true,'SUP-AAAAAAA305'),
 ('aaaaaaaa-0000-4000-8000-000000000004','new2@example.com','p1',80,'lisboa','New','Two', now(), true,'SUP-AAAAAAA405');
CREATE TABLE qa.fixtures AS SELECT * FROM public.quiz_sessions;
CREATE FUNCTION qa.restore() RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.quiz_sessions SELECT * FROM qa.fixtures f WHERE f.id NOT IN (SELECT id FROM public.quiz_sessions);
$$;

\set M '''11111111-1111-4111-8111-111111111111'''
\set R '''22222222-2222-4222-8222-222222222222'''
\set C '''33333333-3333-4333-8333-333333333333'''
\set X '''44444444-4444-4444-8444-444444444444'''

-- 1. anonymous writes to quiz_sessions ---------------------------------------------------------
-- the exact payload the kiosk sends (src/pages/Index.tsx handleClaim), with the client-chosen id
SELECT qa.check('kiosk: the normal claim payload is accepted', 'ok rows=1',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(id,email,answers,matched_product_id,match_percent,email_sent,nome,cognome,store_id,product_name,product_price,product_image,product_video,discount_percent,language,consent_given_at) VALUES ('bbbbbbbb-0000-4000-8000-000000000001','ok@example.com','{"1":true,"2":false}','p1',70,false,'Ok','Lead','milano','Prod','€10,00','https://suaipe.vercel.app/products/p1.png',NULL,5,'en',now())$q$));
SELECT qa.check('kiosk: the retry of the SAME claim id hits the primary key (23505), not a second row', 'ERROR 23505',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(id,email,answers,matched_product_id,match_percent,email_sent,nome,cognome,store_id,product_name,product_price,product_image,product_video,discount_percent,language,consent_given_at) VALUES ('bbbbbbbb-0000-4000-8000-000000000001','ok@example.com','{"1":true,"2":false}','p1',70,false,'Ok','Lead','milano','Prod','€10,00','https://suaipe.vercel.app/products/p1.png',NULL,5,'en',now())$q$));
SELECT qa.check('kiosk: a manager-set 30 % discount is accepted', 'ok rows=1',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_percent,consent_given_at) VALUES ('thirty@example.com','p1',70,'milano',30,now())$q$));
SELECT qa.check('anon: cannot read leads', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('anon: cannot update leads (0 rows)', 'ok rows=0', qa.as_user('anon', NULL, $q$UPDATE public.quiz_sessions SET nome='x'$q$));
SELECT qa.check('anon: cannot delete leads (0 rows)', 'ok rows=0', qa.as_user('anon', NULL, $q$DELETE FROM public.quiz_sessions$q$));
SELECT qa.check('anon: FORGED discount_percent=90 is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_percent,consent_given_at) VALUES ('forge1@example.com','p1',70,'milano',90 + 9 + 1,now())$q$));
SELECT qa.check('anon: FORGED discount_percent=999 is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_percent,consent_given_at) VALUES ('forge2@example.com','p1',70,'milano',999,now())$q$));
SELECT qa.check('anon: FORGED negative discount is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_percent,consent_given_at) VALUES ('forge2b@example.com','p1',70,'milano',-5,now())$q$));
SELECT qa.check('anon: a pre-made discount_code is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_code,consent_given_at) VALUES ('forge3@example.com','p1',70,'milano','SUP-FORGED0090',now())$q$));
SELECT qa.check('anon: a pre-made code marked as already e-mailed is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,discount_code,email_sent,consent_given_at) VALUES ('forge3b@example.com','p1',70,'milano','SUP-FORGED0191',true,now())$q$));
SELECT qa.check('anon: email_sent=true is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,email_sent,consent_given_at) VALUES ('forge4@example.com','p1',70,'milano',true,now())$q$));
SELECT qa.check('anon: code_redeemed=true is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,code_redeemed,consent_given_at) VALUES ('forge5@example.com','p1',70,'milano',true,now())$q$));
SELECT qa.check('anon: a lead without a consent record is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id) VALUES ('noconsent@example.com','p1',70,'milano')$q$));
SELECT qa.check('anon: a consent timestamp from next year is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('future@example.com','p1',70,'milano',now()+interval '1 year')$q$));
SELECT qa.check('anon: a 10 MB product_name is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,product_name,consent_given_at) VALUES ('big@example.com','p1',70,'milano',repeat('x',10000000),now())$q$));
SELECT qa.check('anon: a 5000-char name is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,nome,consent_given_at) VALUES ('long@example.com','p1',70,'milano',repeat('n',5000),now())$q$));
SELECT qa.check('anon: a 300-char e-mail is refused', 'ERROR',
  qa.as_user('anon', NULL, format($q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES (%L,'p1',70,'milano',now())$q$, repeat('a',290)||'@example.com')));
SELECT qa.check('anon: an oversized answers blob is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,answers,consent_given_at) VALUES ('blob@example.com','p1',70,'milano',(SELECT jsonb_object_agg(g::text, true) FROM generate_series(1,2000) g),now())$q$));
SELECT qa.check('anon: a malformed store id is refused', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('store@example.com','p1',70,'DROP TABLE;--',now())$q$));

-- 2. destructive / privileged RPCs ---------------------------------------------------------------
SELECT qa.check('purge: anon is refused', 'ERROR', qa.as_user('anon', NULL, $q$SELECT public.purge_sessions_older_than(1)$q$));
SELECT qa.restore();
SELECT qa.check('purge: a role-less authenticated user is refused', 'ERROR', qa.as_user('authenticated', :X::uuid, $q$SELECT public.purge_sessions_older_than(1)$q$));
SELECT qa.restore();
SELECT qa.check('purge: the lowest role (consulente) is refused', 'ERROR', qa.as_user('authenticated', :C::uuid, $q$SELECT public.purge_sessions_older_than(1)$q$));
SELECT qa.restore();
SELECT qa.check('purge: a store responsible may NOT purge every store', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$SELECT public.purge_sessions_older_than(7)$q$));
SELECT qa.restore();
SELECT qa.check('purge: a store responsible may NOT purge another store', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$SELECT public.purge_sessions_older_than(7, 'lisboa')$q$));
SELECT qa.restore();
SELECT qa.check('purge: nothing was deleted by the refused calls', '4',
  (SELECT count(*)::text FROM public.quiz_sessions WHERE id::text LIKE 'aaaaaaaa%'));
SELECT qa.check('purge: a store responsible may purge their own store', 'ok rows=1',
  qa.as_user('authenticated', :R::uuid, $q$SELECT public.purge_sessions_older_than(7, 'milano')$q$));
SELECT qa.check('  …and only the old lead of THAT store went', '0:1',
  (SELECT (SELECT count(*) FROM public.quiz_sessions WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001')::text || ':' || (SELECT count(*) FROM public.quiz_sessions WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002')::text));
SELECT qa.restore();
SELECT qa.check('purge: a manager may purge one store', 'ok rows=1', qa.as_user('authenticated', :M::uuid, $q$SELECT public.purge_sessions_older_than(7, 'lisboa')$q$));
SELECT qa.restore();
SELECT qa.check('purge: a manager may purge all stores', 'ok rows=1', qa.as_user('authenticated', :M::uuid, $q$SELECT public.purge_sessions_older_than(7)$q$));
SELECT qa.check('  …both old leads are gone, the fresh ones stay', '0:2',
  (SELECT (SELECT count(*) FROM public.quiz_sessions WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002'))::text || ':' || (SELECT count(*) FROM public.quiz_sessions WHERE id IN ('aaaaaaaa-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000004'))::text));
SELECT qa.restore();

SELECT qa.check('mark_code_redeemed: anon is refused', 'ERROR', qa.as_user('anon', NULL, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000003')$q$));
SELECT qa.check('mark_code_redeemed: role-less user is refused', 'ERROR', qa.as_user('authenticated', :X::uuid, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000003')$q$));
SELECT qa.check('mark_code_redeemed: a store responsible cannot redeem another store''s code', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000004')$q$));
SELECT qa.check('mark_code_redeemed: a store responsible may redeem their own store''s code', 'ok rows=1', qa.as_user('authenticated', :R::uuid, $q$SELECT public.mark_code_redeemed('aaaaaaaa-0000-4000-8000-000000000003')$q$));
SELECT qa.check('upsert_store_role_admin: consulente is refused', 'ERROR', qa.as_user('authenticated', :C::uuid, $q$SELECT public.upsert_store_role_admin('nobody@example.com','manager',NULL)$q$));
SELECT qa.check('upsert_store_role_admin: anon is refused', 'ERROR', qa.as_user('anon', NULL, $q$SELECT public.upsert_store_role_admin('nobody@example.com','manager',NULL)$q$));
SELECT qa.check('list_store_roles_admin: a store responsible is refused', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$SELECT * FROM public.list_store_roles_admin()$q$));
SELECT qa.check('purge_audit_log_older_than: a store responsible is refused', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$SELECT public.purge_audit_log_older_than(180)$q$));
SELECT qa.check('purge_audit_log_older_than: anon is refused', 'ERROR', qa.as_user('anon', NULL, $q$SELECT public.purge_audit_log_older_than(180)$q$));
SELECT qa.check('a manager cannot delete their own role (lock-out guard)', 'ERROR',
  qa.as_user('authenticated', :M::uuid, $q$SELECT public.delete_store_role_admin((SELECT id FROM public.store_roles WHERE user_id = '11111111-1111-4111-8111-111111111111'))$q$));

-- 3. who reads which leads -------------------------------------------------------------------------
SELECT qa.check('manager reads the leads of every store', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions), qa.as_user('authenticated', :M::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('a store responsible reads ONLY their own store', 'ok rows=' || (SELECT count(*) FROM public.quiz_sessions WHERE store_id='milano'), qa.as_user('authenticated', :R::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('consulente reads no customer data', 'ok rows=0', qa.as_user('authenticated', :C::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('a role-less authenticated user reads no customer data', 'ok rows=0', qa.as_user('authenticated', :X::uuid, $q$SELECT * FROM public.quiz_sessions$q$));
SELECT qa.check('a manager cannot UPDATE a lead directly (only the redeem RPC)', 'ERROR 42501', qa.as_user('authenticated', :M::uuid, $q$UPDATE public.quiz_sessions SET nome='hacked'$q$));
SELECT qa.check('a manager cannot DELETE a lead directly (only the purge RPC)', 'ok rows=0', qa.as_user('authenticated', :M::uuid, $q$DELETE FROM public.quiz_sessions$q$));

-- 4. staff PIN -------------------------------------------------------------------------------------
INSERT INTO public.app_config(key, value) VALUES ('staff_pin_hash', extensions.crypt('4821', extensions.gen_salt('bf'))) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
CREATE FUNCTION qa.pin_attempts(n int, rotate_client boolean, p_pin text DEFAULT '0000', p_role text DEFAULT 'anon', p_ip text DEFAULT NULL, p_hdr text DEFAULT '{}') RETURNS text LANGUAGE plpgsql AS $$
DECLARE i int; r jsonb; locked int := 0; shape_ok boolean := true;
BEGIN
  FOR i IN 1..n LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('role', p_role)::text, true);
    PERFORM set_config('request.headers', p_hdr, true);
    EXECUTE format('SET LOCAL ROLE %I', p_role);
    BEGIN
      r := public.verify_staff_pin(p_pin, CASE WHEN rotate_client THEN 'attacker-' || i ELSE 'one-client' END, 'ua', p_ip);
    EXCEPTION WHEN others THEN
      RESET ROLE; RETURN 'ERROR ' || SQLSTATE || ' ' || left(SQLERRM, 80);
    END;
    RESET ROLE;
    IF (r->>'locked_seconds')::int > 0 THEN locked := locked + 1; END IF;
  END LOOP;
  RETURN 'processed without lockout: ' || (n - locked) || ' of ' || n;
END $$;
SELECT qa.check('PIN: the right PIN works for anon', 'processed without lockout: 1 of 1', qa.pin_attempts(1, false, '4821'));
DELETE FROM public.admin_access_log;
SELECT qa.check('PIN: one client is locked after 3 wrong guesses (and gets a JSON answer, not an error)', 'processed without lockout: 3 of 10', qa.pin_attempts(10, false));
DELETE FROM public.admin_access_log;
SELECT qa.check('PIN: sending a fresh client_id every time does NOT defeat the lockout (60 guesses)', 'x', qa.pin_attempts(60, true));
UPDATE qa.results SET expected = '≤ 20 of 60 processed', ok = (CASE WHEN actual LIKE 'ERROR%' THEN false ELSE (regexp_replace(actual, '^\D+(\d+) of \d+$', '\1')::int <= 20) END) WHERE name LIKE 'PIN: sending a fresh%';
DELETE FROM public.admin_access_log;
SELECT qa.check('PIN: after the guess limit even the RIGHT pin is held back (global throttle)', 'x',
  (SELECT qa.pin_attempts(25, true) || ' / then right pin: ' || qa.pin_attempts(1, true, '4821')));
UPDATE qa.results SET expected = 'right pin refused while throttled', ok = (actual LIKE '%then right pin: processed without lockout: 0 of 1') WHERE name LIKE 'PIN: after the guess limit%';
DELETE FROM public.admin_access_log;
SELECT qa.check('PIN: the Edge Function (service_role) forwards the browser''s address; 10 failures from one address lock it', 'x',
  qa.pin_attempts(15, true, '0000', 'service_role', '203.0.113.7'));
UPDATE qa.results SET expected = '≤ 10 of 15 processed', ok = (CASE WHEN actual LIKE 'ERROR%' THEN false ELSE (regexp_replace(actual, '^\D+(\d+) of \d+$', '\1')::int <= 10) END) WHERE name LIKE 'PIN: the Edge Function%';
DELETE FROM public.admin_access_log;
SELECT qa.check('PIN: a browser cannot choose its own address (ip_address argument is ignored for anon)', 'x',
  qa.pin_attempts(15, true, '0000', 'anon', NULL, '{"x-real-ip":"198.51.100.9"}'));
UPDATE qa.results SET expected = '≤ 10 of 15 processed (locked by the gateway-seen address)', ok = (CASE WHEN actual LIKE 'ERROR%' THEN false ELSE (regexp_replace(actual, '^\D+(\d+) of \d+$', '\1')::int <= 10) END) WHERE name LIKE 'PIN: a browser cannot choose%';
DELETE FROM public.admin_access_log;

SELECT qa.check('PIN: a single verify_staff_pin remains (no weaker overload to pick)', '1', (SELECT count(*)::text FROM pg_proc WHERE proname = 'verify_staff_pin' AND pronamespace = 'public'::regnamespace));
SELECT qa.check('PIN: the 3-argument form the browser fallback uses still works', 'processed without lockout: 1 of 1',
  (SELECT CASE WHEN (public.verify_staff_pin('4821', 'browser-1', 'ua'))->>'valid' = 'true' THEN 'processed without lockout: 1 of 1' ELSE 'rejected' END));
DELETE FROM public.admin_access_log;

-- 5. rate-limit helpers can be abused by anyone -----------------------------------------------------
SELECT qa.check('login attempts: a flood of 200 calls for one victim is capped (≤ 10 rows)', 'x',
  (SELECT count(*)::text FROM (SELECT qa.as_user('anon', NULL, $q$SELECT public.record_login_attempt('Victim@Example.com ', false)$q$) FROM generate_series(1,200)) s));
UPDATE qa.results SET actual = (SELECT count(*)::text FROM public.login_attempts WHERE email = 'victim@example.com'), expected = '≤ 10 stored', ok = ((SELECT count(*) FROM public.login_attempts WHERE email IN ('victim@example.com','Victim@Example.com ')) <= 10) WHERE name LIKE 'login attempts: a flood%';
SELECT qa.check('login attempts: the limiter recognises the address in any case', 'ok rows=1', qa.as_user('anon', NULL, $q$SELECT public.check_login_rate_limit('VICTIM@example.com')$q$));
SELECT qa.check('e-mail cooldown: 12 checks of one address never produce a fake cooldown', 'x',
  (SELECT string_agg(DISTINCT (r), ',') FROM (SELECT (public.check_email_cooldown('victim2@example.com')).in_cooldown::text r FROM generate_series(1,12)) s));
UPDATE qa.results SET expected = 'false', ok = (actual = 'false') WHERE name LIKE 'e-mail cooldown: 12 checks%';

SELECT qa.check('anon has no EXECUTE on the role-admin / purge functions (defence in depth)', 'false',
  (SELECT bool_or(has_function_privilege('anon', f, 'EXECUTE'))::text FROM unnest(ARRAY[
     'public.list_store_roles_admin()'::regprocedure, 'public.upsert_store_role_admin(text,text,text)'::regprocedure,
     'public.delete_store_role_admin(uuid)'::regprocedure, 'public.purge_audit_log_older_than(integer)'::regprocedure,
     'public.purge_sessions_older_than(integer,text)'::regprocedure, 'public.mark_code_redeemed(uuid)'::regprocedure,
     'public.get_my_store_role()'::regprocedure]) f));

-- 6. audit trail integrity ---------------------------------------------------------------------------
SELECT qa.check('audit log: a user cannot write an entry in somebody else''s name', 'ERROR',
  qa.as_user('authenticated', :X::uuid, $q$INSERT INTO public.manager_audit_log(user_id,user_email,product_id,action,store_id) VALUES ('11111111-1111-4111-8111-111111111111','manager@example.com','p1','forged','milano')$q$));
SELECT qa.check('audit log: a role-less user cannot write at all', 'ERROR',
  qa.as_user('authenticated', :X::uuid, $q$INSERT INTO public.manager_audit_log(user_id,user_email,product_id,action,store_id) VALUES ('44444444-4444-4444-8444-444444444444','nobody@example.com','p1','noise','milano')$q$));
SELECT qa.check('audit log: a manager can write an entry in their own name', 'ok rows=1',
  qa.as_user('authenticated', :M::uuid, $q$INSERT INTO public.manager_audit_log(user_id,user_email,product_id,action,store_id) VALUES ('11111111-1111-4111-8111-111111111111','manager@example.com','p1','product_toggle','milano')$q$));
SELECT qa.check('audit log: nobody can edit or delete entries', 'ok rows=0', qa.as_user('authenticated', :M::uuid, $q$DELETE FROM public.manager_audit_log$q$));

-- 7. the public catalogue is readable, private tables are not -------------------------------------------
SELECT qa.check('anon reads quiz cards', 'ok rows=', qa.as_user('anon', NULL, $q$SELECT * FROM public.quiz_cards$q$));
SELECT qa.check('anon reads product settings', 'ok rows=', qa.as_user('anon', NULL, $q$SELECT * FROM public.product_settings$q$));
SELECT qa.check('anon cannot read app_config (the PIN hash)', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.app_config$q$));
SELECT qa.check('a manager cannot read app_config either', 'ok rows=0', qa.as_user('authenticated', :M::uuid, $q$SELECT * FROM public.app_config$q$));
SELECT qa.check('anon cannot read store_roles', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.store_roles$q$));
SELECT qa.check('anon cannot read the e-mail template', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.email_template$q$));
SELECT qa.check('anon cannot read the access log', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.admin_access_log$q$));
SELECT qa.check('anon cannot write the catalogue', 'ERROR 42501', qa.as_user('anon', NULL, $q$INSERT INTO public.custom_products(id,name,description,price,tags,faq,status) VALUES ('evil','x','x','1',ARRAY['audio'],'[]','active')$q$));
SELECT qa.check('a consulente cannot write the catalogue', 'ERROR', qa.as_user('authenticated', :C::uuid, $q$INSERT INTO public.custom_products(id,name,description,price,tags,faq,status) VALUES ('evil','x','x','1',ARRAY['audio'],'[]','active')$q$));
SELECT qa.check('a store responsible cannot write the global catalogue', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$INSERT INTO public.custom_products(id,name,description,price,tags,faq,status) VALUES ('evil','x','x','1',ARRAY['audio'],'[]','active')$q$));
SELECT qa.check('a store responsible can edit their own store''s settings', 'ok rows=1', qa.as_user('authenticated', :R::uuid, $q$INSERT INTO public.product_settings(product_id, store_id, active) VALUES ('p1','milano',true)$q$));
SELECT qa.check('a store responsible cannot edit another store''s settings', 'ERROR', qa.as_user('authenticated', :R::uuid, $q$INSERT INTO public.product_settings(product_id, store_id, active) VALUES ('p1','lisboa',true)$q$));
SELECT qa.check('funnel events: anon may insert', 'ok rows=1', qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_funnel_events(funnel_key,event_type,store_id) VALUES ('a0000000-0000-4000-8000-000000000001','quiz_started','milano')$q$));
INSERT INTO public.quiz_funnel_events(funnel_key,event_type,store_id) VALUES ('a0000000-0000-4000-8000-000000000002','claimed','lisboa');
SELECT qa.check('funnel events: a manager reads every store', 'ok rows=' || (SELECT count(*) FROM public.quiz_funnel_events), qa.as_user('authenticated', :M::uuid, $q$SELECT * FROM public.quiz_funnel_events$q$));
SELECT qa.check('funnel events: a store responsible reads only their own store', 'ok rows=' || (SELECT count(*) FROM public.quiz_funnel_events WHERE store_id = 'milano'), qa.as_user('authenticated', :R::uuid, $q$SELECT * FROM public.quiz_funnel_events$q$));
SELECT qa.check('funnel events: a consulente reads none', 'ok rows=0', qa.as_user('authenticated', :C::uuid, $q$SELECT * FROM public.quiz_funnel_events$q$));
SELECT qa.check('funnel events: anon cannot read', 'ok rows=0', qa.as_user('anon', NULL, $q$SELECT * FROM public.quiz_funnel_events$q$));

-- 8. the e-mail rate limit trigger -------------------------------------------------------------------------
SELECT qa.check('the 6th lead of one address inside an hour is refused', 'ERROR',
  (SELECT string_agg(r, ' | ') FROM (SELECT qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('flood@example.com','p1',70,'milano',now())$q$) r FROM generate_series(1,6)) s WHERE r LIKE 'ERROR%'));
SELECT qa.check('…and so is the same address typed in another case, with spaces', 'ERROR',
  qa.as_user('anon', NULL, $q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES ('FLOOD@Example.COM','p1',70,'milano',now())$q$));

SELECT qa.check('a flood of 150 leads in one minute (distinct addresses) is stopped by the global ceiling', 'x',
  (SELECT count(*) FILTER (WHERE r LIKE 'ERROR%')::text FROM (SELECT qa.as_user('anon', NULL, format($q$INSERT INTO public.quiz_sessions(email,matched_product_id,match_percent,store_id,consent_given_at) VALUES (%L,'p1',70,'milano',now())$q$, 'bulk' || g || '@example.com')) r FROM generate_series(1,150) g) s));
UPDATE qa.results SET expected = 'some of the 150 refused', ok = (actual::int > 0) WHERE name LIKE 'a flood of 150%';

-- 9. a fresh install must not ship with somebody's personal name in its customer e-mails -------------------------------
SELECT qa.check('e-mail template defaults carry no personal name (a buyer starts neutral)', '0',
  (SELECT count(*)::text FROM public.email_template WHERE footer_store_name ~* 'annichini' OR sender_name ~* 'annichini'));

-- report ---------------------------------------------------------------------------------------------------------
\o
\pset format aligned
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS res, name, expected, left(actual, 100) AS actual FROM qa.results WHERE NOT ok OR :'verbose' = 'on' ORDER BY n;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM qa.results;
