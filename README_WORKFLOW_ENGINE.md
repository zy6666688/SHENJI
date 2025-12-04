# 审计数智析 - 工作流引擎使用指南

## 🎯 概述

工作流引擎是审计数智析的核心模块，提供完整的工作流定义、执行、监控和管理能力。

### 核心特性

✅ **完整的工作流管理** - CRUD、查询、验证、导入导出  
✅ **实时执行监控** - 进度追踪、日志查看、性能指标  
✅ **执行历史记录** - 节点级追踪、检查点系统  
✅ **高级功能** - 智能回滚、断点续传、重试机制  
✅ **RESTful API** - 23个标准化API端点  
✅ **事件驱动** - WebSocket实时推送  

---

## 📦 快速开始

### 1. 安装依赖

```bash
cd packages/backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
vim .env
```

关键配置：
```env
# 工作流存储
WORKFLOW_STORAGE_DIR="./data/workflows"
EXECUTION_STORAGE_DIR="./data/executions"

# 监控配置
MONITOR_METRICS_INTERVAL=5000
```

### 3. 初始化数据目录

```bash
mkdir -p data/workflows
mkdir -p data/executions
```

### 4. 启动服务

```bash
npm run dev
```

### 5. 验证安装

```bash
# 检查工作流API
curl http://localhost:3000/api/v2/workflows/stats

# 检查执行API
curl http://localhost:3000/api/v2/executions/stats
```

---

## 📚 API使用指南

### 工作流管理

#### 创建工作流

```bash
curl -X POST http://localhost:3000/api/v2/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "资产盘点工作流",
    "description": "固定资产盘点流程",
    "nodes": [
      {
        "id": "node1",
        "type": "input",
        "name": "数据输入",
        "position": { "x": 100, "y": 100 }
      },
      {
        "id": "node2",
        "type": "process",
        "name": "数据处理",
        "position": { "x": 300, "y": 100 }
      },
      {
        "id": "node3",
        "type": "output",
        "name": "结果输出",
        "position": { "x": 500, "y": 100 }
      }
    ],
    "edges": [
      {
        "id": "edge1",
        "source": "node1",
        "target": "node2"
      },
      {
        "id": "edge2",
        "source": "node2",
        "target": "node3"
      }
    ],
    "metadata": {
      "tags": ["审计", "资产"],
      "category": "资产循环"
    }
  }'
```

#### 查询工作流列表

```bash
# 基础查询
curl http://localhost:3000/api/v2/workflows

# 高级筛选
curl "http://localhost:3000/api/v2/workflows?tags=审计&category=资产循环&page=1&pageSize=20"
```

#### 验证工作流

```bash
curl -X POST http://localhost:3000/api/v2/workflows/validate \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

#### 克隆工作流

```bash
curl -X POST http://localhost:3000/api/v2/workflows/{workflowId}/clone \
  -H "Content-Type: application/json" \
  -d '{"newName": "资产盘点工作流 v2"}'
```

---

### 执行管理

#### 创建执行

```bash
curl -X POST http://localhost:3000/api/v2/executions \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "workflow_123",
    "trigger": {
      "type": "manual",
      "userId": "user_456",
      "userName": "张三"
    },
    "context": {
      "environment": "production",
      "variables": {
        "department": "财务部",
        "year": 2024
      }
    }
  }'
```

#### 查询执行列表

```bash
# 所有执行
curl http://localhost:3000/api/v2/executions

# 按状态筛选
curl "http://localhost:3000/api/v2/executions?status=completed,running"

# 按工作流筛选
curl "http://localhost:3000/api/v2/executions?workflowId=workflow_123"

# 按时间范围筛选
curl "http://localhost:3000/api/v2/executions?startTimeFrom=1704355200000&startTimeTo=1704441600000"
```

#### 获取执行详情

```bash
curl http://localhost:3000/api/v2/executions/{executionId}
```

---

### 实时监控

#### 获取执行进度

```bash
curl http://localhost:3000/api/v2/executions/{executionId}/progress
```

响应示例：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "executionId": "exec_123",
    "totalNodes": 10,
    "completedNodes": 6,
    "failedNodes": 0,
    "runningNodes": 1,
    "pendingNodes": 3,
    "progress": 0.6,
    "estimatedTimeRemaining": 45000
  }
}
```

#### 获取执行日志

```bash
# 最近100条
curl "http://localhost:3000/api/v2/executions/{executionId}/logs?limit=100"
```

#### 获取性能指标

```bash
curl http://localhost:3000/api/v2/executions/{executionId}/metrics
```

---

### 高级功能

#### 回滚执行

```bash
# 获取可用回滚点
curl http://localhost:3000/api/v2/executions/{executionId}/rollback-points

# 执行回滚
curl -X POST http://localhost:3000/api/v2/executions/{executionId}/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "targetNodeId": "node_5",
    "force": false
  }'
```

#### 断点续传

```bash
curl -X POST http://localhost:3000/api/v2/executions/{executionId}/resume
```

#### 取消执行

```bash
curl -X POST http://localhost:3000/api/v2/executions/{executionId}/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "用户取消操作"
  }'
```

---

## 🔧 SDK使用示例

### TypeScript/JavaScript

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v2';

// 工作流客户端
class WorkflowClient {
  async create(workflow: any) {
    const response = await axios.post(`${API_BASE}/workflows`, workflow);
    return response.data;
  }

  async list(query: any = {}) {
    const response = await axios.get(`${API_BASE}/workflows`, { params: query });
    return response.data;
  }

  async validate(workflow: any) {
    const response = await axios.post(`${API_BASE}/workflows/validate`, workflow);
    return response.data;
  }
}

// 执行客户端
class ExecutionClient {
  async create(workflowId: string, trigger: any, context?: any) {
    const response = await axios.post(`${API_BASE}/executions`, {
      workflowId,
      trigger,
      context
    });
    return response.data;
  }

  async getProgress(executionId: string) {
    const response = await axios.get(`${API_BASE}/executions/${executionId}/progress`);
    return response.data;
  }

  async rollback(executionId: string, targetNodeId: string) {
    const response = await axios.post(`${API_BASE}/executions/${executionId}/rollback`, {
      targetNodeId
    });
    return response.data;
  }
}

// 使用示例
const workflowClient = new WorkflowClient();
const executionClient = new ExecutionClient();

// 创建并执行工作流
async function runWorkflow() {
  // 1. 创建工作流
  const workflow = await workflowClient.create({
    name: '测试工作流',
    nodes: [...],
    edges: [...]
  });

  // 2. 启动执行
  const execution = await executionClient.create(
    workflow.data.id,
    { type: 'manual', userId: 'user123' }
  );

  // 3. 监控进度
  const progress = await executionClient.getProgress(execution.data.id);
  console.log(`进度: ${progress.data.progress * 100}%`);
}
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api/v2'

class WorkflowClient:
    def create(self, workflow):
        response = requests.post(f'{API_BASE}/workflows', json=workflow)
        return response.json()

    def list(self, query=None):
        response = requests.get(f'{API_BASE}/workflows', params=query or {})
        return response.json()

class ExecutionClient:
    def create(self, workflow_id, trigger, context=None):
        response = requests.post(f'{API_BASE}/executions', json={
            'workflowId': workflow_id,
            'trigger': trigger,
            'context': context
        })
        return response.json()

    def get_progress(self, execution_id):
        response = requests.get(f'{API_BASE}/executions/{execution_id}/progress')
        return response.json()

# 使用示例
workflow_client = WorkflowClient()
execution_client = ExecutionClient()

# 创建工作流
workflow = workflow_client.create({
    'name': '测试工作流',
    'nodes': [...],
    'edges': [...]
})

# 启动执行
execution = execution_client.create(
    workflow['data']['id'],
    {'type': 'manual', 'userId': 'user123'}
)

# 获取进度
progress = execution_client.get_progress(execution['data']['id'])
print(f"进度: {progress['data']['progress'] * 100}%")
```

---

## 🎨 工作流定义规范

### 基础结构

```typescript
interface WorkflowDefinition {
  id: string;                    // 唯一标识
  name: string;                  // 工作流名称
  description?: string;          // 描述
  nodes: Node[];                 // 节点列表
  edges: Edge[];                 // 连接列表
  settings?: WorkflowSettings;   // 全局设置
  metadata?: WorkflowMetadata;   // 元数据
  version: WorkflowVersion;      // 版本信息
}
```

### 节点定义

```typescript
interface Node {
  id: string;                    // 节点ID
  type: string;                  // 节点类型
  name: string;                  // 节点名称
  position: { x: number; y: number };  // 位置
  config?: any;                  // 节点配置
  inputs?: Record<string, any>;  // 输入端口
  outputs?: Record<string, any>; // 输出端口
  enabled?: boolean;             // 是否启用
}
```

### 连接定义

```typescript
interface Edge {
  id: string;                    // 连接ID
  source: string;                // 源节点ID
  target: string;                // 目标节点ID
  sourceHandle?: string;         // 源端口
  targetHandle?: string;         // 目标端口
  label?: string;                // 标签
  type?: 'data' | 'control' | 'error';  // 类型
  enabled?: boolean;             // 是否启用
}
```

### 完整示例

```json
{
  "id": "wf_audit_asset_20250104",
  "name": "资产盘点工作流",
  "description": "固定资产盘点流程",
  "version": {
    "version": "1.0.0"
  },
  "nodes": [
    {
      "id": "input_1",
      "type": "data-input",
      "name": "读取资产清单",
      "position": { "x": 100, "y": 100 },
      "config": {
        "dataSource": "database",
        "query": "SELECT * FROM assets WHERE status='active'"
      }
    },
    {
      "id": "validate_1",
      "type": "data-validator",
      "name": "数据验证",
      "position": { "x": 300, "y": 100 },
      "config": {
        "rules": [
          { "field": "assetCode", "type": "required" },
          { "field": "value", "type": "number", "min": 0 }
        ]
      }
    },
    {
      "id": "process_1",
      "type": "data-processor",
      "name": "盘点处理",
      "position": { "x": 500, "y": 100 },
      "config": {
        "operation": "asset-check",
        "parameters": {
          "checkType": "physical",
          "department": "all"
        }
      }
    },
    {
      "id": "output_1",
      "type": "report-generator",
      "name": "生成报告",
      "position": { "x": 700, "y": 100 },
      "config": {
        "template": "asset-report-template",
        "format": "pdf"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "input_1",
      "target": "validate_1",
      "type": "data"
    },
    {
      "id": "edge_2",
      "source": "validate_1",
      "target": "process_1",
      "type": "data"
    },
    {
      "id": "edge_3",
      "source": "process_1",
      "target": "output_1",
      "type": "data"
    }
  ],
  "settings": {
    "maxConcurrency": 5,
    "timeout": 300000,
    "errorHandling": "stop",
    "retryPolicy": {
      "maxRetries": 3,
      "backoff": "exponential",
      "initialDelay": 1000
    }
  },
  "metadata": {
    "tags": ["审计", "资产", "盘点"],
    "category": "资产循环",
    "author": "财务部",
    "published": true
  }
}
```

---

## 🔍 监控与调试

### 实时监控

使用WebSocket订阅执行事件：

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  // 订阅特定执行
  ws.send(JSON.stringify({
    type: 'subscribe',
    executionId: 'exec_123'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch(event.type) {
    case 'execution:started':
      console.log('执行开始:', event.data);
      break;
    
    case 'node:completed':
      console.log('节点完成:', event.data);
      break;
    
    case 'progress:updated':
      console.log('进度更新:', event.data.progress);
      break;
    
    case 'execution:completed':
      console.log('执行完成:', event.data);
      break;
  }
});
```

### 日志查看

```bash
# 查看最近日志
curl "http://localhost:3000/api/v2/executions/{executionId}/logs?limit=50"

# 实时tail日志 (通过WebSocket)
wscat -c ws://localhost:3001/ws
> {"type":"subscribe:logs","executionId":"exec_123"}
```

### 性能分析

```bash
# 获取性能指标
curl http://localhost:3000/api/v2/executions/{executionId}/metrics

# 响应示例
{
  "cpu": { "usage": 45.2, "system": 20.1, "user": 25.1 },
  "memory": { "used": 524288000, "total": 8589934592, "percentage": 6.1 },
  "duration": 12500,
  "throughput": 2.4
}
```

---

## 🐛 故障排查

### 常见问题

#### 1. 工作流验证失败

```bash
# 检查验证结果
curl -X POST http://localhost:3000/api/v2/workflows/validate \
  -H "Content-Type: application/json" \
  -d @workflow.json

# 响应会包含详细错误信息
{
  "valid": false,
  "errors": [
    {
      "type": "EDGE_VALIDATION",
      "severity": "error",
      "message": "Edge target node not found: node_999"
    }
  ]
}
```

#### 2. 执行失败

```bash
# 查看执行详情
curl http://localhost:3000/api/v2/executions/{executionId}

# 查看失败节点
{
  "error": {
    "message": "Node execution failed",
    "failedNodeId": "node_5",
    "failedNodeName": "数据处理"
  }
}
```

#### 3. 性能问题

```bash
# 检查执行统计
curl http://localhost:3000/api/v2/executions/stats

# 查看慢执行
curl "http://localhost:3000/api/v2/executions?sortBy=duration&sortOrder=desc&pageSize=10"
```

---

## 📖 最佳实践

### 1. 工作流设计

- ✅ 保持节点功能单一
- ✅ 使用有意义的节点名称
- ✅ 添加详细的描述和注释
- ✅ 合理设置超时和重试
- ✅ 使用标签和分类组织工作流

### 2. 执行管理

- ✅ 为每个执行提供清晰的触发信息
- ✅ 在关键节点设置检查点
- ✅ 定期清理历史记录
- ✅ 监控执行性能指标
- ✅ 建立告警机制

### 3. 错误处理

- ✅ 配置合理的重试策略
- ✅ 使用回滚机制保护数据
- ✅ 记录详细的错误日志
- ✅ 设置错误通知
- ✅ 定期review失败执行

### 4. 性能优化

- ✅ 使用缓存减少重复计算
- ✅ 控制并发执行数量
- ✅ 优化节点执行逻辑
- ✅ 定期清理旧数据
- ✅ 监控资源使用情况

---

## 📚 相关文档

- [完整API文档](./API_REFERENCE.md)
- [部署指南](./DEPLOYMENT.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [故障排查指南](./TROUBLESHOOTING.md)

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📄 许可证

MIT License

---

**最后更新**: 2025年1月4日  
**版本**: 1.0.0  
**维护**: SHENJI Team
