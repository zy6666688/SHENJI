# 🔧 API问题清单与生产级优化方案

**优先级**: 🔴 P0 - 最紧急  
**目标**: 达到生产级别，可上线使用  
**创建日期**: 2025-12-03

---

## 🚨 当前API问题清单

### P0 - 阻断性问题（必须立即修复）

#### 问题1: API响应格式不统一 🔴
```
现象：
- 有的返回 { code, data, message }
- 有的返回 { success, result, error }
- 有的直接返回数据

影响：
- 前端无法统一处理
- 错误处理不一致
- 开发效率低

修复方案：
统一为标准格式：
{
  "code": 200,           // 状态码
  "success": true,       // 成功标志
  "data": {},            // 数据
  "message": "操作成功", // 消息
  "timestamp": 1234567890 // 时间戳
}

工作量：4h
负责人：BE1
截止时间：Week 1 Day 2
```

#### 问题2: 缺少统一错误处理 🔴
```
现象：
- 错误信息不友好（直接返回异常堆栈）
- 没有错误码规范
- 前端无法区分错误类型

影响：
- 用户体验差
- 调试困难
- 无法做错误监控

修复方案：
1. 创建错误码枚举
2. 实现全局异常处理中间件
3. 统一错误响应格式

错误码示例：
- 1001: 参数错误
- 2001: 认证失败
- 3001: 资源不存在
- 4001: 权限不足
- 5001: 服务器错误

工作量：6h
负责人：BE1
截止时间：Week 1 Day 2
```

#### 问题3: 缺少请求验证 🔴
```
现象：
- 输入参数未验证
- SQL注入风险
- XSS攻击风险

影响：
- 安全性严重不足
- 数据可能被破坏
- 无法上生产环境

修复方案：
1. 使用 class-validator 验证所有输入
2. 实现参数白名单过滤
3. SQL使用参数化查询（Prisma已支持）
4. 输出进行HTML转义

工作量：8h
负责人：BE1 + SEC
截止时间：Week 1 Day 3
```

#### 问题4: 没有限流保护 🔴
```
现象：
- API可被无限调用
- 容易被攻击
- 服务器资源耗尽

影响：
- 可能导致服务崩溃
- 成本失控
- 影响其他用户

修复方案：
实现多级限流：
- 全局限流：100 req/min
- 用户限流：30 req/min
- IP限流：50 req/min
- 敏感接口：10 req/min

使用 express-rate-limit 或 Redis

工作量：4h
负责人：BE2
截止时间：Week 1 Day 3
```

---

### P1 - 高优先级问题（Week 1完成）

#### 问题5: 缺少API文档 🟠
```
现象：
- 前端不知道接口怎么调
- 参数格式靠猜
- 频繁沟通

影响：
- 开发效率低
- 容易出错
- 新人上手难

修复方案：
使用 Swagger/OpenAPI 生成文档

工作量：6h
负责人：BE1
截止时间：Week 1 Day 5
```

#### 问题6: 没有日志记录 🟠
```
现象：
- 出错后无法追踪
- 不知道谁调用了什么
- 审计要求不满足

影响：
- 调试困难
- 安全问题
- 合规问题

修复方案：
1. 记录所有API调用
2. 记录关键操作（增删改）
3. 记录错误和异常
4. 日志分级（debug/info/warn/error）

工作量：4h
负责人：BE2
截止时间：Week 1 Day 4
```

#### 问题7: 性能问题 🟠
```
现象：
- N+1查询问题
- 没有缓存
- 大数据量慢

影响：
- 响应慢
- 数据库压力大
- 用户体验差

修复方案：
1. 优化数据库查询（使用 include）
2. 添加 Redis 缓存（热数据）
3. 实现分页（默认20条）
4. 添加索引

工作量：8h
负责人：BE1 + OPS
截止时间：Week 1 Day 5
```

---

### P2 - 中优先级（Week 2-3完成）

#### 问题8: 缺少API版本管理
```
工作量：2h
负责人：BE1
```

#### 问题9: 没有健康检查端点
```
工作量：1h
负责人：OPS
```

#### 问题10: 缺少请求追踪
```
工作量：4h
负责人：BE2
```

---

## 🎯 生产级优化方案

### Week 1：基础优化（必须完成）

```
Day 1-2: 统一响应格式 + 错误处理
├─ 创建 ResponseFormatter 工具类
├─ 创建 ErrorCode 枚举
├─ 实现全局异常处理中间件
└─ 重构所有现有API

Day 3: 安全加固
├─ 添加输入验证装饰器
├─ 实现限流中间件
├─ SQL注入防护检查
└─ XSS过滤实现

Day 4-5: 性能优化 + 文档
├─ 数据库查询优化
├─ Redis缓存集成
├─ 生成Swagger文档
└─ 日志系统完善
```

---

## 📄 实施详细方案

### 1. 统一响应格式

**创建文件**: `packages/backend/src/utils/ResponseFormatter.ts`

```typescript
/**
 * 统一API响应格式
 */
export class ResponseFormatter {
  /**
   * 成功响应
   */
  static success<T>(data: T, message: string = '操作成功') {
    return {
      code: 200,
      success: true,
      data,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * 失败响应
   */
  static error(code: number, message: string, error?: any) {
    return {
      code,
      success: false,
      data: null,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ) {
    return {
      code: 200,
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      message: '查询成功',
      timestamp: Date.now(),
    };
  }
}
```

### 2. 错误码枚举

**创建文件**: `packages/backend/src/constants/ErrorCode.ts`

```typescript
/**
 * 错误码定义
 */
export enum ErrorCode {
  // 1xxx - 客户端错误
  INVALID_PARAMS = 1001,        // 参数错误
  MISSING_PARAMS = 1002,        // 缺少必需参数
  INVALID_FORMAT = 1003,        // 格式错误

  // 2xxx - 认证/授权错误
  UNAUTHORIZED = 2001,          // 未登录
  TOKEN_EXPIRED = 2002,         // Token过期
  INVALID_TOKEN = 2003,         // Token无效
  FORBIDDEN = 2004,             // 权限不足

  // 3xxx - 资源错误
  NOT_FOUND = 3001,             // 资源不存在
  ALREADY_EXISTS = 3002,        // 资源已存在
  CONFLICT = 3003,              // 冲突

  // 4xxx - 业务错误
  BUSINESS_ERROR = 4001,        // 通用业务错误
  WORKFLOW_ERROR = 4002,        // 工作流错误
  AI_SERVICE_ERROR = 4003,      // AI服务错误
  
  // 审计业务错误 (新增)
  ASSET_NOT_FOUND = 4101,       // 资产不存在
  ACCOUNT_MISMATCH = 4102,      // 账目不匹配
  SALARY_ERROR = 4103,          // 工资核对错误
  CASH_COUNT_ERROR = 4104,      // 现金盘点错误
  INVENTORY_ERROR = 4105,       // 库存错误

  // 5xxx - 服务器错误
  INTERNAL_ERROR = 5001,        // 内部错误
  DATABASE_ERROR = 5002,        // 数据库错误
  EXTERNAL_SERVICE_ERROR = 5003,// 外部服务错误
  TIMEOUT = 5004,               // 超时

  // 6xxx - 限流错误
  RATE_LIMIT_EXCEEDED = 6001,   // 超过限流
  QUOTA_EXCEEDED = 6002,        // 超过配额
}

export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_PARAMS]: '参数错误',
  [ErrorCode.MISSING_PARAMS]: '缺少必需参数',
  [ErrorCode.INVALID_FORMAT]: '格式错误',
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期',
  [ErrorCode.INVALID_TOKEN]: '无效的登录凭证',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.CONFLICT]: '操作冲突',
  [ErrorCode.BUSINESS_ERROR]: '业务处理失败',
  [ErrorCode.WORKFLOW_ERROR]: '工作流执行失败',
  [ErrorCode.AI_SERVICE_ERROR]: 'AI服务暂时不可用',
  [ErrorCode.ASSET_NOT_FOUND]: '资产不存在',
  [ErrorCode.ACCOUNT_MISMATCH]: '账目不匹配',
  [ErrorCode.SALARY_ERROR]: '工资数据有误',
  [ErrorCode.CASH_COUNT_ERROR]: '现金盘点异常',
  [ErrorCode.INVENTORY_ERROR]: '库存数据异常',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务不可用',
  [ErrorCode.TIMEOUT]: '请求超时',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁',
  [ErrorCode.QUOTA_EXCEEDED]: '超过使用配额',
};
```

### 3. 全局异常处理

**创建文件**: `packages/backend/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { ErrorCode, ErrorMessage } from '../constants/ErrorCode';

/**
 * 业务异常类
 */
export class BusinessError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: any
  ) {
    super(message || ErrorMessage[code]);
    this.name = 'BusinessError';
  }
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error]', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // 业务异常
  if (err instanceof BusinessError) {
    return res.status(400).json(
      ResponseFormatter.error(err.code, err.message, err.details)
    );
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      ResponseFormatter.error(ErrorCode.INVALID_TOKEN, '无效的登录凭证')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      ResponseFormatter.error(ErrorCode.TOKEN_EXPIRED, '登录已过期')
    );
  }

  // 数据库错误
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(500).json(
      ResponseFormatter.error(ErrorCode.DATABASE_ERROR, '数据库操作失败')
    );
  }

  // 默认错误
  return res.status(500).json(
    ResponseFormatter.error(
      ErrorCode.INTERNAL_ERROR,
      '服务器内部错误',
      process.env.NODE_ENV === 'development' ? err.stack : undefined
    )
  );
}
```

### 4. 输入验证装饰器

**创建文件**: `packages/backend/src/decorators/validate.ts`

```typescript
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BusinessError } from '../middleware/errorHandler';
import { ErrorCode } from '../constants/ErrorCode';

/**
 * 验证请求体装饰器
 */
export function ValidateBody(dtoClass: any) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0];
      const body = req.body;

      // 转换为DTO类实例
      const dtoInstance = plainToClass(dtoClass, body);

      // 验证
      const errors: ValidationError[] = await validate(dtoInstance);

      if (errors.length > 0) {
        const messages = errors.map((error) =>
          Object.values(error.constraints || {}).join(', ')
        );
        throw new BusinessError(
          ErrorCode.INVALID_PARAMS,
          messages.join('; '),
          errors
        );
      }

      // 替换原始body为验证后的DTO
      req.body = dtoInstance;

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

### 5. 限流中间件

**创建文件**: `packages/backend/src/middleware/rateLimit.ts`

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { ErrorCode } from '../constants/ErrorCode';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

/**
 * 全局限流
 */
export const globalRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:',
  }),
  windowMs: 60 * 1000, // 1分钟
  max: 100, // 最多100次请求
  message: ResponseFormatter.error(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    '请求过于频繁，请稍后再试'
  ),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 用户限流
 */
export const userRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:user:',
  }),
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: ResponseFormatter.error(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    '您的请求过于频繁，请稍后再试'
  ),
});

/**
 * 敏感接口限流（登录、注册等）
 */
export const sensitiveRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:sensitive:',
  }),
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  message: ResponseFormatter.error(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    '操作过于频繁，请5分钟后再试'
  ),
});
```

---

## ✅ Week 1 执行清单

```
Day 1 (Monday):
□ 创建 ResponseFormatter.ts
□ 创建 ErrorCode.ts
□ 创建 errorHandler.ts
□ 测试基础响应格式

Day 2 (Tuesday):
□ 重构所有API使用统一格式
□ 添加全局错误处理中间件
□ 测试错误处理

Day 3 (Wednesday):
□ 创建 validate.ts 装饰器
□ 创建 rateLimit.ts 中间件
□ 为所有API添加验证
□ 为所有API添加限流

Day 4 (Thursday):
□ 优化数据库查询
□ 集成Redis缓存
□ 添加日志记录

Day 5 (Friday):
□ 生成Swagger文档
□ 性能测试
□ Week 1验收
```

---

## 📊 验收标准

### API质量标准

```
✓ 响应格式100%统一
✓ 所有输入已验证
✓ 所有接口有限流
✓ 错误处理完整
✓ 日志记录完整
✓ API文档完整
✓ 性能测试通过（P95 < 500ms）
✓ 安全扫描通过（无高危漏洞）
```

---

## 💰 预计工作量

```
P0问题修复: 22h (必须Week 1完成)
P1问题修复: 18h (建议Week 1完成)
P2问题修复: 7h (Week 2-3完成)

总计: 47h ≈ 6人天
```

---

## 📞 负责人

- BE1: API重构、文档
- BE2: 限流、日志、性能
- SEC: 安全验证、扫描
- QA: 测试验证

---

**创建时间**: 2025-12-03  
**优先级**: 🔴 最高  
**目标**: Week 1达到生产级别
