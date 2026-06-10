# Docker 容器问题排查与解决方案

## 问题：容器无法停止

### 错误信息
```
Error response from daemon: cannot stop container: cf7a5026f428eb0181d7a036bba636bfd3ff05ec23e60ef70a7586e6a0d345c2: 
tried to kill container, but did not receive an exit event
```

### 原因分析
这个错误通常由以下原因引起：
1. 容器内的进程无法正常响应停止信号
2. Docker守护进程状态异常
3. 容器挂载的卷或网络资源被占用
4. 系统资源不足

---

## 解决方案

### 方案一：强制删除容器（推荐）

```bash
# 1. 查看所有容器（包括停止的）
docker ps -a

# 2. 强制删除问题容器
docker rm -f cf7a5026f428eb0181d7a036bba636bfd3ff05ec23e60ef70a7586e6a0d345c2

# 或者删除所有相关容器
docker rm -f it-ticket-system it-ticket-mysql it-ticket-nginx

# 3. 清理所有停止的容器
docker container prune -f

# 4. 重新启动服务
docker-compose up -d --build
```

### 方案二：重启Docker服务

```bash
# 1. 停止Docker服务
sudo systemctl stop docker

# 2. 等待几秒
sleep 5

# 3. 启动Docker服务
sudo systemctl start docker

# 4. 检查Docker状态
sudo systemctl status docker

# 5. 清理旧容器
docker rm -f $(docker ps -aq)

# 6. 重新部署
docker-compose up -d --build
```

### 方案三：完全清理Docker环境

**⚠️ 警告：此操作会删除所有Docker容器、镜像、卷和网络！**

```bash
# 1. 停止所有容器
docker stop $(docker ps -aq) 2>/dev/null || true

# 2. 强制删除所有容器
docker rm -f $(docker ps -aq) 2>/dev/null || true

# 3. 删除所有镜像
docker rmi -f $(docker images -q) 2>/dev/null || true

# 4. 删除所有卷
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# 5. 删除所有网络
docker network prune -f

# 6. 清理系统
docker system prune -a --volumes -f

# 7. 重启Docker
sudo systemctl restart docker

# 8. 重新部署
cd /path/to/it-ticket-system
docker-compose up -d --build
```

### 方案四：使用docker-compose强制清理

```bash
# 1. 进入项目目录
cd /path/to/it-ticket-system

# 2. 停止并删除所有容器、网络、卷
docker-compose down -v --remove-orphans

# 3. 如果还是失败，强制删除
docker-compose rm -f -s -v

# 4. 清理Docker缓存
docker builder prune -f

# 5. 重新构建并启动
docker-compose up -d --build --force-recreate
```

---

## 快速修复脚本

创建一个快速修复脚本 `fix-docker.sh`：

```bash
#!/bin/bash

echo "=========================================="
echo "Docker 容器问题修复脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}步骤1: 强制停止所有容器...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}步骤2: 强制删除所有容器...${NC}"
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}步骤3: 清理未使用的资源...${NC}"
docker system prune -f

echo -e "${YELLOW}步骤4: 重启Docker服务...${NC}"
sudo systemctl restart docker

echo -e "${YELLOW}步骤5: 等待Docker启动...${NC}"
sleep 5

echo -e "${GREEN}Docker环境已清理完成！${NC}"
echo ""
echo "现在可以重新运行部署脚本："
echo "  docker-compose up -d --build"
echo ""
```

使用方法：
```bash
chmod +x fix-docker.sh
sudo ./fix-docker.sh
```

---

## 针对当前问题的具体步骤

### 步骤1：强制删除问题容器

```bash
# 删除特定容器
docker rm -f cf7a5026f428

# 或删除所有IT工单系统相关容器
docker rm -f it-ticket-system it-ticket-mysql it-ticket-nginx
```

### 步骤2：清理Docker Compose资源

```bash
cd /path/to/it-ticket-system
docker-compose down -v --remove-orphans
```

### 步骤3：检查端口占用

```bash
# 检查8000端口
sudo lsof -i :8000
sudo netstat -tulpn | grep 8000

# 检查3306端口
sudo lsof -i :3306
sudo netstat -tulpn | grep 3306

# 如果有进程占用，杀掉进程
sudo kill -9 <PID>
```

### 步骤4：重新部署

```bash
# 使用修改后的配置（端口改为3307）
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

---

## 预防措施

### 1. 优雅停止容器

```bash
# 使用docker-compose停止（推荐）
docker-compose down

# 给容器足够的时间停止（30秒）
docker-compose down -t 30
```

### 2. 定期清理

```bash
# 每周清理一次未使用的资源
docker system prune -f

# 每月清理一次所有未使用的镜像
docker image prune -a -f
```

### 3. 监控容器状态

```bash
# 查看容器资源使用情况
docker stats

# 查看容器日志
docker-compose logs -f --tail=100
```

---

## 常见问题

### Q1: 容器一直处于"Removing"状态

**解决方案**：
```bash
# 重启Docker服务
sudo systemctl restart docker

# 强制删除
docker rm -f <container_id>
```

### Q2: 提示"device or resource busy"

**解决方案**：
```bash
# 查找占用的进程
sudo lsof | grep docker

# 卸载挂载点
sudo umount /var/lib/docker/volumes/<volume_name>

# 重启Docker
sudo systemctl restart docker
```

### Q3: Docker守护进程无响应

**解决方案**：
```bash
# 完全重启Docker
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl start docker.socket
sudo systemctl start docker
```

---

## 使用宿主机MySQL的建议

由于您的宿主机已经有MySQL服务，建议使用方案一（使用宿主机MySQL）：

### 1. 使用不包含MySQL的配置

```bash
# 使用专门的配置文件
docker-compose -f docker-compose-no-db.yml down -v
docker-compose -f docker-compose-no-db.yml up -d --build
```

### 2. 配置环境变量

```bash
# 复制配置模板
cp .env.host-mysql .env

# 编辑配置
nano .env
```

修改为：
```bash
DB_HOST=host.docker.internal
DB_PORT=3306
DB_USER=ticket_user
DB_PASSWORD=your_password
DB_NAME=it_ticket_system
SECRET_KEY=your_secret_key
```

### 3. 在宿主机MySQL中创建数据库

```bash
mysql -u root -p << EOF
CREATE DATABASE it_ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticket_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON it_ticket_system.* TO 'ticket_user'@'%';
FLUSH PRIVILEGES;
EOF
```

---

## 验证部署

部署完成后，验证系统是否正常：

```bash
# 1. 检查容器状态
docker-compose ps

# 2. 检查容器日志
docker-compose logs -f app

# 3. 测试数据库连接
docker exec -it it-ticket-system python3 -c "
import pymysql
import os
conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT')),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME')
)
print('数据库连接成功！')
conn.close()
"

# 4. 测试Web访问
curl http://localhost:8000/api/roles
```

---

## 需要帮助？

如果问题仍然存在，请提供以下信息：

```bash
# 收集诊断信息
echo "=== Docker版本 ===" > docker-debug.log
docker --version >> docker-debug.log
docker-compose --version >> docker-debug.log

echo -e "\n=== Docker状态 ===" >> docker-debug.log
sudo systemctl status docker >> docker-debug.log

echo -e "\n=== 容器列表 ===" >> docker-debug.log
docker ps -a >> docker-debug.log

echo -e "\n=== Docker日志 ===" >> docker-debug.log
sudo journalctl -u docker -n 50 >> docker-debug.log

echo -e "\n=== 系统资源 ===" >> docker-debug.log
df -h >> docker-debug.log
free -h >> docker-debug.log

cat docker-debug.log
```

---

**建议**：对于生产环境，强烈建议使用宿主机MySQL（方案一），这样可以避免Docker容器管理MySQL带来的复杂性。
