# Edge Functions API 指南

## 🚀 概述

本指南详细说明了4个Supabase Edge Functions的API端点，包含并发容量保护、权限控制和错误处理。

## 📋 API 端点

### 1. join-request (POST)
**端点**: `https://your-project.supabase.co/functions/v1/join-request`

**功能**: 创建加入活动申请

**权限**: 仅认证用户

**请求体**:
```typescript
{
  eventId: number,
  message?: string
}
```

**响应**:
```typescript
// 成功 (201)
{
  success: true,
  message: "Join request submitted successfully",
  request: {
    id: number,
    eventId: number,
    eventTitle: string,
    status: "pending",
    message: string | null,
    createdAt: string
  },
  event: {
    title: string,
    date: string,
    time: string,
    capacity: number,
    currentAttendees: number,
    availableSpots: number
  }
}

// 错误示例
{
  error: string,
  code: "UNAUTHORIZED" | "INVALID_EVENT_ID" | "EVENT_NOT_FOUND" | 
         "OWN_EVENT" | "EVENT_PAST" | "DUPLICATE_PENDING" | 
         "DUPLICATE_REQUEST" | "ALREADY_ATTENDING" | "EVENT_FULL"
}
```

**验证规则**:
- ✅ 事件存在且在未来
- ✅ 拒绝重复 pending 申请
- ✅ 拒绝申请自己的活动
- ✅ 检查用户未已参与
- ✅ 检查活动未满员

### 2. join-approve (POST)
**端点**: `https://your-project.supabase.co/functions/v1/join-approve`

**功能**: 批准加入申请

**权限**: 仅主办方

**请求体**:
```typescript
{
  requestId: number
}
```

**响应**:
```typescript
// 成功 (200)
{
  success: true,
  message: "Join request approved successfully",
  eventTitle: string,
  newAttendeeCount: number,
  capacity: number,
  requester: {
    id: string
  }
}

// 错误示例
{
  error: string,
  code: "UNAUTHORIZED" | "INVALID_REQUEST_ID" | "REQUEST_NOT_FOUND" | 
         "FORBIDDEN" | "REQUEST_NOT_PENDING" | "CAPACITY_EXCEEDED" | 
         "ALREADY_ATTENDING"
}
```

**并发安全**:
- ✅ 使用事务和行级锁定
- ✅ 原子性检查容量并添加参与者
- ✅ 防止超卖问题

### 3. join-reject (POST)
**端点**: `https://your-project.supabase.co/functions/v1/join-reject`

**功能**: 拒绝加入申请

**权限**: 仅主办方

**请求体**:
```typescript
{
  requestId: number,
  note?: string
}
```

**响应**:
```typescript
// 成功 (200)
{
  success: true,
  message: "Join request rejected successfully",
  eventTitle: string,
  requester: {
    id: string
  },
  rejectionNote: string | null,
  rejectedAt: string,
  isPastEvent: boolean
}
```

### 4. event-location-unlock (POST)
**端点**: `https://your-project.supabase.co/functions/v1/event-location-unlock`

**功能**: 解锁活动精确位置

**权限**: 主办方或计划任务调用

**请求体**:
```typescript
{
  eventId: number
}
```

**响应**:
```typescript
// 成功 (200)
{
  success: true,
  message: "Location unlocked successfully for approved members",
  eventTitle: string,
  eventId: number,
  unlockedAt: string,
  unlockReason: "manual_host_unlock" | "scheduled_auto_unlock",
  approvedAttendees: number,
  minutesBeforeEvent: number,
  eventDateTime: string,
  exactLocation: string
}
```

## 🔒 安全特性

### 权限控制
- **join-request**: 仅认证用户，不能申请自己的活动
- **join-approve/reject**: 仅活动主办方
- **event-location-unlock**: 主办方或服务角色

### 并发保护
- **行级锁定**: 使用 `FOR UPDATE` 锁定关键记录
- **事务安全**: 所有关键操作在事务中执行
- **容量检查**: 原子性检查并更新参与者数量

### 数据验证
- **事件时间**: 验证事件在未来
- **重复检查**: 防止重复申请和参与
- **状态验证**: 只能操作pending状态的申请

## 🛠️ 部署和测试

### 1. 部署Edge Functions

```bash
# 部署所有函数
supabase functions deploy

# 或单独部署
supabase functions deploy join-request
supabase functions deploy join-approve
supabase functions deploy join-reject
supabase functions deploy event-location-unlock
```

### 2. 设置环境变量

确保Supabase项目中设置了以下环境变量：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. 应用数据库迁移

```bash
# 应用边缘函数支持迁移
supabase db push
```

## 📝 使用示例

### JavaScript/TypeScript 客户端

```typescript
// 1. 创建加入申请
const requestJoin = async (eventId: number, message?: string) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/join-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId, message })
  })
  return response.json()
}

// 2. 批准申请（仅主办方）
const approveRequest = async (requestId: number) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/join-approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId })
  })
  return response.json()
}

// 3. 拒绝申请（仅主办方）
const rejectRequest = async (requestId: number, note?: string) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/join-reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId, note })
  })
  return response.json()
}

// 4. 解锁位置（仅主办方）
const unlockLocation = async (eventId: number) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/event-location-unlock`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId })
  })
  return response.json()
}
```

### React Hook 示例

```typescript
// hooks/useJoinRequest.ts
import { useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'

export const useJoinRequest = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const user = useUser()

  const requestJoin = async (eventId: number, message?: string) => {
    if (!user) throw new Error('User not authenticated')
    
    setLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/join-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, message })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Request failed')
      }
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { requestJoin, loading, error }
}
```

## 🧪 测试用例

### 基础功能测试

```typescript
// 测试 1: 成功创建申请
test('should create join request successfully', async () => {
  const result = await requestJoin(1, 'I would like to join!')
  expect(result.success).toBe(true)
  expect(result.request.status).toBe('pending')
})

// 测试 2: 防止重复申请
test('should prevent duplicate requests', async () => {
  await requestJoin(1)
  const result = await requestJoin(1)
  expect(result.code).toBe('DUPLICATE_PENDING')
})

// 测试 3: 并发批准测试
test('should handle concurrent approvals safely', async () => {
  // 创建接近满员的事件
  const promises = Array(10).fill(null).map(() => 
    approveRequest(requestId)
  )
  
  const results = await Promise.allSettled(promises)
  const successful = results.filter(r => r.status === 'fulfilled').length
  expect(successful).toBeLessThanOrEqual(eventCapacity)
})
```

### 权限测试

```typescript
// 测试 4: 权限控制
test('should reject unauthorized approve attempts', async () => {
  // 非主办方尝试批准
  const result = await approveRequest(requestId)
  expect(result.code).toBe('FORBIDDEN')
})

// 测试 5: 自己活动申请拒绝
test('should reject own event join requests', async () => {
  const result = await requestJoin(ownEventId)
  expect(result.code).toBe('OWN_EVENT')
})
```

## 📊 监控和统计

### 查看事件统计
```sql
-- 获取事件详细统计
SELECT * FROM get_event_stats(1);

-- 查看容量状态
SELECT * FROM event_capacity_status WHERE id = 1;
```

### 批量操作
```sql
-- 批量解锁即将开始的活动位置
SELECT unlock_event_locations_batch(60); -- 60分钟前解锁

-- 清理过期申请
SELECT cleanup_expired_requests();
```

## ⚡ 性能优化

1. **数据库索引**: 已为关键查询添加索引
2. **事务优化**: 最小化事务持续时间
3. **错误缓存**: 避免重复的无效请求
4. **批量操作**: 支持批量处理计划任务

## 🔧 故障排除

### 常见错误

1. **CAPACITY_EXCEEDED**: 活动已满员
   - 检查当前参与者数量
   - 考虑增加容量或开启等待列表

2. **FORBIDDEN**: 权限不足
   - 确认用户是活动主办方
   - 检查JWT token有效性

3. **DUPLICATE_PENDING**: 重复申请
   - 检查现有申请状态
   - 可选择取消现有申请

---

**所有API端点现在都具有企业级的并发安全保护和完整的错误处理！** 🚀✨
