/*
  # Edge Functions Support Migration
  
  Goal: 创建支持并发安全的数据库函数，用于 Edge Functions 调用
  
  Features:
  1. approve_join_request_transaction - 原子性批准申请并添加参与者
  2. 行级锁定确保并发安全
  3. 容量检查防止超卖
  4. 完整的错误处理
*/

-- ================================
-- 创建事务安全的批准申请函数
-- ================================

CREATE OR REPLACE FUNCTION approve_join_request_transaction(
  p_request_id bigint,
  p_event_id bigint,
  p_requester_id uuid,
  p_event_capacity int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count int;
  v_request_status text;
  v_already_attending boolean;
  v_result json;
BEGIN
  -- 开始事务并锁定事件行以防止并发问题
  -- 使用 FOR UPDATE 锁定事件记录
  SELECT capacity INTO p_event_capacity
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;
  
  -- 检查申请是否仍然是 pending 状态
  SELECT status INTO v_request_status
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request_status != 'pending' THEN
    RAISE EXCEPTION 'request_not_pending: Request is already %', v_request_status;
  END IF;
  
  -- 检查用户是否已经在参与者列表中
  SELECT EXISTS(
    SELECT 1 FROM event_attendees 
    WHERE event_id = p_event_id AND user_id = p_requester_id
  ) INTO v_already_attending;
  
  IF v_already_attending THEN
    RAISE EXCEPTION 'already_attending: User is already attending this event';
  END IF;
  
  -- 获取当前参与者数量（使用锁定读取）
  SELECT COUNT(*)
  FROM event_attendees
  WHERE event_id = p_event_id
  INTO v_current_count;
  
  -- 检查容量限制
  IF v_current_count >= p_event_capacity THEN
    RAISE EXCEPTION 'capacity_exceeded: Event capacity % is full (current: %)', p_event_capacity, v_current_count;
  END IF;
  
  -- 批准申请
  UPDATE join_requests
  SET 
    status = 'approved',
    updated_at = now()
  WHERE id = p_request_id;
  
  -- 添加到参与者列表
  INSERT INTO event_attendees (event_id, user_id)
  VALUES (p_event_id, p_requester_id);
  
  -- 返回结果
  v_result := json_build_object(
    'success', true,
    'new_attendee_count', v_current_count + 1,
    'capacity', p_event_capacity,
    'request_id', p_request_id,
    'event_id', p_event_id,
    'requester_id', p_requester_id
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误并重新抛出
    RAISE;
END;
$$;

-- ================================
-- 创建事务安全的拒绝申请函数
-- ================================

CREATE OR REPLACE FUNCTION reject_join_request_transaction(
  p_request_id bigint,
  p_rejection_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_status text;
  v_result json;
BEGIN
  -- 锁定申请记录
  SELECT status INTO v_request_status
  FROM join_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found: Join request not found';
  END IF;
  
  IF v_request_status != 'pending' THEN
    RAISE EXCEPTION 'request_not_pending: Request is already %', v_request_status;
  END IF;
  
  -- 拒绝申请
  UPDATE join_requests
  SET 
    status = 'rejected',
    updated_at = now(),
    message = CASE 
      WHEN p_rejection_note IS NOT NULL THEN 
        COALESCE(message, '') || 
        CASE WHEN message IS NOT NULL AND message != '' THEN E'\n--- Rejection Note ---\n' ELSE '--- Rejection Note ---\n' END ||
        p_rejection_note
      ELSE message
    END
  WHERE id = p_request_id;
  
  -- 返回结果
  v_result := json_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'rejected',
    'rejection_note', p_rejection_note
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ================================
-- 创建批量解锁地点函数（用于计划任务）
-- ================================

CREATE OR REPLACE FUNCTION unlock_event_locations_batch(
  p_unlock_before_minutes int DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_events_updated int := 0;
  v_event_record record;
  v_result json;
BEGIN
  -- 找到需要解锁的事件（活动开始前指定分钟数且尚未解锁）
  FOR v_event_record IN
    SELECT id, title, date, time
    FROM events
    WHERE place_exact_visible = false
      AND (date::date + time::time) <= (now() + interval '1 minute' * p_unlock_before_minutes)
      AND (date::date + time::time) > now()  -- 确保事件还没开始
  LOOP
    -- 解锁每个事件
    UPDATE events
    SET place_exact_visible = true
    WHERE id = v_event_record.id;
    
    v_events_updated := v_events_updated + 1;
    
    -- 记录日志
    RAISE NOTICE 'Unlocked location for event %: % (scheduled for % %)', 
      v_event_record.id, 
      v_event_record.title, 
      v_event_record.date, 
      v_event_record.time;
  END LOOP;
  
  v_result := json_build_object(
    'success', true,
    'events_unlocked', v_events_updated,
    'unlock_before_minutes', p_unlock_before_minutes,
    'processed_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ================================
-- 创建清理过期申请函数
-- ================================

CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requests_cleaned int := 0;
  v_result json;
BEGIN
  -- 删除已过期事件的 pending 申请
  WITH expired_events AS (
    SELECT id FROM events 
    WHERE (date::date + time::time) < now()
  )
  UPDATE join_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND event_id IN (SELECT id FROM expired_events);
  
  GET DIAGNOSTICS v_requests_cleaned = ROW_COUNT;
  
  v_result := json_build_object(
    'success', true,
    'requests_cleaned', v_requests_cleaned,
    'processed_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ================================
-- 为函数设置权限
-- ================================

-- 只允许认证用户和服务角色调用这些函数
REVOKE ALL ON FUNCTION approve_join_request_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_join_request_transaction TO authenticated, service_role;

REVOKE ALL ON FUNCTION reject_join_request_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_join_request_transaction TO authenticated, service_role;

REVOKE ALL ON FUNCTION unlock_event_locations_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unlock_event_locations_batch TO service_role;

REVOKE ALL ON FUNCTION cleanup_expired_requests FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_expired_requests TO service_role;

-- ================================
-- 创建用于监控的视图
-- ================================

CREATE OR REPLACE VIEW event_capacity_status AS
SELECT 
  e.id,
  e.title,
  e.date,
  e.time,
  e.capacity,
  COUNT(ea.user_id) as current_attendees,
  (e.capacity - COUNT(ea.user_id)) as available_spots,
  CASE 
    WHEN COUNT(ea.user_id) >= e.capacity THEN 'FULL'
    WHEN COUNT(ea.user_id) >= (e.capacity * 0.8) THEN 'NEARLY_FULL'
    ELSE 'AVAILABLE'
  END as status,
  COUNT(jr.id) FILTER (WHERE jr.status = 'pending') as pending_requests
FROM events e
LEFT JOIN event_attendees ea ON e.id = ea.event_id
LEFT JOIN join_requests jr ON e.id = jr.event_id
WHERE (e.date::date + e.time::time) > now()  -- 只显示未来的事件
GROUP BY e.id, e.title, e.date, e.time, e.capacity
ORDER BY e.date, e.time;

-- 为视图设置 RLS
ALTER VIEW event_capacity_status SET (security_invoker = true);

-- ================================
-- 创建索引优化函数性能
-- ================================

-- 为事务函数创建必要的索引
CREATE INDEX IF NOT EXISTS idx_join_requests_status_event_id ON join_requests(status, event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user ON event_attendees(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events((date::date + time::time));
CREATE INDEX IF NOT EXISTS idx_events_place_visibility ON events(place_exact_visible, date, time);

-- ================================
-- 创建监控和统计函数
-- ================================

CREATE OR REPLACE FUNCTION get_event_stats(p_event_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'event_id', e.id,
    'title', e.title,
    'capacity', e.capacity,
    'current_attendees', COUNT(ea.user_id),
    'available_spots', (e.capacity - COUNT(ea.user_id)),
    'pending_requests', COUNT(jr.id) FILTER (WHERE jr.status = 'pending'),
    'approved_requests', COUNT(jr.id) FILTER (WHERE jr.status = 'approved'),
    'rejected_requests', COUNT(jr.id) FILTER (WHERE jr.status = 'rejected'),
    'is_full', COUNT(ea.user_id) >= e.capacity,
    'date', e.date,
    'time', e.time,
    'place_exact_visible', e.place_exact_visible
  )
  FROM events e
  LEFT JOIN event_attendees ea ON e.id = ea.event_id
  LEFT JOIN join_requests jr ON e.id = jr.event_id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.title, e.capacity, e.date, e.time, e.place_exact_visible
  INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'event_not_found: Event with ID % not found', p_event_id;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 设置权限
REVOKE ALL ON FUNCTION get_event_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_event_stats TO authenticated, service_role;
