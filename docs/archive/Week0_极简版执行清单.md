# ⚡ Week 0 极简版执行清单

**核心原则**: 功能优先，配置靠后  
**目标**: 开发环境就绪，技术选型完成  
**时间**: 5个工作日

---

## 🎯 本周目标（极简版）

```
✅ 团队到位
✅ AI服务申请（通义千问，免费）
✅ 本地开发环境搭建
✅ 工作流编辑器POC
✅ 项目启动会

不做的事:
❌ 不买服务器
❌ 不申请SSL证书
❌ 不配置HTTPS
❌ 不部署到云端
❌ 不配置域名

理由: Week 0-6全力开发功能，Week 7再配置生产环境
```

---

## 📅 5天计划

### Day 1 (今天) - 团队组建

```
09:00-10:00  确认AI工程师到位
10:00-10:30  申请通义千问API（免费，10分钟）⭐
10:30-11:00  创建项目群
11:00-12:00  Git分支策略

13:00-14:00  Code Review流程
14:00-15:00  项目管理工具配置
15:00-17:00  开发环境检查

完成标志:
✓ AI工程师2人到位
✓ 通义千问API已申请
✓ 项目群已创建
✓ Git分支策略确定
```

---

### Day 2 (Tuesday) - 环境准备

```
09:00-10:00  确认所有团队成员到位
10:00-12:00  本地开发环境搭建（所有人）⭐⭐⭐
             - 安装PostgreSQL 14
             - 安装Redis 6
             - 克隆项目
             - 安装依赖
             - 初始化数据库

13:00-15:00  开发环境统一验证
15:00-17:00  开发规范确认（ESLint/Prettier）

完成标志:
✓ 所有人本地环境可启动项目
✓ 可访问 http://localhost:3000
✓ 数据库连接正常
✓ Redis连接正常
```

---

### Day 3 (Wednesday) - 技术调研

```
09:00-12:00  工作流编辑器调研⭐⭐⭐
             - VueFlow研究
             - AntV X6研究
             - 对比分析

13:00-17:00  工作流编辑器POC开发⭐⭐⭐
             - 基础拖拽
             - 节点连接
             - 简单示例

完成标志:
✓ 两个方案都已调研
✓ POC可以拖拽节点
✓ POC可以连接节点
✓ 有初步技术方案
```

---

### Day 4 (Thursday) - 技术选型

```
09:00-10:00  POC演示
10:00-11:00  技术选型决策⭐⭐⭐
             - VueFlow vs X6
             - 最终决定

11:00-12:00  项目启动会准备

13:00-17:00  准备项目启动会材料
             - PPT
             - 技术方案
             - 任务分配

完成标志:
✓ 工作流编辑器技术方案已确定
✓ 项目启动会材料已准备
```

---

### Day 5 (Friday) - 启动会

```
09:00-11:00  项目启动会⭐⭐⭐
             - 项目背景和目标
             - 技术架构
             - 任务分配
             - Q&A

11:00-12:00  Week 0总结

13:00-15:00  Week 1任务分配
15:00-17:00  Week 1准备工作

完成标志:
✓ 项目启动会已召开
✓ 所有人理解目标和任务
✓ Week 1任务已分配
✓ Week 0验收通过
```

---

## ✅ Week 0 验收标准（极简版）

```
必须达成（100%）:
✓ AI工程师2人已到位
✓ 通义千问API已申请
✓ 所有人本地环境可运行项目
✓ 工作流编辑器技术方案已确定
✓ 项目启动会已召开

建议达成（80%）:
✓ Git分支策略确定
✓ Code Review流程确定
✓ 项目管理工具已配置
✓ 开发规范已确认

不需要达成:
✗ 服务器（Week 7再买）
✗ SSL证书（Week 7再申请）
✗ HTTPS配置（Week 7再配）
✗ 域名备案（Week 7再说）
✗ 云服务配置（Week 7再做）
```

---

## 💻 本地开发环境搭建（详细步骤）

### Windows环境

```powershell
# 1. 安装PostgreSQL 14
下载: https://www.postgresql.org/download/windows/
安装: 一路Next，记住密码

# 2. 安装Redis
下载: https://github.com/tporadowski/redis/releases
解压: C:\Redis
启动: redis-server.exe

# 3. 安装Node.js 18+
下载: https://nodejs.org/
安装: 一路Next

# 4. 克隆项目
git clone [项目地址]
cd 审计数智析

# 5. 安装依赖
npm install
cd packages\backend
npm install

# 6. 配置数据库
copy .env.example .env
# 编辑.env，修改数据库密码

# 7. 初始化数据库
npm run db:migrate

# 8. 启动项目
npm run dev

# 9. 访问
浏览器打开: http://localhost:3000
```

### macOS环境

```bash
# 1. 安装Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装PostgreSQL和Redis
brew install postgresql@14
brew install redis

# 3. 启动服务
brew services start postgresql@14
brew services start redis

# 4. 克隆项目
git clone [项目地址]
cd 审计数智析

# 5. 安装依赖
npm install
cd packages/backend
npm install

# 6. 配置数据库
cp .env.example .env
# 编辑.env

# 7. 初始化数据库
npm run db:migrate

# 8. 启动项目
npm run dev

# 9. 访问
浏览器打开: http://localhost:3000
```

### Ubuntu环境

```bash
# 1. 更新系统
sudo apt update

# 2. 安装PostgreSQL和Redis
sudo apt install postgresql-14 redis-server

# 3. 启动服务
sudo systemctl start postgresql
sudo systemctl start redis-server

# 4. 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# 5. 克隆项目
git clone [项目地址]
cd 审计数智析

# 6. 安装依赖
npm install
cd packages/backend
npm install

# 7. 配置数据库
cp .env.example .env
# 编辑.env

# 8. 初始化数据库
npm run db:migrate

# 9. 启动项目
npm run dev

# 10. 访问
浏览器打开: http://localhost:3000
```

---

## 🐛 常见问题

### Q1: PostgreSQL连接失败？

```
检查:
1. PostgreSQL是否已启动？
   Windows: 任务管理器 → 服务
   macOS/Linux: ps aux | grep postgres

2. 密码是否正确？
   编辑 .env 文件，检查 DATABASE_URL

3. 端口是否冲突？
   默认5432，可以改为5433
```

### Q2: Redis连接失败？

```
检查:
1. Redis是否已启动？
   Windows: 任务管理器
   macOS/Linux: ps aux | grep redis

2. 端口是否正确？
   默认6379

3. 密码是否正确？
   编辑 .env 文件，检查 REDIS_PASSWORD
```

### Q3: npm install失败？

```
解决:
1. 切换淘宝镜像
   npm config set registry https://registry.npmmirror.com

2. 清除缓存
   npm cache clean --force

3. 删除node_modules重试
   rm -rf node_modules package-lock.json
   npm install
```

### Q4: 项目启动失败？

```
检查:
1. 端口是否被占用？
   netstat -ano | findstr 3000  # Windows
   lsof -i :3000                # macOS/Linux

2. 数据库是否初始化？
   cd packages/backend
   npm run db:migrate

3. 环境变量是否配置？
   检查 .env 文件是否存在
```

---

## 📊 本周工作量

```
原Week 0计划: 136h
极简Week 0:   80h
节省:         56h (41%)

工作量分布:
Day 1: 16h (团队组建)
Day 2: 20h (环境搭建)
Day 3: 20h (技术调研)
Day 4: 12h (技术选型)
Day 5: 12h (启动会)

总计: 80h ≈ 10人天
```

---

## 🎯 关键里程碑

```
M0: 项目启动 (Week 0 End)
验收标准:
✓ 团队就位
✓ 开发环境就绪
✓ 技术选型完成
✓ Week 1任务分配
```

---

## 📞 需要帮助？

**环境问题**: 询问运维工程师  
**技术问题**: 询问技术负责人  
**流程问题**: 询问项目经理

---

## 🎊 完成Week 0后

```
恭喜！Week 0极简版完成！

下周（Week 1）开始：
✅ API优化（达到生产级）
✅ 编辑器基础功能开发
✅ 第一个可用的工作流

Week 7再做：
⏸ 服务器购买
⏸ SSL证书申请
⏸ HTTPS配置
⏸ 云服务配置

专注功能开发，Week 7一次性配置生产环境！
```

---

**文档版本**: 极简版 v1.0  
**创建日期**: 2025-12-03  
**核心理念**: 功能优先，配置靠后  
**适用对象**: 所有团队成员

**现在开始Week 0 Day 1吧！** 🚀
