-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening — found by applying every migration to a real PostgreSQL and
-- attacking the result as each role (anon, a role-less user, consulente,
-- consulente_responsabile, manager). See docs/qa/QA-REPORT.md.
--
-- Safe on a live database: every statement is idempotent and nothing here
-- rewrites existing rows.
--
-- ⚠ APPLY THIS PROMPTLY. Section 1 closes a hole that lets anyone holding the
--    public anon key (it ships in the browser bundle) delete customer leads.
--
--   1. Privileged functions were still executable through PUBLIC / by anon
--   2. purge_sessions_older_than: no authorisation, no store scope
--   3. quiz_sessions INSERT: what an anonymous browser may write
--   4. The per-address e-mail limit was case-sensitive, and there was no global ceiling
--   5. The audit log accepted entries written in somebody else's name
--   6. Staff-PIN lockout: keyed on values the caller chooses, it crashed, and weaker
--      overloads of the function were still there
--   7. Login rate-limit helpers: flooding + case
--   8. check_email_cooldown could be used to lock a victim out
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Privileged functions ─────────────────────────────────────────────────
-- Postgres grants EXECUTE on every new function to PUBLIC, and anon/authenticated
-- inherit it. `REVOKE … FROM anon` therefore changes nothing while the PUBLIC
-- grant is still there — which is how purge_sessions_older_than stayed callable
-- by anonymous visitors after 20260518000003 "revoked" it.
REVOKE ALL ON FUNCTION public.mark_code_redeemed(uuid)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_code_redeemed(uuid)   TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_store_role()        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_store_role()        TO authenticated;

-- The role-admin and audit-purge functions check the caller's role themselves, but Supabase's
-- default privileges also hand anon an explicit EXECUTE on every function in `public`; take it
-- away so the check is the second line of defence, not the only one.
REVOKE ALL ON FUNCTION public.list_store_roles_admin()                    FROM anon;
REVOKE ALL ON FUNCTION public.upsert_store_role_admin(text, text, text)   FROM anon;
REVOKE ALL ON FUNCTION public.delete_store_role_admin(uuid)               FROM anon;
REVOKE ALL ON FUNCTION public.purge_audit_log_older_than(integer)         FROM anon;
-- a trigger function: never meant to be called by anyone
REVOKE ALL ON FUNCTION public.check_email_insert_limit()                  FROM PUBLIC, anon, authenticated;


-- ── 2. Retention purge: role-scoped ─────────────────────────────────────────
-- Before: SECURITY DEFINER with no check at all, executable by everybody, and it
-- always deleted every store's leads — even when a store responsible (whose
-- dashboard previews only their own store) pressed the button.
--   manager                   → any store, or all of them (p_store_id NULL)
--   consulente_responsabile   → their own store only, and they must name it
--   anyone else               → refused
DROP FUNCTION IF EXISTS public.purge_sessions_older_than(integer);

CREATE OR REPLACE FUNCTION public.purge_sessions_older_than(
  p_days     integer DEFAULT 7,
  p_store_id text    DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role   text;
  caller_store  text;
  deleted_count integer;
BEGIN
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

REVOKE ALL ON FUNCTION public.purge_sessions_older_than(integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.purge_sessions_older_than(integer, text) TO authenticated;


-- ── 3. quiz_sessions INSERT: what an anonymous browser may write ────────────
-- The old policy only checked the e-mail, the match percentage and the product id,
-- so anyone with the anon key could insert a lead with ANY other column: a
-- discount of 90 % (the Edge Function printed it into the code it e-mailed), a
-- ready-made discount_code with email_sent = true (a "valid" code the system never
-- issued), code_redeemed, no consent record, or megabytes of text.
-- Columns the server owns must arrive untouched; the rest is bounded.
DROP POLICY IF EXISTS quiz_sessions_insert_public ON public.quiz_sessions;

CREATE POLICY quiz_sessions_insert_public ON public.quiz_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
        email IS NOT NULL
    AND char_length(btrim(email)) BETWEEN 3 AND 254
    AND match_percent BETWEEN 0 AND 100
    AND char_length(btrim(matched_product_id)) BETWEEN 1 AND 100

    -- written by the Edge Function / manager RPCs only
    AND email_sent        = false
    AND discount_code     IS NULL
    AND code_redeemed     = false
    AND code_redeemed_at  IS NULL
    AND email_opened_at   IS NULL
    AND email_clicked_at  IS NULL

    -- GDPR Art. 7(1): the consent record is part of the lead
    AND consent_given_at  IS NOT NULL
    AND consent_given_at  <= now() + interval '5 minutes'

    -- the discount the kiosk shows (the Edge Function re-derives it server-side)
    AND (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 99)

    -- the snapshot used to build the e-mail is bounded
    AND char_length(coalesce(product_name,  '')) <= 300
    AND char_length(coalesce(product_price, '')) <= 50
    AND char_length(coalesce(product_image, '')) <= 2000
    AND char_length(coalesce(product_video, '')) <= 2000
    AND pg_column_size(answers) <= 4096
  );


-- ── 4. Per-address limit: case- and whitespace-insensitive ──────────────────
-- (the kiosk lower-cases, but a direct API call does not have to)
-- Also a global ceiling: the anon key is public, so nothing else stops a script from inserting
-- leads (and therefore triggering e-mails from our sender) for thousands of different addresses.
-- Four stores will never see 120 customers in one minute.
CREATE OR REPLACE FUNCTION public.check_email_insert_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.quiz_sessions
    WHERE lower(btrim(email)) = lower(btrim(NEW.email))
      AND created_at > now() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many requests for this email. Try again later.';
  END IF;

  IF (
    SELECT COUNT(*) FROM public.quiz_sessions WHERE created_at > now() - INTERVAL '1 minute'
  ) >= 120 THEN
    RAISE EXCEPTION 'Too many requests. Try again in a moment.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS quiz_sessions_created_at_idx
  ON public.quiz_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS quiz_sessions_email_norm_created_idx
  ON public.quiz_sessions (lower(btrim(email)), created_at DESC);


-- ── 5. Audit log: no forged authors ─────────────────────────────────────────
DROP POLICY IF EXISTS audit_log_insert_authenticated ON public.manager_audit_log;

CREATE POLICY audit_log_insert_authenticated ON public.manager_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.store_roles sr WHERE sr.user_id = auth.uid())
  );


-- ── 6. Staff PIN: a lockout the caller cannot choose to dodge ───────────────
-- The old lockout counted failures per `client_id` and per `ip_address` — both
-- ARGUMENTS of the RPC, so a caller defeated it by sending a fresh random client_id
-- on every guess. And once a lockout did trigger, the lockout branch itself crashed
-- ("column reference ip_address is ambiguous"), returning an error instead of the
-- documented {valid:false, locked_seconds:n}.
--
-- Now: the address is what the API gateway saw (request headers), not an argument —
-- except for the verify-pin Edge Function (service_role), which forwards the
-- browser's address. On top of the per-client and per-address limits there is a
-- GLOBAL one, so guesses spread over many clients and addresses are throttled too.
-- (At 20 guesses / 5 min a 4-digit PIN takes ~2 days to exhaust; use 6 digits.)
-- Older overloads of verify_staff_pin (2 and 3 arguments, from 20260407000002 and
-- 20260429000001) were never dropped. They keep the old client_id-only lockout and are
-- callable by anon — an attacker would simply pick the weakest one. One function remains;
-- every shorter call is served by its default arguments.
DROP FUNCTION IF EXISTS public.verify_staff_pin(text, text);
DROP FUNCTION IF EXISTS public.verify_staff_pin(text, text, text);

CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  pin_input  text,
  client_id  text DEFAULT 'default',
  user_agent text DEFAULT '',
  ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  w_client interval := interval '2 minutes';   m_client int := 3;
  w_ip     interval := interval '10 minutes';  m_ip     int := 10;
  w_global interval := interval '5 minutes';   m_global int := 20;

  headers      json;
  v_client_id  text := left(coalesce(nullif(btrim(verify_staff_pin.client_id), ''), 'default'), 200);
  v_ip         text;
  stored_hash  text;
  pin_valid    boolean;
  f_client     int;
  f_ip         int := 0;
  f_global     int;
  locked_secs  int := 0;
BEGIN
  headers := COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::json;

  IF auth.role() = 'service_role' THEN
    v_ip := NULLIF(btrim(verify_staff_pin.ip_address), '');
  ELSE
    v_ip := COALESCE(
      NULLIF(btrim(headers ->> 'cf-connecting-ip'), ''),
      NULLIF(btrim(headers ->> 'x-real-ip'), ''),
      NULLIF(btrim(regexp_replace(COALESCE(headers ->> 'x-forwarded-for', ''), '^.*,', '')), '')
    );
  END IF;
  v_ip := left(v_ip, 100);

  SELECT count(*) INTO f_client
  FROM public.admin_access_log l
  WHERE l.client_id = v_client_id AND NOT l.success AND l.created_at > now() - w_client;

  IF v_ip IS NOT NULL THEN
    SELECT count(*) INTO f_ip
    FROM public.admin_access_log l
    WHERE l.ip_address = v_ip AND NOT l.success AND l.created_at > now() - w_ip;
  END IF;

  SELECT count(*) INTO f_global
  FROM public.admin_access_log l
  WHERE NOT l.success AND l.created_at > now() - w_global;

  IF f_client >= m_client THEN
    SELECT GREATEST(locked_secs, COALESCE(EXTRACT(EPOCH FROM (max(l.created_at) + w_client - now()))::int, 0)) INTO locked_secs
    FROM public.admin_access_log l
    WHERE l.client_id = v_client_id AND NOT l.success AND l.created_at > now() - w_client;
  END IF;
  IF f_ip >= m_ip THEN
    SELECT GREATEST(locked_secs, COALESCE(EXTRACT(EPOCH FROM (max(l.created_at) + w_ip - now()))::int, 0)) INTO locked_secs
    FROM public.admin_access_log l
    WHERE l.ip_address = v_ip AND NOT l.success AND l.created_at > now() - w_ip;
  END IF;
  IF f_global >= m_global THEN
    SELECT GREATEST(locked_secs, COALESCE(EXTRACT(EPOCH FROM (max(l.created_at) + w_global - now()))::int, 0)) INTO locked_secs
    FROM public.admin_access_log l
    WHERE NOT l.success AND l.created_at > now() - w_global;
  END IF;

  IF f_client >= m_client OR f_ip >= m_ip OR f_global >= m_global THEN
    RETURN jsonb_build_object('valid', false, 'locked_seconds', GREATEST(locked_secs, 1));
  END IF;

  SELECT value INTO stored_hash FROM public.app_config WHERE key = 'staff_pin_hash';
  IF stored_hash IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'locked_seconds', 0);
  END IF;

  pin_valid := (extensions.crypt(left(coalesce(pin_input, ''), 200), stored_hash) = stored_hash);

  INSERT INTO public.admin_access_log (client_id, user_agent, ip_address, success)
  VALUES (v_client_id, left(NULLIF(verify_staff_pin.user_agent, ''), 500), v_ip, pin_valid);

  RETURN jsonb_build_object('valid', pin_valid, 'locked_seconds', 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text, text, text, text) TO anon, authenticated, service_role;


-- ── 7. Login rate-limit helpers ─────────────────────────────────────────────
-- Callable by anyone (they run before login). Normalise the address, and stop a
-- flood from growing the table or from keeping a victim locked out longer than
-- the lockout window.
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email         text := lower(btrim(COALESCE(p_email, '')));
  recent_failures int;
  lockout_window  interval := interval '5 minutes';
  max_attempts    int      := 5;
  locked_secs     int;
BEGIN
  SELECT count(*) INTO recent_failures
  FROM public.login_attempts
  WHERE email = v_email
    AND success = false
    AND created_at > (now() - lockout_window);

  IF recent_failures >= max_attempts THEN
    SELECT EXTRACT(EPOCH FROM (
      (SELECT created_at FROM public.login_attempts
       WHERE email = v_email AND success = false
       ORDER BY created_at DESC
       OFFSET (max_attempts - 1) LIMIT 1)
      + lockout_window - now()
    ))::int INTO locked_secs;
    RETURN jsonb_build_object('locked', true, 'locked_seconds', GREATEST(locked_secs, 0));
  END IF;

  RETURN jsonb_build_object('locked', false, 'locked_seconds', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
BEGIN
  IF v_email = '' OR char_length(v_email) > 254 THEN RETURN; END IF;

  -- a flood from one browser neither grows the table nor extends the lockout
  IF (SELECT count(*) FROM public.login_attempts
       WHERE email = v_email AND created_at > now() - interval '5 minutes') >= 10 THEN
    RETURN;
  END IF;

  IF random() < 0.05 THEN
    DELETE FROM public.login_attempts WHERE created_at < now() - interval '1 day';
  END IF;

  INSERT INTO public.login_attempts (email, success) VALUES (v_email, COALESCE(p_success, false));
END;
$$;


-- ── 8. check_email_cooldown: flooding must not lock a visitor out ───────────
-- Past 10 checks of one address within 10 minutes the old function answered
-- "in cooldown for 1 h" — so anyone could keep any address from using the kiosk by
-- calling the RPC in a loop. It now just stops answering usefully (which also
-- blunts using it to find out who visited); the e-mail rate limit itself lives in
-- the Edge Function and the insert trigger.
CREATE OR REPLACE FUNCTION public.check_email_cooldown(p_email text)
RETURNS TABLE (in_cooldown boolean, hours_remaining numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_key   text;
  v_recent_checks int;
  v_last_session  record;
BEGIN
  v_session_key := md5(lower(btrim(p_email)) || date_trunc('hour', now())::text);

  SELECT count(*) INTO v_recent_checks
  FROM public.cooldown_check_log
  WHERE session_key = v_session_key
    AND created_at > now() - interval '10 minutes';

  IF v_recent_checks >= 10 THEN
    RETURN QUERY SELECT false::boolean, 0::numeric;
    RETURN;
  END IF;

  INSERT INTO public.cooldown_check_log (session_key) VALUES (v_session_key);
  DELETE FROM public.cooldown_check_log WHERE created_at < now() - interval '1 hour';

  SELECT qs.created_at INTO v_last_session
  FROM public.quiz_sessions qs
  WHERE lower(btrim(qs.email)) = lower(btrim(p_email))
    AND qs.created_at > now() - interval '1 hour'
  ORDER BY qs.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      true::boolean,
      ROUND(EXTRACT(EPOCH FROM (v_last_session.created_at + interval '1 hour' - now())) / 3600, 1)::numeric;
  ELSE
    RETURN QUERY SELECT false::boolean, 0::numeric;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_cooldown(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
