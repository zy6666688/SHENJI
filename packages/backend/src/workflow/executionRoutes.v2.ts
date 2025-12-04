/**
 * Execution API Routes V2
 * Week 4: 工作流引擎完善
 * 
 * 执行历史、监控和高级功能的API路由
 * 
 * @module workflow/executionRoutesV2
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import { Router } from 'express';
import { ExecutionController } from './ExecutionController';
import { executionHistory } from './ExecutionHistory';

const router = Router();

// 初始化存储
executionHistory.initialize().catch(err => {
  console.error('Failed to initialize execution history:', err);
});

/**
 * @route POST /api/v2/executions
 * @desc 创建新执行
 * @access Public
 */
router.post('/', ExecutionController.create);

/**
 * @route GET /api/v2/executions
 * @desc 查询执行列表
 * @access Public
 */
router.get('/', ExecutionController.list);

/**
 * @route GET /api/v2/executions/stats
 * @desc 获取执行统计
 * @access Public
 */
router.get('/stats', ExecutionController.stats);

/**
 * @route POST /api/v2/executions/cleanup
 * @desc 清理旧执行记录
 * @access Admin
 */
router.post('/cleanup', ExecutionController.cleanup);

/**
 * @route GET /api/v2/executions/:id
 * @desc 获取执行详情
 * @access Public
 */
router.get('/:id', ExecutionController.get);

/**
 * @route DELETE /api/v2/executions/:id
 * @desc 删除执行记录
 * @access Public
 */
router.delete('/:id', ExecutionController.delete);

/**
 * @route PUT /api/v2/executions/:id/status
 * @desc 更新执行状态
 * @access Public
 */
router.put('/:id/status', ExecutionController.updateStatus);

/**
 * @route GET /api/v2/executions/:id/progress
 * @desc 获取执行进度
 * @access Public
 */
router.get('/:id/progress', ExecutionController.getProgress);

/**
 * @route GET /api/v2/executions/:id/logs
 * @desc 获取执行日志
 * @access Public
 */
router.get('/:id/logs', ExecutionController.getLogs);

/**
 * @route GET /api/v2/executions/:id/metrics
 * @desc 获取性能指标
 * @access Public
 */
router.get('/:id/metrics', ExecutionController.getMetrics);

/**
 * @route GET /api/v2/executions/:id/rollback-points
 * @desc 获取回滚点
 * @access Public
 */
router.get('/:id/rollback-points', ExecutionController.getRollbackPoints);

/**
 * @route POST /api/v2/executions/:id/rollback
 * @desc 执行回滚
 * @access Public
 */
router.post('/:id/rollback', ExecutionController.rollback);

/**
 * @route POST /api/v2/executions/:id/resume
 * @desc 续传执行
 * @access Public
 */
router.post('/:id/resume', ExecutionController.resume);

/**
 * @route POST /api/v2/executions/:id/cancel
 * @desc 取消执行
 * @access Public
 */
router.post('/:id/cancel', ExecutionController.cancel);

export default router;
