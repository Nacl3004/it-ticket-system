#!/bin/bash

# Docker 紧急修复脚本
# 当Docker完全无法访问时使用此脚本
# 使用方法: chmod +x emergency-fix.sh && sudo ./emergency-fix.sh

set -e

echo "=========================================="
echo "Docker 紧急修复脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    echo "使用方法: sudo ./emergency-fix.sh"
    exit 1
fi

echo -e "${BLUE}此脚本将执行以下操作：${NC}"
echo "1. 强制停止所有Docker容器"
echo "2. 删除所有Docker容器"
echo "3. 删除所有Docker镜像"
echo "4. 删除所有Docker卷"
echo "5. 删除所有Docker网络"
echo "6. 清理Docker系统"
echo "7. 重启Docker服务"
echo "8. 验证Docker状态"
echo ""
read -p "确认执行？(y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo -e "${YELLOW}=========================================="
echo "开始修复Docker环境..."
echo "==========================================${NC}"
echo ""

# 步骤1: 强制停止所有容器
echo -e "${YELLOW}[1/8] 强制停止所有Docker容器...${NC}"
docker ps -aq | xargs -r docker stop -t 1 2>/dev/null || true
docker ps -aq | xargs -r docker kill 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤2: 删除所有容器
echo -e "${YELLOW}[2/8] 删除所有Docker容器...${NC}"
docker ps -aq | xargs -r docker rm -f 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤3: 删除所有镜像
echo -e "${YELLOW}[3/8] 删除所有Docker镜像...${NC}"
docker images -aq | xargs -r docker rmi -f 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤4: 删除所有卷
echo -e "${YELLOW}[4/8] 删除所有Docker卷...${NC}"
docker volume ls -q | xargs -r docker volume rm -f 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤5: 删除所有网络
echo -e "${YELLOW}[5/8] 删除所有Docker网络...${NC}"
docker network ls -q | grep -v "bridge\|host\|none" | xargs -r docker network rm 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤6: 清理Docker系统
echo -e "${YELLOW}[6/8] 清理Docker系统...${NC}"
docker system prune -af --volumes 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"
sleep 2

# 步骤7: 重启Docker服务
echo -e "${YELLOW}[7/8] 重启Docker服务...${NC}"
systemctl stop docker 2>/dev/null || true
sleep 3
systemctl start docker 2>/dev/null || true
sleep 5
echo -e "${GREEN}✓ 完成${NC}"

# 步骤8: 验证Docker状态
echo -e "${YELLOW}[8/8] 验证Docker状态...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker服务正常运行${NC}"
else
    echo -e "${RED}✗ Docker服务异常，尝试重新安装...${NC}"
    
    # 卸载旧版本Docker
    echo "卸载旧版本Docker..."
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
    
    # 重新安装Docker
    echo "重新安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    systemctl start docker
    systemctl enable docker
    sleep 5
    
    if docker info > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker重新安装成功${NC}"
    else
        echo -e "${RED}✗ Docker重新安装失败，请手动检查${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Docker环境修复完成！"
echo "==========================================${NC}"
echo ""

# 显示Docker信息
echo -e "${BLUE}Docker版本信息：${NC}"
docker --version
docker-compose --version 2>/dev/null || echo "Docker Compose未安装"

echo ""
echo -e "${BLUE}Docker系统信息：${NC}"
docker info | grep -E "Server Version|Storage Driver|Containers|Images"

echo ""
echo -e "${GREEN}=========================================="
echo "接下来的操作"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}方式一：使用宿主机MySQL（推荐）${NC}"
echo ""
echo "1. 确保宿主机MySQL正在运行："
echo "   sudo systemctl status mysql"
echo ""
echo "2. 在宿主机MySQL中创建数据库："
echo "   mysql -u root -p"
echo "   CREATE DATABASE it_ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'ticket_user'@'%' IDENTIFIED BY 'your_password';"
echo "   GRANT ALL PRIVILEGES ON it_ticket_system.* TO 'ticket_user'@'%';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "3. 配置环境变量："
echo "   cp .env.host-mysql .env"
echo "   nano .env  # 修改数据库密码和SECRET_KEY"
echo ""
echo "4. 启动应用（不包含MySQL和Nginx）："
echo "   docker-compose -f docker-compose-no-db.yml up -d --build"
echo ""
echo "5. 访问应用："
echo "   http://localhost:8000"
echo ""
echo -e "${YELLOW}方式二：使用Docker MySQL${NC}"
echo ""
echo "1. 配置环境变量："
echo "   cp .env.example .env"
echo "   nano .env  # 修改SECRET_KEY和数据库密码"
echo ""
echo "2. 启动应用（包含MySQL，不包含Nginx）："
echo "   docker-compose up -d --build"
echo ""
echo "3. 访问应用："
echo "   http://localhost:8000"
echo ""
echo -e "${YELLOW}常用命令：${NC}"
echo "- 查看容器状态: docker-compose ps"
echo "- 查看日志: docker-compose logs -f"
echo "- 停止服务: docker-compose down"
echo "- 重启服务: docker-compose restart"
echo ""
echo -e "${RED}注意事项：${NC}"
echo "1. 所有旧的容器、镜像、卷都已被删除"
echo "2. 需要重新构建镜像和启动容器"
echo "3. 数据库数据已清空，需要重新初始化"
echo "4. 首次启动可能需要几分钟时间"
echo ""
echo -e "${GREEN}修复脚本执行完成！${NC}"
