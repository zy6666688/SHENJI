/**
 * PluginSandbox 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginSandbox, PluginManager, UsageTracker } from '../PluginSandbox';
import { examplePluginMetadata, examplePluginCode } from '../examplePlugin';

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;
  
  beforeEach(() => {
    sandbox = new PluginSandbox(examplePluginMetadata, examplePluginCode);
  });
  
  it('应该成功执行安全的插件代码', async () => {
    const inputs = {
      data: [
        { name: 'Alice', age: 25, email: 'alice@example.com' },
        { name: 'Bob', age: 30, email: 'bob@example.com' }
      ],
      rules: {
        required: ['name', 'email'],
        range: {
          age: { min: 18, max: 65 }
        },
        pattern: {
          email: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        }
      }
    };
    
    const result = await sandbox.execute(inputs, 'test-user');
    
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output.summary.validCount).toBe(2);
  });
  
  it('应该拒绝包含危险关键字的代码', async () => {
    const dangerousCode = `
      const fs = require('fs');
      fs.readFileSync('/etc/passwd');
    `;
    
    const dangerousSandbox = new PluginSandbox(
      examplePluginMetadata,
      dangerousCode
    );
    
    await expect(
      dangerousSandbox.execute({}, 'test-user')
    ).rejects.toThrow('Code security check failed');
  });
  
  it('应该强制执行超时限制', async () => {
    const slowCode = `
      const start = Date.now();
      while (Date.now() - start < 10000) {
        // 循环10秒
      }
      return 'done';
    `;
    
    const slowSandbox = new PluginSandbox(
      {
        ...examplePluginMetadata,
        quota: {
          ...examplePluginMetadata.quota,
          maxExecutionTime: 1000  // 1秒超时
        }
      },
      slowCode
    );
    
    const result = await slowSandbox.execute({}, 'test-user');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('UsageTracker', () => {
  let tracker: UsageTracker;
  
  beforeEach(() => {
    tracker = new UsageTracker('test-plugin');
  });
  
  it('应该正确记录执行统计', () => {
    tracker.recordExecution({
      executionTime: 100,
      memoryUsed: 10,
      cpuUsed: 20,
      networkRequests: 0
    });
    
    tracker.recordExecution({
      executionTime: 200,
      memoryUsed: 15,
      cpuUsed: 25,
      networkRequests: 0
    });
    
    const stats = tracker.getStats();
    
    expect(stats.executions).toBe(2);
    expect(stats.totalExecutionTime).toBe(300);
    expect(stats.averageExecutionTime).toBe(150);
  });
  
  it('应该正确追踪API调用', () => {
    tracker.recordAPICall('getData');
    tracker.recordAPICall('getData');
    tracker.recordAPICall('setData');
    
    const stats = tracker.getStats();
    
    expect(stats.apiCalls['getData']).toBe(2);
    expect(stats.apiCalls['setData']).toBe(1);
  });
  
  it('应该正确检查配额', () => {
    // 模拟10次网络请求
    for (let i = 0; i < 10; i++) {
      tracker.recordNetworkRequest();
    }
    
    const quota = {
      maxExecutionTime: 5000,
      maxMemoryMB: 100,
      maxCPUPercent: 50,
      maxNetworkRequests: 5
    };
    
    const check = tracker.checkQuota(quota);
    
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Network request limit exceeded');
  });
});

describe('PluginManager', () => {
  let manager: PluginManager;
  
  beforeEach(() => {
    manager = new PluginManager();
  });
  
  it('应该成功注册和执行插件', async () => {
    manager.register(examplePluginMetadata, examplePluginCode);
    
    const inputs = {
      data: [{ name: 'Test', age: 25, email: 'test@example.com' }],
      rules: { required: ['name'] }
    };
    
    const result = await manager.execute('data-validator-v1', inputs, 'user1');
    
    expect(result.success).toBe(true);
  });
  
  it('应该记录审计日志', async () => {
    manager.register(examplePluginMetadata, examplePluginCode);
    
    await manager.execute('data-validator-v1', {}, 'user1');
    await manager.execute('data-validator-v1', {}, 'user2');
    
    const logs = manager.getAuditLogs();
    
    expect(logs.length).toBe(2);
    expect(logs[0].pluginId).toBe('data-validator-v1');
  });
  
  it('应该支持审计日志过滤', async () => {
    manager.register(examplePluginMetadata, examplePluginCode);
    
    await manager.execute('data-validator-v1', {}, 'user1');
    await manager.execute('data-validator-v1', {}, 'user2');
    
    const user1Logs = manager.getAuditLogs({ userId: 'user1' });
    
    expect(user1Logs.length).toBe(1);
    expect(user1Logs[0].userId).toBe('user1');
  });
});
