# 📖 我的日记

基于 React + TypeScript + Cloudflare 构建的现代化日记应用。

🌐 **在线演示**: [diary.edxx.de](https://diary.edxx.de)

![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-orange.svg)

## ✨ 功能特色

- **Markdown 支持**: 完整支持 Markdown 语法，包括代码高亮
- **图片上传**: 支持拖拽上传图片，自动压缩优化
- **智能时间显示**: 自动显示相对时间（如"2小时前"、"昨天"等）
- **心情记录**: 支持记录当天心情状态
- **天气记录**: 可选择当时的天气情况
- **高级搜索**: 支持标题、内容、标签搜索，包含过滤器
- **数据管理**: 支持导入导出日记数据
- **管理员面板**: 密码保护的管理界面，支持持久化登录
- **密码保护**: 可选的应用访问密码保护
- **隐藏功能**: 支持隐藏日记，只有管理员可见
- **多主题切换**: 支持白天、夜间、玻璃三种主题模式
- **响应式设计**: 完美适配桌面端和移动端
- **边缘计算**: 基于 Cloudflare Pages Functions 提供快速响应

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/zduu/diary-app.git
cd diary-app

# 安装依赖
npm install

# 配置数据库
npx wrangler d1 create diary-db
# 复制返回的数据库 ID，更新 wrangler.toml 中的 database_id
npx wrangler d1 execute diary-db --remote --file=schema.sql

# 启动开发服务器
npm start
```

应用将在 http://localhost:5173 启动

### 默认密码
- **管理员密码**: `admin123`
- **应用访问密码**: `diary123` (默认关闭)

## 🚀 部署

### Cloudflare Pages 部署（推荐）

1. **Fork 本项目到你的 GitHub 账户**

2. **在 Cloudflare 中创建 Pages 项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 "Workers & Pages" > "Pages"，点击"创建项目"
   - 选择"连接到 Git"，选择 fork 的仓库

3. **配置构建设置**
   - 构建命令: `npm ci && npm run build`
   - 构建输出目录: `dist`

4. **配置数据库**
   - 在 Cloudflare Dashboard 中创建 D1 数据库 `diary-db`
   - 记录数据库 ID，更新仓库中 `wrangler.toml` 的 `database_id`
   - 在 Pages 项目的 "Settings" > "Functions" > "D1 database bindings" 中添加绑定：变量名 `DB`
   - 在 D1 数据库的 "Console" 中执行 `schema.sql` 的内容

5. **完成部署**
   - 推送更新后的 `wrangler.toml` 到 GitHub
   - Cloudflare 会自动重新部署

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Cloudflare Pages Functions + D1 数据库
- **部署**: Cloudflare Pages 自动部署

## 🎯 使用指南

### 基本使用
- **写日记**: 点击"写日记"按钮，支持 Markdown 语法、图片上传、心情天气记录
- **主题切换**: 点击主题按钮，支持白天/夜间/玻璃三种模式
- **搜索日记**: 管理员登录后可搜索标题、内容、标签，支持高级过滤

### 管理员功能
- **访问**: 点击设置图标，输入管理员密码（默认：admin123）
- **数据管理**: 导出/导入日记数据
- **密码设置**: 修改管理员密码、开启应用访问密码保护
- **日记管理**: 搜索、隐藏/显示日记

## 常见问题

**Q: 忘记管理员密码怎么办？**
A: 重新运行 `schema.sql` 重置为默认密码 `admin123`

**Q: 本地开发无法显示数据？**
A: 本地环境使用远程 D1 数据库，可能存在连接问题，建议直接部署到生产环境测试

**Q: 如何配置数据库？**
A: 在 `wrangler.toml` 中配置数据库 ID，在 Cloudflare Pages 中绑定 D1 数据库

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
