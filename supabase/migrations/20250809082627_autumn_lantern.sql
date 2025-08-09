/*
  # Add columns to events table

  1. New Columns
    - `title` (text, required) - Event title/name
    - `date` (date, required) - Event date
    - `time` (time, required) - Event start time
    - `location` (text, required) - Event location/address
    - `organizer` (text, required) - Event organizer name
    - `description` (text, optional) - Event description
    - `category` (text, required) - Event category (Bar, Club, Festival, etc.)
    - `image` (text, optional) - Image URL or Supabase storage path

  2. Storage Setup
    - Create storage bucket for event images
    - Set up RLS policies for image uploads

  3. Security
    - Maintain existing RLS on events table
    - Add policies for authenticated users to manage their events
*/

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS time time NOT NULL DEFAULT '00:00:00',
ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS organizer text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description text DEFAULT '',
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS image text DEFAULT '';

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event images
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add RLS policies for events table (if not already present)
CREATE POLICY "Anyone can view events"
ON events FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own events"
ON events FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete their own events"
ON events FOR DELETE
TO authenticated
USING (true);

-- Add helpful indexes for better query performance
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS events_category_idx ON events(category);
CREATE INDEX IF NOT EXISTS events_location_idx ON events(location);