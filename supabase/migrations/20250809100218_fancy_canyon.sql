/*
  # Update Events RLS Policies for Better Security

  1. Security Updates
    - Update RLS policies to ensure proper ownership checks
    - Add more restrictive delete policy
    - Ensure users can only modify their own events

  2. Policy Changes
    - Update delete policy to be more explicit about ownership
    - Add additional safety checks for event modifications
*/

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;

-- Create more secure delete policy
CREATE POLICY "Users can delete only their own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    user_id IS NOT NULL
  );

-- Create more secure update policy
CREATE POLICY "Users can update only their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    user_id IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    user_id IS NOT NULL
  );

-- Ensure the user_id column is properly indexed for performance
CREATE INDEX IF NOT EXISTS events_user_id_auth_idx ON events(user_id) WHERE user_id IS NOT NULL;