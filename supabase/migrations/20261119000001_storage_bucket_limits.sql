-- The public `product-images` bucket holds catalogue pictures and quiz-card artwork — nothing else.
--
-- Its INSERT policy already limits who may write (a manager, behind the second factor when that switch is on)
-- but not WHAT: any file of any size and any content type could be stored in a bucket that is served to
-- the public under the project's own domain. The staff upload forms re-encode every picture to a JPEG or a
-- PNG of at most 5 MB (src/lib/imageProcessing.ts); the bucket now enforces the same on its own, so a
-- direct API call with a manager's token cannot store an HTML page, an SVG with a script, or a 500 MB file.
--
-- Idempotent. `public` is deliberately left as it is on an existing bucket (the kiosk reads images by their
-- public URL; a fresh project gets a public bucket, which is what the read policy assumes).
-- Customer records and staff documents never belong in this bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
