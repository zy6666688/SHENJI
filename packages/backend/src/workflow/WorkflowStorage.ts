/**
 * WorkflowStorage - 工作流存储管理
 * Week 4: 工作流引擎完善
 * 
 * 功能：
 * 1. 保存工作流定义到文件系统
 * 2. 加载工作流定义
 * 3. 查询和过滤工作流
 * 4. 删除工作流
 * 5. 支持版本管理
 * 
 * 存储格式：
 * - 每个工作流存储为单独的JSON文件
 * - 文件名：{workflowId}.json
 * - 存储路径：data/workflows/
 * 
 * @module workflow/WorkflowStorage
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorkflowDefinition } from './WorkflowDefinition';

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 标签过滤 */
  tags?: string[];
  
  /** 分类过滤 */
  category?: string;
  
  /** 状态过滤 */
  status?: 'active' | 'inactive' | 'deprecated';
  
  /** 是否只显示已发布的 */
  publishedOnly?: boolean;
  
  /** 作者过滤 */
  author?: string;
  
  /** 搜索关键词（匹配名称和描述） */
  search?: string;
  
  /** 排序字段 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  
  /** 分页 - 页码（从1开始） */
  page?: number;
  
  /** 分页 - 每页数量 */
  pageSize?: number;
}

/**
 * 查询结果
 */
export interface QueryResult {
  /** 工作流列表 */
  workflows: WorkflowDefinition[];
  
  /** 总数 */
  total: number;
  
  /** 当前页 */
  page: number;
  
  /** 每页数量 */
  pageSize: number;
  
  /** 总页数 */
  totalPages: number;
}

/**
 * 存储统计信息
 */
export interface StorageStats {
  /** 工作流总数 */
  totalWorkflows: number;
  
  /** 已发布数量 */
  publishedCount: number;
  
  /** 草稿数量 */
  draftCount: number;
  
  /** 各状态数量 */
  byStatus: Record<string, number>;
  
  /** 各分类数量 */
  byCategory: Record<string, number>;
  
  /** 存储大小（字节） */
  totalSize: number;
}

/**
 * 工作流存储管理器
 */
export class WorkflowStorage {
  private storagePath: string;
  private cache: Map<string, WorkflowDefinition> = new Map();
  private cacheEnabled: boolean = true;
  
  /**
   * 构造函数
   * 
   * @param storagePath 存储路径
   */
  constructor(storagePath: string = path.join(process.cwd(), 'data', 'workflows')) {
    this.storagePath = storagePath;
  }
  
  /**
   * 初始化存储
   * 确保存储目录存在
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to initialize workflow storage: ${error.message}`);
    }
  }
  
  /**
   * 保存工作流
   * 
   * @param workflow 工作流定义
   * @returns 保存后的工作流
   */
  async save(workflow: WorkflowDefinition): Promise<WorkflowDefinition> {
    // 更新时间戳
    workflow.updatedAt = new Date().toISOString();
    
    // 如果是新工作流，设置创建时间
    if (!workflow.createdAt) {
      workflow.createdAt = workflow.updatedAt;
    }
    
    // 构建文件路径
    const filePath = this.getFilePath(workflow.id);
    
    try {
      // 写入文件
      const content = JSON.stringify(workflow, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      
      // 更新缓存
      if (this.cacheEnabled) {
        this.cache.set(workflow.id, workflow);
      }
      
      return workflow;
    } catch (error: any) {
      throw new Error(`Failed to save workflow ${workflow.id}: ${error.message}`);
    }
  }
  
  /**
   * 根据ID获取工作流
   * 
   * @param id 工作流ID
   * @returns 工作流定义，如果不存在返回null
   */
  async get(id: string): Promise<WorkflowDefinition | null> {
    // 先检查缓存
    if (this.cacheEnabled && this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    
    const filePath = this.getFilePath(id);
    
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      
      // 读取文件
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content) as WorkflowDefinition;
      
      // 更新缓存
      if (this.cacheEnabled) {
        this.cache.set(id, workflow);
      }
      
      return workflow;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // 文件不存在
      }
      throw new Error(`Failed to load workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * 删除工作流
   * 
   * @param id 工作流ID
   * @returns 是否成功删除
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    try {
      await fs.unlink(filePath);
      
      // 从缓存中移除
      this.cache.delete(id);
      
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false; // 文件不存在
      }
      throw new Error(`Failed to delete workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * 检查工作流是否存在
   * 
   * @param id 工作流ID
   * @returns 是否存在
   */
  async exists(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 列出所有工作流
   * 
   * @returns 工作流ID列表
   */
  async listIds(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storagePath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error: any) {
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }
  
  /**
   * 查询工作流
   * 
   * @param options 查询选项
   * @returns 查询结果
   */
  async query(options: QueryOptions = {}): Promise<QueryResult> {
    // 获取所有工作流ID
    const ids = await this.listIds();
    
    // 加载所有工作流
    const allWorkflows: WorkflowDefinition[] = [];
    for (const id of ids) {
      const workflow = await this.get(id);
      if (workflow) {
        allWorkflows.push(workflow);
      }
    }
    
    // 过滤
    let filteredWorkflows = this.applyFilters(allWorkflows, options);
    
    // 排序
    filteredWorkflows = this.applySort(filteredWorkflows, options);
    
    // 分页
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const total = filteredWorkflows.length;
    const totalPages = Math.ceil(total / pageSize);
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);
    
    return {
      workflows: paginatedWorkflows,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
  
  /**
   * 获取存储统计信息
   * 
   * @returns 统计信息
   */
  async getStats(): Promise<StorageStats> {
    const ids = await this.listIds();
    const workflows: WorkflowDefinition[] = [];
    
    for (const id of ids) {
      const workflow = await this.get(id);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    
    const publishedCount = workflows.filter(w => w.isPublished).length;
    const draftCount = workflows.filter(w => w.version?.isDraft).length;
    
    // 按状态统计
    const byStatus: Record<string, number> = {};
    for (const workflow of workflows) {
      const status = workflow.status || 'active';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    
    // 按分类统计
    const byCategory: Record<string, number> = {};
    for (const workflow of workflows) {
      const category = workflow.metadata?.category || 'uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
    
    // 计算总大小
    let totalSize = 0;
    for (const id of ids) {
      try {
        const filePath = this.getFilePath(id);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      } catch {
        // 忽略错误
      }
    }
    
    return {
      totalWorkflows: workflows.length,
      publishedCount,
      draftCount,
      byStatus,
      byCategory,
      totalSize,
    };
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * 启用/禁用缓存
   * 
   * @param enabled 是否启用
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
  
  /**
   * 导出所有工作流
   * 
   * @returns 所有工作流定义
   */
  async exportAll(): Promise<WorkflowDefinition[]> {
    const ids = await this.listIds();
    const workflows: WorkflowDefinition[] = [];
    
    for (const id of ids) {
      const workflow = await this.get(id);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    
    return workflows;
  }
  
  /**
   * 批量导入工作流
   * 
   * @param workflows 工作流列表
   * @param overwrite 是否覆盖已存在的工作流
   * @returns 导入统计
   */
  async importBatch(
    workflows: WorkflowDefinition[],
    overwrite: boolean = false
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const workflow of workflows) {
      try {
        const exists = await this.exists(workflow.id);
        
        if (exists && !overwrite) {
          skipped++;
          continue;
        }
        
        await this.save(workflow);
        imported++;
      } catch (error: any) {
        errors.push(`${workflow.id}: ${error.message}`);
      }
    }
    
    return { imported, skipped, errors };
  }
  
  // ========== 私有辅助方法 ==========
  
  /**
   * 获取工作流文件路径
   * 
   * @param id 工作流ID
   * @returns 文件路径
   */
  private getFilePath(id: string): string {
    return path.join(this.storagePath, `${id}.json`);
  }
  
  /**
   * 应用过滤条件
   * 
   * @param workflows 工作流列表
   * @param options 查询选项
   * @returns 过滤后的列表
   */
  private applyFilters(
    workflows: WorkflowDefinition[],
    options: QueryOptions
  ): WorkflowDefinition[] {
    let result = workflows;
    
    // 标签过滤
    if (options.tags && options.tags.length > 0) {
      result = result.filter(w => 
        options.tags!.some(tag => w.metadata?.tags?.includes(tag))
      );
    }
    
    // 分类过滤
    if (options.category) {
      result = result.filter(w => w.metadata?.category === options.category);
    }
    
    // 状态过滤
    if (options.status) {
      result = result.filter(w => w.status === options.status);
    }
    
    // 发布状态过滤
    if (options.publishedOnly) {
      result = result.filter(w => w.isPublished === true);
    }
    
    // 作者过滤
    if (options.author) {
      result = result.filter(w => w.author === options.author);
    }
    
    // 搜索关键词
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(w => 
        w.name.toLowerCase().includes(searchLower) ||
        w.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }
  
  /**
   * 应用排序
   * 
   * @param workflows 工作流列表
   * @param options 查询选项
   * @returns 排序后的列表
   */
  private applySort(
    workflows: WorkflowDefinition[],
    options: QueryOptions
  ): WorkflowDefinition[] {
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    
    const result = [...workflows];
    
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'usageCount':
          aValue = a.metadata?.usageCount || 0;
          bValue = b.metadata?.usageCount || 0;
          break;
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }
}

/**
 * 默认存储实例
 */
export const workflowStorage = new WorkflowStorage();
