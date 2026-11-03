-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: 20260405000004_product_settings.sql seeded product_settings with
-- placeholder IDs (airpulse-pro, fitcore-band, etc.) that no longer exist in
-- src/data/products.ts. Existing rows for those IDs are dead weight and the
-- new seed adds the correct rows. This migration deletes the legacy rows so
-- the manager dashboard does not display ghost product entries.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.product_settings
WHERE product_id IN (
  'airpulse-pro',
  'fitcore-band',
  'flashdeck-mini',
  'clipcam-360',
  'voicebox-studio',
  'sleeppod-neo',
  'ergoflow-chair',
  'trailcam-pro',
  'nexpad-gaming',
  'nomad-charger'
);

-- Insert the actual product IDs (idempotent thanks to ON CONFLICT).
INSERT INTO public.product_settings (product_id, active) VALUES
  ('blnd-blender',         true),
  ('fitring-air',          true),
  ('head-hdtw01',          true),
  ('ksix-saturn',          true),
  ('laifen-neo',           true),
  ('muzen-otr',            true),
  ('outin-nano',           true),
  ('terraillon-massager',  true),
  ('veho-pebble-mg5',      true),
  ('veho-zb7',             true)
ON CONFLICT (product_id, store_id) DO NOTHING;
