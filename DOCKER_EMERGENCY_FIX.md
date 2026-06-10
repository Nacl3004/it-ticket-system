# Docker 完全无法访问 - 紧急修复指南

## 问题描述

Docker 完全无法访问，所有命令都无法执行，包括：
- `docker ps` 无响应
- `docker-compose` 无法使用
- 容器无法停止或删除
- Docker 服务异常

## 🚨 紧急修复方案

### 方案一：使用紧急修复脚本（推荐）

我们提供了一个全自动的紧急修复脚本，可以彻底重置 Docker 环境。

```bash
# 1. 赋予执行权限
chmod +x emergency-fix.sh

# 2. 运行修复脚本
sudo ./emergency-fix.sh
```

**脚本会自动执行以下操作：**
1. ✅ 强制停止所有 Docker 容器
2. ✅ 删除所有 Docker 容器
3. ✅ 删除所有 Docker 镜像
4. ✅ 删除所有 Docker 卷
5. ✅ 删除所有 Docker 网络
6. ✅ 清理 Docker 系统
7. ✅ 重启 Docker 服务
8. ✅ 验证 Docker 状态
9. ✅ 如果失败，自动重新安装 Docker

### 方案二：手动修复步骤

如果自动脚本无法运行，请按以下步骤手动修复：

#### 步骤1：停止 Docker 服务

```bash
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

#### 步骤2：清理 Docker 进程

```bash
# 查找所有 Docker 相关进程
ps aux | grep docker

# 强制结束所有 Docker 进程
sudo pkill -9 docker
sudo pkill -9 dockerd
sudo pkill -9 containerd
sudo pkill -9 containerd-shim
```

#### 步骤3：清理 Docker 文件

```bash
# 删除 Docker 数据目录（⚠️ 会删除所有容器和镜像）
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# 删除 Docker 配置
sudo rm -rf /etc/docker
sudo rm -rf ~/.docker
```

#### 步骤4：重启 Docker 服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动 Docker
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 检查状态
sudo systemctl status docker
```

#### 步骤5：验证 Docker

```bash
# 查看 Docker 版本
docker --version

# 查看 Docker 信息
docker info

# 运行测试容器
docker run hello-world
```

### 方案三：完全重新安装 Docker

如果以上方法都无效，建议完全重新安装 Docker。

#### Ubuntu/Debian 系统

```bash
# 1. 卸载旧版本
sudo apt-get remove -y docker docker-engine docker.io containerd runc
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# 2. 更新包索引
sudo apt-get update

# 3. 安装依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 4. 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 5. 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 6. 安装 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 7. 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 8. 验证安装
docker --version
docker run hello-world
```

#### CentOS/RHEL 系统

```bash
# 1. 卸载旧版本
sudo yum remove -y docker \
    docker-client \
    docker-client-latest \
    docker-common \
    docker-latest \
    docker-latest-logrotate \
    docker-logrotate \
    docker-engine

sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# 2. 安装依赖
sudo yum install -y yum-utils

# 3. 设置仓库
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo

# 4. 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 5. 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 6. 验证安装
docker --version
docker run hello-world
```

## 🔍 常见问题诊断

### 问题1：Docker 服务无法启动

**检查日志：**
```bash
sudo journalctl -u docker.service -n 50 --no-pager
```

**常见原因：**
- 端口被占用
- 配置文件错误
- 磁盘空间不足
- 权限问题

**解决方法：**
```bash
# 检查磁盘空间
df -h

# 检查 Docker 配置
sudo dockerd --validate

# 重置 Docker 配置
sudo rm /etc/docker/daemon.json
sudo systemctl restart docker
```

### 问题2：权限被拒绝

**错误信息：**
```
Got permission denied while trying to connect to the Docker daemon socket
```

**解决方法：**
```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 或者使用 sudo
sudo docker ps
```

### 问题3：Docker 守护进程未运行

**检查服务状态：**
```bash
sudo systemctl status docker
```

**启动服务：**
```bash
sudo systemctl start docker
```

**如果启动失败，查看详细错误：**
```bash
sudo dockerd --debug
```

### 问题4：容器无法删除

**强制删除容器：**
```bash
# 停止所有容器
docker stop $(docker ps -aq)

# 强制删除所有容器
docker rm -f $(docker ps -aq)

# 如果还是无法删除，重启 Docker
sudo systemctl restart docker
```

### 问题5：磁盘空间不足

**清理 Docker 资源：**
```bash
# 清理未使用的容器、网络、镜像
docker system prune -a

# 清理卷
docker volume prune

# 查看磁盘使用情况
docker system df
```

## 📊 Docker 健康检查

修复完成后，运行以下命令检查 Docker 健康状态：

```bash
# 1. 检查 Docker 版本
docker --version
docker-compose --version

# 2. 检查 Docker 信息
docker info

# 3. 检查运行的容器
docker ps

# 4. 检查所有容器
docker ps -a

# 5. 检查镜像
docker images

# 6. 检查卷
docker volume ls

# 7. 检查网络
docker network ls

# 8. 检查系统资源使用
docker system df
```

## 🔄 重新部署应用

Docker 修复完成后，重新部署 IT 运维工单系统：

### 使用宿主机 MySQL（推荐）

```bash
# 1. 配置环境变量
cp .env.host-mysql .env
nano .env  # 修改数据库密码和 SECRET_KEY

# 2. 启动应用
docker-compose -f docker-compose-no-db.yml up -d --build

# 3. 查看日志
docker-compose logs -f

# 4. 访问应用
# http://localhost:8000
```

### 使用 Docker MySQL

```bash
# 1. 配置环境变量
cp .env.example .env
nano .env  # 修改 SECRET_KEY 和数据库密码

# 2. 启动应用
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f

# 4. 访问应用
# http://localhost:8000
```

## ⚠️ 重要提示

1. **数据备份**：修复前如果有重要数据，请先备份
2. **完全重置**：紧急修复脚本会删除所有容器、镜像和卷
3. **重新构建**：修复后需要重新构建镜像和启动容器
4. **数据库初始化**：数据库数据会丢失，需要重新初始化
5. **耐心等待**：首次启动可能需要几分钟时间

## 📞 获取帮助

如果问题仍未解决，请提供以下信息：

```bash
# 收集诊断信息
echo "=== 系统信息 ===" > docker-debug.log
uname -a >> docker-debug.log
echo "" >> docker-debug.log

echo "=== Docker 版本 ===" >> docker-debug.log
docker --version >> docker-debug.log 2>&1
echo "" >> docker-debug.log

echo "=== Docker 服务状态 ===" >> docker-debug.log
systemctl status docker >> docker-debug.log 2>&1
echo "" >> docker-debug.log

echo "=== Docker 日志 ===" >> docker-debug.log
journalctl -u docker.service -n 100 --no-pager >> docker-debug.log 2>&1
echo "" >> docker-debug.log

echo "=== 磁盘空间 ===" >> docker-debug.log
df -h >> docker-debug.log
echo "" >> docker-debug.log

echo "诊断信息已保存到 docker-debug.log"
```

---

**祝您修复顺利！** 🎉
