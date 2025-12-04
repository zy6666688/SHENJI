/**
 * WorkflowDefinition - 工作流定义
 * Week 4: 工作流引擎完善
 * 
 * 定义标准的工作流描述格式，包含节点、连接、配置等完整信息
 * 
 * @module workflow/WorkflowDefinition
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

/**
 * 节点位置（前端可视化用）
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * 输入映射配置
 * 定义节点输入从哪个节点的哪个输出获取数据
 */
export interface InputMapping {
  from: string;      // 来源节点ID
  output: string;    // 来源节点的输出名称
}

/**
 * 工作流节点定义
 * 描述工作流中的单个节点实例
 */
export interface WorkflowNode {
  /** 节点实例ID（在工作流中唯一） */
  id: string;
  
  /** 节点类型（对应节点类的metadata.id） */
  type: string;
  
  /** 显示名称（可选，用于前端展示） */
  label?: string;
  
  /** 节点描述 */
  description?: string;
  
  /** 节点位置（用于前端可视化） */
  position: NodePosition;
  
  /** 节点配置参数 */
  config: Record<string, any>;
  
  /** 输入映射（定义每个输入从哪获取数据） */
  inputs: Record<string, InputMapping>;
  
  /** 是否启用该节点 */
  enabled?: boolean;
  
  /** 节点颜色（前端用） */
  color?: string;
  
  /** 节点图标（前端用） */
  icon?: string;
}

/**
 * 工作流连接（边）定义
 * 描述节点之间的数据流向
 */
export interface WorkflowEdge {
  /** 连接ID */
  id: string;
  
  /** 源节点ID */
  source: string;
  
  /** 源节点的输出名称 */
  sourceOutput: string;
  
  /** 目标节点ID */
  target: string;
  
  /** 目标节点的输入名称 */
  targetInput: string;
  
  /** 连接标签（可选） */
  label?: string;
  
  /** 连接类型（默认为数据流） */
  type?: 'data' | 'control' | 'error';
  
  /** 是否启用该连接 */
  enabled?: boolean;
}

/**
 * 重试策略配置
 */
export interface RetryPolicy {
  /** 最大重试次数 */
  maxRetries: number;
  
  /** 退避策略 */
  backoff: 'linear' | 'exponential' | 'fixed';
  
  /** 初始延迟（毫秒） */
  initialDelay?: number;
  
  /** 最大延迟（毫秒） */
  maxDelay?: number;
  
  /** 可重试的错误码 */
  retryableErrors?: string[];
}

/**
 * 工作流全局设置
 */
export interface WorkflowSettings {
  /** 最大并发节点数 */
  maxConcurrency?: number;
  
  /** 全局超时时间（毫秒） */
  timeout?: number;
  
  /** 重试策略 */
  retryPolicy?: RetryPolicy;
  
  /** 是否启用缓存 */
  enableCache?: boolean;
  
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  
  /** 错误处理策略 */
  errorHandling?: 'stop' | 'continue' | 'rollback';
  
  /** 是否记录详细日志 */
  verboseLogging?: boolean;
  
  /** 是否启用断点续传 */
  enableCheckpoint?: boolean;
  
  /** 检查点间隔（节点数） */
  checkpointInterval?: number;
}

/**
 * 工作流元数据
 */
export interface WorkflowMetadata {
  /** 标签 */
  tags?: string[];
  
  /** 分类 */
  category?: string;
  
  /** 是否公开 */
  isPublic?: boolean;
  
  /** 使用次数 */
  usageCount?: number;
  
  /** 平均执行时间（毫秒） */
  avgExecutionTime?: number;
  
  /** 成功率 */
  successRate?: number;
  
  /** 最后执行时间 */
  lastExecutedAt?: string;
  
  /** 自定义元数据 */
  custom?: Record<string, any>;
}

/**
 * 工作流版本信息
 */
export interface WorkflowVersion {
  /** 版本号（遵循语义化版本） */
  version: string;
  
  /** 变更日志 */
  changelog?: string;
  
  /** 是否为草稿 */
  isDraft?: boolean;
  
  /** 父版本 */
  parentVersion?: string;
}

/**
 * 工作流定义
 * 完整描述一个可执行的工作流
 */
export interface WorkflowDefinition {
  /** 工作流唯一ID */
  id: string;
  
  /** 工作流名称 */
  name: string;
  
  /** 版本信息 */
  version: WorkflowVersion;
  
  /** 工作流描述 */
  description?: string;
  
  /** 作者 */
  author?: string;
  
  /** 创建时间（ISO 8601格式） */
  createdAt: string;
  
  /** 最后更新时间（ISO 8601格式） */
  updatedAt: string;
  
  /** 节点列表 */
  nodes: WorkflowNode[];
  
  /** 连接列表 */
  edges: WorkflowEdge[];
  
  /** 全局设置 */
  settings?: WorkflowSettings;
  
  /** 元数据 */
  metadata?: WorkflowMetadata;
  
  /** 工作流状态 */
  status?: 'active' | 'inactive' | 'deprecated';
  
  /** 是否已发布 */
  isPublished?: boolean;
}

/**
 * 工作流模板
 * 用于快速创建常见工作流
 */
export interface WorkflowTemplate {
  /** 模板ID */
  id: string;
  
  /** 模板名称 */
  name: string;
  
  /** 模板描述 */
  description: string;
  
  /** 模板分类 */
  category: string;
  
  /** 模板定义（去除了具体的ID和时间戳） */
  template: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>;
  
  /** 模板缩略图 */
  thumbnail?: string;
  
  /** 使用次数 */
  usageCount: number;
}

/**
 * 工作流验证结果
 */
export interface WorkflowValidationResult {
  /** 是否有效 */
  valid: boolean;
  
  /** 错误列表 */
  errors: Array<{
    code: string;
    message: string;
    nodeId?: string;
    edgeId?: string;
    field?: string;
  }>;
  
  /** 警告列表 */
  warnings: Array<{
    code: string;
    message: string;
    nodeId?: string;
    suggestion?: string;
  }>;
  
  /** 统计信息 */
  stats: {
    totalNodes: number;
    totalEdges: number;
    startNodes: number;     // 入度为0的节点
    endNodes: number;       // 出度为0的节点
    maxDepth: number;       // 最大深度
    estimatedExecutionTime?: number;
  };
}

/**
 * 工作流辅助函数
 */
export class WorkflowHelper {
  /**
   * 创建新的工作流定义
   * 
   * @param name 工作流名称
   * @param description 工作流描述
   * @returns 新的工作流定义
   */
  static createNew(name: string, description?: string): WorkflowDefinition {
    const now = new Date().toISOString();
    
    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      version: {
        version: '1.0.0',
        isDraft: true,
      },
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
      settings: {
        maxConcurrency: 5,
        timeout: 300000, // 5分钟
        enableCache: true,
        cacheTTL: 3600000, // 1小时
        errorHandling: 'stop',
        verboseLogging: false,
        enableCheckpoint: true,
        checkpointInterval: 5,
      },
      metadata: {
        tags: [],
        isPublic: false,
        usageCount: 0,
      },
      status: 'active',
      isPublished: false,
    };
  }
  
  /**
   * 添加节点到工作流
   * 
   * @param workflow 工作流定义
   * @param node 节点配置
   * @returns 更新后的工作流
   */
  static addNode(
    workflow: WorkflowDefinition,
    node: Omit<WorkflowNode, 'id'>
  ): WorkflowDefinition {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ...workflow,
      nodes: [
        ...workflow.nodes,
        {
          ...node,
          id: nodeId,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * 添加连接到工作流
   * 
   * @param workflow 工作流定义
   * @param edge 连接配置
   * @returns 更新后的工作流
   */
  static addEdge(
    workflow: WorkflowDefinition,
    edge: Omit<WorkflowEdge, 'id'>
  ): WorkflowDefinition {
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ...workflow,
      edges: [
        ...workflow.edges,
        {
          ...edge,
          id: edgeId,
          type: edge.type || 'data',
          enabled: edge.enabled !== false,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * 删除节点（同时删除相关连接）
   * 
   * @param workflow 工作流定义
   * @param nodeId 节点ID
   * @returns 更新后的工作流
   */
  static removeNode(
    workflow: WorkflowDefinition,
    nodeId: string
  ): WorkflowDefinition {
    return {
      ...workflow,
      nodes: workflow.nodes.filter(n => n.id !== nodeId),
      edges: workflow.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      ),
      updatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * 删除连接
   * 
   * @param workflow 工作流定义
   * @param edgeId 连接ID
   * @returns 更新后的工作流
   */
  static removeEdge(
    workflow: WorkflowDefinition,
    edgeId: string
  ): WorkflowDefinition {
    return {
      ...workflow,
      edges: workflow.edges.filter(e => e.id !== edgeId),
      updatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * 获取节点的所有输入连接
   * 
   * @param workflow 工作流定义
   * @param nodeId 节点ID
   * @returns 输入连接列表
   */
  static getNodeInputs(
    workflow: WorkflowDefinition,
    nodeId: string
  ): WorkflowEdge[] {
    return workflow.edges.filter(e => e.target === nodeId);
  }
  
  /**
   * 获取节点的所有输出连接
   * 
   * @param workflow 工作流定义
   * @param nodeId 节点ID
   * @returns 输出连接列表
   */
  static getNodeOutputs(
    workflow: WorkflowDefinition,
    nodeId: string
  ): WorkflowEdge[] {
    return workflow.edges.filter(e => e.source === nodeId);
  }
  
  /**
   * 获取起始节点（没有输入的节点）
   * 
   * @param workflow 工作流定义
   * @returns 起始节点列表
   */
  static getStartNodes(workflow: WorkflowDefinition): WorkflowNode[] {
    const nodesWithInputs = new Set(workflow.edges.map(e => e.target));
    return workflow.nodes.filter(n => !nodesWithInputs.has(n.id));
  }
  
  /**
   * 获取结束节点（没有输出的节点）
   * 
   * @param workflow 工作流定义
   * @returns 结束节点列表
   */
  static getEndNodes(workflow: WorkflowDefinition): WorkflowNode[] {
    const nodesWithOutputs = new Set(workflow.edges.map(e => e.source));
    return workflow.nodes.filter(n => !nodesWithOutputs.has(n.id));
  }
  
  /**
   * 克隆工作流（创建副本）
   * 
   * @param workflow 原工作流
   * @param newName 新名称
   * @returns 新工作流
   */
  static clone(
    workflow: WorkflowDefinition,
    newName?: string
  ): WorkflowDefinition {
    const now = new Date().toISOString();
    
    return {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName || `${workflow.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      version: {
        ...workflow.version,
        version: '1.0.0',
        isDraft: true,
      },
      metadata: {
        ...workflow.metadata,
        usageCount: 0,
        lastExecutedAt: undefined,
      },
      isPublished: false,
    };
  }
}

/**
 * 导出类型定义
 */
export default WorkflowDefinition;
