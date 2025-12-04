/**
 * WorkflowController - 工作流控制器
 * Week 4: 工作流引擎完善
 * 
 * 提供工作流的REST API接口
 * 基于文件存储系统（WorkflowStorage）
 * 
 * @module workflow/WorkflowController
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import type { Request, Response } from 'express';
import { workflowStorage, type QueryOptions } from './WorkflowStorage';
import { validateWorkflow } from './WorkflowValidator';
import { WorkflowHelper, type WorkflowDefinition } from './WorkflowDefinition';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { ErrorCode } from '../constants/ErrorCode';

/**
 * 工作流控制器类
 */
export class WorkflowController {
  /**
   * 创建工作流
   * POST /api/v2/workflows
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const workflowData = req.body as Partial<WorkflowDefinition>;
      
      // 验证必需字段
      if (!workflowData.name) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflow name is required',
            { field: 'name' }
          )
        );
        return;
      }
      
      // 创建新工作流
      let workflow: WorkflowDefinition;
      
      if (workflowData.id) {
        // 使用提供的完整定义
        workflow = workflowData as WorkflowDefinition;
      } else {
        // 创建新工作流
        workflow = WorkflowHelper.createNew(
          workflowData.name,
          workflowData.description
        );
        
        // 合并其他字段
        if (workflowData.nodes) workflow.nodes = workflowData.nodes;
        if (workflowData.edges) workflow.edges = workflowData.edges;
        if (workflowData.settings) workflow.settings = workflowData.settings;
        if (workflowData.metadata) workflow.metadata = { ...workflow.metadata, ...workflowData.metadata };
        if (workflowData.author) workflow.author = workflowData.author;
      }
      
      // 验证工作流
      const validationResult = validateWorkflow(workflow);
      if (!validationResult.valid) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflow validation failed',
            {
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            }
          )
        );
        return;
      }
      
      // 检查ID是否已存在
      const exists = await workflowStorage.exists(workflow.id);
      if (exists) {
        res.status(409).json(
          ResponseFormatter.error(
            ErrorCode.CONFLICT,
            'Workflow with this ID already exists',
            { id: workflow.id }
          )
        );
        return;
      }
      
      // 保存工作流
      const saved = await workflowStorage.save(workflow);
      
      res.status(201).json(
        ResponseFormatter.success({
          workflow: saved,
          stats: validationResult.stats,
          warnings: validationResult.warnings,
        }, 'Workflow created successfully')
      );
    } catch (error: any) {
      console.error('Create workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 获取工作流详情
   * GET /api/v2/workflows/:id
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const workflow = await workflowStorage.get(id);
      
      if (!workflow) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Workflow not found',
            { id }
          )
        );
        return;
      }
      
      res.json(ResponseFormatter.success(workflow));
    } catch (error: any) {
      console.error('Get workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 更新工作流
   * PUT /api/v2/workflows/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body as Partial<WorkflowDefinition>;
      
      // 获取现有工作流
      const existing = await workflowStorage.get(id);
      if (!existing) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Workflow not found',
            { id }
          )
        );
        return;
      }
      
      // 合并更新
      const updated: WorkflowDefinition = {
        ...existing,
        ...updates,
        id: existing.id, // ID不可修改
        createdAt: existing.createdAt, // 创建时间不可修改
      };
      
      // 验证更新后的工作流
      const validationResult = validateWorkflow(updated);
      if (!validationResult.valid) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflow validation failed',
            {
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            }
          )
        );
        return;
      }
      
      // 保存更新
      const saved = await workflowStorage.save(updated);
      
      res.json(
        ResponseFormatter.success({
          workflow: saved,
          stats: validationResult.stats,
          warnings: validationResult.warnings,
        }, 'Workflow updated successfully')
      );
    } catch (error: any) {
      console.error('Update workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to update workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 删除工作流
   * DELETE /api/v2/workflows/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await workflowStorage.delete(id);
      
      if (!deleted) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Workflow not found',
            { id }
          )
        );
        return;
      }
      
      res.json(ResponseFormatter.success(null, 'Workflow deleted successfully'));
    } catch (error: any) {
      console.error('Delete workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to delete workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 查询工作流列表
   * GET /api/v2/workflows
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const options: QueryOptions = {
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        category: req.query.category as string | undefined,
        status: req.query.status as any,
        publishedOnly: req.query.publishedOnly === 'true',
        author: req.query.author as string | undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };
      
      const result = await workflowStorage.query(options);
      
      res.json(
        ResponseFormatter.success({
          workflows: result.workflows,
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        }, 'Workflows retrieved successfully')
      );
    } catch (error: any) {
      console.error('List workflows error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to list workflows',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 获取存储统计
   * GET /api/v2/workflows/stats
   */
  static async stats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await workflowStorage.getStats();
      
      res.json(ResponseFormatter.success(stats));
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get statistics',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 验证工作流
   * POST /api/v2/workflows/validate
   */
  static async validate(req: Request, res: Response): Promise<void> {
    try {
      const workflow = req.body as WorkflowDefinition;
      
      if (!workflow) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflow definition is required'
          )
        );
        return;
      }
      
      const validationResult = validateWorkflow(workflow);
      
      res.json(
        ResponseFormatter.success({
          ...validationResult,
          valid: validationResult.valid,
        }, 'Workflow validated')
      );
    } catch (error: any) {
      console.error('Validate workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to validate workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 克隆工作流
   * POST /api/v2/workflows/:id/clone
   */
  static async clone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      
      const original = await workflowStorage.get(id);
      if (!original) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Workflow not found',
            { id }
          )
        );
        return;
      }
      
      const cloned = WorkflowHelper.clone(original, newName);
      const saved = await workflowStorage.save(cloned);
      
      res.status(201).json(
        ResponseFormatter.success(saved, 'Workflow cloned successfully')
      );
    } catch (error: any) {
      console.error('Clone workflow error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to clone workflow',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 导出所有工作流
   * GET /api/v2/workflows/export
   */
  static async exportAll(req: Request, res: Response): Promise<void> {
    try {
      const workflows = await workflowStorage.exportAll();
      
      res.json(
        ResponseFormatter.success({
          workflows,
          count: workflows.length,
        }, 'Workflows exported successfully')
      );
    } catch (error: any) {
      console.error('Export workflows error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to export workflows',
          { message: error.message }
        )
      );
    }
  }
  
  /**
   * 导入工作流
   * POST /api/v2/workflows/import
   */
  static async import(req: Request, res: Response): Promise<void> {
    try {
      const { workflows, overwrite = false } = req.body;
      
      if (!Array.isArray(workflows) || workflows.length === 0) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflows array is required and must not be empty'
          )
        );
        return;
      }
      
      const result = await workflowStorage.importBatch(workflows, overwrite);
      
      res.json(
        ResponseFormatter.success({
          ...result,
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        }, 'Workflows imported')
      );
    } catch (error: any) {
      console.error('Import workflows error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to import workflows',
          { message: error.message }
        )
      );
    }
  }
}
