# 🔄 Notify Worker Cron 配置

## 📋 概述
`notify-worker` Edge Function 需要定期调用以处理通知队列。推荐使用外部cron服务。

## ⚙️ 配置选项

### 1. GitHub Actions (推荐)
创建 `.github/workflows/notify-cron.yml`:

```yaml
name: Notify Worker Cron
on:
  schedule:
    - cron: '*/5 * * * *'  # 每5分钟执行一次
  workflow_dispatch:  # 允许手动触发

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Notify Worker
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/notify-worker" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

### 2. Vercel Cron
在 `vercel.json` 中添加:

```json
{
  "crons": [
    {
      "path": "/api/notify-cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

然后创建 `api/notify-cron.js`:

```javascript
export default async function handler(req, res) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/notify-worker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'x-cron-secret': process.env.CRON_SECRET,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  res.status(200).json(result);
}
```

### 3. 专用Cron服务
- **Cron-job.org** (免费)
- **EasyCron** (付费)
- **SetCronJob** (付费)

配置示例:
```
URL: https://your-project.supabase.co/functions/v1/notify-worker
Method: POST
Headers: 
  Authorization: Bearer your_anon_key
  x-cron-secret: your_secret_key
  Content-Type: application/json
Schedule: */5 * * * *
```

## 🔐 环境变量

需要在GitHub Secrets或环境变量中设置:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
CRON_SECRET=your_secret_key
```

## 📊 监控建议

### 1. 日志监控
- 检查Edge Function日志
- 监控数据库中的通知状态
- 设置错误告警

### 2. 性能监控
- 队列处理时间
- 邮件发送成功率
- AI API调用延迟

### 3. 健康检查
定期调用健康检查端点:

```bash
curl "https://your-project.supabase.co/functions/v1/notify-worker/health"
```

## 🚨 故障排除

### 常见问题
1. **Cron未执行**: 检查cron服务状态和配置
2. **权限错误**: 验证API密钥和cron secret
3. **队列积压**: 检查Edge Function是否正常运行
4. **邮件发送失败**: 验证Resend API密钥

### 调试步骤
1. 检查Edge Function日志
2. 验证数据库触发器是否工作
3. 手动测试通知队列
4. 检查环境变量配置

## 📈 扩展建议

### 1. 动态调度
根据队列长度调整执行频率:
- 队列为空: 降低频率到每15分钟
- 队列积压: 提高频率到每1分钟

### 2. 多实例支持
如果单实例处理能力不足，可以:
- 使用多个cron任务
- 实现分布式锁机制
- 添加负载均衡

### 3. 智能重试
根据失败原因调整重试策略:
- 网络错误: 立即重试
- API限制: 指数退避
- 配置错误: 跳过重试

