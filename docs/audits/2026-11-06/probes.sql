-- DIAGNOSTIC ONLY: run after bootstrap.sql + migrations on a disposable DB.
-- Never run on a hosted project. Every fixture is rolled back.
-- A finding is printed as VULNERABLE, not as a passing security check.
BEGIN;
CREATE TEMP TABLE audit_results (id text, result text, detail text);
GRANT ALL ON audit_results TO anon, authenticated, service_role;
INSERT INTO auth.users(id,email) VALUES
 ('90000000-0000-4000-8000-000000000001','audit-manager@example.com'),
 ('90000000-0000-4000-8000-000000000002','audit-lead@example.com'),
 ('90000000-0000-4000-8000-000000000003','audit-no-role@example.com');
INSERT INTO store_roles(user_id,role,store_id) VALUES
 ('90000000-0000-4000-8000-000000000001','manager',null),
 ('90000000-0000-4000-8000-000000000002','consulente_responsabile','lisboa');
INSERT INTO custom_products(id,name,description,price) VALUES ('audit-product','Audit product','Synthetic','EUR 100');
INSERT INTO product_guides(product_id) VALUES ('audit-product');
INSERT INTO quiz_sessions(email,nome,cognome,matched_product_id,match_percent,store_id)
 VALUES ('audit-customer@example.com','Synthetic','Customer','audit-product',80,'milano');
INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id)
 VALUES ('90000000-0000-4000-8000-000000000004','claimed','milano');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
INSERT INTO audit_results SELECT 'DB01', CASE WHEN count(*) > 0 THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Store lead aal1 can read another store funnel' FROM quiz_funnel_events WHERE store_id='milano';
INSERT INTO audit_results SELECT 'DB02', CASE WHEN count(*) = 0 THEN 'PROTECTED' ELSE 'VULNERABLE' END,
 'Session PII unavailable with aal1' FROM quiz_sessions;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
INSERT INTO audit_results SELECT 'DB03', CASE WHEN count(*) = 0 THEN 'PROTECTED' ELSE 'VULNERABLE' END,
 'Session PII isolated from another store at aal2' FROM quiz_sessions WHERE store_id='milano';
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',true);
INSERT INTO audit_results SELECT 'DB04', CASE WHEN count(*) > 0 THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Account with no staff role can read training guides' FROM product_guides WHERE product_id='audit-product';
INSERT INTO manager_audit_log(user_id,user_email,product_id,new_active,store_id)
 VALUES ('90000000-0000-4000-8000-000000000001','audit-manager@example.com','audit-product',true,'milano');
INSERT INTO audit_results VALUES ('DB05','VULNERABLE','Account with no staff role can forge a manager audit entry');
RESET ROLE;

-- Bootstrap storage is deliberately minimal; grant the API table access and
-- schema access provided by hosted Storage, then test the real migration RLS.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
INSERT INTO storage.buckets(id,name,public) VALUES ('product-images','product-images',true) ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
INSERT INTO storage.objects(id,bucket_id,name) VALUES ('90000000-0000-4000-8000-000000000005','product-images','audit-only.png');
INSERT INTO audit_results VALUES ('DB06','VULNERABLE','Manager password session can upload catalog media without MFA');
RESET ROLE;

INSERT INTO app_config(key,value) VALUES ('staff_pin_hash',extensions.crypt('audit-test-pin',extensions.gen_salt('bf')))
 ON CONFLICT(key) DO UPDATE SET value=excluded.value;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT verify_staff_pin('wrong','audit-same-client','','192.0.2.1');
SELECT verify_staff_pin('wrong','audit-same-client','','192.0.2.1');
SELECT verify_staff_pin('wrong','audit-same-client','','192.0.2.1');
DO $$ BEGIN
 INSERT INTO audit_results SELECT 'DB07', CASE WHEN (verify_staff_pin('audit-test-pin','audit-same-client','','192.0.2.1')->>'locked_seconds')::int>0 THEN 'PROTECTED' ELSE 'VULNERABLE' END,
  'Stable PIN client is locked after repeated failures';
EXCEPTION WHEN ambiguous_column THEN
 INSERT INTO audit_results VALUES ('DB07','VULNERABLE','PIN lockout branch errors: ambiguous ip_address (SQLSTATE 42702)');
END $$;
INSERT INTO audit_results SELECT 'DB08', CASE WHEN (verify_staff_pin('audit-test-pin','audit-new-client','',null)->>'valid')::bool THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Caller bypasses PIN lockout by changing client_id and omitting IP';
SELECT record_login_attempt('audit-victim@example.com',false) FROM generate_series(1,5);
INSERT INTO audit_results SELECT 'DB09', CASE WHEN (check_login_rate_limit('audit-victim@example.com')->>'locked')::bool THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Anonymous caller can fabricate failures and lock a victim out of UI';
INSERT INTO audit_results SELECT 'DB10', CASE WHEN in_cooldown THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Anonymous cooldown reveals recent activity of a known customer address'
 FROM check_email_cooldown('audit-customer@example.com');
INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id,created_at)
 VALUES ('90000000-0000-4000-8000-000000000006','claimed','lisboa',now()-interval '10 days');
INSERT INTO audit_results VALUES ('DB11','VULNERABLE','Anonymous caller inserts a historical claimed event without a quiz session');
SELECT submit_quiz_session('90000000-0000-4000-8000-000000000008', jsonb_build_object(
 'email','audit-csv@example.com','nome','=1+1','cognome','Synthetic','language','en',
 'consent_given_at',now(),'store_id','lisboa','answers','{}'::jsonb,
 'matched_product_id','audit-product','match_percent',80));
INSERT INTO audit_results VALUES ('DB13','VULNERABLE','Server accepts a spreadsheet formula in customer name despite UI name validation');
RESET ROLE;
INSERT INTO quiz_sessions(id,email,matched_product_id,match_percent,store_id,created_at,expires_at)
 VALUES ('90000000-0000-4000-8000-000000000007','audit-expired@example.com','audit-product',80,'lisboa',now()-interval '2 days',now()-interval '1 day');
SET LOCAL ROLE service_role;
INSERT INTO audit_results SELECT 'DB12', CASE WHEN begin_session_email('90000000-0000-4000-8000-000000000007') IS NOT NULL THEN 'VULNERABLE' ELSE 'PROTECTED' END,
 'Delayed webhook can reserve delivery for an expired coupon';
RESET ROLE;
TABLE audit_results;
ROLLBACK;
