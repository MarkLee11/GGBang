/*
  # Step 3: Database Schema Extensions

  1. Create join_requests table
  2. Extend users table with profile fields
  3. Extend events table with capacity and privacy fields
*/

-- 1. Create join_requests table
CREATE TABLE IF NOT EXISTS join_requests (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS join_requests_event_id_idx ON join_requests(event_id);
CREATE INDEX IF NOT EXISTS join_requests_requester_id_idx ON join_requests(requester_id);
CREATE INDEX IF NOT EXISTS join_requests_status_idx ON join_requests(status);

-- 2. Extend users table (create if not exists, then add columns)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new profile columns to users table
DO $$
BEGIN
  -- Add display_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
    ALTER TABLE users ADD COLUMN display_name TEXT;
  END IF;
  
  -- Add profile_images column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_images') THEN
    ALTER TABLE users ADD COLUMN profile_images TEXT[];
  END IF;
  
  -- Add bio column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;
  
  -- Add age column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') THEN
    ALTER TABLE users ADD COLUMN age INT CHECK (age BETWEEN 18 AND 99);
  END IF;
  
  -- Add city column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'city') THEN
    ALTER TABLE users ADD COLUMN city TEXT;
  END IF;
  
  -- Add country column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT;
  END IF;
  
  -- Add interests column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'interests') THEN
    ALTER TABLE users ADD COLUMN interests TEXT[];
  END IF;
  
  -- Add preferences column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferences') THEN
    ALTER TABLE users ADD COLUMN preferences TEXT[];
  END IF;
  
  -- Add height_cm column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'height_cm') THEN
    ALTER TABLE users ADD COLUMN height_cm INT;
  END IF;
  
  -- Add weight_kg column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'weight_kg') THEN
    ALTER TABLE users ADD COLUMN weight_kg INT;
  END IF;
  
  -- Add body_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'body_type') THEN
    ALTER TABLE users ADD COLUMN body_type TEXT;
  END IF;
  
  -- Add relationship_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'relationship_status') THEN
    ALTER TABLE users ADD COLUMN relationship_status TEXT;
  END IF;
  
  -- Add hiv_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hiv_status') THEN
    ALTER TABLE users ADD COLUMN hiv_status TEXT;
  END IF;
  
  -- Add prep_usage column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'prep_usage') THEN
    ALTER TABLE users ADD COLUMN prep_usage BOOLEAN;
  END IF;
  
  -- Add last_online column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_online') THEN
    ALTER TABLE users ADD COLUMN last_online TIMESTAMPTZ;
  END IF;
  
  -- Add social_links column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'social_links') THEN
    ALTER TABLE users ADD COLUMN social_links JSONB;
  END IF;
END $$;

-- 3. Extend events table with new columns
DO $$
BEGIN
  -- Add capacity column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INT DEFAULT 6 CHECK (capacity BETWEEN 2 AND 12);
  END IF;
  
  -- Add privacy column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'privacy') THEN
    ALTER TABLE events ADD COLUMN privacy TEXT CHECK (privacy IN ('public','link','invite')) DEFAULT 'public';
  END IF;
  
  -- Add place_hint column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'place_hint') THEN
    ALTER TABLE events ADD COLUMN place_hint TEXT;
  END IF;
  
  -- Add place_exact column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'place_exact') THEN
    ALTER TABLE events ADD COLUMN place_exact TEXT;
  END IF;
  
  -- Add place_exact_visible column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'place_exact_visible') THEN
    ALTER TABLE events ADD COLUMN place_exact_visible BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing events with default capacity and place hints
UPDATE events SET 
  capacity = CASE 
    WHEN capacity IS NULL THEN 6 
    ELSE capacity 
  END,
  place_hint = CASE 
    WHEN place_hint IS NULL THEN location || ' area'
    ELSE place_hint 
  END
WHERE capacity IS NULL OR place_hint IS NULL;

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for join_requests updated_at
DROP TRIGGER IF EXISTS update_join_requests_updated_at_trigger ON join_requests;
CREATE TRIGGER update_join_requests_updated_at_trigger
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_join_requests_updated_at();

-- Create trigger function for updating users updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();