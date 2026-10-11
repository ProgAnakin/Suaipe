-- Rebrand the LIVE email_template rows to the operator's chosen identity.
--
-- Context: the DB rows still carried the legacy "Webidoo Store" sender. The
-- 2026-05-21 rebrand migration only rewrote rows still on their seeded default,
-- so a manually-edited sender was deliberately left untouched — which is why the
-- old value survived. This migration sets, for EVERY language row:
--   sender_name       → 'Suaipe Shop'        (From: name in the customer's inbox)
--   footer_store_name → 'Suaipe'            (the consultant / store name shown in the
--                        email footer and on the discount-code card header — change it
--                        in /manager → Management → Email)
--
-- Idempotent: re-running it simply re-applies the same two values.
UPDATE public.email_template
SET sender_name       = 'Suaipe Shop',
    footer_store_name = 'Suaipe',
    updated_at        = now();
