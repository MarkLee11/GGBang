# GGBang 完整验收测试指南

## 🎯 测试概述

本指南提供了一套完整的手动验收测试流程，覆盖了所有核心功能，包括事件创建、申请流程、权限控制、容量管理和防滥用机制。

## 🧪 测试环境准备

### 前置条件
```bash
# 1. 启动开发服务器
npm run dev
# 访问: http://localhost:5173/

# 2. 确保 Supabase 服务正常
# 检查 .env 配置是否正确
# VITE_SUPABASE_URL=你的Supabase项目URL
# VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 测试用户准备
- **用户A**: 主办方账户 (alice@example.com)
- **用户B**: 申请者账户 (bob@example.com)
- **用户C**: 额外申请者 (carol@example.com)
- **未登录用户**: 匿名访问者

---

## 📋 核心功能验收测试

### 🎪 Test Case 1: 创建活动 (用户A)

#### 测试步骤
1. **登录用户A账户**
   ```
   访问首页 → 点击"Sign In" → 输入 alice@example.com → 登录成功
   ```

2. **创建新活动**
   ```
   点击"Create Event"按钮 → 填写活动信息：
   - Title: "周末聚会派对"
   - Description: "周末放松聚会，欢迎大家参加"
   - Date: 选择未来3天内的日期
   - Time: 选择合适时间 (如 19:00)
   - Location: "市中心"
   - Country: "China"
   - Category: "Home Party"
   - Capacity: 6
   - Place Hint: "靠近地铁站，具体地址活动前公布"
   - Place Exact: 留空 (稍后设置)
   ```

3. **提交创建**
   ```
   点击"Create Event" → 等待创建成功 → 返回活动列表
   ```

#### ✅ 预期结果
- 活动成功创建并显示在列表中
- 活动卡片显示容量 "👥 6"
- 地点显示 "靠近地铁站，具体地址活动前公布"
- 不显示精确地址

---

### 👤 Test Case 2: 编辑个人资料 (用户B)

#### 测试步骤
1. **登录用户B账户**
   ```
   如果已登录用户A，先登出 → 登录 bob@example.com
   ```

2. **进入资料编辑**
   ```
   点击导航栏头像 → 选择"Edit Profile"
   ```

3. **完善个人资料**
   ```
   Basic Info 标签页:
   - Display Name: "Bob Chen"
   - Bio: "喜欢参加各种社交活动，性格开朗友善"
   - Age: 28
   - City: "Shanghai"
   - Country: "China"
   
   上传照片:
   - 点击"Add Photo"按钮
   - 上传第一张照片 (头像)
   - 点击"Add Photo"按钮
   - 上传第二张照片 (生活照)
   
   Interests 标签页:
   - 选择感兴趣的类别和具体兴趣
   - 如: Sports → [Basketball, Swimming]
   
   Physical 标签页:
   - Height: 175 cm
   - Weight: 70 kg
   - Body Type: "Athletic"
   - Relationship Status: "Single"
   ```

4. **保存资料**
   ```
   点击"Save Changes" → 等待保存成功
   ```

#### ✅ 预期结果
- 个人资料保存成功
- 照片上传并正确显示
- 所有信息正确保存并显示

---

### 🎫 Test Case 3: 提交申请 (用户B)

#### 测试步骤
1. **查看活动详情**
   ```
   在活动列表中找到"周末聚会派对" → 点击"View Details"
   ```

2. **提交带留言的申请**
   ```
   点击"Request to Join"按钮 → 在弹出的申请窗口中:
   - Message: "你好！我对这个聚会很感兴趣，希望能参加。我性格开朗，会带些小零食和大家分享。期待活动！"
   - 点击"Submit Request"
   ```

#### ✅ 预期结果
- 申请提交成功
- 按钮状态变为"Request Pending"
- 显示黄色待审核状态

---

### 👑 Test Case 4: 审核申请 (用户A)

#### 测试步骤
1. **切换到用户A账户**
   ```
   登出用户B → 登录用户A (alice@example.com)
   ```

2. **查看申请管理**
   ```
   进入"周末聚会派对"活动详情 → 点击"Host Actions"标签页
   ```

3. **审核用户B的申请**
   ```
   在Pending Requests部分:
   - 查看Bob Chen的个人资料卡片 (包含敏感信息)
   - 阅读申请留言
   - 点击"Approve"按钮
   ```

#### ✅ 预期结果
- 可以看到申请者的完整资料 (包括敏感字段)
- 申请状态从Pending变为Approved
- 在Approved Requests部分显示Bob Chen
- 容量状态更新为 "1/6"

---

### 📍 Test Case 5: 地点解锁功能 (用户A)

#### 前置步骤
1. **设置精确地址**
   ```
   用户A编辑活动 → 添加Place Exact:
   "上海市黄浦区南京东路123号，456室，门铃按502"
   ```

#### 测试步骤

**5.1 解锁前测试 (用户B视角)**
```
用户B登录 → 查看活动详情 → Location部分:
- 应显示: "📍 Location Hint: 靠近地铁站，具体地址活动前公布"
- 应显示: "🔒 Exact Location: Will be revealed closer to the event"
- 不应显示精确地址
```

**5.2 执行解锁 (用户A视角)**
```
用户A登录 → 活动详情 → 点击"Unlock Location"按钮
等待解锁成功提示
```

**5.3 解锁后测试 (用户B视角)**
```
用户B刷新页面 → 查看活动详情 → Location部分:
- 仍显示: "📍 Location Hint: 靠近地铁站..."
- 新增显示: "🎯 Exact Location (Unlocked): 上海市黄浦区南京东路123号，456室，门铃按502"
- 显示: "✅ Available to approved members"
```

#### ✅ 预期结果
- 解锁前：已批准用户B看不到精确地址
- 解锁后：已批准用户B可以看到精确地址
- 地址显示格式正确，带有解锁标识

---

### 🚫 Test Case 6: 容量限制测试

#### 测试步骤
1. **快速填满活动容量**
   ```
   创建5个额外用户账户或使用现有账户:
   - carol@example.com (用户C)
   - david@example.com (用户D)
   - eve@example.com (用户E)
   - frank@example.com (用户F)
   - grace@example.com (用户G)
   
   每个用户执行:
   登录 → 申请"周末聚会派对" → 用户A批准
   重复至容量接近满员 (5/6)
   ```

2. **测试满员拒绝**
   ```
   最后一个用户 (用户G) 申请时:
   用户A尝试批准 → 应显示容量已满错误
   ```

3. **再次申请测试**
   ```
   创建新用户H → 尝试申请同一活动
   应显示活动已满，无法申请
   ```

#### ✅ 预期结果
- 容量达到6/6时，无法批准更多申请
- 错误消息: "活动容量已满 (6/6)，无法批准更多申请"
- 新申请者看到"活动人数已满"提示

---

### ⛔ Test Case 7: 防滥用机制测试

#### 7.1 重复申请阻止
```
用户B (已被批准) → 再次访问活动详情页
预期: 按钮显示"Request Approved"，无法再次申请
```

#### 7.2 拒绝冷却期测试
```
步骤:
1. 创建新用户I → 申请活动
2. 用户A拒绝申请 (点击Reject)
3. 用户I立即再次申请同一活动

预期结果:
- 显示冷却期错误
- 错误消息: "您需要等待 7 天后才能重新申请该活动"
- HTTP状态码: 429
```

#### 7.3 Pending申请限制测试
```
步骤:
1. 创建新用户J
2. 让用户J连续申请6个不同活动 (不批准)
3. 尝试申请第6个活动

预期结果:
- 第6个申请被拒绝
- 错误消息: "您当前有 5 个待处理申请，已达到最大限制 5 个"
```

---

### 🔒 Test Case 8: 权限控制测试

#### 8.1 未登录用户测试
```
步骤:
1. 登出所有账户 (匿名访问)
2. 浏览活动列表 → 可正常查看
3. 点击活动详情 → 可正常查看 (只显示place_hint)
4. 点击"Request to Join"按钮

预期结果:
- 重定向到登录页面
- 提示: "请先登录后再进行此操作"
```

#### 8.2 非主办方权限测试
```
步骤:
1. 用户B登录 → 访问活动详情
2. 查看是否有"Host Actions"标签页
3. 查看是否有"Unlock Location"按钮

预期结果:
- 无"Host Actions"标签页
- 无"Unlock Location"按钮
- 只能看到基本的活动信息和申请按钮
```

---

## 🔄 完整用户流程测试

### Scenario A: 成功参与流程
```
1. 用户A创建活动 ✅
2. 用户B完善资料 ✅
3. 用户B申请活动 ✅
4. 用户A批准申请 ✅
5. 用户A解锁地点 ✅
6. 用户B查看精确地址 ✅
```

### Scenario B: 容量限制流程
```
1. 活动接近满员 (5/6) ✅
2. 最后一位申请者提交申请 ✅
3. 主办方批准后达到满员 ✅
4. 新申请者被拒绝 ✅
```

### Scenario C: 防滥用流程
```
1. 用户申请被拒绝 ✅
2. 立即重新申请被阻止 (7天冷却) ✅
3. 用户达到5个pending申请限制 ✅
```

---

## 🔧 自动化测试脚本 (可选)

### 简单的E2E测试脚本
```javascript
// test-basic-flow.js
// 使用 Playwright 或 Puppeteer

const { test, expect } = require('@playwright/test');

test('完整申请流程', async ({ page, browser }) => {
  // 用户A创建活动
  await page.goto('http://localhost:5173');
  await page.click('text=Sign In');
  await page.fill('input[type="email"]', 'alice@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.click('text=Create Event');
  await page.fill('input[name="title"]', '测试活动');
  await page.fill('input[name="date"]', '2024-01-15');
  await page.fill('input[name="time"]', '19:00');
  await page.fill('input[name="capacity"]', '6');
  await page.fill('input[name="place_hint"]', '地铁站附近');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=测试活动')).toBeVisible();
  
  // 用户B申请
  const userBContext = await browser.newContext();
  const userBPage = await userBContext.newPage();
  
  await userBPage.goto('http://localhost:5173');
  await userBPage.click('text=Sign In');
  await userBPage.fill('input[type="email"]', 'bob@example.com');
  await userBPage.fill('input[type="password"]', 'password123');
  await userBPage.click('button[type="submit"]');
  
  await userBPage.click('text=测试活动');
  await userBPage.click('text=Request to Join');
  await userBPage.fill('textarea', '希望参加活动');
  await userBPage.click('text=Submit Request');
  
  await expect(userBPage.locator('text=Request Pending')).toBeVisible();
  
  // 用户A批准
  await page.reload();
  await page.click('text=测试活动');
  await page.click('text=Host Actions');
  await page.click('text=Approve');
  
  await expect(page.locator('text=Approved')).toBeVisible();
});
```

---

## 📊 验收检查清单

### ✅ 核心功能
- [ ] 活动创建 (未来时间验证)
- [ ] 个人资料编辑 (多图上传)
- [ ] 带留言申请提交
- [ ] 主办方申请审核
- [ ] 地点解锁功能
- [ ] 容量限制执行

### ✅ 权限控制
- [ ] 未登录用户重定向
- [ ] 非主办方权限限制
- [ ] 敏感信息可见性控制
- [ ] 精确地址权限管理

### ✅ 防滥用机制
- [ ] Pending申请数量限制 (≤5)
- [ ] 拒绝后7天冷却期
- [ ] 重复申请阻止
- [ ] 过去时间活动创建阻止

### ✅ 用户体验
- [ ] 清晰的错误提示
- [ ] 状态实时更新
- [ ] 界面友好易用
- [ ] 响应速度良好

### ✅ 数据一致性
- [ ] 容量计算准确
- [ ] 时间UTC处理正确
- [ ] 状态同步及时
- [ ] 并发操作安全

---

## 🚨 常见问题排查

### 问题1: 申请提交失败
```
检查项:
1. 用户是否已登录
2. 活动是否已满员
3. 用户是否已申请过
4. 网络连接是否正常
```

### 问题2: 地点解锁失败
```
检查项:
1. 用户是否为活动主办方
2. 活动是否设置了place_exact
3. 地点是否已经解锁
```

### 问题3: 资料上传失败
```
检查项:
1. 图片文件大小 (< 5MB)
2. 图片格式 (jpg, png, gif)
3. Supabase Storage配置
4. 网络连接稳定性
```

---

**完整验收测试指南已准备就绪！按照此流程可以全面验证GGBang应用的所有核心功能和边界情况。** 🧪✅
