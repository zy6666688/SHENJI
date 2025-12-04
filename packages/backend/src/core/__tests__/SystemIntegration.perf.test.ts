/**
 * SystemIntegration 性能测试
 * 
 * 测试系统在各种负载下的性能表现
 * 
 * @module core/__tests__/SystemIntegration.perf.test
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { SystemIntegration } from '../SystemIntegration';
import type { SystemConfig } from '../SystemIntegration';

describe('SystemIntegration - 性能测试', () => {
  let system: SystemIntegration;
  const config: SystemConfig = {
    features: {
      distributed: false,
      plugins: true,
      ai: false,
      rbac: true,
      audit: true,
    },
    plugins: {
      enabled: true,
      pluginDir: './test-plugins',
    },
    rbac: {
      enabled: true,
    },
    audit: {
      enabled: true,
    },
  };

  beforeAll(async () => {
    system = new SystemIntegration(config);
    await system.initialize();
  });

  afterAll(async () => {
    await system.shutdown();
  });

  describe('初始化性能', () => {
    it('系统初始化应该在2秒内完成', async () => {
      const testSystem = new SystemIntegration(config);
      
      const startTime = performance.now();
      await testSystem.initialize();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      await testSystem.shutdown();
      
      expect(duration).toBeLessThan(2000); // 2秒
      console.log(`初始化耗时: ${duration.toFixed(2)}ms`);
    });

    it('并发初始化多个实例', async () => {
      const instances = 5;
      const systems: SystemIntegration[] = [];
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: instances }, () => {
        const sys = new SystemIntegration(config);
        systems.push(sys);
        return sys.initialize();
      });
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 清理
      await Promise.all(systems.map(sys => sys.shutdown()));
      
      expect(duration).toBeLessThan(5000); // 5秒
      console.log(`并发初始化${instances}个实例耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('状态查询性能', () => {
    it('获取状态应该在10ms内完成', () => {
      const startTime = performance.now();
      const status = system.getStatus();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(status).toBeDefined();
      expect(duration).toBeLessThan(10);
      console.log(`获取状态耗时: ${duration.toFixed(2)}ms`);
    });

    it('高频率获取状态 (1000次)', () => {
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        system.getStatus();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / iterations;
      
      expect(duration).toBeLessThan(1000); // 总计1秒
      expect(avgDuration).toBeLessThan(1); // 平均每次1ms
      console.log(`${iterations}次状态查询总耗时: ${duration.toFixed(2)}ms`);
      console.log(`平均每次: ${avgDuration.toFixed(4)}ms`);
    });

    it('并发获取状态', async () => {
      const concurrency = 100;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, () => 
        Promise.resolve(system.getStatus())
      );
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      console.log(`${concurrency}次并发状态查询耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('统计查询性能', () => {
    it('获取统计信息应该快速', () => {
      const startTime = performance.now();
      const stats = system.getStats();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(stats).toBeDefined();
      expect(duration).toBeLessThan(10);
      console.log(`获取统计耗时: ${duration.toFixed(2)}ms`);
    });

    it('高频统计查询 (500次)', () => {
      const iterations = 500;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        system.getStats();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500);
      console.log(`${iterations}次统计查询耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('插件操作性能', () => {
    it('获取插件列表应该快速', () => {
      const startTime = performance.now();
      const plugins = system.getPlugins();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(Array.isArray(plugins)).toBe(true);
      expect(duration).toBeLessThan(5);
      console.log(`获取插件列表耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('内存使用', () => {
    it('应该监控内存增长', async () => {
      const memBefore = process.memoryUsage();
      
      // 执行一些操作
      for (let i = 0; i < 100; i++) {
        system.getStatus();
        system.getStats();
      }
      
      const memAfter = process.memoryUsage();
      
      const heapGrowth = memAfter.heapUsed - memBefore.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      console.log(`内存增长: ${heapGrowthMB.toFixed(2)}MB`);
      console.log(`堆使用: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // 内存增长应该控制在合理范围内（10MB）
      expect(Math.abs(heapGrowthMB)).toBeLessThan(10);
    });

    it('长时间运行内存稳定性', async () => {
      const memBefore = process.memoryUsage().heapUsed;
      
      // 模拟长时间运行
      for (let i = 0; i < 1000; i++) {
        system.getStatus();
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // 强制GC（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const leakMB = (memAfter - memBefore) / 1024 / 1024;
      
      console.log(`潜在内存泄漏: ${leakMB.toFixed(2)}MB`);
      
      // 应该没有明显的内存泄漏（小于5MB）
      expect(Math.abs(leakMB)).toBeLessThan(5);
    });
  });

  describe('事件系统性能', () => {
    it('事件触发应该快速', () => {
      let callCount = 0;
      system.on('test-event', () => callCount++);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        system.emit('test-event');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(callCount).toBe(1000);
      expect(duration).toBeLessThan(100);
      console.log(`1000次事件触发耗时: ${duration.toFixed(2)}ms`);
      
      system.removeAllListeners('test-event');
    });

    it('多个监听器性能', () => {
      const listeners = Array.from({ length: 10 }, () => vi.fn());
      listeners.forEach(listener => system.on('multi-test', listener));
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        system.emit('multi-test');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(100);
      });
      
      expect(duration).toBeLessThan(50);
      console.log(`100次事件触发(10个监听器)耗时: ${duration.toFixed(2)}ms`);
      
      system.removeAllListeners('multi-test');
    });
  });

  describe('关闭性能', () => {
    it('系统关闭应该快速', async () => {
      const testSystem = new SystemIntegration(config);
      await testSystem.initialize();
      
      const startTime = performance.now();
      await testSystem.shutdown();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1秒
      console.log(`关闭耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('压力测试', () => {
    it('应该处理高并发状态查询', async () => {
      const concurrency = 1000;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, async () => {
        system.getStatus();
        system.getStats();
        return system.getPlugins();
      });
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const throughput = concurrency / (duration / 1000);
      
      console.log(`${concurrency}次并发操作耗时: ${duration.toFixed(2)}ms`);
      console.log(`吞吐量: ${throughput.toFixed(2)} ops/sec`);
      
      expect(duration).toBeLessThan(2000);
      expect(throughput).toBeGreaterThan(500);
    });

    it('CPU密集型操作性能', () => {
      const startTime = performance.now();
      
      // 模拟CPU密集型操作
      for (let i = 0; i < 10000; i++) {
        const status = system.getStatus();
        const stats = system.getStats();
        
        // 一些计算
        const calc = Math.sqrt(i) * Math.random();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`10000次CPU密集型操作耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('性能基准', () => {
    it('记录所有关键操作的性能基准', () => {
      const benchmarks: Record<string, number> = {};
      
      // 初始化
      const initStart = performance.now();
      const testSys = new SystemIntegration(config);
      benchmarks.create = performance.now() - initStart;
      
      // 状态查询
      const statusStart = performance.now();
      for (let i = 0; i < 100; i++) system.getStatus();
      benchmarks.getStatus100 = performance.now() - statusStart;
      
      // 统计查询
      const statsStart = performance.now();
      for (let i = 0; i < 100; i++) system.getStats();
      benchmarks.getStats100 = performance.now() - statsStart;
      
      // 插件列表
      const pluginsStart = performance.now();
      for (let i = 0; i < 100; i++) system.getPlugins();
      benchmarks.getPlugins100 = performance.now() - pluginsStart;
      
      console.log('\n性能基准:');
      console.log('─────────────────────────────');
      Object.entries(benchmarks).forEach(([key, value]) => {
        console.log(`${key.padEnd(20)}: ${value.toFixed(2)}ms`);
      });
      console.log('─────────────────────────────\n');
      
      // 所有操作应该足够快
      Object.values(benchmarks).forEach(duration => {
        expect(duration).toBeLessThan(1000);
      });
    });
  });
});
