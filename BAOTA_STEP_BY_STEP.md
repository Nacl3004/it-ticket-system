# 宝塔面板部署 IT 运维工单系统 - 超详细步骤

## 📋 目录
- [前置准备](#前置准备)
- [方式一：使用宝塔Docker管理器（最简单）](#方式一使用宝塔docker管理器最简单)
- [方式二：使用宝塔终端手动部署](#方式二使用宝塔终端手动部署)
- [方式三：使用宝塔Python项目管理器](#方式三使用宝塔python项目管理器)
- [常见问题解决](#常见问题解决)

---

## 前置准备

### 1. 登录宝塔面板

打开浏览器，访问：`http://your-server-ip:8888`

输入宝塔账号密码登录。

### 2. 检查服务器环境

在宝塔面板左侧菜单，点击 **"软件商店"**，确保已安装：

- ✅ **Nginx** (推荐 1.20+)
- ✅ **MySQL** (推荐 8.0+)
- ✅ **Python项目管理器** (可选)
- ✅ **Docker管理器** (推荐)

如果没有安装，点击 **"一键安装"** 按钮安装。

---

## 方式一：使用宝塔Docker管理器（最简单）

### 步骤1：安装Docker管理器

1. 点击左侧 **"软件商店"**
2. 搜索 **"Docker管理器"**
3. 点击 **"安装"**
4. 等待安装完成（约2-5分钟）

### 步骤2：上传项目文件

1. 点击左侧 **"文件"**
2. 进入 `/www/wwwroot/` 目录
3. 点击 **"上传"** 按钮
4. 上传项目压缩包（.zip 或 .tar.gz）
5. 右键点击压缩包，选择 **"解压"**
6. 解压后得到项目目录，例如：`/www/wwwroot/it-ticket-system/`

### 步骤3：配置环境变量

1. 进入项目目录：`/www/wwwroot/it-ticket-system/`
2. 找到 `.env.example` 文件
3. 右键点击，选择 **"复制"**
4. 重命名为 `.env`
5. 右键点击 `.env`，选择 **"编辑"**
6. 修改以下配置：

```bash
# 数据库配置（使用宝塔MySQL）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=it_ticket_user
DB_PASSWORD=your_strong_password_here
DB_NAME=it_ticket_system

# JWT密钥（必须修改为随机字符串）
SECRET_KEY=your_very_long_random_secret_key_at_least_32_characters

# 应用配置
APP_ENV=production
APP_DEBUG=false
```

7. 点击 **"保存"**

### 步骤4：创建数据库

1. 点击左侧 **"数据库"**
2. 点击 **"添加数据库"**
3. 填写信息：
   - 数据库名：`it_ticket_system`
   - 用户名：`it_ticket_user`
   - 密码：`your_strong_password_here`（与.env中一致）
   - 访问权限：选择 **"本地服务器"**
4. 点击 **"提交"**

### 步骤5：使用Docker部署

#### 方法A：使用宝塔终端

1. 点击左侧 **"终端"**
2. 进入项目目录：
```bash
cd /www/wwwroot/it-ticket-system
```

3. 停止并删除旧容器（如果有）：
```bash
docker stop it-ticket-system 2>/dev/null || true
docker rm it-ticket-system 2>/dev/null || true
```

4. 构建Docker镜像：
```bash
docker build -t it-ticket-system:latest .
```

5. 运行容器：
```bash
docker run -d \
  --name it-ticket-system \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  it-ticket-system:latest
```

6. 查看容器状态：
```bash
docker ps
```

7. 查看日志：
```bash
docker logs -f it-ticket-system
```

#### 方法B：使用Docker Compose

1. 在终端中执行：
```bash
cd /www/wwwroot/it-ticket-system
docker-compose -f docker-compose-no-db.yml up -d
```

2. 查看状态：
```bash
docker-compose ps
```

### 步骤6：配置Nginx反向代理

1. 点击左侧 **"网站"**
2. 点击 **"添加站点"**
3. 填写信息：
   - 域名：`ticket.yourdomain.com`（或使用IP）
   - 根目录：`/www/wwwroot/it-ticket-system/static`
   - PHP版本：选择 **"纯静态"**
4. 点击 **"提交"**

5. 点击站点右侧的 **"设置"**
6. 点击 **"反向代理"**
7. 点击 **"添加反向代理"**
8. 填写信息：
   - 代理名称：`IT工单系统`
   - 目标URL：`http://127.0.0.1:8000`
   - 发送域名：`$host`
9. 点击 **"保存"**

10. 在 **"配置文件"** 中添加WebSocket支持：

找到 `location /` 部分，在其后添加：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}
```

11. 点击 **"保存"**

### 步骤7：配置SSL证书（可选但推荐）

1. 在站点设置中，点击 **"SSL"**
2. 选择 **"Let's Encrypt"**
3. 输入邮箱地址
4. 点击 **"申请"**
5. 等待证书申请完成
6. 开启 **"强制HTTPS"**

### 步骤8：开放防火墙端口

1. 点击左侧 **"安全"**
2. 添加以下端口：
   - 端口：`8000`，备注：`IT工单系统`
   - 端口：`80`，备注：`HTTP`
   - 端口：`443`，备注：`HTTPS`
3. 点击 **"放行"**

### 步骤9：测试访问

1. 打开浏览器
2. 访问：`http://your-server-ip:8000`
3. 或访问：`http://ticket.yourdomain.com`（如果配置了域名）
4. 应该能看到登录页面

**默认登录信息**：
- 用户名：`admin`
- 密码：`admin123`

⚠️ **首次登录后请立即修改密码！**

---

## 方式二：使用宝塔终端手动部署

### 步骤1：上传项目文件

同方式一的步骤2。

### 步骤2：安装Python环境

1. 点击左侧 **"软件商店"**
2. 搜索 **"Python项目管理器"**
3. 点击 **"安装"**

### 步骤3：创建Python虚拟环境

1. 点击左侧 **"终端"**
2. 执行以下命令：

```bash
# 进入项目目录
cd /www/wwwroot/it-ticket-system

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤4：配置环境变量

同方式一的步骤3。

### 步骤5：创建数据库

同方式一的步骤4。

### 步骤6：创建Supervisor守护进程

1. 点击左侧 **"软件商店"**
2. 找到 **"Supervisor管理器"**，点击 **"设置"**
3. 点击 **"添加守护进程"**
4. 填写信息：
   - 名称：`it-ticket-system`
   - 运行目录：`/www/wwwroot/it-ticket-system`
   - 启动命令：
   ```bash
   /www/wwwroot/it-ticket-system/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```
   - 进程数量：`1`
5. 点击 **"确定"**

### 步骤7：启动服务

1. 在Supervisor管理器中找到 `it-ticket-system`
2. 点击 **"启动"**
3. 查看状态是否为 **"运行中"**

### 步骤8：配置Nginx

同方式一的步骤6。

### 步骤9：测试访问

同方式一的步骤9。

---

## 方式三：使用宝塔Python项目管理器

### 步骤1：上传项目文件

同方式一的步骤2。

### 步骤2：添加Python项目

1. 点击左侧 **"软件商店"**
2. 找到 **"Python项目管理器"**，点击 **"设置"**
3. 点击 **"添加项目"**
4. 填写信息：
   - 项目名称：`IT工单系统`
   - 项目路径：`/www/wwwroot/it-ticket-system`
   - Python版本：选择 `Python 3.9+`
   - 框架：选择 `其他`
   - 启动方式：选择 `gunicorn`
   - 启动命令：
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```
   - 端口：`8000`
5. 点击 **"提交"**

### 步骤3：配置环境变量

1. 在Python项目管理器中找到项目
2. 点击 **"设置"**
3. 点击 **"环境变量"**
4. 添加以下变量：
   - `DB_HOST=127.0.0.1`
   - `DB_PORT=3306`
   - `DB_USER=it_ticket_user`
   - `DB_PASSWORD=your_password`
   - `DB_NAME=it_ticket_system`
   - `SECRET_KEY=your_secret_key`
5. 点击 **"保存"**

### 步骤4：创建数据库

同方式一的步骤4。

### 步骤5：启动项目

1. 在Python项目管理器中找到项目
2. 点击 **"启动"**
3. 查看状态是否为 **"运行中"**

### 步骤6：配置Nginx

同方式一的步骤6。

### 步骤7：测试访问

同方式一的步骤9。

---

## 常见问题解决

### 问题1：无法访问8000端口

**原因**：防火墙未开放端口或云服务商安全组未配置。

**解决方案**：

1. **宝塔防火墙**：
   - 点击左侧 **"安全"**
   - 添加端口 `8000`
   - 点击 **"放行"**

2. **云服务商安全组**（阿里云/腾讯云/AWS等）：
   - 登录云服务商控制台
   - 找到 **"安全组"** 或 **"防火墙"**
   - 添加入站规则：
     - 端口：`8000`
     - 协议：`TCP`
     - 来源：`0.0.0.0/0`（允许所有IP）

3. **系统防火墙**（如果使用）：
```bash
# 开放8000端口
sudo ufw allow 8000/tcp
```

### 问题2：数据库连接失败

**错误信息**：`Can't connect to MySQL server`

**解决方案**：

1. 检查数据库是否创建：
   - 点击左侧 **"数据库"**
   - 查看是否有 `it_ticket_system` 数据库

2. 检查数据库用户权限：
   - 点击数据库右侧的 **"权限"**
   - 确保用户有 **"所有权限"**

3. 检查.env配置：
   - 确保 `DB_HOST=127.0.0.1`（不是localhost）
   - 确保密码正确

4. 测试数据库连接：
```bash
mysql -h 127.0.0.1 -u it_ticket_user -p
# 输入密码后应该能登录
```

### 问题3：Docker容器无法启动

**错误信息**：`Error response from daemon`

**解决方案**：

1. 查看详细错误：
```bash
docker logs it-ticket-system
```

2. 检查端口占用：
```bash
netstat -tulpn | grep 8000
```

3. 如果端口被占用，停止占用进程：
```bash
# 查找进程ID
lsof -i :8000

# 停止进程
kill -9 <PID>
```

4. 重新启动容器：
```bash
docker restart it-ticket-system
```

### 问题4：Nginx反向代理不生效

**现象**：访问域名显示404或502错误。

**解决方案**：

1. 检查应用是否运行：
```bash
curl http://127.0.0.1:8000
```

2. 检查Nginx配置：
   - 点击站点 **"设置"** → **"配置文件"**
   - 确保有反向代理配置

3. 重启Nginx：
   - 点击左侧 **"软件商店"**
   - 找到 **"Nginx"**
   - 点击 **"重启"**

4. 查看Nginx错误日志：
   - 点击站点 **"设置"** → **"日志"**
   - 查看错误日志

### 问题5：WebSocket连接失败

**现象**：实时通知不工作。

**解决方案**：

1. 确保Nginx配置了WebSocket支持（见步骤6）

2. 检查浏览器控制台是否有错误：
   - 按F12打开开发者工具
   - 查看Console和Network标签

3. 如果使用HTTPS，确保WebSocket使用wss://协议

### 问题6：Python依赖安装失败

**错误信息**：`pip install failed`

**解决方案**：

1. 更新pip：
```bash
pip install --upgrade pip
```

2. 使用国内镜像源：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

3. 如果某个包安装失败，单独安装：
```bash
pip install <package-name>
```

### 问题7：权限问题

**错误信息**：`Permission denied`

**解决方案**：

1. 修改项目目录权限：
```bash
chown -R www:www /www/wwwroot/it-ticket-system
chmod -R 755 /www/wwwroot/it-ticket-system
```

2. 如果使用Docker，确保Docker有权限访问目录

### 问题8：内存不足

**错误信息**：`Cannot allocate memory`

**解决方案**：

1. 检查服务器内存：
```bash
free -h
```

2. 减少gunicorn worker数量：
   - 将 `-w 4` 改为 `-w 2`

3. 增加swap空间：
```bash
# 创建2GB swap
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 部署成功检查清单

- [ ] 项目文件已上传
- [ ] .env文件已配置
- [ ] 数据库已创建
- [ ] 应用已启动（Docker或Supervisor）
- [ ] 8000端口可以访问
- [ ] Nginx反向代理已配置
- [ ] 域名可以访问（如果配置了）
- [ ] SSL证书已配置（推荐）
- [ ] 防火墙端口已开放
- [ ] 可以正常登录系统
- [ ] WebSocket连接正常
- [ ] 已修改默认管理员密码

---

## 快速命令参考

```bash
# 查看Docker容器状态
docker ps

# 查看Docker日志
docker logs -f it-ticket-system

# 重启Docker容器
docker restart it-ticket-system

# 进入项目目录
cd /www/wwwroot/it-ticket-system

# 查看应用日志
tail -f /www/wwwroot/it-ticket-system/logs/app.log

# 测试数据库连接
mysql -h 127.0.0.1 -u it_ticket_user -p

# 测试应用是否运行
curl http://127.0.0.1:8000

# 查看端口占用
netstat -tulpn | grep 8000

# 查看服务器IP
curl ifconfig.me
```

---

## 访问地址

部署成功后，可以通过以下方式访问：

1. **直接访问**：`http://your-server-ip:8000`
2. **通过域名**：`http://ticket.yourdomain.com`
3. **HTTPS访问**：`https://ticket.yourdomain.com`

**默认登录信息**：
- 用户名：`admin`
- 密码：`admin123`

⚠️ **首次登录后请立即修改密码！**

---

## 需要帮助？

如果遇到其他问题，请：

1. 查看Docker日志：`docker logs -f it-ticket-system`
2. 查看Nginx错误日志：宝塔面板 → 网站 → 设置 → 日志
3. 查看系统日志：`tail -f /var/log/syslog`
4. 参考其他文档：
   - [DEPLOYMENT.md](DEPLOYMENT.md) - 通用部署指南
   - [PORT_CONFLICT_SOLUTION.md](PORT_CONFLICT_SOLUTION.md) - 端口冲突解决
   - [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - Docker问题排查

---

**祝您部署顺利！** 🎉
