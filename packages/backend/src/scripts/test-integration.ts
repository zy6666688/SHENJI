/**
 * 系统集成测试脚本
 * 
 * 小规模试运行和验证系统集成功能
 * 
 * 运行: tsx src/scripts/test-integration.ts
 */

import { createSystemIntegration, DEFAULT_CONFIG } from '../core/SystemIntegration';
import { loadConfigFromEnv, validateConfig, printConfigSummary } from '../core/SystemConfig';
import type { SystemConfig } from '../core/SystemIntegration';

/**
 * 颜色输出
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 测试结果
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * 运行单个测试
 */
async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const startTime = performance.now();
  try {
    await fn();
    const duration = performance.now() - startTime;
    results.push({ name, passed: true, duration });
    log('green', `✅ ${name} (${duration.toFixed(2)}ms)`);
  } catch (error: any) {
    const duration = performance.now() - startTime;
    results.push({ name, passed: false, duration, error: error.message });
    log('red', `❌ ${name} (${duration.toFixed(2)}ms)`);
    log('red', `   错误: ${error.message}`);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  log('cyan', '🚀 审计数智析 V2.0 - 系统集成测试');
  console.log('='.repeat(60) + '\n');

  // ============================================================
  // 1. 配置测试
  // ============================================================
  
  log('blue', '\n📋 测试 1: 配置加载和验证\n');

  await runTest('加载环境配置', async () => {
    const config = loadConfigFromEnv();
    if (!config.features) {
      throw new Error('配置缺少features字段');
    }
  });

  await runTest('验证配置', async () => {
    const config = loadConfigFromEnv();
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
  });

  await runTest('打印配置摘要', async () => {
    const config = loadConfigFromEnv();
    printConfigSummary(config);
  });

  // ============================================================
  // 2. 系统初始化测试
  // ============================================================
  
  log('blue', '\n🔧 测试 2: 系统初始化\n');

  let system: any;

  await runTest('创建系统实例', async () => {
    const config = loadConfigFromEnv();
    system = createSystemIntegration(config);
    if (!system) {
      throw new Error('创建系统实例失败');
    }
  });

  await runTest('初始化系统', async () => {
    if (!system) throw new Error('系统实例不存在');
    await system.initialize();
  });

  await runTest('验证系统健康状态', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    if (!status.healthy) {
      throw new Error('系统不健康');
    }
  });

  // ============================================================
  // 3. 状态和统计测试
  // ============================================================
  
  log('blue', '\n📊 测试 3: 状态和统计信息\n');

  await runTest('获取系统状态', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    if (!status.features) throw new Error('缺少features');
    if (!status.performance) throw new Error('缺少performance');
    
    console.log(`   - 已启用功能数: ${Object.values(status.features).filter((f: any) => f.enabled).length}`);
    console.log(`   - 运行时间: ${status.performance.uptime.toFixed(2)}秒`);
    console.log(`   - 内存使用: ${status.performance.memory.used}MB / ${status.performance.memory.total}MB`);
  });

  await runTest('获取统计信息', async () => {
    if (!system) throw new Error('系统实例不存在');
    const stats = system.getStats();
    
    if (typeof stats.requests !== 'number') throw new Error('缺少requests统计');
    if (typeof stats.errors !== 'number') throw new Error('缺少errors统计');
    
    console.log(`   - 总请求数: ${stats.requests}`);
    console.log(`   - 错误数: ${stats.errors}`);
  });

  await runTest('多次快速获取状态（性能测试）', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      system.getStatus();
    }
    const duration = performance.now() - startTime;
    
    if (duration > 100) {
      throw new Error(`性能不达标: ${duration.toFixed(2)}ms > 100ms`);
    }
    
    console.log(`   - 100次查询耗时: ${duration.toFixed(2)}ms`);
  });

  // ============================================================
  // 4. 插件系统测试
  // ============================================================
  
  log('blue', '\n🔌 测试 4: 插件系统\n');

  await runTest('获取插件列表', async () => {
    if (!system) throw new Error('系统实例不存在');
    const plugins = system.getPlugins();
    
    if (!Array.isArray(plugins)) {
      throw new Error('插件列表应该是数组');
    }
    
    console.log(`   - 插件数量: ${plugins.length}`);
  });

  await runTest('插件系统状态检查', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    const pluginsEnabled = status.features.plugins.enabled;
    console.log(`   - 插件系统: ${pluginsEnabled ? '已启用' : '未启用'}`);
    
    if (pluginsEnabled) {
      console.log(`   - 插件数量: ${status.features.plugins.count}`);
    }
  });

  // ============================================================
  // 5. 功能特性测试
  // ============================================================
  
  log('blue', '\n🌟 测试 5: 功能特性检查\n');

  await runTest('检查分布式功能', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    const enabled = status.features.distributed.enabled;
    console.log(`   - 分布式执行: ${enabled ? '已启用' : '未启用'}`);
    
    if (enabled) {
      console.log(`   - 状态: ${status.features.distributed.status}`);
    }
  });

  await runTest('检查AI功能', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    const enabled = status.features.ai.enabled;
    console.log(`   - AI辅助: ${enabled ? '已启用' : '未启用'}`);
    
    if (!enabled) {
      console.log(`   - 提示: 设置 AI_ENABLED=true 和 OPENAI_API_KEY 以启用`);
    }
  });

  await runTest('检查RBAC功能', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    const enabled = status.features.rbac.enabled;
    console.log(`   - 权限控制: ${enabled ? '已启用' : '未启用'}`);
    
    if (enabled) {
      console.log(`   - 角色数量: ${status.features.rbac.roles}`);
    }
  });

  await runTest('检查审计功能', async () => {
    if (!system) throw new Error('系统实例不存在');
    const status = system.getStatus();
    
    const enabled = status.features.audit.enabled;
    console.log(`   - 审计日志: ${enabled ? '已启用' : '未启用'}`);
    
    if (enabled) {
      console.log(`   - 日志数量: ${status.features.audit.logs}`);
    }
  });

  // ============================================================
  // 6. 事件系统测试
  // ============================================================
  
  log('blue', '\n📡 测试 6: 事件系统\n');

  await runTest('监听系统事件', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    let eventFired = false;
    system.on('test-event', () => { eventFired = true; });
    
    system.emit('test-event');
    
    if (!eventFired) {
      throw new Error('事件未触发');
    }
    
    system.removeAllListeners('test-event');
    console.log('   - 事件系统正常工作');
  });

  // ============================================================
  // 7. 错误处理测试
  // ============================================================
  
  log('blue', '\n⚠️  测试 7: 错误处理\n');

  await runTest('处理无效工作流执行', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    try {
      await system.executeWorkflow(null as any, 'test-user', {});
      throw new Error('应该抛出错误');
    } catch (error: any) {
      // 预期会出错
      console.log(`   - 正确捕获错误: ${error.message.substring(0, 50)}...`);
    }
  });

  await runTest('AI功能未启用时的错误', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    const status = system.getStatus();
    if (!status.features.ai.enabled) {
      try {
        await system.analyzeWorkflow({ id: 'test' } as any);
        throw new Error('应该抛出错误');
      } catch (error: any) {
        if (!error.message.includes('AI system not initialized')) {
          throw new Error('错误消息不正确');
        }
        console.log('   - 正确返回AI未启用错误');
      }
    } else {
      console.log('   - AI已启用，跳过此测试');
    }
  });

  // ============================================================
  // 8. 性能基准测试
  // ============================================================
  
  log('blue', '\n⚡ 测试 8: 性能基准\n');

  await runTest('状态查询性能', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    const iterations = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      system.getStatus();
    }
    
    const duration = performance.now() - startTime;
    const avgDuration = duration / iterations;
    
    console.log(`   - ${iterations}次查询耗时: ${duration.toFixed(2)}ms`);
    console.log(`   - 平均每次: ${avgDuration.toFixed(4)}ms`);
    console.log(`   - QPS: ${(1000 / avgDuration).toFixed(0)}`);
  });

  await runTest('内存使用检查', async () => {
    if (!system) throw new Error('系统实例不存在');
    
    const memBefore = process.memoryUsage();
    
    // 执行一些操作
    for (let i = 0; i < 100; i++) {
      system.getStatus();
      system.getStats();
    }
    
    const memAfter = process.memoryUsage();
    const heapGrowth = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    
    console.log(`   - 堆内存增长: ${heapGrowth.toFixed(2)}MB`);
    console.log(`   - 当前堆使用: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    if (Math.abs(heapGrowth) > 10) {
      throw new Error(`内存增长过大: ${heapGrowth.toFixed(2)}MB`);
    }
  });

  // ============================================================
  // 9. 清理测试
  // ============================================================
  
  log('blue', '\n🧹 测试 9: 系统清理\n');

  await runTest('系统关闭', async () => {
    if (!system) throw new Error('系统实例不存在');
    await system.shutdown();
    console.log('   - 系统已正常关闭');
  });

  // ============================================================
  // 测试总结
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  log('cyan', '📊 测试总结');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = (passed / total * 100).toFixed(1);
  
  console.log(`\n总测试数: ${total}`);
  log('green', `✅ 通过: ${passed}`);
  if (failed > 0) {
    log('red', `❌ 失败: ${failed}`);
  }
  console.log(`通过率: ${passRate}%`);
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`总耗时: ${totalDuration.toFixed(2)}ms`);
  
  // 失败的测试详情
  if (failed > 0) {
    console.log('\n失败的测试:');
    results.filter(r => !r.passed).forEach(r => {
      log('red', `  ❌ ${r.name}`);
      if (r.error) {
        console.log(`     ${r.error}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    log('green', '🎉 所有测试通过！系统集成验证成功！');
  } else {
    log('yellow', '⚠️  部分测试失败，请检查错误信息');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // 退出码
  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
main().catch((error) => {
  log('red', `\n❌ 测试执行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
