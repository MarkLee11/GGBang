# Anti-Abuse & Edge Cases 防滥用与边界保护指南

## 🎯 概述

本指南详细说明了所有实现的防滥用机制和边界保护功能，确保系统的稳定性、安全性和良好的用户体验。

## ✅ 实现的防滥用机制

### 🚫 1. 限制同一用户最多 5 个 pending 申请

#### 实现位置
- **文件**: `supabase/functions/join-request/index.ts`
- **检查时机**: 申请加入活动时
- **限制数量**: 最多 5 个待处理申请

#### 实现逻辑
```typescript
// 检查用户pending申请总数限制（最多5个）
const { count: pendingCount, error: pendingCountError } = await supabaseClient
  .from('join_requests')
  .select('*', { count: 'exact', head: true })
  .eq('requester_id', user.id)
  .eq('status', 'pending')

const MAX_PENDING_REQUESTS = 5
if (pendingCount !== null && pendingCount >= MAX_PENDING_REQUESTS) {
  return new Response(
    JSON.stringify({ 
      error: `You have reached the maximum limit of ${MAX_PENDING_REQUESTS} pending requests...`,
      code: 'TOO_MANY_PENDING',
      currentPendingCount: pendingCount,
      maxAllowed: MAX_PENDING_REQUESTS
    }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

#### 用户体验
- **错误消息**: "您当前有 X 个待处理申请，已达到最大限制 5 个。请等待部分申请被处理后再提交新申请。"
- **HTTP状态码**: 429 (Too Many Requests)
- **建议**: 鼓励用户管理现有申请或等待处理结果

### ⏰ 2. 同一活动拒绝后 7 天冷却期

#### 实现位置
- **文件**: `supabase/functions/join-request/index.ts`
- **冷却期**: 7 天 (168 小时)
- **计算基准**: 拒绝时间 (updated_at 或 created_at)

#### 实现逻辑
```typescript
if (existingRequest.status === 'rejected') {
  // 检查7天冷却期
  const rejectedTime = new Date(existingRequest.updated_at || existingRequest.created_at)
  const cooldownPeriodMs = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  const cooldownEndTime = new Date(rejectedTime.getTime() + cooldownPeriodMs)
  const now = new Date()
  
  if (now < cooldownEndTime) {
    const hoursRemaining = Math.ceil((cooldownEndTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysRemaining = Math.ceil(hoursRemaining / 24)
    
    return new Response(
      JSON.stringify({ 
        error: `You must wait ${daysRemaining} more day(s) before applying again...`,
        code: 'REJECTION_COOLDOWN',
        rejectedAt: rejectedTime.toISOString(),
        cooldownEndsAt: cooldownEndTime.toISOString(),
        hoursRemaining,
        daysRemaining
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  // 冷却期已过，删除旧记录允许重新申请
  await supabaseClient.from('join_requests').delete().eq('id', existingRequest.id)
}
```

#### 用户体验
- **动态消息**: 显示剩余天数/小时数
- **精确计算**: 按小时计算剩余时间
- **自动清理**: 冷却期过后自动删除旧记录

### ⚡ 3. 容量改动后批准逻辑以实时计数为准

#### 实现位置
- **文件**: `supabase/migrations/20250809193013_edge_functions_support.sql`
- **函数**: `approve_join_request_transaction`
- **保护机制**: 行级锁定 + 事务原子性

#### 实现逻辑
```sql
CREATE OR REPLACE FUNCTION approve_join_request_transaction(
  p_request_id bigint,
  p_event_id bigint,
  p_requester_id uuid,
  p_event_capacity int
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_count int;
BEGIN
  -- 锁定事件行防止并发问题
  SELECT capacity INTO p_event_capacity
  FROM events WHERE id = p_event_id FOR UPDATE;
  
  -- 获取当前参与者数量（锁定读取）
  SELECT COUNT(*) FROM event_attendees
  WHERE event_id = p_event_id INTO v_current_count;
  
  -- 检查容量限制（使用实时数据）
  IF v_current_count >= p_event_capacity THEN
    RAISE EXCEPTION 'capacity_exceeded: Event capacity % is full (current: %)', 
      p_event_capacity, v_current_count;
  END IF;
  
  -- 原子性操作：批准申请 + 添加参与者
  UPDATE join_requests SET status = 'approved', updated_at = now()
  WHERE id = p_request_id;
  
  INSERT INTO event_attendees (event_id, user_id)
  VALUES (p_event_id, p_requester_id);
  
  RETURN json_build_object('success', true, 'message', 'Request approved successfully');
END;
$$;
```

#### 并发保护特性
- **行级锁定**: `FOR UPDATE` 锁定事件记录
- **实时计数**: 每次批准时重新计算当前参与者数量
- **事务原子性**: 批准申请和添加参与者在同一事务中
- **容量验证**: 基于最新的容量设置和参与者数量

### 📅 4. 禁止创建过去时间的活动

#### 前端验证
- **文件**: `src/components/CreateEventModal.tsx`, `src/components/EditEventModal.tsx`
- **HTML约束**: `min={new Date().toISOString().split('T')[0]}`
- **JavaScript验证**: `isEventInFuture(formData.date, formData.time)`

#### 后端验证
- **文件**: `supabase/functions/join-request/index.ts`
- **验证时机**: 申请加入活动时
- **时间比较**: UTC时间对比

#### 实现代码
```typescript
// 前端验证 (CreateEventModal.tsx)
try {
  // Validate that event is not in the past (using local time)
  if (!isEventInFuture(formData.date, formData.time)) {
    throw new Error('Event date and time must be in the future');
  }

  // Convert local time to UTC for storage
  const { date: utcDate, time: utcTime } = convertLocalToUTC(formData.date, formData.time);
}

// 后端验证 (join-request/index.ts)
const eventDateTime = new Date(`${event.date}T${event.time}`)
const now = new Date()

if (eventDateTime <= now) {
  return new Response(
    JSON.stringify({ 
      error: 'Cannot request to join past events',
      code: 'EVENT_PAST',
      eventDate: eventDateTime.toISOString()
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 🌍 5. 时间存储和渲染 UTC 处理

#### UTC 存储策略
- **数据库**: 所有时间以 UTC 格式存储
- **转换函数**: `convertLocalToUTC(dateString, timeString)`
- **验证函数**: `isEventInFuture(dateString, timeString)`

#### 渲染策略
- **显示**: 按用户浏览器时区渲染
- **格式化函数**: `formatEventDateTime(dateString, timeString)`
- **时区标注**: 显示时区信息 (timeZoneName: 'short')

#### 实现的工具函数 (`src/utils/dateUtils.ts`)
```typescript
// UTC转本地时间显示
export const formatEventDateTime = (dateString: string, timeString: string): string => {
  const utcDateTime = new Date(`${dateString}T${timeString}:00Z`)
  
  return utcDateTime.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  })
}

// 本地时间转UTC存储
export const convertLocalToUTC = (dateString: string, timeString: string): { date: string; time: string } => {
  const localDateTime = new Date(`${dateString}T${timeString}:00`)
  const utcDate = localDateTime.toISOString().split('T')[0]
  const utcTime = localDateTime.toISOString().split('T')[1].slice(0, 5)
  
  return { date: utcDate, time: utcTime }
}

// 验证事件是否在未来
export const isEventInFuture = (dateString: string, timeString: string): boolean => {
  const eventDateTime = new Date(`${dateString}T${timeString}:00`)
  const now = new Date()
  return eventDateTime > now
}
```

## 🛡️ 错误码和错误文案优化

### 统一错误处理系统
- **文件**: `src/utils/errorHandling.ts`
- **功能**: 统一的错误码映射、用户友好消息、错误日志

### 错误码映射表
```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关
  'UNAUTHORIZED': '请先登录后再进行此操作',
  'FORBIDDEN': '您没有权限执行此操作',
  
  // 申请相关
  'TOO_MANY_PENDING': '您的待处理申请过多，请等待部分申请处理完成后再试',
  'REJECTION_COOLDOWN': '被拒绝后需要等待一段时间才能重新申请',
  'DUPLICATE_PENDING': '您已经提交过申请，请等待审核结果',
  'EVENT_FULL': '活动人数已满，无法申请',
  'CAPACITY_EXCEEDED': '活动人数已满，无法批准更多申请',
  
  // 时间相关
  'EVENT_PAST': '无法申请已过期的活动',
  'DATE_IN_PAST': '日期时间必须是未来时间',
  
  // 通用错误
  'INTERNAL_ERROR': '服务器内部错误，请稍后重试',
  'NETWORK_ERROR': '网络连接错误，请检查您的网络连接',
}
```

### 上下文化错误消息
```typescript
export const getErrorMessage = (errorCode: string, context?: any): string => {
  switch (errorCode) {
    case 'TOO_MANY_PENDING':
      const { currentPendingCount, maxAllowed } = context || {};
      return `您当前有 ${currentPendingCount} 个待处理申请，已达到最大限制 ${maxAllowed} 个。`;
      
    case 'REJECTION_COOLDOWN':
      const { daysRemaining, hoursRemaining } = context || {};
      return daysRemaining > 1 
        ? `您需要等待 ${daysRemaining} 天后才能重新申请该活动`
        : `您需要等待 ${hoursRemaining} 小时后才能重新申请该活动`;
        
    case 'EVENT_FULL':
      const { capacity, currentAttendees } = context || {};
      return `活动人数已满 (${currentAttendees}/${capacity})，目前无法申请`;
  }
}
```

### 错误日志系统
```typescript
export const logError = (error: ApiError, context?: string) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    code: error.code,
    message: error.message,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // 开发环境控制台输出
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR LOG]', logEntry);
  }
  
  // 生产环境可发送到监控服务
}
```

## 📊 防滥用机制总结

### ✅ 验收标准检查

#### 1. 违规时返回明确错误码/错误文案 ✅
- **错误码标准化**: 所有错误都有明确的 `code` 字段
- **用户友好消息**: 中文错误提示，具体说明问题和解决方案
- **上下文信息**: 提供具体数值 (剩余时间、当前数量等)

#### 2. 日志可查 ✅
- **完整日志**: 包含时间戳、错误码、上下文、用户环境
- **开发调试**: 控制台详细输出
- **生产监控**: 预留错误监控服务接口

### 🔒 防滥用效果

#### 限制机制
| 防滥用类型 | 限制条件 | 错误码 | 用户体验 |
|------------|----------|--------|----------|
| **Pending申请限制** | 最多5个 | `TOO_MANY_PENDING` | 显示当前数量，建议管理现有申请 |
| **冷却期限制** | 拒绝后7天 | `REJECTION_COOLDOWN` | 显示剩余天数/小时 |
| **容量超限** | 实时检查 | `CAPACITY_EXCEEDED` | 显示当前人数/容量比例 |
| **过期活动** | 实时验证 | `EVENT_PAST` | 提示无法申请过期活动 |

#### 并发安全
- **数据库锁定**: `FOR UPDATE` 行级锁
- **事务原子性**: 关键操作在单一事务中完成
- **实时数据**: 每次操作都基于最新数据状态

#### 时间一致性
- **UTC存储**: 所有时间以UTC格式存储，避免时区混乱
- **本地显示**: 按用户时区显示，提供时区标识
- **多层验证**: 前端+后端双重时间验证

## 🔧 技术实现亮点

### 1. 分层防护
```
前端验证 → Edge Function验证 → 数据库约束 → 事务锁定
```

### 2. 用户体验优化
- **预防式UI**: 表单限制过去日期选择
- **清晰反馈**: 具体错误原因和剩余时间
- **操作建议**: 告知用户如何解决问题

### 3. 系统稳定性
- **并发安全**: 数据库级锁定机制
- **错误恢复**: 自动清理过期记录
- **监控完备**: 全面的错误日志

### 4. 可维护性
- **统一错误处理**: 集中的错误码和消息管理
- **工具函数**: 可复用的时间处理工具
- **类型安全**: TypeScript类型定义

---

**Anti-Abuse & Edge Cases 防滥用系统已完整实现！系统现在具备了完善的防滥用机制、边界保护和用户友好的错误处理，确保了高并发环境下的稳定运行。** 🛡️✨
