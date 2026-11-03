-- Deploy with the matching Edge Functions/frontend in a maintenance window.
BEGIN;
-- The app already used these columns; fresh historical migration replay lacked them.
ALTER TABLE public.product_settings ADD COLUMN IF NOT EXISTS image_url text, ADD COLUMN IF NOT EXISTS video_url text;
CREATE OR REPLACE FUNCTION public.require_staff_mfa()
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$ BEGIN
  IF auth.uid() IS NULL OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'MFA required' USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_staff_mfa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_staff_mfa() TO authenticated;

-- Restrictive policies AND with the existing role/store policies.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['quiz_sessions','manager_audit_log','product_guides','product_guide_files'] LOOP
    EXECUTE format('CREATE POLICY staff_mfa ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT auth.jwt()->>''aal'') = ''aal2'') WITH CHECK ((SELECT auth.jwt()->>''aal'') = ''aal2'')', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['product_settings','custom_products','product_global_status','quiz_cards','email_template','store_roles'] LOOP
    EXECUTE format('CREATE POLICY staff_mfa_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT auth.jwt()->>''aal'') = ''aal2'')', t);
    EXECUTE format('CREATE POLICY staff_mfa_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT auth.jwt()->>''aal'') = ''aal2'') WITH CHECK ((SELECT auth.jwt()->>''aal'') = ''aal2'')', t);
    EXECUTE format('CREATE POLICY staff_mfa_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT auth.jwt()->>''aal'') = ''aal2'')', t);
  END LOOP;
END $$;
-- DEFINER RPCs bypass RLS. Preserve their role guards and add MFA internally.
DO $$ DECLARE signature text; definition text; BEGIN
  FOREACH signature IN ARRAY ARRAY['public.list_store_roles_admin()', 'public.upsert_store_role_admin(text,text,text)', 'public.delete_store_role_admin(uuid)', 'public.purge_audit_log_older_than(integer)'] LOOP
    definition := pg_get_functiondef(signature::regprocedure);
    definition := regexp_replace(definition, '\mBEGIN\M', 'BEGIN' || E'\n  PERFORM public.require_staff_mfa();', 'i');
    EXECUTE definition;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.purge_sessions_older_than(p_days integer DEFAULT 7)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE n integer; BEGIN
  PERFORM public.require_staff_mfa();
  IF NOT EXISTS (SELECT 1 FROM store_roles WHERE user_id = auth.uid() AND role = 'manager') THEN
    RAISE EXCEPTION 'Only managers may purge sessions' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NULL OR p_days < 7 OR p_days > 365 THEN
    RAISE EXCEPTION 'Retention must be between 7 and 365 days' USING ERRCODE = '22023';
  END IF;
  DELETE FROM quiz_sessions WHERE created_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.purge_sessions_older_than(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_sessions_older_than(integer) TO authenticated;
ALTER TABLE public.quiz_sessions ADD COLUMN expires_at timestamptz,
  ADD COLUMN request_fingerprint text,
  ADD COLUMN email_status text NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending','sending','sent','failed','uncertain','suppressed'));
UPDATE public.quiz_sessions SET expires_at = created_at + interval '24 hours', email_status = CASE WHEN email_sent THEN 'sent' ELSE 'pending' END;
ALTER TABLE public.quiz_sessions ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE public.quiz_sessions ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');
CREATE OR REPLACE FUNCTION public.mark_code_redeemed(p_session_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r public.store_roles%ROWTYPE; n integer; BEGIN
  PERFORM public.require_staff_mfa();
  SELECT * INTO r FROM store_roles WHERE user_id = auth.uid();
  IF r.role IS NULL OR r.role NOT IN ('manager','consulente_responsabile') THEN
    RAISE EXCEPTION 'Role cannot redeem codes' USING ERRCODE = '42501';
  END IF;
  UPDATE quiz_sessions SET code_redeemed = true, code_redeemed_at = now()
  WHERE id = p_session_id AND NOT code_redeemed AND discount_code IS NOT NULL
    AND email_sent AND expires_at > now() AND (r.role = 'manager' OR store_id = r.store_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.mark_code_redeemed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_code_redeemed(uuid) TO authenticated;
REVOKE UPDATE ON public.quiz_sessions FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (code_redeemed, code_redeemed_at) ON public.quiz_sessions FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.quiz_sessions FROM PUBLIC, anon, authenticated;

-- Only this RPC accepts public claims; snapshots and processing state are server-owned.
CREATE OR REPLACE FUNCTION public.submit_quiz_session(p_request_id uuid, p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE
  product public.custom_products%ROWTYPE;
  settings public.product_settings%ROWTYPE;
  normalized_email text := lower(trim(p_payload->>'email'));
  store text := p_payload->>'store_id';
  fingerprint text := md5(p_payload::text);
  existing public.quiz_sessions%ROWTYPE;
  discount integer;
BEGIN
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::text) > 16384 THEN
    RAISE EXCEPTION 'Invalid claim' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO existing FROM quiz_sessions WHERE id = p_request_id;
  IF FOUND THEN
    IF existing.request_fingerprint IS DISTINCT FROM fingerprint THEN
      RAISE EXCEPTION 'Claim already submitted' USING ERRCODE = '22023';
    END IF;
    RETURN p_request_id;
  END IF;
  IF store IS NULL OR store NOT IN ('rio-de-janeiro','lisboa','dublino','milano')
     OR normalized_email IS NULL OR length(normalized_email) > 254
     OR normalized_email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
     OR coalesce(length(trim(p_payload->>'nome')),0) NOT BETWEEN 2 AND 100
     OR coalesce(length(trim(p_payload->>'cognome')),0) NOT BETWEEN 2 AND 100
     OR coalesce(p_payload->>'language','') NOT IN ('it','en','pt','es','fr')
     OR coalesce(jsonb_typeof(p_payload->'answers'),'') <> 'object'
     OR coalesce(p_payload->>'consent_given_at','') = '' THEN
    RAISE EXCEPTION 'Invalid claim' USING ERRCODE = '22023';
  END IF;
  IF (p_payload->>'consent_given_at')::timestamptz > now() + interval '5 minutes'
     OR (p_payload->>'consent_given_at')::timestamptz < now() - interval '1 day' THEN
    RAISE EXCEPTION 'Consent must be recent' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_email, 1));
  IF (SELECT count(*) FROM quiz_sessions WHERE lower(trim(email)) = normalized_email AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Too many requests' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO product FROM custom_products WHERE id = p_payload->>'matched_product_id' AND status = 'active';
  IF NOT FOUND OR EXISTS (SELECT 1 FROM product_global_status WHERE product_id = product.id AND hidden) THEN
    RAISE EXCEPTION 'Product unavailable' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO settings FROM product_settings WHERE product_id = product.id AND store_id = store;
  IF settings.active = false THEN RAISE EXCEPTION 'Product unavailable' USING ERRCODE = '22023'; END IF;
  discount := coalesce(settings.discount_percent, 5);
  INSERT INTO quiz_sessions (id,email,nome,cognome,answers,matched_product_id,match_percent,store_id,language,consent_given_at,
    product_name,product_price,product_image,product_video,discount_percent,discount_code,request_fingerprint)
  VALUES (p_request_id,normalized_email,trim(p_payload->>'nome'),trim(p_payload->>'cognome'),p_payload->'answers',product.id,
    greatest(0,least(100,(p_payload->>'match_percent')::integer)),store,p_payload->>'language',(p_payload->>'consent_given_at')::timestamptz,
    product.name,coalesce(nullif(settings.price_override,''),product.price),coalesce(nullif(settings.image_url,''),product.image_url),
    coalesce(nullif(settings.video_url,''),product.video_url),discount,
    'SUP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) || lpad(discount::text,2,'0'),fingerprint);
  RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_quiz_session(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_session(uuid,jsonb) TO anon, authenticated;

-- Reserve before contacting the provider. Ambiguous deliveries require reconciliation.
CREATE OR REPLACE FUNCTION public.begin_session_email(p_session_id uuid, p_bypass boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE s public.quiz_sessions%ROWTYPE; BEGIN
  SELECT * INTO s FROM quiz_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR s.email_sent OR s.email_status NOT IN ('pending','failed') THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(trim(s.email)), 2));
  IF NOT p_bypass AND EXISTS (SELECT 1 FROM quiz_sessions WHERE id <> s.id
    AND lower(trim(email)) = lower(trim(s.email)) AND created_at > now() - interval '1 hour'
    AND (email_sent OR email_status IN ('sending','uncertain'))) THEN
    UPDATE quiz_sessions SET email_status = 'suppressed' WHERE id = s.id;
    RETURN NULL;
  END IF;
  UPDATE quiz_sessions SET email_status = 'sending',
    discount_code = coalesce(discount_code, 'SUP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) || lpad(coalesce(discount_percent,5)::text,2,'0'))
    WHERE id = s.id RETURNING * INTO s;
  RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION public.begin_session_email(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_session_email(uuid,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
