# 本地开发指南

本项目现在支持完全本地化的开发模式，无需依赖远程 Cloudflare D1 数据库。

## 🚀 快速开始

### 方式一：使用本地Mock服务（推荐）

```bash
# 安装依赖
npm install

# 启动本地开发服务器（使用Mock数据）
npm run dev:local
```

这种方式会：
- 使用 localStorage 存储数据
- 提供完整的API功能模拟
- 包含示例数据
- 支持数据导入导出
- 完全脱离远程依赖

### 方式二：使用远程数据库

```bash
# 启动远程开发模式
npm run dev:remote
```

这种方式会：
- 连接到 Cloudflare D1 数据库
- 需要配置 wrangler.toml
- 需要网络连接

## 🔧 开发工具

在开发环境中，右下角会显示一个开发工具按钮，提供以下功能：

### 模式切换
- **本地模式**：使用 localStorage 存储数据
- **远程模式**：连接 Cloudflare D1 数据库

### 数据管理
- **导出数据**：将当前数据导出为 JSON 文件
- **导入数据**：从 JSON 文件导入数据
- **清除本地数据**：清空所有本地存储的数据

## 📁 数据存储

### 本地模式
- 日记数据存储在：`localStorage['diary_app_data']`
- 设置数据存储在：`localStorage['diary_app_settings']`
- 数据格式与远程数据库完全兼容

### 默认数据
本地模式包含以下示例数据：
- 3条示例日记
- 默认管理员密码：`admin123`
- 默认应用密码：`diary123`（未启用）

## 🔄 模式切换

### 通过环境变量
```bash
# 强制使用本地Mock服务
VITE_USE_MOCK_API=true npm run dev

# 使用远程API
VITE_USE_MOCK_API=false npm run dev
```

### 通过开发工具
在开发环境中点击右下角的设置按钮，可以实时切换模式。

### 通过代码
```javascript
import { apiService } from './services/api';

// 切换到本地模式
apiService.enableLocalMode();

// 切换到远程模式
apiService.enableRemoteMode();

// 获取当前模式
const mode = apiService.getCurrentMode(); // 'local' | 'remote'
```

## 🛠️ 故障恢复

API服务具有自动故障恢复功能：
- 当远程API调用失败时，自动切换到本地Mock服务
- 确保应用在任何情况下都能正常运行
- 在控制台中会显示切换信息

## 📊 数据迁移

### 从远程导出到本地
1. 切换到远程模式
2. 点击"导出数据"
3. 切换到本地模式
4. 点击"导入数据"选择刚才导出的文件

### 从本地导出到远程
1. 在本地模式下点击"导出数据"
2. 切换到远程模式
3. 使用管理员面板的批量导入功能

## 🔍 调试信息

在浏览器控制台中可以看到：
- 当前使用的API模式
- API调用的详细信息
- 模式切换的日志

## 📝 注意事项

1. **数据隔离**：本地模式和远程模式的数据是完全独立的
2. **浏览器限制**：localStorage 有存储大小限制（通常5-10MB）
3. **数据持久性**：本地数据会在清除浏览器数据时丢失
4. **开发工具**：只在开发环境（`import.meta.env.DEV`）中显示

## 🚀 生产部署

生产环境会自动使用远程API，不会显示开发工具。确保在部署前：
1. 配置正确的 `wrangler.toml`
2. 初始化远程数据库
3. 测试远程API连接

## 🤝 贡献

如果你想为本地开发模式添加新功能：
1. 在 `MockApiService` 中实现对应的方法
2. 在 `ApiService` 中添加故障恢复逻辑
3. 更新开发工具界面（如需要）
4. 添加相应的测试用例
