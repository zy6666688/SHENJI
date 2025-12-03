# 🛠️ 开发指南

> 审计数智析开发文档 - 技术架构、开发规范和最佳实践

## 📋 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发环境搭建](#开发环境搭建)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [API文档](#api文档)

---

## 🎯 技术栈

### 前端技术栈
```
框架: uni-app (Vue 3 + TypeScript)
状态管理: Pinia
UI组件: uView-plus
可视化: ECharts
构建工具: Vite
```

### 后端技术栈
```
运行时: Node.js 18+
框架: NestJS (Express)
语言: TypeScript
数据库: PostgreSQL (主库) + Redis (缓存) + MongoDB (日志)
ORM: Prisma
对象存储: 阿里云OSS
AI服务: 通义千问API
```

### 开发工具
```
版本控制: Git + GitHub
包管理: npm
代码格式化: Prettier
代码检查: ESLint
类型检查: TypeScript
测试框架: Vitest (后端) / Jest (前端)
```

---

## 📂 项目结构

```
shenji/
├── src/                          # 前端源代码 (uni-app)
│   ├── pages/                    # 页面目录
│   │   ├── index/               # 首页
│   │   ├── project/             # 项目管理
│   │   ├── workflow/            # 工作流编辑
│   │   └── workpaper/           # 底稿查看
│   ├── components/              # 公共组件
│   │   ├── NodeCanvas.vue      # 节点画布
│   │   ├── NodePalette.vue     # 节点面板
│   │   └── PropertyPanel.vue   # 属性面板
│   ├── api/                     # API接口
│   ├── store/                   # Pinia状态管理
│   ├── utils/                   # 工具函数
│   ├── types/                   # TypeScript类型
│   └── static/                  # 静态资源
│
├── packages/
│   ├── backend/                 # 后端服务
│   │   ├── src/
│   │   │   ├── main.ts         # 入口文件
│   │   │   ├── constants/      # 常量定义
│   │   │   │   └── ErrorCode.ts
│   │   │   ├── middleware/     # 中间件
│   │   │   │   └── errorHandler.ts
│   │   │   ├── utils/          # 工具类
│   │   │   │   └── ResponseFormatter.ts
│   │   │   ├── nodes/          # 审计节点
│   │   │   │   ├── BaseNode.ts
│   │   │   │   └── FixedAssetInventoryNode.ts
│   │   │   ├── services/       # 业务服务
│   │   │   ├── controllers/    # 控制器
│   │   │   └── routes/         # 路由
│   │   ├── prisma/             # 数据库Schema
│   │   ├── tests/              # 测试文件
│   │   └── package.json
│   │
│   ├── shared/                  # 共享类型和工具
│   │   └── src/
│   │       └── types/
│   │           ├── node.ts     # 节点类型定义
│   │           └── graph.ts    # 图结构定义
│   │
│   └── collaboration/           # 协作服务 (Yjs)
│       └── src/
│           └── server.ts
│
├── docs/                        # 文档目录
│   ├── guides/                 # 使用指南
│   │   ├── 从0到落地完整指南.md
│   │   └── 项目实施计划总览.md
│   ├── technical/              # 技术文档
│   │   ├── AI服务配置说明.md
│   │   └── 审计业务循环节点设计.md
│   └── archive/                # 历史文档
│
├── scripts/                     # 工具脚本
│   ├── start-dev.ps1           # Windows启动脚本
│   └── start-dev.sh            # Linux/Mac启动脚本
│
├── tests/                       # 集成测试
│
├── README.md                    # 项目说明
├── ROADMAP.md                   # 项目路线图
├── DEVELOPMENT.md               # 本文件
├── CONTRIBUTING.md              # 贡献指南
├── CHANGELOG.md                 # 更新日志
├── package.json                 # 前端依赖
├── tsconfig.json                # TypeScript配置
├── vite.config.ts              # Vite配置
└── .gitignore
```

---

## 🚀 开发环境搭建

### 1. 环境要求

```bash
Node.js: >= 18.0.0
npm: >= 8.0.0
PostgreSQL: >= 14.0 (可选，开发环境可用SQLite)
Redis: >= 6.0 (可选)
```

### 2. 克隆项目

```bash
git clone https://github.com/zy6666688/SHENJI.git
cd SHENJI
```

### 3. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd packages/backend
npm install
cd ../..
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env

# 编辑配置文件
# 配置数据库连接、API密钥等
```

### 5. 数据库初始化

```bash
cd packages/backend

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# (可选) 填充测试数据
npx prisma db seed
```

### 6. 启动开发服务器

**方式1：一键启动**
```bash
# Windows
.\scripts\start-dev.ps1

# Mac/Linux
chmod +x ./scripts/start-dev.sh
./scripts/start-dev.sh
```

**方式2：手动启动**
```bash
# 终端1 - 后端服务
cd packages/backend
npm run dev
# 后端运行在 http://localhost:3000

# 终端2 - H5前端
npm run dev:h5
# 前端运行在 http://localhost:8080

# 终端3 - 微信小程序 (可选)
npm run dev:mp-weixin
# 使用微信开发者工具打开 dist/dev/mp-weixin
```

---

## 🔄 开发流程

### 分支策略

```
main          - 生产环境，只接受来自develop的PR
  ├── develop - 开发主分支
      ├── feature/* - 功能分支
      ├── bugfix/*  - bug修复分支
      └── hotfix/*  - 紧急修复分支
```

### 开发新功能

```bash
# 1. 从develop创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. 开发并提交
git add .
git commit -m "feat: your feature description"

# 3. 推送到远程
git push origin feature/your-feature-name

# 4. 在GitHub创建Pull Request到develop分支

# 5. 代码审查通过后合并
```

### 提交消息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具链相关

示例:
feat(nodes): 添加应收账款函证节点
fix(api): 修复响应格式错误
docs: 更新API文档
```

---

## 📝 代码规范

### TypeScript规范

```typescript
// ✅ 推荐：使用接口定义类型
interface AuditNode {
  id: string;
  type: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
}

// ✅ 推荐：使用明确的类型
function processNode(node: AuditNode): Promise<NodeResult> {
  // ...
}

// ❌ 避免：使用any类型
function processNode(node: any): any {
  // ...
}

// ✅ 推荐：使用枚举
enum NodeStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Error = 'error',
}

// ✅ 推荐：使用可选链和空值合并
const value = node?.config?.timeout ?? 30000;
```

### 命名规范

```typescript
// 类名：PascalCase
class FixedAssetInventoryNode extends BaseNode {}

// 接口：PascalCase，可选I前缀
interface NodeConfig {}
interface INodeExecutor {}

// 函数/方法：camelCase
function executeNode() {}
async function fetchData() {}

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 变量：camelCase
let nodeCount = 0;
const userId = '123';

// 私有属性：_camelCase
private _internalState: any;
```

### 文件命名规范

```
组件: PascalCase.vue (NodeCanvas.vue)
工具类: camelCase.ts (responseFormatter.ts)
节点类: PascalCase.ts (FixedAssetInventoryNode.ts)
类型定义: camelCase.ts (node.ts, graph.ts)
配置文件: kebab-case.ts (vite.config.ts)
```

### 注释规范

```typescript
/**
 * 固定资产盘点节点
 * 
 * 功能：
 * - 导入资产账面数据和实盘数据
 * - 自动匹配和差异分析
 * - 生成盘点差异表和审计底稿
 * 
 * @author AI Assistant
 * @date 2025-12-03
 */
export class FixedAssetInventoryNode extends BaseNode {
  /**
   * 执行节点逻辑
   * 
   * @param inputs - 输入数据
   * @returns 执行结果
   * @throws {BusinessError} 当输入数据格式不正确时
   */
  async execute(inputs: Record<string, any>): Promise<NodeOutput> {
    // 实现代码...
  }
}
```

---

## 🧪 测试指南

### 单元测试

```typescript
// packages/backend/src/nodes/__tests__/FixedAssetInventoryNode.test.ts
import { describe, it, expect } from 'vitest';
import { FixedAssetInventoryNode } from '../FixedAssetInventoryNode';

describe('FixedAssetInventoryNode', () => {
  it('should match assets correctly', () => {
    const node = new FixedAssetInventoryNode();
    const bookAssets = [
      { assetCode: 'A001', assetName: '电脑', quantity: 10 }
    ];
    const physicalAssets = [
      { assetCode: 'A001', assetName: '电脑', quantity: 9 }
    ];
    
    const result = node.matchAssets(bookAssets, physicalAssets);
    
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0].quantityDiff).toBe(-1);
  });
});
```

### 运行测试

```bash
# 后端测试
cd packages/backend
npm test                  # 运行所有测试
npm test -- --watch      # 监听模式
npm test -- --coverage   # 生成覆盖率报告

# 前端测试
npm run test:h5
```

### 测试覆盖率要求

- 核心业务逻辑: >= 80%
- 工具函数: >= 90%
- API控制器: >= 70%

---

## 📡 API文档

### API设计原则

1. **RESTful风格**
2. **统一响应格式**
3. **完整错误处理**
4. **版本控制**

### 统一响应格式

```typescript
// 成功响应
{
  "success": true,
  "code": "SUCCESS",
  "message": "操作成功",
  "data": { /* 业务数据 */ },
  "timestamp": 1701619200000
}

// 错误响应
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "输入数据验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ],
  "timestamp": 1701619200000
}
```

### API示例

```typescript
// packages/backend/src/controllers/NodeController.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { BusinessError, ErrorCode } from '../constants/ErrorCode';

@Controller('api/v1/nodes')
export class NodeController {
  @Post('execute')
  async executeNode(@Body() body: ExecuteNodeDto) {
    try {
      const result = await this.nodeService.execute(body);
      return ResponseFormatter.success(result, '节点执行成功');
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '节点执行失败',
        error
      );
    }
  }
}
```

---

## 🔧 常用开发技巧

### 调试后端

```typescript
// 使用VS Code调试
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/packages/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### 查看日志

```bash
# 后端日志
tail -f packages/backend/logs/app.log

# 前端日志（浏览器控制台）
# 打开 http://localhost:8080
# 按 F12 打开开发者工具
```

### 数据库调试

```bash
# Prisma Studio - 可视化数据库工具
cd packages/backend
npx prisma studio
# 访问 http://localhost:5555
```

---

## 📚 学习资源

### 官方文档
- [Vue 3](https://vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [uni-app](https://uniapp.dcloud.net.cn/)

### 推荐阅读
- [clean-code-typescript](https://github.com/labs42io/clean-code-typescript)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 🆘 常见问题

### Q: TypeScript报错怎么办？
A: 先运行 `npm install`，大部分类型错误会自动消失。查看 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

### Q: 端口被占用？
A: 修改 `.env` 中的端口配置，或关闭占用端口的程序

### Q: 数据库连接失败？
A: 检查 `packages/backend/.env` 中的 `DATABASE_URL` 配置

### Q: 如何添加新的审计节点？
A: 参考 `packages/backend/src/nodes/FixedAssetInventoryNode.ts` 实现，继承 `BaseNode` 类

---

## 📞 获取帮助

- **GitHub Issues**: https://github.com/zy6666688/SHENJI/issues
- **技术文档**: [docs/technical/](docs/technical/)
- **项目规划**: [docs/guides/](docs/guides/)

---

**最后更新**: 2025-12-03  
**维护者**: @zy6666688
