BEGIN;
SELECT run_privacy_maintenance();
CREATE FUNCTION public.audit_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION public.audit_denied(statement text,label text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was allowed',label;
END $$;
CREATE FUNCTION public.audit_invalid(statement text,label text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was accepted',label;
END $$;
INSERT INTO auth.users(id,email) VALUES
 ('90000000-0000-4000-8000-000000000001','audit-manager@example.com'),
 ('90000000-0000-4000-8000-000000000002','audit-lead@example.com'),
 ('90000000-0000-4000-8000-000000000003','audit-no-role@example.com'),
 ('90000000-0000-4000-8000-000000000004','audit-consultant@example.com');
INSERT INTO store_roles(user_id,role,store_id) VALUES
 ('90000000-0000-4000-8000-000000000001','manager',null),
 ('90000000-0000-4000-8000-000000000002','consulente_responsabile','lisboa'),
 ('90000000-0000-4000-8000-000000000004','consulente',null);
INSERT INTO custom_products(id,name,description,price) VALUES('audit-product','Synthetic','Audit','EUR 100');
INSERT INTO product_guides(product_id) VALUES('audit-product');
INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id) VALUES(gen_random_uuid()::text,'claimed','milano');
SELECT set_config('test.payload',jsonb_build_object('email','audit-customer@example.com','nome','Synthetic','cognome','Customer',
 'language','en','consent_given_at',now(),'consent_notice_version','2026-11-06','store_id','lisboa',
 'matched_product_id','audit-product','match_percent',80,'answers','{}'::jsonb)::text,true);

SELECT audit_assert(kiosk_ready('lisboa'),'recent maintenance enables kiosk');
UPDATE app_config SET value=(now()-interval '3 days')::text WHERE key='maintenance_last_run';
SET LOCAL ROLE anon;
SELECT audit_assert(NOT kiosk_ready('lisboa'),'stale maintenance disables kiosk');
SELECT audit_denied($q$SELECT submit_quiz_session(gen_random_uuid(),current_setting('test.payload')::jsonb)$q$,'no collection without recent maintenance');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT audit_assert((operations_health()->>'maintenance_overdue')::boolean,'health reports maintenance overdue');
RESET ROLE;
SELECT audit_assert(NOT kiosk_ready('lisboa'),'read-only health never refreshes collection permission');
SELECT run_privacy_maintenance();
SET LOCAL ROLE anon;
SELECT audit_denied('SELECT private.submit_quiz_session(gen_random_uuid(),current_setting(''test.payload'')::jsonb)','private claim core cannot bypass validation');
SELECT audit_invalid($q$SELECT submit_quiz_session(gen_random_uuid(),current_setting('test.payload')::jsonb || '{"nome":"=1+1"}')$q$,'formula name rejected by server');
SELECT audit_invalid($q$SELECT submit_quiz_session(gen_random_uuid(),current_setting('test.payload')::jsonb || '{"consent_notice_version":"legacy"}')$q$,'outdated privacy contract rejected');
SELECT audit_denied('SELECT record_login_attempt(''victim@example.com'',false)','client cannot fabricate login attempts');
SELECT audit_denied('SELECT operations_health()','operational metrics are not public');
SELECT audit_denied('SELECT check_email_cooldown(''victim@example.com'')','no public address activity oracle');
SELECT audit_denied('SELECT verify_staff_pin_server(''1234'',''fake'','''',''192.0.2.1'',true)','client cannot assert a verified PIN');
SELECT audit_denied('INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id) VALUES(gen_random_uuid()::text,''claimed'',''lisboa'')','no fabricated client conversion');
SELECT audit_invalid($q$SELECT record_quiz_event(gen_random_uuid(),'claimed','lisboa')$q$,'event API cannot invent conversions');
SELECT record_quiz_event('90000000-0000-4000-8000-000000000010','quiz_started','lisboa');
SELECT record_quiz_event('90000000-0000-4000-8000-000000000010','result_shown','lisboa');
SELECT audit_assert(submit_quiz_session('90000000-0000-4000-8000-000000000011',current_setting('test.payload')::jsonb) IS NOT NULL,'valid public claim still works');
RESET ROLE;
SELECT audit_assert(to_regprocedure('public.verify_staff_pin(text,text,text,text)') IS NULL,'legacy public PIN overload removed');
SELECT audit_assert((SELECT count(*)=1 FROM quiz_funnel_events WHERE funnel_key='90000000-0000-4000-8000-000000000011' AND event_type='claimed'),'conversion is created by committed claim');
SELECT audit_assert((SELECT consent_notice_version='2026-11-06' FROM quiz_sessions WHERE id='90000000-0000-4000-8000-000000000011'),'privacy version persisted');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
SELECT audit_assert((SELECT count(*)=0 FROM quiz_funnel_events),'aal1 cannot read analytics');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
SELECT audit_assert((SELECT count(*)=0 FROM quiz_funnel_events WHERE store_id='milano'),'lead cannot read another store analytics');
SELECT audit_assert((SELECT count(*)>0 FROM quiz_funnel_events WHERE store_id='lisboa'),'lead can read own analytics');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',true);
SELECT audit_assert((SELECT count(*)=0 FROM product_guides),'non-staff cannot read training');
SELECT audit_denied('INSERT INTO manager_audit_log(user_id,product_id,new_active) VALUES(''90000000-0000-4000-8000-000000000001'',''audit-product'',true)','audit identity cannot be forged');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
SELECT audit_assert((SELECT count(*)=1 FROM product_guides WHERE product_id='audit-product'),'consultants retain legitimate guide access');
RESET ROLE;

-- Minimal Storage stand-in: API grants + public catalog reading, actual write policies.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
CREATE POLICY test_public_images ON storage.objects FOR SELECT TO authenticated USING(bucket_id='product-images');
INSERT INTO storage.buckets(id,name,public) VALUES('product-images','product-images',true) ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
SELECT audit_denied('INSERT INTO storage.objects(id,bucket_id,name) VALUES(gen_random_uuid(),''product-images'',''audit.png'')','media upload requires MFA');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
INSERT INTO storage.objects(id,bucket_id,name) VALUES('90000000-0000-4000-8000-000000000012','product-images','audit.png');
SELECT audit_assert((SELECT count(*)=1 FROM storage.objects WHERE id='90000000-0000-4000-8000-000000000012'),'manager with MFA can upload');
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
UPDATE storage.objects SET name='tampered.png' WHERE id='90000000-0000-4000-8000-000000000012';
DELETE FROM storage.objects WHERE id='90000000-0000-4000-8000-000000000012';
RESET ROLE;
SELECT audit_assert((SELECT name='audit.png' FROM storage.objects WHERE id='90000000-0000-4000-8000-000000000012'),'media update and deletion blocked without MFA');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
UPDATE custom_products SET price='EUR 110' WHERE id='audit-product';
SELECT audit_assert((SELECT count(*)=1 FROM manager_audit_log WHERE product_id='custom_products:audit-product' AND source='database' AND user_id=auth.uid()),'committed mutation creates trusted audit record');
RESET ROLE;

INSERT INTO app_config(key,value) VALUES('staff_pin_hash',extensions.crypt('1234',extensions.gen_salt('bf')))
 ON CONFLICT(key) DO UPDATE SET value=excluded.value;
SET LOCAL ROLE service_role;
SELECT verify_staff_pin_server('wrong','a','','192.0.2.1',null) FROM generate_series(1,5);
SELECT audit_assert((verify_staff_pin_server('1234','rotated-client','','192.0.2.1',null)->>'locked_seconds')::int>0,'persistent origin PIN limiter survives client rotation without SQL error');
SELECT audit_assert((verify_staff_pin_server('1234','b','','192.0.2.2',null)->>'valid')::boolean,'correct PIN from another origin still works');
RESET ROLE;
INSERT INTO quiz_sessions(id,email,matched_product_id,match_percent,store_id,expires_at)
 VALUES('90000000-0000-4000-8000-000000000013','expired@example.com','audit-product',80,'lisboa',now()-interval '1 minute');
SET LOCAL ROLE service_role;
SELECT audit_assert(begin_session_email('90000000-0000-4000-8000-000000000013') IS NULL,'expired coupon cannot reserve an email');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SELECT audit_assert(erase_customer_data('audit-customer@example.com')=1,'manager can honor customer erasure');
SELECT audit_assert((SELECT count(*)=2 FROM external_erasure_requests WHERE email='audit-customer@example.com' AND status='pending'),'external copies are queued for reconciliation');
SELECT complete_external_erasure(id,true) FROM external_erasure_requests WHERE provider='sheets';
SELECT audit_assert((SELECT email IS NULL AND status='not_applicable' FROM external_erasure_requests WHERE provider='sheets'),'completed external request removes its email');
RESET ROLE;
INSERT INTO quiz_sessions(email,matched_product_id,match_percent,store_id,created_at)
 VALUES('retention@example.com','audit-product',80,'lisboa',now()-interval '31 days');
SET LOCAL ROLE service_role;
SELECT audit_assert((run_privacy_maintenance()->>'sessions_deleted')::integer=1,'maintenance enforces 30-day session retention');
RESET ROLE;
SELECT audit_assert((SELECT count(*)=0 FROM quiz_sessions WHERE email='retention@example.com'),'retained session is really deleted');
ROLLBACK;
