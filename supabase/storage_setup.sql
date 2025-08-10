-- Storage setup for profile images
-- Run this in your Supabase SQL editor

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to view all profile images (public bucket)
CREATE POLICY "Anyone can view profile images" ON storage.objects
  FOR SELECT 
  TO public 
  USING (bucket_id = 'profile-images');

-- Policy: Allow users to update their own profile images
CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create function to update user's last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET last_seen = NOW() 
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_seen on auth activity
DROP TRIGGER IF EXISTS trigger_update_last_seen ON auth.users;
CREATE TRIGGER trigger_update_last_seen
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION update_user_last_seen();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- Create indexes for better performance on profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN(preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- Add profile image validation function
CREATE OR REPLACE FUNCTION validate_profile_images_array()
RETURNS TRIGGER AS $$
BEGIN
  -- Limit to 10 images maximum
  IF array_length(NEW.profile_images, 1) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 profile images allowed';
  END IF;
  
  -- Ensure all URLs are valid (basic check)
  IF NEW.profile_images IS NOT NULL THEN
    FOR i IN 1..array_length(NEW.profile_images, 1) LOOP
      IF NEW.profile_images[i] !~ '^https?://' THEN
        RAISE EXCEPTION 'Invalid image URL at position %', i;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile image validation
DROP TRIGGER IF EXISTS trigger_validate_profile_images ON profiles;
CREATE TRIGGER trigger_validate_profile_images
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_images_array();

-- Add comments for documentation
COMMENT ON BUCKET 'profile-images' IS 'Public bucket for user profile images with size and type restrictions enforced at application level';
COMMENT ON TABLE profiles IS 'Extended user profiles with public and sensitive information separated by RLS policies';
COMMENT ON COLUMN profiles.profile_images IS 'Array of profile image URLs from storage bucket, max 10 images';
COMMENT ON COLUMN profiles.hiv_status IS 'Sensitive health information, only visible with proper permissions';
COMMENT ON COLUMN profiles.prep_usage IS 'Sensitive health information, only visible with proper permissions';
COMMENT ON COLUMN profiles.social_links IS 'Sensitive contact information, only visible with proper permissions';
