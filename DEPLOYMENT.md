# 审计数智析 - 部署指南

## 📋 目录

- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [部署步骤](#部署步骤)
- [配置说明](#配置说明)
- [健康检查](#健康检查)
- [监控告警](#监控告警)
- [故障排查](#故障排查)
- [回滚方案](#回滚方案)

---

## 系统要求

### 最低配置
- **CPU**: 2核
- **内存**: 4GB
- **磁盘**: 20GB SSD
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Windows Server 2019+

### 推荐配置
- **CPU**: 4核+
- **内存**: 8GB+
- **磁盘**: 50GB+ SSD
- **操作系统**: Ubuntu 22.04 LTS

### 软件依赖
- **Node.js**: 18.x 或 20.x LTS
- **PostgreSQL**: 14.x+
- **Redis**: 6.x+
- **Nginx**: 1.20+ (生产环境)
- **PM2**: 5.x+ (进程管理)

---

## 环境准备

### 1. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 2. 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE audit_engine;
CREATE USER audit_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE audit_engine TO audit_user;
\q
```

### 3. 安装 Redis

```bash
# Ubuntu/Debian
sudo apt-get install -y redis-server

# 启动服务
sudo systemctl start redis
sudo systemctl enable redis

# 验证
redis-cli ping  # PONG
```

### 4. 安装 PM2

```bash
npm install -g pm2

# 配置开机自启
pm2 startup
```

---

## 部署步骤

### 1. 克隆代码

```bash
cd /opt
git clone https://github.com/zy6666688/SHENJI.git
cd SHENJI
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd packages/backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 配置环境变量

```bash
cd packages/backend

# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

**关键配置项**:
```env
# 数据库
DATABASE_URL="postgresql://audit_user:your_password@localhost:5432/audit_engine?schema=public"

# JWT
JWT_SECRET="生成一个强密钥"

# Session
SESSION_SECRET="生成一个强密钥"

# 工作流存储
WORKFLOW_STORAGE_DIR="/opt/SHENJI/data/workflows"
EXECUTION_STORAGE_DIR="/opt/SHENJI/data/executions"

# 生产环境
NODE_ENV="production"
```

**生成强密钥**:
```bash
# 生成 JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成 Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. 数据库迁移

```bash
cd packages/backend

# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate deploy

# (可选) 初始化种子数据
npx prisma db seed
```

### 5. 创建数据目录

```bash
# 创建存储目录
mkdir -p /opt/SHENJI/data/workflows
mkdir -p /opt/SHENJI/data/executions
mkdir -p /opt/SHENJI/uploads
mkdir -p /opt/SHENJI/logs

# 设置权限
chown -R $USER:$USER /opt/SHENJI/data
chown -R $USER:$USER /opt/SHENJI/uploads
chown -R $USER:$USER /opt/SHENJI/logs
```

### 6. 构建前端

```bash
cd packages/frontend
npm run build

# 构建产物在 dist/ 目录
```

### 7. 构建后端

```bash
cd packages/backend
npm run build

# 构建产物在 dist/ 目录
```

### 8. 启动服务

#### 使用 PM2 (推荐)

```bash
cd packages/backend

# 启动后端
pm2 start dist/index.js --name "audit-backend" \
  --instances 2 \
  --exec-mode cluster \
  --max-memory-restart 500M \
  --log /opt/SHENJI/logs/pm2-backend.log

# 保存配置
pm2 save

# 查看状态
pm2 status
pm2 logs audit-backend
```

#### 使用 systemd

创建服务文件 `/etc/systemd/system/audit-backend.service`:

```ini
[Unit]
Description=Audit Engine Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/opt/SHENJI/packages/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/SHENJI/logs/backend.log
StandardError=append:/opt/SHENJI/logs/backend-error.log

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl daemon-reload
sudo systemctl start audit-backend
sudo systemctl enable audit-backend
sudo systemctl status audit-backend
```

### 9. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/audit-engine`:

```nginx
# 后端API
upstream backend {
    server 127.0.0.1:3000;
    # 如果使用PM2多实例
    # server 127.0.0.1:3000;
    # server 127.0.0.1:3001;
}

# 主服务器
server {
    listen 80;
    server_name your-domain.com;

    # 日志
    access_log /var/log/nginx/audit-access.log;
    error_log /var/log/nginx/audit-error.log;

    # 前端静态文件
    location / {
        root /opt/SHENJI/packages/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 文件上传限制
    client_max_body_size 10M;
}
```

启用站点:
```bash
sudo ln -s /etc/nginx/sites-available/audit-engine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. SSL 配置 (使用 Let's Encrypt)

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 配置说明

### 工作流引擎配置

```env
# 存储路径
WORKFLOW_STORAGE_DIR="./data/workflows"
EXECUTION_STORAGE_DIR="./data/executions"

# 缓存配置
WORKFLOW_CACHE_ENABLED=true
WORKFLOW_MAX_CACHE_SIZE=100
EXECUTION_MAX_CACHE_SIZE=100

# 监控配置
MONITOR_METRICS_INTERVAL=5000
MONITOR_MAX_LOGS=1000
MONITOR_MAX_METRICS=100

# 清理策略
EXECUTION_CLEANUP_DAYS=30
AUTO_CLEANUP_ENABLED=true
AUTO_CLEANUP_INTERVAL=86400000

# 重试配置
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=10000
RETRY_BACKOFF_STRATEGY="exponential"
```

### 性能优化配置

```env
# Node.js
NODE_OPTIONS="--max-old-space-size=2048"

# PM2集群模式
PM2_INSTANCES=2  # CPU核心数

# 数据库连接池
DB_POOL_MIN=2
DB_POOL_MAX=10
```

---

## 健康检查

### 1. API健康检查

```bash
# 基础健康检查
curl http://localhost:3000/health

# 响应示例
{
  "status": "ok",
  "timestamp": 1704355200000,
  "uptime": 3600,
  "version": "1.0.0"
}
```

### 2. 数据库连接检查

```bash
curl http://localhost:3000/api/health/db

# 响应示例
{
  "status": "ok",
  "database": "connected",
  "latency": 5
}
```

### 3. Redis连接检查

```bash
curl http://localhost:3000/api/health/redis

# 响应示例
{
  "status": "ok",
  "redis": "connected",
  "latency": 2
}
```

### 4. 工作流引擎检查

```bash
# 检查工作流存储
curl http://localhost:3000/api/v2/workflows/stats

# 检查执行历史
curl http://localhost:3000/api/v2/executions/stats
```

### 5. 监控脚本

创建 `health-check.sh`:

```bash
#!/bin/bash

# 健康检查脚本
API_URL="http://localhost:3000"
SLACK_WEBHOOK="your-slack-webhook-url"

check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
    
    if [ "$response" != "200" ]; then
        echo "Health check failed with status: $response"
        
        # 发送告警
        curl -X POST $SLACK_WEBHOOK -H 'Content-Type: application/json' \
          -d "{\"text\":\"🚨 Audit Engine health check failed!\"}"
        
        return 1
    fi
    
    echo "Health check passed"
    return 0
}

check_health
```

设置定时任务:
```bash
# 编辑 crontab
crontab -e

# 每5分钟检查一次
*/5 * * * * /opt/SHENJI/scripts/health-check.sh >> /opt/SHENJI/logs/health-check.log 2>&1
```

---

## 监控告警

### 1. PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs audit-backend --lines 100

# 查看指标
pm2 describe audit-backend
```

### 2. 日志管理

```bash
# 日志轮转配置
cat > /etc/logrotate.d/audit-engine << EOF
/opt/SHENJI/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. 性能监控

使用 PM2 Plus (可选):
```bash
pm2 install pm2-server-monit
pm2 link <your-key> <your-secret>
```

### 4. 磁盘空间监控

```bash
# 创建监控脚本
cat > /opt/SHENJI/scripts/disk-check.sh << EOF
#!/bin/bash
THRESHOLD=80
USAGE=\$(df -h /opt/SHENJI | awk 'NR==2 {print \$5}' | sed 's/%//')

if [ \$USAGE -gt \$THRESHOLD ]; then
    echo "Disk usage is \${USAGE}%, exceeding threshold"
    # 发送告警
fi
EOF
```

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 检查端口占用
sudo netstat -nltp | grep 3000

# 检查日志
tail -f /opt/SHENJI/logs/backend-error.log

# 检查环境变量
cd packages/backend && npm run env:check
```

#### 2. 数据库连接失败

```bash
# 测试数据库连接
psql -h localhost -U audit_user -d audit_engine

# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### 3. Redis连接失败

```bash
# 测试 Redis 连接
redis-cli ping

# 检查 Redis 状态
sudo systemctl status redis

# 查看 Redis 日志
sudo tail -f /var/log/redis/redis-server.log
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h

# 查看进程内存
pm2 list
pm2 describe audit-backend

# 增加 swap (临时方案)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 5. 工作流执行失败

```bash
# 检查存储目录权限
ls -la /opt/SHENJI/data/workflows
ls -la /opt/SHENJI/data/executions

# 检查磁盘空间
df -h /opt/SHENJI

# 查看执行日志
curl http://localhost:3000/api/v2/executions?status=failed
```

---

## 回滚方案

### 1. 快速回滚

```bash
# 停止服务
pm2 stop audit-backend

# 切换到上一个版本
cd /opt/SHENJI
git checkout <previous-commit>

# 重新构建
cd packages/backend
npm run build

# 启动服务
pm2 restart audit-backend
```

### 2. 数据库回滚

```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到指定版本
npx prisma migrate resolve --rolled-back <migration-name>

# 重新应用
npx prisma migrate deploy
```

### 3. 备份恢复

```bash
# 恢复数据库
psql -U audit_user -d audit_engine < backup.sql

# 恢复文件数据
cp -r /backup/workflows/* /opt/SHENJI/data/workflows/
cp -r /backup/executions/* /opt/SHENJI/data/executions/
```

---

## 备份策略

### 1. 数据库备份

```bash
# 创建备份脚本
cat > /opt/SHENJI/scripts/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/database"
mkdir -p $BACKUP_DIR

pg_dump -U audit_user -h localhost audit_engine | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 保留最近7天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/SHENJI/scripts/backup-db.sh

# 设置定时任务（每天凌晨2点）
echo "0 2 * * * /opt/SHENJI/scripts/backup-db.sh" | crontab -
```

### 2. 文件备份

```bash
# 备份工作流和执行数据
tar -czf /backup/data_$(date +%Y%m%d).tar.gz \
  /opt/SHENJI/data/workflows \
  /opt/SHENJI/data/executions

# 保留最近30天的备份
find /backup -name "data_*.tar.gz" -mtime +30 -delete
```

---

## 性能优化建议

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_workflow_id ON executions(workflow_id);
CREATE INDEX idx_status ON executions(status);
CREATE INDEX idx_created_at ON executions(created_at);

-- 定期清理
DELETE FROM executions WHERE created_at < NOW() - INTERVAL '30 days';

-- 分析表
ANALYZE executions;
```

### 2. Redis缓存

```bash
# 配置 Redis 内存限制
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 3. Nginx优化

```nginx
# 启用 gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 连接优化
keepalive_timeout 65;
keepalive_requests 100;
```

---

## 安全加固

### 1. 防火墙配置

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 禁止直接访问后端端口
sudo ufw deny 3000/tcp
```

### 2. 数据库安全

```bash
# 修改 PostgreSQL 配置
sudo vim /etc/postgresql/14/main/pg_hba.conf

# 只允许本地连接
local   all             all                                     peer
host    audit_engine    audit_user    127.0.0.1/32            md5
```

### 3. 定期更新

```bash
# 系统更新
sudo apt update && sudo apt upgrade -y

# 依赖更新
npm audit
npm audit fix
```

---

## 联系方式

- **技术支持**: support@example.com
- **紧急热线**: +86 xxx-xxxx-xxxx
- **文档**: https://docs.example.com

---

**最后更新**: 2025年1月4日  
**版本**: 1.0.0  
**维护**: SHENJI Team
