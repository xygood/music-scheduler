# 阿里云部署指南

## 服务器要求

- **ECS实例**: 2核4G或以上
- **操作系统**: Ubuntu 20.04/22.04 LTS
- **带宽**: 5Mbps以上
- **域名**: 建议配置域名并申请SSL证书

## 部署架构

```
用户浏览器 ←→ 阿里云ECS
                ↓
            Nginx (反向代理 + SSL)
                ↓
            ┌─────────────────┐
            │  Flask后端API   │ ←→ SQLite/PostgreSQL
            │  (Port 5000)    │
            └─────────────────┘
                ↓
            ┌─────────────────┐
            │  React前端      │
            │  (静态文件)     │
            └─────────────────┘
```

## 快速部署步骤

### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y python3-pip python3-venv nginx git curl

# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装PM2进程管理器
sudo npm install -g pm2

# 安装certbot用于SSL证书
sudo apt install -y certbot python3-certbot-nginx
```

### 2. 部署后端

```bash
# 创建应用目录
sudo mkdir -p /var/www/music-scheduler
sudo chown -R $USER:$USER /var/www/music-scheduler

# 克隆代码
cd /var/www/music-scheduler
git clone https://github.com/yourusername/music-scheduler.git .

# 创建Python虚拟环境
cd server
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
pip install gunicorn eventlet

# 创建环境变量文件
cat > .env << 'EOF'
FLASK_ENV=production
SECRET_KEY=your-secret-key-here-change-this
DATABASE_URL=sqlite:///music_scheduler.db
EOF

# 使用PM2启动后端
cd /var/www/music-scheduler
pm2 start server/app.py --name music-scheduler-api --interpreter python3
pm2 save
pm2 startup
```

### 3. 部署前端

```bash
cd /var/www/music-scheduler

# 安装依赖
npm install

# 创建生产环境配置
cat > .env.production << 'EOF'
VITE_API_URL=/api
VITE_WS_URL=/
VITE_USE_DATABASE=true
EOF

# 构建生产版本
npm run build

# 将构建文件复制到Nginx目录
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

### 4. 配置Nginx

```bash
# 创建Nginx配置文件
sudo tee /etc/nginx/sites-available/music-scheduler << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket支持
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/music-scheduler /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 5. 配置SSL证书（HTTPS）

```bash
# 使用Certbot自动配置SSL
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 6. 防火墙配置

```bash
# 配置阿里云安全组规则：
# - 开放 80 端口 (HTTP)
# - 开放 443 端口 (HTTPS)
# - 开放 5000 端口（仅允许内网访问，可选）

# 配置UFW防火墙（如果使用）
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 环境变量配置

### 后端环境变量 (`server/.env`)

```bash
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///music_scheduler.db
# 或使用PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/music_scheduler
```

### 前端环境变量 (`.env.production`)

```bash
VITE_API_URL=/api
VITE_WS_URL=/
VITE_USE_DATABASE=true
```

## 常用维护命令

```bash
# 查看后端日志
pm2 logs music-scheduler-api

# 重启后端
pm2 restart music-scheduler-api

# 查看Nginx状态
sudo systemctl status nginx

# 重启Nginx
sudo systemctl restart nginx

# 查看系统资源使用
htop

# 备份数据库
cp /var/www/music-scheduler/server/music_scheduler.db /backup/music_scheduler_$(date +%Y%m%d).db
```

## 故障排查

### 1. 后端无法启动

```bash
# 检查日志
pm2 logs music-scheduler-api

# 检查端口占用
sudo lsof -i :5000

# 测试后端直接运行
cd /var/www/music-scheduler/server
source venv/bin/activate
python app.py
```

### 2. Nginx 502错误

```bash
# 检查后端是否运行
pm2 status

# 检查Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 检查后端健康
curl http://127.0.0.1:5000/api/health
```

### 3. WebSocket连接失败

```bash
# 检查Nginx配置中的WebSocket支持
# 确保 proxy_set_header Upgrade 和 Connection 正确配置

# 测试WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Host: your-domain.com" -H "Origin: https://your-domain.com" \
  http://127.0.0.1:5000/socket.io/
```

## 更新部署

```bash
cd /var/www/music-scheduler

# 拉取最新代码
git pull origin main

# 更新后端依赖
cd server
source venv/bin/activate
pip install -r requirements.txt

# 更新前端
cd /var/www/music-scheduler
npm install
npm run build
sudo cp -r dist/* /var/www/html/

# 重启服务
pm2 restart music-scheduler-api
sudo systemctl restart nginx
```

## 性能优化建议

1. **使用PostgreSQL替代SQLite** - 提高并发性能
2. **启用Gzip压缩** - Nginx配置中添加 `gzip on`
3. **使用CDN** - 静态资源使用阿里云OSS+CDN
4. **数据库连接池** - 配置SQLAlchemy连接池
5. **Redis缓存** - 缓存频繁查询的数据

## 安全建议

1. **定期更新SSL证书** - Certbot会自动续期
2. **配置防火墙** - 仅开放必要端口
3. **定期备份数据** - 设置自动备份脚本
4. **监控日志** - 配置日志告警
5. **使用强密码** - 修改默认管理员密码
