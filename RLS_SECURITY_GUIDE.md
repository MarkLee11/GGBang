# RLS Security Guide - 行级安全策略指南

## 🔐 概述

这份指南详细说明了如何实现和测试数据库的行级安全策略 (Row Level Security, RLS)，确保"谁能创建/查看/审批申请"和"资料敏感字段谁能看"完全在数据库层面控制，不依赖前端隐藏。

## 📁 相关文件

1. **`supabase/migrations/20250809192609_rls_policies.sql`** - RLS策略迁移文件
2. **`supabase/tests/rls_security_tests.sql`** - 安全测试用例
3. **`src/lib/supabase.ts`** - 更新的类型定义和安全查询函数

## 🎯 安全目标

### ✅ 已实现的安全策略

#### 1. PROFILES 表安全
- **写权限**：只有本人可以创建和更新自己的资料
- **读权限**：所有人可以查看公开字段，敏感字段需要特殊权限
- **敏感字段**：`hiv_status`, `prep_usage`, `weight_kg`, `height_cm`

#### 2. JOIN_REQUESTS 表安全
- **创建**：只能创建自己的申请
- **查看**：申请人可以看自己的申请；主办方可以看自己活动的所有申请
- **更新**：只有活动主办方可以审批申请状态

#### 3. EVENTS 表安全
- **查看**：所有人可以查看活动公开信息
- **创建**：认证用户可以创建活动
- **更新**：只有主办方可以修改自己的活动（包括敏感字段如 `place_exact_visible`）
- **删除**：只有主办方可以删除自己的活动

#### 4. EVENT_ATTENDEES 表安全
- **查看**：用户可以看自己参与的活动和自己主办活动的参与者
- **操作**：建议插入/删除通过服务端函数处理，不开放直接操作

## 🔧 安全特性

### 安全视图
1. **`public_profiles`** - 自动过滤敏感字段的公开资料视图
2. **`sensitive_profiles`** - 只显示当前用户敏感信息的视图

### 安全函数
1. **`is_event_host(event_id)`** - 检查用户是否为活动主办方
2. **`can_view_sensitive_profile(target_user_id)`** - 检查是否可以查看敏感资料

### TypeScript 类型安全
```typescript
// 公开资料类型（不包含敏感信息）
export type PublicProfile = { ... }

// 敏感资料类型（仅本人可见）
export type SensitiveProfile = { ... }

// 完整资料类型
export type Profile = PublicProfile & SensitiveProfile
```

## 🚀 执行步骤

### 1. 应用RLS策略迁移

#### 方法A: 使用 Supabase CLI
```bash
supabase db push
```

#### 方法B: Dashboard 手动执行
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入 SQL Editor
3. 执行 `supabase/migrations/20250809192609_rls_policies.sql` 的内容

### 2. 验证策略实施

#### 基础验证
```sql
-- 检查 RLS 是否已启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'join_requests', 'events', 'event_attendees');

-- 应该显示所有表的 rowsecurity = true
```

#### 安全测试
使用 `supabase/tests/rls_security_tests.sql` 中的测试用例：

1. **Profile 安全测试**
   - ✅ 公开信息可读
   - ❌ 敏感信息仅本人可见
   - ❌ 不能修改他人资料

2. **Join Request 安全测试**
   - ✅ 只能看到自己的申请
   - ✅ 主办方可以看到自己活动的申请
   - ❌ 不能更新他人活动的申请状态

3. **Event 安全测试**
   - ✅ 所有人可以查看活动
   - ❌ 不能修改他人的活动

## 🧪 测试用例

### 测试 1: 权限越界测试
```sql
-- 尝试更新别人的申请状态（应该失败）
UPDATE join_requests 
SET status = 'approved' 
WHERE event_id = 1 AND requester_id != auth.uid();
-- 预期结果: 0 rows affected (权限被拒绝)
```

### 测试 2: 敏感信息保护测试
```sql
-- 查询敏感资料视图
SELECT * FROM sensitive_profiles;
-- 预期结果: 只返回当前用户的敏感信息
```

### 测试 3: 主办方权限测试
```sql
-- 作为主办方查看申请
SELECT * FROM join_requests 
WHERE event_id IN (
  SELECT id FROM events WHERE user_id = auth.uid()
);
-- 预期结果: 返回自己活动的所有申请
```

## 📱 前端集成

### 使用安全查询函数
```typescript
// ✅ 获取公开资料（安全）
const publicProfile = await getPublicProfile(userId);

// ✅ 获取当前用户敏感资料（安全）
const sensitiveProfile = await getSensitiveProfile();

// ✅ 创建加入申请（安全）
const result = await createJoinRequest(eventId, message);

// ✅ 主办方审批申请（安全）
const approved = await approveJoinRequest(requestId);
```

### 避免的不安全操作
```typescript
// ❌ 直接查询 profiles 表获取敏感信息
const unsafeQuery = supabase.from('profiles').select('hiv_status, prep_usage');

// ❌ 绕过业务逻辑直接更新申请状态
const unsafeUpdate = supabase.from('join_requests').update({status: 'approved'});
```

## 🛡️ 安全保证

### 数据库层面
- ✅ **RLS 策略强制执行** - 所有查询都会经过安全检查
- ✅ **敏感字段保护** - 通过视图和策略限制访问
- ✅ **权限最小化原则** - 用户只能访问必要的数据

### 应用层面
- ✅ **类型安全** - TypeScript 类型确保正确使用
- ✅ **安全查询函数** - 预定义的安全查询方法
- ✅ **错误处理** - 优雅处理权限错误

## ⚠️ 重要注意事项

1. **测试环境优先** - 先在测试环境验证所有策略
2. **备份数据** - 应用策略前备份重要数据
3. **监控日志** - 观察是否有意外的权限错误
4. **定期审核** - 定期检查策略是否按预期工作

## 🔍 故障排除

### 常见问题

#### 1. 权限错误
```
Error: new row violates row-level security policy
```
**解决方案**: 检查用户是否有正确的权限，确认 `auth.uid()` 返回正确的用户ID

#### 2. 查询返回空结果
**可能原因**: RLS 策略过严格，用户没有查看权限
**解决方案**: 检查策略逻辑，确认用户应该有访问权限

#### 3. 视图访问错误
**可能原因**: 视图的 RLS 设置不正确
**解决方案**: 确认视图使用了 `security_invoker = true`

## 📈 性能优化

1. **索引优化** - 迁移已包含必要的索引
2. **查询优化** - 使用预定义的安全函数避免重复的权限检查
3. **视图缓存** - 考虑为频繁查询的视图添加缓存

---

**完成后，你的应用将具有数据库级别的安全保护，确保用户数据的隐私和安全！** 🔐✨
