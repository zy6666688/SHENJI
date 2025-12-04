/**
 * DistributedExecutor - 分布式工作流执行器
 * 长期愿景功能
 * 
 * 支持工作流在多个Worker节点上分布式执行
 * 使用Redis作为消息队列和协调中心
 * 
 * @module distributed/DistributedExecutor
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import { EventEmitter } from 'events';
import type { WorkflowDefinition } from '../workflow/WorkflowDefinition';
import type { WorkflowExecutionRecord } from '../workflow/ExecutionHistory';

/**
 * Worker节点状态
 */
export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
}

/**
 * Worker节点信息
 */
export interface WorkerNode {
  id: string;
  hostname: string;
  ip: string;
  port: number;
  status: WorkerStatus;
  capacity: number;              // 最大并发任务数
  currentLoad: number;           // 当前任务数
  lastHeartbeat: number;         // 最后心跳时间
  capabilities: string[];        // 支持的节点类型
  resources: {
    cpu: number;                 // CPU核心数
    memory: number;              // 内存（MB）
    disk: number;                // 磁盘空间（GB）
  };
  metadata?: Record<string, any>;
}

/**
 * 任务分片
 */
export interface TaskShard {
  shardId: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inputs: any;
  config: any;
  priority: number;
  retryCount: number;
  assignedWorker?: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  createdAt: number;
  assignedAt?: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 任务队列配置
 */
export interface QueueConfig {
  name: string;
  priority: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * 分布式锁
 */
export class DistributedLock {
  private redis: any; // Redis客户端
  private lockKey: string;
  private lockValue: string;
  private ttl: number;

  constructor(redis: any, resource: string, ttl: number = 10000) {
    this.redis = redis;
    this.lockKey = `lock:${resource}`;
    this.lockValue = `${Date.now()}_${Math.random().toString(36)}`;
    this.ttl = ttl;
  }

  /**
   * 获取锁
   */
  async acquire(): Promise<boolean> {
    try {
      const result = await this.redis.set(
        this.lockKey,
        this.lockValue,
        'PX',
        this.ttl,
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }

  /**
   * 释放锁
   */
  async release(): Promise<boolean> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.redis.eval(script, 1, this.lockKey, this.lockValue);
      return result === 1;
    } catch (error) {
      console.error('Failed to release lock:', error);
      return false;
    }
  }

  /**
   * 续期锁
   */
  async renew(): Promise<boolean> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      const result = await this.redis.eval(
        script,
        1,
        this.lockKey,
        this.lockValue,
        this.ttl
      );
      return result === 1;
    } catch (error) {
      console.error('Failed to renew lock:', error);
      return false;
    }
  }
}

/**
 * Worker注册中心
 */
export class WorkerRegistry extends EventEmitter {
  private workers: Map<string, WorkerNode> = new Map();
  private redis: any;
  private heartbeatInterval: number = 5000;
  private heartbeatTimeout: number = 15000;

  constructor(redis: any) {
    super();
    this.redis = redis;
    this.startHeartbeatMonitor();
  }

  /**
   * 注册Worker
   */
  async register(worker: WorkerNode): Promise<void> {
    worker.lastHeartbeat = Date.now();
    this.workers.set(worker.id, worker);

    // 保存到Redis
    await this.redis.hset(
      'workers',
      worker.id,
      JSON.stringify(worker)
    );

    this.emit('worker:registered', worker);
    console.log(`Worker registered: ${worker.id}`);
  }

  /**
   * 注销Worker
   */
  async unregister(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.delete(workerId);
      await this.redis.hdel('workers', workerId);
      this.emit('worker:unregistered', worker);
      console.log(`Worker unregistered: ${workerId}`);
    }
  }

  /**
   * 更新心跳
   */
  async heartbeat(workerId: string, status: WorkerStatus, currentLoad: number): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = Date.now();
      worker.status = status;
      worker.currentLoad = currentLoad;

      // 更新Redis
      await this.redis.hset('workers', workerId, JSON.stringify(worker));
    }
  }

  /**
   * 获取可用Worker
   */
  getAvailableWorkers(capability?: string): WorkerNode[] {
    const now = Date.now();
    return Array.from(this.workers.values()).filter(worker => {
      const isHealthy = now - worker.lastHeartbeat < this.heartbeatTimeout;
      const hasCapacity = worker.currentLoad < worker.capacity;
      const hasCapability = !capability || worker.capabilities.includes(capability);
      
      return isHealthy && hasCapacity && hasCapability && worker.status === WorkerStatus.IDLE;
    });
  }

  /**
   * 选择最佳Worker（负载均衡）
   */
  selectBestWorker(capability?: string): WorkerNode | null {
    const available = this.getAvailableWorkers(capability);
    if (available.length === 0) return null;

    // 选择负载最低的Worker
    return available.reduce((best, current) => {
      const bestLoad = best.currentLoad / best.capacity;
      const currentLoad = current.currentLoad / current.capacity;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [workerId, worker] of this.workers.entries()) {
        if (now - worker.lastHeartbeat > this.heartbeatTimeout) {
          worker.status = WorkerStatus.OFFLINE;
          this.emit('worker:timeout', worker);
          console.warn(`Worker timeout: ${workerId}`);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * 获取所有Worker
   */
  getAllWorkers(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  /**
   * 获取Worker统计
   */
  getStats() {
    const workers = Array.from(this.workers.values());
    return {
      total: workers.length,
      idle: workers.filter(w => w.status === WorkerStatus.IDLE).length,
      busy: workers.filter(w => w.status === WorkerStatus.BUSY).length,
      offline: workers.filter(w => w.status === WorkerStatus.OFFLINE).length,
      error: workers.filter(w => w.status === WorkerStatus.ERROR).length,
      totalCapacity: workers.reduce((sum, w) => sum + w.capacity, 0),
      totalLoad: workers.reduce((sum, w) => sum + w.currentLoad, 0),
    };
  }
}

/**
 * 任务调度器
 */
export class TaskScheduler extends EventEmitter {
  private redis: any;
  private registry: WorkerRegistry;
  private taskQueue: TaskShard[] = [];
  private runningTasks: Map<string, TaskShard> = new Map();

  constructor(redis: any, registry: WorkerRegistry) {
    super();
    this.redis = redis;
    this.registry = registry;
    this.startScheduler();
  }

  /**
   * 提交任务
   */
  async submitTask(task: TaskShard): Promise<void> {
    this.taskQueue.push(task);
    
    // 保存到Redis队列
    await this.redis.lpush('task:queue', JSON.stringify(task));
    
    this.emit('task:submitted', task);
  }

  /**
   * 启动调度循环
   */
  private startScheduler(): void {
    setInterval(() => {
      this.scheduleNextTask();
    }, 1000);
  }

  /**
   * 调度下一个任务
   */
  private async scheduleNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    // 按优先级排序
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < this.taskQueue.length; i++) {
      const task = this.taskQueue[i];
      
      // 选择Worker
      const worker = this.registry.selectBestWorker(task.nodeType);
      if (!worker) continue;

      // 分配任务
      task.assignedWorker = worker.id;
      task.status = 'assigned';
      task.assignedAt = Date.now();

      // 从队列中移除
      this.taskQueue.splice(i, 1);
      this.runningTasks.set(task.shardId, task);

      // 通知Worker
      await this.notifyWorker(worker.id, task);
      
      this.emit('task:assigned', { task, worker });
      break;
    }
  }

  /**
   * 通知Worker执行任务
   */
  private async notifyWorker(workerId: string, task: TaskShard): Promise<void> {
    await this.redis.publish(
      `worker:${workerId}:tasks`,
      JSON.stringify({
        type: 'execute',
        task,
      })
    );
  }

  /**
   * 任务完成回调
   */
  async onTaskCompleted(shardId: string, result: any): Promise<void> {
    const task = this.runningTasks.get(shardId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = Date.now();
    this.runningTasks.delete(shardId);

    this.emit('task:completed', { task, result });
  }

  /**
   * 任务失败回调
   */
  async onTaskFailed(shardId: string, error: any): Promise<void> {
    const task = this.runningTasks.get(shardId);
    if (!task) return;

    task.retryCount++;

    if (task.retryCount < 3) {
      // 重新加入队列
      task.status = 'pending';
      task.assignedWorker = undefined;
      this.taskQueue.push(task);
      this.runningTasks.delete(shardId);
      
      this.emit('task:retry', { task, error });
    } else {
      // 标记为失败
      task.status = 'failed';
      this.runningTasks.delete(shardId);
      
      this.emit('task:failed', { task, error });
    }
  }

  /**
   * 获取任务统计
   */
  getStats() {
    return {
      pending: this.taskQueue.length,
      running: this.runningTasks.size,
      queuedByPriority: this.taskQueue.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    };
  }
}

/**
 * 分布式执行器
 */
export class DistributedExecutor extends EventEmitter {
  private redis: any;
  private registry: WorkerRegistry;
  private scheduler: TaskScheduler;
  private isCoordinator: boolean;

  constructor(redis: any, isCoordinator: boolean = true) {
    super();
    this.redis = redis;
    this.isCoordinator = isCoordinator;
    this.registry = new WorkerRegistry(redis);
    this.scheduler = new TaskScheduler(redis, this.registry);

    // 转发事件
    this.registry.on('worker:registered', (worker) => this.emit('worker:registered', worker));
    this.scheduler.on('task:assigned', (data) => this.emit('task:assigned', data));
    this.scheduler.on('task:completed', (data) => this.emit('task:completed', data));
  }

  /**
   * 分布式执行工作流
   */
  async executeDistributed(
    workflow: WorkflowDefinition,
    executionId: string,
    trigger: any
  ): Promise<void> {
    if (!this.isCoordinator) {
      throw new Error('Only coordinator can execute workflows');
    }

    console.log(`Starting distributed execution: ${executionId}`);

    // 1. 分析工作流拓扑，生成任务分片
    const shards = this.createTaskShards(workflow, executionId);

    // 2. 提交任务到调度器
    for (const shard of shards) {
      await this.scheduler.submitTask(shard);
    }

    this.emit('execution:started', { executionId, totalShards: shards.length });
  }

  /**
   * 创建任务分片
   */
  private createTaskShards(workflow: WorkflowDefinition, executionId: string): TaskShard[] {
    const shards: TaskShard[] = [];

    for (const node of workflow.nodes) {
      const shard: TaskShard = {
        shardId: `${executionId}_${node.id}`,
        executionId,
        nodeId: node.id,
        nodeName: node.label || node.id,
        nodeType: node.type,
        inputs: node.inputs,
        config: node.config,
        priority: 1, // 可以基于节点依赖计算优先级
        retryCount: 0,
        status: 'pending',
        createdAt: Date.now(),
      };
      shards.push(shard);
    }

    return shards;
  }

  /**
   * 注册Worker（Worker端调用）
   */
  async registerAsWorker(workerInfo: Omit<WorkerNode, 'lastHeartbeat'>): Promise<void> {
    const worker: WorkerNode = {
      ...workerInfo,
      lastHeartbeat: Date.now(),
    };
    await this.registry.register(worker);

    // 开始发送心跳
    this.startWorkerHeartbeat(worker.id);
  }

  /**
   * Worker心跳
   */
  private startWorkerHeartbeat(workerId: string): void {
    setInterval(async () => {
      await this.registry.heartbeat(workerId, WorkerStatus.IDLE, 0);
    }, 5000);
  }

  /**
   * 获取集群状态
   */
  getClusterStatus() {
    return {
      workers: this.registry.getStats(),
      tasks: this.scheduler.getStats(),
      isCoordinator: this.isCoordinator,
    };
  }

  /**
   * 获取所有Worker
   */
  getWorkers(): WorkerNode[] {
    return this.registry.getAllWorkers();
  }
}

/**
 * 创建分布式执行器实例
 */
export function createDistributedExecutor(
  redis: any,
  isCoordinator: boolean = true
): DistributedExecutor {
  return new DistributedExecutor(redis, isCoordinator);
}
