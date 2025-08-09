# 数据库迁移指南

## 🚀 执行迁移

新创建的迁移文件：`supabase/migrations/20250809191336_category_constraints.sql`

### 迁移内容

这个迁移实现了以下目标：

1. **✅ 创建 profiles 表** - 用户资料信息，与 auth.users 一一对应
2. **✅ 创建 join_requests 表** - 加入申请与审核流程
3. **✅ 扩展 events 表** - 添加容量、隐私、地点等字段
4. **✅ 修复 event_attendees** - 确保使用正确的 UUID 外键
5. **✅ 限制 category** - 只允许 6 个指定分类
6. **✅ 添加索引和触发器** - 优化性能和数据一致性
7. **✅ 设置 RLS 策略** - 确保数据安全

### 执行方式

#### 方法 1: 使用 Supabase CLI（推荐）

```bash
# 如果还没有安装 Supabase CLI
npm install -g @supabase/cli

# 登录到 Supabase
supabase login

# 关联到你的项目
supabase link --project-ref lymybduvqtbmaukhifzx

# 应用迁移
supabase db push
```

#### 方法 2: 在 Supabase Dashboard 中手动执行

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目 (lymybduvqtbmaukhifzx)
3. 进入 "SQL Editor"
4. 复制并粘贴 `supabase/migrations/20250809191336_category_constraints.sql` 的内容
5. 点击 "Run" 执行

### 验证迁移成功

迁移完成后，你应该能看到：

1. **profiles 表** - 包含用户资料字段
2. **join_requests 表** - 包含申请审核字段
3. **events 表扩展** - capacity, privacy, place_hint, place_exact, place_exact_visible 字段
4. **event_attendees 表** - user_id 为 UUID 类型
5. **Category 约束** - 只允许 6 个分类：'Bar', 'Club', 'Festival', 'Social Meetup', 'Home Party', 'Other'

### 测试验证

```sql
-- 1. 验证 profiles 表
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles';

-- 2. 验证 join_requests 表
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'join_requests';

-- 3. 验证 events 表新字段
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('capacity', 'privacy', 'place_hint', 'place_exact', 'place_exact_visible');

-- 4. 验证 category 约束
INSERT INTO events (title, date, time, location, organizer, category) 
VALUES ('Test', '2025-01-01', '20:00', 'Test Location', 'Test Organizer', 'Invalid Category');
-- 这应该会失败

-- 5. 验证 event_attendees 结构
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'event_attendees' AND column_name = 'user_id';
-- user_id 应该是 uuid 类型
```

## 🔧 TypeScript 类型更新

代码中的 TypeScript 类型也已经更新：

- `EventCategory` - 严格的分类类型
- `EventPrivacy` - 隐私设置类型
- `JoinRequestStatus` - 申请状态类型

这些更新确保了类型安全和与数据库约束的一致性。

## 📝 注意事项

1. **数据备份** - 在执行迁移前建议备份数据
2. **测试环境** - 建议先在测试环境中验证迁移
3. **RLS 策略** - 迁移包含了安全的 Row Level Security 策略
4. **索引优化** - 添加了必要的索引以提升查询性能

迁移完成后，你的应用将能够：
- 管理用户资料
- 处理加入申请和审核
- 使用扩展的事件功能
- 确保数据类型一致性和安全性
