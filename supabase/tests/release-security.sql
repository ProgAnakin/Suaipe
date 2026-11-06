BEGIN;
SELECT run_privacy_maintenance();
CREATE FUNCTION public.test_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
 RAISE NOTICE 'PASS: %', label;
END $$;
CREATE FUNCTION public.test_denied(statement text, label text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: %', label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was allowed', label;
END $$;
CREATE FUNCTION public.test_invalid(statement text, label text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'PASS: %', label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was accepted', label;
END $$;
INSERT INTO auth.users VALUES
 ('10000000-0000-0000-0000-000000000001','manager@example.com'),
 ('10000000-0000-0000-0000-000000000002','junior@example.com'),
 ('10000000-0000-0000-0000-000000000003','store@example.com');
INSERT INTO store_roles(user_id,role,store_id) VALUES
 ('10000000-0000-0000-0000-000000000001','manager',null),
 ('10000000-0000-0000-0000-000000000002','consulente',null),
 ('10000000-0000-0000-0000-000000000003','consulente_responsabile','lisboa');
INSERT INTO custom_products(id,name,description,price) VALUES ('security-test','Test product','Test','€100');
INSERT INTO product_settings(product_id,store_id,active,discount_percent,price_override) VALUES ('security-test','lisboa',true,8,'€90');
SELECT set_config('test.payload', jsonb_build_object('email','TEST@EXAMPLE.COM','nome','Test','cognome','Customer','language','en',
 'consent_notice_version','2026-11-06','consent_given_at',now(),'store_id','lisboa','answers','{}'::jsonb,'matched_product_id','security-test','match_percent',85,
 'discount_percent',99,'product_price','€1','email_sent',true)::text,true);
SET LOCAL ROLE anon;
SELECT test_denied('SELECT purge_sessions_older_than(7)','anon cannot purge');
SELECT test_denied('SELECT begin_session_email(gen_random_uuid())','anon cannot reserve email');
SELECT test_denied('INSERT INTO quiz_sessions(email,matched_product_id,match_percent) VALUES (''x@example.com'',''security-test'',80)','direct INSERT denied');
SELECT submit_quiz_session('20000000-0000-4000-8000-000000000001',current_setting('test.payload')::jsonb);
SELECT submit_quiz_session('20000000-0000-4000-8000-000000000001',current_setting('test.payload')::jsonb);
SELECT test_invalid($q$SELECT submit_quiz_session('20000000-0000-4000-8000-000000000001',current_setting('test.payload')::jsonb || '{"discount_percent":1}')$q$,'changed retry rejected');
SELECT test_invalid($q$SELECT submit_quiz_session(gen_random_uuid(),current_setting('test.payload')::jsonb || '{"store_id":"unknown"}')$q$,'unknown store rejected');
RESET ROLE;
SELECT test_assert((SELECT count(*)=1 FROM quiz_sessions WHERE id='20000000-0000-4000-8000-000000000001'),'retry creates one row');
SELECT test_assert((SELECT discount_percent=8 AND product_price='€90' AND email='test@example.com' AND NOT email_sent FROM quiz_sessions WHERE id='20000000-0000-4000-8000-000000000001'),'server derives commercial data and normalizes email');
UPDATE product_settings SET active=false WHERE product_id='security-test';
SET LOCAL ROLE anon;
SELECT test_invalid($q$SELECT submit_quiz_session(gen_random_uuid(),current_setting('test.payload')::jsonb)$q$,'inactive product rejected');
RESET ROLE;
UPDATE product_settings SET active=true WHERE product_id='security-test';
SET LOCAL ROLE service_role;
SELECT test_assert(begin_session_email('20000000-0000-4000-8000-000000000001') IS NOT NULL,'first email reserved');
SELECT test_assert(begin_session_email('20000000-0000-4000-8000-000000000001') IS NULL,'duplicate email reservation refused');
RESET ROLE;
UPDATE quiz_sessions SET email_sent=true,email_status='sent' WHERE id='20000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
SELECT test_assert((SELECT count(*)=0 FROM quiz_sessions),'aal1 cannot read PII');
SELECT test_denied('SELECT purge_sessions_older_than(7)','aal1 cannot purge');
SELECT test_denied('SELECT list_store_roles_admin()','aal1 cannot list staff');
SELECT test_denied($q$SELECT mark_code_redeemed('20000000-0000-4000-8000-000000000001')$q$,'aal1 cannot redeem');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',true);
SELECT test_denied('SELECT purge_sessions_older_than(7)','junior cannot purge');
SELECT test_denied($q$SELECT mark_code_redeemed('20000000-0000-4000-8000-000000000001')$q$,'junior cannot redeem');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',true);
SELECT test_denied('SELECT purge_sessions_older_than(7)','store lead cannot purge globally');
SELECT test_assert(mark_code_redeemed('20000000-0000-4000-8000-000000000001')=1,'store lead redeems own valid code');
SELECT test_assert(mark_code_redeemed('20000000-0000-4000-8000-000000000001')=0,'redemption is idempotent');
SELECT test_denied($q$UPDATE quiz_sessions SET code_redeemed=false$q$,'direct redemption UPDATE denied');
RESET ROLE;
UPDATE quiz_sessions SET code_redeemed=false,store_id='milano' WHERE id='20000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT test_assert(mark_code_redeemed('20000000-0000-4000-8000-000000000001')=0,'store lead cannot redeem another store');
RESET ROLE;
UPDATE quiz_sessions SET store_id='lisboa',expires_at=now()-interval '1 minute' WHERE id='20000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT test_assert(mark_code_redeemed('20000000-0000-4000-8000-000000000001')=0,'expired code cannot be redeemed');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
SELECT test_assert(purge_sessions_older_than(7)=0,'manager purge preserves recent sessions');
RESET ROLE;
UPDATE quiz_sessions SET created_at=now()-interval '8 days';
SET LOCAL ROLE authenticated;
SELECT test_assert(purge_sessions_older_than(7)=1,'manager can purge old sessions');
ROLLBACK;
