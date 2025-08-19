-- Create email notification triggers for automatic email sending
-- This migration sets up database triggers that call the email-notification-trigger Edge Function

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to call the Edge Function
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

-- Create a more sophisticated trigger for events that only fires on specific changes
CREATE OR REPLACE FUNCTION notify_event_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  url TEXT;
  should_notify BOOLEAN := FALSE;
BEGIN
  -- Set the URL for the Edge Function
  url := 'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger';
  
  -- Only notify on specific changes
  IF TG_OP = 'INSERT' THEN
    should_notify := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if relevant fields changed
    should_notify := (
      OLD.title IS DISTINCT FROM NEW.title OR
      OLD.date IS DISTINCT FROM NEW.date OR
      OLD.time IS DISTINCT FROM NEW.time OR
      OLD.place_hint IS DISTINCT FROM NEW.place_hint OR
      OLD.place_exact_visible IS DISTINCT FROM NEW.place_exact_visible OR
      OLD.capacity IS DISTINCT FROM NEW.capacity
    );
  END IF;
  
  IF should_notify THEN
    payload := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', to_jsonb(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    );
    
    -- Make HTTP request to Edge Function (non-blocking)
    PERFORM http_post(
      url,
      payload::text,
      'application/json'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to notify email service: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the simple events trigger and replace with the sophisticated one
DROP TRIGGER IF EXISTS events_email_trigger ON events;
CREATE TRIGGER events_email_trigger
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_changes();

-- Create a function to manually trigger email notifications (for testing/debugging)
CREATE OR REPLACE FUNCTION manual_email_notification(
  p_table TEXT,
  p_type TEXT,
  p_record_id BIGINT
)
RETURNS TEXT AS $$
DECLARE
  payload JSONB;
  url TEXT;
  record_data JSONB;
BEGIN
  -- Set the URL for the Edge Function
  url := 'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger';
  
  -- Get the record data based on table and ID
  EXECUTE format('SELECT to_jsonb(t.*) FROM %I t WHERE id = $1', p_table)
    INTO record_data
    USING p_record_id;
  
  IF record_data IS NULL THEN
    RETURN 'Record not found';
  END IF;
  
  -- Build the payload
  payload := jsonb_build_object(
    'table', p_table,
    'type', p_type,
    'record', record_data,
    'old_record', NULL
  );
  
  -- Make HTTP request to Edge Function
  PERFORM http_post(
    url,
    payload::text,
    'application/json'
  );
  
  RETURN 'Email notification triggered successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Failed to trigger email notification: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to monitor email notification triggers
CREATE OR REPLACE VIEW email_notification_log AS
SELECT 
  'join_requests' as table_name,
  'INSERT' as operation_type,
  'New join request submitted' as description,
  COUNT(*) as count
FROM join_requests 
WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'join_requests' as table_name,
  'UPDATE' as operation_type,
  'Join request status changed' as description,
  COUNT(*) as count
FROM join_requests 
WHERE updated_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'event_attendees' as table_name,
  'DELETE' as operation_type,
  'Attendee removed' as description,
  COUNT(*) as count
FROM event_attendees 
WHERE updated_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'events' as table_name,
  'INSERT' as operation_type,
  'New event published' as description,
  COUNT(*) as count
FROM events 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_email_service() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_event_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_email_notification(TEXT, TEXT, BIGINT) TO authenticated;
GRANT SELECT ON email_notification_log TO authenticated;

-- Create an index to improve trigger performance
CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON join_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_join_requests_updated_at ON join_requests(updated_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);
