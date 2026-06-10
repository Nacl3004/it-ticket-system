# 快速访问指南

## 🌐 如何访问系统

### 本地部署

如果您在本地电脑上部署：

```
http://localhost:8000
```

---

### 云服务器部署

如果您在云服务器上部署，有以下几种访问方式：

#### 1. 使用公网IP（最简单）

```
http://your-server-ip:8000
```

**示例**：
- `http://123.45.67.89:8000`
- `http://47.98.123.45:8000`

**如何获取服务器IP**：

```bash
# 在服务器上执行
curl ifconfig.me
```

#### 2. 使用域名

如果您有域名，先配置DNS解析，然后访问：

```
http://your-domain.com:8000
```

**示例**：
- `http://ticket.example.com:8000`
- `http://it.company.com:8000`

#### 3. 使用Nginx（推荐）

配置Nginx后，可以直接使用80端口：

```
http://your-server-ip
或
http://your-domain.com
```

#### 4. 使用HTTPS（生产环境推荐）

配置SSL证书后：

```
https://your-domain.com
```

---

## 🔧 部署后必做

### 1. 开放防火墙端口

```bash
# 开放8000端口
sudo ufw allow 8000/tcp

# 如果使用Nginx，还需要开放80和443端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 2. 配置云服务商安全组

在云服务商控制台（阿里云、腾讯云、AWS等）：
- 添加入站规则：允许 8000、80、443 端口
- 来源：0.0.0.0/0（允许所有IP访问）

### 3. 测试访问

```bash
# 在服务器上测试
curl http://localhost:8000

# 在本地电脑测试
curl http://your-server-ip:8000
```

---

## 📋 访问地址对照表

| 部署环境 | 访问地址 | 端口要求 | 适用场景 |
|---------|---------|---------|---------|
| 本地开发 | `http://localhost:8000` | 无 | 开发测试 |
| 云服务器（直接） | `http://your-server-ip:8000` | 开放8000 | 快速测试 |
| 云服务器（域名） | `http://your-domain.com:8000` | 开放8000 | 正式使用 |
| 云服务器（Nginx） | `http://your-server-ip` | 开放80 | 推荐方式 |
| 云服务器（Nginx+域名） | `http://your-domain.com` | 开放80 | 推荐方式 |
| 云服务器（HTTPS） | `https://your-domain.com` | 开放443 | 生产环境 |

---

## 🚨 常见问题

### 无法访问系统

**检查清单**：

1. ✅ 服务是否运行：`docker-compose ps`
2. ✅ 端口是否监听：`netstat -tulpn | grep 8000`
3. ✅ 防火墙是否开放：`sudo ufw status`
4. ✅ 安全组是否配置：登录云服务商控制台检查
5. ✅ IP地址是否正确：`curl ifconfig.me`

### WebSocket连接失败

**解决方案**：

1. 配置Nginx支持WebSocket
2. 或使用HTTPS访问

详细说明请查看：[CLOUD_SERVER_DEPLOYMENT.md](CLOUD_SERVER_DEPLOYMENT.md)

---

## 📞 获取帮助

- **云服务器部署**：查看 [CLOUD_SERVER_DEPLOYMENT.md](CLOUD_SERVER_DEPLOYMENT.md)
- **通用部署指南**：查看 [DEPLOYMENT.md](DEPLOYMENT.md)
- **端口冲突问题**：查看 [PORT_CONFLICT_SOLUTION.md](PORT_CONFLICT_SOLUTION.md)
- **Docker问题**：查看 [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)

---

## 🎯 快速命令

```bash
# 查看服务器IP
curl ifconfig.me

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 测试访问
curl http://localhost:8000
```

---

**默认登录信息**：
- 用户名：`admin`
- 密码：`admin123`

**⚠️ 首次登录后请立即修改密码！**
