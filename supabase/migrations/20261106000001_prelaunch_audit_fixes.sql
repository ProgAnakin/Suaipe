-- Coordinated release: DB -> Edge Functions -> frontend, with kiosks paused.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;

-- MFA supplements the existing bucket/manager restrictions, not replaces them.
CREATE POLICY media_mfa_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (bucket_id <> 'product-images' OR (SELECT auth.jwt()->>'aal')='aal2');
CREATE POLICY media_mfa_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (bucket_id <> 'product-images' OR (SELECT auth.jwt()->>'aal')='aal2')
 WITH CHECK (bucket_id <> 'product-images' OR (SELECT auth.jwt()->>'aal')='aal2');
CREATE POLICY media_mfa_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING (bucket_id <> 'product-images' OR (SELECT auth.jwt()->>'aal')='aal2');
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['product_guides','product_guide_files'] LOOP
  EXECUTE format('CREATE POLICY staff_role_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.store_roles WHERE user_id=auth.uid() AND role IN (''manager'',''consulente_responsabile'',''consulente'')))',t);
 END LOOP;
END $$;

DROP POLICY "allow_select_auth" ON public.quiz_funnel_events;
CREATE POLICY funnel_staff_read ON public.quiz_funnel_events FOR SELECT TO authenticated USING (
 (SELECT auth.jwt()->>'aal')='aal2' AND EXISTS (SELECT 1 FROM store_roles r WHERE r.user_id=auth.uid()
 AND (r.role='manager' OR (r.role='consulente_responsabile' AND r.store_id=quiz_funnel_events.store_id))));
REVOKE INSERT,UPDATE,DELETE ON public.quiz_funnel_events FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS funnel_store_created_idx ON public.quiz_funnel_events(store_id,created_at);
CREATE INDEX IF NOT EXISTS sessions_normalized_email_created_idx ON public.quiz_sessions(lower(trim(email)),created_at);
CREATE INDEX IF NOT EXISTS sessions_store_created_idx ON public.quiz_sessions(store_id,created_at);

CREATE FUNCTION public.record_quiz_event(p_key uuid,p_event text,p_store text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF p_key IS NULL OR p_event IS NULL OR p_event NOT IN ('quiz_started','result_shown') OR p_store IS NULL
  OR p_store NOT IN ('rio-de-janeiro','lisboa','dublino','milano') THEN
  RAISE EXCEPTION 'Invalid event' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('funnel:'||p_store,0));
 IF EXISTS (SELECT 1 FROM quiz_funnel_events WHERE funnel_key=p_key::text AND event_type=p_event) THEN RETURN; END IF;
 IF (SELECT count(*) FROM quiz_funnel_events WHERE store_id=p_store AND created_at>now()-interval '1 minute')>=120
 OR (SELECT count(*) FROM quiz_funnel_events WHERE store_id=p_store AND created_at>now()-interval '1 hour')>=2400 THEN
  RAISE EXCEPTION 'Event quota reached' USING ERRCODE='P0001'; END IF;
 IF p_event='result_shown' AND NOT EXISTS (SELECT 1 FROM quiz_funnel_events WHERE funnel_key=p_key::text AND event_type='quiz_started' AND store_id=p_store) THEN
  RAISE EXCEPTION 'Quiz not started' USING ERRCODE='22023'; END IF;
 INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id) VALUES(p_key::text,p_event,p_store);
END $$;
REVOKE ALL ON FUNCTION public.record_quiz_event(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_quiz_event(uuid,text,text) TO anon,authenticated;

ALTER TABLE public.quiz_sessions ADD COLUMN consent_notice_version text NOT NULL DEFAULT 'legacy',
 ADD COLUMN email_provider_id text;
ALTER FUNCTION public.submit_quiz_session(uuid,jsonb) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.submit_quiz_session(uuid,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.submit_quiz_session(p_request_id uuid,p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing boolean; session_id uuid; event_key uuid; BEGIN
 IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>16384
 OR coalesce(p_payload->>'store_id','') NOT IN ('rio-de-janeiro','lisboa','dublino','milano')
 OR coalesce(p_payload->>'consent_notice_version','')<>'2026-11-06'
 OR coalesce(trim(p_payload->>'nome'),'') !~ '^[[:alpha:] ''-]{2,100}$'
 OR coalesce(trim(p_payload->>'cognome'),'') !~ '^[[:alpha:] ''-]{2,100}$' THEN
  RAISE EXCEPTION 'Invalid claim' USING ERRCODE='22023'; END IF;
 IF coalesce(jsonb_typeof(p_payload->'match_percent'),'')<>'number' OR (p_payload->>'match_percent') !~ '^[0-9]{1,3}$'
 OR (p_payload->>'match_percent')::integer NOT BETWEEN 0 AND 100
 OR coalesce(jsonb_typeof(p_payload->'answers'),'')<>'object' THEN RAISE EXCEPTION 'Invalid answers' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM jsonb_each(p_payload->'answers'))>8 OR EXISTS(
  SELECT 1 FROM jsonb_each(p_payload->'answers') a WHERE a.key !~ '^[0-9]{1,9}$' OR jsonb_typeof(a.value)<>'boolean')
 THEN RAISE EXCEPTION 'Invalid answers' USING ERRCODE='22023'; END IF;
 event_key:=coalesce((p_payload->>'funnel_key')::uuid,p_request_id);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT EXISTS(SELECT 1 FROM quiz_sessions WHERE id=p_request_id) INTO existing;
 IF NOT existing THEN
  IF NOT public.kiosk_ready(p_payload->>'store_id') THEN RAISE EXCEPTION 'Kiosk unavailable' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('claim:'||coalesce(p_payload->>'store_id',''),0));
  IF (SELECT count(*) FROM quiz_sessions WHERE store_id=p_payload->>'store_id' AND created_at>now()-interval '1 minute')>=30
   OR (SELECT count(*) FROM quiz_sessions WHERE store_id=p_payload->>'store_id' AND created_at>now()-interval '1 hour')>=600 THEN
   RAISE EXCEPTION 'Store quota reached' USING ERRCODE='P0001'; END IF;
 END IF;
 session_id:=private.submit_quiz_session(p_request_id,p_payload);
 IF NOT existing THEN
  UPDATE quiz_sessions SET consent_notice_version=p_payload->>'consent_notice_version' WHERE id=session_id;
  INSERT INTO quiz_funnel_events(funnel_key,event_type,store_id) VALUES(event_key::text,'claimed',p_payload->>'store_id') ON CONFLICT DO NOTHING;
 END IF;
 RETURN session_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_quiz_session(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_session(uuid,jsonb) TO anon,authenticated;

ALTER FUNCTION public.begin_session_email(uuid,boolean) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.begin_session_email(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.begin_session_email(p_session_id uuid,p_bypass boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM 1 FROM quiz_sessions WHERE id=p_session_id AND expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN private.begin_session_email(p_session_id,p_bypass);
END $$;
REVOKE ALL ON FUNCTION public.begin_session_email(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_session_email(uuid,boolean) TO service_role;

-- Audit identity and actions originate in the committed mutation, not the UI.
REVOKE INSERT ON public.manager_audit_log FROM PUBLIC,anon,authenticated;
ALTER TABLE public.manager_audit_log ADD COLUMN source text NOT NULL DEFAULT 'legacy';
CREATE FUNCTION private.audit_configuration_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE row_data jsonb; old_data jsonb; BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 old_data:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 INSERT INTO manager_audit_log(user_id,user_email,product_id,new_active,old_active,action,store_id,source)
 VALUES(auth.uid(),auth.jwt()->>'email',TG_TABLE_NAME||':'||coalesce(row_data->>'product_id',row_data->>'id','config'),
 (row_data->>'active')::boolean,(old_data->>'active')::boolean,lower(TG_OP),row_data->>'store_id','database');
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['product_settings','custom_products','product_global_status','quiz_cards','email_template','store_roles','product_guides'] LOOP
  EXECUTE format('CREATE TRIGGER audit_committed_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_configuration_change()',t);
 END LOOP;
END $$;

-- Only the Edge service can assert source IP or the secret-backed PIN result.
CREATE INDEX IF NOT EXISTS pin_failures_origin_idx ON public.admin_access_log(ip_address,created_at) WHERE NOT success;
CREATE FUNCTION public.verify_staff_pin_server(pin_input text,client_id text,user_agent text,ip_address text,p_secret_valid boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE origin_key text; failures integer; last_failure timestamptz; stored_hash text; valid boolean; BEGIN
 IF ip_address IS NULL OR length(ip_address)>128 OR coalesce(length(pin_input),0) NOT BETWEEN 1 AND 64 THEN
  RETURN jsonb_build_object('valid',false,'locked_seconds',0); END IF;
 origin_key:=encode(extensions.digest(ip_address,'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended('pin:'||origin_key,0));
 SELECT count(*),max(l.created_at) INTO failures,last_failure FROM admin_access_log l
 WHERE l.ip_address=origin_key AND NOT l.success AND l.created_at>now()-interval '2 minutes';
 IF failures>=5 THEN RETURN jsonb_build_object('valid',false,'locked_seconds',greatest(1,ceil(extract(epoch FROM last_failure+interval '2 minutes'-now()))::int)); END IF;
 SELECT value INTO stored_hash FROM app_config WHERE key='staff_pin_hash';
 valid:=coalesce(p_secret_valid,coalesce(extensions.crypt(pin_input,stored_hash)=stored_hash,false));
 INSERT INTO admin_access_log(client_id,user_agent,ip_address,success) VALUES(left(coalesce(client_id,'edge'),100),left(coalesce(user_agent,''),500),origin_key,valid);
 DELETE FROM admin_access_log WHERE created_at<now()-interval '14 days';
 RETURN jsonb_build_object('valid',valid,'locked_seconds',0);
END $$;
REVOKE ALL ON FUNCTION public.verify_staff_pin_server(text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin_server(text,text,text,text,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.verify_staff_pin(text,text,text,text) FROM PUBLIC,anon,authenticated;
DROP FUNCTION public.verify_staff_pin(text,text,text,text);
REVOKE ALL ON FUNCTION public.record_login_attempt(text,boolean),public.check_login_rate_limit(text),public.check_email_cooldown(text) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
