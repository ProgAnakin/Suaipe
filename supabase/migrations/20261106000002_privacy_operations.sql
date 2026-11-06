BEGIN;
-- Deletion is not complete until each external copy has been reconciled.
CREATE TABLE public.external_erasure_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, email_hash text NOT NULL,
 provider text NOT NULL CHECK(provider IN ('brevo','sheets')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','not_applicable')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 UNIQUE(email_hash,provider)
);
ALTER TABLE public.external_erasure_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.external_erasure_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.external_erasure_requests TO authenticated;
GRANT ALL ON public.external_erasure_requests TO service_role;
CREATE POLICY manager_read_erasure_requests ON public.external_erasure_requests FOR SELECT TO authenticated
 USING ((SELECT auth.jwt()->>'aal')='aal2' AND EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager'));
CREATE FUNCTION private.queue_external_erasure() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$ BEGIN
 INSERT INTO external_erasure_requests(email,email_hash,provider)
 SELECT lower(trim(OLD.email)),encode(extensions.digest(lower(trim(OLD.email)),'sha256'),'hex'),p FROM unnest(ARRAY['brevo','sheets']) p
 ON CONFLICT(email_hash,provider) DO UPDATE SET email=excluded.email,status='pending',completed_at=null,completed_by=null,created_at=now();
 RETURN OLD;
END $$;
CREATE TRIGGER queue_customer_erasure AFTER DELETE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION private.queue_external_erasure();
CREATE TRIGGER audit_external_erasure AFTER UPDATE ON public.external_erasure_requests FOR EACH ROW EXECUTE FUNCTION private.audit_configuration_change();
CREATE FUNCTION public.erase_customer_data(p_email text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager') THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 IF p_email IS NULL OR length(trim(p_email)) NOT BETWEEN 3 AND 254 THEN RAISE EXCEPTION 'Invalid address' USING ERRCODE='22023'; END IF;
 DELETE FROM quiz_sessions WHERE lower(trim(email))=lower(trim(p_email)); GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.erase_customer_data(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.erase_customer_data(text) TO authenticated;
CREATE FUNCTION public.complete_external_erasure(p_id uuid,p_not_applicable boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager') THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 UPDATE external_erasure_requests SET status=CASE WHEN p_not_applicable THEN 'not_applicable' ELSE 'completed' END,
 email=null,completed_at=now(),completed_by=auth.uid() WHERE id=p_id AND status='pending';
END $$;
REVOKE ALL ON FUNCTION public.complete_external_erasure(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_external_erasure(uuid,boolean) TO authenticated;

CREATE FUNCTION public.run_privacy_maintenance() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sessions_deleted integer; pending integer; uncertain integer; BEGIN
 -- Service-only. Schedule daily; the Edge endpoint fails closed without its secret.
 DELETE FROM quiz_sessions WHERE created_at<now()-interval '30 days'; GET DIAGNOSTICS sessions_deleted=ROW_COUNT;
 DELETE FROM quiz_funnel_events WHERE created_at<now()-interval '30 days';
 DELETE FROM admin_access_log WHERE created_at<now()-interval '14 days';
 DELETE FROM login_attempts WHERE created_at<now()-interval '14 days';
 DELETE FROM cooldown_check_log WHERE created_at<now()-interval '1 day';
 DELETE FROM manager_audit_log WHERE created_at<now()-interval '730 days';
 DELETE FROM external_erasure_requests WHERE completed_at<now()-interval '30 days' AND status<>'pending';
 SELECT count(*) INTO pending FROM external_erasure_requests WHERE status='pending';
 SELECT count(*) INTO uncertain FROM quiz_sessions WHERE email_status IN ('pending','sending','uncertain','failed') AND created_at<now()-interval '10 minutes';
 INSERT INTO app_config(key,value) VALUES('maintenance_last_run',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ON CONFLICT(key) DO UPDATE SET value=excluded.value;
 RETURN jsonb_build_object('sessions_deleted',sessions_deleted,'external_erasure_pending',pending,'email_reconciliation_pending',uncertain);
END $$;
REVOKE ALL ON FUNCTION public.run_privacy_maintenance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_privacy_maintenance() TO service_role;
CREATE FUNCTION public.kiosk_ready(p_store text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(p_store IN ('rio-de-janeiro','lisboa','dublino','milano') AND EXISTS(
  SELECT 1 FROM app_config WHERE key='maintenance_last_run' AND value::timestamptz>now()-interval '48 hours'),false);
$$;
REVOKE ALL ON FUNCTION public.kiosk_ready(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_ready(text) TO anon,authenticated;
CREATE FUNCTION public.privacy_operations_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager') THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('last_maintenance',(SELECT value FROM app_config WHERE key='maintenance_last_run'),
  'erasure_pending',(SELECT count(*) FROM external_erasure_requests WHERE status='pending'),
  'email_reconciliation_pending',(SELECT count(*) FROM quiz_sessions WHERE email_status IN ('pending','sending','uncertain','failed') AND created_at<now()-interval '10 minutes'));
END $$;
REVOKE ALL ON FUNCTION public.privacy_operations_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.privacy_operations_status() TO authenticated;
CREATE FUNCTION public.operations_health() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('maintenance_overdue',NOT public.kiosk_ready('lisboa'),
  'email_reconciliation_pending',(SELECT count(*) FROM quiz_sessions WHERE email_status IN ('pending','sending','uncertain','failed') AND created_at<now()-interval '10 minutes'),
  'external_erasure_pending',(SELECT count(*) FROM external_erasure_requests WHERE status='pending' AND created_at<now()-interval '1 day'));
$$;
REVOKE ALL ON FUNCTION public.operations_health() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.operations_health() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
