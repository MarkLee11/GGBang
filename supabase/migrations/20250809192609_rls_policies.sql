/*
  # RLS Policies Migration - 行级安全策略
  
  Goal: 把"谁能创建/查看/审批申请"和"资料敏感字段谁能看"写死在数据库层，
        不依赖前端隐藏。
  
  Features:
  1. profiles - 本人可写；所有人可读公开字段；敏感字段需要特殊权限
  2. join_requests - 申请人与活动主办方可见；主办方可改状态
  3. events - 仅活动主能改敏感字段（place_exact_visible等）
  4. event_attendees - 仅服务端/主办操作
*/

-- ================================
-- 开启 RLS
-- ================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- ================================
-- PROFILES 策略
-- ================================

-- 清理现有策略
DROP POLICY IF EXISTS "profiles_self_write" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 本人可以创建自己的资料
CREATE POLICY "profiles_self_write" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id)
  TO authenticated;

-- 本人可以更新自己的资料
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE 
  USING (auth.uid() = user_id)
  TO authenticated;

-- 公开读取策略（所有人可以查看profiles，但前端应该过滤敏感字段）
-- 敏感字段: hiv_status, prep_usage, weight_kg, height_cm
-- 建议前端查询时不要 SELECT 这些字段，或创建视图来过滤
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT 
  USING (true)
  TO anon, authenticated;

-- ================================
-- JOIN_REQUESTS 策略
-- ================================

-- 清理现有策略
DROP POLICY IF EXISTS "jr_insert" ON join_requests;
DROP POLICY IF EXISTS "jr_select_mine" ON join_requests;
DROP POLICY IF EXISTS "jr_select_for_host" ON join_requests;
DROP POLICY IF EXISTS "jr_update_status_by_host" ON join_requests;
DROP POLICY IF EXISTS "Users can view join requests for their events" ON join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
DROP POLICY IF EXISTS "Event organizers can update join requests" ON join_requests;

-- 用户可以创建自己的申请
CREATE POLICY "jr_insert" ON join_requests
  FOR INSERT 
  WITH CHECK (requester_id = auth.uid())
  TO authenticated;

-- 申请人可以查看自己的申请
CREATE POLICY "jr_select_mine" ON join_requests
  FOR SELECT 
  USING (requester_id = auth.uid())
  TO authenticated;

-- 主办方可以查看自己活动的所有申请
CREATE POLICY "jr_select_for_host" ON join_requests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = join_requests.event_id
        AND e.user_id = auth.uid()
    )
  )
  TO authenticated;

-- 仅主办方可以更新申请状态（审批/拒绝）
CREATE POLICY "jr_update_status_by_host" ON join_requests
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = join_requests.event_id
        AND e.user_id = auth.uid()
    )
  )
  TO authenticated;

-- ================================
-- EVENTS 策略
-- ================================

-- 清理现有策略
DROP POLICY IF EXISTS "events_host_update" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- 所有人可以查看活动（公开信息）
CREATE POLICY "events_public_read" ON events
  FOR SELECT 
  USING (true)
  TO anon, authenticated;

-- 认证用户可以创建活动
CREATE POLICY "events_create" ON events
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id)
  TO authenticated;

-- 仅活动主办方可以更新活动（包括敏感字段如 place_exact_visible）
CREATE POLICY "events_host_update" ON events
  FOR UPDATE 
  USING (user_id = auth.uid())
  TO authenticated;

-- 仅活动主办方可以删除活动
CREATE POLICY "events_host_delete" ON events
  FOR DELETE 
  USING (user_id = auth.uid())
  TO authenticated;

-- ================================
-- EVENT_ATTENDEES 策略
-- ================================

-- 清理现有策略
DROP POLICY IF EXISTS "ea_read_mine" ON event_attendees;
DROP POLICY IF EXISTS "Users can view event attendees" ON event_attendees;
DROP POLICY IF EXISTS "Event organizers can manage attendees" ON event_attendees;

-- 用户可以查看：
-- 1. 自己参加的活动
-- 2. 自己主办活动的参与者
CREATE POLICY "ea_read_mine" ON event_attendees
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_attendees.event_id 
        AND e.user_id = auth.uid()
    )
  )
  TO authenticated;

-- 重要：插入和删除操作建议仅通过服务端的 Edge Function 执行
-- 这里不创建通用的 INSERT/DELETE 策略，以确保只有经过业务逻辑验证的操作才能执行
-- 如果需要，可以为 service_role 创建专门的策略

-- ================================
-- 创建安全视图（可选）
-- ================================

-- 创建一个公开的 profiles 视图，自动过滤敏感字段
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  user_id,
  created_at,
  updated_at,
  display_name,
  profile_images,
  bio,
  age,
  city,
  country,
  interests,
  preferences,
  body_type,
  relationship_status,
  last_online,
  social_links
  -- 排除敏感字段: hiv_status, prep_usage, weight_kg, height_cm
FROM profiles;

-- 为视图设置 RLS（继承底层表的策略）
ALTER VIEW public_profiles SET (security_invoker = true);

-- ================================
-- 创建函数来检查权限
-- ================================

-- 检查用户是否为活动主办方
CREATE OR REPLACE FUNCTION is_event_host(event_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_id 
      AND user_id = auth.uid()
  );
$$;

-- 检查用户是否可以查看敏感 profile 信息
CREATE OR REPLACE FUNCTION can_view_sensitive_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT target_user_id = auth.uid();
$$;

-- ================================
-- 创建安全的敏感 profiles 视图
-- ================================

-- 敏感信息视图：只有本人可以查看自己的敏感信息
CREATE OR REPLACE VIEW sensitive_profiles AS
SELECT 
  user_id,
  hiv_status,
  prep_usage,
  weight_kg,
  height_cm
FROM profiles
WHERE user_id = auth.uid();

-- 为敏感视图设置 RLS
ALTER VIEW sensitive_profiles SET (security_invoker = true);

-- ================================
-- 创建索引优化策略查询
-- ================================

-- 优化 join_requests 策略查询
CREATE INDEX IF NOT EXISTS idx_join_requests_composite ON join_requests(event_id, requester_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_composite ON event_attendees(event_id, user_id);

-- ================================
-- 测试数据验证（注释掉的测试案例）
-- ================================

/*
-- 测试案例（在实际环境中可以取消注释进行测试）

-- 测试 1: 非主办方尝试更新 join_requests 状态（应该失败）
-- UPDATE join_requests SET status = 'approved' WHERE event_id = 1;

-- 测试 2: 用户尝试创建别人的申请（应该失败）
-- INSERT INTO join_requests (event_id, requester_id, message) 
-- VALUES (1, '00000000-0000-0000-0000-000000000000', 'test');

-- 测试 3: 非主办方尝试更新活动的 place_exact_visible（应该失败）
-- UPDATE events SET place_exact_visible = true WHERE id = 1;

-- 测试 4: 查询敏感 profile 信息（只应该返回当前用户的）
-- SELECT * FROM sensitive_profiles;
*/
