-- Press Forge: Design Assets Storage Bucket
-- Creates the storage bucket for user-uploaded reference images, logos, and brand assets.

-- Create the storage bucket (public, since design assets need public URLs for AI providers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-assets',
  'design-assets',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/heic',
    'image/heif'
  ];

-- RLS policy: users can only access their own files
-- Files are organized as: {user_id}/{category}/{file_id}.{ext}

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all files in the bucket (needed for AI providers to see images)
CREATE POLICY "Public read access for design assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'design-assets');
