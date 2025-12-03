# 🎯 从这里开始

> 新用户快速上手指南 - 5分钟了解审计数智析项目

## 👋 欢迎！

欢迎来到**审计数智析(SHENJI)**项目！这是一个基于节点图的智能审计工作流平台。

## 📖 你应该先看什么？

### 如果你是新用户...
1. 阅读本文了解项目概况  
2. 查看 [README.md](README.md) 了解核心功能
3. 查看 [ROADMAP.md](ROADMAP.md) 了解项目规划

### 如果你是开发者...
1. 阅读 [DEVELOPMENT.md](DEVELOPMENT.md) 开发指南
2. 按照开发指南搭建环境
3. 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何贡献

### 如果你想了解团队分工...
查看 [docs/guides/02_RACI责任矩阵.md](docs/guides/02_RACI责任矩阵.md)

---

## 🚀 快速开始（3步）

### 1. 克隆项目
```bash
git clone https://github.com/zy6666688/SHENJI.git
cd SHENJI
```

### 2. 安装依赖
```bash
npm install
cd packages/backend && npm install
```

### 3. 启动开发环境
```bash
# Windows
.\scripts\start-dev.ps1

# Mac/Linux
chmod +x ./scripts/start-dev.sh
./scripts/start-dev.sh
```

访问 http://localhost:8080 查看H5版本 ✅

---

## 📚 项目核心概念

### 什么是节点图？
类似ComfyUI，通过拖拽节点构建审计工作流：
- **输入节点**: Excel数据导入
- **处理节点**: 数据分析、匹配、计算
- **输出节点**: 生成底稿、导出报告

### 核心功能
- 📊 可视化工作流编辑器
- 🤖 AI智能辅助分析
- 📱 H5 + 小程序双端支持
- ⚡ 高性能并行执行

---

## 📂 项目结构一览

```
SHENJI/
├── src/                   # 前端 (uni-app)
├── packages/
│   └── backend/          # 后端 (NestJS)
├── docs/                 # 文档
│   ├── guides/          # 使用指南
│   ├── technical/       # 技术文档
│   └── archive/         # 历史文档
└── scripts/             # 工具脚本
```

---

## 🎯 当前状态

**版本**: v1.1.0-alpha  
**开发阶段**: Week 1-3 核心节点开发  
**完成度**: 15%

### ✅ 已完成
- 项目基础架构
- API优化（统一格式、错误处理）
- 审计节点基类
- 固定资产盘点节点（1/8）

### 🚧 进行中
- 剩余7个核心审计节点开发

### ⏳ 待开始  
- 工作流执行引擎
- 前端可视化编辑器
- AI智能分析集成

---

## 💡 接下来做什么？

### 对于用户
1. 等待MVP版本发布（预计Week 8）
2. 关注项目进展
3. 提供反馈和建议

### 对于开发者

#### 🔥 立即可以做的
1. **熟悉代码库**
   ```bash
   # 阅读核心代码
   packages/backend/src/utils/ResponseFormatter.ts
   packages/backend/src/nodes/BaseNode.ts
   packages/backend/src/nodes/FixedAssetInventoryNode.ts
   ```

2. **运行测试**
   ```bash
   cd packages/backend
   npm test
   ```

3. **了解待开发节点**
   查看 [ROADMAP.md](ROADMAP.md) 中的节点清单

#### 📋 可以认领的任务
- 应收账款函证节点（3天）
- 银行询证节点（3天）
- 存货监盘节点（2天）
- 收入截止性测试节点（2天）
- 关联方交易核查节点（3天）
- 期后事项核查节点（2天）
- 持续经营评估节点（3天）

**如何认领？**
1. 在GitHub Issues中找到对应任务
2. 评论表示想要认领
3. 等待分配后开始开发

---

## 📖 重要文档

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目介绍 |
| [ROADMAP.md](ROADMAP.md) | 项目规划和功能清单 ⭐ |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 开发指南和技术架构 ⭐ |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新记录 |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | 已知问题 |

### 详细文档
- **使用指南**: [docs/guides/](docs/guides/)
  - 从0到落地完整指南.md - 8周开发计划 ⭐⭐⭐
  - 项目实施计划总览.md - 详细WBS分解
  
- **技术文档**: [docs/technical/](docs/technical/)
  - AI服务配置说明.md
  - 审计业务循环节点设计.md
  - API问题清单与优化方案.md

---

## 🤝 如何贡献？

### 贡献方式
1. **代码贡献**: 开发新功能、修复Bug
2. **文档贡献**: 完善文档、翻译
3. **测试贡献**: 编写测试、报告Bug
4. **需求贡献**: 提出新想法、反馈建议

### 贡献流程
1. Fork项目
2. 创建功能分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -m 'feat: add your feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 创建Pull Request

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🆘 遇到问题？

### 常见问题
查看 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

### 技术问题
查看 [DEVELOPMENT.md](DEVELOPMENT.md) 中的"常见问题"章节

### 需要帮助？
- **GitHub Issues**: https://github.com/zy6666688/SHENJI/issues
- **讨论区**: https://github.com/zy6666688/SHENJI/discussions

---

## 🎉 开始你的旅程！

选择一个你感兴趣的方向：

- **想要使用**: 等待MVP发布，关注项目进展
- **想要开发**: 阅读 [DEVELOPMENT.md](DEVELOPMENT.md) 并搭建环境
- **想要贡献**: 查看 [ROADMAP.md](ROADMAP.md) 认领任务
- **想要了解**: 阅读 [docs/guides/](docs/guides/) 中的详细文档

**Have Fun! 🚀**

---

**最后更新**: 2025-12-03
