/*
  # Step 4: Row Level Security Policies

  1. join_requests RLS policies
  2. events RLS policies (extend existing)
  3. users RLS policies (extend existing)
*/

-- Enable RLS on join_requests table
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. JOIN_REQUESTS RLS POLICIES

-- Policy: Users can insert join requests for themselves
CREATE POLICY "Users can create join requests for themselves"
  ON join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Users can view join requests they made or for events they host
CREATE POLICY "Users can view their own requests or requests for their events"
  ON join_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = (SELECT user_id FROM events WHERE events.id = join_requests.event_id)
  );

-- Policy: Only event hosts can update join request status
CREATE POLICY "Event hosts can update join request status"
  ON join_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM events WHERE events.id = join_requests.event_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM events WHERE events.id = join_requests.event_id));

-- Policy: Users can delete their own pending requests
CREATE POLICY "Users can delete their own pending requests"
  ON join_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id AND status = 'pending');

-- 2. EVENTS RLS POLICIES (extend existing)

-- Policy: Only event hosts can update place_exact_visible
CREATE POLICY "Event hosts can update location visibility"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. USERS RLS POLICIES

-- Policy: Public profile view for everyone (safe fields only)
CREATE POLICY "Public can view basic user profiles"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Note: Sensitive fields (hiv_status, prep_usage, social_links) will be filtered 
-- at the application level based on viewer permissions:
-- - Event hosts reviewing requests can see all fields
-- - Mutual approved event members can see extended fields
-- - Public users see only basic profile information

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own full profile
CREATE POLICY "Users can view their own full profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);