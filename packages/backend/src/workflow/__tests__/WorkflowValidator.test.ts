/**
 * WorkflowValidator 测试
 * Week 4: 工作流引擎完善
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowValidator, validateWorkflow } from '../WorkflowValidator';
import type { WorkflowDefinition } from '../WorkflowDefinition';

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;
  
  beforeEach(() => {
    validator = new WorkflowValidator();
  });
  
  describe('Schema验证', () => {
    it('应该验证必需字段', () => {
      const invalidWorkflow = {
        nodes: [],
        edges: [],
      } as any;
      
      const result = validator.validate(invalidWorkflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });
    
    it('应该接受有效的工作流', () => {
      const validWorkflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
      };
      
      const result = validator.validate(validWorkflow);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('应该警告无效的版本格式', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: 'invalid-version' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.warnings.some(w => w.code === 'INVALID_VERSION_FORMAT')).toBe(true);
    });
  });
  
  describe('节点验证', () => {
    it('应该检测重复的节点ID', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          {
            id: 'node1',
            type: 'test-node',
            position: { x: 0, y: 0 },
            config: {},
            inputs: {},
          },
          {
            id: 'node1', // 重复ID
            type: 'test-node',
            position: { x: 100, y: 0 },
            config: {},
            inputs: {},
          },
        ],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
    });
    
    it('应该验证节点类型', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          {
            id: 'node1',
            type: '', // 空类型
            position: { x: 0, y: 0 },
            config: {},
            inputs: {},
          },
        ],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });
    
    it('应该检测未注册的节点类型', () => {
      const nodeRegistry = new Map([['known-type', {}]]);
      validator.setNodeRegistry(nodeRegistry);
      
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          {
            id: 'node1',
            type: 'unknown-type',
            position: { x: 0, y: 0 },
            config: {},
            inputs: {},
          },
        ],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNKNOWN_NODE_TYPE')).toBe(true);
    });
    
    it('应该警告无效的节点位置', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          {
            id: 'node1',
            type: 'test-node',
            position: { x: 'invalid' as any, y: 0 },
            config: {},
            inputs: {},
          },
        ],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.warnings.some(w => w.code === 'INVALID_POSITION')).toBe(true);
    });
  });
  
  describe('连接验证', () => {
    it('应该检测重复的连接ID', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
          { id: 'node2', type: 'test', position: { x: 100, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            sourceOutput: 'out1',
            target: 'node2',
            targetInput: 'in1',
          },
          {
            id: 'edge1', // 重复ID
            source: 'node1',
            sourceOutput: 'out2',
            target: 'node2',
            targetInput: 'in2',
          },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_EDGE_ID')).toBe(true);
    });
    
    it('应该验证连接的源和目标节点存在', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            sourceOutput: 'out1',
            target: 'nonexistent', // 不存在的节点
            targetInput: 'in1',
          },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TARGET_NODE')).toBe(true);
    });
    
    it('应该检测自环', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            sourceOutput: 'out1',
            target: 'node1', // 指向自己
            targetInput: 'in1',
          },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SELF_LOOP')).toBe(true);
    });
  });
  
  describe('拓扑验证', () => {
    it('应该警告空工作流', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.warnings.some(w => w.code === 'EMPTY_WORKFLOW')).toBe(true);
    });
    
    it('应该检测循环依赖', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
          { id: 'node2', type: 'test', position: { x: 100, y: 0 }, config: {}, inputs: {} },
          { id: 'node3', type: 'test', position: { x: 200, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          { id: 'edge1', source: 'node1', sourceOutput: 'out', target: 'node2', targetInput: 'in' },
          { id: 'edge2', source: 'node2', sourceOutput: 'out', target: 'node3', targetInput: 'in' },
          { id: 'edge3', source: 'node3', sourceOutput: 'out', target: 'node1', targetInput: 'in' }, // 循环
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });
    
    it('应该警告孤立节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
          { id: 'node2', type: 'test', position: { x: 100, y: 0 }, config: {}, inputs: {} },
          { id: 'isolated', type: 'test', position: { x: 200, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          { id: 'edge1', source: 'node1', sourceOutput: 'out', target: 'node2', targetInput: 'in' },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.warnings.some(w => w.code === 'ISOLATED_NODE')).toBe(true);
    });
  });
  
  describe('设置验证', () => {
    it('应该验证maxConcurrency', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
        settings: {
          maxConcurrency: 0, // 无效值
        },
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'settings.maxConcurrency')).toBe(true);
    });
    
    it('应该警告高并发值', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
        settings: {
          maxConcurrency: 200, // 很高的值
        },
      };
      
      const result = validator.validate(workflow);
      
      expect(result.warnings.some(w => w.code === 'HIGH_CONCURRENCY')).toBe(true);
    });
    
    it('应该验证重试策略', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
        settings: {
          retryPolicy: {
            maxRetries: -1, // 无效值
            backoff: 'exponential',
          },
        },
      };
      
      const result = validator.validate(workflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'settings.retryPolicy.maxRetries')).toBe(true);
    });
  });
  
  describe('统计信息', () => {
    it('应该计算基本统计', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
          { id: 'node2', type: 'test', position: { x: 100, y: 0 }, config: {}, inputs: {} },
          { id: 'node3', type: 'test', position: { x: 200, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [
          { id: 'edge1', source: 'node1', sourceOutput: 'out', target: 'node2', targetInput: 'in' },
          { id: 'edge2', source: 'node2', sourceOutput: 'out', target: 'node3', targetInput: 'in' },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.stats.totalNodes).toBe(3);
      expect(result.stats.totalEdges).toBe(2);
      expect(result.stats.startNodes).toBe(1); // node1
      expect(result.stats.endNodes).toBe(1);   // node3
      expect(result.stats.maxDepth).toBe(3);   // node1 -> node2 -> node3
    });
    
    it('应该计算复杂图的深度', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test', position: { x: 0, y: 0 }, config: {}, inputs: {} },
          { id: 'node2', type: 'test', position: { x: 100, y: 0 }, config: {}, inputs: {} },
          { id: 'node3', type: 'test', position: { x: 100, y: 100 }, config: {}, inputs: {} },
          { id: 'node4', type: 'test', position: { x: 200, y: 50 }, config: {}, inputs: {} },
        ],
        edges: [
          { id: 'edge1', source: 'node1', sourceOutput: 'out1', target: 'node2', targetInput: 'in' },
          { id: 'edge2', source: 'node1', sourceOutput: 'out2', target: 'node3', targetInput: 'in' },
          { id: 'edge3', source: 'node2', sourceOutput: 'out', target: 'node4', targetInput: 'in1' },
          { id: 'edge4', source: 'node3', sourceOutput: 'out', target: 'node4', targetInput: 'in2' },
        ],
      };
      
      const result = validator.validate(workflow);
      
      expect(result.stats.maxDepth).toBe(3); // node1 -> node2/node3 -> node4
    });
  });
  
  describe('validateWorkflow辅助函数', () => {
    it('应该能直接使用validateWorkflow函数', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [],
        edges: [],
      };
      
      const result = validateWorkflow(workflow);
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });
    
    it('应该支持传递节点注册表', () => {
      const nodeRegistry = new Map([['test-type', {}]]);
      
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: { version: '1.0.0' },
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
        nodes: [
          { id: 'node1', type: 'test-type', position: { x: 0, y: 0 }, config: {}, inputs: {} },
        ],
        edges: [],
      };
      
      const result = validateWorkflow(workflow, nodeRegistry);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});
