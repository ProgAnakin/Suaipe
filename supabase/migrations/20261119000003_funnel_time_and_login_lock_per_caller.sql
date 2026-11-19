-- Two abuses of the PUBLIC (anon-key) surface, found by the external release audit and reproduced against this schema.
--
-- 1. FUNNEL EVENTS WERE BACK-DATABLE. Anyone holding the anon key — it ships in the JavaScript bundle — could insert
--    a `claimed` event dated 40 days ago and move the dashboards' funnel and conversion rate at will. The row's
--    time now always comes from the database clock, whatever the client sends. (A visitor can still ADD events of
--    today; deriving `claimed` from the lead itself, and capping events per store, is on the backlog — see
--    docs/qa/REVISAO-BRANCH-GPT.md.)
--
-- 2. ANYONE COULD LOCK A STAFF MEMBER OUT OF THE LOGIN SCREEN. record_login_attempt() is callable by anon (it runs
--    before login) and counted per e-mail address only: five fabricated failures for manager@… kept that person out
--    of the sign-in form for five minutes, again and again; check_login_rate_limit() also told the world which
--    addresses had recent failures. Attempts are now counted per (address, caller) — the caller being the network
--    address the API gateway saw, stored as a short hash — so an attacker's fabricated failures only ever lock the
--    attacker's own address out, and a caller only learns about its own attempts. (This is a convenience throttle in
--    front of Supabase Auth, which has rate limits of its own; the real second line of defence is the TOTP step.)
--
-- Both statements are idempotent.

-- ── 1. the funnel's clock ─────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.funnel_event_server_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.funnel_event_server_time() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS funnel_event_server_time ON public.quiz_funnel_events;
CREATE TRIGGER funnel_event_server_time
  BEFORE INSERT ON public.quiz_funnel_events
  FOR EACH ROW EXECUTE FUNCTION public.funnel_event_server_time();

-- ── 2. login attempts per (address, caller) ───────────────────────────────────────────────────────────────────
-- A short hash of the address the gateway saw (same sources as verify_staff_pin); '' when there is none.
CREATE OR REPLACE FUNCTION public.login_attempt_caller()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  headers json := COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::json;
  addr    text;
BEGIN
  addr := COALESCE(
    NULLIF(btrim(headers ->> 'cf-connecting-ip'), ''),
    NULLIF(btrim(headers ->> 'x-real-ip'), ''),
    NULLIF(btrim(regexp_replace(COALESCE(headers ->> 'x-forwarded-for', ''), '^.*,', '')), '')
  );
  IF addr IS NULL THEN RETURN ''; END IF;
  RETURN left(encode(digest(convert_to(left(addr, 100), 'UTF8'), 'sha256'), 'hex'), 16);
END;
$$;
REVOKE ALL ON FUNCTION public.login_attempt_caller() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS caller text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_caller_created
  ON public.login_attempts (email, caller, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email         text := lower(btrim(COALESCE(p_email, '')));
  v_caller        text := public.login_attempt_caller();
  recent_failures int;
  lockout_window  interval := interval '5 minutes';
  max_attempts    int      := 5;
  locked_secs     int;
BEGIN
  SELECT count(*) INTO recent_failures
  FROM public.login_attempts
  WHERE email = v_email
    AND caller = v_caller
    AND success = false
    AND created_at > (now() - lockout_window);

  IF recent_failures >= max_attempts THEN
    SELECT EXTRACT(EPOCH FROM (
      (SELECT created_at FROM public.login_attempts
       WHERE email = v_email AND caller = v_caller AND success = false
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
  v_email  text := lower(btrim(COALESCE(p_email, '')));
  v_caller text := public.login_attempt_caller();
BEGIN
  IF v_email = '' OR char_length(v_email) > 254 THEN RETURN; END IF;

  -- a flood from one caller neither grows the table nor extends its own lockout...
  IF (SELECT count(*) FROM public.login_attempts
       WHERE email = v_email AND caller = v_caller AND created_at > now() - interval '5 minutes') >= 10 THEN
    RETURN;
  END IF;
  -- ...and a flood from many callers cannot grow it without bound either
  IF (SELECT count(*) FROM public.login_attempts WHERE created_at > now() - interval '5 minutes') >= 2000 THEN
    RETURN;
  END IF;

  IF random() < 0.05 THEN
    DELETE FROM public.login_attempts WHERE created_at < now() - interval '1 day';
  END IF;

  INSERT INTO public.login_attempts (email, success, caller) VALUES (v_email, COALESCE(p_success, false), v_caller);
END;
$$;

REVOKE ALL ON FUNCTION public.check_login_rate_limit(text), public.record_login_attempt(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text), public.record_login_attempt(text, boolean) TO anon, authenticated;
