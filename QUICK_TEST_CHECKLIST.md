# GGBang 快速验收测试清单 ✅

## 🚀 5分钟快速验收流程

### 准备工作
- [ ] `npm run dev` 运行成功，访问 http://localhost:5173/
- [ ] 准备测试账户: alice@example.com (主办方), bob@example.com (申请者)

---

## 📝 核心测试流程

### 1️⃣ 创建活动 (用户A - alice@example.com)
```
□ 登录 → Create Event → 填写:
  - Title: "测试聚会"
  - Date: 明天
  - Time: 19:00  
  - Capacity: 6
  - Place Hint: "地铁站附近"
  - Place Exact: 留空
□ 提交成功，活动出现在列表中
□ 卡片显示 "👥 6" 容量标识
□ 地点显示 "地铁站附近"
```

### 2️⃣ 编辑资料 (用户B - bob@example.com)  
```
□ 登录 → 点击头像 → Edit Profile
□ 上传2张照片，填写基本信息:
  - Display Name: "Bob Chen"
  - Bio: "爱好广泛的社交达人"
  - Age: 28
  - City: "Shanghai"
□ 保存成功
```

### 3️⃣ 申请流程
```
□ 用户B: 查看活动详情 → Request to Join
□ 填写留言: "希望参加，会带零食分享！"
□ 提交成功，状态显示 "Request Pending"

□ 用户A: 活动详情 → Host Actions 标签
□ 看到Bob的申请和完整资料(包括敏感字段)
□ 点击 Approve → 状态变为 Approved
□ 容量显示 "1/6"
```

### 4️⃣ 地点解锁测试
```
□ 用户A: 编辑活动 → 设置 Place Exact: "上海市XX路123号"
□ 用户B: 刷新活动详情 → 只看到 Place Hint + 🔒 锁定提示

□ 用户A: 活动详情 → 点击 "Unlock Location"
□ 用户B: 刷新页面 → 看到 🎯 精确地址解锁显示
```

### 5️⃣ 容量限制测试
```
□ 创建5个用户快速申请并批准 → 容量变为 6/6
□ 新用户尝试申请 → 显示 "活动人数已满" 错误
□ 尝试批准第7个申请 → 显示容量超限错误
```

### 6️⃣ 防滥用测试
```
□ 已批准用户再次申请 → 显示 "Already Approved"
□ 创建新用户 → 申请 → 被拒绝 → 立即重新申请
□ 显示冷却期错误: "需要等待7天"

□ 未登录用户点击申请 → 重定向到登录页
```

---

## ⚡ 一键验证脚本

### 手动测试快捷命令
```bash
# 1. 启动应用
npm run dev

# 2. 打开浏览器
# Windows: start http://localhost:5173
# macOS: open http://localhost:5173
# Linux: xdg-open http://localhost:5173

# 3. 按上述清单逐项测试
```

### 数据库验证查询 (可选)
```sql
-- 检查事件创建
SELECT id, title, capacity, place_hint, place_exact_visible FROM events ORDER BY created_at DESC LIMIT 5;

-- 检查申请记录  
SELECT jr.*, p.display_name FROM join_requests jr 
LEFT JOIN profiles p ON jr.requester_id = p.user_id 
ORDER BY jr.created_at DESC LIMIT 10;

-- 检查参与者
SELECT ea.*, e.title FROM event_attendees ea
LEFT JOIN events e ON ea.event_id = e.id
ORDER BY ea.created_at DESC LIMIT 10;

-- 检查容量状态
SELECT 
  e.id, e.title, e.capacity,
  COUNT(ea.user_id) as current_attendees,
  (e.capacity - COUNT(ea.user_id)) as available_spots
FROM events e
LEFT JOIN event_attendees ea ON e.id = ea.event_id
GROUP BY e.id, e.title, e.capacity
ORDER BY e.created_at DESC;
```

---

## 🔍 关键验证点

### ✅ 必须通过的测试
1. **活动创建**: 容量显示正确，地点分层显示
2. **申请流程**: 带留言申请 → 主办方审核 → 状态更新
3. **权限控制**: 敏感信息可见性，操作权限限制
4. **地点解锁**: 解锁前后的可见性变化
5. **容量管理**: 满员拒绝，实时计数准确
6. **防滥用**: 冷却期生效，申请限制执行

### ⚠️ 常见失败原因
- **Supabase配置**: .env文件配置不正确
- **权限问题**: RLS策略未正确配置
- **时间验证**: 时区处理问题
- **并发问题**: 容量检查不准确
- **UI状态**: 页面未正确刷新状态

---

## 📊 测试结果记录表

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 活动创建 | ☐ PASS / ☐ FAIL | |
| 资料编辑 | ☐ PASS / ☐ FAIL | |
| 申请提交 | ☐ PASS / ☐ FAIL | |
| 申请审核 | ☐ PASS / ☐ FAIL | |
| 地点解锁 | ☐ PASS / ☐ FAIL | |
| 容量限制 | ☐ PASS / ☐ FAIL | |
| 权限控制 | ☐ PASS / ☐ FAIL | |
| 防滥用机制 | ☐ PASS / ☐ FAIL | |

### 总体评估
- **通过率**: ___/8 (___%)
- **关键问题**: 
- **修复建议**: 

---

**快速验收测试清单已就绪！按此流程可在5-10分钟内完成核心功能验证。** ⚡✅
