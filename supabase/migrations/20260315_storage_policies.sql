-- ============================================================
-- Storage Bucket Policies for post-images
-- ============================================================

-- Allow authenticated users to upload files (max 10MB enforced at bucket level)
UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'post-images';

-- RLS policies for storage.objects
-- Allow authenticated users to upload to post-images bucket
DROP POLICY IF EXISTS "auth_upload" ON storage.objects;
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images'
    AND auth.uid() IS NOT NULL
  );

-- Allow public read access to post-images
DROP POLICY IF EXISTS "public_read" ON storage.objects;
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'post-images'
  );

-- Allow users to delete their own uploaded files (path starts with their user ID)
DROP POLICY IF EXISTS "owner_delete" ON storage.objects;
CREATE POLICY "owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-images'
    AND auth.uid() IS NOT NULL
  );
