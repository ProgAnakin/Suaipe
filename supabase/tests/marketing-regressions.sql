BEGIN;
SELECT run_privacy_maintenance();
CREATE FUNCTION public.marketing_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION public.marketing_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR invalid_parameter_value THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was allowed',label;
END $$;
INSERT INTO auth.users(id,email) VALUES('91000000-0000-4000-8000-000000000001','manager@example.invalid');
INSERT INTO store_roles(user_id,role) VALUES('91000000-0000-4000-8000-000000000001','manager');
INSERT INTO custom_products(id,name,description,price) VALUES('marketing-probe','Synthetic','Consent test','EUR 100');
SELECT set_config('test.marketing_payload',jsonb_build_object('email','synthetic-marketing@example.com','nome','Synthetic','cognome','Visitor',
 'language','en','consent_given_at',now(),'consent_notice_version','2026-11-06','store_id','lisboa',
 'matched_product_id','marketing-probe','match_percent',80,'answers','{}'::jsonb)::text,true);
SET LOCAL ROLE anon;
SELECT submit_quiz_session('91000000-0000-4000-8000-000000000010',current_setting('test.marketing_payload')::jsonb);
SELECT marketing_denied($q$SELECT submit_quiz_session('91000000-0000-4000-8000-000000000011',current_setting('test.marketing_payload')::jsonb||'{"marketing_opt_in":true,"marketing_notice_version":"marketing-2026-11-07"}')$q$,'marketing cannot be enabled by the visitor');
SELECT marketing_denied($q$SELECT submit_quiz_session('91000000-0000-4000-8000-000000000012',current_setting('test.marketing_payload')::jsonb||'{"marketing_opt_in":"true"}')$q$,'marketing rejects string booleans');
SELECT marketing_denied($q$SELECT withdraw_marketing_consent('synthetic-marketing@example.com')$q$,'anonymous callers cannot withdraw another visitor consent');
RESET ROLE;
SELECT marketing_assert((SELECT NOT marketing_opt_in AND marketing_consent_at IS NULL FROM quiz_sessions WHERE id='91000000-0000-4000-8000-000000000010'),'transactional participation never grants marketing consent');
UPDATE app_config SET value='true' WHERE key='marketing_enabled';
SET LOCAL ROLE anon;
SELECT marketing_denied($q$SELECT submit_quiz_session('91000000-0000-4000-8000-000000000013',current_setting('test.marketing_payload')::jsonb||'{"marketing_opt_in":true}')$q$,'marketing requires the separate notice version');
SELECT submit_quiz_session('91000000-0000-4000-8000-000000000014',current_setting('test.marketing_payload')::jsonb||'{"marketing_opt_in":true,"marketing_notice_version":"marketing-2026-11-07"}');
SELECT marketing_denied($q$SELECT submit_quiz_session('91000000-0000-4000-8000-000000000014',current_setting('test.marketing_payload')::jsonb||'{"marketing_opt_in":false}')$q$,'retries cannot change the marketing choice');
RESET ROLE;
SELECT marketing_assert((SELECT marketing_opt_in AND marketing_consent_at<=now() AND marketing_notice_version='marketing-2026-11-07' FROM quiz_sessions WHERE id='91000000-0000-4000-8000-000000000014'),'separate marketing choice is recorded with server timestamp');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
SELECT marketing_denied($q$SELECT withdraw_marketing_consent('synthetic-marketing@example.com')$q$,'withdrawal administration requires MFA');
SELECT set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SELECT marketing_assert(withdraw_marketing_consent('synthetic-marketing@example.com')=1,'manager can record a verified withdrawal');
RESET ROLE;
SELECT marketing_assert((SELECT marketing_withdrawn_at IS NOT NULL AND marketing_opt_in FROM quiz_sessions WHERE id='91000000-0000-4000-8000-000000000014'),'withdrawal preserves original evidence while preventing marketing use');
SELECT marketing_assert((SELECT count(*)=1 FROM manager_audit_log WHERE product_id='quiz_sessions:91000000-0000-4000-8000-000000000014' AND source='database'),'withdrawal is audited without copying personal fields');
SELECT marketing_assert((SELECT file_size_limit=5242880 AND NOT ('image/svg+xml'=ANY(allowed_mime_types)) FROM storage.buckets WHERE id='product-images'),'storage bounds file size and refuses active MIME types');
ROLLBACK;
