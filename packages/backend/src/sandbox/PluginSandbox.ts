/**
 * PluginSandbox - 插件沙箱系统
 * Week 6: 安全的插件执行环境
 * 
 * 功能:
 * 1. 隔离执行环境
 * 2. 权限控制
 * 3. 资源限制
 * 4. 审计日志
 */

import { EventEmitter } from 'events';

/**
 * 插件权限定义
 */
export interface PluginPermissions {
  // 网络权限
  network?: {
    allowed: boolean;
    allowedDomains?: string[];  // 允许的域名白名单
  };
  
  // 文件系统权限
  filesystem?: {
    read: boolean;
    write: boolean;
    allowedPaths?: string[];    // 允许的路径
  };
  
  // API调用权限
  api?: {
    allowed: boolean;
    rateLimit?: number;          // 每分钟调用次数限制
  };
  
  // 数据访问权限
  data?: {
    canReadUserData: boolean;
    canWriteUserData: boolean;
    canAccessSensitiveData: boolean;
  };
}

/**
 * 插件配额
 */
export interface PluginQuota {
  maxExecutionTime: number;      // 最大执行时间(ms)
  maxMemoryMB: number;            // 最大内存使用(MB)
  maxCPUPercent: number;          // 最大CPU使用率
  maxNetworkRequests: number;    // 最大网络请求数
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermissions;
  quota: PluginQuota;
}

/**
 * 插件执行上下文
 */
export interface PluginContext {
  pluginId: string;
  userId: string;
  executionId: string;
  startTime: number;
  
  // 资源使用情况
  resourceUsage: {
    executionTime: number;
    memoryUsed: number;
    cpuUsed: number;
    networkRequests: number;
  };
}

/**
 * 插件执行结果
 */
export interface PluginExecutionResult {
  success: boolean;
  output?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  context: PluginContext;
  violations?: string[];  // 权限违规记录
}

/**
 * 危险关键字列表
 */
const DANGEROUS_KEYWORDS = [
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'require',
  'import',
  'fetch',
  'XMLHttpRequest',
  '__proto__',
  'constructor',
  'process',
  'child_process',
  'fs',
  'path',
  'os'
];

/**
 * 插件沙箱类
 */
export class PluginSandbox extends EventEmitter {
  private metadata: PluginMetadata;
  private code: string;
  private usageTracker: UsageTracker;
  
  constructor(metadata: PluginMetadata, code: string) {
    super();
    this.metadata = metadata;
    this.code = code;
    this.usageTracker = new UsageTracker(metadata.id);
  }
  
  /**
   * 代码安全扫描
   */
  private scanCode(): { safe: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // 检查危险关键字
    for (const keyword of DANGEROUS_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      if (regex.test(this.code)) {
        violations.push(`Dangerous keyword detected: ${keyword}`);
      }
    }
    
    // 检查动态代码执行
    if (this.code.includes('eval(') || this.code.includes('Function(')) {
      violations.push('Dynamic code execution is not allowed');
    }
    
    // 检查文件系统访问
    if (!this.metadata.permissions.filesystem?.read) {
      if (this.code.includes('fs.') || this.code.includes('readFile')) {
        violations.push('File system access is not allowed');
      }
    }
    
    // 检查网络访问
    if (!this.metadata.permissions.network?.allowed) {
      if (this.code.includes('fetch(') || this.code.includes('XMLHttpRequest')) {
        violations.push('Network access is not allowed');
      }
    }
    
    return {
      safe: violations.length === 0,
      violations
    };
  }
  
  /**
   * 包装插件代码
   */
  private wrapCode(inputs: any): string {
    const { safe, violations } = this.scanCode();
    
    if (!safe) {
      throw new Error(`Code security check failed: ${violations.join(', ')}`);
    }
    
    // 直接返回插件代码的IIFE，前面设置环境变量
    return `
'use strict';

// 覆盖危险的全局对象
const window = undefined;
const document = undefined;
const global = undefined;
const process = undefined;
const require = undefined;
const module = undefined;
const exports = undefined;

// 提供沙箱全局对象
const console = {
  log: function(...args) {},
  warn: function(...args) {},
  error: function(...args) {}
};

// 输入数据
const inputs = ${JSON.stringify(inputs)};

// 执行插件代码并返回结果
${this.code}
    `;
  }
  
  /**
   * 创建受控的API对象
   */
  private createSandboxAPI() {
    return {
      // 数据访问API（受权限控制）
      getData: async (key: string) => {
        if (!this.metadata.permissions.data?.canReadUserData) {
          throw new Error('Permission denied: data read not allowed');
        }
        this.usageTracker.recordAPICall('getData');
        // 实际实现需要连接到数据服务
        return null;
      },
      
      // HTTP请求API（受权限控制）
      fetch: async (url: string, options?: any) => {
        if (!this.metadata.permissions.network?.allowed) {
          throw new Error('Permission denied: network access not allowed');
        }
        
        // 检查域名白名单
        const allowedDomains = this.metadata.permissions.network.allowedDomains || [];
        const urlObj = new URL(url);
        if (allowedDomains.length > 0 && !allowedDomains.includes(urlObj.hostname)) {
          throw new Error(`Permission denied: ${urlObj.hostname} not in allowed domains`);
        }
        
        this.usageTracker.recordNetworkRequest();
        
        // 实际实现
        return fetch(url, options);
      }
    };
  }
  
  /**
   * 执行插件
   */
  async execute(inputs: any, userId: string): Promise<PluginExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const context: PluginContext = {
      pluginId: this.metadata.id,
      userId,
      executionId,
      startTime,
      resourceUsage: {
        executionTime: 0,
        memoryUsed: 0,
        cpuUsed: 0,
        networkRequests: 0
      }
    };
    
    // 安全检查（在try-catch之外，让安全错误直接抛出）
    const wrappedCode = this.wrapCode(inputs);
    
    try {
      // 检查配额
      const quotaCheck = this.usageTracker.checkQuota(this.metadata.quota);
      if (!quotaCheck.allowed) {
        throw new Error(`Quota exceeded: ${quotaCheck.reason}`);
      }
      
      // 使用 VM 模块执行（Node.js环境）
      // 注意：浏览器环境需要使用 iframe 或 Web Workers
      const vm = await import('vm');
      
      // 创建沙箱上下文
      const sandbox = vm.createContext({});
      
      // 设置超时
      const timeout = this.metadata.quota.maxExecutionTime;
      
      // 执行代码并捕获返回值
      const result = vm.runInContext(wrappedCode, sandbox, {
        timeout,
        displayErrors: true
      });
      
      // 更新资源使用
      const executionTime = Date.now() - startTime;
      context.resourceUsage.executionTime = executionTime;
      context.resourceUsage.networkRequests = this.usageTracker.getNetworkRequestCount();
      
      // 记录使用情况
      this.usageTracker.recordExecution(context.resourceUsage);
      
      // 记录审计日志
      this.emit('audit', {
        pluginId: this.metadata.id,
        userId,
        executionId,
        success: true,
        executionTime,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        output: result,
        context
      };
      
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      context.resourceUsage.executionTime = executionTime;
      
      // 记录失败的审计日志
      this.emit('audit', {
        pluginId: this.metadata.id,
        userId,
        executionId,
        success: false,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          details: error.stack
        },
        context
      };
    }
  }
  
  /**
   * 获取使用统计
   */
  getUsageStats() {
    return this.usageTracker.getStats();
  }
}

/**
 * 使用追踪器
 */
export class UsageTracker {
  private pluginId: string;
  private executions: number = 0;
  private totalExecutionTime: number = 0;
  private apiCalls: Map<string, number> = new Map();
  private networkRequests: number = 0;
  private lastExecution?: Date;
  
  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }
  
  recordExecution(resourceUsage: PluginContext['resourceUsage']) {
    this.executions++;
    this.totalExecutionTime += resourceUsage.executionTime;
    this.lastExecution = new Date();
  }
  
  recordAPICall(apiName: string) {
    const count = this.apiCalls.get(apiName) || 0;
    this.apiCalls.set(apiName, count + 1);
  }
  
  recordNetworkRequest() {
    this.networkRequests++;
  }
  
  getNetworkRequestCount(): number {
    return this.networkRequests;
  }
  
  checkQuota(quota: PluginQuota): { allowed: boolean; reason?: string } {
    // 检查网络请求配额（如果允许的数量为0，则表示不允许任何请求）
    if (quota.maxNetworkRequests === 0 && this.networkRequests > 0) {
      return {
        allowed: false,
        reason: `Network requests not allowed`
      };
    }
    
    if (quota.maxNetworkRequests > 0 && this.networkRequests > quota.maxNetworkRequests) {
      return {
        allowed: false,
        reason: `Network request limit exceeded: ${quota.maxNetworkRequests}`
      };
    }
    
    return { allowed: true };
  }
  
  getStats() {
    return {
      pluginId: this.pluginId,
      executions: this.executions,
      totalExecutionTime: this.totalExecutionTime,
      averageExecutionTime: this.executions > 0 ? this.totalExecutionTime / this.executions : 0,
      apiCalls: Object.fromEntries(this.apiCalls),
      networkRequests: this.networkRequests,
      lastExecution: this.lastExecution?.toISOString()
    };
  }
  
  reset() {
    this.executions = 0;
    this.totalExecutionTime = 0;
    this.apiCalls.clear();
    this.networkRequests = 0;
    this.lastExecution = undefined;
  }
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, PluginSandbox> = new Map();
  private auditLogs: any[] = [];
  
  /**
   * 注册插件
   */
  register(metadata: PluginMetadata, code: string): void {
    const sandbox = new PluginSandbox(metadata, code);
    
    // 监听审计事件
    sandbox.on('audit', (log) => {
      this.auditLogs.push(log);
      console.log('[PluginAudit]', log);
    });
    
    this.plugins.set(metadata.id, sandbox);
    console.log(`✅ Plugin registered: ${metadata.id} v${metadata.version}`);
  }
  
  /**
   * 执行插件
   */
  async execute(pluginId: string, inputs: any, userId: string): Promise<PluginExecutionResult> {
    const sandbox = this.plugins.get(pluginId);
    
    if (!sandbox) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    
    return sandbox.execute(inputs, userId);
  }
  
  /**
   * 获取插件使用统计
   */
  getPluginStats(pluginId: string) {
    const sandbox = this.plugins.get(pluginId);
    return sandbox?.getUsageStats();
  }
  
  /**
   * 获取所有审计日志
   */
  getAuditLogs(filters?: { pluginId?: string; userId?: string; startTime?: Date }) {
    let logs = this.auditLogs;
    
    if (filters?.pluginId) {
      logs = logs.filter(log => log.pluginId === filters.pluginId);
    }
    
    if (filters?.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    
    if (filters?.startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.startTime!);
    }
    
    return logs;
  }
  
  /**
   * 列出所有插件
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}
