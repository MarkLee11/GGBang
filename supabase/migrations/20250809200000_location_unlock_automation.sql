-- Migration: Location unlock automation system
-- Purpose: Support automated location unlocking with logging and monitoring

-- Create location unlock logs table for monitoring automated unlock activity
CREATE TABLE IF NOT EXISTS location_unlock_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('unlocked', 'error', 'skipped')),
  details TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying of unlock logs
CREATE INDEX IF NOT EXISTS idx_location_unlock_logs_event_id ON location_unlock_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_location_unlock_logs_unlocked_at ON location_unlock_logs(unlocked_at);
CREATE INDEX IF NOT EXISTS idx_location_unlock_logs_action ON location_unlock_logs(action);

-- Create index for efficient automated unlock queries
CREATE INDEX IF NOT EXISTS idx_events_auto_unlock ON events(date, time, place_exact_visible) 
WHERE place_exact IS NOT NULL AND place_exact_visible = false;

-- Add function to get events ready for unlock (1 hour before)
CREATE OR REPLACE FUNCTION get_events_ready_for_unlock()
RETURNS TABLE (
  event_id BIGINT,
  title TEXT,
  date DATE,
  time TIME,
  place_exact TEXT,
  user_id UUID,
  minutes_until_event NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.title,
    e.date,
    e.time,
    e.place_exact,
    e.user_id,
    EXTRACT(EPOCH FROM (
      (e.date + e.time)::TIMESTAMP - NOW()
    )) / 60 as minutes_until_event
  FROM events e
  WHERE e.place_exact IS NOT NULL
    AND e.place_exact_visible = false
    AND e.date >= CURRENT_DATE
    AND EXTRACT(EPOCH FROM (
      (e.date + e.time)::TIMESTAMP - NOW()
    )) / 60 BETWEEN 55 AND 65
  ORDER BY e.date, e.time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to safely unlock event location (idempotent)
CREATE OR REPLACE FUNCTION unlock_event_location_safe(event_id_param BIGINT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  was_already_unlocked BOOLEAN
) AS $$
DECLARE
  event_record RECORD;
  was_unlocked BOOLEAN := false;
BEGIN
  -- Check if event exists and get current state
  SELECT id, title, place_exact, place_exact_visible
  INTO event_record
  FROM events
  WHERE id = event_id_param;
  
  -- Event doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Event not found', false;
    RETURN;
  END IF;
  
  -- No exact location to unlock
  IF event_record.place_exact IS NULL THEN
    RETURN QUERY SELECT false, 'Event has no exact location to unlock', false;
    RETURN;
  END IF;
  
  -- Already unlocked
  IF event_record.place_exact_visible = true THEN
    RETURN QUERY SELECT true, 'Event location was already unlocked', true;
    RETURN;
  END IF;
  
  -- Perform the unlock
  UPDATE events 
  SET place_exact_visible = true,
      updated_at = NOW()
  WHERE id = event_id_param
    AND place_exact_visible = false; -- Additional safety check
  
  -- Check if update actually happened
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Event location unlocked successfully', false;
  ELSE
    RETURN QUERY SELECT false, 'Failed to unlock event location', false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add manual unlock function for hosts (with logging)
CREATE OR REPLACE FUNCTION manual_unlock_event_location(
  event_id_param BIGINT,
  user_id_param UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  code TEXT
) AS $$
DECLARE
  event_record RECORD;
  unlock_result RECORD;
BEGIN
  -- Verify user is the event host
  SELECT id, title, user_id, place_exact, place_exact_visible
  INTO event_record
  FROM events
  WHERE id = event_id_param;
  
  -- Event doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Event not found', 'EVENT_NOT_FOUND';
    RETURN;
  END IF;
  
  -- User is not the host
  IF event_record.user_id != user_id_param THEN
    RETURN QUERY SELECT false, 'Only the event host can unlock location', 'FORBIDDEN';
    RETURN;
  END IF;
  
  -- Perform safe unlock
  SELECT * INTO unlock_result
  FROM unlock_event_location_safe(event_id_param);
  
  -- Log the manual unlock attempt
  INSERT INTO location_unlock_logs (
    event_id,
    event_title,
    action,
    details,
    unlocked_at
  ) VALUES (
    event_id_param,
    event_record.title,
    CASE 
      WHEN unlock_result.success THEN 'unlocked'
      ELSE 'error'
    END,
    CASE 
      WHEN unlock_result.was_already_unlocked THEN 'Manual unlock - already unlocked'
      WHEN unlock_result.success THEN 'Manual unlock by host'
      ELSE 'Manual unlock failed: ' || unlock_result.message
    END,
    NOW()
  );
  
  RETURN QUERY SELECT 
    unlock_result.success,
    unlock_result.message,
    CASE 
      WHEN unlock_result.success THEN 'SUCCESS'
      ELSE 'UNLOCK_FAILED'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for monitoring unlock activity
CREATE OR REPLACE VIEW unlock_activity_summary AS
SELECT 
  date_trunc('hour', unlocked_at) as hour,
  action,
  COUNT(*) as count,
  array_agg(DISTINCT event_title) as events
FROM location_unlock_logs
WHERE unlocked_at >= NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', unlocked_at), action
ORDER BY hour DESC, action;

-- Add RLS policies for unlock logs (hosts can see their own event logs)
ALTER TABLE location_unlock_logs ENABLE ROW LEVEL SECURITY;

-- Hosts can see unlock logs for their own events
CREATE POLICY unlock_logs_host_read ON location_unlock_logs
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = location_unlock_logs.event_id 
        AND e.user_id = auth.uid()
    )
  );

-- Service role can manage all unlock logs
CREATE POLICY unlock_logs_service_manage ON location_unlock_logs
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions for the automated unlock system
GRANT EXECUTE ON FUNCTION get_events_ready_for_unlock() TO service_role;
GRANT EXECUTE ON FUNCTION unlock_event_location_safe(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION manual_unlock_event_location(BIGINT, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE location_unlock_logs IS 'Tracks all location unlock activities for monitoring and debugging';
COMMENT ON FUNCTION get_events_ready_for_unlock() IS 'Returns events that should be unlocked (1 hour before start time)';
COMMENT ON FUNCTION unlock_event_location_safe(BIGINT) IS 'Safely unlocks event location with idempotent behavior';
COMMENT ON FUNCTION manual_unlock_event_location(BIGINT, UUID) IS 'Allows event hosts to manually unlock location with logging';
COMMENT ON VIEW unlock_activity_summary IS 'Hourly summary of unlock activities for monitoring';

-- Create notification function for unlock events (optional, for future use)
CREATE OR REPLACE FUNCTION notify_location_unlocked()
RETURNS TRIGGER AS $$
BEGIN
  -- This could be used to send notifications when locations are unlocked
  -- For now, just log the activity
  RAISE NOTICE 'Location unlocked for event: % (ID: %)', NEW.title, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify when location is unlocked
DROP TRIGGER IF EXISTS trigger_location_unlocked ON events;
CREATE TRIGGER trigger_location_unlocked
  AFTER UPDATE OF place_exact_visible ON events
  FOR EACH ROW
  WHEN (OLD.place_exact_visible = false AND NEW.place_exact_visible = true)
  EXECUTE FUNCTION notify_location_unlocked();
