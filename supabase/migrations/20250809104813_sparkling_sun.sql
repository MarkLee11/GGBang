/*
  # Create event_attendees table

  1. New Tables
    - `event_attendees`
      - `id` (uuid, primary key)
      - `event_id` (bigint, foreign key to events.id)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `event_attendees` table
    - Add policy for users to read all attendees
    - Add policy for authenticated users to manage their own attendance
    - Add policy for event creators to view their event attendees

  3. Indexes
    - Composite index on (event_id, user_id) for fast lookups
    - Index on event_id for fetching event attendees
    - Index on user_id for fetching user's attended events

  4. Constraints
    - Unique constraint on (event_id, user_id) to prevent duplicate attendance
*/

-- Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id bigint NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_attendees_event_id_fkey'
  ) THEN
    ALTER TABLE event_attendees 
    ADD CONSTRAINT event_attendees_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_attendees_user_id_fkey'
  ) THEN
    ALTER TABLE event_attendees 
    ADD CONSTRAINT event_attendees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint to prevent duplicate attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_attendees_event_user_unique'
  ) THEN
    ALTER TABLE event_attendees 
    ADD CONSTRAINT event_attendees_event_user_unique 
    UNIQUE (event_id, user_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS event_attendees_event_id_idx ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS event_attendees_user_id_idx ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS event_attendees_created_at_idx ON event_attendees(created_at);

-- Enable Row Level Security
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view event attendees"
  ON event_attendees
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage their own attendance"
  ON event_attendees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_event_attendees_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_event_attendees_updated_at_trigger
      BEFORE UPDATE ON event_attendees
      FOR EACH ROW
      EXECUTE FUNCTION update_event_attendees_updated_at();
  END IF;
END $$;