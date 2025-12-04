/**
 * PermissionSystem - 企业级权限系统
 * 长期愿景功能
 * 
 * RBAC (基于角色的访问控制) + ABAC (基于属性的访问控制)
 * 支持细粒度权限管理和审计日志
 * 
 * @module enterprise/PermissionSystem
 * @author SHENJI Team
 * @version 1.0.0
 * @created 2025-01-04
 */

import { EventEmitter } from 'events';

/**
 * 资源类型
 */
export enum ResourceType {
  WORKFLOW = 'workflow',
  EXECUTION = 'execution',
  NODE = 'node',
  PLUGIN = 'plugin',
  USER = 'user',
  ROLE = 'role',
  TEAM = 'team',
  ORGANIZATION = 'organization',
}

/**
 * 操作类型
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  SHARE = 'share',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage',
}

/**
 * 权限
 */
export interface Permission {
  id: string;
  resource: ResourceType;
  action: Action;
  conditions?: PermissionCondition[];
  description?: string;
}

/**
 * 权限条件
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'contains' | 'gt' | 'lt';
  value: any;
}

/**
 * 角色
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // 继承的角色ID
  isSystem?: boolean; // 系统内置角色
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * 用户角色绑定
 */
export interface UserRole {
  userId: string;
  roleId: string;
  scope?: {
    resource: ResourceType;
    resourceId: string;
  };
  expiresAt?: number;
  grantedBy: string;
  grantedAt: number;
}

/**
 * 权限检查上下文
 */
export interface PermissionContext {
  userId: string;
  resource: ResourceType;
  resourceId?: string;
  action: Action;
  attributes?: Record<string, any>; // 用于ABAC
}

/**
 * 权限检查结果
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  matchedPermissions?: Permission[];
  matchedRoles?: string[];
}

/**
 * 团队
 */
export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[]; // 用户ID列表
  roles: string[]; // 团队角色列表
  owner: string;
  createdAt: number;
}

/**
 * 组织
 */
export interface Organization {
  id: string;
  name: string;
  description: string;
  teams: string[]; // 团队ID列表
  owner: string;
  settings: {
    maxUsers?: number;
    maxWorkflows?: number;
    features?: string[];
  };
  createdAt: number;
}

/**
 * 权限管理器
 */
export class PermissionManager extends EventEmitter {
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private teams: Map<string, Team> = new Map();
  private organizations: Map<string, Organization> = new Map();

  constructor() {
    super();
    this.initializeSystemRoles();
  }

  /**
   * 初始化系统角色
   */
  private initializeSystemRoles(): void {
    // 超级管理员
    this.createRole({
      id: 'system:admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        { id: 'admin:*', resource: ResourceType.WORKFLOW, action: Action.MANAGE },
        { id: 'admin:*', resource: ResourceType.USER, action: Action.MANAGE },
        { id: 'admin:*', resource: ResourceType.ROLE, action: Action.MANAGE },
      ],
      isSystem: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 工作流管理员
    this.createRole({
      id: 'workflow:admin',
      name: 'Workflow Administrator',
      description: 'Can manage all workflows',
      permissions: [
        { id: 'wf:create', resource: ResourceType.WORKFLOW, action: Action.CREATE },
        { id: 'wf:read', resource: ResourceType.WORKFLOW, action: Action.READ },
        { id: 'wf:update', resource: ResourceType.WORKFLOW, action: Action.UPDATE },
        { id: 'wf:delete', resource: ResourceType.WORKFLOW, action: Action.DELETE },
        { id: 'wf:execute', resource: ResourceType.WORKFLOW, action: Action.EXECUTE },
      ],
      isSystem: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 普通用户
    this.createRole({
      id: 'user:basic',
      name: 'Basic User',
      description: 'Can view and execute workflows',
      permissions: [
        { id: 'user:read', resource: ResourceType.WORKFLOW, action: Action.READ },
        { id: 'user:execute', resource: ResourceType.WORKFLOW, action: Action.EXECUTE },
      ],
      isSystem: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 审计员
    this.createRole({
      id: 'auditor',
      name: 'Auditor',
      description: 'Can view all resources and audit logs',
      permissions: [
        { id: 'audit:read', resource: ResourceType.WORKFLOW, action: Action.READ },
        { id: 'audit:read:exec', resource: ResourceType.EXECUTION, action: Action.READ },
        { id: 'audit:export', resource: ResourceType.EXECUTION, action: Action.EXPORT },
      ],
      isSystem: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * 创建角色
   */
  createRole(role: Role): Role {
    if (this.roles.has(role.id)) {
      throw new Error(`Role ${role.id} already exists`);
    }

    this.roles.set(role.id, role);
    this.emit('role:created', role);
    return role;
  }

  /**
   * 分配角色给用户
   */
  assignRole(userRole: UserRole): void {
    const role = this.roles.get(userRole.roleId);
    if (!role) {
      throw new Error(`Role ${userRole.roleId} not found`);
    }

    const userRoles = this.userRoles.get(userRole.userId) || [];
    userRoles.push(userRole);
    this.userRoles.set(userRole.userId, userRoles);

    this.emit('role:assigned', userRole);
  }

  /**
   * 撤销用户角色
   */
  revokeRole(userId: string, roleId: string): void {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) return;

    const filtered = userRoles.filter(ur => ur.roleId !== roleId);
    this.userRoles.set(userId, filtered);

    this.emit('role:revoked', { userId, roleId });
  }

  /**
   * 检查权限
   */
  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    const { userId, resource, resourceId, action, attributes } = context;

    // 1. 获取用户角色
    const userRoles = this.getUserRoles(userId);
    if (userRoles.length === 0) {
      return { allowed: false, reason: 'User has no roles' };
    }

    // 2. 收集所有权限
    const allPermissions: Permission[] = [];
    const matchedRoles: string[] = [];

    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (!role) continue;

      // 检查作用域
      if (userRole.scope) {
        if (userRole.scope.resource !== resource || 
            (resourceId && userRole.scope.resourceId !== resourceId)) {
          continue;
        }
      }

      // 检查过期时间
      if (userRole.expiresAt && Date.now() > userRole.expiresAt) {
        continue;
      }

      matchedRoles.push(role.id);
      allPermissions.push(...role.permissions);

      // 处理角色继承
      if (role.inherits) {
        for (const parentRoleId of role.inherits) {
          const parentRole = this.roles.get(parentRoleId);
          if (parentRole) {
            allPermissions.push(...parentRole.permissions);
          }
        }
      }
    }

    // 3. 检查是否有匹配的权限
    const matchedPermissions = allPermissions.filter(p => {
      // 检查资源和动作
      if (p.resource !== resource || p.action !== action) {
        return false;
      }

      // 检查条件 (ABAC)
      if (p.conditions && attributes) {
        return this.evaluateConditions(p.conditions, attributes);
      }

      return true;
    });

    if (matchedPermissions.length > 0) {
      return {
        allowed: true,
        matchedPermissions,
        matchedRoles,
      };
    }

    return {
      allowed: false,
      reason: 'No matching permissions found',
    };
  }

  /**
   * 评估权限条件
   */
  private evaluateConditions(
    conditions: PermissionCondition[],
    attributes: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const value = attributes[condition.field];
      
      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'ne':
          return value !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'contains':
          return Array.isArray(value) && value.includes(condition.value);
        case 'gt':
          return value > condition.value;
        case 'lt':
          return value < condition.value;
        default:
          return false;
      }
    });
  }

  /**
   * 获取用户角色
   */
  private getUserRoles(userId: string): UserRole[] {
    return this.userRoles.get(userId) || [];
  }

  /**
   * 创建团队
   */
  createTeam(team: Team): Team {
    this.teams.set(team.id, team);
    this.emit('team:created', team);
    return team;
  }

  /**
   * 添加团队成员
   */
  addTeamMember(teamId: string, userId: string): void {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    if (!team.members.includes(userId)) {
      team.members.push(userId);
      this.emit('team:member:added', { teamId, userId });
    }
  }

  /**
   * 获取用户团队
   */
  getUserTeams(userId: string): Team[] {
    return Array.from(this.teams.values()).filter(team =>
      team.members.includes(userId)
    );
  }

  /**
   * 创建组织
   */
  createOrganization(org: Organization): Organization {
    this.organizations.set(org.id, org);
    this.emit('organization:created', org);
    return org;
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      roles: this.roles.size,
      users: this.userRoles.size,
      teams: this.teams.size,
      organizations: this.organizations.size,
    };
  }
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  userName?: string;
  action: string;
  resource: ResourceType;
  resourceId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQuery {
  userId?: string;
  resource?: ResourceType;
  action?: string;
  startTime?: number;
  endTime?: number;
  success?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 审计日志管理器
 */
export class AuditLogger extends EventEmitter {
  private logs: AuditLog[] = [];
  private storage: any; // 持久化存储

  constructor(storage?: any) {
    super();
    this.storage = storage;
  }

  /**
   * 记录审计日志
   */
  async log(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.logs.push(auditLog);

    // 持久化
    if (this.storage) {
      await this.storage.save(auditLog);
    }

    this.emit('audit:logged', auditLog);

    // 自动清理旧日志
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }
  }

  /**
   * 查询审计日志
   */
  async query(query: AuditLogQuery): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let filtered = this.logs;

    // 应用过滤器
    if (query.userId) {
      filtered = filtered.filter(log => log.userId === query.userId);
    }

    if (query.resource) {
      filtered = filtered.filter(log => log.resource === query.resource);
    }

    if (query.action) {
      filtered = filtered.filter(log => log.action === query.action);
    }

    if (query.startTime) {
      filtered = filtered.filter(log => log.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filtered = filtered.filter(log => log.timestamp <= query.endTime!);
    }

    if (query.success !== undefined) {
      filtered = filtered.filter(log => log.success === query.success);
    }

    // 分页
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      logs: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  /**
   * 导出审计日志
   */
  async export(query: AuditLogQuery, format: 'json' | 'csv'): Promise<string> {
    const result = await this.query({ ...query, pageSize: 999999 });

    if (format === 'json') {
      return JSON.stringify(result.logs, null, 2);
    } else {
      // CSV格式
      const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Success'];
      const rows = result.logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.userName || log.userId,
        log.action,
        log.resource,
        log.success ? 'Yes' : 'No',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * 获取统计信息
   */
  getStats(timeRange?: { start: number; end: number }) {
    let logs = this.logs;

    if (timeRange) {
      logs = logs.filter(log =>
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byResource = logs.reduce((acc, log) => {
      acc[log.resource] = (acc[log.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byUser = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: logs.length,
      successful: logs.filter(l => l.success).length,
      failed: logs.filter(l => !l.success).length,
      byAction,
      byResource,
      byUser,
      topUsers: Object.entries(byUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    };
  }
}

/**
 * 创建权限系统
 */
export function createPermissionSystem(): {
  permissions: PermissionManager;
  audit: AuditLogger;
} {
  const permissions = new PermissionManager();
  const audit = new AuditLogger();

  // 连接审计和权限系统
  permissions.on('role:assigned', (event) => {
    audit.log({
      userId: event.grantedBy,
      action: 'assign_role',
      resource: ResourceType.ROLE,
      resourceId: event.roleId,
      success: true,
      metadata: { targetUser: event.userId },
    });
  });

  return { permissions, audit };
}
