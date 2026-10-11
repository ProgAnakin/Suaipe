-- ─────────────────────────────────────────────────────────────────────────────
-- Funnel events: staff only, store-scoped.
--
-- quiz_funnel_events SELECT was `auth.role() = 'authenticated'` — any signed-in account, whatever its
-- role (or no role at all), read every store's funnel counts. Same shape as the quiz_sessions
-- policies now: a manager sees all stores, a store responsible their own, everybody else nothing.
-- (The kiosk only ever INSERTs funnel events; that policy is untouched.)
--
-- Safe on a live database: one policy is replaced, no rows are rewritten.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS allow_select_auth ON public.quiz_funnel_events;

CREATE POLICY allow_select_auth ON public.quiz_funnel_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_roles sr
      WHERE sr.user_id = auth.uid()
        AND (
          sr.role = 'manager'
          OR (sr.role = 'consulente_responsabile' AND sr.store_id = quiz_funnel_events.store_id)
        )
    )
  );

NOTIFY pgrst, 'reload schema';
