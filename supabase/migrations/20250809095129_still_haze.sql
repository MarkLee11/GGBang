/*
  # Add user tracking to events

  1. Changes
    - Add `user_id` column to `events` table to track event creators
    - Set default value and make it nullable for existing events
    - Add index for better query performance

  2. Security
    - Update RLS policies to allow users to manage their own events
*/

-- Add user_id column to events table
ALTER TABLE events ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Add index for better performance
CREATE INDEX events_user_id_idx ON events(user_id);

-- Update RLS policies to allow users to manage their own events
DROP POLICY IF EXISTS "Public users can create events" ON events;
DROP POLICY IF EXISTS "Public users can update events" ON events;
DROP POLICY IF EXISTS "Public users can delete events" ON events;

-- Allow authenticated users to create events (user_id will be set automatically)
CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own events
CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own events
CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);