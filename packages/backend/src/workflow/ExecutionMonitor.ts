/**
 * ExecutionMonitor - 工作流执行监控
 * Week 4: 工作流引擎完善
 * 
 * 实时监控工作流执行状态
 * 支持WebSocket推送、事件订阅、性能监控
 * 
 * @module workflow/ExecutionMonitor
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import { EventEmitter } from 'events';
import {
  ExecutionStatus,
  NodeExecutionStatus,
  type WorkflowExecutionRecord,
  type NodeExecutionRecord,
} from './ExecutionHistory';

/**
 * 监控事件类型
 */
export enum MonitorEventType {
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_UPDATED = 'execution:updated',
  EXECUTION_COMPLETED = 'execution:completed',
  EXECUTION_FAILED = 'execution:failed',
  EXECUTION_CANCELLED = 'execution:cancelled',
  EXECUTION_PAUSED = 'execution:paused',
  
  NODE_STARTED = 'node:started',
  NODE_COMPLETED = 'node:completed',
  NODE_FAILED = 'node:failed',
  NODE_SKIPPED = 'node:skipped',
  
  PROGRESS_UPDATED = 'progress:updated',
  PERFORMANCE_UPDATED = 'performance:updated',
  LOG_ADDED = 'log:added',
}

/**
 * 监控事件数据
 */
export interface MonitorEvent {
  type: MonitorEventType;
  executionId: string;
  timestamp: number;
  data: any;
}

/**
 * 进度信息
 */
export interface ExecutionProgress {
  executionId: string;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  runningNodes: number;
  pendingNodes: number;
  progress: number;                    // 0-1
  estimatedTimeRemaining?: number;     // ms
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  executionId: string;
  timestamp: number;
  
  cpu: {
    usage: number;                     // 0-100
    system: number;
    user: number;
  };
  
  memory: {
    used: number;                      // bytes
    total: number;
    percentage: number;                // 0-100
  };
  
  network: {
    bytesReceived: number;
    bytesSent: number;
    requestCount: number;
  };
  
  duration: number;                    // ms
  throughput?: number;                 // nodes/second
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  executionId: string;
  nodeId?: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

/**
 * 执行监控器
 */
export class ExecutionMonitor extends EventEmitter {
  private activeExecutions: Map<string, {
    record: WorkflowExecutionRecord;
    startTime: number;
    lastUpdate: number;
    nodeStatuses: Map<string, NodeExecutionStatus>;
    logs: ExecutionLog[];
    metrics: PerformanceMetrics[];
  }> = new Map();
  
  private performanceInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: number = 5000; // 5秒

  constructor() {
    super();
    this.startPerformanceMonitoring();
  }

  /**
   * 开始监控执行
   */
  startMonitoring(record: WorkflowExecutionRecord): void {
    this.activeExecutions.set(record.id, {
      record,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      nodeStatuses: new Map(),
      logs: [],
      metrics: [],
    });
    
    this.emitEvent({
      type: MonitorEventType.EXECUTION_STARTED,
      executionId: record.id,
      timestamp: Date.now(),
      data: record,
    });
  }

  /**
   * 停止监控执行
   */
  stopMonitoring(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;
    
    this.activeExecutions.delete(executionId);
    
    const eventType = 
      execution.record.status === ExecutionStatus.COMPLETED
        ? MonitorEventType.EXECUTION_COMPLETED
        : execution.record.status === ExecutionStatus.FAILED
        ? MonitorEventType.EXECUTION_FAILED
        : execution.record.status === ExecutionStatus.CANCELLED
        ? MonitorEventType.EXECUTION_CANCELLED
        : MonitorEventType.EXECUTION_UPDATED;
    
    this.emitEvent({
      type: eventType,
      executionId,
      timestamp: Date.now(),
      data: execution.record,
    });
  }

  /**
   * 更新执行记录
   */
  updateExecution(record: WorkflowExecutionRecord): void {
    const execution = this.activeExecutions.get(record.id);
    if (!execution) return;
    
    execution.record = record;
    execution.lastUpdate = Date.now();
    
    this.emitEvent({
      type: MonitorEventType.EXECUTION_UPDATED,
      executionId: record.id,
      timestamp: Date.now(),
      data: record,
    });
    
    // 更新进度
    this.updateProgress(record.id);
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(
    executionId: string,
    nodeId: string,
    status: NodeExecutionStatus,
    nodeRecord?: NodeExecutionRecord
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;
    
    const previousStatus = execution.nodeStatuses.get(nodeId);
    execution.nodeStatuses.set(nodeId, status);
    
    // 触发节点状态事件
    if (previousStatus !== status) {
      let eventType: MonitorEventType;
      
      switch (status) {
        case NodeExecutionStatus.RUNNING:
          eventType = MonitorEventType.NODE_STARTED;
          break;
        case NodeExecutionStatus.COMPLETED:
          eventType = MonitorEventType.NODE_COMPLETED;
          break;
        case NodeExecutionStatus.FAILED:
          eventType = MonitorEventType.NODE_FAILED;
          break;
        case NodeExecutionStatus.SKIPPED:
          eventType = MonitorEventType.NODE_SKIPPED;
          break;
        default:
          return;
      }
      
      this.emitEvent({
        type: eventType,
        executionId,
        timestamp: Date.now(),
        data: nodeRecord || { nodeId, status },
      });
      
      // 更新进度
      this.updateProgress(executionId);
    }
  }

  /**
   * 添加日志
   */
  addLog(log: ExecutionLog): void {
    const execution = this.activeExecutions.get(log.executionId);
    if (!execution) return;
    
    execution.logs.push(log);
    
    // 限制日志数量
    if (execution.logs.length > 1000) {
      execution.logs = execution.logs.slice(-1000);
    }
    
    this.emitEvent({
      type: MonitorEventType.LOG_ADDED,
      executionId: log.executionId,
      timestamp: log.timestamp,
      data: log,
    });
  }

  /**
   * 获取执行进度
   */
  getProgress(executionId: string): ExecutionProgress | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;
    
    const statuses = Array.from(execution.nodeStatuses.values());
    const totalNodes = execution.record.stats.totalNodes;
    const completedNodes = statuses.filter(s => s === NodeExecutionStatus.COMPLETED).length;
    const failedNodes = statuses.filter(s => s === NodeExecutionStatus.FAILED).length;
    const runningNodes = statuses.filter(s => s === NodeExecutionStatus.RUNNING).length;
    const pendingNodes = totalNodes - completedNodes - failedNodes - runningNodes;
    
    const progress = totalNodes > 0 ? completedNodes / totalNodes : 0;
    
    // 估算剩余时间
    let estimatedTimeRemaining: number | undefined;
    if (completedNodes > 0 && progress < 1) {
      const elapsed = Date.now() - execution.startTime;
      const avgTimePerNode = elapsed / completedNodes;
      const remainingNodes = totalNodes - completedNodes;
      estimatedTimeRemaining = avgTimePerNode * remainingNodes;
    }
    
    return {
      executionId,
      totalNodes,
      completedNodes,
      failedNodes,
      runningNodes,
      pendingNodes,
      progress,
      estimatedTimeRemaining,
    };
  }

  /**
   * 获取执行日志
   */
  getLogs(executionId: string, limit?: number): ExecutionLog[] {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return [];
    
    if (limit && limit > 0) {
      return execution.logs.slice(-limit);
    }
    
    return execution.logs;
  }

  /**
   * 获取性能指标
   */
  getMetrics(executionId: string): PerformanceMetrics[] {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return [];
    
    return execution.metrics;
  }

  /**
   * 获取活动执行列表
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * 是否正在监控
   */
  isMonitoring(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * 更新进度（内部方法）
   */
  private updateProgress(executionId: string): void {
    const progress = this.getProgress(executionId);
    if (!progress) return;
    
    this.emitEvent({
      type: MonitorEventType.PROGRESS_UPDATED,
      executionId,
      timestamp: Date.now(),
      data: progress,
    });
  }

  /**
   * 收集性能指标
   */
  private collectPerformanceMetrics(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;
    
    // 获取系统性能数据
    const metrics: PerformanceMetrics = {
      executionId,
      timestamp: Date.now(),
      
      cpu: {
        usage: 0,  // TODO: 实际实现时需要使用系统API
        system: 0,
        user: 0,
      },
      
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      
      network: {
        bytesReceived: 0,  // TODO: 实际实现时需要跟踪网络IO
        bytesSent: 0,
        requestCount: 0,
      },
      
      duration: Date.now() - execution.startTime,
    };
    
    // 计算吞吐量
    const completedNodes = execution.record.stats.completedNodes;
    if (completedNodes > 0 && metrics.duration > 0) {
      metrics.throughput = (completedNodes / metrics.duration) * 1000; // nodes/second
    }
    
    execution.metrics.push(metrics);
    
    // 限制指标数量
    if (execution.metrics.length > 100) {
      execution.metrics = execution.metrics.slice(-100);
    }
    
    this.emitEvent({
      type: MonitorEventType.PERFORMANCE_UPDATED,
      executionId,
      timestamp: Date.now(),
      data: metrics,
    });
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    this.performanceInterval = setInterval(() => {
      for (const executionId of this.activeExecutions.keys()) {
        this.collectPerformanceMetrics(executionId);
      }
    }, this.metricsCollectionInterval);
  }

  /**
   * 停止性能监控
   */
  stopPerformanceMonitoring(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: MonitorEvent): void {
    this.emit(event.type, event);
    this.emit('event', event); // 通用事件
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopPerformanceMonitoring();
    this.activeExecutions.clear();
    this.removeAllListeners();
  }
}

/**
 * WebSocket广播助手
 */
export class MonitorBroadcaster {
  private monitor: ExecutionMonitor;
  private subscribers: Map<string, Set<(event: MonitorEvent) => void>> = new Map();

  constructor(monitor: ExecutionMonitor) {
    this.monitor = monitor;
    this.setupEventHandlers();
  }

  /**
   * 订阅执行监控
   */
  subscribe(executionId: string, callback: (event: MonitorEvent) => void): () => void {
    if (!this.subscribers.has(executionId)) {
      this.subscribers.set(executionId, new Set());
    }
    
    this.subscribers.get(executionId)!.add(callback);
    
    // 返回取消订阅函数
    return () => {
      const subs = this.subscribers.get(executionId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(executionId);
        }
      }
    };
  }

  /**
   * 广播事件到订阅者
   */
  private broadcast(executionId: string, event: MonitorEvent): void {
    const subs = this.subscribers.get(executionId);
    if (!subs) return;
    
    for (const callback of subs) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error broadcasting event to subscriber:', error);
      }
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.monitor.on('event', (event: MonitorEvent) => {
      this.broadcast(event.executionId, event);
      
      // 也广播给订阅了所有执行的监听器
      this.broadcast('*', event);
    });
  }

  /**
   * 获取订阅者数量
   */
  getSubscriberCount(executionId?: string): number {
    if (executionId) {
      return this.subscribers.get(executionId)?.size || 0;
    }
    
    let total = 0;
    for (const subs of this.subscribers.values()) {
      total += subs.size;
    }
    return total;
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.subscribers.clear();
    this.monitor.removeAllListeners();
  }
}

/**
 * 全局执行监控实例
 */
export const executionMonitor = new ExecutionMonitor();
export const monitorBroadcaster = new MonitorBroadcaster(executionMonitor);
