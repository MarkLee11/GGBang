/*
  # Step 3: Database Schema Extensions

  1. Create profiles table for user information
  2. Create join_requests table for approval workflow
  3. Extend events table with capacity and privacy features
  4. Ensure event_attendees has proper UUID references
*/

-- 1) Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  profile_images TEXT[],
  bio TEXT,
  age INT CHECK (age BETWEEN 18 AND 99),
  city TEXT,
  country TEXT,
  interests TEXT[],
  preferences TEXT[],
  height_cm INT,
  weight_kg INT,
  body_type TEXT,
  relationship_status TEXT,
  hiv_status TEXT,
  prep_usage BOOLEAN,
  last_online TIMESTAMP,
  social_links JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2) Create join_requests table
CREATE TABLE IF NOT EXISTS join_requests (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  waitlist BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(event_id, requester_id)
);

-- 3) Extend events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 6 CHECK (capacity BETWEEN 2 AND 12),
ADD COLUMN IF NOT EXISTS privacy TEXT CHECK (privacy IN ('public','link','invite')) DEFAULT 'public',
ADD COLUMN IF NOT EXISTS place_hint TEXT,
ADD COLUMN IF NOT EXISTS place_exact TEXT,
ADD COLUMN IF NOT EXISTS place_exact_visible BOOLEAN DEFAULT false;

-- 4) Ensure event_attendees has proper structure
-- First, check if we need to modify the user_id column type
DO $$
BEGIN
  -- Check if user_id column exists and its type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_attendees' 
    AND column_name = 'user_id' 
    AND data_type != 'uuid'
  ) THEN
    -- Drop and recreate the table with proper UUID references
    DROP TABLE IF EXISTS event_attendees CASCADE;
    
    CREATE TABLE event_attendees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      UNIQUE(event_id, user_id)
    );
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_join_requests_event_id ON join_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_requester_id ON join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_join_requests_updated_at ON join_requests;
CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_attendees_updated_at ON event_attendees;
CREATE TRIGGER update_event_attendees_updated_at
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();