# 🤖 AI通知系统完整部署指南

## 📋 系统概述

这是一个完整的"AI文案+邮件提醒"系统，基于你现有的架构实现：

- ✅ **Supabase** - 数据库和认证
- ✅ **OpenAI** - AI文案生成
- ✅ **Resend** - 邮件发送服务
- ✅ **自动触发** - 数据库触发器监听表变化
- ✅ **定时处理** - GitHub Actions定期处理通知队列

## 🚀 快速开始

### 1. 环境准备

#### 1.1 获取API密钥
```bash
# OpenAI API Key
# 访问 https://platform.openai.com/api-keys

# Resend API Key  
# 访问 https://resend.com/api-keys

# Supabase Keys
# 在 Supabase Dashboard > Settings > API 中获取
```

#### 1.2 配置环境变量
在Supabase Dashboard > Settings > Edge Functions中添加：

```bash
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
MAIL_FROM=your-verified@email.com
CRON_SECRET=your-random-secret-key
```

### 2. 数据库部署

#### 2.1 运行迁移
在Supabase Dashboard > SQL Editor中运行：

```sql
-- 运行迁移文件
-- supabase/migrations/20250813_000007_ai_notification_triggers.sql
```

#### 2.2 验证部署
```sql
-- 检查触发器是否创建
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%enqueue_notification%';

-- 检查函数是否创建
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%notification%';
```

### 3. Edge Function部署

#### 3.1 部署notify-worker
```bash
cd supabase/functions/notify-worker
supabase functions deploy notify-worker
```

#### 3.2 验证部署
```bash
# 测试函数是否可访问
curl -X POST "https://your-project.supabase.co/functions/v1/notify-worker" \
  -H "Authorization: Bearer your_anon_key"
```

### 4. GitHub Actions配置

#### 4.1 设置Secrets
在GitHub仓库 > Settings > Secrets and variables > Actions中添加：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
CRON_SECRET=your_random_secret_key
```

#### 4.2 启用Actions
- 推送代码到GitHub
- 在Actions标签页中查看工作流
- 手动触发一次测试

## 🔧 系统配置

### 1. 通知类型配置

系统支持以下通知类型：

| 类型 | 触发条件 | 收件人 | AI文案 |
|------|----------|--------|--------|
| `request_created` | 新join request | 主办方 | ✅ |
| `approved` | 申请被批准 | 申请者 | ✅ |
| `rejected` | 申请被拒绝 | 申请者 | ✅ |
| `location_unlocked` | 位置解锁 | 所有参与者 | ✅ |

### 2. AI文案配置

#### 2.1 文案风格
- 长度：1-2句话
- 语气：友好、清晰
- 格式：纯文本，无emoji
- 个性化：包含活动标题、时间、人名

#### 2.2 文案示例
```
申请创建: "你的活动申请已提交，正在等待主办方审核"
申请批准: "恭喜！你的申请已获批准，期待在活动中见到你"
申请拒绝: "很遗憾，你的申请未被批准。主办方留言：..."
位置解锁: "活动位置已解锁，请在应用中查看详细信息"
```

### 3. 邮件配置

#### 3.1 发件人设置
```bash
MAIL_FROM=your-verified@email.com
# 必须在Resend中验证的邮箱
```

#### 3.2 邮件模板
- 主题：简洁明了
- 正文：AI生成的个性化文案
- 签名：自动添加

## 📊 监控和维护

### 1. 系统监控

#### 1.1 队列状态
```sql
-- 查看队列状态
SELECT 
  kind,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM NOW() - created_at)/60) as avg_wait_minutes
FROM notifications_queue 
GROUP BY kind, status;

-- 查看失败的任务
SELECT * FROM notifications_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

#### 1.2 发送日志
```sql
-- 查看发送统计
SELECT 
  DATE(created_at) as date,
  kind,
  status,
  COUNT(*) as count
FROM notifications_log 
GROUP BY DATE(created_at), kind, status
ORDER BY date DESC;
```

### 2. 性能优化

#### 2.1 批量处理
```typescript
// 当前配置
const BATCH_SIZE = 10        // 每次处理10条
const MAX_ATTEMPTS = 3       // 最多重试3次
```

#### 2.2 执行频率
```yaml
# GitHub Actions配置
cron: '*/5 * * * *'  # 每5分钟执行一次
```

### 3. 数据清理

#### 3.1 自动清理
```sql
-- 清理30天前的旧数据
SELECT * FROM cleanup_old_notifications(30);
```

#### 3.2 手动清理
```sql
-- 清理特定状态的数据
DELETE FROM notifications_queue 
WHERE status IN ('sent', 'failed') 
AND created_at < NOW() - INTERVAL '7 days';
```

## 🧪 测试和调试

### 1. 运行测试脚本

```bash
# 安装依赖
npm install @supabase/supabase-js dotenv

# 设置环境变量
cp supabase/functions/notify-worker/env.example .env.local
# 编辑 .env.local
```

### 2. 手动测试

#### 2.1 测试触发器
```sql
-- 手动触发通知
SELECT trigger_manual_notification(
  'request_created',
  123,  -- event_id
  NULL, -- join_request_id
  'user-uuid', -- requester_id
  'host-uuid', -- user_id
  '{"test": true}' -- payload
);
```

#### 2.2 测试Edge Function
```bash
# 直接调用
curl -X POST "https://your-project.supabase.co/functions/v1/notify-worker" \
  -H "Authorization: Bearer your_anon_key" \
  -H "x-cron-secret: your_secret"
```

### 3. 常见问题排查

#### 3.1 触发器不工作
```sql
-- 检查触发器状态
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_enqueue_notification_jr';

-- 检查函数权限
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_name = 'enqueue_notification';
```

#### 3.2 邮件发送失败
```sql
-- 查看错误日志
SELECT * FROM notifications_log 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

#### 3.3 AI文案生成失败
- 检查OpenAI API密钥
- 验证API配额
- 查看Edge Function日志

## 🔒 安全配置

### 1. 访问控制

#### 1.1 JWT验证
```typescript
// Edge Function已启用JWT验证
verify_jwt = true
```

#### 1.2 Cron Secret保护
```bash
# 设置随机密钥
CRON_SECRET=your-random-32-character-string
```

### 2. 数据保护

#### 2.1 RLS策略
- 通知队列和日志表不面向前端开放
- Edge Function使用service role绕过RLS

#### 2.2 敏感信息
- 不在日志中记录完整邮箱
- 错误信息脱敏处理

## 📈 扩展功能

### 1. 新增通知类型

#### 1.1 添加枚举值
```sql
-- 在notify_kind枚举中添加新类型
ALTER TYPE notify_kind ADD VALUE 'event_reminder';
```

#### 1.2 扩展触发器逻辑
```sql
-- 在enqueue_notification函数中添加新逻辑
ELSIF TG_TABLE_NAME = 'events' AND TG_OP = 'UPDATE' THEN
  -- 活动提醒逻辑
  IF OLD.reminder_sent = false AND NEW.reminder_sent = true THEN
    -- 插入提醒通知
  END IF;
```

### 2. 多渠道通知

#### 2.1 推送通知
```typescript
// 集成Firebase Cloud Messaging
// 或使用Supabase的实时功能
```

#### 2.2 短信通知
```typescript
// 集成Twilio或其他SMS服务
```

### 3. 智能调度

#### 3.1 动态频率
```typescript
// 根据队列长度调整执行频率
const queueLength = await getQueueLength();
const frequency = queueLength > 100 ? '*/1 * * * *' : '*/5 * * * *';
```

#### 3.2 优先级队列
```sql
-- 添加优先级字段
ALTER TABLE notifications_queue ADD COLUMN priority INT DEFAULT 0;
```

## 🎯 最佳实践

### 1. 开发建议

- 使用事务确保数据一致性
- 实现幂等性避免重复处理
- 添加适当的错误处理和重试机制
- 监控系统性能和资源使用

### 2. 运维建议

- 定期备份通知数据
- 监控API使用量和成本
- 设置告警和通知机制
- 定期审查和优化性能

### 3. 用户体验

- 确保邮件及时送达
- 提供清晰的退订选项
- 支持多语言文案
- 个性化通知内容

## 📚 相关文档

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Resend API](https://resend.com/docs/api-reference)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🤝 支持

如果遇到问题：

1. 检查Edge Function日志
2. 验证数据库触发器状态
3. 确认环境变量配置
4. 查看GitHub Actions执行记录

---

**🎉 恭喜！你的AI通知系统已经部署完成！**

现在系统会自动：
- 监听数据库变化
- 生成AI个性化文案
- 发送邮件通知
- 记录完整日志

享受智能化的通知体验吧！ 🚀

