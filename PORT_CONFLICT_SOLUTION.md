# 端口冲突解决方案

## 常见端口冲突问题

### 问题1：MySQL 3306端口冲突

运行 `deploy.sh` 时出现以下错误：

```
Error response from daemon: driver failed programming external connectivity on endpoint it-ticket-mysql: 
failed to bind host port for 0.0.0.0:3306: address already in use
```

**原因**：宿主机的3306端口已经被MySQL服务占用。

### 问题2：Nginx 80端口冲突

运行 `deploy.sh` 时出现以下错误：

```
Error response from daemon: driver failed programming external connectivity on endpoint it-ticket-nginx: 
failed to bind host port for 0.0.0.0:80: address already in use
```

**原因**：宿主机的80端口已经被其他Web服务（如Nginx、Apache）占用。

---

## 快速修复（推荐）

使用自动修复脚本一键解决所有端口冲突：

```bash
chmod +x quick-fix.sh
sudo ./quick-fix.sh
```

脚本会自动：
1. 停止并删除所有Docker容器
2. 清理Docker资源
3. 重启Docker服务
4. 提供详细的部署指导

---

## 解决方案一：使用宿主机MySQL（推荐）

如果宿主机已经有MySQL服务，建议直接使用宿主机的MySQL，不需要在Docker中再启动MySQL容器。

### 步骤1：在宿主机MySQL中创建数据库

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE it_ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户并授权（允许从Docker容器访问）
CREATE USER 'ticket_user'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON it_ticket_system.* TO 'ticket_user'@'%';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

### 步骤2：配置MySQL允许远程连接

编辑MySQL配置文件（通常是 `/etc/mysql/mysql.conf.d/mysqld.cnf` 或 `/etc/my.cnf`）：

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

找到 `bind-address` 行，修改为：

```ini
bind-address = 0.0.0.0
```

重启MySQL服务：

```bash
sudo systemctl restart mysql
```

### 步骤3：使用不包含MySQL的Docker Compose配置

```bash
# 停止并删除旧容器
docker-compose down

# 使用新的配置文件
cp docker-compose-no-db.yml docker-compose.yml

# 或者直接使用指定的配置文件
docker-compose -f docker-compose-no-db.yml up -d
```

### 步骤4：配置环境变量

复制环境变量模板：

```bash
cp .env.host-mysql .env
```

编辑 `.env` 文件：

```bash
nano .env
```

修改以下配置：

```bash
# 数据库配置
DB_HOST=host.docker.internal  # Docker容器访问宿主机的特殊地址
DB_PORT=3306
DB_USER=ticket_user
DB_PASSWORD=your_strong_password  # 修改为实际密码
DB_NAME=it_ticket_system

# JWT密钥（必须修改）
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
```

### 步骤5：启动服务

```bash
docker-compose up -d
```

### 步骤6：查看日志

```bash
docker-compose logs -f app
```

---

## 解决方案二：修改Docker MySQL端口映射

如果想继续使用Docker中的MySQL，可以修改端口映射。

### 步骤1：停止旧容器

```bash
docker-compose down
```

### 步骤2：修改docker-compose.yml

已经自动修改了 `docker-compose.yml` 文件，将MySQL端口映射改为 `3307:3306`。

这意味着：
- Docker容器内部MySQL仍然使用3306端口
- 宿主机通过3307端口访问Docker中的MySQL
- 应用容器通过内部网络访问MySQL，不受影响

### 步骤3：重新启动服务

```bash
docker-compose up -d
```

### 步骤4：验证

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试MySQL连接（从宿主机）
mysql -h 127.0.0.1 -P 3307 -u ticket_user -p
```

---

## 解决方案三：停止宿主机MySQL服务

如果宿主机的MySQL服务不是必需的，可以停止它。

### 临时停止

```bash
sudo systemctl stop mysql
```

### 永久禁用

```bash
sudo systemctl disable mysql
sudo systemctl stop mysql
```

### 重新启动Docker服务

```bash
docker-compose up -d
```

---

## 解决方案四：解决 Nginx 80 端口冲突

如果宿主机的80端口被占用，有以下几种解决方案：

### 方案4.1：不使用 Nginx 容器（最简单）

直接访问应用的8000端口，不需要Nginx反向代理。

**步骤**：

1. 已经自动注释掉了 `docker-compose.yml` 和 `docker-compose-no-db.yml` 中的 Nginx 服务

2. 重新启动服务：
```bash
docker-compose down
docker-compose up -d
```

3. 访问应用：
```bash
http://localhost:8000
```

### 方案4.2：修改 Nginx 端口映射

将Nginx映射到其他端口（如8080）。

**步骤**：

1. 编辑 `docker-compose.yml`：
```bash
nano docker-compose.yml
```

2. 修改Nginx端口配置：
```yaml
nginx:
  image: nginx:alpine
  container_name: it-ticket-nginx
  ports:
    - "8080:80"  # 改为8080端口
    - "8443:443"  # HTTPS也改为8443
```

3. 重新启动：
```bash
docker-compose down
docker-compose up -d
```

4. 访问应用：
```bash
http://localhost:8080
```

### 方案4.3：停止宿主机的Web服务

如果宿主机的Nginx/Apache不是必需的，可以停止它。

**查看占用80端口的进程**：
```bash
sudo lsof -i :80
# 或
sudo netstat -tulpn | grep :80
```

**停止Nginx**：
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx  # 禁止开机自启
```

**停止Apache**：
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### 方案4.4：使用宿主机的 Nginx

如果宿主机已有Nginx，可以配置它作为反向代理。

**步骤**：

1. 不启动Docker中的Nginx：
```bash
# 使用已注释Nginx的配置
docker-compose up -d
```

2. 配置宿主机Nginx：
```bash
sudo nano /etc/nginx/sites-available/it-ticket-system
```

3. 添加配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

4. 启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/it-ticket-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 推荐方案对比（更新）

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 不使用Nginx | - 最简单<br>- 无端口冲突 | - 需要记住8000端口 | 开发测试、内网环境 |
| 修改Nginx端口 | - 保留Nginx功能<br>- 避免冲突 | - 需要记住新端口 | 需要Nginx但80端口被占用 |
| 停止宿主机Web服务 | - 使用标准80端口 | - 可能影响其他应用 | 专用服务器 |
| 使用宿主机Nginx | - 统一管理<br>- 标准80端口 | - 配置稍复杂 | 生产环境、多应用共存 |

---

## 常见问题

### Q1: Docker容器无法连接宿主机MySQL

**原因**: MySQL没有允许来自Docker网络的连接。

**解决**:
1. 检查MySQL用户权限：`SELECT host, user FROM mysql.user;`
2. 确保有 `'ticket_user'@'%'` 或 `'ticket_user'@'172.%'`
3. 检查防火墙规则
4. 检查MySQL配置中的 `bind-address`

### Q2: 提示 "host.docker.internal" 无法解析

**原因**: 某些Linux系统不支持 `host.docker.internal`。

**解决**: 在 `.env` 文件中将 `DB_HOST` 改为宿主机的实际IP地址：

```bash
# 查看宿主机IP
ip addr show docker0

# 修改.env
DB_HOST=172.17.0.1  # 或实际的IP地址
```

### Q3: 数据库连接超时

**原因**: 防火墙阻止了连接。

**解决**:

```bash
# 允许Docker网络访问MySQL
sudo ufw allow from 172.17.0.0/16 to any port 3306

# 或者允许所有本地连接
sudo ufw allow from 127.0.0.1 to any port 3306
```

---

## 验证部署

部署完成后，验证系统是否正常运行：

```bash
# 1. 检查容器状态
docker-compose ps

# 2. 检查应用日志
docker-compose logs -f app

# 3. 测试API
curl http://localhost:8000/api/roles

# 4. 访问Web界面
# 打开浏览器访问: http://localhost:8000
```

---

## 需要帮助？

如果遇到其他问题，请查看：
- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署文档
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 部署检查清单
- Docker日志：`docker-compose logs -f`
- 应用日志：`docker exec -it it-ticket-system tail -f /var/log/app.log`

---

**建议**: 生产环境推荐使用方案一（使用宿主机MySQL），开发测试环境可以使用方案二（修改端口映射）。
