# Week 4: 工作流引擎完善计划

**目标**: 完善工作流引擎，为前端可视化编辑器做准备  
**时间**: Week 4  
**当前进度**: 核心组件已完成，待添加高级功能  
**创建时间**: 2025-01-04

---

## 📊 当前成果

### ✅ 已完成核心组件
1. **NodeRegistryV2** - 节点注册管理
   - 节点注册/注销
   - 节点元数据管理
   - 节点执行
   - 示例验证

2. **ExecutionEngineV2** - 执行引擎
   - 工作流执行
   - 依赖解析
   - 并行执行
   - 错误处理

3. **DataBlock** - 数据块管理
   - 数据存储
   - 类型验证
   - 元数据管理

4. **DependencyGraph** - 依赖图
   - 拓扑排序
   - 循环检测
   - 依赖分析

5. **ParallelExecutor** - 并行执行器
   - 并发控制
   - 任务调度
   - 错误处理

6. **支持服务**
   - CacheManager - 缓存管理
   - TimeoutController - 超时控制
   - TaskQueue - 任务队列
   - DirtyTracker - 变更追踪
   - ExecutionStats - 执行统计

### ✅ 测试状态
- **513/513 测试通过（100%）**
- 测试覆盖率报告已生成
- PluginSandbox问题已修复

---

## 🎯 本周目标

### 优先级P0 - 工作流定义与存储
1. **工作流JSON格式定义** (1天)
   - 定义标准工作流JSON Schema
   - 包含节点、连接、配置等信息
   - 支持版本控制

2. **工作流存储API** (1天)
   - 保存工作流
   - 加载工作流
   - 列表查询
   - 删除工作流

3. **工作流验证** (0.5天)
   - JSON Schema验证
   - 节点存在性验证
   - 连接有效性验证
   - 循环依赖检测

### 优先级P1 - 执行历史与监控
4. **执行历史记录** (1天)
   - 记录每次执行
   - 保存执行结果
   - 错误日志记录
   - 性能指标

5. **执行监控** (0.5天)
   - 实时执行状态
   - 进度反馈
   - 资源使用监控

### 优先级P2 - 高级功能
6. **错误回滚机制** (1天)
   - 事务性执行
   - 失败回滚
   - 补偿操作

7. **断点续传** (1天)
   - 保存执行状态
   - 恢复执行
   - 跳过已完成节点

---

## 📋 详细任务清单

### Task 1: 工作流JSON格式定义

#### 目标
定义标准的工作流描述格式，支持节点、连接、配置等完整信息。

#### 工作流JSON Schema
```typescript
interface WorkflowDefinition {
  id: string;                    // 工作流ID
  name: string;                  // 工作流名称
  version: string;               // 版本号
  description?: string;          // 描述
  author?: string;               // 作者
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
  
  // 节点定义
  nodes: Array<{
    id: string;                  // 节点实例ID
    type: string;                // 节点类型（对应节点metadata.id）
    label?: string;              // 显示名称
    position: {                  // 位置（前端用）
      x: number;
      y: number;
    };
    config: Record<string, any>; // 节点配置
    inputs: Record<string, {     // 输入映射
      from: string;              // 来源节点ID
      output: string;            // 来源节点的输出名
    }>;
  }>;
  
  // 连接定义
  edges: Array<{
    id: string;                  // 连接ID
    source: string;              // 源节点ID
    sourceOutput: string;        // 源输出名
    target: string;              // 目标节点ID
    targetInput: string;         // 目标输入名
    label?: string;              // 连接标签
  }>;
  
  // 全局配置
  settings?: {
    maxConcurrency?: number;     // 最大并发数
    timeout?: number;            // 超时时间
    retryPolicy?: {
      maxRetries: number;
      backoff: 'linear' | 'exponential';
    };
  };
  
  // 元数据
  metadata?: {
    tags?: string[];             // 标签
    category?: string;           // 分类
    isPublic?: boolean;          // 是否公开
  };
}
```

#### 实现文件
- `packages/backend/src/workflow/WorkflowDefinition.ts`
- `packages/backend/src/workflow/WorkflowSchema.json`

#### 验收标准
- ✅ 定义完整的TypeScript接口
- ✅ 提供JSON Schema验证
- ✅ 包含示例工作流
- ✅ 文档说明每个字段含义

---

### Task 2: 工作流存储API

#### 目标
实现工作流的CRUD操作API。

#### API设计

**1. 保存工作流**
```typescript
POST /api/workflows
Body: WorkflowDefinition

Response: {
  code: 200,
  message: "Workflow saved successfully",
  data: {
    id: string,
    version: string
  }
}
```

**2. 获取工作流**
```typescript
GET /api/workflows/:id

Response: {
  code: 200,
  data: WorkflowDefinition
}
```

**3. 列出工作流**
```typescript
GET /api/workflows?page=1&pageSize=20&tag=xxx&category=xxx

Response: {
  code: 200,
  data: {
    workflows: WorkflowDefinition[],
    total: number,
    page: number,
    pageSize: number
  }
}
```

**4. 更新工作流**
```typescript
PUT /api/workflows/:id
Body: Partial<WorkflowDefinition>

Response: {
  code: 200,
  message: "Workflow updated successfully"
}
```

**5. 删除工作流**
```typescript
DELETE /api/workflows/:id

Response: {
  code: 200,
  message: "Workflow deleted successfully"
}
```

#### 实现文件
- `packages/backend/src/workflow/WorkflowStorage.ts`
- `packages/backend/src/api/controllers/WorkflowController.ts`
- `packages/backend/src/api/routes/workflow.routes.ts`

#### 存储方案
**阶段1**: 文件存储
- 每个工作流一个JSON文件
- 存储在 `data/workflows/` 目录
- 使用工作流ID作为文件名

**阶段2**: 数据库存储（后期）
- 迁移到数据库
- 支持更复杂的查询
- 版本历史管理

#### 验收标准
- ✅ 完整的CRUD API
- ✅ 输入验证
- ✅ 错误处理
- ✅ 单元测试

---

### Task 3: 工作流验证

#### 目标
在保存和执行前验证工作流的正确性。

#### 验证规则

**1. Schema验证**
- JSON格式正确
- 必需字段存在
- 字段类型正确

**2. 节点验证**
- 节点类型存在（已注册）
- 节点配置有效
- 输入映射正确

**3. 连接验证**
- 源节点和目标节点存在
- 输出名和输入名匹配
- 类型兼容性检查

**4. 拓扑验证**
- 无循环依赖
- 有向无环图（DAG）
- 孤立节点检测

#### 实现文件
- `packages/backend/src/workflow/WorkflowValidator.ts`
- `packages/backend/src/workflow/__tests__/WorkflowValidator.test.ts`

#### 验收标准
- ✅ 完整的验证逻辑
- ✅ 清晰的错误消息
- ✅ 单元测试覆盖
- ✅ 性能优化

---

### Task 4: 执行历史记录

#### 目标
记录每次工作流执行的详细信息，用于调试和审计。

#### 数据结构
```typescript
interface ExecutionHistory {
  id: string;                    // 执行ID
  workflowId: string;            // 工作流ID
  workflowVersion: string;       // 工作流版本
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startTime: string;             // 开始时间
  endTime?: string;              // 结束时间
  duration?: number;             // 执行时长（ms）
  
  // 节点执行记录
  nodes: Array<{
    nodeId: string;              // 节点ID
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    startTime?: string;
    endTime?: string;
    duration?: number;
    inputs?: any;                // 输入数据
    outputs?: any;               // 输出数据
    error?: {
      code: string;
      message: string;
      stack?: string;
    };
    metrics?: {
      memoryUsed: number;
      cpuTime: number;
    };
  }>;
  
  // 整体指标
  metrics: {
    totalNodes: number;
    successNodes: number;
    failedNodes: number;
    totalDuration: number;
    peakMemory: number;
  };
  
  // 错误信息
  error?: {
    code: string;
    message: string;
    failedNodeId: string;
  };
  
  // 执行上下文
  context: {
    userId?: string;
    trigger: 'manual' | 'scheduled' | 'api' | 'webhook';
    environment: 'development' | 'staging' | 'production';
  };
}
```

#### 实现文件
- `packages/backend/src/workflow/ExecutionHistory.ts`
- `packages/backend/src/workflow/ExecutionHistoryStorage.ts`

#### 功能
1. **记录执行**
   - 开始执行时创建记录
   - 节点执行时更新记录
   - 完成时保存最终状态

2. **查询执行历史**
   - 按工作流ID查询
   - 按时间范围查询
   - 按状态过滤

3. **执行分析**
   - 性能统计
   - 错误分析
   - 趋势图表

#### 验收标准
- ✅ 完整的执行记录
- ✅ 高效的存储和查询
- ✅ API接口
- ✅ 单元测试

---

### Task 5: 执行监控

#### 目标
提供实时的工作流执行状态监控。

#### 功能需求

**1. 实时状态**
- 当前执行的节点
- 已完成的节点
- 等待执行的节点
- 执行进度百分比

**2. WebSocket推送**
```typescript
// 客户端订阅执行状态
ws.send({
  type: 'subscribe',
  executionId: 'exec-123'
});

// 服务器推送状态更新
{
  type: 'execution-status',
  executionId: 'exec-123',
  status: 'running',
  currentNode: 'node-2',
  progress: 0.5,
  completedNodes: ['node-1'],
  failedNodes: []
}
```

**3. 资源监控**
- CPU使用率
- 内存使用量
- 网络流量
- 执行队列长度

#### 实现文件
- `packages/backend/src/workflow/ExecutionMonitor.ts`
- `packages/backend/src/api/websocket/ExecutionWebSocket.ts`

#### 验收标准
- ✅ 实时状态推送
- ✅ WebSocket连接管理
- ✅ 资源监控
- ✅ 断线重连

---

### Task 6: 错误回滚机制

#### 目标
实现事务性执行，失败时能够回滚。

#### 设计思路

**1. 补偿操作**
每个节点定义补偿操作：
```typescript
interface Node {
  execute(): Promise<Result>;
  compensate(result: Result): Promise<void>; // 回滚操作
}
```

**2. 回滚策略**
- **失败即停止**: 遇到错误立即停止并回滚
- **尽力而为**: 继续执行其他节点，最后回滚失败的
- **忽略错误**: 标记错误但不回滚

**3. 回滚记录**
```typescript
interface RollbackHistory {
  executionId: string;
  rollbackTime: string;
  rollbackNodes: string[];      // 需要回滚的节点
  compensatedNodes: string[];   // 已补偿的节点
  status: 'success' | 'partial' | 'failed';
}
```

#### 实现文件
- `packages/backend/src/workflow/RollbackManager.ts`
- `packages/backend/src/nodes/BaseNode.ts` (添加compensate方法)

#### 验收标准
- ✅ 补偿操作定义
- ✅ 自动回滚触发
- ✅ 回滚历史记录
- ✅ 单元测试

---

### Task 7: 断点续传

#### 目标
支持从上次失败的地方继续执行工作流。

#### 功能需求

**1. 状态快照**
```typescript
interface ExecutionSnapshot {
  executionId: string;
  workflowId: string;
  timestamp: string;
  
  // 已完成的节点及其输出
  completedNodes: Map<string, {
    outputs: any;
    timestamp: string;
  }>;
  
  // 正在执行的节点
  runningNodes: string[];
  
  // 待执行的节点
  pendingNodes: string[];
}
```

**2. 恢复执行**
```typescript
// API
POST /api/executions/:id/resume

// 逻辑
- 加载执行快照
- 验证工作流未被修改
- 跳过已完成节点
- 从失败节点重新开始
```

**3. 清理策略**
- 自动清理过期快照
- 手动清理快照
- 保留N天的快照

#### 实现文件
- `packages/backend/src/workflow/ExecutionSnapshot.ts`
- `packages/backend/src/workflow/ExecutionResume.ts`

#### 验收标准
- ✅ 快照保存和加载
- ✅ 恢复执行逻辑
- ✅ 状态一致性验证
- ✅ 单元测试

---

## 📅 开发计划

### 第1天: 工作流定义与验证
- [ ] 定义WorkflowDefinition接口
- [ ] 创建JSON Schema
- [ ] 实现WorkflowValidator
- [ ] 编写示例工作流
- [ ] 单元测试

### 第2天: 存储API
- [ ] 实现WorkflowStorage
- [ ] 创建Controller和Routes
- [ ] 输入验证和错误处理
- [ ] 集成测试
- [ ] API文档

### 第3天: 执行历史
- [ ] 定义ExecutionHistory结构
- [ ] 实现存储逻辑
- [ ] 集成到ExecutionEngine
- [ ] 查询API
- [ ] 单元测试

### 第4天: 执行监控
- [ ] 实现ExecutionMonitor
- [ ] WebSocket服务
- [ ] 状态推送
- [ ] 前端示例
- [ ] 测试

### 第5天: 高级功能
- [ ] 错误回滚机制设计
- [ ] 断点续传实现
- [ ] 集成测试
- [ ] 文档更新

---

## ✅ 验收标准

### 功能完整性
- [ ] 工作流JSON格式定义完整
- [ ] 存储API全部实现
- [ ] 执行历史完整记录
- [ ] 实时监控正常工作
- [ ] 错误回滚能够执行
- [ ] 断点续传功能可用

### 代码质量
- [ ] 单元测试覆盖率>80%
- [ ] 集成测试通过
- [ ] TypeScript类型完整
- [ ] 代码注释清晰
- [ ] ESLint检查通过

### 文档完整性
- [ ] API文档完整
- [ ] 使用示例清晰
- [ ] 架构设计文档
- [ ] 故障排查指南

---

## 🎯 成功指标

1. **功能指标**
   - 支持完整的工作流CRUD
   - 执行历史100%记录
   - 实时监控延迟<100ms

2. **性能指标**
   - 工作流加载<50ms
   - 状态快照保存<100ms
   - 历史查询<200ms

3. **质量指标**
   - 测试覆盖率>85%
   - 无已知Bug
   - API响应时间<500ms

---

## 📚 参考资源

### 工作流引擎参考
- Airflow工作流定义
- n8n工作流JSON格式
- Node-RED工作流结构

### 技术文档
- ExecutionEngineV2源码
- NodeRegistryV2实现
- DataBlock设计

---

## 🚀 下一步

完成本周任务后，将进入Week 5-6：
- [ ] 前端可视化编辑器
- [ ] 节点拖拽
- [ ] 连线管理
- [ ] 配置面板

---

**创建时间**: 2025-01-04 12:15  
**责任人**: SHENJI Team  
**状态**: 📋 Ready to Start
