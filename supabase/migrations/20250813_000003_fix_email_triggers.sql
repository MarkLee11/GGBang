-- Fix email notification triggers - simplify http_post calls
-- This migration updates the existing triggers to use simple http_post calls without complex headers

-- Drop existing triggers first
DROP TRIGGER IF EXISTS join_requests_email_trigger ON join_requests;
DROP TRIGGER IF EXISTS event_attendees_email_trigger ON event_attendees;
DROP TRIGGER IF EXISTS events_email_trigger ON events;

-- Drop existing functions
DROP FUNCTION IF EXISTS notify_email_service();
DROP FUNCTION IF EXISTS notify_event_changes();

-- Recreate the simple notify_email_service function
CREATE OR REPLACE FUNCTION notify_email_service()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  url TEXT;
BEGIN
  -- Set the URL for the Edge Function
  url := 'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger';
  
  -- Build the payload based on the trigger operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', 'INSERT',
        'record', to_jsonb(NEW),
        'old_record', NULL
      );
    WHEN 'UPDATE' THEN
      payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', 'UPDATE',
        'record', to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
      );
    WHEN 'DELETE' THEN
      payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', 'DELETE',
        'record', to_jsonb(OLD),
        'old_record', NULL
      );
  END CASE;
  
  -- Make HTTP request to Edge Function (non-blocking)
  PERFORM http_post(
    url,
    payload::text,
    'application/json'
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to notify email service: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER join_requests_email_trigger
  AFTER INSERT OR UPDATE OR DELETE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

CREATE TRIGGER event_attendees_email_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

CREATE TRIGGER events_email_trigger
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_email_service() TO authenticated;
