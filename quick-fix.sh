#!/bin/bash

# 端口冲突快速修复脚本
# 使用方法: chmod +x quick-fix.sh && sudo ./quick-fix.sh

set -e

echo "=========================================="
echo "端口冲突快速修复脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    echo "使用方法: sudo ./quick-fix.sh"
    exit 1
fi

echo -e "${YELLOW}步骤1: 停止所有Docker容器...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤2: 删除所有Docker容器...${NC}"
docker rm -f $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤3: 清理Docker资源...${NC}"
docker system prune -f
docker network prune -f
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤4: 重启Docker服务...${NC}"
systemctl restart docker
sleep 3
echo -e "${GREEN}✓ 完成${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Docker环境已清理完成！"
echo "==========================================${NC}"
echo ""
echo "现在可以重新部署应用："
echo ""
echo -e "${YELLOW}方式一：使用宿主机MySQL + 不使用Nginx（推荐）${NC}"
echo "1. 在宿主机MySQL中创建数据库："
echo "   mysql -u root -p"
echo "   CREATE DATABASE it_ticket_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'ticket_user'@'%' IDENTIFIED BY 'your_password';"
echo "   GRANT ALL PRIVILEGES ON it_ticket_system.* TO 'ticket_user'@'%';"
echo "   FLUSH PRIVILEGES;"
echo ""
echo "2. 配置环境变量："
echo "   cp .env.host-mysql .env"
echo "   nano .env  # 修改数据库密码和SECRET_KEY"
echo ""
echo "3. 启动应用（不包含MySQL和Nginx）："
echo "   docker-compose -f docker-compose-no-db.yml up -d"
echo ""
echo "4. 访问应用："
echo "   本地: http://localhost:8000"
echo "   云服务器: http://your-server-ip:8000"
echo ""
echo -e "${YELLOW}方式二：使用Docker MySQL + 不使用Nginx${NC}"
echo "1. 启动应用（包含MySQL，不包含Nginx）："
echo "   docker-compose up -d"
echo ""
echo "2. 访问应用："
echo "   本地: http://localhost:8000"
echo "   云服务器: http://your-server-ip:8000"
echo ""
echo -e "${YELLOW}注意事项：${NC}"
echo "- 已禁用Nginx服务，直接访问8000端口"
echo "- MySQL端口已改为3307，避免与宿主机冲突"
echo "- 如需使用Nginx，请修改docker-compose.yml中的端口映射"
echo ""
