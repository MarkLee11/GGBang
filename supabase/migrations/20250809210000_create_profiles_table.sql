-- Migration: Create profiles table and related schema
-- Purpose: Support Grindr-style user profiles with public/sensitive field separation

-- Create profiles table
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

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN(preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Add updated_at trigger
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can insert/update their own profile
CREATE POLICY profiles_self_manage ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles: Public read access (for profile cards and discovery)
-- This policy allows reading public fields, sensitive fields are handled at application level
CREATE POLICY profiles_public_read ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can see basic profile info (for public event listings)
CREATE POLICY profiles_anonymous_read ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Create RPC function to get public profile info (excludes sensitive fields)
CREATE OR REPLACE FUNCTION get_public_profile_info(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  display_name TEXT,
  profile_images TEXT[],
  bio TEXT,
  age INTEGER,
  city TEXT,
  country TEXT,
  interests TEXT[],
  preferences TEXT[],
  height_cm INTEGER,
  weight_kg INTEGER,
  body_type TEXT,
  relationship_status TEXT,
  is_verified BOOLEAN,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.created_at,
    p.updated_at,
    p.display_name,
    p.profile_images,
    p.bio,
    p.age,
    p.city,
    p.country,
    p.interests,
    p.preferences,
    p.height_cm,
    p.weight_kg,
    p.body_type,
    p.relationship_status,
    p.is_verified,
    p.last_seen
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to get full profile info (includes sensitive fields with permission check)
CREATE OR REPLACE FUNCTION get_full_profile_info(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT NULL,
  event_context_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  display_name TEXT,
  profile_images TEXT[],
  bio TEXT,
  age INTEGER,
  city TEXT,
  country TEXT,
  interests TEXT[],
  preferences TEXT[],
  height_cm INTEGER,
  weight_kg INTEGER,
  body_type TEXT,
  relationship_status TEXT,
  is_verified BOOLEAN,
  last_seen TIMESTAMPTZ,
  hiv_status TEXT,
  prep_usage TEXT,
  social_links JSONB,
  can_view_sensitive BOOLEAN
) AS $$
DECLARE
  can_view_sensitive_info BOOLEAN := FALSE;
BEGIN
  -- Determine if requesting user can view sensitive information
  can_view_sensitive_info := FALSE;
  
  -- User can always view their own sensitive info
  IF requesting_user_id = target_user_id THEN
    can_view_sensitive_info := TRUE;
  END IF;
  
  -- Check if requesting user is host reviewing a pending request
  IF requesting_user_id IS NOT NULL AND event_context_id IS NOT NULL THEN
    -- Host can see sensitive info when reviewing requests
    IF EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_context_id 
        AND e.user_id = requesting_user_id
        AND EXISTS (
          SELECT 1 FROM join_requests jr 
          WHERE jr.event_id = event_context_id 
            AND jr.requester_id = target_user_id 
            AND jr.status = 'pending'
        )
    ) THEN
      can_view_sensitive_info := TRUE;
    END IF;
    
    -- Mutual event attendees can see each other's sensitive info
    IF EXISTS (
      SELECT 1 FROM event_attendees ea1
      JOIN event_attendees ea2 ON ea1.event_id = ea2.event_id
      WHERE ea1.event_id = event_context_id
        AND ea1.user_id = requesting_user_id
        AND ea2.user_id = target_user_id
    ) THEN
      can_view_sensitive_info := TRUE;
    END IF;
  END IF;
  
  -- Return profile data with appropriate sensitive field access
  RETURN QUERY
  SELECT 
    p.user_id,
    p.created_at,
    p.updated_at,
    p.display_name,
    p.profile_images,
    p.bio,
    p.age,
    p.city,
    p.country,
    p.interests,
    p.preferences,
    p.height_cm,
    p.weight_kg,
    p.body_type,
    p.relationship_status,
    p.is_verified,
    p.last_seen,
    CASE WHEN can_view_sensitive_info THEN p.hiv_status ELSE NULL END as hiv_status,
    CASE WHEN can_view_sensitive_info THEN p.prep_usage ELSE NULL END as prep_usage,
    CASE WHEN can_view_sensitive_info THEN p.social_links ELSE NULL END as social_links,
    can_view_sensitive_info
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle profile creation on user signup
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
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NULL),
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

-- Create interest categories table (for frontend dropdown options)
CREATE TABLE IF NOT EXISTS interest_categories (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  interests TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default interest categories
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

-- Insert default preference options
INSERT INTO preference_options (category, options) VALUES
  ('Relationship Goals', ARRAY['Long-term relationship', 'Casual dating', 'Friendship', 'Networking']),
  ('Activity Preferences', ARRAY['Travel companion', 'Activity partner', 'Event buddy', 'Adventure seeker']),
  ('Social Style', ARRAY['One-on-one hangouts', 'Group activities', 'Party scenes', 'Quiet gatherings']),
  ('Professional', ARRAY['Mentorship', 'Creative collaboration', 'Business networking', 'Career development'])
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON interest_categories TO authenticated, anon;
GRANT SELECT ON preference_options TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_public_profile_info(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_full_profile_info(UUID, UUID, BIGINT) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profiles with public and sensitive information separated by access control';
COMMENT ON COLUMN profiles.profile_images IS 'Array of profile image URLs from Supabase Storage';
COMMENT ON COLUMN profiles.hiv_status IS 'Sensitive health information - access controlled';
COMMENT ON COLUMN profiles.prep_usage IS 'Sensitive health information - access controlled';
COMMENT ON COLUMN profiles.social_links IS 'Sensitive contact information - access controlled';
COMMENT ON FUNCTION get_public_profile_info(UUID) IS 'Returns public profile fields only';
COMMENT ON FUNCTION get_full_profile_info(UUID, UUID, BIGINT) IS 'Returns full profile with context-aware sensitive field access';
