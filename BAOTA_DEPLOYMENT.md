# 宝塔面板部署指南

## 📋 目录
- [环境要求](#环境要求)
- [部署步骤](#部署步骤)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

---

## 🎯 环境要求

### 服务器要求
- **操作系统**: Linux (CentOS 7+, Ubuntu 18.04+)
- **宝塔面板**: 7.0+
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **磁盘**: 20GB以上

### 软件要求
- **Python**: 3.9+
- **MySQL**: 5.7+ 或 8.0+
- **Nginx**: 1.18+ (宝塔自带)

---

## 🚀 部署步骤

### 第一步：安装宝塔面板（如已安装请跳过）

```bash
# CentOS安装命令
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Deepin安装命令
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

安装完成后，记录：
- 宝塔面板地址
- 用户名
- 密码

### 第二步：登录宝塔面板并安装软件

1. 打开浏览器，访问宝塔面板地址
2. 登录宝塔面板
3. 在"软件商店"中安装以下软件：
   - ✅ **Nginx** (推荐1.20+)
   - ✅ **MySQL** (推荐8.0)
   - ✅ **Python项目管理器** (必须)
   - ✅ **PM2管理器** (可选，用于进程管理)

### 第三步：创建数据库

1. 点击左侧菜单 **"数据库"**
2. 点击 **"添加数据库"**
3. 填写信息：
   - 数据库名：`it_ticket_system`
   - 用户名：`ticket_user`
   - 密码：自动生成或自定义（记录下来）
   - 访问权限：选择 **"本地服务器"**
4. 点击 **"提交"**

**记录数据库信息**：
```
数据库地址: localhost (或 127.0.0.1)
数据库端口: 3306
数据库名称: it_ticket_system
用户名: ticket_user
密码: [刚才设置的密码]
```

### 第四步：上传项目文件

#### 方式一：使用宝塔文件管理器（推荐）

1. 点击左侧菜单 **"文件"**
2. 进入 `/www/wwwroot/` 目录
3. 点击 **"上传"** 按钮
4. 上传项目压缩包（.zip 或 .tar.gz）
5. 右键压缩包，选择 **"解压"**
6. 重命名解压后的文件夹为 `it-ticket-system`

#### 方式二：使用Git（推荐）

1. 点击左侧菜单 **"文件"**
2. 进入 `/www/wwwroot/` 目录
3. 点击 **"终端"** 按钮
4. 执行命令：

```bash
cd /www/wwwroot/
git clone <your-repository-url> it-ticket-system
cd it-ticket-system
```

### 第五步：配置环境变量

1. 在宝塔文件管理器中，进入项目目录 `/www/wwwroot/it-ticket-system/`
2. 复制 `.env.example` 文件，重命名为 `.env`
3. 点击 `.env` 文件，选择 **"编辑"**
4. 修改以下配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=ticket_user
DB_PASSWORD=你的数据库密码
DB_NAME=it_ticket_system

# JWT密钥（必须修改为随机字符串）
SECRET_KEY=你的随机密钥

# 应用配置
APP_ENV=production
APP_DEBUG=false
```

**生成随机SECRET_KEY**：
在宝塔终端执行：
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 第六步：安装Python依赖

#### 方式一：使用宝塔Python项目管理器（推荐）

1. 点击左侧菜单 **"网站"**
2. 点击 **"Python项目"**
3. 点击 **"添加项目"**
4. 填写信息：
   - 项目名称：`IT运维工单系统`
   - 项目路径：`/www/wwwroot/it-ticket-system`
   - Python版本：选择 **Python 3.9+**
   - 启动方式：选择 **"uvicorn"**
   - 启动文件：`main.py`
   - 启动参数：`main:app --host 0.0.0.0 --port 8000`
   - 端口：`8000`
5. 点击 **"提交"**

宝塔会自动：
- 创建虚拟环境
- 安装 requirements.txt 中的依赖
- 启动应用

#### 方式二：手动安装（备选）

在宝塔终端执行：

```bash
cd /www/wwwroot/it-ticket-system

# 安装依赖
pip3 install -r requirements.txt

# 或使用虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 第七步：配置Nginx反向代理

1. 点击左侧菜单 **"网站"**
2. 点击 **"添加站点"**
3. 填写信息：
   - 域名：你的域名（如 `ticket.example.com`）或服务器IP
   - 根目录：`/www/wwwroot/it-ticket-system/static`
   - PHP版本：选择 **"纯静态"**
4. 点击 **"提交"**

5. 点击刚创建的网站，选择 **"设置"**
6. 点击 **"反向代理"**
7. 点击 **"添加反向代理"**
8. 填写信息：
   - 代理名称：`IT工单系统`
   - 目标URL：`http://127.0.0.1:8000`
   - 发送域名：`$host`
9. 点击 **"提交"**

10. 点击 **"配置文件"**，添加WebSocket支持：

在 `location /` 块中添加：

```nginx
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
    proxy_read_timeout 86400s;
}
```

11. 点击 **"保存"**

### 第八步：配置SSL证书（推荐）

1. 在网站设置中，点击 **"SSL"**
2. 选择以下方式之一：
   - **Let's Encrypt**（免费，推荐）
   - **其他证书**（如已有证书）
3. 点击 **"申请"** 或 **"部署"**
4. 开启 **"强制HTTPS"**

### 第九步：启动应用

#### 使用Python项目管理器启动

1. 点击左侧菜单 **"网站"** → **"Python项目"**
2. 找到刚才添加的项目
3. 点击 **"启动"** 按钮

#### 手动启动（备选）

在宝塔终端执行：

```bash
cd /www/wwwroot/it-ticket-system

# 方式1：使用uvicorn
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > app.log 2>&1 &

# 方式2：使用gunicorn（推荐）
nohup gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 > app.log 2>&1 &
```

### 第十步：配置防火墙

1. 点击左侧菜单 **"安全"**
2. 添加以下端口规则：
   - 端口：`8000`，备注：`IT工单系统`
   - 端口：`80`，备注：`HTTP`
   - 端口：`443`，备注：`HTTPS`

### 第十一步：测试访问

1. 打开浏览器
2. 访问：
   - 使用域名：`http://your-domain.com` 或 `https://your-domain.com`
   - 使用IP：`http://your-server-ip` 或 `http://your-server-ip:8000`

3. 使用默认管理员账号登录：
   - 用户名：`admin`
   - 密码：`admin123`

4. **立即修改默认密码！**

---

## 🔧 配置说明

### 自动启动配置

#### 使用宝塔Python项目管理器

宝塔会自动管理进程，无需额外配置。

#### 使用PM2管理器

1. 安装PM2管理器（在软件商店）
2. 创建启动脚本 `start.sh`：

```bash
#!/bin/bash
cd /www/wwwroot/it-ticket-system
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

3. 在PM2管理器中添加项目：
   - 项目名称：`it-ticket-system`
   - 启动文件：`/www/wwwroot/it-ticket-system/start.sh`
   - 运行目录：`/www/wwwroot/it-ticket-system`

### 日志查看

#### 使用宝塔Python项目管理器

1. 点击项目的 **"日志"** 按钮
2. 查看实时日志

#### 手动查看

```bash
# 查看应用日志
tail -f /www/wwwroot/it-ticket-system/app.log

# 查看Nginx日志
tail -f /www/server/panel/logs/error.log
```

### 数据库备份

1. 点击左侧菜单 **"数据库"**
2. 找到 `it_ticket_system` 数据库
3. 点击 **"备份"** 按钮
4. 或设置 **"自动备份"**：
   - 点击 **"计划任务"**
   - 添加 **"备份数据库"** 任务
   - 选择数据库：`it_ticket_system`
   - 执行周期：每天凌晨2点

---

## 🚨 常见问题

### 问题1：应用无法启动

**检查步骤**：

1. 查看Python项目状态：
   ```bash
   # 在宝塔终端执行
   ps aux | grep uvicorn
   ```

2. 查看端口占用：
   ```bash
   netstat -tulpn | grep 8000
   ```

3. 查看日志：
   ```bash
   tail -f /www/wwwroot/it-ticket-system/app.log
   ```

**解决方案**：
- 检查 `.env` 文件配置是否正确
- 检查数据库连接是否正常
- 检查端口是否被占用

### 问题2：数据库连接失败

**错误信息**：`Can't connect to MySQL server`

**解决方案**：

1. 检查数据库是否启动：
   - 在宝塔面板 → 数据库 → 查看MySQL状态

2. 检查数据库配置：
   - `.env` 文件中的数据库信息是否正确
   - 数据库用户权限是否正确

3. 测试数据库连接：
   ```bash
   mysql -u ticket_user -p it_ticket_system
   ```

### 问题3：无法访问网站

**检查步骤**：

1. 检查应用是否运行：
   ```bash
   curl http://localhost:8000
   ```

2. 检查Nginx配置：
   - 宝塔面板 → 网站 → 设置 → 配置文件

3. 检查防火墙：
   - 宝塔面板 → 安全 → 查看端口规则

4. 检查云服务商安全组：
   - 登录云服务商控制台
   - 检查安全组规则

### 问题4：WebSocket连接失败

**解决方案**：

1. 确保Nginx配置中有WebSocket支持（参考第七步）
2. 使用HTTPS访问（推荐）
3. 检查浏览器控制台错误信息

### 问题5：静态文件404

**解决方案**：

1. 检查 `main.py` 中的静态文件配置：
   ```python
   app.mount("/static", StaticFiles(directory="static", html=True), name="static")
   ```

2. 确保 `static` 目录存在且包含所有HTML文件

### 问题6：权限问题

**错误信息**：`Permission denied`

**解决方案**：

```bash
# 修改项目目录权限
cd /www/wwwroot/
chown -R www:www it-ticket-system
chmod -R 755 it-ticket-system
```

---

## 📊 性能优化

### 1. 使用Gunicorn多进程

修改Python项目启动参数：

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

- `-w 4`：4个工作进程（根据CPU核心数调整）

### 2. 配置Nginx缓存

在网站配置文件中添加：

```nginx
# 静态文件缓存
location /static {
    proxy_pass http://127.0.0.1:8000;
    expires 1d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 开启Gzip压缩

在宝塔面板 → 网站 → 设置 → 性能优化 → 开启Gzip

---

## 🔒 安全建议

### 1. 修改默认密码

- ✅ 修改宝塔面板密码
- ✅ 修改数据库root密码
- ✅ 修改应用管理员密码

### 2. 配置SSL证书

- ✅ 使用Let's Encrypt免费证书
- ✅ 开启强制HTTPS

### 3. 配置防火墙

- ✅ 只开放必要的端口
- ✅ 限制SSH访问IP

### 4. 定期备份

- ✅ 配置数据库自动备份
- ✅ 配置网站文件备份

---

## 📞 获取帮助

### 宝塔面板相关

- 官方文档：https://www.bt.cn/bbs/
- 官方论坛：https://www.bt.cn/bbs/forum.php

### 项目相关

- 查看其他部署文档：
  - [DEPLOYMENT.md](DEPLOYMENT.md) - 通用部署指南
  - [QUICK_ACCESS_GUIDE.md](QUICK_ACCESS_GUIDE.md) - 快速访问指南
  - [PORT_CONFLICT_SOLUTION.md](PORT_CONFLICT_SOLUTION.md) - 端口冲突解决

---

## 🎯 快速命令参考

```bash
# 查看应用状态
ps aux | grep uvicorn

# 查看端口占用
netstat -tulpn | grep 8000

# 查看日志
tail -f /www/wwwroot/it-ticket-system/app.log

# 重启应用（如使用Python项目管理器）
# 在宝塔面板中点击"重启"按钮

# 测试数据库连接
mysql -u ticket_user -p it_ticket_system

# 查看服务器IP
curl ifconfig.me
```

---

## ✅ 部署完成检查清单

- [ ] 宝塔面板已安装
- [ ] MySQL数据库已创建
- [ ] 项目文件已上传
- [ ] 环境变量已配置
- [ ] Python依赖已安装
- [ ] Nginx反向代理已配置
- [ ] SSL证书已配置（推荐）
- [ ] 防火墙端口已开放
- [ ] 应用已启动
- [ ] 可以正常访问
- [ ] 默认密码已修改
- [ ] 数据库备份已配置

---

**祝您部署顺利！如有问题，请参考常见问题部分或联系技术支持。**
