/**
 * NodeRegistryV2 单元测试
 * Week 1 Day 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NodeRegistryV2, RegistryError, ExecutionError } from './NodeRegistryV2';
import type { NodeDefinition, ExecutionContext } from '@audit/shared';

describe('NodeRegistryV2', () => {
  let registry: NodeRegistryV2;
  
  beforeEach(() => {
    registry = new NodeRegistryV2();
  });
  
  // 测试用的简单节点定义
  const testNode: NodeDefinition = {
    manifest: {
      type: 'test_node',
      version: '1.0.0',
      category: 'utility',
      label: { zh: '测试节点', en: 'Test Node' },
      description: { zh: '用于测试', en: 'For testing' },
      inputsSchema: {
        type: 'object',
        required: ['value'],
        properties: {
          value: { type: 'number' }
        }
      },
      outputsSchema: {
        type: 'object',
        required: ['result'],
        properties: {
          result: { type: 'number' }
        }
      },
      capabilities: ['cpu-bound']
    },
    execute: async (inputs) => {
      return { result: inputs.value * 2 };
    }
  };
  
  describe('register', () => {
    it('should register a valid node', () => {
      expect(() => registry.register(testNode)).not.toThrow();
      expect(registry.has('test_node')).toBe(true);
    });
    
    it('should throw error for invalid manifest', () => {
      const invalidNode = {
        manifest: {
          // 缺少必需字段
          type: 'invalid'
        },
        execute: async () => ({})
      } as any;
      
      expect(() => registry.register(invalidNode)).toThrow(RegistryError);
    });
    
    it('should throw error when execute function is missing', () => {
      const noExecuteNode = {
        manifest: testNode.manifest
      } as any;
      
      expect(() => registry.register(noExecuteNode)).toThrow(RegistryError);
    });
  });
  
  describe('get', () => {
    it('should get registered node', () => {
      registry.register(testNode);
      const node = registry.get('test_node');
      expect(node).toBeDefined();
      expect(node.manifest.type).toBe('test_node');
    });
    
    it('should throw error for non-existent node', () => {
      expect(() => registry.get('non_existent')).toThrow(RegistryError);
    });
  });
  
  describe('execute', () => {
    const context: ExecutionContext = {
      executionId: 'test-exec',
      nodeId: 'test-node',
      graphId: 'test-graph',
      userId: 'test-user',
      logger: console
    };
    
    beforeEach(() => {
      registry.register(testNode);
    });
    
    it('should execute node with valid inputs', async () => {
      const result = await registry.execute(
        'test_node',
        { value: 10 },
        {},
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.outputs?.result).toBe(20);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should fail with invalid inputs', async () => {
      const result = await registry.execute(
        'test_node',
        { value: 'invalid' }, // 应该是number
        {},
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INPUT_VALIDATION_FAILED');
    });
    
    it('should fail with missing required inputs', async () => {
      const result = await registry.execute(
        'test_node',
        {}, // 缺少value
        {},
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('list', () => {
    it('should list all registered nodes', () => {
      registry.register(testNode);
      const list = registry.list();
      expect(list).toContain('test_node');
      expect(list.length).toBe(1);
    });
    
    it('should return empty array when no nodes registered', () => {
      const list = registry.list();
      expect(list).toEqual([]);
    });
  });
  
  describe('validateExamples', () => {
    const nodeWithExamples: NodeDefinition = {
      manifest: {
        ...testNode.manifest,
        type: 'node_with_examples',
        examples: [
          {
            name: 'example1',
            inputs: { value: 5 },
            expectedOutputs: { result: 10 }
          },
          {
            name: 'example2',
            inputs: { value: 10 },
            expectedOutputs: { result: 20 }
          }
        ]
      },
      execute: testNode.execute
    };
    
    it('should validate all examples successfully', async () => {
      registry.register(nodeWithExamples);
      const result = await registry.validateExamples('node_with_examples');
      
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });
  
  describe('unregister and clear', () => {
    it('should unregister a node', () => {
      registry.register(testNode);
      expect(registry.has('test_node')).toBe(true);
      
      const result = registry.unregister('test_node');
      expect(result).toBe(true);
      expect(registry.has('test_node')).toBe(false);
    });
    
    it('should clear all nodes', () => {
      registry.register(testNode);
      expect(registry.list().length).toBe(1);
      
      registry.clear();
      expect(registry.list().length).toBe(0);
    });
  });
});
