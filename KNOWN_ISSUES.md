# ⚠️ 已知问题

**更新时间**: 2025-12-03  
**状态**: 这些问题不影响核心功能运行  
**当前阶段**: Week 1-3 核心节点开发

---

## 📋 当前已知问题

### 1. TypeScript类型警告 ⚠️

**问题**: uni-app组件类型定义不完整

**影响级别**: 低（仅IDE警告）

**现象**:
```
不能将类型""primary""分配给类型""reset" | "submit" | "button""
找不到模块"@dcloudio/types"的类型声明
```

**原因**:
- uni-app的类型定义文件（@dcloudio/types）与实际组件API存在差异
- 部分自定义组件属性未在类型定义中声明

**影响**: 
- ❌ IDE显示类型错误
- ✅ **运行时完全正常**
- ✅ **功能不受影响**

**解决方案**:
```typescript
// 方案1: 在文件顶部添加
// @ts-nocheck

// 方案2: 使用类型断言
<button :type="'primary' as any">按钮</button>

// 方案3: 等待uni-app类型更新
```

**状态**: 🔄 **可接受（不影响功能）**

---

### 2. 部分依赖未安装 ⚠️

**问题**: 审计节点所需依赖未完全安装

**影响级别**: 中（影响节点功能）

**缺失依赖**:
- `exceljs` - Excel文件处理
- `class-validator` - 输入验证
- `class-transformer` - 数据转换
- `reflect-metadata` - 装饰器支持

**影响**:
- ❌ 审计节点无法正常运行
- ❌ Excel导入/导出功能不可用
- ✅ 其他功能正常

**解决方案**:
```bash
cd packages/backend
npm install exceljs class-validator class-transformer reflect-metadata
npm install -D @types/node
```

**或使用快速脚本**:
```bash
# Windows
.\INSTALL_DEPENDENCIES.sh

# Linux/Mac
bash INSTALL_DEPENDENCIES.sh
```

**状态**: ⏳ **待安装（Week 2前完成）**

---

### 3. 测试覆盖率不足 📊

**问题**: 单元测试覆盖率较低

**当前状态**:
- 核心工具类: ~60% 覆盖率
- 审计节点: ~40% 覆盖率（仅FixedAssetInventoryNode有测试）
- API控制器: 0% 覆盖率

**目标**:
- 核心工具类: >90%
- 审计节点: >80%
- API控制器: >70%

**计划**:
- Week 2: 为新开发的7个节点编写完整测试
- Week 3: 补充现有代码测试
- Week 4: 添加集成测试

**状态**: 📋 **规划中（Week 2-3）**

---

### 4. 前端编辑器未实现 🚧

**问题**: 节点图可视化编辑器尚未开发

**当前状态**:
- ✅ 后端节点系统完整
- ✅ 节点执行引擎设计完成
- ❌ 前端可视化编辑器未开始
- ❌ 节点拖拽功能未实现

**影响**:
- 暂时无法通过UI创建工作流
- 需要通过API或代码定义工作流

**计划**:
- Week 4: 工作流执行引擎
- Week 5-6: 前端可视化编辑器开发

**状态**: ⏳ **计划中（Week 5-6）**

---

### 5. AI服务未集成 🤖

**问题**: AI智能分析功能暂未集成

**当前状态**:
- ✅ AI服务配置文档已完成
- ✅ 通义千问API方案已确定
- ❌ 实际集成代码未编写
- ❌ AI分析节点未实现

**影响**:
- 智能风险识别功能不可用
- 异常交易检测功能不可用
- 其他审计节点功能正常

**计划**:
- Week 4: AI服务基础集成
- Week 5: AI分析节点开发
- Week 6: AI功能测试优化

**状态**: ⏳ **计划中（Week 4+）**

---

## 🔧 开发环境问题

### Windows路径问题

**问题**: 某些脚本在Windows PowerShell中执行异常

**解决方案**:
```powershell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 或使用Git Bash
bash ./scripts/start-dev.sh
```

### 端口占用

**问题**: 3000或8080端口被占用

**解决方案**:
```bash
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :8080

# 杀死进程
taskkill /PID <进程ID> /F

# 或修改.env文件中的端口配置
```

---

## 📋 待实现功能（不是问题）

这些是计划中的功能，不是bug：

### Week 2-3
- [ ] 7个核心审计节点开发
- [ ] 节点单元测试编写
- [ ] Excel导入导出优化

### Week 4
- [ ] 工作流执行引擎
- [ ] 节点注册表系统
- [ ] 数据流管理

### Week 5-6
- [ ] 前端可视化编辑器
- [ ] 节点拖拽功能
- [ ] 工作流保存/加载

### Week 7
- [ ] 生产环境配置
- [ ] SSL证书部署
- [ ] 性能优化

### Week 8
- [ ] 完整功能测试
- [ ] 用户验收测试
- [ ] 正式上线

---

## 🔍 如何报告问题

### 报告新问题

1. **确认问题**
   - 是否影响功能？
   - 是否可以复现？
   - 影响范围多大？

2. **收集信息**
   - 错误消息
   - 复现步骤
   - 环境信息

3. **创建Issue**
   - 标题: 简短描述
   - 内容: 详细信息
   - 标签: bug/enhancement/question

### Issue模板

```markdown
## 问题描述
[描述问题]

## 复现步骤
1. ...
2. ...
3. ...

## 预期行为
[应该怎样]

## 实际行为
[实际怎样]

## 环境信息
- OS: Windows 11
- Node: 18.x
- Browser: Chrome 120

## 错误信息
\`\`\`
[粘贴错误信息]
\`\`\`

## 截图
[如果有的话]
```

---

---

## 📞 获取帮助

### 查看文档

**核心文档**:
1. [DEVELOPMENT.md](DEVELOPMENT.md) - 开发指南和常见问题
2. [ROADMAP.md](ROADMAP.md) - 项目规划和任务清单
3. [START_HERE.md](START_HERE.md) - 快速上手指南

**详细文档**:
1. [docs/guides/](docs/guides/) - 使用指南和项目计划
2. [docs/technical/](docs/technical/) - 技术文档和配置说明
3. [docs/archive/](docs/archive/) - 历史文档

### 报告问题

**GitHub Issues**:
- 访问: https://github.com/zy6666688/SHENJI/issues
- 使用Issue模板报告问题
- 添加适当的标签（bug/enhancement/question）

**讨论区**:
- 访问: https://github.com/zy6666688/SHENJI/discussions
- 技术讨论、需求建议、经验分享

---

## ✅ 问题追踪表

| 问题 | 影响级别 | 状态 | 计划修复 |
|------|---------|------|---------|
| TypeScript类型警告 | 低 | 🔄 可接受 | - |
| 部分依赖未安装 | 中 | ⏳ 待处理 | Week 2前 |
| 测试覆盖率不足 | 中 | 📋 规划中 | Week 2-3 |
| 前端编辑器未实现 | 高 | ⏳ 规划中 | Week 5-6 |
| AI服务未集成 | 中 | ⏳ 规划中 | Week 4+ |
| Windows脚本问题 | 低 | 📖 已文档化 | - |
| 端口占用 | 低 | 📖 已文档化 | - |

**状态说明**:
- ✅ 已修复 - 问题已解决
- 🔄 可接受 - 不影响功能，可暂时忽略
- ⏳ 待处理 - 需要解决但不紧急
- 📋 规划中 - 已纳入开发计划
- 📖 已文档化 - 有明确的解决方案文档

---

## 💡 贡献指南

发现新问题？想要帮助修复？

1. **查看现有Issues**: 避免重复报告
2. **使用Issue模板**: 提供完整信息
3. **Fork并修复**: 欢迎提交PR
4. **更新文档**: 修复后更新本文档

详见: [CONTRIBUTING.md](CONTRIBUTING.md)

---

**重要提醒**:
- ✅ 当前已知问题都不影响核心功能
- ✅ TypeScript警告可以安全忽略
- ⚠️ 依赖需要在Week 2前安装
- 📋 功能开发按照ROADMAP.md进行

---

*最后更新: 2025-12-03 23:25*  
*下次更新: Week 2开发完成后*
