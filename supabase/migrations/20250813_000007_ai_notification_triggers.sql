-- === File: supabase/migrations/20250813_000007_ai_notification_triggers.sql ===
-- AI通知系统触发器
-- 自动监听表变化并插入通知队列

-- 1) 创建通知队列触发器函数
CREATE OR REPLACE FUNCTION enqueue_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_event_host_id UUID;
  v_event_title TEXT;
  v_event_date DATE;
  v_event_time TIME;
  v_requester_name TEXT;
  v_host_name TEXT;
BEGIN
  -- 根据不同的表变化，插入不同类型的通知任务
  IF TG_TABLE_NAME = 'join_requests' THEN
    -- 获取事件信息
    SELECT e.user_id, e.title, e.date, e.time 
    INTO v_event_host_id, v_event_title, v_event_date, v_event_time
    FROM events e WHERE e.id = NEW.event_id;
    
    -- 获取申请者姓名
    SELECT COALESCE(p.display_name, 'Someone') 
    INTO v_requester_name
    FROM profiles p WHERE p.user_id = NEW.requester_id;
    
    -- 获取主办方姓名
    SELECT COALESCE(p.display_name, 'the host') 
    INTO v_host_name
    FROM profiles p WHERE p.user_id = v_event_host_id;
    
    IF TG_OP = 'INSERT' THEN
      -- 新申请：通知主办方
      INSERT INTO notifications_queue (kind, event_id, join_request_id, requester_id, user_id, payload)
      VALUES (
        'request_created',
        NEW.event_id,
        NEW.id,
        NEW.requester_id,
        v_event_host_id,
        jsonb_build_object(
          'message', NEW.message,
          'eventTitle', v_event_title,
          'eventDate', v_event_date,
          'eventTime', v_event_time,
          'requesterName', v_requester_name,
          'hostName', v_host_name
        )
      );
      
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
      -- 状态变化：通知申请者
      INSERT INTO notifications_queue (kind, event_id, join_request_id, requester_id, user_id, payload)
      VALUES (
        CASE NEW.status
          WHEN 'approved' THEN 'approved'
          WHEN 'rejected' THEN 'rejected'
          ELSE 'request_created'
        END,
        NEW.event_id,
        NEW.id,
        NEW.requester_id,
        v_event_host_id,
        jsonb_build_object(
          'message', NEW.message,
          'status', NEW.status,
          'eventTitle', v_event_title,
          'eventDate', v_event_date,
          'eventTime', v_event_time,
          'requesterName', v_requester_name,
          'hostName', v_host_name,
          'hostNote', CASE WHEN NEW.status = 'rejected' THEN NEW.message ELSE NULL END
        )
      );
    END IF;
    
  ELSIF TG_TABLE_NAME = 'events' THEN
    -- 位置解锁：通知所有参与者
    IF TG_OP = 'UPDATE' AND OLD.place_exact_visible = false AND NEW.place_exact_visible = true THEN
      INSERT INTO notifications_queue (kind, event_id, join_request_id, requester_id, user_id, payload)
      VALUES (
        'location_unlocked',
        NEW.id,
        NULL,
        NULL,
        NEW.user_id,
        jsonb_build_object(
          'eventTitle', NEW.title,
          'eventDate', NEW.date,
          'eventTime', NEW.time,
          'hostName', COALESCE(
            (SELECT p.display_name FROM profiles p WHERE p.user_id = NEW.user_id),
            'the host'
          )
        )
      );
    END IF;
    
  ELSIF TG_TABLE_NAME = 'event_attendees' THEN
    -- 新参与者加入：可选的通知（如果需要的话）
    -- 这里可以根据需要添加逻辑
    NULL;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) 创建触发器
-- join_requests 表触发器
DROP TRIGGER IF EXISTS trigger_enqueue_notification_jr ON join_requests;
CREATE TRIGGER trigger_enqueue_notification_jr
  AFTER INSERT OR UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_notification();

-- events 表触发器（位置解锁）
DROP TRIGGER IF EXISTS trigger_enqueue_notification_events ON events;
CREATE TRIGGER trigger_enqueue_notification_events
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_notification();

-- 3) 创建辅助函数：手动触发通知
CREATE OR REPLACE FUNCTION trigger_manual_notification(
  p_kind notify_kind,
  p_event_id BIGINT DEFAULT NULL,
  p_join_request_id BIGINT DEFAULT NULL,
  p_requester_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_id BIGINT;
BEGIN
  INSERT INTO notifications_queue (kind, event_id, join_request_id, requester_id, user_id, payload)
  VALUES (p_kind, p_event_id, p_join_request_id, p_requester_id, p_user_id, p_payload)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$;

-- 4) 创建通知状态查询函数
CREATE OR REPLACE FUNCTION get_notification_status(
  p_queue_id BIGINT DEFAULT NULL,
  p_event_id BIGINT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  queue_id BIGINT,
  kind notify_kind,
  status notify_status,
  attempts INT,
  last_error TEXT,
  created_at TIMESTAMPTZ,
  sent_count BIGINT,
  failed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nq.id as queue_id,
    nq.kind,
    nq.status,
    nq.attempts,
    nq.last_error,
    nq.created_at,
    COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN nl.status = 'failed' THEN 1 END) as failed_count
  FROM notifications_queue nq
  LEFT JOIN notifications_log nl ON nl.queue_id = nq.id
  WHERE (p_queue_id IS NULL OR nq.id = p_queue_id)
    AND (p_event_id IS NULL OR nq.event_id = p_event_id)
    AND (p_user_id IS NULL OR nq.user_id = p_user_id OR nq.requester_id = p_user_id)
  GROUP BY nq.id, nq.kind, nq.status, nq.attempts, nq.last_error, nq.created_at
  ORDER BY nq.created_at DESC;
END;
$$;

-- 5) 创建清理旧通知的函数
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_days_old INT DEFAULT 30)
RETURNS TABLE (
  deleted_queue BIGINT,
  deleted_logs BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_queue BIGINT;
  v_deleted_logs BIGINT;
BEGIN
  -- 删除旧的日志记录
  DELETE FROM notifications_log 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND status IN ('sent', 'failed');
  GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;
  
  -- 删除已完成的队列项
  DELETE FROM notifications_queue 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND status IN ('sent', 'failed');
  GET DIAGNOSTICS v_deleted_queue = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_queue, v_deleted_logs;
END;
$$;

-- 6) 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_queue_created_at ON notifications_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_queue_kind_status ON notifications_queue(kind, status);
CREATE INDEX IF NOT EXISTS idx_notifications_log_queue_id ON notifications_log(queue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON notifications_log(created_at DESC);

-- 7) 添加注释
COMMENT ON FUNCTION enqueue_notification() IS '自动监听表变化并插入通知队列的触发器函数';
COMMENT ON FUNCTION trigger_manual_notification() IS '手动触发通知的函数，用于测试或特殊情况';
COMMENT ON FUNCTION get_notification_status() IS '查询通知状态的函数，支持多种过滤条件';
COMMENT ON FUNCTION cleanup_old_notifications() IS '清理旧通知的函数，自动维护数据库性能';

-- 8) 授予权限
GRANT EXECUTE ON FUNCTION enqueue_notification() TO service_role;
GRANT EXECUTE ON FUNCTION trigger_manual_notification() TO service_role;
GRANT EXECUTE ON FUNCTION get_notification_status() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO service_role;

