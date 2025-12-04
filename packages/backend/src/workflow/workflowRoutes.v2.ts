/**
 * Workflow API Routes V2
 * Week 4: 工作流引擎完善
 * 
 * 基于文件存储的工作流API路由
 * 
 * @module workflow/workflowRoutesV2
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import { Router } from 'express';
import { WorkflowController } from './WorkflowController';
import { workflowStorage } from './WorkflowStorage';

const router = Router();

// 初始化存储
workflowStorage.initialize().catch(err => {
  console.error('Failed to initialize workflow storage:', err);
});

/**
 * @route POST /api/v2/workflows
 * @desc 创建新工作流
 * @access Public
 */
router.post('/', WorkflowController.create);

/**
 * @route GET /api/v2/workflows
 * @desc 查询工作流列表
 * @access Public
 */
router.get('/', WorkflowController.list);

/**
 * @route GET /api/v2/workflows/stats
 * @desc 获取存储统计
 * @access Public
 */
router.get('/stats', WorkflowController.stats);

/**
 * @route GET /api/v2/workflows/export
 * @desc 导出所有工作流
 * @access Public
 */
router.get('/export', WorkflowController.exportAll);

/**
 * @route POST /api/v2/workflows/import
 * @desc 导入工作流
 * @access Public
 */
router.post('/import', WorkflowController.import);

/**
 * @route POST /api/v2/workflows/validate
 * @desc 验证工作流定义
 * @access Public
 */
router.post('/validate', WorkflowController.validate);

/**
 * @route GET /api/v2/workflows/:id
 * @desc 获取工作流详情
 * @access Public
 */
router.get('/:id', WorkflowController.get);

/**
 * @route PUT /api/v2/workflows/:id
 * @desc 更新工作流
 * @access Public
 */
router.put('/:id', WorkflowController.update);

/**
 * @route DELETE /api/v2/workflows/:id
 * @desc 删除工作流
 * @access Public
 */
router.delete('/:id', WorkflowController.delete);

/**
 * @route POST /api/v2/workflows/:id/clone
 * @desc 克隆工作流
 * @access Public
 */
router.post('/:id/clone', WorkflowController.clone);

export default router;
