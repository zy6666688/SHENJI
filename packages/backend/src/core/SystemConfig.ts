/**
 * SystemConfig - 系统配置管理
 * 
 * 统一管理所有系统配置
 * 支持环境变量覆盖
 * 
 * @module core/SystemConfig
 * @author SHENJI Team
 * @version 1.0.0
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import type { SystemConfig } from './SystemIntegration';

// 加载环境变量
dotenv.config();

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): SystemConfig {
  return {
    features: {
      distributed: getEnvBoolean('DISTRIBUTED_ENABLED', false),
      plugins: getEnvBoolean('PLUGIN_ENABLED', true),
      ai: getEnvBoolean('AI_ENABLED', false),
      rbac: getEnvBoolean('RBAC_ENABLED', true),
      audit: getEnvBoolean('AUDIT_ENABLED', true),
    },

    distributed: {
      enabled: getEnvBoolean('DISTRIBUTED_ENABLED', false),
      isCoordinator: getEnvBoolean('DISTRIBUTED_IS_COORDINATOR', true),
      workerCapacity: getEnvNumber('WORKER_CAPACITY', 10),
      redisUrl: getEnvString('REDIS_URL', 'redis://localhost:6379'),
    },

    plugins: {
      enabled: getEnvBoolean('PLUGIN_ENABLED', true),
      pluginDir: getEnvString('PLUGIN_DIR', path.join(process.cwd(), 'plugins')),
      autoActivate: getEnvBoolean('PLUGIN_AUTO_ACTIVATE', false),
    },

    ai: {
      enabled: getEnvBoolean('AI_ENABLED', false),
      provider: getEnvString('AI_PROVIDER', 'openai') as any,
      apiKey: getEnvString('OPENAI_API_KEY', ''),
      model: getEnvString('AI_MODEL', 'gpt-4'),
      endpoint: getEnvString('AI_ENDPOINT', ''),
    },

    rbac: {
      enabled: getEnvBoolean('RBAC_ENABLED', true),
      defaultRole: getEnvString('RBAC_DEFAULT_ROLE', 'user:basic'),
    },

    audit: {
      enabled: getEnvBoolean('AUDIT_ENABLED', true),
      retentionDays: getEnvNumber('AUDIT_RETENTION_DAYS', 90),
      logLevel: getEnvString('AUDIT_LOG_LEVEL', 'all') as any,
    },
  };
}

/**
 * 获取字符串环境变量
 */
function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * 获取数字环境变量
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 获取布尔环境变量
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 验证配置
 */
export function validateConfig(config: SystemConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证分布式配置
  if (config.features.distributed && config.distributed?.enabled) {
    if (!config.distributed.redisUrl) {
      errors.push('Redis URL is required for distributed mode');
    }
  }

  // 验证AI配置
  if (config.features.ai && config.ai?.enabled) {
    if (!config.ai.apiKey && config.ai.provider !== 'local') {
      errors.push(`API key is required for AI provider: ${config.ai.provider}`);
    }
  }

  // 验证插件配置
  if (config.features.plugins && config.plugins?.enabled) {
    if (!config.plugins.pluginDir) {
      errors.push('Plugin directory is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 打印配置摘要
 */
export function printConfigSummary(config: SystemConfig): void {
  console.log('\n📋 System Configuration:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🎯 Features:');
  console.log(`  Distributed Execution: ${config.features.distributed ? '✅' : '❌'}`);
  console.log(`  Plugin System:         ${config.features.plugins ? '✅' : '❌'}`);
  console.log(`  AI Assistant:          ${config.features.ai ? '✅' : '❌'}`);
  console.log(`  RBAC:                  ${config.features.rbac ? '✅' : '❌'}`);
  console.log(`  Audit Logging:         ${config.features.audit ? '✅' : '❌'}`);

  if (config.features.distributed && config.distributed) {
    console.log('\n📡 Distributed:');
    console.log(`  Role:     ${config.distributed.isCoordinator ? 'Coordinator' : 'Worker'}`);
    console.log(`  Capacity: ${config.distributed.workerCapacity}`);
    console.log(`  Redis:    ${config.distributed.redisUrl}`);
  }

  if (config.features.plugins && config.plugins) {
    console.log('\n🔌 Plugins:');
    console.log(`  Directory:    ${config.plugins.pluginDir}`);
    console.log(`  Auto-activate: ${config.plugins.autoActivate ? 'Yes' : 'No'}`);
  }

  if (config.features.ai && config.ai) {
    console.log('\n🤖 AI:');
    console.log(`  Provider: ${config.ai.provider}`);
    console.log(`  Model:    ${config.ai.model}`);
    console.log(`  API Key:  ${config.ai.apiKey ? '***' + config.ai.apiKey.slice(-4) : 'Not set'}`);
  }

  if (config.features.rbac && config.rbac) {
    console.log('\n🔐 RBAC:');
    console.log(`  Default Role: ${config.rbac.defaultRole}`);
  }

  if (config.features.audit && config.audit) {
    console.log('\n📝 Audit:');
    console.log(`  Retention: ${config.audit.retentionDays} days`);
    console.log(`  Log Level: ${config.audit.logLevel}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * 导出默认配置
 */
export const defaultConfig = loadConfigFromEnv();
