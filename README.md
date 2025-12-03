# 审计数智析 (SHENJI)

> 🚀 基于节点图的智能审计工作流平台

[![Version](https://img.shields.io/badge/version-1.1.0--alpha-blue)](https://github.com/zy6666688/SHENJI)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0-brightgreen)](https://nodejs.org/)

**审计数智析** 是一个创新的审计工作流平台，通过可视化节点编程方式，让审计人员能够灵活构建和执行审计流程。

## ✨ 核心特性

- **📊 可视化工作流** - ComfyUI风格的节点图编辑器，拖拽即可构建审计流程
- **🤖 AI智能分析** - 集成AI服务，智能辅助审计决策和数据分析
- **⚡ 高性能执行** - 拓扑排序 + 并行调度，支持大规模数据处理
- **🔌 插件化架构** - 灵活的节点系统，轻松扩展自定义审计功能
- **📱 多端支持** - H5 + 微信小程序，随时随地开展审计工作
- **👥 实时协作** - 多用户同时编辑工作流，团队高效协作
- **📈 专业节点库** - 预置13+个专业审计节点，覆盖常见审计场景

## 🚀 快速开始

**新用户？** 查看 [START_HERE.md](START_HERE.md) 快速上手指南

**开发者？** 查看 [DEVELOPMENT.md](DEVELOPMENT.md) 开发指南

**了解路线图？** 查看 [ROADMAP.md](ROADMAP.md) 项目规划

### 安装依赖
```bash
npm install
cd packages/backend && npm install
```

### 启动开发环境

**方式1：一键启动（推荐）**
```bash
# Windows
.\scripts\start-dev.ps1

# Mac/Linux
chmod +x ./scripts/start-dev.sh
./scripts/start-dev.sh
```

**方式2：手动启动**
```bash
# 终端1 - 启动后端
cd packages/backend
npm run dev

# 终端2 - 启动H5前端
npm run dev:h5

# 终端3 - 启动微信小程序（可选）
npm run dev:mp-weixin
```

访问 http://localhost:8080 查看H5版本

## 📚 文档

- **[开发指南](DEVELOPMENT.md)** - 详细的开发文档和技术架构
- **[项目路线图](ROADMAP.md)** - 功能规划和开发计划
- **[贡献指南](CONTRIBUTING.md)** - 如何参与项目开发
- **[更新日志](CHANGELOG.md)** - 版本更新记录
- **[已知问题](KNOWN_ISSUES.md)** - 当前已知问题列表

## 📂 项目结构

```
shenji/
├── src/                    # 前端源代码 (uni-app)
├── packages/
│   ├── backend/           # 后端服务 (NestJS)
│   ├── shared/            # 共享类型和工具
│   └── collaboration/     # 协作服务
├── docs/                  # 详细文档
│   ├── guides/           # 使用指南
│   ├── technical/        # 技术文档
│   └── archive/          # 历史文档
├── scripts/              # 工具脚本
└── tests/                # 测试文件
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🔗 链接

- **GitHub**: https://github.com/zy6666688/SHENJI
- **Issues**: https://github.com/zy6666688/SHENJI/issues
- **文档**: https://github.com/zy6666688/SHENJI/tree/main/docs

---

**当前版本**: v1.1.0-alpha | **开发状态**: 活跃开发中
