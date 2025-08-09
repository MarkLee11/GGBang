/*
  # Fix RLS policies for anonymous event creation

  1. Storage Policies
    - Create event-images bucket if it doesn't exist
    - Allow anonymous users to upload images
    - Allow public read access to images

  2. Events Table Policies
    - Update existing policies to allow anonymous users
    - Allow anonymous INSERT operations
    - Maintain public SELECT access

  3. Security Notes
    - These policies allow anonymous access for development
    - In production, consider restricting to authenticated users only
*/

-- Create the event-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own event images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;

-- Create storage policies that allow anonymous access
CREATE POLICY "Public read access for event images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Anonymous upload for event images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anonymous update for event images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'event-images')
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anonymous delete for event images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'event-images');

-- Update events table policies to allow anonymous access
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Create new policies that allow anonymous access
CREATE POLICY "Public read access for events"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anonymous users can create events"
  ON events
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update events"
  ON events
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete events"
  ON events
  FOR DELETE
  TO public
  USING (true);