/*
  # Update events table permissions for editing

  1. Security Updates
    - Ensure RLS policies allow UPDATE operations for anonymous users
    - Add proper permissions for PATCH operations on events table
    
  2. Changes
    - Update existing UPDATE policy to ensure it works properly
    - Verify all CRUD operations are available for public access
*/

-- Ensure the events table has proper RLS policies for updates
DROP POLICY IF EXISTS "Anonymous users can update events" ON events;

CREATE POLICY "Public users can update events"
  ON events
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure all other policies exist for completeness
DROP POLICY IF EXISTS "Public read access for events" ON events;
DROP POLICY IF EXISTS "Anonymous users can create events" ON events;
DROP POLICY IF EXISTS "Anonymous users can delete events" ON events;

CREATE POLICY "Public read access for events"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public users can create events"
  ON events
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public users can delete events"
  ON events
  FOR DELETE
  TO public
  USING (true);