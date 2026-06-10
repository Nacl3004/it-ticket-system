# IT运维工单系统

一个功能完整的IT运维工单管理系统，支持用户管理、工单流程管理和实时消息通知。

## 功能特性

### 用户管理
- 支持超级管理员、管理员、HR、IT运维、普通用户等多种角色
- 超级管理员、管理员、HR和IT角色可以创建用户账号
- 完善的权限控制系统

### 工单管理
- 用户可以提交电脑、打印机等设备的故障报修
- 支持多种问题分类（硬件故障、软件故障、打印机故障、网络故障等）
- 完整的工单流程：提交 → IT认领 → 处理中 → 完成 → 结单
- 支持优先级设置（低、中、高、紧急）
- 详细的工单日志记录

### 实时通知
- WebSocket实时消息推送
- 工单状态变更即时通知相关人员
- 浏览器桌面通知支持

### 统计功能
- 工单数量统计
- 状态分布统计
- 个人工单统计

## 技术栈

### 后端
- Python 3.9+
- FastAPI - 现代化的Web框架
- PyMySQL - MySQL数据库连接
- WebSocket - 实时通信
- JWT - 用户认证
- Bcrypt - 密码加密

### 前端
- HTML5 + JavaScript
- Tailwind CSS - 现代化UI框架
- Font Awesome - 图标库
- WebSocket客户端

### 数据库
- MySQL 8.0

## 快速开始

### 默认管理员账号

- 用户名：admin
- 密码：admin123
- 角色：超级管理员

**⚠️ 重要提示：首次登录后请立即修改默认密码！**

## 部署说明

### 方式一：宝塔面板部署（最简单，推荐）

如果您的服务器安装了宝塔面板，这是最简单的部署方式：

**📖 详细步骤请查看：[BAOTA_DEPLOYMENT.md](BAOTA_DEPLOYMENT.md)**

**快速步骤**：
1. 在宝塔面板中创建MySQL数据库
2. 上传项目文件到 `/www/wwwroot/it-ticket-system/`
3. 配置 `.env` 环境变量
4. 使用Python项目管理器启动应用
5. 配置Nginx反向代理
6. 访问系统

**优势**：
- ✅ 图形化界面操作，简单易用
- ✅ 自动管理进程，无需手动配置
- ✅ 一键配置SSL证书
- ✅ 内置数据库备份功能

---

### 方式二：一键部署脚本

使用自动化部署脚本：

```bash
# 1. 下载源代码
git clone <your-repository-url>
cd it-ticket-system

# 2. 运行部署脚本
chmod +x deploy.sh
sudo ./deploy.sh
```

部署脚本会自动：
- 安装Docker和Docker Compose
- 生成安全的配置文件
- 启动所有服务（应用+数据库）

### 方式三：Docker Compose部署

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑.env文件，配置数据库和密钥
nano .env

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 方式四：Docker部署

```bash
# 1. 构建镜像
docker build -t it-ticket-system .

# 2. 运行容器
docker run -d -p 8000:8000 \
  -e DB_HOST=your_db_host \
  -e DB_PORT=3306 \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e DB_NAME=your_db_name \
  -e SECRET_KEY=your_secret_key \
  --name it-ticket-system \
  it-ticket-system
```

### 方式五：本地开发

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
nano .env

# 3. 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 访问系统

部署完成后，打开浏览器访问：

#### 本地部署
- 访问地址：`http://localhost:8000`

#### 云服务器部署
- **直接访问**：`http://your-server-ip:8000`（例如：`http://123.45.67.89:8000`）
- **使用域名**：`http://your-domain.com:8000`
- **使用Nginx**：`http://your-server-ip` 或 `http://your-domain.com`
- **使用HTTPS**：`https://your-domain.com`（推荐）

**注意**：
- 云服务器部署需要开放防火墙端口（8000、80、443）
- 需要在云服务商控制台配置安全组规则
- 详细说明请查看：[CLOUD_SERVER_DEPLOYMENT.md](CLOUD_SERVER_DEPLOYMENT.md)

## 详细部署文档

**📖 完整的部署指南请查看：**

- **[BAOTA_DEPLOYMENT.md](BAOTA_DEPLOYMENT.md)** - 宝塔面板部署指南（最简单，推荐）
  - 图形化界面操作
  - 自动进程管理
  - 一键SSL证书配置
  - 内置数据库备份
  
- **[CLOUD_SERVER_DEPLOYMENT.md](CLOUD_SERVER_DEPLOYMENT.md)** - 云服务器部署指南
  - 如何通过公网IP或域名访问
  - 防火墙和安全组配置
  - Nginx反向代理配置
  - HTTPS/SSL证书配置
  
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 通用部署指南
  - 系统要求和环境准备
  - 数据库配置和初始化
  - 多种部署方式详解
  - 安全加固建议
  - 性能优化方案
  - 常见问题解决方案

- **[QUICK_ACCESS_GUIDE.md](QUICK_ACCESS_GUIDE.md)** - 快速访问指南
  - 本地和云服务器访问方式
  - 防火墙端口配置
  - 常见访问问题解决

## 环境变量配置

系统使用环境变量管理配置，主要配置项：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| DB_HOST | 数据库地址 | 是 |
| DB_PORT | 数据库端口 | 是 |
| DB_USER | 数据库用户名 | 是 |
| DB_PASSWORD | 数据库密码 | 是 |
| DB_NAME | 数据库名称 | 是 |
| SECRET_KEY | JWT密钥（至少32位） | 是 |

详细配置说明请参考 `.env.example` 文件。

## 项目结构

```
.
├── main.py                 # FastAPI主程序
├── requirements.txt        # Python依赖
├── Dockerfile             # Docker配置
├── README.md              # 项目说明
└── static/                # 前端静态文件
    ├── index.html         # 登录页面
    ├── dashboard.html     # 控制台页面
    ├── dashboard.js       # 控制台逻辑
    └── users.html         # 用户管理页面
```

## API接口

### 认证接口
- POST /api/login - 用户登录
- GET /api/current-user - 获取当前用户信息

### 用户管理
- GET /api/users - 获取用户列表
- POST /api/users - 创建用户

### 角色管理
- GET /api/roles - 获取角色列表

### 工单管理
- GET /api/tickets - 获取工单列表
- POST /api/tickets - 创建工单
- GET /api/tickets/{id} - 获取工单详情
- PUT /api/tickets/{id}/claim - 认领工单
- PUT /api/tickets/{id}/process - 开始处理工单
- PUT /api/tickets/{id}/complete - 完成工单
- PUT /api/tickets/{id}/close - 结单

### 通知管理
- GET /api/notifications - 获取通知列表
- PUT /api/notifications/{id}/read - 标记通知已读

### 统计接口
- GET /api/statistics - 获取统计数据

### WebSocket
- WS /ws/{token} - WebSocket连接

## 工单流程

1. **用户提交工单**
   - 填写工单标题、问题分类、设备类型、优先级、位置、问题描述
   - 系统自动生成工单编号
   - 通知所有IT人员

2. **IT人员认领**
   - IT人员查看待处理工单
   - 选择工单进行认领
   - 通知工单提交人

3. **IT人员处理**
   - 标记工单为"处理中"
   - 通知工单提交人

4. **IT人员完成**
   - 填写解决方案
   - 标记工单为"已完成"
   - 通知工单提交人确认

5. **用户结单**
   - 用户确认问题已解决
   - 结束工单流程

## 权限说明

### 超级管理员
- 所有权限
- 可以创建任何角色的用户
- 可以查看和管理所有工单

### 管理员
- 可以创建用户
- 可以查看和管理所有工单

### HR
- 可以创建用户
- 可以提交工单

### IT运维
- 可以创建用户
- 可以认领、处理、完成工单
- 可以查看所有工单

### 普通用户
- 可以提交工单
- 可以查看自己的工单
- 可以结单

## 安全注意事项

### 生产环境部署前必做

1. ✅ **修改默认管理员密码**
   - 首次登录后立即修改
   - 使用强密码（至少12位，包含大小写字母、数字、特殊字符）

2. ✅ **配置安全的SECRET_KEY**
   - 使用至少32位的随机字符串
   - 生成方法：`python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
   - 不要使用默认值或简单字符串

3. ✅ **配置数据库安全**
   - 使用强密码
   - 限制数据库访问IP
   - 不要将数据库暴露在公网

4. ✅ **启用HTTPS**
   - 使用SSL/TLS证书
   - 配置Nginx反向代理
   - 强制HTTPS访问

5. ✅ **配置防火墙**
   - 只开放必要的端口（80, 443, 22）
   - 限制SSH访问IP
   - 使用fail2ban防止暴力破解

6. ✅ **定期备份数据库**
   - 配置自动备份脚本
   - 异地存储备份文件
   - 定期测试恢复流程

7. ✅ **删除测试文件**
   - 删除所有test_*.py文件
   - 删除开发环境配置
   - 不要提交.env文件到版本控制

### 开发环境注意事项

1. 确保数据库连接正常
2. WebSocket需要支持ws://或wss://协议
3. 浏览器需要允许桌面通知权限
4. 建议使用Chrome或Firefox浏览器
