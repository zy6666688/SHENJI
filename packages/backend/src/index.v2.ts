/**
 * Backend服务入口 V2
 * 集成长期愿景功能
 * 
 * @author SHENJI Team
 * @version 2.0.0
 * @created 2025-01-04
 */

import express from 'express';
import cors from 'cors';
import { createSystemIntegration } from './core/SystemIntegration';
import { loadConfigFromEnv, validateConfig, printConfigSummary } from './core/SystemConfig';
import createSystemRoutes from './routes/systemRoutes';

// 导入现有路由
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import workflowRoutes from './routes/workflowRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import fileRoutes from './routes/fileRoutes';

// 导入工作流v2路由
import workflowRoutesV2 from './workflow/workflowRoutes.v2';
import executionRoutesV2 from './workflow/executionRoutes.v2';

// 导入节点注册表
import { nodeRegistry } from './services/NodeRegistryV2';
import { allNodes } from './nodes';

/**
 * 主启动函数
 */
async function bootstrap() {
  console.log('\n🚀 审计数智析 Backend V2 Starting...\n');

  // 1. 加载配置
  const config = loadConfigFromEnv();
  
  // 2. 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  // 3. 打印配置摘要
  printConfigSummary(config);

  // 4. 初始化系统集成
  const system = createSystemIntegration(config);
  
  try {
    await system.initialize();
  } catch (error: any) {
    console.error('❌ System initialization failed:', error.message);
    process.exit(1);
  }

  // 5. 注册节点
  console.log('🔧 Registering nodes...');
  nodeRegistry.registerAll(allNodes);
  console.log(`✅ Registered ${nodeRegistry.list().length} nodes`);

  // 6. 创建Express应用
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // 7. 中间件
  app.use(cors());
  app.use(express.json());

  // 请求日志
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });

  // 8. 根路径 - API文档
  app.get('/', (req, res) => {
    res.json({
      name: '审计数智析 Backend V2',
      version: '2.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      features: {
        core: ['nodes', 'workflows', 'auth', 'projects'],
        advanced: Object.entries(config.features)
          .filter(([_, enabled]) => enabled)
          .map(([name]) => name),
      },
      endpoints: {
        system: {
          status: 'GET /api/system/status',
          stats: 'GET /api/system/stats',
          health: 'GET /api/system/health',
          plugins: 'GET /api/system/plugins',
          analyzeWorkflow: 'POST /api/system/analyze-workflow',
        },
        workflows: {
          list: 'GET /api/v2/workflows',
          create: 'POST /api/v2/workflows',
          detail: 'GET /api/v2/workflows/:id',
          validate: 'POST /api/v2/workflows/validate',
          stats: 'GET /api/v2/workflows/stats',
        },
        executions: {
          create: 'POST /api/v2/executions',
          list: 'GET /api/v2/executions',
          detail: 'GET /api/v2/executions/:id',
          progress: 'GET /api/v2/executions/:id/progress',
          rollback: 'POST /api/v2/executions/:id/rollback',
          resume: 'POST /api/v2/executions/:id/resume',
        },
        legacy: ['auth', 'projects', 'audit-logs', 'files'],
      },
    });
  });

  // 9. 系统管理路由（新增）
  app.use('/api/system', createSystemRoutes(system));

  // 10. 工作流V2路由（新增）
  app.use('/api/v2/workflows', workflowRoutesV2);
  app.use('/api/v2/executions', executionRoutesV2);

  // 11. 现有路由
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/audit-logs', auditLogRoutes);
  app.use('/api/files', fileRoutes);

  // 12. 节点API
  app.get('/api/nodes', (req, res) => {
    const manifests = nodeRegistry.listManifests();
    res.json({
      success: true,
      data: manifests,
      count: manifests.length,
    });
  });

  // 13. 全局错误处理
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('🚨 Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  // 14. 404处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.path}`,
    });
  });

  // 15. 启动服务器
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 审计数智析 Backend V2 Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 URL:  http://0.0.0.0:${PORT}`);
    console.log(`📊 Nodes: ${nodeRegistry.list().length} registered`);
    console.log(`\n🌟 Features Enabled:`);
    Object.entries(config.features).forEach(([name, enabled]) => {
      console.log(`  ${enabled ? '✅' : '❌'} ${name}`);
    });
    console.log('\n📚 API Documentation: http://0.0.0.0:' + PORT);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  // 16. 优雅退出
  process.on('SIGTERM', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await system.shutdown();
    process.exit(0);
  });

  // 17. 错误处理
  process.on('uncaughtException', async (err) => {
    console.error('🚨 Uncaught Exception:', err);
    await system.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// 启动应用
bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
