/**
 * AdvancedFeatures - 工作流高级功能
 * Week 4: 工作流引擎完善
 * 
 * 实现错误回滚、断点续传、重试机制等高级功能
 * 
 * @module workflow/AdvancedFeatures
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import {
  ExecutionStatus,
  NodeExecutionStatus,
  type WorkflowExecutionRecord,
  type NodeExecutionRecord,
  executionHistory,
} from './ExecutionHistory';
import type { WorkflowDefinition } from './WorkflowDefinition';

/**
 * 回滚点
 */
export interface RollbackPoint {
  nodeId: string;
  nodeName: string;
  timestamp: number;
  state: any;
  canRollback: boolean;
  reason?: string;
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  rolledBackTo: string;
  affectedNodes: string[];
  message: string;
  error?: string;
}

/**
 * 断点续传上下文
 */
export interface ResumeContext {
  executionId: string;
  checkpointNodeId: string;
  resumeFromNode: string;
  skippedNodes: string[];
  preservedState: any;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryableErrors?: string[];
}

/**
 * 重试结果
 */
export interface RetryResult {
  success: boolean;
  attempts: number;
  finalStatus: NodeExecutionStatus;
  errors: string[];
  duration: number;
}

/**
 * 回滚管理器
 */
export class RollbackManager {
  /**
   * 获取可用的回滚点
   */
  async getAvailableRollbackPoints(executionId: string): Promise<RollbackPoint[]> {
    const record = await executionHistory.get(executionId);
    if (!record || !record.checkpoints) {
      return [];
    }
    
    const rollbackPoints: RollbackPoint[] = [];
    
    for (const checkpoint of record.checkpoints) {
      const node = record.nodes.find(n => n.nodeId === checkpoint.nodeId);
      
      rollbackPoints.push({
        nodeId: checkpoint.nodeId,
        nodeName: node?.nodeName || checkpoint.nodeId,
        timestamp: checkpoint.timestamp,
        state: checkpoint.state,
        canRollback: node?.status === NodeExecutionStatus.COMPLETED,
        reason: node?.status !== NodeExecutionStatus.COMPLETED 
          ? 'Node not completed successfully' 
          : undefined,
      });
    }
    
    return rollbackPoints;
  }

  /**
   * 执行回滚
   */
  async rollback(
    executionId: string,
    targetNodeId: string
  ): Promise<RollbackResult> {
    const record = await executionHistory.get(executionId);
    if (!record) {
      return {
        success: false,
        rolledBackTo: targetNodeId,
        affectedNodes: [],
        message: 'Execution record not found',
        error: 'EXECUTION_NOT_FOUND',
      };
    }
    
    // 查找目标检查点
    const checkpoint = record.checkpoints?.find(c => c.nodeId === targetNodeId);
    if (!checkpoint) {
      return {
        success: false,
        rolledBackTo: targetNodeId,
        affectedNodes: [],
        message: 'Checkpoint not found',
        error: 'CHECKPOINT_NOT_FOUND',
      };
    }
    
    // 找到需要回滚的节点
    const targetNodeIndex = record.nodes.findIndex(n => n.nodeId === targetNodeId);
    if (targetNodeIndex === -1) {
      return {
        success: false,
        rolledBackTo: targetNodeId,
        affectedNodes: [],
        message: 'Target node not found',
        error: 'NODE_NOT_FOUND',
      };
    }
    
    // 获取需要回滚的节点（目标节点之后的所有节点）
    const nodesToRollback = record.nodes.slice(targetNodeIndex + 1);
    const affectedNodeIds = nodesToRollback.map(n => n.nodeId);
    
    // 执行回滚逻辑
    try {
      // 1. 调用每个节点的回滚处理器（如果有）
      for (const node of nodesToRollback.reverse()) {
        await this.rollbackNode(node, checkpoint.state);
      }
      
      // 2. 更新执行记录
      record.nodes = record.nodes.slice(0, targetNodeIndex + 1);
      record.status = ExecutionStatus.PAUSED;
      
      // 3. 添加回滚日志
      record.nodes[targetNodeIndex].logs = record.nodes[targetNodeIndex].logs || [];
      record.nodes[targetNodeIndex].logs.push(
        `Rolled back from ${nodesToRollback.length} subsequent nodes`
      );
      
      await executionHistory.save(record);
      
      return {
        success: true,
        rolledBackTo: targetNodeId,
        affectedNodes: affectedNodeIds,
        message: `Successfully rolled back to node: ${targetNodeId}`,
      };
    } catch (error: any) {
      return {
        success: false,
        rolledBackTo: targetNodeId,
        affectedNodes: affectedNodeIds,
        message: 'Rollback failed',
        error: error.message,
      };
    }
  }

  /**
   * 回滚单个节点
   */
  private async rollbackNode(node: NodeExecutionRecord, checkpointState: any): Promise<void> {
    // 这里应该调用节点特定的回滚逻辑
    // 例如：撤销数据库操作、删除创建的文件等
    
    // TODO: 实现具体的回滚逻辑
    console.log(`Rolling back node: ${node.nodeId}`);
    
    // 模拟回滚延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * 验证回滚的安全性
   */
  async validateRollback(
    executionId: string,
    targetNodeId: string
  ): Promise<{ safe: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    const record = await executionHistory.get(executionId);
    if (!record) {
      return { safe: false, warnings: ['Execution record not found'] };
    }
    
    // 检查是否有外部副作用
    const targetIndex = record.nodes.findIndex(n => n.nodeId === targetNodeId);
    if (targetIndex === -1) {
      return { safe: false, warnings: ['Target node not found'] };
    }
    
    const nodesToRollback = record.nodes.slice(targetIndex + 1);
    
    for (const node of nodesToRollback) {
      // 检查节点是否有不可逆的操作
      if (node.nodeType === 'external-api' || node.nodeType === 'email' || node.nodeType === 'notification') {
        warnings.push(
          `Node ${node.nodeName} (${node.nodeType}) may have external side effects that cannot be rolled back`
        );
      }
      
      // 检查是否有已提交的事务
      if (node.outputs?.committed === true) {
        warnings.push(
          `Node ${node.nodeName} has committed transactions that may be difficult to rollback`
        );
      }
    }
    
    return {
      safe: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * 断点续传管理器
 */
export class ResumeManager {
  /**
   * 检查是否可以续传
   */
  async canResume(executionId: string): Promise<boolean> {
    const record = await executionHistory.get(executionId);
    if (!record) return false;
    
    // 只有暂停或失败的执行可以续传
    return record.status === ExecutionStatus.PAUSED || 
           record.status === ExecutionStatus.FAILED;
  }

  /**
   * 获取续传上下文
   */
  async getResumeContext(executionId: string): Promise<ResumeContext | null> {
    const record = await executionHistory.get(executionId);
    if (!record) return null;
    
    // 找到最后一个成功的节点
    let lastCompletedNode: NodeExecutionRecord | null = null;
    for (let i = record.nodes.length - 1; i >= 0; i--) {
      if (record.nodes[i].status === NodeExecutionStatus.COMPLETED) {
        lastCompletedNode = record.nodes[i];
        break;
      }
    }
    
    if (!lastCompletedNode) {
      // 没有完成的节点，从头开始
      return {
        executionId,
        checkpointNodeId: '',
        resumeFromNode: record.nodes[0]?.nodeId || '',
        skippedNodes: [],
        preservedState: {},
      };
    }
    
    // 找到最后一个检查点
    const lastCheckpoint = record.checkpoints?.find(
      c => c.nodeId === lastCompletedNode!.nodeId
    );
    
    // 找到下一个要执行的节点
    const lastNodeIndex = record.nodes.findIndex(n => n.nodeId === lastCompletedNode!.nodeId);
    const nextNode = record.nodes[lastNodeIndex + 1];
    
    // 获取已完成的节点列表
    const completedNodeIds = record.nodes
      .filter(n => n.status === NodeExecutionStatus.COMPLETED)
      .map(n => n.nodeId);
    
    return {
      executionId,
      checkpointNodeId: lastCompletedNode.nodeId,
      resumeFromNode: nextNode?.nodeId || '',
      skippedNodes: completedNodeIds,
      preservedState: lastCheckpoint?.state || {},
    };
  }

  /**
   * 恢复执行
   */
  async resume(executionId: string): Promise<{
    success: boolean;
    resumeContext?: ResumeContext;
    message: string;
    error?: string;
  }> {
    const canResume = await this.canResume(executionId);
    if (!canResume) {
      return {
        success: false,
        message: 'Execution cannot be resumed',
        error: 'CANNOT_RESUME',
      };
    }
    
    const context = await this.getResumeContext(executionId);
    if (!context) {
      return {
        success: false,
        message: 'Failed to get resume context',
        error: 'NO_CONTEXT',
      };
    }
    
    // 更新执行状态为运行中
    await executionHistory.updateStatus(executionId, ExecutionStatus.RUNNING);
    
    return {
      success: true,
      resumeContext: context,
      message: `Resuming execution from node: ${context.resumeFromNode}`,
    };
  }

  /**
   * 创建快照（用于断点）
   */
  async createSnapshot(
    executionId: string,
    nodeId: string,
    state: any
  ): Promise<void> {
    await executionHistory.addCheckpoint(executionId, nodeId, state);
  }
}

/**
 * 重试管理器
 */
export class RetryManager {
  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<RetryResult & { result?: T }> {
    const errors: string[] = [];
    const startTime = Date.now();
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          success: true,
          attempts: attempt,
          finalStatus: NodeExecutionStatus.COMPLETED,
          errors,
          duration: Date.now() - startTime,
          result,
        };
      } catch (error: any) {
        lastError = error;
        errors.push(`Attempt ${attempt}: ${error.message}`);
        
        // 检查是否是可重试的错误
        if (config.retryableErrors && config.retryableErrors.length > 0) {
          const isRetryable = config.retryableErrors.some(
            code => error.code === code || error.message.includes(code)
          );
          
          if (!isRetryable) {
            // 不可重试的错误，直接失败
            return {
              success: false,
              attempts: attempt,
              finalStatus: NodeExecutionStatus.FAILED,
              errors,
              duration: Date.now() - startTime,
            };
          }
        }
        
        // 如果还有重试机会，等待后重试
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    return {
      success: false,
      attempts: config.maxAttempts,
      finalStatus: NodeExecutionStatus.FAILED,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;
    
    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.initialDelay * attempt;
        break;
      
      case 'exponential':
        delay = config.initialDelay * Math.pow(2, attempt - 1);
        break;
      
      case 'fixed':
      default:
        delay = config.initialDelay;
    }
    
    // 限制最大延迟
    return Math.min(delay, config.maxDelay);
  }

  /**
   * 为节点配置重试
   */
  getDefaultRetryConfig(nodeType: string): RetryConfig {
    // 根据节点类型返回默认的重试配置
    const configs: Record<string, RetryConfig> = {
      'external-api': {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', '503', '429'],
      },
      'database': {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 500,
        maxDelay: 5000,
        retryableErrors: ['DEADLOCK', 'TIMEOUT', 'CONNECTION_ERROR'],
      },
      'default': {
        maxAttempts: 2,
        backoffStrategy: 'fixed',
        initialDelay: 1000,
        maxDelay: 3000,
      },
    };
    
    return configs[nodeType] || configs['default'];
  }
}

/**
 * 全局实例
 */
export const rollbackManager = new RollbackManager();
export const resumeManager = new ResumeManager();
export const retryManager = new RetryManager();
