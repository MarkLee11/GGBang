/*
  # RLS Security Tests
  
  这个文件包含了测试 RLS 策略的 SQL 命令。
  在执行迁移后，可以使用这些测试来验证安全策略是否正确工作。
  
  注意：这些测试需要在 Supabase Dashboard 的 SQL Editor 中以不同用户身份执行
*/

-- ================================
-- 测试准备：创建测试数据
-- ================================

-- 创建测试用户的 profiles（需要先在 auth.users 中存在对应用户）
-- 注意：这些 UUID 是示例，实际测试时需要使用真实的用户 ID

/*
-- 示例测试数据（需要根据实际用户ID调整）
INSERT INTO profiles (user_id, display_name, city, hiv_status, prep_usage) VALUES
('11111111-1111-1111-1111-111111111111', 'User One', 'New York', 'negative', true),
('22222222-2222-2222-2222-222222222222', 'User Two', 'Los Angeles', 'positive', false);

-- 创建测试活动
INSERT INTO events (title, date, time, location, organizer, category, user_id) VALUES
('Test Event 1', '2025-02-01', '20:00', 'Test Location', 'User One', 'Bar', '11111111-1111-1111-1111-111111111111'),
('Test Event 2', '2025-02-02', '21:00', 'Test Location 2', 'User Two', 'Club', '22222222-2222-2222-2222-222222222222');

-- 创建测试申请
INSERT INTO join_requests (event_id, requester_id, message) VALUES
(1, '22222222-2222-2222-2222-222222222222', 'I would like to join this event'),
(2, '11111111-1111-1111-1111-111111111111', 'Please let me join');
*/

-- ================================
-- 测试 1: PROFILES 策略测试
-- ================================

-- 1.1 测试公开读取（应该成功）
SELECT user_id, display_name, city FROM profiles;

-- 1.2 测试敏感信息查询（只应该返回当前用户的数据）
SELECT * FROM sensitive_profiles;

-- 1.3 测试更新别人的 profile（应该失败）
-- 注意：需要以非所有者身份执行
-- UPDATE profiles SET display_name = 'Hacked' WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- 1.4 测试插入假冒的 profile（应该失败）
-- INSERT INTO profiles (user_id, display_name) VALUES ('33333333-3333-3333-3333-333333333333', 'Fake User');

-- ================================
-- 测试 2: JOIN_REQUESTS 策略测试
-- ================================

-- 2.1 查看自己的申请（应该只看到自己的）
SELECT * FROM join_requests WHERE requester_id = auth.uid();

-- 2.2 查看作为主办方的申请（应该看到自己活动的所有申请）
SELECT jr.*, e.title 
FROM join_requests jr
JOIN events e ON jr.event_id = e.id
WHERE e.user_id = auth.uid();

-- 2.3 尝试更新别人活动的申请状态（应该失败）
-- 注意：需要以非主办方身份执行
-- UPDATE join_requests SET status = 'approved' WHERE event_id = 1;

-- 2.4 尝试创建别人的申请（应该失败）
-- INSERT INTO join_requests (event_id, requester_id, message) 
-- VALUES (1, '99999999-9999-9999-9999-999999999999', 'Fake request');

-- ================================
-- 测试 3: EVENTS 策略测试
-- ================================

-- 3.1 查看所有活动（应该成功）
SELECT id, title, location, place_hint FROM events;

-- 3.2 尝试更新别人的活动（应该失败）
-- 注意：需要以非主办方身份执行
-- UPDATE events SET place_exact_visible = true WHERE user_id != auth.uid();

-- 3.3 尝试删除别人的活动（应该失败）
-- DELETE FROM events WHERE user_id != auth.uid();

-- ================================
-- 测试 4: EVENT_ATTENDEES 策略测试
-- ================================

-- 4.1 查看参与者（应该只看到自己参与的或自己主办的活动）
SELECT ea.*, e.title 
FROM event_attendees ea
JOIN events e ON ea.event_id = e.id;

-- 4.2 尝试插入参与者记录（应该被限制，建议通过服务端函数）
-- INSERT INTO event_attendees (event_id, user_id) VALUES (1, auth.uid());

-- ================================
-- 测试 5: 权限函数测试
-- ================================

-- 5.1 测试是否为活动主办方
SELECT is_event_host(1) as is_host_of_event_1;

-- 5.2 测试是否可以查看敏感资料
SELECT can_view_sensitive_profile('11111111-1111-1111-1111-111111111111') as can_view_user1_sensitive;

-- ================================
-- 测试 6: 安全视图测试
-- ================================

-- 6.1 查询公开资料视图（应该不包含敏感字段）
SELECT * FROM public_profiles;

-- 6.2 查询敏感资料视图（应该只返回当前用户的）
SELECT * FROM sensitive_profiles;

-- ================================
-- 测试 7: 越权操作测试
-- ================================

-- 这些操作都应该失败并返回权限错误

-- 7.1 尝试以匿名用户身份插入数据
-- SET ROLE anon;
-- INSERT INTO profiles (user_id, display_name) VALUES ('00000000-0000-0000-0000-000000000000', 'Anonymous');

-- 7.2 尝试直接修改 RLS 策略（应该需要管理员权限）
-- DROP POLICY "profiles_self_write" ON profiles;

-- ================================
-- 预期结果说明
-- ================================

/*
预期测试结果：

1. PROFILES:
   - ✅ 所有用户可以读取 public_profiles 视图
   - ✅ 用户只能修改自己的 profile
   - ❌ 用户不能创建别人的 profile
   - ✅ sensitive_profiles 只显示当前用户的敏感信息

2. JOIN_REQUESTS:
   - ✅ 用户只能看到自己的申请
   - ✅ 主办方可以看到自己活动的所有申请
   - ✅ 主办方可以更新申请状态
   - ❌ 非主办方不能更新申请状态
   - ❌ 用户不能创建别人的申请

3. EVENTS:
   - ✅ 所有人可以查看活动公开信息
   - ✅ 主办方可以修改自己的活动
   - ❌ 非主办方不能修改别人的活动

4. EVENT_ATTENDEES:
   - ✅ 用户可以看到自己参与的活动参与者
   - ✅ 主办方可以看到自己活动的参与者
   - ⚠️  插入/删除建议通过服务端函数处理

5. 安全函数和视图正常工作

如果任何测试返回意外结果，说明 RLS 策略需要调整。
*/
