BEGIN;
-- Exact-address, manager/MFA-only export for a verified request. Never public lookup.
CREATE FUNCTION public.get_customer_records(p_email text) RETURNS TABLE(id uuid,details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager')
 THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 IF p_email IS NULL OR length(trim(p_email)) NOT BETWEEN 3 AND 254 THEN RAISE EXCEPTION 'Invalid address' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT q.id,to_jsonb(q)-'request_fingerprint' FROM quiz_sessions q WHERE lower(trim(q.email))=lower(trim(p_email));
END $$;
REVOKE ALL ON FUNCTION public.get_customer_records(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_records(text) TO authenticated;

CREATE FUNCTION public.correct_customer_names(p_email text,p_nome text,p_cognome text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE changed integer; BEGIN
 PERFORM public.require_staff_mfa();
 IF NOT EXISTS(SELECT 1 FROM store_roles WHERE user_id=auth.uid() AND role='manager')
 THEN RAISE EXCEPTION 'Manager required' USING ERRCODE='42501'; END IF;
 IF p_email IS NULL OR length(trim(p_email)) NOT BETWEEN 3 AND 254
 OR coalesce(trim(p_nome),'') !~ '^[[:alpha:] ''-]{2,100}$'
 OR coalesce(trim(p_cognome),'') !~ '^[[:alpha:] ''-]{2,100}$'
 THEN RAISE EXCEPTION 'Invalid correction' USING ERRCODE='22023'; END IF;
 UPDATE quiz_sessions SET nome=trim(p_nome),cognome=trim(p_cognome)
 WHERE lower(trim(email))=lower(trim(p_email)) AND (nome IS DISTINCT FROM trim(p_nome) OR cognome IS DISTINCT FROM trim(p_cognome));
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION public.correct_customer_names(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.correct_customer_names(text,text,text) TO authenticated;
CREATE TRIGGER audit_customer_correction AFTER UPDATE OF nome,cognome ON public.quiz_sessions
 FOR EACH ROW WHEN (OLD.nome IS DISTINCT FROM NEW.nome OR OLD.cognome IS DISTINCT FROM NEW.cognome)
 EXECUTE FUNCTION private.audit_configuration_change();
NOTIFY pgrst,'reload schema';
COMMIT;
