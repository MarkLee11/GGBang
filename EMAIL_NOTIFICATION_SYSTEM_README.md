# GGBang Email Notification System

## 系统概述

这是一个完整的AI文案+邮箱代发系统，为GGBang活动平台提供自动化的邮件通知服务。系统能够监听数据库变化，自动生成个性化AI文案，并通过多种邮件服务提供商发送邮件。

## 功能特性

### 🎯 自动邮件通知场景

1. **申请相关**
   - ✅ 申请人提交申请 → 申请人和主办方都收到邮件
   - ✅ 申请被批准 → 申请人收到邮件
   - ✅ 申请被拒绝 → 申请人收到邮件
   - ✅ 申请人撤销申请 → 申请人和主办方都收到邮件

2. **活动管理**
   - ✅ 主办方发布活动 → 主办方收到确认邮件
   - ✅ 主办方移除参与者 → 被移除者收到邮件
   - ✅ 活动地点解锁 → 参与者收到邮件
   - ✅ 活动提醒 → 参与者收到邮件

3. **系统通知**
   - ✅ 活动即将开始提醒
   - ✅ 活动取消通知
   - ✅ 活动时间/地点变更通知
   - ✅ 活动满员通知
   - ✅ 候补转正通知

### 🤖 AI文案生成

- 使用OpenAI GPT-4生成个性化、友好的邮件内容
- 支持多种语言风格和情感色彩
- 自动适应不同用户角色（主办方、申请人、参与者）
- 智能文案长度控制，适合移动端阅读

### 📧 邮件服务

- **主要服务**: Resend API（推荐）
- **备用服务**: SMTP（Gmail、Outlook等）
- **优雅降级**: 自动切换服务提供商
- **批量发送**: 支持同时向多个收件人发送邮件

## 系统架构

```
Database Changes → Database Triggers → Edge Function → AI Copy Generation → Email Service → Recipients
```

### 核心组件

1. **数据库触发器** (`supabase/migrations/20250813_000001_email_notification_triggers.sql`)
   - 监听 `join_requests`、`event_attendees`、`events` 表的变化
   - 自动调用Edge Function

2. **Edge Function** (`supabase/functions/email-notification-trigger/`)
   - 处理数据库变化事件
   - 确定收件人和邮件内容
   - 调用邮件服务

3. **邮件通知服务** (`src/lib/emailNotificationService.ts`)
   - 前端邮件发送接口
   - 收件人管理
   - 邮件模板生成

4. **AI文案服务** (`src/lib/aiCopy.ts`)
   - OpenAI API集成
   - 智能文案生成
   - 多场景文案模板

5. **邮件发送服务** (`src/lib/mailer.ts`)
   - 多邮件服务提供商支持
   - 邮件模板系统
   - 发送状态跟踪

## 安装和配置

### 1. 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# Email Service Configuration
RESEND_API_KEY=your_resend_api_key_here

# SMTP Configuration (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_PORT=587

# Email Sender Configuration
EMAIL_SENDER=noreply@ggbang.app

# OpenAI API (for AI copy generation)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Frontend URL
FRONTEND_URL=https://ggbang.app
```

### 2. 数据库迁移

运行数据库迁移来创建触发器：

```bash
supabase db push
```

### 3. 部署Edge Function

```bash
supabase functions deploy email-notification-trigger
```

### 4. 更新Edge Function URL

在数据库迁移文件中更新Edge Function的URL：

```sql
-- 将 'your-project-ref' 替换为你的实际项目引用
url := 'https://your-project-ref.supabase.co/functions/v1/email-notification-trigger';
```

## 使用方法

### 前端集成

系统已经集成到现有的hooks中，无需额外代码：

```typescript
// 在 useEventActions 中自动发送邮件
const { approveRequest, removeAttendee } = useEventActions();

// 在 useJoinRequest 中自动发送邮件
const { submitRequest, withdrawRequest } = useJoinRequest();

// 在 useHostActions 中自动发送邮件
const { approve, reject } = useHostActions();
```

### 手动触发邮件

```typescript
import { 
  notifyJoinRequestSubmitted,
  notifyEventPublished,
  notifyLocationUnlocked 
} from '../lib/emailNotificationService';

// 手动发送申请提交通知
await notifyJoinRequestSubmitted(eventId, requesterId, message);

// 手动发送活动发布通知
await notifyEventPublished(eventId, hostId);

// 手动发送地点解锁通知
await notifyLocationUnlocked(eventId);
```

### 数据库级别触发

```sql
-- 手动触发邮件通知（用于测试）
SELECT manual_email_notification('join_requests', 'INSERT', 123);

-- 查看邮件通知日志
SELECT * FROM email_notification_log;
```

## 邮件模板

### 默认模板

系统使用响应式HTML邮件模板，包含：

- 🎨 现代化设计风格
- 📱 移动端友好
- 🎯 清晰的行动按钮
- 📧 退订链接
- 🌈 GGBang品牌色彩

### 自定义模板

可以通过修改 `createEmailTemplate` 函数来自定义邮件样式：

```typescript
function createEmailTemplate(title: string, message: string, actionUrl?: string): string {
  // 自定义HTML模板
  return `...`;
}
```

## 监控和调试

### 日志查看

```bash
# 查看Edge Function日志
supabase functions logs email-notification-trigger

# 查看数据库触发器日志
SELECT * FROM pg_stat_activity WHERE query LIKE '%notify_email_service%';
```

### 性能监控

```sql
-- 查看邮件通知统计
SELECT * FROM email_notification_log;

-- 查看触发器执行情况
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables 
WHERE tablename IN ('join_requests', 'event_attendees', 'events');
```

## 故障排除

### 常见问题

1. **邮件未发送**
   - 检查环境变量配置
   - 验证API密钥有效性
   - 查看Edge Function日志

2. **AI文案生成失败**
   - 检查OpenAI API密钥
   - 验证API配额和限制
   - 查看控制台错误信息

3. **数据库触发器不工作**
   - 确认迁移已执行
   - 检查函数权限
   - 验证Edge Function URL

### 调试模式

启用详细日志记录：

```typescript
// 在 emailNotificationService.ts 中
console.log('Debug mode enabled');
console.log('Email data:', emailData);
console.log('Recipients:', recipients);
```

## 扩展功能

### 新增邮件场景

1. 在 `EmailActionType` 中添加新类型
2. 在 `getRecipients` 中添加收件人逻辑
3. 在 `generateEmailForRecipient` 中添加文案生成
4. 在 `getFallbackMessage` 中添加备用文案

### 新增邮件服务提供商

1. 在 `mailer.ts` 中添加新的发送函数
2. 在 `sendEmail` 中添加服务选择逻辑
3. 更新环境变量配置

### 新增AI文案类型

1. 在 `aiCopy.ts` 中添加新的 `CopyType`
2. 添加对应的提示词和备用文案
3. 更新文案生成逻辑

## 安全考虑

- 🔐 使用环境变量存储敏感信息
- 🛡️ 数据库触发器使用 `SECURITY DEFINER`
- 📧 邮件发送失败不影响主要业务逻辑
- 👥 用户权限验证和访问控制
- 📊 邮件发送状态跟踪和审计

## 性能优化

- ⚡ 异步邮件发送，不阻塞主流程
- 🗄️ 数据库索引优化
- 🔄 智能触发器，只对相关变化发送通知
- 📦 批量邮件处理
- 🚀 Edge Function冷启动优化

## 支持

如有问题或需要帮助，请：

1. 查看控制台日志
2. 检查数据库触发器状态
3. 验证Edge Function部署
4. 确认环境变量配置

---

**注意**: 这是一个生产就绪的系统，但建议在部署到生产环境前进行充分测试。
