# 日记统计 API 文档

## 概述

这个API接口提供日记应用的统计信息，包括连续日记天数、总记录天数、日记总数和最近记录时间等。

## 接口信息

- **接口地址**: `/api/stats`
- **请求方法**: `GET`
- **返回格式**: `JSON`
- **认证要求**: 可选（支持API密钥保护）

## 返回数据格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "consecutive_days": 7,
    "total_days_with_entries": 25,
    "total_entries": 42,
    "latest_entry_date": "2024-01-15T10:30:00.000Z",
    "first_entry_date": "2023-12-01T08:15:00.000Z",
    "current_streak_start": "2024-01-09T09:00:00.000Z"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "获取日记统计失败",
  "message": "数据库连接失败"
}
```

### 认证失败响应

```json
{
  "success": false,
  "error": "访问被拒绝",
  "message": "无效的API密钥"
}
```

## 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `consecutive_days` | `number` | 连续日记多少天 |
| `total_days_with_entries` | `number` | 一共日记多少天（去重后的天数） |
| `total_entries` | `number` | 多少篇日记（总条目数） |
| `latest_entry_date` | `string \| null` | 最近日记什么时间（ISO格式） |
| `first_entry_date` | `string \| null` | 第一篇日记时间（ISO格式） |
| `current_streak_start` | `string \| null` | 当前连续记录开始时间（ISO格式） |

## API密钥认证

### 认证方式

API支持三种密钥传递方式：

1. **Authorization Header** (推荐)
   ```
   Authorization: Bearer YOUR_API_KEY
   ```

2. **X-API-Key Header**
   ```
   X-API-Key: YOUR_API_KEY
   ```

3. **查询参数**
   ```
   GET /api/stats?api_key=YOUR_API_KEY
   ```

### 配置说明

- 如果未设置API密钥，接口允许无认证访问
- 在管理员面板中可以开启/关闭API密钥保护
- 可以生成新的API密钥或手动设置
- API密钥为32位随机字符串

## 连续天数计算规则

1. **连续性判断**: 只有相邻日期（相差1天）才算连续
2. **中断条件**: 如果最新日记不是今天或昨天，连续天数为0
3. **同一天多篇**: 同一天的多篇日记只算作1天
4. **时区处理**: 按照日期（YYYY-MM-DD）计算，忽略具体时间

## 使用示例

### JavaScript/TypeScript

```javascript
// 基础请求（无认证）
fetch('/api/stats')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const stats = data.data;
      console.log(`连续记录: ${stats.consecutive_days} 天`);
      console.log(`总记录天数: ${stats.total_days_with_entries} 天`);
      console.log(`日记总数: ${stats.total_entries} 篇`);
    } else {
      console.error('获取统计失败:', data.error);
    }
  })
  .catch(error => {
    console.error('请求失败:', error);
  });

// 使用API密钥（Authorization Header）
fetch('/api/stats', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => {
    // 处理响应...
  });

// 使用API密钥（X-API-Key Header）
fetch('/api/stats', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => {
    // 处理响应...
  });

// 使用 async/await 和 API密钥
async function getStats(apiKey) {
  try {
    const headers = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch('/api/stats', { headers });
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('获取统计失败:', error);
    throw error;
  }
}
```

### cURL

```bash
# 无认证请求
curl -X GET "https://your-domain.com/api/stats" \
  -H "Accept: application/json"

# 使用Authorization Header
curl -X GET "https://your-domain.com/api/stats" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 使用X-API-Key Header
curl -X GET "https://your-domain.com/api/stats" \
  -H "Accept: application/json" \
  -H "X-API-Key: YOUR_API_KEY"

# 使用查询参数
curl -X GET "https://your-domain.com/api/stats?api_key=YOUR_API_KEY" \
  -H "Accept: application/json"
```

### Python

```python
import requests

def get_diary_stats(api_key=None):
    try:
        headers = {'Accept': 'application/json'}

        # 添加API密钥（如果提供）
        if api_key:
            headers['X-API-Key'] = api_key

        response = requests.get('https://your-domain.com/api/stats', headers=headers)
        response.raise_for_status()

        data = response.json()
        if data['success']:
            return data['data']
        else:
            raise Exception(data['error'])
    except requests.RequestException as e:
        print(f"请求失败: {e}")
        return None

# 使用示例（无认证）
stats = get_diary_stats()
if stats:
    print(f"连续记录: {stats['consecutive_days']} 天")
    print(f"总记录天数: {stats['total_days_with_entries']} 天")
    print(f"日记总数: {stats['total_entries']} 篇")

# 使用示例（带API密钥）
stats_with_key = get_diary_stats('YOUR_API_KEY')
if stats_with_key:
    print("使用API密钥获取的统计信息:", stats_with_key)
```

## 部署说明

### Cloudflare Pages

1. 将 `functions/api/stats.ts` 文件部署到 Cloudflare Pages
2. 确保 D1 数据库已正确配置
3. （可选）在环境变量中设置 `STATS_API_KEY` 来启用API密钥保护
4. API 将自动在 `https://your-domain.com/api/stats` 可用

#### 环境变量配置

在Cloudflare Pages的设置中添加环境变量：
- `STATS_API_KEY`: 统计API的访问密钥（可选）

### 本地开发

在开发环境中，API 会自动使用 Mock 数据服务，无需配置数据库。

## 错误处理

API 可能返回以下错误：

- **401 Unauthorized**: API密钥无效或缺失（当启用密钥保护时）
- **500 Internal Server Error**: 数据库连接失败或查询错误
- **404 Not Found**: 接口路径错误
- **CORS 错误**: 跨域请求被阻止（已配置允许所有来源）

## 性能说明

- **响应时间**: 通常 < 100ms
- **缓存**: 无缓存，实时计算
- **并发**: 支持高并发请求
- **限制**: 无请求频率限制

## 更新日志

- **v1.1.0**: 添加API密钥保护功能
  - 支持可选的API密钥认证
  - 三种密钥传递方式：Authorization Header、X-API-Key Header、查询参数
  - 管理面板中可配置密钥保护开关
  - 支持32位随机密钥生成和自定义密钥

- **v1.0.0**: 初始版本，提供基础统计功能
  - 支持连续天数、总天数、总条目数统计
  - 支持最新和最早日记时间查询
  - 支持 CORS 跨域请求

## 安全性

- **可选认证**: 支持API密钥保护，可在管理面板中配置
- **CORS支持**: 允许跨域请求，支持认证头
- **错误处理**: 不暴露敏感信息
- **数据安全**: 只返回统计数据，不包含日记内容
- **密钥管理**: 支持32位随机密钥，可随时更换

## 技术支持

如有问题或建议，请联系开发团队。
