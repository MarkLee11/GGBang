-- Simple email notification triggers
-- This migration creates basic triggers that call the email-notification-trigger Edge Function

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create a simple function to call the Edge Function
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
    'application/json',
    jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwNzQzOSwiZXhwIjoyMDY5ODgzNDM5fQ.irOhetgBP8dDz90QqUZvDrkdQqC8Dsy25RVh-hLQxg0',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34'
    )
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to notify email service: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for join_requests table
CREATE TRIGGER join_requests_email_trigger
  AFTER INSERT OR UPDATE OR DELETE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

-- Create triggers for event_attendees table
CREATE TRIGGER event_attendees_email_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

-- Create triggers for events table
CREATE TRIGGER events_email_trigger
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_email_service();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_email_service() TO authenticated;
