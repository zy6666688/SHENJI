# 系统集成 API 文档

**审计数智析 V2.0 - 系统管理API完整文档**

本文档提供系统集成API的详细说明和使用示例。

---

## 📋 目录

1. [概述](#概述)
2. [认证](#认证)
3. [API端点](#api端点)
4. [数据模型](#数据模型)
5. [错误处理](#错误处理)
6. [使用示例](#使用示例)
7. [SDK示例](#sdk示例)

---

## 🎯 概述

系统集成API提供以下功能：

- ✅ 系统状态监控
- ✅ 系统统计信息
- ✅ 插件管理
- ✅ AI工作流分析
- ✅ 健康检查

**Base URL**: `http://localhost:3000/api/system`

**版本**: V2.0.0

---

## 🔐 认证

所有API端点都需要有效的JWT令牌（除了健康检查）。

### 获取令牌

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 使用令牌

```bash
GET /api/system/status
Authorization: Bearer <your-jwt-token>
```

---

## 📡 API端点

### 1. 获取系统状态

获取系统当前状态，包括功能启用情况和性能指标。

**请求**:
```http
GET /api/system/status
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "features": {
      "distributed": {
        "enabled": false,
        "status": "inactive"
      },
      "plugins": {
        "enabled": true,
        "count": 3
      },
      "ai": {
        "enabled": false,
        "status": "inactive"
      },
      "rbac": {
        "enabled": true,
        "roles": 4
      },
      "audit": {
        "enabled": true,
        "logs": 1523
      }
    },
    "performance": {
      "uptime": 3600.5,
      "memory": {
        "used": 250,
        "total": 512
      },
      "cpu": 15.6
    }
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| healthy | boolean | 系统是否健康 |
| features.*.enabled | boolean | 功能是否启用 |
| features.*.status | string | 功能状态 |
| performance.uptime | number | 运行时间（秒） |
| performance.memory.used | number | 已用内存（MB） |
| performance.cpu | number | CPU使用率（%） |

**cURL示例**:
```bash
curl -X GET http://localhost:3000/api/system/status \
  -H "Authorization: Bearer <token>"
```

---

### 2. 获取系统统计

获取系统运行统计信息。

**请求**:
```http
GET /api/system/stats
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "requests": 15234,
    "errors": 23,
    "uptime": 86400000,
    "features": {
      "distributed": false,
      "plugins": true,
      "ai": false,
      "rbac": true,
      "audit": true
    },
    "distributed": null,
    "plugins": {
      "total": 5,
      "active": 3,
      "inactive": 2
    },
    "permissions": {
      "users": 120,
      "roles": 4,
      "teams": 8
    }
  }
}
```

**cURL示例**:
```bash
curl -X GET http://localhost:3000/api/system/stats \
  -H "Authorization: Bearer <token>"
```

---

### 3. 健康检查

系统健康检查端点（无需认证）。

**请求**:
```http
GET /api/system/health
```

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T15:30:00.000Z",
  "uptime": 3600.5,
  "features": [
    {
      "name": "distributed",
      "enabled": false,
      "status": "inactive"
    },
    {
      "name": "plugins",
      "enabled": true,
      "status": "active"
    },
    {
      "name": "ai",
      "enabled": false,
      "status": "inactive"
    },
    {
      "name": "rbac",
      "enabled": true,
      "status": "active"
    },
    {
      "name": "audit",
      "enabled": true,
      "status": "active"
    }
  ]
}
```

**HTTP状态码**:
- `200` - 系统健康
- `503` - 系统不健康

**cURL示例**:
```bash
curl -X GET http://localhost:3000/api/system/health
```

---

### 4. 获取插件列表

获取所有已安装的插件。

**请求**:
```http
GET /api/system/plugins
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "custom-audit-plugin",
      "name": "Custom Audit Plugin",
      "version": "1.0.0",
      "status": "active",
      "description": "Custom audit nodes for specialized tasks",
      "author": "Company Team",
      "nodes": [
        {
          "id": "custom-validator",
          "name": "Custom Validator",
          "category": "validation"
        }
      ]
    },
    {
      "id": "data-connector",
      "name": "Data Connector",
      "version": "2.1.0",
      "status": "inactive",
      "description": "Connect to external data sources",
      "author": "Third Party"
    }
  ]
}
```

**cURL示例**:
```bash
curl -X GET http://localhost:3000/api/system/plugins \
  -H "Authorization: Bearer <token>"
```

---

### 5. 激活插件

激活指定的插件。

**请求**:
```http
POST /api/system/plugins/:pluginId/activate
Authorization: Bearer <token>
```

**路径参数**:
- `pluginId` (string, required) - 插件ID

**响应**:
```json
{
  "success": true,
  "message": "Plugin custom-audit-plugin activated"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Plugin not found"
}
```

**cURL示例**:
```bash
curl -X POST http://localhost:3000/api/system/plugins/custom-audit-plugin/activate \
  -H "Authorization: Bearer <token>"
```

---

### 6. AI分析工作流

使用AI分析工作流，提供优化建议。

**请求**:
```http
POST /api/system/analyze-workflow
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflow": {
    "id": "wf_123",
    "name": "Data Processing Workflow",
    "nodes": [
      {
        "id": "node1",
        "type": "data.input",
        "label": "Input",
        "position": { "x": 0, "y": 0 },
        "config": {},
        "inputs": {}
      },
      {
        "id": "node2",
        "type": "data.transform",
        "label": "Transform",
        "position": { "x": 200, "y": 0 },
        "config": {},
        "inputs": {}
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "node1",
        "target": "node2"
      }
    ]
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "summary": "工作流结构良好，但存在一些优化空间",
    "riskLevel": "low",
    "confidence": 0.85,
    "suggestions": [
      {
        "type": "optimization",
        "severity": "medium",
        "nodeId": "node2",
        "title": "建议添加错误处理",
        "description": "Transform节点应该添加错误处理逻辑以提高鲁棒性",
        "impact": "提高系统稳定性"
      },
      {
        "type": "performance",
        "severity": "low",
        "nodeId": null,
        "title": "可以并行执行",
        "description": "某些独立节点可以并行执行以提高性能",
        "impact": "减少30%执行时间"
      }
    ],
    "issues": [],
    "metrics": {
      "complexity": 2,
      "estimatedDuration": 15.5,
      "resourceUsage": "low"
    }
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "AI system not initialized"
}
```

**cURL示例**:
```bash
curl -X POST http://localhost:3000/api/system/analyze-workflow \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "wf_123",
      "name": "Test Workflow",
      "nodes": [...],
      "edges": [...]
    }
  }'
```

---

## 📊 数据模型

### SystemStatus

```typescript
interface SystemStatus {
  healthy: boolean;
  features: {
    distributed: { enabled: boolean; status: string };
    plugins: { enabled: boolean; count: number };
    ai: { enabled: boolean; status: string };
    rbac: { enabled: boolean; roles: number };
    audit: { enabled: boolean; logs: number };
  };
  performance: {
    uptime: number;
    memory: { used: number; total: number };
    cpu: number;
  };
}
```

### Plugin

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
  author?: string;
  nodes?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  permissions?: string[];
}
```

### AIAnalysisResult

```typescript
interface AIAnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  suggestions: Array<{
    type: 'optimization' | 'performance' | 'security' | 'best-practice';
    severity: 'low' | 'medium' | 'high';
    nodeId?: string;
    title: string;
    description: string;
    impact?: string;
  }>;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    nodeId?: string;
  }>;
  metrics?: {
    complexity: number;
    estimatedDuration: number;
    resourceUsage: 'low' | 'medium' | 'high';
  };
}
```

---

## ⚠️ 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误消息",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional info"
  }
}
```

### 常见错误码

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未认证或令牌无效 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

### 错误处理示例

```typescript
try {
  const response = await fetch('/api/system/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API错误:', error.error);
    
    if (error.code === 'UNAUTHORIZED') {
      // 处理认证错误
      redirectToLogin();
    }
  }
  
  const data = await response.json();
  return data;
  
} catch (error) {
  console.error('网络错误:', error);
}
```

---

## 💻 使用示例

### JavaScript/TypeScript

```typescript
// 系统状态监控类
class SystemMonitor {
  private baseUrl = 'http://localhost:3000/api/system';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // 获取系统状态
  async getStatus() {
    return this.request('/status');
  }

  // 获取统计信息
  async getStats() {
    return this.request('/stats');
  }

  // 检查健康状态
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  // 获取插件列表
  async getPlugins() {
    return this.request('/plugins');
  }

  // 激活插件
  async activatePlugin(pluginId: string) {
    return this.request(`/plugins/${pluginId}/activate`, {
      method: 'POST',
    });
  }

  // AI分析工作流
  async analyzeWorkflow(workflow: any) {
    return this.request('/analyze-workflow', {
      method: 'POST',
      body: JSON.stringify({ workflow }),
    });
  }
}

// 使用示例
const monitor = new SystemMonitor('your-jwt-token');

// 获取状态
const status = await monitor.getStatus();
console.log('系统健康:', status.data.healthy);
console.log('插件数量:', status.data.features.plugins.count);

// 分析工作流
const analysis = await monitor.analyzeWorkflow({
  id: 'wf_123',
  name: 'Test',
  nodes: [...],
  edges: [...],
});
console.log('AI建议:', analysis.data.suggestions);
```

### Python

```python
import requests
from typing import Dict, Any

class SystemMonitor:
    def __init__(self, base_url: str, token: str):
        self.base_url = f"{base_url}/api/system"
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def get_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        response = requests.get(
            f"{self.base_url}/status",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        response = requests.get(
            f"{self.base_url}/stats",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def check_health(self) -> Dict[str, Any]:
        """健康检查（无需认证）"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()
    
    def get_plugins(self) -> Dict[str, Any]:
        """获取插件列表"""
        response = requests.get(
            f"{self.base_url}/plugins",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def activate_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """激活插件"""
        response = requests.post(
            f"{self.base_url}/plugins/{plugin_id}/activate",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def analyze_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """AI分析工作流"""
        response = requests.post(
            f"{self.base_url}/analyze-workflow",
            headers=self.headers,
            json={"workflow": workflow}
        )
        response.raise_for_status()
        return response.json()

# 使用示例
monitor = SystemMonitor("http://localhost:3000", "your-jwt-token")

# 获取状态
status = monitor.get_status()
print(f"系统健康: {status['data']['healthy']}")

# 健康检查
health = monitor.check_health()
print(f"状态: {health['status']}")

# 获取插件
plugins = monitor.get_plugins()
for plugin in plugins['data']:
    print(f"插件: {plugin['name']} - {plugin['status']}")
```

### cURL脚本

```bash
#!/bin/bash

# 配置
BASE_URL="http://localhost:3000/api/system"
TOKEN="your-jwt-token"

# 获取系统状态
echo "=== 系统状态 ==="
curl -s -X GET "$BASE_URL/status" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 获取统计信息
echo -e "\n=== 系统统计 ==="
curl -s -X GET "$BASE_URL/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 健康检查
echo -e "\n=== 健康检查 ==="
curl -s -X GET "$BASE_URL/health" | jq '.'

# 获取插件列表
echo -e "\n=== 插件列表 ==="
curl -s -X GET "$BASE_URL/plugins" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🔄 实时监控示例

### WebSocket + 轮询

```typescript
class RealTimeMonitor {
  private monitor: SystemMonitor;
  private interval: NodeJS.Timeout | null = null;

  constructor(token: string) {
    this.monitor = new SystemMonitor(token);
  }

  // 开始监控
  start(callback: (status: any) => void, intervalMs = 5000) {
    this.interval = setInterval(async () => {
      try {
        const status = await this.monitor.getStatus();
        callback(status.data);
      } catch (error) {
        console.error('监控失败:', error);
      }
    }, intervalMs);
  }

  // 停止监控
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// 使用
const rtMonitor = new RealTimeMonitor('your-token');

rtMonitor.start((status) => {
  console.log('系统更新:', {
    健康状态: status.healthy,
    运行时间: `${Math.floor(status.performance.uptime / 60)}分钟`,
    内存使用: `${status.performance.memory.used}MB`,
  });
});

// 稍后停止
// rtMonitor.stop();
```

---

## 📚 最佳实践

### 1. 错误重试

```typescript
async function requestWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// 使用
const status = await requestWithRetry(() => monitor.getStatus());
```

### 2. 响应缓存

```typescript
class CachedMonitor extends SystemMonitor {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 30000; // 30秒

  async getStatus() {
    const cached = this.cache.get('status');
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await super.getStatus();
    this.cache.set('status', { data, timestamp: Date.now() });
    return data;
  }
}
```

### 3. 批量操作

```typescript
async function batchActivatePlugins(
  monitor: SystemMonitor,
  pluginIds: string[]
) {
  const results = await Promise.allSettled(
    pluginIds.map(id => monitor.activatePlugin(id))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  return { succeeded: succeeded.length, failed: failed.length };
}
```

---

## 🔗 相关文档

- [系统集成使用指南](./系统集成使用指南.md)
- [长期愿景功能实现指南](./长期愿景功能实现指南.md)
- [部署指南](./DEPLOYMENT.md)

---

**版本**: 2.0.0  
**更新日期**: 2025年1月4日  
**维护团队**: SHENJI Team
