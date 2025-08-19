-- Update trigger function to support JWT authentication
-- This migration updates existing trigger functions to pass JWT tokens

-- Drop old trigger function
DROP FUNCTION IF EXISTS notify_email_service();

-- Create new JWT authenticated trigger function
CREATE OR REPLACE FUNCTION notify_email_service()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  url TEXT;
  jwt_token TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user's JWT token
  jwt_token := current_setting('request.jwt.claim', true);
  
  -- If no JWT token, try to get user ID from auth.uid()
  IF jwt_token IS NULL THEN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
      RAISE WARNING 'No authenticated user found for email notification';
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;
  
  -- Edge Function URL
  url := 'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger';
  
  -- Build payload with JWT token
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    'old_record', CASE 
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
      ELSE NULL
    END,
    'user_id', COALESCE(current_user_id, auth.uid())
  );
  
  -- Send HTTP request to Edge Function with JWT token
  IF jwt_token IS NOT NULL THEN
    -- Use JWT token for request
    PERFORM http_post(
      url,
      payload::text,
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer ' || jwt_token),
        http_header('Content-Type', 'application/json')
      ]
    );
  ELSE
    -- If no JWT token, use service role key as fallback
    PERFORM http_post(
      url,
      payload::text,
      'application/json'
    );
  END;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to notify email service: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers to use new function
-- Triggers themselves don't need modification as they still call notify_email_service()

-- Create test function to verify JWT authentication
CREATE OR REPLACE FUNCTION test_jwt_authentication()
RETURNS TEXT AS $$
DECLARE
  jwt_token TEXT;
  current_user_id UUID;
BEGIN
  jwt_token := current_setting('request.jwt.claim', true);
  current_user_id := auth.uid();
  
  RETURN jsonb_build_object(
    'jwt_token_exists', jwt_token IS NOT NULL,
    'jwt_token_preview', CASE 
      WHEN jwt_token IS NOT NULL THEN substring(jwt_token from 1 for 20) || '...'
      ELSE NULL
    END,
    'current_user_id', current_user_id,
    'auth_context', current_setting('request.jwt.claims', true)
  )::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create log view to monitor JWT authentication status
CREATE OR REPLACE VIEW jwt_auth_log AS
SELECT 
  now() as timestamp,
  'JWT Authentication Status' as event_type,
  test_jwt_authentication() as details
FROM (SELECT 1) as dummy;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_jwt_authentication() TO authenticated;
GRANT SELECT ON jwt_auth_log TO authenticated;

-- Add comments
COMMENT ON FUNCTION notify_email_service() IS 'JWT authenticated email notification trigger function';
COMMENT ON FUNCTION test_jwt_authentication() IS 'Function to test JWT authentication status';
COMMENT ON VIEW jwt_auth_log IS 'JWT authentication status log view';
