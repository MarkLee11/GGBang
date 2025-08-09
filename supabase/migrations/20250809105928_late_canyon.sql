/*
  # Fix event_attendees table for Supabase auth only

  1. New Tables
    - `event_attendees` (recreated)
      - `id` (uuid, primary key)
      - `event_id` (bigint, references events)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `event_attendees` table
    - Add policy for public read access to attendee counts
    - Add policy for authenticated users to manage their own attendance

  3. Changes
    - Remove foreign key constraint to non-existent users table
    - Use auth.uid() for user identification
    - Add proper indexes for performance
    - Add unique constraint to prevent duplicate attendance
*/

-- Drop the existing table if it exists
DROP TABLE IF EXISTS event_attendees;

-- Create the event_attendees table
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate attendance
ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_event_user_unique UNIQUE (event_id, user_id);

-- Create indexes for better performance
CREATE INDEX event_attendees_event_id_idx ON event_attendees(event_id);
CREATE INDEX event_attendees_user_id_idx ON event_attendees(user_id);
CREATE INDEX event_attendees_created_at_idx ON event_attendees(created_at);

-- Enable Row Level Security
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view event attendees (for attendee counts)
CREATE POLICY "Anyone can view event attendees"
  ON event_attendees
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can manage their own attendance
CREATE POLICY "Authenticated users can manage their own attendance"
  ON event_attendees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_event_attendees_updated_at_trigger
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendees_updated_at();