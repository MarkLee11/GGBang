# Frontend Types & API Hooks 集成指南

## 🎯 概述

本指南详细说明了前端类型系统、API hooks 和 UI 组件的实现，提供了完整的"带留言申请"功能和主办方管理界面。

## 📁 新增文件

### 1. Hooks
- **`src/hooks/useJoinRequest.ts`** - 申请加入、批准、拒绝的hooks
- **`src/hooks/useHostRequests.ts`** - 主办方管理申请的hook
- **`src/hooks/useEventStatus.ts`** - 活动状态和容量信息的hook

### 2. 组件
- **`src/components/JoinRequestModal.tsx`** - 申请加入的Modal组件
- **`src/components/HostRequestsPanel.tsx`** - 主办方申请管理面板

### 3. 更新的组件
- **`src/components/EventModal.tsx`** - 完全重写，集成新功能
- **`src/lib/supabase.ts`** - 增强类型定义和Edge Function集成

## 🔧 核心功能

### ✅ 统一 UUID 外键
```typescript
// 所有用户外键现在使用 string | null (UUID)
export type Event = {
  user_id: string | null  // UUID referencing auth.users(id)
  // ... 其他字段
}

export type EventAttendee = {
  user_id: string  // UUID referencing auth.users(id)
  // ... 其他字段
}

export type JoinRequest = {
  requester_id: string  // UUID referencing auth.users(id)
  // ... 其他字段
}
```

### ✅ 前端API函数
```typescript
// 直接调用Edge Functions的API
export async function requestJoinEvent(eventId: number, message: string)
export async function approveJoinRequest(requestId: number)
export async function rejectJoinRequest(requestId: number, note?: string)
export async function unlockEventLocation(eventId: number)
```

### ✅ React Hooks

#### useRequestJoin
```typescript
const { requestJoin, loading, error, clearError } = useRequestJoin()

// 使用
const result = await requestJoin(eventId, "I'd love to join this event!")
```

#### useHostRequests  
```typescript
const { 
  requests, 
  loading, 
  stats, 
  pendingRequests, 
  approvedRequests, 
  rejectedRequests,
  refetch 
} = useHostRequests(eventId)
```

#### useEventStatus
```typescript
const { 
  eventInfo, 
  isHost, 
  userStatus, 
  canJoin, 
  isFull 
} = useEventStatus(eventId, userId)
```

### ✅ UI 组件

#### JoinRequestModal 特性
- **500字留言限制** ✅
- **实时字符计数** ✅
- **非登录用户引导** ✅
- **错误状态显示** ✅
- **成功状态动画** ✅

#### HostRequestsPanel 特性
- **实时申请统计** ✅
- **分标签页管理** (Pending/Approved/Rejected) ✅
- **申请人资料卡片** ✅
- **批准/拒绝操作** ✅
- **拒绝原因备注** ✅

#### EventModal 增强
- **动态"Request to Join"按钮** ✅
- **容量状态可视化** ✅
- **用户状态提示** ✅
- **主办方申请管理** ✅
- **位置解锁功能** ✅

## 🎨 用户体验流程

### 1. 非登录用户
```
点击 "Request to Join" → 提示登录 → 跳转登录页面
```

### 2. 已登录用户申请流程
```
点击 "Request to Join" → 打开Modal → 填写留言(可选) → 提交申请 → 显示成功状态
```

### 3. 重复申请错误提示
```
已有pending申请 → 显示"DUPLICATE_PENDING"错误
已有其他状态申请 → 显示具体状态和"DUPLICATE_REQUEST"错误
```

### 4. 主办方管理流程
```
查看申请 → 审批/拒绝 → 实时更新统计 → 通知申请人
```

## 💻 使用示例

### 基础使用
```typescript
// 在EventCard或EventModal中
import { useRequestJoin } from '../hooks/useJoinRequest'

const EventCard = ({ event, user }) => {
  const { requestJoin, loading, error } = useRequestJoin()
  
  const handleJoinRequest = async () => {
    const result = await requestJoin(event.id, message)
    if (result.success) {
      // 处理成功状态
    }
  }
  
  return (
    <button onClick={handleJoinRequest} disabled={loading}>
      {loading ? 'Sending...' : 'Request to Join'}
    </button>
  )
}
```

### 主办方管理
```typescript
// 在EventModal中
import HostRequestsPanel from './HostRequestsPanel'

const EventModal = ({ event, user }) => {
  const isHost = event.user_id === user?.id
  
  return (
    <div>
      {isHost && (
        <HostRequestsPanel eventId={event.id} isHost={isHost} />
      )}
    </div>
  )
}
```

### 事件状态监控
```typescript
import { useEventStatus } from '../hooks/useEventStatus'

const EventDetails = ({ eventId, user }) => {
  const { eventInfo, isHost, userStatus, canJoin } = useEventStatus(eventId, user?.id)
  
  return (
    <div>
      <p>容量: {eventInfo?.currentAttendees}/{eventInfo?.capacity}</p>
      <p>状态: {userStatus}</p>
      {canJoin && <button>Request to Join</button>}
      {isHost && <button>Manage Requests</button>}
    </div>
  )
}
```

## 🔄 实时更新

### Supabase实时订阅
```typescript
// useHostRequests 中的实时更新
useEffect(() => {
  const subscription = supabase
    .channel(`join_requests_${eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public', 
      table: 'join_requests',
      filter: `event_id=eq.${eventId}`
    }, (payload) => {
      fetchRequests() // 重新获取数据
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [eventId])
```

## 🎯 验收标准检查

### ✅ 非登录点击要求先登录
- 非登录用户点击"Request to Join" → 调用 `onJoinClick()` 跳转登录

### ✅ 登录后可提交pending
- 已登录用户 → 显示留言框 → 提交申请 → 状态变为pending

### ✅ 重复提交明确错误提示
- `DUPLICATE_PENDING` → "You already have a pending request"
- `DUPLICATE_REQUEST` → "You already have a {status} request"
- `ALREADY_ATTENDING` → "You are already attending this event"

### ✅ 500字留言上限
- 留言框限制500字符
- 实时显示剩余字符数
- 接近上限时警告颜色

### ✅ 主办方申请管理
- 只有主办方能看到申请管理界面
- 实时统计显示
- 批准/拒绝功能完整

## 🚀 部署注意事项

1. **环境变量确保正确**
   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Edge Functions已部署**
   ```bash
   supabase functions deploy join-request
   supabase functions deploy join-approve
   supabase functions deploy join-reject
   supabase functions deploy event-location-unlock
   ```

3. **数据库迁移已应用**
   ```bash
   supabase db push
   ```

4. **RLS策略已启用**
   - 确保所有表的RLS策略正确配置

## 🔍 调试技巧

### 检查API调用
```typescript
// 在浏览器控制台中
console.log('Environment:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})
```

### 检查认证状态
```typescript
// 在组件中
useEffect(() => {
  console.log('User status:', { user, userStatus, isHost })
}, [user, userStatus, isHost])
```

### 检查Edge Function调用
```typescript
// callEdgeFunction 会自动记录错误
// 查看浏览器网络标签页确认API调用
```

---

**前端类型系统和API集成现已完成！用户可以通过美观的界面进行申请，主办方可以高效管理申请，所有操作都有清晰的状态反馈。** 🎉✨
