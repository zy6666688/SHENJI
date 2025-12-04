/**
 * SystemIntegration 单元测试
 * 
 * @module core/__tests__/SystemIntegration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemIntegration, createSystemIntegration, DEFAULT_CONFIG } from '../SystemIntegration';
import type { SystemConfig } from '../SystemIntegration';

describe('SystemIntegration', () => {
  let system: SystemIntegration;
  let config: SystemConfig;

  beforeEach(() => {
    // 使用基础配置（不启用需要外部依赖的功能）
    config = {
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
        autoActivate: false,
      },
      rbac: {
        enabled: true,
        defaultRole: 'user:basic',
      },
      audit: {
        enabled: true,
        retentionDays: 90,
        logLevel: 'all',
      },
    };
  });

  afterEach(async () => {
    if (system) {
      await system.shutdown();
    }
  });

  describe('构造函数和初始化', () => {
    it('应该正确创建实例', () => {
      system = new SystemIntegration(config);
      expect(system).toBeDefined();
      expect(system).toBeInstanceOf(SystemIntegration);
    });

    it('应该通过工厂函数创建实例', () => {
      system = createSystemIntegration(config);
      expect(system).toBeDefined();
      expect(system).toBeInstanceOf(SystemIntegration);
    });

    it('应该使用默认配置创建实例', () => {
      system = createSystemIntegration(DEFAULT_CONFIG);
      expect(system).toBeDefined();
    });

    it('初始化应该成功完成', async () => {
      system = new SystemIntegration(config);
      
      // 监听初始化事件
      const initPromise = new Promise((resolve) => {
        system.on('system:initialized', resolve);
      });

      await system.initialize();
      await initPromise;
      
      const status = system.getStatus();
      expect(status.healthy).toBe(true);
    });

    it('初始化失败时应该能够优雅处理', async () => {
      // 使用启用分布式的配置（模块不存在会导致失败）
      const badConfig: SystemConfig = {
        ...config,
        features: {
          ...config.features,
          distributed: true,
        },
        distributed: {
          enabled: true,
          isCoordinator: true,
          redisUrl: 'redis://invalid:6379',
        },
      };

      system = new SystemIntegration(badConfig);
      
      // 应该能够处理初始化错误（部分功能失败不影响整体）
      await expect(system.initialize()).resolves.not.toThrow();
      
      // 系统应该仍然健康（即使部分功能失败）
      const status = system.getStatus();
      expect(status.healthy).toBe(true);
    });
  });

  describe('系统状态', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
      await system.initialize();
    });

    it('应该返回正确的系统状态', () => {
      const status = system.getStatus();
      
      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('features');
      expect(status).toHaveProperty('performance');
      
      expect(status.healthy).toBe(true);
      expect(status.features.plugins.enabled).toBe(true);
      expect(status.features.rbac.enabled).toBe(true);
      expect(status.features.audit.enabled).toBe(true);
    });

    it('应该正确反映功能启用状态', () => {
      const status = system.getStatus();
      
      expect(status.features.distributed.enabled).toBe(false);
      expect(status.features.plugins.enabled).toBe(true);
      expect(status.features.ai.enabled).toBe(false);
      expect(status.features.rbac.enabled).toBe(true);
      expect(status.features.audit.enabled).toBe(true);
    });

    it('应该包含性能指标', () => {
      const status = system.getStatus();
      
      expect(status.performance).toHaveProperty('uptime');
      expect(status.performance).toHaveProperty('memory');
      expect(status.performance.uptime).toBeGreaterThanOrEqual(0);
      expect(status.performance.memory.used).toBeGreaterThan(0);
    });
  });

  describe('系统统计', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
      await system.initialize();
    });

    it('应该返回系统统计信息', () => {
      const stats = system.getStats();
      
      expect(stats).toHaveProperty('requests');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('features');
      
      expect(stats.requests).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });

    it('应该正确统计请求数', async () => {
      const workflow = {
        id: 'test-wf',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 执行会增加请求计数（即使失败）
      try {
        await system.executeWorkflow(workflow as any, 'test-user', {});
      } catch (error) {
        // 预期会失败（因为没有实际的工作流执行器）
      }

      const stats = system.getStats();
      expect(stats.requests).toBeGreaterThan(0);
    });
  });

  describe('插件管理', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
      await system.initialize();
    });

    it('应该返回插件列表', () => {
      const plugins = system.getPlugins();
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('插件系统未启用时应该返回空列表', async () => {
      const noPluginConfig = {
        ...config,
        features: { ...config.features, plugins: false },
      };
      
      const sys = new SystemIntegration(noPluginConfig);
      await sys.initialize();
      
      const plugins = sys.getPlugins();
      expect(plugins).toEqual([]);
      
      await sys.shutdown();
    });

    it('激活插件时应该抛出错误如果插件系统未启用', async () => {
      const noPluginConfig = {
        ...config,
        features: { ...config.features, plugins: false },
      };
      
      const sys = new SystemIntegration(noPluginConfig);
      await sys.initialize();
      
      await expect(sys.activatePlugin('test-plugin')).rejects.toThrow(
        'Plugin system not initialized'
      );
      
      await sys.shutdown();
    });
  });

  describe('AI分析', () => {
    it('应该在AI未启用时抛出错误', async () => {
      system = new SystemIntegration(config);
      await system.initialize();
      
      const workflow = {
        id: 'test-wf',
        name: 'Test',
        nodes: [],
        edges: [],
      };
      
      await expect(system.analyzeWorkflow(workflow as any)).rejects.toThrow(
        'AI system not initialized'
      );
    });
  });

  describe('工作流执行', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
      await system.initialize();
    });

    it('应该记录执行请求', async () => {
      const workflow = {
        id: 'test-wf',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const statsBefore = system.getStats();
      
      try {
        await system.executeWorkflow(workflow as any, 'test-user', {});
      } catch (error) {
        // 预期会失败
      }

      const statsAfter = system.getStats();
      expect(statsAfter.requests).toBeGreaterThan(statsBefore.requests);
    });

    it('应该在执行失败时记录错误', async () => {
      const workflow = {
        id: 'test-wf',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const statsBefore = system.getStats();
      
      try {
        await system.executeWorkflow(workflow as any, 'test-user', {});
      } catch (error) {
        // 预期会失败
      }

      const statsAfter = system.getStats();
      expect(statsAfter.errors).toBeGreaterThan(statsBefore.errors);
    });
  });

  describe('事件系统', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
    });

    it('应该在初始化完成时触发事件', async () => {
      const eventSpy = vi.fn();
      system.on('system:initialized', eventSpy);
      
      await system.initialize();
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('应该在关闭时触发事件', async () => {
      await system.initialize();
      
      const eventSpy = vi.fn();
      system.on('system:shutdown', eventSpy);
      
      await system.shutdown();
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('关闭和清理', () => {
    it('应该正常关闭', async () => {
      system = new SystemIntegration(config);
      await system.initialize();
      
      await expect(system.shutdown()).resolves.not.toThrow();
    });

    it('应该在未初始化时也能关闭', async () => {
      system = new SystemIntegration(config);
      
      await expect(system.shutdown()).resolves.not.toThrow();
    });
  });

  describe('配置验证', () => {
    it('应该接受有效的基础配置', async () => {
      system = new SystemIntegration(config);
      await expect(system.initialize()).resolves.not.toThrow();
    });

    it('应该处理所有功能禁用的情况', async () => {
      const minimalConfig: SystemConfig = {
        features: {
          distributed: false,
          plugins: false,
          ai: false,
          rbac: false,
          audit: false,
        },
      };
      
      system = new SystemIntegration(minimalConfig);
      await expect(system.initialize()).resolves.not.toThrow();
      
      const status = system.getStatus();
      expect(status.healthy).toBe(true);
    });
  });

  describe('性能和资源', () => {
    beforeEach(async () => {
      system = new SystemIntegration(config);
      await system.initialize();
    });

    it('应该跟踪运行时间', async () => {
      const status1 = system.getStatus();
      const uptime1 = status1.performance.uptime;
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status2 = system.getStatus();
      const uptime2 = status2.performance.uptime;
      
      expect(uptime2).toBeGreaterThan(uptime1);
    });

    it('应该报告内存使用', () => {
      const status = system.getStatus();
      
      expect(status.performance.memory.used).toBeGreaterThan(0);
      expect(status.performance.memory.total).toBeGreaterThan(0);
      expect(status.performance.memory.used).toBeLessThanOrEqual(
        status.performance.memory.total
      );
    });
  });
});
