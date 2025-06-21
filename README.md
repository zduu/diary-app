# 📖 我的日记 - 现代化日记应用

一个基于 React + TypeScript + Cloudflare 技术栈构建的现代化日记应用，支持 Markdown 语法、图片上传、多主题切换、管理员面板等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)

## ✨ 功能特色

### 📝 核心功能
- **Markdown 支持**: 完整支持 Markdown 语法，包括代码高亮
- **图片上传**: 支持拖拽上传图片，自动压缩优化
- **智能时间显示**: 自动显示相对时间（如"2小时前"、"昨天"等）
- **心情记录**: 支持记录当天心情状态
- **天气记录**: 可选择当时的天气情况
- **高级搜索**: 支持标题、内容、标签搜索，包含过滤器
- **数据管理**: 支持导入导出日记数据

### 🔐 管理功能
- **管理员面板**: 密码保护的管理界面，支持持久化登录
- **密码保护**: 可选的应用访问密码保护，完全遮挡界面
- **隐藏功能**: 支持隐藏日记，只有管理员可见
- **批量操作**: 支持批量导入导出日记数据
- **可见性控制**: 灵活控制日记的显示和隐藏
- **搜索权限**: 首页搜索框仅对已登录管理员可见
- **设置持久化**: 所有设置保存在数据库中，不会因清除浏览器数据丢失

### 🎨 界面设计
- **多主题切换**: 支持白天、夜间、玻璃三种主题模式
- **响应式设计**: 完美适配桌面端和移动端
- **现代化UI**: 采用玻璃拟态设计，视觉效果出色
- **流畅动画**: 丰富的过渡动画和交互效果

### 🔧 技术特性
- **全栈应用**: 前后端一体化部署
- **云端存储**: 基于 Cloudflare D1 数据库
- **边缘计算**: 利用 Cloudflare Workers 提供快速响应
- **自动部署**: Cloudflare Pages 直接连接 GitHub 自动部署

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Cloudflare 账户（用于部署）

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/diary-app.git
   cd diary-app
   ```

2. **安装依赖**
   ```bash
   npm install
   cd worker && npm install && cd ..
   ```

3. **配置数据库**
   ```bash
   # 创建 D1 数据库
   npx wrangler d1 create diary-db

   # 复制返回的数据库 ID，更新 wrangler.toml 中的 database_id
   # 应用数据库 schema
   npx wrangler d1 execute diary-db --local --file=schema.sql
   ```

4. **启动开发服务器**
   ```bash
   npm start
   ```

应用将在 http://localhost:5173 启动，API 服务在 http://localhost:8787

### 默认密码
- **管理员密码**: `admin123`
- **应用访问密码**: `diary123` (默认关闭)

## 🚀 部署

### 方法一：Cloudflare Pages 直接连接 GitHub（推荐）

这是最简单的部署方式，完全自动化，无需任何命令行操作。

1. **Fork 本项目到你的 GitHub 账户**

2. **在 Cloudflare 中创建 Pages 项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 "Workers & Pages" > "Pages"，点击"创建项目"
   - 选择"连接到 Git"
   - 授权 Cloudflare 访问你的 GitHub 账户
   - 选择 fork 的仓库

3. **配置构建设置**
   - 项目名称: `diary-app`（或自定义名称）
   - 生产分支: `main`
   - 构建命令: `npm ci && npm run build`
   - 构建输出目录: `dist`
   - Root 目录: `/`

4. **配置数据库**
   - 在 Cloudflare Dashboard 中进入 "Workers & Pages" > "D1"
   - 点击 "Create database"，命名为 `diary-db`
   - 记录数据库 ID，更新仓库中 `wrangler.toml` 的 `database_id`
   - 在 Pages 项目的 "Settings" > "Functions" > "D1 database bindings" 中
   - 添加绑定：变量名 `DB`，数据库选择刚创建的 `diary-db`
   - 在 D1 数据库的 "Console" 中，复制 `schema.sql` 的内容并执行

5. **完成部署**
   - 推送更新后的 `wrangler.toml` 到 GitHub
   - Cloudflare 会自动检测到更改并重新部署
   - 前端和后端（Worker Functions）都会自动部署
   - 无需设置任何 GitHub Secrets 或运行命令

### 方法二：手动部署（高级用户）

如果需要手动控制部署过程：

1. **配置 Cloudflare 凭据**
   ```bash
   npx wrangler login
   ```

2. **创建并初始化数据库**
   ```bash
   npx wrangler d1 create diary-db
   npx wrangler d1 execute diary-db --file=schema.sql
   ```

3. **更新 wrangler.toml 中的数据库 ID**

4. **构建并部署**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=diary-app
   cd worker && npx wrangler deploy
   ```

## 📁 项目结构

```
diary-app/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── services/          # API 服务
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型定义
├── worker/                # Cloudflare Worker 后端
│   └── src/               # Worker 源码
├── schema.sql             # 数据库结构
├── wrangler.toml          # Cloudflare 配置
└── dist/                  # 构建输出目录
```

## 🛠️ 技术栈

### 前端
- **React 18**: 现代化 React 框架
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的构建工具
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 现代化图标库

### 后端
- **Cloudflare Workers**: 边缘计算平台
- **Cloudflare D1**: SQLite 兼容的边缘数据库
- **Hono**: 轻量级 Web 框架

### 部署
- **Cloudflare Pages**: 静态网站托管 + 自动部署
- **Cloudflare Functions**: 后端 API 自动部署

## 🎯 使用指南

### 写日记
1. 点击右上角的"写日记"按钮
2. 输入日记内容，支持 Markdown 语法
3. 选择当前心情和天气（可选）
4. 上传相关图片（可选）
5. 点击保存

### 主题切换
- 点击右上角的主题切换按钮
- 支持白天模式、夜间模式、玻璃模式

### 搜索日记
- 管理员登录后，首页会显示搜索框
- 支持标题、内容、标签搜索
- 点击过滤器图标可设置高级搜索选项
- 可按心情、天气、时间范围过滤

### 管理员功能
1. **访问管理面板**
   - 点击右上角的设置图标
   - 输入管理员密码（默认：admin123）

2. **数据管理**
   - 导出：备份所有日记数据为 JSON 文件
   - 导入：从备份文件恢复日记数据

3. **密码设置**
   - 修改管理员密码（保存在数据库中）
   - 开启/关闭应用访问密码保护
   - 修改应用访问密码
   - 所有设置持久化存储，不会因清除浏览器数据丢失

4. **日记管理**
   - 搜索所有日记（包括隐藏的）
   - 切换日记的显示/隐藏状态
   - 隐藏的日记只有管理员可见

5. **登录状态**
   - 管理员登录状态持久化
   - 关闭面板不会退出登录
   - 提供明确的退出登录按钮

## 🔧 配置说明

### 数据库配置
项目使用 Cloudflare D1 数据库，需要在 `wrangler.toml` 中配置：

```toml
[[d1_databases]]
binding = "DB"
database_name = "diary-db"
database_id = "your-database-id-here"
```

### 环境变量
- `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID

##  常见问题

### Q: 如何获取 Cloudflare API Token？
A: 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) > "My Profile" > "API Tokens" > "Create Token" > 选择 "Cloudflare Pages:Edit" 模板

### Q: 数据库如何初始化？
A: 使用 `npx wrangler d1 create diary-db` 创建数据库，然后用 `npx wrangler d1 execute diary-db --local --file=schema.sql` 初始化

### Q: 忘记管理员密码怎么办？
A: 可以直接修改数据库中的 `app_settings` 表，或重新运行 `schema.sql` 重置为默认密码 `admin123`

## 🎨 特性亮点

- **🔒 安全**: 密码保护 + 数据持久化
- **🎨 美观**: 三种主题 + 响应式设计
- **⚡ 快速**: Cloudflare 边缘计算
- **📱 现代**: PWA 支持 + 离线功能

## � 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
