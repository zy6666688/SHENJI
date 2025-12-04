/**
 * ExecutionHistory - 工作流执行历史
 * Week 4: 工作流引擎完善
 * 
 * 记录和查询工作流执行历史
 * 支持执行状态追踪、节点级追踪、错误记录、性能分析
 * 
 * @module workflow/ExecutionHistory
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorkflowDefinition } from './WorkflowDefinition';

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  PENDING = 'pending',       // 等待执行
  RUNNING = 'running',       // 执行中
  COMPLETED = 'completed',   // 执行完成
  FAILED = 'failed',         // 执行失败
  CANCELLED = 'cancelled',   // 已取消
  PAUSED = 'paused',         // 已暂停
}

/**
 * 节点执行状态
 */
export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * 节点执行记录
 */
export interface NodeExecutionRecord {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  inputs?: any;
  outputs?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  retryCount?: number;
  logs?: string[];
}

/**
 * 工作流执行记录
 */
export interface WorkflowExecutionRecord {
  id: string;                          // 执行记录ID
  workflowId: string;                  // 工作流ID
  workflowName: string;                // 工作流名称
  workflowVersion?: string;            // 工作流版本
  
  status: ExecutionStatus;             // 执行状态
  startTime: number;                   // 开始时间
  endTime?: number;                    // 结束时间
  duration?: number;                   // 执行时长(ms)
  
  // 触发信息
  trigger: {
    type: 'manual' | 'schedule' | 'event' | 'api';
    userId?: string;
    userName?: string;
    data?: any;
  };
  
  // 执行上下文
  context: {
    environment?: string;              // 执行环境
    variables?: Record<string, any>;   // 上下文变量
    metadata?: Record<string, any>;    // 元数据
  };
  
  // 节点执行记录
  nodes: NodeExecutionRecord[];
  
  // 统计信息
  stats: {
    totalNodes: number;                // 总节点数
    completedNodes: number;            // 完成节点数
    failedNodes: number;               // 失败节点数
    skippedNodes: number;              // 跳过节点数
    successRate?: number;              // 成功率
  };
  
  // 错误信息
  error?: {
    message: string;
    stack?: string;
    failedNodeId?: string;
    failedNodeName?: string;
  };
  
  // 检查点（用于断点续传）
  checkpoints?: {
    nodeId: string;
    timestamp: number;
    state: any;
  }[];
  
  // 性能指标
  performance?: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkIO?: number;
  };
  
  createdAt: number;
  updatedAt: number;
}

/**
 * 执行历史查询选项
 */
export interface ExecutionQueryOptions {
  workflowId?: string;                 // 按工作流ID筛选
  status?: ExecutionStatus[];          // 按状态筛选
  startTimeFrom?: number;              // 开始时间范围（起）
  startTimeTo?: number;                // 开始时间范围（止）
  triggerType?: string;                // 按触发类型筛选
  userId?: string;                     // 按用户筛选
  
  sortBy?: 'startTime' | 'duration' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  
  page?: number;
  pageSize?: number;
}

/**
 * 执行历史统计
 */
export interface ExecutionStats {
  total: number;
  byStatus: Record<ExecutionStatus, number>;
  byWorkflow: Record<string, {
    total: number;
    completed: number;
    failed: number;
    avgDuration?: number;
  }>;
  avgDuration?: number;
  successRate?: number;
  recentExecutions: number;            // 最近24小时执行数
}

/**
 * 执行历史存储类
 */
export class ExecutionHistoryStorage {
  private storageDir: string;
  private cache: Map<string, WorkflowExecutionRecord> = new Map();
  private cacheEnabled: boolean = true;
  private maxCacheSize: number = 100;

  constructor(storageDir: string = 'data/executions') {
    this.storageDir = path.resolve(storageDir);
  }

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      console.log(`ExecutionHistory storage initialized at: ${this.storageDir}`);
    } catch (error) {
      console.error('Failed to initialize execution history storage:', error);
      throw error;
    }
  }

  /**
   * 创建新的执行记录
   */
  async createExecution(
    workflow: WorkflowDefinition,
    trigger: WorkflowExecutionRecord['trigger'],
    context?: WorkflowExecutionRecord['context']
  ): Promise<WorkflowExecutionRecord> {
    const now = Date.now();
    const executionId = `exec_${workflow.id}_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record: WorkflowExecutionRecord = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowVersion: workflow.version?.version,
      
      status: ExecutionStatus.PENDING,
      startTime: now,
      
      trigger,
      context: context || {},
      
      nodes: [],
      
      stats: {
        totalNodes: workflow.nodes.length,
        completedNodes: 0,
        failedNodes: 0,
        skippedNodes: 0,
      },
      
      createdAt: now,
      updatedAt: now,
    };
    
    await this.save(record);
    return record;
  }

  /**
   * 保存执行记录
   */
  async save(record: WorkflowExecutionRecord): Promise<void> {
    record.updatedAt = Date.now();
    
    const filePath = this.getFilePath(record.id);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    
    // 更新缓存
    if (this.cacheEnabled) {
      this.updateCache(record.id, record);
    }
  }

  /**
   * 获取执行记录
   */
  async get(executionId: string): Promise<WorkflowExecutionRecord | null> {
    // 先检查缓存
    if (this.cacheEnabled && this.cache.has(executionId)) {
      return this.cache.get(executionId)!;
    }
    
    try {
      const filePath = this.getFilePath(executionId);
      const content = await fs.readFile(filePath, 'utf-8');
      const record = JSON.parse(content) as WorkflowExecutionRecord;
      
      if (this.cacheEnabled) {
        this.updateCache(executionId, record);
      }
      
      return record;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 更新执行状态
   */
  async updateStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: WorkflowExecutionRecord['error']
  ): Promise<void> {
    const record = await this.get(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }
    
    record.status = status;
    
    if (status === ExecutionStatus.RUNNING && !record.startTime) {
      record.startTime = Date.now();
    }
    
    if ([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(status)) {
      record.endTime = Date.now();
      record.duration = record.endTime - record.startTime;
    }
    
    if (error) {
      record.error = error;
    }
    
    // 计算成功率
    if (record.stats.totalNodes > 0) {
      record.stats.successRate = record.stats.completedNodes / record.stats.totalNodes;
    }
    
    await this.save(record);
  }

  /**
   * 添加节点执行记录
   */
  async addNodeExecution(
    executionId: string,
    nodeRecord: NodeExecutionRecord
  ): Promise<void> {
    const record = await this.get(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }
    
    // 查找是否已存在该节点记录
    const existingIndex = record.nodes.findIndex(n => n.nodeId === nodeRecord.nodeId);
    
    if (existingIndex >= 0) {
      // 更新现有记录
      record.nodes[existingIndex] = nodeRecord;
    } else {
      // 添加新记录
      record.nodes.push(nodeRecord);
    }
    
    // 更新统计
    record.stats.completedNodes = record.nodes.filter(n => n.status === NodeExecutionStatus.COMPLETED).length;
    record.stats.failedNodes = record.nodes.filter(n => n.status === NodeExecutionStatus.FAILED).length;
    record.stats.skippedNodes = record.nodes.filter(n => n.status === NodeExecutionStatus.SKIPPED).length;
    
    await this.save(record);
  }

  /**
   * 添加检查点（用于断点续传）
   */
  async addCheckpoint(
    executionId: string,
    nodeId: string,
    state: any
  ): Promise<void> {
    const record = await this.get(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }
    
    if (!record.checkpoints) {
      record.checkpoints = [];
    }
    
    record.checkpoints.push({
      nodeId,
      timestamp: Date.now(),
      state,
    });
    
    await this.save(record);
  }

  /**
   * 查询执行记录
   */
  async query(options: ExecutionQueryOptions = {}): Promise<{
    executions: WorkflowExecutionRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      workflowId,
      status,
      startTimeFrom,
      startTimeTo,
      triggerType,
      userId,
      sortBy = 'startTime',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = options;
    
    // 获取所有执行记录文件
    const files = await fs.readdir(this.storageDir);
    const executionFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
    
    // 加载所有记录
    const allRecords: WorkflowExecutionRecord[] = [];
    for (const file of executionFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content) as WorkflowExecutionRecord;
        allRecords.push(record);
      } catch (error) {
        console.error(`Failed to load execution record: ${file}`, error);
      }
    }
    
    // 过滤
    let filtered = allRecords;
    
    if (workflowId) {
      filtered = filtered.filter(r => r.workflowId === workflowId);
    }
    
    if (status && status.length > 0) {
      filtered = filtered.filter(r => status.includes(r.status));
    }
    
    if (startTimeFrom) {
      filtered = filtered.filter(r => r.startTime >= startTimeFrom);
    }
    
    if (startTimeTo) {
      filtered = filtered.filter(r => r.startTime <= startTimeTo);
    }
    
    if (triggerType) {
      filtered = filtered.filter(r => r.trigger.type === triggerType);
    }
    
    if (userId) {
      filtered = filtered.filter(r => r.trigger.userId === userId);
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortBy) {
        case 'duration':
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case 'startTime':
        default:
          aVal = a.startTime;
          bVal = b.startTime;
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // 分页
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const executions = filtered.slice(start, end);
    
    return {
      executions,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<ExecutionStats> {
    const files = await fs.readdir(this.storageDir);
    const executionFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
    
    const stats: ExecutionStats = {
      total: executionFiles.length,
      byStatus: {
        [ExecutionStatus.PENDING]: 0,
        [ExecutionStatus.RUNNING]: 0,
        [ExecutionStatus.COMPLETED]: 0,
        [ExecutionStatus.FAILED]: 0,
        [ExecutionStatus.CANCELLED]: 0,
        [ExecutionStatus.PAUSED]: 0,
      },
      byWorkflow: {},
      recentExecutions: 0,
    };
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    let totalDuration = 0;
    let durationCount = 0;
    let completedCount = 0;
    
    for (const file of executionFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content) as WorkflowExecutionRecord;
        
        // 按状态统计
        stats.byStatus[record.status]++;
        
        // 按工作流统计
        if (!stats.byWorkflow[record.workflowId]) {
          stats.byWorkflow[record.workflowId] = {
            total: 0,
            completed: 0,
            failed: 0,
          };
        }
        
        stats.byWorkflow[record.workflowId].total++;
        
        if (record.status === ExecutionStatus.COMPLETED) {
          stats.byWorkflow[record.workflowId].completed++;
          completedCount++;
        } else if (record.status === ExecutionStatus.FAILED) {
          stats.byWorkflow[record.workflowId].failed++;
        }
        
        // 时长统计
        if (record.duration) {
          totalDuration += record.duration;
          durationCount++;
          
          if (!stats.byWorkflow[record.workflowId].avgDuration) {
            stats.byWorkflow[record.workflowId].avgDuration = record.duration;
          } else {
            stats.byWorkflow[record.workflowId].avgDuration = 
              (stats.byWorkflow[record.workflowId].avgDuration! + record.duration) / 2;
          }
        }
        
        // 最近24小时执行数
        if (record.startTime >= oneDayAgo) {
          stats.recentExecutions++;
        }
      } catch (error) {
        console.error(`Failed to process execution record: ${file}`, error);
      }
    }
    
    // 平均时长
    if (durationCount > 0) {
      stats.avgDuration = totalDuration / durationCount;
    }
    
    // 成功率
    if (stats.total > 0) {
      stats.successRate = completedCount / stats.total;
    }
    
    return stats;
  }

  /**
   * 删除执行记录
   */
  async delete(executionId: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(executionId);
      await fs.unlink(filePath);
      
      if (this.cacheEnabled) {
        this.cache.delete(executionId);
      }
      
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 清理旧记录
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    
    const files = await fs.readdir(this.storageDir);
    const executionFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
    
    let deletedCount = 0;
    
    for (const file of executionFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content) as WorkflowExecutionRecord;
        
        if (record.createdAt < cutoffTime) {
          await fs.unlink(filePath);
          this.cache.delete(record.id);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Failed to cleanup execution record: ${file}`, error);
      }
    }
    
    return deletedCount;
  }

  /**
   * 获取文件路径
   */
  private getFilePath(executionId: string): string {
    return path.join(this.storageDir, `${executionId}.json`);
  }

  /**
   * 更新缓存
   */
  private updateCache(id: string, record: WorkflowExecutionRecord): void {
    // 如果缓存已满，删除最旧的记录
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(id, record);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 全局执行历史存储实例
 */
export const executionHistory = new ExecutionHistoryStorage();
