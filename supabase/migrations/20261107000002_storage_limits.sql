BEGIN;
-- Public catalog images only. Customer records and staff documents never belong here.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('product-images','product-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
 ON CONFLICT(id) DO UPDATE SET file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
COMMIT;
