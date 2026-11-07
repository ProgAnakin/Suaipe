BEGIN;
SELECT run_privacy_maintenance();
CREATE FUNCTION public.subject_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 RAISE NOTICE 'PASS: %',label;
END $$;
CREATE FUNCTION public.subject_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR invalid_parameter_value THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL: % was allowed',label;
END $$;
INSERT INTO auth.users(id,email) VALUES('92000000-0000-4000-8000-000000000001','manager@example.invalid'),('92000000-0000-4000-8000-000000000002','consultant@example.invalid');
INSERT INTO store_roles(user_id,role,store_id) VALUES('92000000-0000-4000-8000-000000000001','manager',null),('92000000-0000-4000-8000-000000000002','consulente','lisboa');
INSERT INTO custom_products(id,name,description,price) VALUES('subject-probe','Synthetic','Rights test','EUR 100');
INSERT INTO quiz_sessions(id,email,nome,cognome,matched_product_id,match_percent,request_fingerprint) VALUES
 ('92000000-0000-4000-8000-000000000010','subject@example.invalid','Original','Visitor','subject-probe',80,'internal-digest'),
 ('92000000-0000-4000-8000-000000000011','other-subject@example.invalid','Other','Visitor','subject-probe',80,'internal-digest');
SET LOCAL ROLE anon;
SELECT subject_denied($q$SELECT * FROM get_customer_records('subject@example.invalid')$q$,'subject export is never an anonymous address lookup');
SELECT subject_denied($q$SELECT correct_customer_names('subject@example.invalid','Changed','Visitor')$q$,'anonymous callers cannot correct another visitor records');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
SELECT subject_denied($q$SELECT * FROM get_customer_records('subject@example.invalid')$q$,'a consultant cannot use global subject export');
SELECT set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
SELECT subject_denied($q$SELECT * FROM get_customer_records('subject@example.invalid')$q$,'subject rights administration requires MFA');
SELECT set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
SELECT subject_assert((SELECT count(*)=1 AND bool_and(details->>'email'='subject@example.invalid') AND bool_and(NOT details?'request_fingerprint') FROM get_customer_records(' SUBJECT@example.invalid ')),'verified exact export excludes other customers and internal digests');
SELECT subject_denied($q$SELECT correct_customer_names('subject@example.invalid','=1+1','Visitor')$q$,'correction cannot introduce spreadsheet formulas');
SELECT subject_assert(correct_customer_names('subject@example.invalid','Corrected','Visitor')=1,'manager can apply the verified name correction');
RESET ROLE;
SELECT subject_assert((SELECT nome='Other' FROM quiz_sessions WHERE id='92000000-0000-4000-8000-000000000011'),'correction does not change another customer');
SELECT subject_assert((SELECT count(*)=1 FROM manager_audit_log WHERE product_id='quiz_sessions:92000000-0000-4000-8000-000000000010' AND source='database'),'correction is audited by the database');
ROLLBACK;
