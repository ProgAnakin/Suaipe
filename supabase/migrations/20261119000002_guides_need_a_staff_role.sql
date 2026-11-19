-- Two cheap closures found by the external release audit and re-checked against this schema.
--
-- 1. The product training guides (and the file list behind them) were readable by ANY authenticated user —
--    `USING (true)`. "Authenticated" is not "staff": a project that ever leaves sign-ups open, or a test
--    account, would read the training material. A staff member is somebody with a `store_roles` row, which
--    is also what every other staff-only policy asks for. (The second-factor gate, when the switch is on,
--    stays in front of this: it is a separate RESTRICTIVE policy.)
--
-- 2. Nobody who reaches the database through the public API needs to CREATE objects in the `public` schema;
--    only migrations do, as the owner. Make that explicit instead of relying on a default that differs
--    between PostgreSQL versions and hosting templates.

DROP POLICY IF EXISTS "staff read product_guides" ON public.product_guides;
CREATE POLICY "staff read product_guides"
  ON public.product_guides
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_roles sr WHERE sr.user_id = auth.uid()));

DROP POLICY IF EXISTS "staff read product_guide_files" ON public.product_guide_files;
CREATE POLICY "staff read product_guide_files"
  ON public.product_guide_files
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_roles sr WHERE sr.user_id = auth.uid()));

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
