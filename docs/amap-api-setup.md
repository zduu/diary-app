# 高德地图API配置指南

## 📍 为什么使用高德地图API？

高德地图在中国大陆地区提供最准确的位置识别服务：
- ✅ 精确的地理编码和逆地理编码
- ✅ 详细的地址信息（省市区、街道、建筑物等）
- ✅ 免费配额：每日100万次调用
- ✅ 专为中国地区优化

## 🚀 快速配置步骤

### 1. 注册高德开放平台账号
访问：https://lbs.amap.com/
- 使用手机号注册账号
- 完成实名认证（个人或企业）

### 2. 创建应用
1. 登录控制台：https://console.amap.com/dev/key/app
2. 点击"创建新应用"
3. 填写应用信息：
   - 应用名称：`我的日记应用`
   - 应用类型：`Web端`

### 3. 添加Key（需要两个）

#### 3.1 Web服务API密钥
1. 在应用中点击"添加Key"
2. 填写Key信息：
   - Key名称：`日记位置服务-Web`
   - 服务平台：选择 `Web服务`
   - 白名单：暂时不填（开发阶段）

#### 3.2 JavaScript API密钥（用于地图选择功能）
1. 再次点击"添加Key"
2. 填写Key信息：
   - Key名称：`日记位置服务-JS`
   - 服务平台：选择 `Web端(JS API)`
   - 白名单：暂时不填（开发阶段）

### 4. 获取API密钥
创建成功后，复制两个Key值

### 5. 配置到项目
1. 复制 `.env.example` 为 `.env.local`
2. 将两个API密钥都填入：
```bash
# Web服务API密钥（用于地理编码）
VITE_AMAP_WEB_KEY=你的Web服务API密钥

# JavaScript API密钥（用于地图选择功能）
VITE_AMAP_JS_KEY=你的JavaScript API密钥
```

## 🔧 配置示例

### .env.local 文件
```bash
# 高德地图Web服务API密钥（用于地理编码）
VITE_AMAP_WEB_KEY=a1dgvbisazugduiwsa2m3n4o5p6

# 高德地图JavaScript API密钥（用于地图显示）
VITE_AMAP_JS_KEY=b2c3sdxfvczsedrgfi5p6q7

# 高德地图JavaScript API安全密钥（securityJsCode）
VITE_AMAP_SECURITY_CODE=c3dgfvers5p6q7r8
```

**注意**：
- **Web服务API**：选择"Web服务"平台
- **JavaScript API**：选择"Web端(JS API)"平台，需要同时配置API密钥和安全密钥

## 📊 API配额说明

### 免费版配额
- **Web服务API**: 100万次/日
- **JavaScript API**: 100万次/日
- 对于个人日记应用完全够用

### 计费方式
- 超出免费配额后按次计费
- Web服务API：0.002元/次
- 通常个人使用不会超出免费配额

## 🛡️ 安全配置

### 生产环境安全设置
1. **设置白名单**：
   - 在控制台中设置允许的域名
   - 例如：`yourdomain.com`

2. **环境变量**：
   - 生产环境通过环境变量配置
   - 不要将API密钥提交到代码仓库

### Cloudflare Pages 部署配置
在 Cloudflare Pages 的环境变量中添加：
```
VITE_AMAP_WEB_KEY = 你的API密钥
```

## 🧪 测试配置

配置完成后，重启开发服务器：
```bash
npm start
```

在位置获取时，控制台应该显示：
```
调用高德地图API: https://restapi.amap.com/v3/geocode/regeo?...
高德地图地理编码成功: {...}
```

## 🔄 备用方案

如果高德地图API不可用，系统会自动降级到：
1. 浏览器内置地理编码
2. OpenStreetMap API
3. 智能离线模式

## 📞 技术支持

- 高德开放平台文档：https://lbs.amap.com/api/
- 逆地理编码API文档：https://lbs.amap.com/api/webservice/guide/api/georegeo
- 技术支持QQ群：427128429

## 🚨 常见问题排除

### 错误：USERKEY_PLAT_NOMATCH (错误码: 10009)

**问题原因**：API密钥的服务平台配置不正确

**解决方案**：
1. 登录 [高德控制台](https://console.amap.com/dev/key/app)
2. 找到您的API密钥
3. 检查"服务平台"设置：
   - ❌ 错误：选择了"Web端(JS API)"
   - ✅ 正确：选择"Web服务"
4. 如果无法修改，请删除旧密钥并创建新的

### 错误：INVALID_USER_KEY (错误码: 10001)

**问题原因**：API密钥无效或格式错误

**解决方案**：
1. 检查 `.env.local` 文件中的密钥是否正确
2. 确保密钥没有多余的空格或换行符
3. 重新复制粘贴API密钥

### 错误：DAILY_QUERY_OVER_LIMIT (错误码: 10044)

**问题原因**：超出每日免费配额

**解决方案**：
1. 等待第二天配额重置
2. 升级到付费版本
3. 优化调用频率

### 网络连接问题

如果遇到网络连接问题：
1. 检查防火墙设置
2. 尝试使用VPN
3. 系统会自动降级到离线模式

## ⚠️ 注意事项

1. **API密钥保密**：不要在前端代码中硬编码API密钥
2. **服务平台选择**：务必选择"Web服务"而不是"Web端(JS API)"
3. **配额监控**：定期检查API使用量
4. **错误处理**：确保有备用方案
5. **白名单设置**：生产环境务必设置域名白名单

## 🔍 调试技巧

1. **查看控制台日志**：
   ```
   调用高德地图API: https://restapi.amap.com/v3/geocode/regeo?...
   高德地图API响应: {...}
   ```

2. **测试API密钥**：
   在浏览器中直接访问API URL，检查返回结果

3. **验证配置**：
   确保 `.env.local` 文件在项目根目录且格式正确

配置完成后，您的日记应用将获得精确的位置识别能力！🗺️✨
