BEGIN;
-- Marketing is a separate, optional purpose. Existing contacts never gain opt-in.
ALTER TABLE public.quiz_sessions
 ADD COLUMN marketing_opt_in boolean NOT NULL DEFAULT false,
 ADD COLUMN marketing_consent_at timestamptz,
 ADD COLUMN marketing_notice_version text,
 ADD COLUMN marketing_withdrawn_at timestamptz,
 ADD CONSTRAINT marketing_consent_evidence CHECK (
  NOT marketing_opt_in OR (marketing_consent_at IS NOT NULL AND marketing_notice_version='marketing-2026-11-07'));
INSERT INTO public.app_config(key,value) VALUES('marketing_enabled','false') ON CONFLICT DO NOTHING;

ALTER FUNCTION public.submit_quiz_session(uuid,jsonb) RENAME TO submit_claim_v210;
ALTER FUNCTION public.submit_claim_v210(uuid,jsonb) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.submit_claim_v210(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.submit_quiz_session(p_request_id uuid,p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE opted_in boolean; existing boolean; result_id uuid; BEGIN
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
 OR (p_payload ? 'marketing_opt_in' AND jsonb_typeof(p_payload->'marketing_opt_in')<>'boolean')
 THEN RAISE EXCEPTION 'Invalid claim' USING ERRCODE='22023'; END IF;
 opted_in:=coalesce((p_payload->>'marketing_opt_in')::boolean,false);
 IF opted_in AND coalesce(p_payload->>'marketing_notice_version','')<>'marketing-2026-11-07'
 THEN RAISE EXCEPTION 'Invalid marketing notice' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT EXISTS(SELECT 1 FROM quiz_sessions WHERE id=p_request_id) INTO existing;
 IF opted_in AND NOT existing AND NOT EXISTS(SELECT 1 FROM app_config WHERE key='marketing_enabled' AND value='true')
 THEN RAISE EXCEPTION 'Marketing unavailable' USING ERRCODE='42501'; END IF;
 result_id:=private.submit_claim_v210(p_request_id,p_payload);
 IF NOT existing AND opted_in THEN
  UPDATE quiz_sessions SET marketing_opt_in=true,marketing_consent_at=now(),marketing_notice_version='marketing-2026-11-07'
   WHERE id=result_id;
 END IF;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_quiz_session(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_session(uuid,jsonb) TO anon,authenticated;

-- Withdrawal retains the initial evidence but makes the contact ineligible.
-- Provider suppression must be reconciled before any external campaign.
CREATE FUNCTION public.withdraw_marketing_consent(p_email text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE changed integer; BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager')
 THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 IF p_email IS NULL OR length(trim(p_email)) NOT BETWEEN 3 AND 254 THEN RAISE EXCEPTION 'Invalid address' USING ERRCODE='22023'; END IF;
 UPDATE quiz_sessions SET marketing_withdrawn_at=now()
 WHERE lower(trim(email))=lower(trim(p_email)) AND marketing_opt_in AND marketing_withdrawn_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION public.withdraw_marketing_consent(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.withdraw_marketing_consent(text) TO authenticated;
CREATE TRIGGER audit_marketing_withdrawal AFTER UPDATE OF marketing_withdrawn_at ON public.quiz_sessions
 FOR EACH ROW WHEN (OLD.marketing_withdrawn_at IS DISTINCT FROM NEW.marketing_withdrawn_at)
 EXECUTE FUNCTION private.audit_configuration_change();
NOTIFY pgrst,'reload schema';
COMMIT;
