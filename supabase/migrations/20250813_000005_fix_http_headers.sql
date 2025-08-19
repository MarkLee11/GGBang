-- Fix http_post headers parameter for email notification triggers
-- This migration fixes the headers parameter issue in the http_post function

-- Drop existing triggers first
DROP TRIGGER IF EXISTS join_requests_email_trigger ON join_requests;
DROP TRIGGER IF EXISTS event_attendees_email_trigger ON event_attendees;
DROP TRIGGER IF EXISTS events_email_trigger ON events;

-- Drop existing function
DROP FUNCTION IF EXISTS notify_email_service();

-- Recreate the function with correct http_post syntax
CREATE OR REPLACE FUNCTION notify_email_service()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  url TEXT;
  headers TEXT[];
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
  
  -- Build headers array for http_post
  headers := ARRAY[
    'Content-Type: application/json',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwNzQzOSwiZXhwIjoyMDY5ODgzNDM5fQ.irOhetgBP8dDz90QqUZvDrkdQqC8Dsy25RVh-hLQxg0',
    'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34'
  ];
  
  -- Make HTTP request to Edge Function with headers
  PERFORM http_post(
    url,
    payload::text,
    'application/json',
    headers
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
