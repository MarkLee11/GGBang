# GGBang 项目设置指南

## 🚀 快速开始

项目现在可以在演示模式下运行，无需配置数据库即可查看UI界面。

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

项目将在演示模式下运行，显示模拟数据。你会看到一个黄色横幅提示当前运行在演示模式。

### 步骤 2: 配置真实数据库（可选）

如果你想连接到真实的Supabase数据库：

1. 在项目根目录创建 `.env` 文件
2. 添加你的Supabase凭据：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. 重启开发服务器

### 获取Supabase凭据

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目或选择现有项目
3. 在项目仪表板的设置 > API 中找到：
   - Project URL (VITE_SUPABASE_URL)
   - Anon key (VITE_SUPABASE_ANON_KEY)
4. 运行 `/supabase/migrations/` 目录中的数据库迁移

## 🛠️ 故障排除

### 页面空白问题
- ✅ 已修复：项目现在在演示模式下正常运行
- 如果仍有问题，检查浏览器控制台是否有错误

### 数据库连接问题
- 确保Supabase凭据正确
- 检查网络连接
- 验证数据库迁移已运行

## 📂 项目结构

- `src/lib/supabase.ts` - 数据库配置和模拟数据
- `src/lib/auth.ts` - 认证服务
- `src/hooks/useEvents.ts` - 事件数据获取
- `src/components/` - React组件

## 🔧 开发模式功能

- 自动模拟数据加载
- 优雅的错误处理
- 开发模式指示器
- 完整的UI功能预览
