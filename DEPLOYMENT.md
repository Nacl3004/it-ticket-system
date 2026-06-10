# IT运维工单系统 - 部署指南

## 目录
- [系统要求](#系统要求)
- [部署前准备](#部署前准备)
- [配置修改](#配置修改)
- [部署方式](#部署方式)
- [环境变量配置](#环境变量配置)
- [数据库配置](#数据库配置)
- [安全建议](#安全建议)
- [常见问题](#常见问题)

---

## 系统要求

### 服务器要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+ 或 CentOS 7+)
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **磁盘**: 20GB以上
- **网络**: 公网IP或域名

### 软件要求
- **Python**: 3.9+
- **MySQL**: 8.0+
- **Docker**: 20.10+ (如果使用Docker部署)
- **Nginx**: 1.18+ (如果需要反向代理)

---

## 部署前准备

### 1. 下载源代码
```bash
# 从GitHub或其他代码托管平台下载源代码
git clone <your-repository-url>
cd it-ticket-system
```

### 2. 准备MySQL数据库

#### 方式一：使用现有数据库
如果您已有MySQL数据库，请记录以下信息：
- 数据库地址 (host)
- 端口 (port)
- 数据库名 (database)
- 用户名 (username)
- 密码 (password)

#### 方式二：创建新数据库
```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE it_ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER 'ticket_user'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON it_ticket_system.* TO 'ticket_user'@'%';
FLUSH PRIVILEGES;
```

### 3. 初始化数据库表结构

系统会在首次启动时自动创建所需的表结构，包括：
- users (用户表)
- roles (角色表)
- tickets (工单表)
- ticket_categories (工单分类表)
- ticket_logs (工单日志表)
- notifications (通知表)
- category_it_mapping (分类与IT人员映射表)
- webhook_configs (消息推送配置表)

---

## 配置修改

### 1. 环境变量配置

**重要**: 系统使用环境变量来管理配置，**不要将敏感信息硬编码在代码中**。

创建 `.env` 文件（生产环境）：
```bash
# 数据库配置
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT密钥（必须修改为随机字符串）
SECRET_KEY=your_very_long_random_secret_key_here_at_least_32_characters

# 应用配置
APP_ENV=production
APP_DEBUG=false
```

**生成安全的SECRET_KEY**:
```bash
# 使用Python生成随机密钥
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. 修改代码中的硬编码配置

#### 删除测试文件
以下文件仅用于开发测试，部署前应删除：
```bash
rm -f test_password.py
rm -f verify_password.py
rm -f test_bcrypt.py
rm -f migrate_db.py
rm -f migrate_custom_forms.py
```

#### 检查main.py中的数据库配置
确保 `main.py` 中的数据库配置使用环境变量：
```python
# 正确的配置方式
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "it_ticket_system"),
    "charset": "utf8mb4"
}

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
```

### 3. 修改前端配置

#### 删除开发环境的特殊配置
如果代码中有针对内网环境的配置（如 `ts:auth` 认证接口），需要删除或修改：

在所有HTML文件中，删除或注释掉内网认证相关代码：
```javascript
// 删除或注释这类代码
// const response = await fetch('/ts:auth/tauth/info.ashx');
```

#### 修改WebSocket连接地址
在 `dashboard.js` 中，确保WebSocket使用相对路径或正确的域名：
```javascript
// 使用相对路径（推荐）
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws/${token}`;

// 或使用完整域名
// const wsUrl = `wss://your-domain.com/ws/${token}`;
```

---

## 部署方式

### 方式一：Docker部署（推荐）

#### 1. 修改Dockerfile（如需要）
当前的Dockerfile已经配置好，无需修改：
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. 构建Docker镜像
```bash
docker build -t it-ticket-system:latest .
```

#### 3. 运行Docker容器
```bash
docker run -d \
  --name it-ticket-system \
  -p 8000:8000 \
  -e DB_HOST=your_database_host \
  -e DB_PORT=3306 \
  -e DB_USER=your_database_user \
  -e DB_PASSWORD=your_database_password \
  -e DB_NAME=your_database_name \
  -e SECRET_KEY=your_secret_key \
  --restart unless-stopped \
  it-ticket-system:latest
```

#### 4. 使用Docker Compose（推荐）
创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: it-ticket-system
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - SECRET_KEY=${SECRET_KEY}
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: mysql:8.0
    container_name: it-ticket-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

启动服务：
```bash
docker-compose up -d
```

### 方式二：直接部署

#### 1. 安装Python依赖
```bash
pip3 install -r requirements.txt
```

#### 2. 设置环境变量
```bash
export DB_HOST=your_database_host
export DB_PORT=3306
export DB_USER=your_database_user
export DB_PASSWORD=your_database_password
export DB_NAME=your_database_name
export SECRET_KEY=your_secret_key
```

#### 3. 启动应用
```bash
# 开发模式
uvicorn main:app --host 0.0.0.0 --port 8000

# 生产模式（使用gunicorn）
pip3 install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 4. 使用systemd管理服务
创建 `/etc/systemd/system/it-ticket-system.service`:
```ini
[Unit]
Description=IT Ticket System
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/it-ticket-system
Environment="DB_HOST=your_database_host"
Environment="DB_PORT=3306"
Environment="DB_USER=your_database_user"
Environment="DB_PASSWORD=your_database_password"
Environment="DB_NAME=your_database_name"
Environment="SECRET_KEY=your_secret_key"
ExecStart=/usr/local/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable it-ticket-system
sudo systemctl start it-ticket-system
sudo systemctl status it-ticket-system
```

### 方式三：使用Nginx反向代理

#### 1. 安装Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### 2. 配置Nginx
创建 `/etc/nginx/sites-available/it-ticket-system`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS（推荐）
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志配置
    access_log /var/log/nginx/it-ticket-access.log;
    error_log /var/log/nginx/it-ticket-error.log;

    # 客户端上传大小限制
    client_max_body_size 10M;

    # 代理到FastAPI应用
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket支持
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # 静态文件缓存
    location /static {
        proxy_pass http://127.0.0.1:8000;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 3. 启用配置并重启Nginx
```bash
sudo ln -s /etc/nginx/sites-available/it-ticket-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. 配置SSL证书（使用Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| DB_HOST | 数据库地址 | 127.0.0.1 或 your-db-host.com |
| DB_PORT | 数据库端口 | 3306 |
| DB_USER | 数据库用户名 | ticket_user |
| DB_PASSWORD | 数据库密码 | your_strong_password |
| DB_NAME | 数据库名称 | it_ticket_system |
| SECRET_KEY | JWT密钥 | 至少32位随机字符串 |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| APP_ENV | 应用环境 | production |
| APP_DEBUG | 调试模式 | false |
| CORS_ORIGINS | 允许的跨域源 | * |

---

## 数据库配置

### 1. 数据库连接池配置
如果需要优化数据库连接，可以在代码中添加连接池配置：
```python
import pymysql.cursors
from dbutils.pooled_db import PooledDB

pool = PooledDB(
    creator=pymysql,
    maxconnections=10,
    mincached=2,
    maxcached=5,
    blocking=True,
    **DB_CONFIG
)
```

### 2. 数据库备份
定期备份数据库（建议每天备份）：
```bash
# 创建备份脚本 /root/backup_db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
mkdir -p $BACKUP_DIR

mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

添加到crontab：
```bash
crontab -e
# 每天凌晨2点执行备份
0 2 * * * /root/backup_db.sh
```

---

## 安全建议

### 1. 修改默认管理员密码
首次部署后，立即登录系统修改默认管理员密码：
- 默认用户名: admin
- 默认密码: admin123

### 2. 使用强密码策略
- SECRET_KEY: 至少32位随机字符串
- 数据库密码: 至少16位，包含大小写字母、数字、特殊字符
- 管理员密码: 至少12位，包含大小写字母、数字、特殊字符

### 3. 配置防火墙
```bash
# 只开放必要的端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 4. 限制数据库访问
- 数据库只允许应用服务器IP访问
- 不要将数据库暴露在公网

### 5. 启用HTTPS
- 使用Let's Encrypt免费SSL证书
- 强制HTTPS访问
- 配置HSTS头

### 6. 定期更新
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新Python依赖
pip3 install --upgrade -r requirements.txt
```

### 7. 日志监控
配置日志收集和监控：
```python
# 在main.py中添加日志配置
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/it-ticket-system/app.log'),
        logging.StreamHandler()
    ]
)
```

---

## 常见问题

### 1. 数据库连接失败
**问题**: `pymysql.err.OperationalError: (2003, "Can't connect to MySQL server")`

**解决方案**:
- 检查数据库地址、端口是否正确
- 检查数据库用户名、密码是否正确
- 检查防火墙是否允许数据库端口
- 检查MySQL是否允许远程连接

### 2. WebSocket连接失败
**问题**: WebSocket连接无法建立

**解决方案**:
- 检查Nginx配置是否支持WebSocket
- 检查防火墙是否允许WebSocket连接
- 确保使用wss://（HTTPS环境）或ws://（HTTP环境）

### 3. 静态文件404
**问题**: 静态文件无法访问

**解决方案**:
- 检查static目录是否存在
- 检查main.py中的app.mount配置
- 检查文件权限

### 4. 跨域问题
**问题**: 前端请求被CORS策略阻止

**解决方案**:
在main.py中配置CORS：
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. 性能优化
**问题**: 系统响应慢

**解决方案**:
- 增加gunicorn worker数量
- 配置数据库连接池
- 添加Redis缓存
- 优化数据库查询
- 使用CDN加速静态资源

---

## 部署检查清单

部署前请确认以下事项：

- [ ] 已修改SECRET_KEY为随机字符串
- [ ] 已配置正确的数据库连接信息
- [ ] 已删除测试文件和开发配置
- [ ] 已修改默认管理员密码
- [ ] 已配置HTTPS和SSL证书
- [ ] 已配置防火墙规则
- [ ] 已设置数据库自动备份
- [ ] 已配置日志收集
- [ ] 已测试WebSocket连接
- [ ] 已测试所有核心功能
- [ ] 已配置监控和告警

---

## 技术支持

如有问题，请参考：
- 项目README.md
- FastAPI官方文档: https://fastapi.tiangolo.com/
- Nginx官方文档: https://nginx.org/en/docs/

---

## 更新日志

### v1.0.0 (2026-01-09)
- 初始版本发布
- 支持Docker部署
- 支持Nginx反向代理
- 完整的部署文档

---

**祝您部署顺利！**
