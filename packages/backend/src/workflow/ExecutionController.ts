/**
 * ExecutionController - 工作流执行控制器
 * Week 4: 工作流引擎完善
 * 
 * 提供工作流执行相关的REST API接口
 * 
 * @module workflow/ExecutionController
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import type { Request, Response } from 'express';
import { executionHistory, ExecutionStatus } from './ExecutionHistory';
import { executionMonitor } from './ExecutionMonitor';
import { rollbackManager, resumeManager } from './AdvancedFeatures';
import { workflowStorage } from './WorkflowStorage';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { ErrorCode } from '../constants/ErrorCode';

/**
 * 执行控制器类
 */
export class ExecutionController {
  /**
   * 创建新执行
   * POST /api/v2/executions
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, trigger, context } = req.body;
      
      if (!workflowId) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Workflow ID is required',
            { field: 'workflowId' }
          )
        );
        return;
      }
      
      // 获取工作流定义
      const workflow = await workflowStorage.get(workflowId);
      if (!workflow) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Workflow not found',
            { workflowId }
          )
        );
        return;
      }
      
      // 创建执行记录
      const execution = await executionHistory.createExecution(
        workflow,
        trigger || { type: 'manual' },
        context
      );
      
      // 开始监控
      executionMonitor.startMonitoring(execution);
      
      res.status(201).json(
        ResponseFormatter.success(execution, 'Execution created successfully')
      );
    } catch (error: any) {
      console.error('Create execution error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to create execution',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取执行详情
   * GET /api/v2/executions/:id
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const execution = await executionHistory.get(id);
      if (!execution) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Execution not found',
            { id }
          )
        );
        return;
      }
      
      res.json(ResponseFormatter.success(execution));
    } catch (error: any) {
      console.error('Get execution error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get execution',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 查询执行列表
   * GET /api/v2/executions
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const options = {
        workflowId: req.query.workflowId as string | undefined,
        status: req.query.status 
          ? (req.query.status as string).split(',') as ExecutionStatus[]
          : undefined,
        startTimeFrom: req.query.startTimeFrom 
          ? parseInt(req.query.startTimeFrom as string) 
          : undefined,
        startTimeTo: req.query.startTimeTo 
          ? parseInt(req.query.startTimeTo as string) 
          : undefined,
        triggerType: req.query.triggerType as string | undefined,
        userId: req.query.userId as string | undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };
      
      const result = await executionHistory.query(options);
      
      res.json(
        ResponseFormatter.success({
          executions: result.executions,
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        }, 'Executions retrieved successfully')
      );
    } catch (error: any) {
      console.error('List executions error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to list executions',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取执行统计
   * GET /api/v2/executions/stats
   */
  static async stats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await executionHistory.getStats();
      
      res.json(ResponseFormatter.success(stats));
    } catch (error: any) {
      console.error('Get execution stats error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get execution statistics',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 更新执行状态
   * PUT /api/v2/executions/:id/status
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, error } = req.body;
      
      if (!status) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Status is required',
            { field: 'status' }
          )
        );
        return;
      }
      
      await executionHistory.updateStatus(id, status, error);
      
      const execution = await executionHistory.get(id);
      if (execution) {
        executionMonitor.updateExecution(execution);
      }
      
      res.json(
        ResponseFormatter.success({ id, status }, 'Execution status updated')
      );
    } catch (error: any) {
      console.error('Update execution status error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to update execution status',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取执行进度
   * GET /api/v2/executions/:id/progress
   */
  static async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const progress = executionMonitor.getProgress(id);
      if (!progress) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Execution not found or not being monitored',
            { id }
          )
        );
        return;
      }
      
      res.json(ResponseFormatter.success(progress));
    } catch (error: any) {
      console.error('Get execution progress error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get execution progress',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取执行日志
   * GET /api/v2/executions/:id/logs
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const logs = executionMonitor.getLogs(id, limit);
      
      res.json(
        ResponseFormatter.success({
          executionId: id,
          logs,
          count: logs.length,
        })
      );
    } catch (error: any) {
      console.error('Get execution logs error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get execution logs',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取性能指标
   * GET /api/v2/executions/:id/metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const metrics = executionMonitor.getMetrics(id);
      
      res.json(
        ResponseFormatter.success({
          executionId: id,
          metrics,
          count: metrics.length,
        })
      );
    } catch (error: any) {
      console.error('Get execution metrics error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get execution metrics',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 获取回滚点
   * GET /api/v2/executions/:id/rollback-points
   */
  static async getRollbackPoints(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const points = await rollbackManager.getAvailableRollbackPoints(id);
      
      res.json(
        ResponseFormatter.success({
          executionId: id,
          rollbackPoints: points,
          count: points.length,
        })
      );
    } catch (error: any) {
      console.error('Get rollback points error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to get rollback points',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 执行回滚
   * POST /api/v2/executions/:id/rollback
   */
  static async rollback(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetNodeId } = req.body;
      
      if (!targetNodeId) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.INVALID_PARAMS,
            'Target node ID is required',
            { field: 'targetNodeId' }
          )
        );
        return;
      }
      
      // 验证回滚安全性
      const validation = await rollbackManager.validateRollback(id, targetNodeId);
      if (!validation.safe && validation.warnings.length > 0) {
        // 如果不安全但没有强制执行标志，返回警告
        if (!req.body.force) {
          res.status(400).json(
            ResponseFormatter.error(
              ErrorCode.BUSINESS_ERROR,
              'Rollback may not be safe',
              {
                warnings: validation.warnings,
                hint: 'Use force=true to proceed anyway',
              }
            )
          );
          return;
        }
      }
      
      // 执行回滚
      const result = await rollbackManager.rollback(id, targetNodeId);
      
      if (!result.success) {
        res.status(500).json(
          ResponseFormatter.error(
            ErrorCode.BUSINESS_ERROR,
            result.message,
            { error: result.error }
          )
        );
        return;
      }
      
      res.json(ResponseFormatter.success(result, 'Rollback completed successfully'));
    } catch (error: any) {
      console.error('Rollback error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to execute rollback',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 续传执行
   * POST /api/v2/executions/:id/resume
   */
  static async resume(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const canResume = await resumeManager.canResume(id);
      if (!canResume) {
        res.status(400).json(
          ResponseFormatter.error(
            ErrorCode.BUSINESS_ERROR,
            'Execution cannot be resumed',
            { executionId: id }
          )
        );
        return;
      }
      
      const result = await resumeManager.resume(id);
      
      if (!result.success) {
        res.status(500).json(
          ResponseFormatter.error(
            ErrorCode.BUSINESS_ERROR,
            result.message,
            { error: result.error }
          )
        );
        return;
      }
      
      res.json(
        ResponseFormatter.success(result, 'Execution resumed successfully')
      );
    } catch (error: any) {
      console.error('Resume error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to resume execution',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 取消执行
   * POST /api/v2/executions/:id/cancel
   */
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      await executionHistory.updateStatus(id, ExecutionStatus.CANCELLED, {
        message: reason || 'Cancelled by user',
      });
      
      // 停止监控
      executionMonitor.stopMonitoring(id);
      
      res.json(
        ResponseFormatter.success({ id }, 'Execution cancelled successfully')
      );
    } catch (error: any) {
      console.error('Cancel execution error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to cancel execution',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 删除执行记录
   * DELETE /api/v2/executions/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await executionHistory.delete(id);
      if (!deleted) {
        res.status(404).json(
          ResponseFormatter.error(
            ErrorCode.NOT_FOUND,
            'Execution not found',
            { id }
          )
        );
        return;
      }
      
      res.json(
        ResponseFormatter.success(null, 'Execution deleted successfully')
      );
    } catch (error: any) {
      console.error('Delete execution error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to delete execution',
          { message: error.message }
        )
      );
    }
  }

  /**
   * 清理旧执行记录
   * POST /api/v2/executions/cleanup
   */
  static async cleanup(req: Request, res: Response): Promise<void> {
    try {
      const { olderThanDays = 30 } = req.body;
      
      const deletedCount = await executionHistory.cleanup(olderThanDays);
      
      res.json(
        ResponseFormatter.success(
          { deletedCount, olderThanDays },
          `Cleaned up ${deletedCount} execution records`
        )
      );
    } catch (error: any) {
      console.error('Cleanup executions error:', error);
      res.status(500).json(
        ResponseFormatter.error(
          ErrorCode.INTERNAL_ERROR,
          'Failed to cleanup executions',
          { message: error.message }
        )
      );
    }
  }
}
