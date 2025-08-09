# Grindr风格资料系统完整指南

## 🎯 概述

本指南详细说明了Grindr风格的用户资料系统，实现了公开/敏感信息分层显示和双向可见性控制，确保用户隐私安全的同时提供丰富的用户信息展示。

## 📁 新增和修改的文件

### 1. 数据库迁移
- **`supabase/migrations/20250809194402_grindr_style_profiles.sql`** - 完整的数据库schema扩展

### 2. React组件
- **`src/components/EditProfileModal.tsx`** - 完整的编辑资料Modal
- **`src/components/ProfileCard.tsx`** - Grindr风格的用户资料卡片
- **`src/components/HostRequestsPanel.tsx`** - 更新为显示完整用户资料

### 3. 更新的文件
- **`src/lib/supabase.ts`** - 新增资料管理API和类型定义
- **`src/components/Navigation.tsx`** - 添加Edit Profile按钮
- **`src/App.tsx`** - 集成EditProfileModal

## 🔧 核心功能实现

### ✅ 数据库Schema扩展

#### 新增Profile字段
```sql
-- 基础信息
display_name text
bio text (500字符限制)
age integer (18-99)
city text
country text

-- 多图存储
profile_images text[] (最多6张)

-- 兴趣和偏好
interests text[]
preferences text[]

-- 身体信息
height_cm integer (100-250)
weight_kg integer (30-300)
body_type ENUM('slim', 'average', 'athletic', 'muscular', 'bear', 'chubby', 'stocky', 'other')
relationship_status ENUM('single', 'taken', 'married', 'open', 'complicated', 'not_specified')

-- 敏感信息
hiv_status ENUM('negative', 'positive', 'unknown', 'not_disclosed')
prep_usage ENUM('on_prep', 'not_on_prep', 'considering', 'not_disclosed')
social_links jsonb

-- 系统字段
is_verified boolean
last_seen timestamptz
```

#### 访问控制函数
```sql
-- 检查敏感信息访问权限
can_view_sensitive_profile(viewer_id, target_id, event_id)

-- 安全的资料查询函数
get_public_profile_info(target_user_id)
get_sensitive_profile_info(viewer_id, target_user_id, event_id)
get_full_profile_info(viewer_id, target_user_id, event_id)
```

### ✅ 多图上传功能

#### Supabase Storage集成
```typescript
// 上传图片
const result = await uploadProfileImage(file, userId)

// 删除图片
const result = await deleteProfileImage(imageUrl)

// 自动生成公共URL
const publicUrl = supabase.storage
  .from('profile-images')
  .getPublicUrl(fileName)
```

#### 特性
- **文件大小限制**: 自动处理
- **文件类型检查**: 仅允许图片格式
- **唯一文件名**: `userId/timestamp.ext`
- **公共访问**: 自动生成CDN链接

### ✅ 兴趣和偏好系统

#### 预定义分类
```sql
-- 兴趣分类
Sports & Fitness, Entertainment, Food & Drink,
Travel & Culture, Social & Lifestyle, Hobbies & Skills

-- 偏好选项  
Looking For, Event Types, Age Range, Distance
```

#### 动态标签选择
- **多选界面**: 分类展示，点击切换
- **视觉反馈**: 选中状态高亮显示
- **灵活存储**: 数组格式存储选择项

### ✅ 敏感信息访问控制

#### 访问权限规则
```typescript
// 1. 自己总是可以查看自己的敏感信息
if (viewer_id === target_id) return true

// 2. 主办方可以查看申请人的敏感信息
if (isEventHost && hasJoinRequest) return true

// 3. 同一活动的已批准成员可以互相查看敏感信息
if (bothApprovedInSameEvent) return true

// 4. 其他情况不可查看
return false
```

#### 前端显示控制
```typescript
// ProfileCard组件中的条件渲染
{canViewSensitive && (
  <div className="sensitive-info">
    {showSensitiveInfo && (
      <div>
        {profile.hiv_status && <p>HIV Status: ...</p>}
        {profile.prep_usage && <p>PrEP: ...</p>}
        {profile.social_links && <SocialLinks />}
      </div>
    )}
  </div>
)}

// 敏感信息提示
{!canViewSensitive && (
  <div className="tooltip">
    Sensitive info is visible to hosts reviewing your request 
    or approved members of the same event.
  </div>
)}
```

## 🎨 UI/UX 设计

### EditProfileModal 特性
- **分标签页设计**: Basic Info / Interests / Physical / Sensitive
- **多图上传**: 拖拽式上传，最多6张图片
- **实时预览**: 立即显示上传的图片
- **字符计数**: Bio文本区域500字限制
- **验证提示**: 表单验证和错误处理
- **响应式布局**: 适配桌面和移动设备

### ProfileCard 特性
- **图片轮播**: 支持多图切换，指示器显示
- **分层信息显示**: 公开信息始终可见
- **敏感信息控制**: 点击眼睛图标切换显示
- **标签云展示**: 兴趣和偏好以标签形式展示
- **状态指示**: 在线状态、验证徽章
- **社交链接**: 集成常用社交平台图标

### HostRequestsPanel 增强
- **Grid布局**: Profile Card + Request Details 并排显示
- **完整资料展示**: 主办方可查看申请人完整信息
- **敏感信息权限**: 自动根据权限显示/隐藏敏感内容
- **操作历史**: 显示申请和更新时间
- **状态指示**: 清晰的视觉状态反馈

## 🔐 隐私和安全

### 分层信息设计

#### 公开信息 (所有人可见)
```typescript
type PublicProfile = {
  display_name, bio, age, city, country,
  profile_images, interests, preferences,
  height_cm, weight_kg, body_type,
  relationship_status, is_verified, last_seen
}
```

#### 敏感信息 (权限控制)
```typescript
type SensitiveProfile = {
  hiv_status,      // HIV状态
  prep_usage,      // PrEP使用情况  
  social_links     // 社交媒体链接
}
```

### 权限控制场景

#### 1. 普通浏览
- **可见**: 公开信息
- **不可见**: 敏感信息
- **提示**: "敏感信息只有特定情况下可见"

#### 2. 主办方审核申请
- **可见**: 公开信息 + 敏感信息
- **用途**: 更好地了解申请人做出审核决定
- **界面**: HostRequestsPanel中完整显示

#### 3. 同活动已批准成员
- **可见**: 公开信息 + 敏感信息  
- **用途**: 促进活动内成员间的了解和交流
- **控制**: 仅限同一活动的已批准参与者

## 📱 使用流程

### 用户编辑资料
```
点击导航栏"Edit Profile" → 打开Modal → 选择标签页 → 
填写信息 → 上传图片 → 保存资料
```

### 主办方审核申请
```
查看Join Requests → 点击申请卡片 → 查看完整资料
(包括敏感信息) → 做出批准/拒绝决定
```

### 活动成员查看彼此资料
```
双方都是已批准成员 → 查看ProfileCard → 
点击眼睛图标 → 显示敏感信息
```

## 🚀 API使用示例

### 更新用户资料
```typescript
import { updateUserProfile } from '../lib/supabase'

const updateProfile = async () => {
  const result = await updateUserProfile({
    display_name: 'Alex',
    bio: 'Love music and art',
    age: 25,
    interests: ['Music', 'Art', 'Travel'],
    hiv_status: 'negative',
    prep_usage: 'on_prep'
  })
  
  if (result.success) {
    console.log('Profile updated!')
  }
}
```

### 获取用户资料（带权限控制）
```typescript
import { getFullProfileInfo } from '../lib/supabase'

const viewProfile = async (userId: string, eventId?: number) => {
  const result = await getFullProfileInfo(userId, eventId)
  
  if (result.success) {
    const profile = result.data
    console.log('Can view sensitive:', profile.can_view_sensitive)
    
    // 根据权限显示信息
    if (profile.can_view_sensitive) {
      console.log('HIV Status:', profile.hiv_status)
      console.log('Social Links:', profile.social_links)
    }
  }
}
```

### 上传资料图片
```typescript
import { uploadProfileImage } from '../lib/supabase'

const handleImageUpload = async (file: File, userId: string) => {
  const result = await uploadProfileImage(file, userId)
  
  if (result.success) {
    console.log('Image uploaded:', result.url)
    // 添加到profile_images数组
  }
}
```

## 🧪 验收标准检查

### ✅ 双向可见性控制
- **主办方审核时**: 可以查看申请人敏感信息 ✅
- **同活动已批准成员**: 可以互相查看敏感信息 ✅
- **普通用户**: 无法查看他人敏感信息 ✅

### ✅ 公开/敏感信息分层
- **公开信息**: 头像、姓名、年龄、城市、兴趣等 ✅
- **敏感信息**: HIV状态、PrEP使用、社交链接 ✅
- **UI提示**: tooltip说明敏感信息可见性规则 ✅

### ✅ 多图上传功能
- **Supabase Storage**: 集成文件上传服务 ✅
- **公共URL**: 自动获取CDN链接 ✅
- **图片管理**: 上传、删除、预览功能 ✅

### ✅ 完整编辑界面
- **分标签页**: 信息分类清晰 ✅
- **表单验证**: 数据类型和长度验证 ✅
- **用户体验**: 响应式设计和加载状态 ✅

## 📊 数据存储结构

### Profile Images存储
```
profile-images/
├── {user_id_1}/
│   ├── 1704067200000.jpg
│   ├── 1704067300000.png
│   └── 1704067400000.webp
├── {user_id_2}/
│   └── 1704067500000.jpg
```

### Profile数据示例
```json
{
  "user_id": "uuid-here",
  "display_name": "Alex Chen",
  "bio": "Art lover, music enthusiast, always up for new adventures!",
  "age": 26,
  "city": "Shanghai",
  "country": "China",
  "profile_images": [
    "https://...supabase.co/storage/v1/object/public/profile-images/user1/image1.jpg",
    "https://...supabase.co/storage/v1/object/public/profile-images/user1/image2.jpg"
  ],
  "interests": ["Music", "Art", "Travel", "Photography"],
  "preferences": ["Friends", "Dating", "Activity Partner"],
  "height_cm": 175,
  "weight_kg": 70,
  "body_type": "athletic",
  "relationship_status": "single",
  "hiv_status": "negative",
  "prep_usage": "on_prep",
  "social_links": {
    "instagram": "https://instagram.com/alex_chen",
    "twitter": "https://twitter.com/alex_chen"
  },
  "is_verified": false,
  "last_seen": "2024-01-01T12:00:00Z"
}
```

---

**Grindr风格资料系统现已完全实现！用户可以创建丰富的个人资料，系统会根据关系和权限智能控制敏感信息的可见性，确保隐私安全的同时促进真实的社交连接。** 🌈✨
