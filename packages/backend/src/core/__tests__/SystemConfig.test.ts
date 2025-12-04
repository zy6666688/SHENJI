/**
 * SystemConfig 单元测试
 * 
 * @module core/__tests__/SystemConfig.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfigFromEnv, validateConfig, printConfigSummary } from '../SystemConfig';
import type { SystemConfig } from '../SystemIntegration';

describe('SystemConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
  });

  describe('loadConfigFromEnv', () => {
    it('应该加载默认配置', () => {
      const config = loadConfigFromEnv();
      
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('plugins');
      expect(config).toHaveProperty('ai');
      expect(config).toHaveProperty('rbac');
      expect(config).toHaveProperty('audit');
    });

    it('应该正确解析布尔环境变量', () => {
      process.env.DISTRIBUTED_ENABLED = 'true';
      process.env.PLUGIN_ENABLED = 'false';
      
      const config = loadConfigFromEnv();
      
      expect(config.features.distributed).toBe(true);
      expect(config.features.plugins).toBe(false);
    });

    it('应该正确解析数字环境变量', () => {
      process.env.WORKER_CAPACITY = '20';
      process.env.AUDIT_RETENTION_DAYS = '180';
      
      const config = loadConfigFromEnv();
      
      expect(config.distributed?.workerCapacity).toBe(20);
      expect(config.audit?.retentionDays).toBe(180);
    });

    it('应该正确解析字符串环境变量', () => {
      process.env.AI_PROVIDER = 'anthropic';
      process.env.RBAC_DEFAULT_ROLE = 'admin';
      
      const config = loadConfigFromEnv();
      
      expect(config.ai?.provider).toBe('anthropic');
      expect(config.rbac?.defaultRole).toBe('admin');
    });

    it('应该使用默认值当环境变量未设置', () => {
      delete process.env.PLUGIN_ENABLED;
      delete process.env.AI_ENABLED;
      
      const config = loadConfigFromEnv();
      
      expect(config.features.plugins).toBe(true); // 默认true
      expect(config.features.ai).toBe(false); // 默认false
    });

    it('应该正确处理Redis URL', () => {
      process.env.REDIS_URL = 'redis://custom-host:6380';
      
      const config = loadConfigFromEnv();
      
      expect(config.distributed?.redisUrl).toBe('redis://custom-host:6380');
    });

    it('应该正确处理插件目录', () => {
      process.env.PLUGIN_DIR = '/custom/plugin/path';
      
      const config = loadConfigFromEnv();
      
      expect(config.plugins?.pluginDir).toBe('/custom/plugin/path');
    });

    it('应该正确处理AI配置', () => {
      process.env.AI_ENABLED = 'true';
      process.env.AI_PROVIDER = 'google';
      process.env.OPENAI_API_KEY = 'sk-test123';
      process.env.AI_MODEL = 'gemini-pro';
      
      const config = loadConfigFromEnv();
      
      expect(config.features.ai).toBe(true);
      expect(config.ai?.provider).toBe('google');
      expect(config.ai?.apiKey).toBe('sk-test123');
      expect(config.ai?.model).toBe('gemini-pro');
    });
  });

  describe('validateConfig', () => {
    let baseConfig: SystemConfig;

    beforeEach(() => {
      baseConfig = {
        features: {
          distributed: false,
          plugins: true,
          ai: false,
          rbac: true,
          audit: true,
        },
        plugins: {
          enabled: true,
          pluginDir: './plugins',
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

    it('应该验证通过有效配置', () => {
      const result = validateConfig(baseConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测分布式配置缺少Redis URL', () => {
      const config: SystemConfig = {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          distributed: true,
        },
        distributed: {
          enabled: true,
          isCoordinator: true,
          redisUrl: '',
        },
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Redis URL is required for distributed mode');
    });

    it('应该检测AI配置缺少API Key', () => {
      const config: SystemConfig = {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          ai: true,
        },
        ai: {
          enabled: true,
          provider: 'openai',
          apiKey: '',
        },
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('API key is required'))).toBe(true);
    });

    it('应该允许本地AI提供商没有API Key', () => {
      const config: SystemConfig = {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          ai: true,
        },
        ai: {
          enabled: true,
          provider: 'local',
          apiKey: '',
        },
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
    });

    it('应该检测插件配置缺少目录', () => {
      const config: SystemConfig = {
        ...baseConfig,
        plugins: {
          enabled: true,
          pluginDir: '',
        },
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin directory is required');
    });

    it('应该允许功能禁用时缺少配置', () => {
      const config: SystemConfig = {
        ...baseConfig,
        features: {
          ...baseConfig.features,
          distributed: false,
          ai: false,
        },
        // 不提供distributed和ai配置
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
    });

    it('应该处理多个验证错误', () => {
      const config: SystemConfig = {
        features: {
          distributed: true,
          plugins: true,
          ai: true,
          rbac: false,
          audit: false,
        },
        distributed: {
          enabled: true,
          isCoordinator: true,
          redisUrl: '', // 缺少
        },
        plugins: {
          enabled: true,
          pluginDir: '', // 缺少
        },
        ai: {
          enabled: true,
          provider: 'openai',
          apiKey: '', // 缺少
        },
      };
      
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('printConfigSummary', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('应该打印配置摘要', () => {
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
          pluginDir: './plugins',
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
      
      printConfigSummary(config);
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(5);
    });

    it('应该显示功能启用状态', () => {
      const config: SystemConfig = {
        features: {
          distributed: true,
          plugins: true,
          ai: true,
          rbac: true,
          audit: true,
        },
        distributed: {
          enabled: true,
          isCoordinator: true,
          workerCapacity: 10,
          redisUrl: 'redis://localhost:6379',
        },
        plugins: {
          enabled: true,
          pluginDir: './plugins',
        },
        ai: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-4',
        },
        rbac: {
          enabled: true,
        },
        audit: {
          enabled: true,
        },
      };
      
      printConfigSummary(config);
      
      const output = consoleSpy.mock.calls.map((call: any) => call[0]).join('\n');
      
      expect(output).toContain('✅');
      expect(output).toContain('Features');
      expect(output).toContain('Distributed');
      expect(output).toContain('Plugin');
      expect(output).toContain('AI');
    });

    it('应该隐藏API Key的敏感信息', () => {
      const config: SystemConfig = {
        features: {
          distributed: false,
          plugins: false,
          ai: true,
          rbac: false,
          audit: false,
        },
        ai: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-verylongapikey123456789',
          model: 'gpt-4',
        },
      };
      
      printConfigSummary(config);
      
      const output = consoleSpy.mock.calls.map((call: any) => call[0]).join('\n');
      
      // 应该只显示后4位
      expect(output).toContain('***6789');
      expect(output).not.toContain('sk-verylongapikey123456789');
    });
  });

  describe('环境变量边界情况', () => {
    it('应该处理布尔值的不同格式', () => {
      process.env.PLUGIN_ENABLED = '1';
      process.env.AI_ENABLED = 'TRUE';
      process.env.RBAC_ENABLED = 'True';
      
      const config = loadConfigFromEnv();
      
      expect(config.features.plugins).toBe(true);
      expect(config.features.ai).toBe(true);
      expect(config.features.rbac).toBe(true);
    });

    it('应该处理无效的数字环境变量', () => {
      process.env.WORKER_CAPACITY = 'invalid';
      process.env.AUDIT_RETENTION_DAYS = 'abc';
      
      const config = loadConfigFromEnv();
      
      // 应该回退到默认值
      expect(config.distributed?.workerCapacity).toBe(10);
      expect(config.audit?.retentionDays).toBe(90);
    });

    it('应该处理空字符串（使用默认值）', () => {
      process.env.PLUGIN_DIR = '';
      process.env.AI_MODEL = '';
      
      const config = loadConfigFromEnv();
      
      // 空字符串应该使用默认值（更合理的行为）
      expect(config.plugins?.pluginDir).toBeTruthy();
      expect(config.ai?.model).toBeTruthy();
    });

    it('应该正确处理未定义的环境变量', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.REDIS_URL;
      
      const config = loadConfigFromEnv();
      
      expect(config.ai?.apiKey).toBe('');
      expect(config.distributed?.redisUrl).toBe('redis://localhost:6379');
    });
  });

  describe('配置完整性', () => {
    it('加载的配置应该包含所有必需字段', () => {
      const config = loadConfigFromEnv();
      
      // 验证features
      expect(config.features).toHaveProperty('distributed');
      expect(config.features).toHaveProperty('plugins');
      expect(config.features).toHaveProperty('ai');
      expect(config.features).toHaveProperty('rbac');
      expect(config.features).toHaveProperty('audit');
      
      // 验证子配置
      expect(config).toHaveProperty('distributed');
      expect(config).toHaveProperty('plugins');
      expect(config).toHaveProperty('ai');
      expect(config).toHaveProperty('rbac');
      expect(config).toHaveProperty('audit');
    });

    it('配置对象应该是可序列化的', () => {
      const config = loadConfigFromEnv();
      
      expect(() => JSON.stringify(config)).not.toThrow();
      
      const serialized = JSON.stringify(config);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(config);
    });
  });
});
