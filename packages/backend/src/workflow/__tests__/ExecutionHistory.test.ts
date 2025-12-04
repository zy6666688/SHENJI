/**
 * ExecutionHistory测试
 * Week 4: 工作流引擎完善
 * 
 * @module workflow/__tests__/ExecutionHistory.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ExecutionHistoryStorage,
  ExecutionStatus,
  NodeExecutionStatus,
  type WorkflowExecutionRecord,
  type NodeExecutionRecord,
} from '../ExecutionHistory';
import { WorkflowHelper } from '../WorkflowDefinition';

describe('ExecutionHistory', () => {
  let storage: ExecutionHistoryStorage;
  const testDir = path.resolve('test-data/executions');

  beforeEach(async () => {
    // 创建测试存储
    storage = new ExecutionHistoryStorage(testDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略错误
    }
  });

  describe('初始化', () => {
    it('should initialize storage directory', async () => {
      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('创建执行记录', () => {
    it('should create execution record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      
      const record = await storage.createExecution(
        workflow,
        { type: 'manual', userId: 'user123' }
      );
      
      expect(record.id).toMatch(/^exec_/);
      expect(record.workflowId).toBe(workflow.id);
      expect(record.workflowName).toBe('Test Workflow');
      expect(record.status).toBe(ExecutionStatus.PENDING);
      expect(record.trigger.type).toBe('manual');
      expect(record.trigger.userId).toBe('user123');
      expect(record.nodes).toEqual([]);
      expect(record.stats.totalNodes).toBe(0);
    });

    it('should create execution with context', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      
      const record = await storage.createExecution(
        workflow,
        { type: 'api' },
        { environment: 'production', variables: { key: 'value' } }
      );
      
      expect(record.context.environment).toBe('production');
      expect(record.context.variables).toEqual({ key: 'value' });
    });
  });

  describe('保存和获取', () => {
    it('should save and retrieve execution record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      const retrieved = await storage.get(record.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(record.id);
      expect(retrieved?.workflowId).toBe(workflow.id);
      expect(retrieved?.status).toBe(ExecutionStatus.PENDING);
    });

    it('should return null for non-existent record', async () => {
      const record = await storage.get('non-existent-id');
      expect(record).toBeNull();
    });

    it('should update existing record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      record.status = ExecutionStatus.RUNNING;
      await storage.save(record);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.status).toBe(ExecutionStatus.RUNNING);
    });
  });

  describe('更新状态', () => {
    it('should update execution status', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.updateStatus(record.id, ExecutionStatus.RUNNING);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.status).toBe(ExecutionStatus.RUNNING);
    });

    it('should set end time when completed', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.updateStatus(record.id, ExecutionStatus.COMPLETED);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.endTime).toBeDefined();
      expect(retrieved?.duration).toBeDefined();
      expect(retrieved?.duration).toBeGreaterThan(0);
    });

    it('should set error when failed', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.updateStatus(record.id, ExecutionStatus.FAILED, {
        message: 'Test error',
        failedNodeId: 'node1',
      });
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.status).toBe(ExecutionStatus.FAILED);
      expect(retrieved?.error?.message).toBe('Test error');
      expect(retrieved?.error?.failedNodeId).toBe('node1');
    });
  });

  describe('节点执行记录', () => {
    it('should add node execution record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      workflow.nodes.push({
        id: 'node1',
        type: 'input',
        label: 'Input Node',
        position: { x: 0, y: 0 },
        config: {},
        inputs: {},
      });
      
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      const nodeRecord: NodeExecutionRecord = {
        nodeId: 'node1',
        nodeName: 'Input Node',
        nodeType: 'input',
        status: NodeExecutionStatus.COMPLETED,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        inputs: { data: 'test' },
        outputs: { result: 'success' },
      };
      
      await storage.addNodeExecution(record.id, nodeRecord);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.nodes).toHaveLength(1);
      expect(retrieved?.nodes[0].nodeId).toBe('node1');
      expect(retrieved?.nodes[0].status).toBe(NodeExecutionStatus.COMPLETED);
      expect(retrieved?.stats.completedNodes).toBe(1);
    });

    it('should update existing node record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      workflow.nodes.push({
        id: 'node1',
        type: 'input',
        label: 'Input Node',
        position: { x: 0, y: 0 },
        config: {},
        inputs: {},
      });
      
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      const nodeRecord1: NodeExecutionRecord = {
        nodeId: 'node1',
        nodeName: 'Input Node',
        nodeType: 'input',
        status: NodeExecutionStatus.RUNNING,
        startTime: Date.now(),
      };
      
      await storage.addNodeExecution(record.id, nodeRecord1);
      
      const nodeRecord2: NodeExecutionRecord = {
        ...nodeRecord1,
        status: NodeExecutionStatus.COMPLETED,
        endTime: Date.now(),
        duration: 1000,
      };
      
      await storage.addNodeExecution(record.id, nodeRecord2);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.nodes).toHaveLength(1);
      expect(retrieved?.nodes[0].status).toBe(NodeExecutionStatus.COMPLETED);
    });

    it('should track node statistics', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      workflow.nodes.push(
        { id: 'node1', type: 'input', label: 'Node 1', position: { x: 0, y: 0 }, config: {}, inputs: {} },
        { id: 'node2', type: 'process', label: 'Node 2', position: { x: 100, y: 0 }, config: {}, inputs: {} },
        { id: 'node3', type: 'output', label: 'Node 3', position: { x: 200, y: 0 }, config: {}, inputs: {} }
      );
      
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.addNodeExecution(record.id, {
        nodeId: 'node1',
        nodeName: 'Node 1',
        nodeType: 'input',
        status: NodeExecutionStatus.COMPLETED,
        startTime: Date.now(),
      });
      
      await storage.addNodeExecution(record.id, {
        nodeId: 'node2',
        nodeName: 'Node 2',
        nodeType: 'process',
        status: NodeExecutionStatus.FAILED,
        startTime: Date.now(),
        error: { message: 'Test error' },
      });
      
      await storage.addNodeExecution(record.id, {
        nodeId: 'node3',
        nodeName: 'Node 3',
        nodeType: 'output',
        status: NodeExecutionStatus.SKIPPED,
        startTime: Date.now(),
      });
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.stats.completedNodes).toBe(1);
      expect(retrieved?.stats.failedNodes).toBe(1);
      expect(retrieved?.stats.skippedNodes).toBe(1);
    });
  });

  describe('检查点管理', () => {
    it('should add checkpoint', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.addCheckpoint(record.id, 'node1', { data: 'checkpoint state' });
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.checkpoints).toHaveLength(1);
      expect(retrieved?.checkpoints?.[0].nodeId).toBe('node1');
      expect(retrieved?.checkpoints?.[0].state).toEqual({ data: 'checkpoint state' });
      expect(retrieved?.checkpoints?.[0].timestamp).toBeDefined();
    });

    it('should add multiple checkpoints', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      await storage.addCheckpoint(record.id, 'node1', { step: 1 });
      await storage.addCheckpoint(record.id, 'node2', { step: 2 });
      await storage.addCheckpoint(record.id, 'node3', { step: 3 });
      
      const retrieved = await storage.get(record.id);
      expect(retrieved?.checkpoints).toHaveLength(3);
    });
  });

  describe('查询', () => {
    beforeEach(async () => {
      // 创建测试数据
      const workflow1 = WorkflowHelper.createNew('Workflow 1');
      const workflow2 = WorkflowHelper.createNew('Workflow 2');
      
      await storage.createExecution(workflow1, { type: 'manual', userId: 'user1' });
      await storage.createExecution(workflow1, { type: 'api', userId: 'user2' });
      await storage.createExecution(workflow2, { type: 'schedule' });
      
      const record4 = await storage.createExecution(workflow2, { type: 'manual' });
      await storage.updateStatus(record4.id, ExecutionStatus.COMPLETED);
    });

    it('should query all executions', async () => {
      const result = await storage.query();
      
      expect(result.executions.length).toBeGreaterThanOrEqual(4);
      expect(result.total).toBeGreaterThanOrEqual(4);
    });

    it('should filter by workflow ID', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      const result = await storage.query({ workflowId: workflow.id });
      
      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].id).toBe(record.id);
    });

    it('should filter by status', async () => {
      const result = await storage.query({
        status: [ExecutionStatus.COMPLETED],
      });
      
      expect(result.executions.length).toBeGreaterThanOrEqual(1);
      result.executions.forEach(exec => {
        expect(exec.status).toBe(ExecutionStatus.COMPLETED);
      });
    });

    it('should filter by trigger type', async () => {
      const result = await storage.query({ triggerType: 'manual' });
      
      expect(result.executions.length).toBeGreaterThanOrEqual(2);
      result.executions.forEach(exec => {
        expect(exec.trigger.type).toBe('manual');
      });
    });

    it('should filter by user ID', async () => {
      const result = await storage.query({ userId: 'user1' });
      
      expect(result.executions.length).toBeGreaterThanOrEqual(1);
      result.executions.forEach(exec => {
        expect(exec.trigger.userId).toBe('user1');
      });
    });

    it('should support pagination', async () => {
      const result = await storage.query({ page: 1, pageSize: 2 });
      
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.executions.length).toBeLessThanOrEqual(2);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should sort by start time descending', async () => {
      const result = await storage.query({
        sortBy: 'startTime',
        sortOrder: 'desc',
      });
      
      for (let i = 1; i < result.executions.length; i++) {
        expect(result.executions[i - 1].startTime).toBeGreaterThanOrEqual(
          result.executions[i].startTime
        );
      }
    });
  });

  describe('统计', () => {
    beforeEach(async () => {
      const workflow1 = WorkflowHelper.createNew('Workflow 1');
      const workflow2 = WorkflowHelper.createNew('Workflow 2');
      
      const record1 = await storage.createExecution(workflow1, { type: 'manual' });
      await storage.updateStatus(record1.id, ExecutionStatus.COMPLETED);
      
      const record2 = await storage.createExecution(workflow1, { type: 'manual' });
      await storage.updateStatus(record2.id, ExecutionStatus.FAILED);
      
      const record3 = await storage.createExecution(workflow2, { type: 'manual' });
      await storage.updateStatus(record3.id, ExecutionStatus.COMPLETED);
    });

    it('should get execution statistics', async () => {
      const stats = await storage.getStats();
      
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byStatus[ExecutionStatus.COMPLETED]).toBeGreaterThanOrEqual(2);
      expect(stats.byStatus[ExecutionStatus.FAILED]).toBeGreaterThanOrEqual(1);
    });

    it('should calculate success rate', async () => {
      const stats = await storage.getStats();
      
      expect(stats.successRate).toBeDefined();
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });

    it('should group by workflow', async () => {
      const stats = await storage.getStats();
      
      expect(Object.keys(stats.byWorkflow).length).toBeGreaterThanOrEqual(2);
      
      for (const workflowId in stats.byWorkflow) {
        const workflowStats = stats.byWorkflow[workflowId];
        expect(workflowStats.total).toBeGreaterThan(0);
        expect(workflowStats.completed).toBeGreaterThanOrEqual(0);
        expect(workflowStats.failed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('删除', () => {
    it('should delete execution record', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      const deleted = await storage.delete(record.id);
      expect(deleted).toBe(true);
      
      const retrieved = await storage.get(record.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent record', async () => {
      const deleted = await storage.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('清理', () => {
    it('should cleanup old records', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      
      // 创建旧记录（模拟30天前）
      const oldRecord = await storage.createExecution(workflow, { type: 'manual' });
      oldRecord.createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      await storage.save(oldRecord);
      
      // 创建新记录
      await storage.createExecution(workflow, { type: 'manual' });
      
      const deletedCount = await storage.cleanup(30);
      
      expect(deletedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('缓存', () => {
    it('should cache retrieved records', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      const record = await storage.createExecution(workflow, { type: 'manual' });
      
      // 第一次获取
      const retrieved1 = await storage.get(record.id);
      
      // 第二次获取（应该从缓存）
      const retrieved2 = await storage.get(record.id);
      
      expect(retrieved1).toEqual(retrieved2);
    });

    it('should clear cache', async () => {
      const workflow = WorkflowHelper.createNew('Test Workflow');
      await storage.createExecution(workflow, { type: 'manual' });
      
      storage.clearCache();
      
      // 缓存已清空，后续获取会从文件系统读取
      // 这里只是确保clearCache不会抛出错误
      expect(true).toBe(true);
    });
  });
});
