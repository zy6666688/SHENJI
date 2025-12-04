/**
 * PluginSystem - 工作流插件系统
 * 长期愿景功能
 * 
 * 支持动态加载和管理自定义节点插件
 * 提供插件生命周期管理、权限控制和隔离执行
 * 
 * @module plugins/PluginSystem
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { NodeMetadata } from '../nodes/BaseNode';

/**
 * 插件状态
 */
export enum PluginStatus {
  INSTALLED = 'installed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UPDATING = 'updating',
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  
  // 依赖
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // 节点定义
  nodes: NodeMetadata[];
  
  // 权限要求
  permissions: PluginPermission[];
  
  // 配置Schema
  configSchema?: any;
  
  // 生命周期钩子
  hooks?: {
    onInstall?: string;
    onActivate?: string;
    onDeactivate?: string;
    onUninstall?: string;
  };
}

/**
 * 插件权限
 */
export enum PluginPermission {
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  NETWORK = 'network',
  DATABASE = 'database',
  SYSTEM = 'system',
  SUBPROCESS = 'subprocess',
}

/**
 * 插件信息
 */
export interface PluginInfo extends PluginMetadata {
  status: PluginStatus;
  installedAt: number;
  activatedAt?: number;
  path: string;
  config?: any;
  error?: string;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled: boolean;
  config: any;
  grantedPermissions: PluginPermission[];
}

/**
 * 插件加载器
 */
export class PluginLoader {
  private pluginDir: string;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  /**
   * 从目录加载插件
   */
  async loadFromDirectory(pluginPath: string): Promise<PluginMetadata> {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const pluginJsonPath = path.join(pluginPath, 'plugin.json');

    try {
      // 读取 package.json
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );

      // 读取 plugin.json
      const pluginJson = JSON.parse(
        await fs.readFile(pluginJsonPath, 'utf-8')
      );

      const metadata: PluginMetadata = {
        id: packageJson.name,
        name: pluginJson.name || packageJson.name,
        version: packageJson.version,
        description: packageJson.description || '',
        author: packageJson.author || 'Unknown',
        homepage: packageJson.homepage,
        repository: packageJson.repository?.url,
        license: packageJson.license || 'UNLICENSED',
        keywords: packageJson.keywords || [],
        dependencies: packageJson.dependencies,
        peerDependencies: packageJson.peerDependencies,
        nodes: pluginJson.nodes || [],
        permissions: pluginJson.permissions || [],
        configSchema: pluginJson.configSchema,
        hooks: pluginJson.hooks,
      };

      return metadata;
    } catch (error: any) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error.message}`);
    }
  }

  /**
   * 从NPM包加载插件
   */
  async loadFromNpm(packageName: string): Promise<PluginMetadata> {
    // TODO: 实现NPM包下载和加载
    throw new Error('NPM loading not implemented yet');
  }

  /**
   * 验证插件
   */
  async validatePlugin(metadata: PluginMetadata): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证必需字段
    if (!metadata.id) errors.push('Missing plugin ID');
    if (!metadata.name) errors.push('Missing plugin name');
    if (!metadata.version) errors.push('Missing plugin version');

    // 验证节点定义
    if (!metadata.nodes || metadata.nodes.length === 0) {
      errors.push('Plugin must define at least one node');
    }

    // 验证节点ID唯一性
    const nodeIds = new Set<string>();
    for (const node of metadata.nodes || []) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 插件注册表
 */
export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginInfo> = new Map();
  private pluginDir: string;
  private loader: PluginLoader;

  constructor(pluginDir: string) {
    super();
    this.pluginDir = pluginDir;
    this.loader = new PluginLoader(pluginDir);
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.pluginDir, { recursive: true });
    await this.loadInstalledPlugins();
  }

  /**
   * 加载已安装的插件
   */
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const pluginPath = path.join(this.pluginDir, entry.name);
            const metadata = await this.loader.loadFromDirectory(pluginPath);
            
            const pluginInfo: PluginInfo = {
              ...metadata,
              status: PluginStatus.INSTALLED,
              installedAt: Date.now(),
              path: pluginPath,
            };
            
            this.plugins.set(metadata.id, pluginInfo);
            console.log(`Loaded plugin: ${metadata.name} v${metadata.version}`);
          } catch (error: any) {
            console.error(`Failed to load plugin from ${entry.name}:`, error);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to load installed plugins:', error);
    }
  }

  /**
   * 安装插件
   */
  async install(pluginPath: string): Promise<PluginInfo> {
    // 1. 加载插件元数据
    const metadata = await this.loader.loadFromDirectory(pluginPath);

    // 2. 验证插件
    const validation = await this.loader.validatePlugin(metadata);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    // 3. 检查是否已安装
    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} is already installed`);
    }

    // 4. 复制插件文件到插件目录
    const targetPath = path.join(this.pluginDir, metadata.id);
    await this.copyDirectory(pluginPath, targetPath);

    // 5. 注册插件
    const pluginInfo: PluginInfo = {
      ...metadata,
      status: PluginStatus.INSTALLED,
      installedAt: Date.now(),
      path: targetPath,
    };

    this.plugins.set(metadata.id, pluginInfo);

    // 6. 触发安装钩子
    if (metadata.hooks?.onInstall) {
      await this.executeHook(pluginInfo, metadata.hooks.onInstall);
    }

    this.emit('plugin:installed', pluginInfo);
    return pluginInfo;
  }

  /**
   * 激活插件
   */
  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === PluginStatus.ACTIVE) {
      return; // 已激活
    }

    // 触发激活钩子
    if (plugin.hooks?.onActivate) {
      await this.executeHook(plugin, plugin.hooks.onActivate);
    }

    plugin.status = PluginStatus.ACTIVE;
    plugin.activatedAt = Date.now();

    this.emit('plugin:activated', plugin);
    console.log(`Plugin activated: ${plugin.name}`);
  }

  /**
   * 停用插件
   */
  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== PluginStatus.ACTIVE) {
      return; // 未激活
    }

    // 触发停用钩子
    if (plugin.hooks?.onDeactivate) {
      await this.executeHook(plugin, plugin.hooks.onDeactivate);
    }

    plugin.status = PluginStatus.INACTIVE;

    this.emit('plugin:deactivated', plugin);
    console.log(`Plugin deactivated: ${plugin.name}`);
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // 停用插件
    if (plugin.status === PluginStatus.ACTIVE) {
      await this.deactivate(pluginId);
    }

    // 触发卸载钩子
    if (plugin.hooks?.onUninstall) {
      await this.executeHook(plugin, plugin.hooks.onUninstall);
    }

    // 删除插件文件
    await fs.rm(plugin.path, { recursive: true, force: true });

    // 从注册表移除
    this.plugins.delete(pluginId);

    this.emit('plugin:uninstalled', plugin);
    console.log(`Plugin uninstalled: ${plugin.name}`);
  }

  /**
   * 获取插件列表
   */
  list(filter?: { status?: PluginStatus }): PluginInfo[] {
    let plugins = Array.from(this.plugins.values());

    if (filter?.status) {
      plugins = plugins.filter(p => p.status === filter.status);
    }

    return plugins;
  }

  /**
   * 获取插件信息
   */
  get(pluginId: string): PluginInfo | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取激活的节点
   */
  getActiveNodes(): NodeMetadata[] {
    const nodes: NodeMetadata[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.status === PluginStatus.ACTIVE) {
        nodes.push(...plugin.nodes);
      }
    }

    return nodes;
  }

  /**
   * 执行钩子
   */
  private async executeHook(plugin: PluginInfo, hookScript: string): Promise<void> {
    try {
      const hookPath = path.join(plugin.path, hookScript);
      // TODO: 在沙箱中执行钩子脚本
      console.log(`Executing hook: ${hookPath}`);
    } catch (error: any) {
      console.error(`Failed to execute hook ${hookScript}:`, error);
      throw error;
    }
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const plugins = Array.from(this.plugins.values());
    return {
      total: plugins.length,
      active: plugins.filter(p => p.status === PluginStatus.ACTIVE).length,
      inactive: plugins.filter(p => p.status === PluginStatus.INACTIVE).length,
      error: plugins.filter(p => p.status === PluginStatus.ERROR).length,
      totalNodes: plugins.reduce((sum, p) => sum + p.nodes.length, 0),
      activeNodes: this.getActiveNodes().length,
    };
  }
}

/**
 * 插件市场
 */
export class PluginMarketplace {
  private registry: PluginRegistry;
  private marketplaceUrl: string;

  constructor(registry: PluginRegistry, marketplaceUrl: string) {
    this.registry = registry;
    this.marketplaceUrl = marketplaceUrl;
  }

  /**
   * 搜索插件
   */
  async search(query: string, options?: {
    category?: string;
    author?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    plugins: PluginMetadata[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // TODO: 实现插件市场搜索
    return {
      plugins: [],
      total: 0,
      page: options?.page || 1,
      pageSize: options?.pageSize || 20,
    };
  }

  /**
   * 从市场安装插件
   */
  async installFromMarketplace(pluginId: string): Promise<PluginInfo> {
    // TODO: 实现从市场下载和安装
    throw new Error('Marketplace installation not implemented yet');
  }

  /**
   * 检查更新
   */
  async checkUpdates(): Promise<{
    pluginId: string;
    currentVersion: string;
    latestVersion: string;
  }[]> {
    // TODO: 实现更新检查
    return [];
  }
}

/**
 * 创建插件系统
 */
export function createPluginSystem(pluginDir: string): PluginRegistry {
  return new PluginRegistry(pluginDir);
}
