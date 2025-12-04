/**
 * WorkflowValidator - 工作流验证器
 * Week 4: 工作流引擎完善
 * 
 * 验证工作流定义的正确性，包括：
 * 1. Schema验证 - JSON格式和必需字段
 * 2. 节点验证 - 节点类型和配置
 * 3. 连接验证 - 连接有效性和类型匹配
 * 4. 拓扑验证 - 循环依赖和DAG检测
 * 
 * @module workflow/WorkflowValidator
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowValidationResult,
} from './WorkflowDefinition';

/**
 * 验证错误
 */
export class ValidationError {
  constructor(
    public code: string,
    public message: string,
    public nodeId?: string,
    public edgeId?: string,
    public field?: string
  ) {}
}

/**
 * 验证警告
 */
export class ValidationWarning {
  constructor(
    public code: string,
    public message: string,
    public nodeId?: string,
    public suggestion?: string
  ) {}
}

/**
 * 工作流验证器
 */
export class WorkflowValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private nodeRegistry: Map<string, any> = new Map();
  
  /**
   * 设置节点注册表
   * 用于验证节点类型是否存在
   * 
   * @param registry 节点注册表
   */
  setNodeRegistry(registry: Map<string, any>): void {
    this.nodeRegistry = registry;
  }
  
  /**
   * 验证工作流定义
   * 
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  validate(workflow: WorkflowDefinition): WorkflowValidationResult {
    this.errors = [];
    this.warnings = [];
    
    // 1. Schema验证
    this.validateSchema(workflow);
    
    // 2. 节点验证
    this.validateNodes(workflow.nodes);
    
    // 3. 连接验证
    this.validateEdges(workflow.edges, workflow.nodes);
    
    // 4. 拓扑验证
    this.validateTopology(workflow);
    
    // 5. 配置验证
    this.validateSettings(workflow);
    
    // 计算统计信息
    const stats = this.calculateStats(workflow);
    
    return {
      valid: this.errors.length === 0,
      errors: this.errors.map(e => ({
        code: e.code,
        message: e.message,
        nodeId: e.nodeId,
        edgeId: e.edgeId,
        field: e.field,
      })),
      warnings: this.warnings.map(w => ({
        code: w.code,
        message: w.message,
        nodeId: w.nodeId,
        suggestion: w.suggestion,
      })),
      stats,
    };
  }
  
  /**
   * 验证Schema（基础结构）
   * 
   * @param workflow 工作流定义
   */
  private validateSchema(workflow: WorkflowDefinition): void {
    // 验证必需字段
    if (!workflow.id) {
      this.errors.push(new ValidationError(
        'MISSING_FIELD',
        'Workflow ID is required',
        undefined,
        undefined,
        'id'
      ));
    }
    
    if (!workflow.name || workflow.name.trim() === '') {
      this.errors.push(new ValidationError(
        'MISSING_FIELD',
        'Workflow name is required',
        undefined,
        undefined,
        'name'
      ));
    }
    
    if (!workflow.version || !workflow.version.version) {
      this.errors.push(new ValidationError(
        'MISSING_FIELD',
        'Workflow version is required',
        undefined,
        undefined,
        'version'
      ));
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.errors.push(new ValidationError(
        'INVALID_SCHEMA',
        'Nodes must be an array',
        undefined,
        undefined,
        'nodes'
      ));
    }
    
    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      this.errors.push(new ValidationError(
        'INVALID_SCHEMA',
        'Edges must be an array',
        undefined,
        undefined,
        'edges'
      ));
    }
    
    // 验证版本号格式
    if (workflow.version?.version && !this.isValidVersion(workflow.version.version)) {
      this.warnings.push(new ValidationWarning(
        'INVALID_VERSION_FORMAT',
        `Version "${workflow.version.version}" does not follow semantic versioning`,
        undefined,
        'Use semantic versioning format (e.g., 1.0.0)'
      ));
    }
  }
  
  /**
   * 验证节点
   * 
   * @param nodes 节点列表
   */
  private validateNodes(nodes: WorkflowNode[]): void {
    const nodeIds = new Set<string>();
    
    for (const node of nodes) {
      // 验证节点ID唯一性
      if (nodeIds.has(node.id)) {
        this.errors.push(new ValidationError(
          'DUPLICATE_NODE_ID',
          `Duplicate node ID: ${node.id}`,
          node.id
        ));
      }
      nodeIds.add(node.id);
      
      // 验证必需字段
      if (!node.id) {
        this.errors.push(new ValidationError(
          'MISSING_FIELD',
          'Node ID is required',
          node.id,
          undefined,
          'id'
        ));
      }
      
      if (!node.type) {
        this.errors.push(new ValidationError(
          'MISSING_FIELD',
          'Node type is required',
          node.id,
          undefined,
          'type'
        ));
        continue;
      }
      
      // 验证节点类型是否已注册
      if (this.nodeRegistry.size > 0 && !this.nodeRegistry.has(node.type)) {
        this.errors.push(new ValidationError(
          'UNKNOWN_NODE_TYPE',
          `Unknown node type: ${node.type}`,
          node.id
        ));
      }
      
      // 验证position
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        this.warnings.push(new ValidationWarning(
          'INVALID_POSITION',
          `Node ${node.id} has invalid position`,
          node.id,
          'Provide valid x and y coordinates'
        ));
      }
      
      // 验证config
      if (!node.config || typeof node.config !== 'object') {
        this.warnings.push(new ValidationWarning(
          'MISSING_CONFIG',
          `Node ${node.id} has no configuration`,
          node.id,
          'Add node configuration'
        ));
      }
      
      // 检查是否有输入但没有对应的连接
      if (node.inputs && Object.keys(node.inputs).length > 0) {
        for (const [inputName, mapping] of Object.entries(node.inputs)) {
          if (!mapping.from || !mapping.output) {
            this.warnings.push(new ValidationWarning(
              'INCOMPLETE_INPUT_MAPPING',
              `Node ${node.id} input "${inputName}" has incomplete mapping`,
              node.id,
              'Complete the input mapping'
            ));
          }
        }
      }
    }
  }
  
  /**
   * 验证连接
   * 
   * @param edges 连接列表
   * @param nodes 节点列表
   */
  private validateEdges(edges: WorkflowEdge[], nodes: WorkflowNode[]): void {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edgeIds = new Set<string>();
    
    for (const edge of edges) {
      // 验证连接ID唯一性
      if (edgeIds.has(edge.id)) {
        this.errors.push(new ValidationError(
          'DUPLICATE_EDGE_ID',
          `Duplicate edge ID: ${edge.id}`,
          undefined,
          edge.id
        ));
      }
      edgeIds.add(edge.id);
      
      // 验证必需字段
      if (!edge.source) {
        this.errors.push(new ValidationError(
          'MISSING_FIELD',
          'Edge source is required',
          undefined,
          edge.id,
          'source'
        ));
        continue;
      }
      
      if (!edge.target) {
        this.errors.push(new ValidationError(
          'MISSING_FIELD',
          'Edge target is required',
          undefined,
          edge.id,
          'target'
        ));
        continue;
      }
      
      // 验证源节点存在
      if (!nodeMap.has(edge.source)) {
        this.errors.push(new ValidationError(
          'INVALID_SOURCE_NODE',
          `Source node "${edge.source}" does not exist`,
          edge.source,
          edge.id
        ));
      }
      
      // 验证目标节点存在
      if (!nodeMap.has(edge.target)) {
        this.errors.push(new ValidationError(
          'INVALID_TARGET_NODE',
          `Target node "${edge.target}" does not exist`,
          edge.target,
          edge.id
        ));
      }
      
      // 验证不能连接到自己
      if (edge.source === edge.target) {
        this.errors.push(new ValidationError(
          'SELF_LOOP',
          `Edge ${edge.id} creates a self-loop on node ${edge.source}`,
          edge.source,
          edge.id
        ));
      }
      
      // 验证sourceOutput和targetInput
      if (!edge.sourceOutput) {
        this.warnings.push(new ValidationWarning(
          'MISSING_SOURCE_OUTPUT',
          `Edge ${edge.id} missing source output name`,
          edge.source
        ));
      }
      
      if (!edge.targetInput) {
        this.warnings.push(new ValidationWarning(
          'MISSING_TARGET_INPUT',
          `Edge ${edge.id} missing target input name`,
          edge.target
        ));
      }
      
      // 检查重复连接（相同的source-output到target-input）
      const duplicateEdge = edges.find(e => 
        e.id !== edge.id &&
        e.source === edge.source &&
        e.sourceOutput === edge.sourceOutput &&
        e.target === edge.target &&
        e.targetInput === edge.targetInput
      );
      
      if (duplicateEdge) {
        this.warnings.push(new ValidationWarning(
          'DUPLICATE_CONNECTION',
          `Edge ${edge.id} is duplicate of edge ${duplicateEdge.id}`,
          undefined,
          'Remove duplicate connection'
        ));
      }
    }
  }
  
  /**
   * 验证拓扑结构
   * 
   * @param workflow 工作流定义
   */
  private validateTopology(workflow: WorkflowDefinition): void {
    const { nodes, edges } = workflow;
    
    // 检查是否有节点
    if (nodes.length === 0) {
      this.warnings.push(new ValidationWarning(
        'EMPTY_WORKFLOW',
        'Workflow has no nodes',
        undefined,
        'Add at least one node'
      ));
      return;
    }
    
    // 检测循环依赖
    const cycles = this.detectCycles(nodes, edges);
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        this.errors.push(new ValidationError(
          'CIRCULAR_DEPENDENCY',
          `Circular dependency detected: ${cycle.join(' -> ')}`,
          cycle[0]
        ));
      }
    }
    
    // 检查孤立节点（既没有输入也没有输出）
    const nodesWithInputs = new Set(edges.map(e => e.target));
    const nodesWithOutputs = new Set(edges.map(e => e.source));
    
    for (const node of nodes) {
      if (!nodesWithInputs.has(node.id) && !nodesWithOutputs.has(node.id)) {
        this.warnings.push(new ValidationWarning(
          'ISOLATED_NODE',
          `Node ${node.id} is isolated (no inputs or outputs)`,
          node.id,
          'Connect the node or remove it'
        ));
      }
    }
    
    // 检查起始节点
    const startNodes = nodes.filter(n => !nodesWithInputs.has(n.id));
    if (startNodes.length === 0 && nodes.length > 0) {
      this.warnings.push(new ValidationWarning(
        'NO_START_NODE',
        'Workflow has no start node (all nodes have inputs)',
        undefined,
        'Add a node without inputs as the starting point'
      ));
    }
    
    // 检查结束节点
    const endNodes = nodes.filter(n => !nodesWithOutputs.has(n.id));
    if (endNodes.length === 0 && nodes.length > 0) {
      this.warnings.push(new ValidationWarning(
        'NO_END_NODE',
        'Workflow has no end node (all nodes have outputs)',
        undefined,
        'Add a node without outputs as the end point'
      ));
    }
  }
  
  /**
   * 验证工作流设置
   * 
   * @param workflow 工作流定义
   */
  private validateSettings(workflow: WorkflowDefinition): void {
    const settings = workflow.settings;
    
    if (!settings) {
      return;
    }
    
    // 验证maxConcurrency
    if (settings.maxConcurrency !== undefined) {
      if (settings.maxConcurrency < 1) {
        this.errors.push(new ValidationError(
          'INVALID_SETTING',
          'maxConcurrency must be at least 1',
          undefined,
          undefined,
          'settings.maxConcurrency'
        ));
      }
      
      if (settings.maxConcurrency > 100) {
        this.warnings.push(new ValidationWarning(
          'HIGH_CONCURRENCY',
          `maxConcurrency (${settings.maxConcurrency}) is very high`,
          undefined,
          'Consider reducing to avoid resource exhaustion'
        ));
      }
    }
    
    // 验证timeout
    if (settings.timeout !== undefined && settings.timeout < 1000) {
      this.warnings.push(new ValidationWarning(
        'LOW_TIMEOUT',
        `Timeout (${settings.timeout}ms) is very low`,
        undefined,
        'Consider increasing timeout to avoid premature termination'
      ));
    }
    
    // 验证retryPolicy
    if (settings.retryPolicy) {
      if (settings.retryPolicy.maxRetries < 0) {
        this.errors.push(new ValidationError(
          'INVALID_SETTING',
          'maxRetries cannot be negative',
          undefined,
          undefined,
          'settings.retryPolicy.maxRetries'
        ));
      }
      
      if (settings.retryPolicy.maxRetries > 10) {
        this.warnings.push(new ValidationWarning(
          'HIGH_RETRY_COUNT',
          `maxRetries (${settings.retryPolicy.maxRetries}) is very high`,
          undefined,
          'Consider reducing retry count'
        ));
      }
    }
  }
  
  /**
   * 检测循环依赖
   * 
   * @param nodes 节点列表
   * @param edges 连接列表
   * @returns 循环路径列表
   */
  private detectCycles(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    // 构建邻接表
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    
    for (const edge of edges) {
      if (edge.enabled !== false) {
        const neighbors = adjacency.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacency.set(edge.source, neighbors);
      }
    }
    
    // DFS检测环
    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // 找到环
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // 闭合环
          cycles.push(cycle);
        }
      }
      
      recursionStack.delete(nodeId);
    };
    
    // 对每个未访问的节点进行DFS
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }
    
    return cycles;
  }
  
  /**
   * 计算统计信息
   * 
   * @param workflow 工作流定义
   * @returns 统计信息
   */
  private calculateStats(workflow: WorkflowDefinition) {
    const nodesWithInputs = new Set(workflow.edges.map(e => e.target));
    const nodesWithOutputs = new Set(workflow.edges.map(e => e.source));
    
    const startNodes = workflow.nodes.filter(n => !nodesWithInputs.has(n.id)).length;
    const endNodes = workflow.nodes.filter(n => !nodesWithOutputs.has(n.id)).length;
    
    // 计算最大深度（最长路径）
    const maxDepth = this.calculateMaxDepth(workflow);
    
    return {
      totalNodes: workflow.nodes.length,
      totalEdges: workflow.edges.length,
      startNodes,
      endNodes,
      maxDepth,
      estimatedExecutionTime: undefined, // 需要节点执行时间信息才能估算
    };
  }
  
  /**
   * 计算最大深度（最长路径长度）
   * 
   * @param workflow 工作流定义
   * @returns 最大深度
   */
  private calculateMaxDepth(workflow: WorkflowDefinition): number {
    const { nodes, edges } = workflow;
    
    if (nodes.length === 0) {
      return 0;
    }
    
    // 如果有循环依赖，无法计算深度
    const cycles = this.detectCycles(nodes, edges);
    if (cycles.length > 0) {
      return 0; // 有循环时返回0
    }
    
    // 构建邻接表
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    
    for (const edge of edges) {
      if (edge.enabled !== false) {
        const neighbors = adjacency.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacency.set(edge.source, neighbors);
      }
    }
    
    // 使用记忆化DFS计算最长路径（DAG保证无环）
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    
    const dfs = (nodeId: string): number => {
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!;
      }
      
      // 防止无限递归（虽然已经检测过循环）
      if (visiting.has(nodeId)) {
        return 0;
      }
      
      visiting.add(nodeId);
      
      const neighbors = adjacency.get(nodeId) || [];
      if (neighbors.length === 0) {
        memo.set(nodeId, 1);
        visiting.delete(nodeId);
        return 1;
      }
      
      let maxChildDepth = 0;
      for (const neighbor of neighbors) {
        maxChildDepth = Math.max(maxChildDepth, dfs(neighbor));
      }
      
      const depth = 1 + maxChildDepth;
      memo.set(nodeId, depth);
      visiting.delete(nodeId);
      return depth;
    };
    
    let maxDepth = 0;
    for (const node of nodes) {
      if (!memo.has(node.id)) {
        maxDepth = Math.max(maxDepth, dfs(node.id));
      }
    }
    
    return maxDepth;
  }
  
  /**
   * 验证版本号格式
   * 
   * @param version 版本号
   * @returns 是否有效
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }
}

/**
 * 导出验证器实例
 */
export const workflowValidator = new WorkflowValidator();

/**
 * 导出默认验证函数
 */
export function validateWorkflow(
  workflow: WorkflowDefinition,
  nodeRegistry?: Map<string, any>
): WorkflowValidationResult {
  const validator = new WorkflowValidator();
  
  if (nodeRegistry) {
    validator.setNodeRegistry(nodeRegistry);
  }
  
  return validator.validate(workflow);
}
