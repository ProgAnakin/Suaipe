-- Enforce uniqueness of issued discount codes.
--
-- on-session-created generates SUP-XXXXXXXX## from 4 random bytes (2^32 space),
-- so collisions are astronomically unlikely — but without a constraint a duplicate
-- is silently possible, and a code is the thing a customer redeems in-store. A
-- PARTIAL unique index ignores the many NULL rows (discount_code is written only
-- at send time, after the row is first inserted NULL).
--
-- ⚠ BEFORE APPLYING — confirm there are no existing duplicates, or the index
--   creation will fail:
--
--     SELECT discount_code, count(*)
--     FROM public.quiz_sessions
--     WHERE discount_code IS NOT NULL
--     GROUP BY discount_code
--     HAVING count(*) > 1;
--
--   Resolve any rows it returns first, then apply this migration.

CREATE UNIQUE INDEX IF NOT EXISTS quiz_sessions_discount_code_uniq
  ON public.quiz_sessions (discount_code)
  WHERE discount_code IS NOT NULL;
