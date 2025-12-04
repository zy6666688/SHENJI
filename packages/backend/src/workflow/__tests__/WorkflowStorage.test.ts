/**
 * WorkflowStorage 测试
 * Week 4: 工作流引擎完善
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowStorage } from '../WorkflowStorage';
import { WorkflowHelper, type WorkflowDefinition } from '../WorkflowDefinition';

describe('WorkflowStorage', () => {
  const testStoragePath = path.join(process.cwd(), 'test-data', 'workflows');
  let storage: WorkflowStorage;
  
  // 测试工作流
  const createTestWorkflow = (id: string = 'test-workflow-1'): WorkflowDefinition => {
    return {
      id,
      name: `Test Workflow ${id}`,
      version: { version: '1.0.0' },
      createdAt: '2025-01-04T00:00:00.000Z',
      updatedAt: '2025-01-04T00:00:00.000Z',
      nodes: [],
      edges: [],
      metadata: {
        tags: ['test', 'example'],
        category: 'testing',
      },
    };
  };
  
  beforeEach(async () => {
    storage = new WorkflowStorage(testStoragePath);
    await storage.initialize();
  });
  
  afterEach(async () => {
    // 清理测试数据
    try {
      const files = await fs.readdir(testStoragePath);
      for (const file of files) {
        await fs.unlink(path.join(testStoragePath, file));
      }
      await fs.rmdir(testStoragePath);
    } catch {
      // 忽略清理错误
    }
  });
  
  describe('初始化', () => {
    it('应该创建存储目录', async () => {
      const stats = await fs.stat(testStoragePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });
  
  describe('保存和获取', () => {
    it('应该保存工作流', async () => {
      const workflow = createTestWorkflow();
      
      const saved = await storage.save(workflow);
      
      expect(saved.id).toBe(workflow.id);
      expect(saved.updatedAt).toBeDefined();
    });
    
    it('应该获取已保存的工作流', async () => {
      const workflow = createTestWorkflow();
      await storage.save(workflow);
      
      const loaded = await storage.get(workflow.id);
      
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(workflow.id);
      expect(loaded!.name).toBe(workflow.name);
    });
    
    it('获取不存在的工作流应返回null', async () => {
      const loaded = await storage.get('nonexistent');
      
      expect(loaded).toBeNull();
    });
    
    it('保存时应更新updatedAt时间戳', async () => {
      const workflow = createTestWorkflow();
      const originalUpdatedAt = workflow.updatedAt;
      
      // 等待一小会儿
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const saved = await storage.save(workflow);
      
      expect(saved.updatedAt).not.toBe(originalUpdatedAt);
    });
    
    it('新工作流应设置createdAt', async () => {
      const workflow = createTestWorkflow();
      delete (workflow as any).createdAt;
      
      const saved = await storage.save(workflow);
      
      expect(saved.createdAt).toBeDefined();
    });
  });
  
  describe('删除', () => {
    it('应该删除工作流', async () => {
      const workflow = createTestWorkflow();
      await storage.save(workflow);
      
      const deleted = await storage.delete(workflow.id);
      
      expect(deleted).toBe(true);
      
      const loaded = await storage.get(workflow.id);
      expect(loaded).toBeNull();
    });
    
    it('删除不存在的工作流应返回false', async () => {
      const deleted = await storage.delete('nonexistent');
      
      expect(deleted).toBe(false);
    });
  });
  
  describe('exists', () => {
    it('应该检测工作流是否存在', async () => {
      const workflow = createTestWorkflow();
      
      let exists = await storage.exists(workflow.id);
      expect(exists).toBe(false);
      
      await storage.save(workflow);
      
      exists = await storage.exists(workflow.id);
      expect(exists).toBe(true);
    });
  });
  
  describe('listIds', () => {
    it('应该列出所有工作流ID', async () => {
      await storage.save(createTestWorkflow('workflow-1'));
      await storage.save(createTestWorkflow('workflow-2'));
      await storage.save(createTestWorkflow('workflow-3'));
      
      const ids = await storage.listIds();
      
      expect(ids.length).toBe(3);
      expect(ids).toContain('workflow-1');
      expect(ids).toContain('workflow-2');
      expect(ids).toContain('workflow-3');
    });
    
    it('空存储应返回空数组', async () => {
      const ids = await storage.listIds();
      
      expect(ids).toEqual([]);
    });
  });
  
  describe('查询', () => {
    beforeEach(async () => {
      // 创建测试数据
      await storage.save({
        ...createTestWorkflow('wf-1'),
        name: 'Alpha Workflow',
        metadata: { tags: ['tag1', 'tag2'], category: 'cat1' },
        isPublished: true,
        status: 'active',
      });
      
      await storage.save({
        ...createTestWorkflow('wf-2'),
        name: 'Beta Workflow',
        metadata: { tags: ['tag2', 'tag3'], category: 'cat2' },
        isPublished: false,
        status: 'active',
      });
      
      await storage.save({
        ...createTestWorkflow('wf-3'),
        name: 'Gamma Workflow',
        metadata: { tags: ['tag1'], category: 'cat1' },
        isPublished: true,
        status: 'inactive',
      });
    });
    
    it('应该返回所有工作流', async () => {
      const result = await storage.query();
      
      expect(result.workflows.length).toBe(3);
      expect(result.total).toBe(3);
    });
    
    it('应该按标签过滤', async () => {
      const result = await storage.query({ tags: ['tag1'] });
      
      expect(result.workflows.length).toBe(2);
      expect(result.workflows.every(w => w.metadata?.tags?.includes('tag1'))).toBe(true);
    });
    
    it('应该按分类过滤', async () => {
      const result = await storage.query({ category: 'cat1' });
      
      expect(result.workflows.length).toBe(2);
      expect(result.workflows.every(w => w.metadata?.category === 'cat1')).toBe(true);
    });
    
    it('应该按状态过滤', async () => {
      const result = await storage.query({ status: 'active' });
      
      expect(result.workflows.length).toBe(2);
      expect(result.workflows.every(w => w.status === 'active')).toBe(true);
    });
    
    it('应该只显示已发布的', async () => {
      const result = await storage.query({ publishedOnly: true });
      
      expect(result.workflows.length).toBe(2);
      expect(result.workflows.every(w => w.isPublished === true)).toBe(true);
    });
    
    it('应该按关键词搜索', async () => {
      const result = await storage.query({ search: 'beta' });
      
      expect(result.workflows.length).toBe(1);
      expect(result.workflows[0].name).toBe('Beta Workflow');
    });
    
    it('应该按名称排序', async () => {
      const result = await storage.query({ sortBy: 'name', sortOrder: 'asc' });
      
      expect(result.workflows[0].name).toBe('Alpha Workflow');
      expect(result.workflows[1].name).toBe('Beta Workflow');
      expect(result.workflows[2].name).toBe('Gamma Workflow');
    });
    
    it('应该分页', async () => {
      const result = await storage.query({ page: 1, pageSize: 2 });
      
      expect(result.workflows.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(2);
    });
    
    it('应该支持组合过滤', async () => {
      const result = await storage.query({
        tags: ['tag1'],
        status: 'active',
        publishedOnly: true,
      });
      
      expect(result.workflows.length).toBe(1);
      expect(result.workflows[0].id).toBe('wf-1');
    });
  });
  
  describe('统计', () => {
    it('应该计算统计信息', async () => {
      await storage.save({
        ...createTestWorkflow('wf-1'),
        isPublished: true,
        status: 'active',
        version: { version: '1.0.0', isDraft: false },
        metadata: { category: 'cat1' },
      });
      
      await storage.save({
        ...createTestWorkflow('wf-2'),
        isPublished: false,
        status: 'active',
        version: { version: '1.0.0', isDraft: true },
        metadata: { category: 'cat1' },
      });
      
      await storage.save({
        ...createTestWorkflow('wf-3'),
        isPublished: true,
        status: 'inactive',
        version: { version: '1.0.0', isDraft: false },
        metadata: { category: 'cat2' },
      });
      
      const stats = await storage.getStats();
      
      expect(stats.totalWorkflows).toBe(3);
      expect(stats.publishedCount).toBe(2);
      expect(stats.draftCount).toBe(1);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byStatus.inactive).toBe(1);
      expect(stats.byCategory.cat1).toBe(2);
      expect(stats.byCategory.cat2).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
  
  describe('缓存', () => {
    it('应该使用缓存', async () => {
      const workflow = createTestWorkflow();
      await storage.save(workflow);
      
      // 第一次获取（从文件）
      const loaded1 = await storage.get(workflow.id);
      
      // 第二次获取（从缓存）
      const loaded2 = await storage.get(workflow.id);
      
      expect(loaded1).toEqual(loaded2);
    });
    
    it('应该能清空缓存', async () => {
      const workflow = createTestWorkflow();
      await storage.save(workflow);
      await storage.get(workflow.id);
      
      storage.clearCache();
      
      // 缓存已清空，再次获取会从文件读取
      const loaded = await storage.get(workflow.id);
      expect(loaded).not.toBeNull();
    });
    
    it('应该能禁用缓存', async () => {
      storage.setCacheEnabled(false);
      
      const workflow = createTestWorkflow();
      await storage.save(workflow);
      
      const loaded = await storage.get(workflow.id);
      expect(loaded).not.toBeNull();
    });
  });
  
  describe('导出导入', () => {
    it('应该导出所有工作流', async () => {
      await storage.save(createTestWorkflow('wf-1'));
      await storage.save(createTestWorkflow('wf-2'));
      await storage.save(createTestWorkflow('wf-3'));
      
      const exported = await storage.exportAll();
      
      expect(exported.length).toBe(3);
    });
    
    it('应该批量导入工作流', async () => {
      const workflows = [
        createTestWorkflow('wf-1'),
        createTestWorkflow('wf-2'),
        createTestWorkflow('wf-3'),
      ];
      
      const result = await storage.importBatch(workflows);
      
      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors.length).toBe(0);
    });
    
    it('导入时应跳过已存在的工作流', async () => {
      await storage.save(createTestWorkflow('wf-1'));
      
      const workflows = [
        createTestWorkflow('wf-1'),
        createTestWorkflow('wf-2'),
      ];
      
      const result = await storage.importBatch(workflows, false);
      
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
    
    it('导入时应能覆盖已存在的工作流', async () => {
      await storage.save(createTestWorkflow('wf-1'));
      
      const workflows = [
        { ...createTestWorkflow('wf-1'), name: 'Updated Name' },
        createTestWorkflow('wf-2'),
      ];
      
      const result = await storage.importBatch(workflows, true);
      
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      
      const loaded = await storage.get('wf-1');
      expect(loaded!.name).toBe('Updated Name');
    });
  });
});
