-- Manual Profiles Table Creation
-- Run this in your Supabase SQL Editor if the profiles table doesn't exist

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Basic Information (Public)
  display_name TEXT,
  profile_images TEXT[] DEFAULT '{}',
  bio TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  city TEXT,
  country TEXT,
  
  -- Interests and Preferences (Public)
  interests TEXT[] DEFAULT '{}',
  preferences TEXT[] DEFAULT '{}',
  
  -- Physical Information (Public)
  height_cm INTEGER CHECK (height_cm >= 100 AND height_cm <= 250),
  weight_kg INTEGER CHECK (weight_kg >= 30 AND weight_kg <= 200),
  body_type TEXT CHECK (body_type IN ('slim', 'average', 'athletic', 'muscular', 'bear', 'chubby', 'stocky', 'other')),
  relationship_status TEXT CHECK (relationship_status IN ('single', 'taken', 'married', 'open', 'complicated', 'not_specified')),
  
  -- System Fields (Public)
  is_verified BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ,
  
  -- Sensitive Information (Restricted Access)
  hiv_status TEXT CHECK (hiv_status IN ('negative', 'positive', 'unknown', 'not_disclosed')),
  prep_usage TEXT CHECK (prep_usage IN ('on_prep', 'not_on_prep', 'considering', 'not_disclosed')),
  social_links JSONB DEFAULT '{}'::jsonb
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_read_all ON profiles;
CREATE POLICY profiles_read_all ON profiles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create interest categories table
CREATE TABLE IF NOT EXISTS interest_categories (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  interests TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert interest categories
INSERT INTO interest_categories (category, interests) VALUES
  ('Hobbies', ARRAY['Music', 'Art', 'Photography', 'Reading', 'Gaming', 'Cooking', 'Gardening', 'Crafts']),
  ('Sports & Fitness', ARRAY['Fitness', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Dancing', 'Hiking', 'Rock Climbing']),
  ('Social & Entertainment', ARRAY['Movies', 'Theater', 'Concerts', 'Festivals', 'Parties', 'Nightlife', 'Comedy Shows', 'Museums']),
  ('Food & Drink', ARRAY['Wine Tasting', 'Coffee', 'Fine Dining', 'Street Food', 'Cocktails', 'Beer', 'Cooking Classes', 'Food Festivals']),
  ('Travel & Adventure', ARRAY['Travel', 'Backpacking', 'Road Trips', 'Beach Vacations', 'City Exploration', 'Cultural Tourism', 'Adventure Sports', 'Camping']),
  ('Technology & Learning', ARRAY['Technology', 'Coding', 'Science', 'History', 'Languages', 'Business', 'Startups', 'Podcasts'])
ON CONFLICT DO NOTHING;

-- Create preference options table
CREATE TABLE IF NOT EXISTS preference_options (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert preference options
INSERT INTO preference_options (category, options) VALUES
  ('Relationship Goals', ARRAY['Long-term relationship', 'Casual dating', 'Friendship', 'Networking']),
  ('Activity Preferences', ARRAY['Travel companion', 'Activity partner', 'Event buddy', 'Adventure seeker']),
  ('Social Style', ARRAY['One-on-one hangouts', 'Group activities', 'Party scenes', 'Quiet gatherings']),
  ('Professional', ARRAY['Mentorship', 'Creative collaboration', 'Business networking', 'Career development'])
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON interest_categories TO authenticated, anon;
GRANT SELECT ON preference_options TO authenticated, anon;
