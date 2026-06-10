# 云服务器部署指南

## 重要说明

本系统部署在**云服务器**上，需要通过**公网IP或域名**访问，而不是 localhost。

---

## 快速部署步骤

### 1. 连接到云服务器

```bash
# 使用SSH连接到云服务器
ssh root@your-server-ip

# 或使用密钥登录
ssh -i /path/to/your-key.pem root@your-server-ip
```

### 2. 上传代码到服务器

**方式一：使用Git**

```bash
# 在服务器上克隆代码
cd /opt
git clone <your-repository-url>
cd it-ticket-system
```

**方式二：使用SCP上传**

```bash
# 在本地执行，上传代码到服务器
scp -r /path/to/it-ticket-system root@your-server-ip:/opt/
```

**方式三：使用FTP工具**

使用 FileZilla、WinSCP 等工具上传代码到服务器的 `/opt/it-ticket-system` 目录。

### 3. 运行快速部署脚本

```bash
cd /opt/it-ticket-system
chmod +x deploy.sh
sudo ./deploy.sh
```

选择部署方式（推荐选择 1）：
- 1) 使用Docker Compose部署（推荐）
- 2) 仅构建Docker镜像
- 3) 直接部署（需要Python和MySQL）

### 4. 配置防火墙

**开放必要的端口**：

```bash
# 如果使用ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8000/tcp  # 应用端口
sudo ufw allow 80/tcp    # HTTP（如果使用Nginx）
sudo ufw allow 443/tcp   # HTTPS（如果使用Nginx）
sudo ufw enable

# 如果使用firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

**如果使用云服务商的安全组**：

在云服务商控制台（阿里云、腾讯云、AWS等）配置安全组规则：
- 入站规则：允许 22、8000、80、443 端口
- 出站规则：允许所有

### 5. 访问系统

部署完成后，通过以下方式访问：

#### 方式一：使用公网IP（推荐用于测试）

```
http://your-server-ip:8000
```

例如：
- `http://123.45.67.89:8000`
- `http://47.98.123.45:8000`

#### 方式二：使用域名（推荐用于生产）

如果您有域名，先配置DNS解析：

1. 在域名服务商控制台添加A记录：
   - 主机记录：`@` 或 `www`
   - 记录类型：`A`
   - 记录值：`your-server-ip`
   - TTL：`600`

2. 等待DNS生效（通常5-10分钟）

3. 访问：
   ```
   http://your-domain.com:8000
   ```

#### 方式三：使用Nginx反向代理（推荐用于生产）

如果配置了Nginx，可以直接使用80端口访问：

```
http://your-server-ip
或
http://your-domain.com
```

---

## 常见问题

### Q1: 无法访问系统

**检查步骤**：

1. **检查服务是否运行**：
   ```bash
   docker-compose ps
   # 或
   docker ps
   ```

2. **检查端口是否监听**：
   ```bash
   netstat -tulpn | grep 8000
   # 或
   ss -tulpn | grep 8000
   ```

3. **检查防火墙规则**：
   ```bash
   sudo ufw status
   # 或
   sudo firewall-cmd --list-all
   ```

4. **检查云服务商安全组**：
   - 登录云服务商控制台
   - 检查安全组规则是否开放8000端口

5. **检查应用日志**：
   ```bash
   docker-compose logs -f app
   ```

### Q2: 访问提示连接超时

**原因**：防火墙或安全组未开放端口

**解决**：
1. 开放服务器防火墙端口（见上文）
2. 在云服务商控制台配置安全组规则

### Q3: 访问提示连接被拒绝

**原因**：应用未启动或端口配置错误

**解决**：
```bash
# 检查容器状态
docker-compose ps

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f
```

### Q4: WebSocket连接失败

**原因**：使用HTTP访问时，WebSocket可能被阻止

**解决**：
1. 配置Nginx支持WebSocket（见下文）
2. 或使用HTTPS访问

---

## 配置Nginx反向代理（推荐）

### 1. 安装Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/it-ticket-system
```

**配置内容**（不使用HTTPS）：

```nginx
server {
    listen 80;
    server_name your-server-ip;  # 或 your-domain.com

    # 日志配置
    access_log /var/log/nginx/it-ticket-access.log;
    error_log /var/log/nginx/it-ticket-error.log;

    # 客户端上传大小限制
    client_max_body_size 10M;

    # 代理到应用
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
        proxy_read_timeout 86400s;
    }
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/it-ticket-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 4. 访问系统

现在可以直接通过80端口访问：

```
http://your-server-ip
或
http://your-domain.com
```

---

## 配置HTTPS（推荐用于生产环境）

### 使用Let's Encrypt免费SSL证书

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动配置SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

配置完成后，访问：

```
https://your-domain.com
```

---

## 获取服务器公网IP

如果不知道服务器的公网IP，可以使用以下命令查询：

```bash
# 方法1
curl ifconfig.me

# 方法2
curl ipinfo.io/ip

# 方法3
curl icanhazip.com

# 方法4（查看网卡信息）
ip addr show
```

---

## 部署检查清单

- [ ] 代码已上传到服务器
- [ ] Docker和Docker Compose已安装
- [ ] 已运行deploy.sh脚本
- [ ] 服务已成功启动（docker-compose ps）
- [ ] 防火墙已开放8000端口
- [ ] 云服务商安全组已配置
- [ ] 可以通过公网IP访问系统
- [ ] 已修改默认管理员密码
- [ ] 已配置域名（可选）
- [ ] 已配置Nginx（可选）
- [ ] 已配置HTTPS（推荐）

---

## 访问地址总结

| 部署方式 | 访问地址 | 说明 |
|---------|---------|------|
| 直接访问应用 | `http://your-server-ip:8000` | 需要开放8000端口 |
| 使用Nginx | `http://your-server-ip` | 需要开放80端口 |
| 使用域名 | `http://your-domain.com:8000` | 需要配置DNS |
| 使用Nginx+域名 | `http://your-domain.com` | 推荐方式 |
| 使用HTTPS | `https://your-domain.com` | 生产环境推荐 |

---

## 示例：完整部署流程

假设您的服务器IP是 `123.45.67.89`，域名是 `ticket.example.com`

### 1. 连接服务器

```bash
ssh root@123.45.67.89
```

### 2. 上传代码

```bash
cd /opt
git clone https://github.com/your-repo/it-ticket-system.git
cd it-ticket-system
```

### 3. 部署应用

```bash
chmod +x deploy.sh
sudo ./deploy.sh
# 选择 1（Docker Compose部署）
```

### 4. 配置防火墙

```bash
sudo ufw allow 8000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 5. 测试访问

```bash
# 在浏览器中打开
http://123.45.67.89:8000
```

### 6. 配置域名（可选）

在域名服务商控制台：
- 添加A记录：`ticket` → `123.45.67.89`

等待DNS生效后访问：
```
http://ticket.example.com:8000
```

### 7. 配置Nginx（可选）

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/it-ticket-system
# 粘贴上面的Nginx配置
sudo ln -s /etc/nginx/sites-available/it-ticket-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

现在可以直接访问：
```
http://ticket.example.com
```

### 8. 配置HTTPS（推荐）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ticket.example.com
```

最终访问地址：
```
https://ticket.example.com
```

---

## 技术支持

如有问题，请查看：
- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署文档
- [PORT_CONFLICT_SOLUTION.md](PORT_CONFLICT_SOLUTION.md) - 端口冲突解决方案
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - Docker故障排查

---

**重要提示**：
1. 首次登录后请立即修改默认管理员密码
2. 生产环境必须配置HTTPS
3. 定期备份数据库
4. 监控服务器资源使用情况

**祝您部署顺利！** 🎉
