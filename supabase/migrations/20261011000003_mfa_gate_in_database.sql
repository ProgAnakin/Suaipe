-- ─────────────────────────────────────────────────────────────────────────────
-- Second factor (TOTP) enforced in the DATABASE — a switch, OFF by default.
--
-- Every staff page of the app demands the authenticator code, but only in the browser. The database
-- policies and RPCs accept any signed-in user's token whatever its assurance level, so someone who
-- has a staff PASSWORD can skip the browser, call the REST API directly with an `aal1` session and
-- read what the role's policies allow (customers' names and e-mail addresses included).
--
-- This migration adds the missing check and a switch for it:
--
--   • DEFAULT: `app_config.require_mfa = 'off'` — applying this migration changes NOTHING.
--   • TO ENFORCE (after every staff account has enrolled an authenticator):
--         UPDATE public.app_config SET value = 'on' WHERE key = 'require_mfa';
--     (any value other than 'off' enforces — a typo fails closed.)
--     From then on a token that is not `aal2` is refused (RPCs: SQLSTATE 42501 "mfa required"; tables:
--     the rows are invisible / the write is rejected). Takes effect immediately.
--   • TO ROLL BACK: set it to 'off' again. Nothing else to undo.
--
-- What is gated (with the switch on): customers' leads (read, update, delete), the roles table, the
-- audit log, funnel events, the e-mail template, the training guides, every WRITE to the catalogue
-- and to the product-images bucket, and the staff-only RPCs (list/upsert/delete_store_role_admin,
-- purge_sessions_older_than, purge_audit_log_older_than, mark_code_redeemed, get_my_store_role).
--
-- What is deliberately NOT gated, because the kiosk must keep working even on an iPad that still
-- holds a half-finished staff session: the claim (INSERT into quiz_sessions), funnel-event INSERTs,
-- the e-mail cooldown RPC, and every READ of the public catalogue.
--
-- ⚠ If a later migration redefines one of the gated RPCs it MUST keep the
--   `PERFORM private.require_mfa();` line — supabase/tests/mfa.sql fails when a staff-only
--   SECURITY DEFINER function loses it.
--
-- Safe on a live database: idempotent, rewrites no rows. Proven by supabase/tests (the whole attack suite
-- runs a second time with the switch ON, and mfa.sql checks aal1 vs aal2 table by table).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. The switch ───────────────────────────────────────────────────────────
INSERT INTO public.app_config (key, value) VALUES ('require_mfa', 'off')
ON CONFLICT (key) DO NOTHING;


-- ── 2. Helpers, in a schema PostgREST does not expose ──────────────────────
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- true when the switch is off, or the caller's token carries `aal2` (a verified second factor). Only the exact
-- value 'off' (or no row) switches it off: a typo such as 'yes' or 'ON ' enforces rather than silently not.
-- SECURITY DEFINER so the policy expression can read app_config, which clients cannot.
CREATE OR REPLACE FUNCTION private.mfa_satisfied()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(lower(btrim((SELECT value FROM public.app_config WHERE key = 'require_mfa'))), 'off') = 'off'
      OR COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

CREATE OR REPLACE FUNCTION private.require_mfa()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.mfa_satisfied() THEN
    RAISE EXCEPTION 'mfa required: complete the authenticator-code step'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.mfa_satisfied(), private.require_mfa() FROM PUBLIC;
-- only the roles whose policies or calls need them (the anonymous kiosk never evaluates a restrictive policy of this file)
GRANT EXECUTE ON FUNCTION private.mfa_satisfied(), private.require_mfa() TO authenticated, service_role;


-- ── 3. RESTRICTIVE policies — ANDed with every existing policy, signed-in users only ─────────────
-- (A restrictive policy never grants anything: it can only take access away. `(SELECT …)` makes
--  Postgres evaluate the check once per statement, not once per row.)

-- customers' leads: reading, redeeming and deleting need the second factor; the claim (INSERT) does not
DROP POLICY IF EXISTS mfa_required_select ON public.quiz_sessions;
DROP POLICY IF EXISTS mfa_required_update ON public.quiz_sessions;
DROP POLICY IF EXISTS mfa_required_delete ON public.quiz_sessions;
CREATE POLICY mfa_required_select ON public.quiz_sessions AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT private.mfa_satisfied()));
CREATE POLICY mfa_required_update ON public.quiz_sessions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));
CREATE POLICY mfa_required_delete ON public.quiz_sessions AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.mfa_satisfied()));

-- funnel events: staff READ them, the kiosk only INSERTs
DROP POLICY IF EXISTS mfa_required_select ON public.quiz_funnel_events;
CREATE POLICY mfa_required_select ON public.quiz_funnel_events AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT private.mfa_satisfied()));

-- tables only staff touch: every command
DROP POLICY IF EXISTS mfa_required_all ON public.store_roles;
CREATE POLICY mfa_required_all ON public.store_roles AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));

DROP POLICY IF EXISTS mfa_required_all ON public.manager_audit_log;
CREATE POLICY mfa_required_all ON public.manager_audit_log AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));

DROP POLICY IF EXISTS mfa_required_all ON public.email_template;
CREATE POLICY mfa_required_all ON public.email_template AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));

DROP POLICY IF EXISTS mfa_required_all ON public.product_guides;
CREATE POLICY mfa_required_all ON public.product_guides AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));

DROP POLICY IF EXISTS mfa_required_all ON public.product_guide_files;
CREATE POLICY mfa_required_all ON public.product_guide_files AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));

-- the public catalogue: the kiosk READS it (even with a leftover staff session), so only WRITES are gated
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['custom_products', 'product_global_status', 'product_settings', 'quiz_cards'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_required_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_required_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.mfa_satisfied()))', t);
    EXECUTE format('CREATE POLICY mfa_required_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()))', t);
    EXECUTE format('CREATE POLICY mfa_required_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT private.mfa_satisfied()))', t);
  END LOOP;
END $$;

-- uploads (the product-images bucket): writing needs the second factor, reading stays public
DROP POLICY IF EXISTS mfa_required_insert ON storage.objects;
DROP POLICY IF EXISTS mfa_required_update ON storage.objects;
DROP POLICY IF EXISTS mfa_required_delete ON storage.objects;
CREATE POLICY mfa_required_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.mfa_satisfied()));
CREATE POLICY mfa_required_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.mfa_satisfied())) WITH CHECK ((SELECT private.mfa_satisfied()));
CREATE POLICY mfa_required_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.mfa_satisfied()));


-- ── 4. The staff-only RPCs (SECURITY DEFINER: they bypass the policies above, so they check themselves) ─
-- The bodies are the CURRENT definitions (20261011000001 and earlier) with one added line after BEGIN.

-- get_my_store_role is a plain SQL function: without the second factor the account simply has no role
CREATE OR REPLACE FUNCTION public.get_my_store_role()
 RETURNS TABLE(role text, store_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT sr.role, sr.store_id
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
    AND private.mfa_satisfied()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_store_roles_admin()
 RETURNS TABLE(id uuid, user_id uuid, user_email text, role text, store_id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $$
DECLARE
  caller_role text;
BEGIN
  PERFORM private.require_mfa();
  SELECT sr.role INTO caller_role
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
  LIMIT 1;

  IF caller_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'forbidden: caller is not a manager'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT sr.id, sr.user_id, u.email::text, sr.role, sr.store_id, sr.created_at
    FROM public.store_roles sr
    JOIN auth.users u ON u.id = sr.user_id
    ORDER BY sr.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_store_role_admin(p_user_email text, p_role text, p_store_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $$
DECLARE
  caller_role  text;
  target_uid   uuid;
  inserted_id  uuid;
BEGIN
  PERFORM private.require_mfa();
  SELECT sr.role INTO caller_role
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
  LIMIT 1;

  IF caller_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'forbidden: caller is not a manager'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('manager', 'consulente_responsabile', 'consulente') THEN
    RAISE EXCEPTION 'invalid role: %', p_role USING ERRCODE = '22023';
  END IF;

  IF p_role = 'consulente_responsabile' AND (p_store_id IS NULL OR length(trim(p_store_id)) = 0) THEN
    RAISE EXCEPTION 'consulente_responsabile requires a store_id' USING ERRCODE = '22023';
  END IF;

  SELECT u.id INTO target_uid
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_user_email))
  LIMIT 1;

  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'no auth user found for email: %', p_user_email
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.store_roles (user_id, role, store_id)
  VALUES (target_uid, p_role, NULLIF(trim(p_store_id), ''))
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        store_id = EXCLUDED.store_id
  RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_store_role_admin(p_role_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $$
DECLARE
  caller_role text;
  target_uid  uuid;
  deleted     integer;
BEGIN
  PERFORM private.require_mfa();
  SELECT sr.role INTO caller_role
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
  LIMIT 1;

  IF caller_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'forbidden: caller is not a manager'
      USING ERRCODE = '42501';
  END IF;

  SELECT sr.user_id INTO target_uid
  FROM public.store_roles sr
  WHERE sr.id = p_role_id;

  IF target_uid IS NULL THEN
    RETURN 0;
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete own role (would lock yourself out)'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.store_roles WHERE id = p_role_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_sessions_older_than(p_days integer DEFAULT 7, p_store_id text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  caller_role   text;
  caller_store  text;
  deleted_count integer;
BEGIN
  PERFORM private.require_mfa();
  SELECT sr.role, sr.store_id INTO caller_role, caller_store
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
  LIMIT 1;

  IF caller_role = 'manager' THEN
    NULL; -- may purge any store, or all of them
  ELSIF caller_role = 'consulente_responsabile' THEN
    IF p_store_id IS NULL OR p_store_id IS DISTINCT FROM caller_store THEN
      RAISE EXCEPTION 'forbidden: a store responsible can only delete the sessions of their own store'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'forbidden: caller is not a manager or a store responsible'
      USING ERRCODE = '42501';
  END IF;

  p_days := GREATEST(1, LEAST(365, COALESCE(p_days, 7)));

  WITH deleted AS (
    DELETE FROM public.quiz_sessions
     WHERE created_at < now() - make_interval(days => p_days)
       AND (p_store_id IS NULL OR store_id = p_store_id)
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_audit_log_older_than(p_days integer DEFAULT 730)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  caller_role   text;
  deleted_count INTEGER;
BEGIN
  PERFORM private.require_mfa();
  -- Only managers can purge — consulente_responsabile must not be able to
  -- erase their own audit trail.
  SELECT sr.role INTO caller_role
  FROM public.store_roles sr
  WHERE sr.user_id = auth.uid()
  LIMIT 1;

  IF caller_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'forbidden: caller is not a manager'
      USING ERRCODE = '42501';
  END IF;

  -- Hard floor: never delete less than 180 days of history.
  p_days := GREATEST(180, LEAST(3650, p_days));

  WITH deleted AS (
    DELETE FROM public.manager_audit_log
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_code_redeemed(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $$
DECLARE
  rows_updated INTEGER;
  v_caller_role TEXT;
  v_caller_store TEXT;
  v_session_store TEXT;
BEGIN
  PERFORM private.require_mfa();
  -- Resolve the caller's role and store assignment.
  SELECT sr.role, sr.store_id
    INTO v_caller_role, v_caller_store
    FROM public.store_roles sr
   WHERE sr.user_id = auth.uid()
   LIMIT 1;

  -- If caller has no role row they are not a registered manager/consultant.
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'permission denied: no store role found for user';
  END IF;

  -- Consulente: validate that the session belongs to their store.
  IF v_caller_role = 'consulente_responsabile' THEN
    SELECT store_id INTO v_session_store
      FROM public.quiz_sessions
     WHERE id = p_session_id;

    IF v_session_store IS DISTINCT FROM v_caller_store THEN
      RAISE EXCEPTION 'permission denied: session does not belong to your store';
    END IF;
  END IF;

  UPDATE quiz_sessions
  SET
    code_redeemed    = TRUE,
    code_redeemed_at = NOW()
  WHERE id = p_session_id
    AND code_redeemed = FALSE;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

NOTIFY pgrst, 'reload schema';
