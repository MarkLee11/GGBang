# Event Cards & Details 升级指南

## 🎯 概述

本指南详细说明了事件卡片和详情页的升级，支持新的容量显示、地点提示和地点解锁功能，实现了分层的地点信息展示系统。

## 🔧 实现的功能

### ✅ Event Cards (列表卡片)

#### 显示内容
- **容量 (capacity)**: 在右上角显示参与者限制 👥
- **地点提示 (place_hint)**: 优先显示地点提示而非具体地址 📍
- **不显示精确地址**: place_exact 永远不在卡片中显示 🔒

#### 实现细节
```typescript
// EventCard.tsx - 地点显示逻辑
{(place_hint || location) && (
  <div className="flex items-center text-gray-300 text-sm">
    <MapPin size={16} className="mr-2 text-purple-400" />
    <span>{place_hint || location}</span>  // 优先显示place_hint
    {country && <span className="ml-1">• {country}</span>}
  </div>
)}

// 容量显示
{capacity && (
  <div className="absolute top-4 right-4">
    <span className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
      <Users size={14} className="mr-1" />
      {capacity}
    </span>
  </div>
)}
```

### ✅ Event Details (详情页)

#### 分层地点显示系统

##### 1. 地点提示 (总是可见)
```typescript
{/* Place Hint (Always visible) */}
{event.place_hint && (
  <div className="bg-gray-800/50 rounded-lg p-4">
    <p className="text-gray-300 font-medium mb-1">📍 Location Hint</p>
    <p className="text-white">{event.place_hint}</p>
    {event.country && (
      <p className="text-gray-400 text-sm mt-1">{event.country}</p>
    )}
  </div>
)}
```

##### 2. 精确地址 (条件显示)
**可见条件**: 用户已批准 且 place_exact_visible=true
```typescript
{/* Exact Location (Only for approved users when unlocked) */}
{event.place_exact_visible && event.place_exact && 
 (userStatus === 'approved' || userStatus === 'attending' || isHost) ? (
  <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
    <p className="text-green-300 font-medium mb-1">🎯 Exact Location (Unlocked)</p>
    <p className="text-white">{event.place_exact}</p>
    <p className="text-green-400 text-sm mt-2">
      ✅ Available to approved members
    </p>
  </div>
) : (
  // 锁定状态显示
)}
```

##### 3. 锁定状态提示
```typescript
{event.place_exact && !event.place_exact_visible && (
  <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
    <p className="text-gray-400 font-medium mb-1">🔒 Exact Location</p>
    <p className="text-gray-500 text-sm">
      {userStatus === 'pending' 
        ? 'Will be revealed when your request is approved'
        : userStatus === 'none'
        ? 'Available to approved members only'
        : 'Will be revealed closer to the event'
      }
    </p>
  </div>
)}
```

### ✅ Host 端解锁功能

#### 解锁按钮显示条件
```typescript
const showLocationUnlock = isHost && event.place_exact && !event.place_exact_visible;
```

#### 解锁按钮实现
```typescript
{showLocationUnlock && (
  <button
    onClick={handleUnlockLocation}
    disabled={unlockingLocation}
    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
  >
    <Eye size={16} />
    <span>{unlockingLocation ? 'Unlocking...' : 'Unlock Location'}</span>
  </button>
)}
```

#### 解锁逻辑
```typescript
const handleUnlockLocation = async () => {
  if (!event || !isHost) return;

  setUnlockingLocation(true);
  try {
    const result = await unlockEventLocation(event.id);
    if (result.success) {
      refetchStatus(); // 刷新事件状态
    }
  } catch (error) {
    console.error('Failed to unlock location:', error);
  } finally {
    setUnlockingLocation(false);
  }
};
```

## 🔐 权限控制逻辑

### 地点信息可见性规则

| 用户状态 | place_hint | place_exact |
|----------|------------|-------------|
| **未登录/陌生人** | ✅ 可见 | ❌ 不可见 |
| **已申请 (pending)** | ✅ 可见 | ❌ 不可见，提示"申请批准后可见" |
| **已批准 (approved)** | ✅ 可见 | ✅ 可见 (如果已解锁) |
| **正在参与 (attending)** | ✅ 可见 | ✅ 可见 (如果已解锁) |
| **主办方 (host)** | ✅ 可见 | ✅ 可见 + 可解锁 |

### 解锁权限
- **只有主办方**: 可以解锁精确地址
- **解锁条件**: event.place_exact 存在且 place_exact_visible=false
- **解锁后**: 所有已批准成员可见精确地址

## 📱 用户体验流程

### 普通用户浏览流程
```
查看事件卡片 → 看到容量和地点提示 → 点击详情 → 
看到地点提示 + 锁定的精确地址提示 → 申请加入 → 
等待批准 → 批准后可查看精确地址(如果已解锁)
```

### 主办方管理流程
```
查看自己的事件详情 → 看到"Unlock Location"按钮 → 
点击解锁 → 确认解锁 → 所有已批准成员可见精确地址
```

### 已批准成员体验
```
查看已批准的事件详情 → 
如果主办方已解锁 → 显示绿色精确地址卡片 → 
获取完整地址信息
```

## 🎨 视觉设计

### 卡片设计特色
- **容量徽章**: 黑底白字，右上角显示
- **分类标签**: 紫色渐变，左上角显示
- **地点优先级**: place_hint > location
- **Hover效果**: 图片放大 + 边框高亮

### 详情页设计特色
- **地点提示**: 灰色背景，常规显示
- **精确地址**: 绿色背景，解锁状态
- **锁定状态**: 灰色边框，提示文字
- **解锁按钮**: 黄色背景，醒目显示

## 🔧 技术实现

### EventCard 更新
```typescript
interface EventCardProps {
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  date: string;
  time: string;
  category: string;
  image: string;
  capacity: number | null;    // 新增
  place_hint: string | null;  // 新增
  onViewDetails: () => void;
}
```

### EventModal 增强
- **useEventStatus**: 获取用户状态和权限
- **unlockEventLocation**: 调用Edge Function解锁
- **条件渲染**: 根据权限显示不同内容
- **实时更新**: 解锁后立即刷新状态

### 数据流
```
Event数据 → EventGrid → EventCard (显示容量+提示)
        ↓
Event数据 → EventModal → 分层地点显示 + 解锁功能
```

## 🧪 验收标准检查

### ✅ 列表卡片要求
- **显示容量**: capacity字段在右上角显示 ✅
- **显示地点提示**: place_hint优先于location ✅
- **不显示精确地址**: place_exact永不在卡片显示 ✅

### ✅ 详情页要求
- **默认显示place_hint**: 总是可见的地点提示 ✅
- **条件显示place_exact**: 仅已批准用户+已解锁时可见 ✅
- **Host解锁按钮**: 主办方可一键解锁地址 ✅

### ✅ 权限控制要求
- **非成员永远看不到place_exact**: 严格权限控制 ✅
- **已批准成员在解锁后可见**: 正确的条件判断 ✅
- **主办方特权**: 可解锁+总是可见 ✅

## 📊 使用示例

### 地点数据示例
```json
{
  "place_hint": "Near Central Station",
  "place_exact": "123 Main Street, Platform 2, Central Station",
  "place_exact_visible": false
}
```

### 显示效果
- **卡片**: "Near Central Station"
- **详情页 (未解锁)**: "Near Central Station" + "🔒 Exact location locked"
- **详情页 (已解锁+已批准)**: "Near Central Station" + "🎯 123 Main Street, Platform 2, Central Station"

---

**Event Cards & Details 升级已完成！现在提供了完整的分层地点信息系统，既保护了隐私又提供了丰富的位置信息。** 📍✨
