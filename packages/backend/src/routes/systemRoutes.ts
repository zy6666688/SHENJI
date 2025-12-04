/**
 * System Routes - 系统管理API
 * 
 * 提供系统状态、配置和管理功能的REST API
 * 
 * @module routes/systemRoutes
 * @author SHENJI Team
 * @version 1.0.0
 */

import { Router } from 'express';
import type { SystemIntegration } from '../core/SystemIntegration';

/**
 * 创建系统路由
 */
export function createSystemRoutes(system: SystemIntegration): Router {
  const router = Router();

  /**
   * GET /api/system/status
   * 获取系统状态
   */
  router.get('/status', (req, res) => {
    try {
      const status = system.getStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/system/stats
   * 获取系统统计信息
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = system.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/system/plugins
   * 获取插件列表
   */
  router.get('/plugins', (req, res) => {
    try {
      const plugins = system.getPlugins();
      res.json({
        success: true,
        data: plugins,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/system/plugins/:pluginId/activate
   * 激活插件
   */
  router.post('/plugins/:pluginId/activate', async (req, res) => {
    try {
      const { pluginId } = req.params;
      await system.activatePlugin(pluginId);
      
      res.json({
        success: true,
        message: `Plugin ${pluginId} activated`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/system/analyze-workflow
   * AI分析工作流
   */
  router.post('/analyze-workflow', async (req, res) => {
    try {
      const { workflow } = req.body;
      
      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: 'Workflow data is required',
        });
      }

      const analysis = await system.analyzeWorkflow(workflow);
      
      res.json({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/system/health
   * 健康检查（增强版）
   */
  router.get('/health', (req, res) => {
    try {
      const status = system.getStatus();
      const health = {
        status: status.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: status.performance.uptime,
        features: Object.entries(status.features).map(([name, info]) => ({
          name,
          enabled: (info as any).enabled,
          status: (info as any).status || 'N/A',
        })),
      };

      const httpStatus = status.healthy ? 200 : 503;
      res.status(httpStatus).json(health);
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  });

  return router;
}

export default createSystemRoutes;
