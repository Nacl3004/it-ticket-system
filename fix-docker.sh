#!/bin/bash

# Docker 容器问题快速修复脚本
# 使用方法: chmod +x fix-docker.sh && sudo ./fix-docker.sh

set -e

echo "=========================================="
echo "Docker 容器问题快速修复脚本"
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
    echo "使用方法: sudo ./fix-docker.sh"
    exit 1
fi

echo -e "${YELLOW}步骤1: 强制停止所有容器...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤2: 强制删除所有容器...${NC}"
docker rm -f $(docker ps -aq) 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤3: 清理未使用的资源...${NC}"
docker system prune -f
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤4: 清理网络...${NC}"
docker network prune -f
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤5: 重启Docker服务...${NC}"
systemctl restart docker
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${YELLOW}步骤6: 等待Docker启动...${NC}"
sleep 5
echo -e "${GREEN}✓ 完成${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Docker环境已清理完成！"
echo "==========================================${NC}"
echo ""
echo "接下来的操作："
echo ""
echo "1. 如果使用宿主机MySQL（推荐）："
echo "   docker-compose -f docker-compose-no-db.yml up -d --build"
echo ""
echo "2. 如果使用Docker MySQL："
echo "   docker-compose up -d --build"
echo ""
echo "3. 查看日志："
echo "   docker-compose logs -f"
echo ""
