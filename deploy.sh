#!/bin/bash

# IT运维工单系统 - 快速部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "=========================================="
echo "IT运维工单系统 - 快速部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    echo "使用方法: sudo ./deploy.sh"
    exit 1
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker未安装，正在安装...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}Docker安装完成${NC}"
else
    echo -e "${GREEN}Docker已安装${NC}"
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose未安装，正在安装...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose安装完成${NC}"
else
    echo -e "${GREEN}Docker Compose已安装${NC}"
fi

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo -e "${YELLOW}.env文件不存在，正在创建...${NC}"
    
    # 生成随机SECRET_KEY
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || openssl rand -base64 32)
    
    # 生成随机数据库密码
    DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))" 2>/dev/null || openssl rand -base64 16)
    MYSQL_ROOT_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))" 2>/dev/null || openssl rand -base64 16)
    
    # 创建.env文件
    cat > .env << EOF
# 数据库配置
DB_HOST=db
DB_PORT=3306
DB_USER=ticket_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=it_ticket_system

# MySQL Root密码
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}

# JWT密钥
SECRET_KEY=${SECRET_KEY}

# 应用配置
APP_ENV=production
APP_DEBUG=false
EOF
    
    echo -e "${GREEN}.env文件创建完成${NC}"
    echo -e "${YELLOW}请查看.env文件并根据需要修改配置${NC}"
else
    echo -e "${GREEN}.env文件已存在${NC}"
fi

# 询问部署方式
echo ""
echo "请选择部署方式:"
echo "1) 使用Docker Compose部署（推荐）"
echo "2) 仅构建Docker镜像"
echo "3) 直接部署（需要Python和MySQL）"
read -p "请输入选项 (1-3): " deploy_option

case $deploy_option in
    1)
        echo -e "${GREEN}使用Docker Compose部署...${NC}"
        
        # 停止旧容器
        docker-compose down 2>/dev/null || true
        
        # 构建并启动
        docker-compose up -d --build
        
        echo ""
        echo -e "${GREEN}部署完成！${NC}"
        echo ""
        echo "访问地址："
        echo "- 本地访问: http://localhost:8000"
        echo "- 云服务器访问: http://your-server-ip:8000"
        echo "  （将 your-server-ip 替换为实际的服务器IP）"
        echo ""
        echo "默认管理员账号: admin"
        echo "默认管理员密码: admin123"
        echo ""
        echo "常用命令："
        echo "- 查看日志: docker-compose logs -f"
        echo "- 停止服务: docker-compose down"
        echo "- 重启服务: docker-compose restart"
        echo ""
        echo "云服务器部署说明: 查看 CLOUD_SERVER_DEPLOYMENT.md"
        ;;
        
    2)
        echo -e "${GREEN}构建Docker镜像...${NC}"
        docker build -t it-ticket-system:latest .
        
        echo ""
        echo -e "${GREEN}镜像构建完成！${NC}"
        echo "运行容器:"
        echo "docker run -d -p 8000:8000 --env-file .env --name it-ticket-system it-ticket-system:latest"
        ;;
        
    3)
        echo -e "${GREEN}直接部署...${NC}"
        
        # 检查Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}Python3未安装，请先安装Python3${NC}"
            exit 1
        fi
        
        # 安装依赖
        echo "安装Python依赖..."
        pip3 install -r requirements.txt
        
        # 加载环境变量
        export $(cat .env | xargs)
        
        # 创建systemd服务
        echo "创建systemd服务..."
        cat > /etc/systemd/system/it-ticket-system.service << EOF
[Unit]
Description=IT Ticket System
After=network.target

[Service]
Type=notify
User=root
WorkingDirectory=$(pwd)
EnvironmentFile=$(pwd)/.env
ExecStart=/usr/local/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF
        
        # 启动服务
        systemctl daemon-reload
        systemctl enable it-ticket-system
        systemctl start it-ticket-system
        
        echo ""
        echo -e "${GREEN}部署完成！${NC}"
        echo ""
        echo "访问地址："
        echo "- 本地访问: http://localhost:8000"
        echo "- 云服务器访问: http://your-server-ip:8000"
        echo ""
        echo "常用命令："
        echo "- 查看状态: systemctl status it-ticket-system"
        echo "- 查看日志: journalctl -u it-ticket-system -f"
        echo "- 重启服务: systemctl restart it-ticket-system"
        echo ""
        echo "云服务器部署说明: 查看 CLOUD_SERVER_DEPLOYMENT.md"
        ;;
        
    *)
        echo -e "${RED}无效的选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}重要提示:${NC}"
echo "1. 请立即修改默认管理员密码"
echo "2. 如需配置HTTPS，请参考DEPLOYMENT.md文档"
echo "3. 建议配置防火墙和定期备份数据库"
echo "4. 详细部署文档请查看: DEPLOYMENT.md"
echo ""
echo -e "${GREEN}部署脚本执行完成！${NC}"
