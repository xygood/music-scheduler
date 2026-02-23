#!/bin/bash

# 音乐排课系统 - 阿里云部署脚本
# 使用方法: ./deploy.sh

set -e

echo "=========================================="
echo "音乐排课系统 - 阿里云部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以root运行
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}请不要以root用户运行此脚本${NC}"
   exit 1
fi

# 配置变量
APP_NAME="music-scheduler"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="${1:-your-domain.com}"

echo -e "${YELLOW}部署域名: $DOMAIN${NC}"

# 1. 系统更新和依赖安装
echo -e "${YELLOW}[1/8] 安装系统依赖...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx git curl build-essential

# 2. 安装Node.js
echo -e "${YELLOW}[2/8] 安装Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi
node -v
npm -v

# 3. 安装PM2
echo -e "${YELLOW}[3/8] 安装PM2进程管理器...${NC}"
sudo npm install -g pm2

# 4. 创建应用目录
echo -e "${YELLOW}[4/8] 创建应用目录...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 5. 复制项目文件
echo -e "${YELLOW}[5/8] 复制项目文件...${NC}"
# 如果是本地部署，复制当前目录
if [ -d ".git" ]; then
    echo "检测到Git仓库，使用Git部署..."
    # 这里可以改为git clone
    cp -r . $APP_DIR
else
    echo "复制本地文件..."
    cp -r . $APP_DIR
fi

cd $APP_DIR

# 6. 部署后端
echo -e "${YELLOW}[6/8] 部署后端服务...${NC}"
cd $APP_DIR/server

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
pip install gunicorn eventlet

# 创建环境变量文件
if [ ! -f .env ]; then
    cat > .env << EOF
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite:///music_scheduler.db
EOF
fi

# 使用PM2启动后端
cd $APP_DIR
pm2 delete $APP_NAME-api 2>/dev/null || true
pm2 start server/app.py --name $APP_NAME-api --interpreter python3 -- --host=127.0.0.1 --port=5000
pm2 save
pm2 startup systemd -u $USER --hp $HOME

# 7. 部署前端
echo -e "${YELLOW}[7/8] 部署前端应用...${NC}"
cd $APP_DIR

# 安装依赖
npm install

# 创建生产环境配置
cat > .env.production << EOF
VITE_API_URL=/api
VITE_WS_URL=/
VITE_USE_DATABASE=true
EOF

# 构建生产版本
npm run build

# 复制到Nginx目录
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 8. 配置Nginx
echo -e "${YELLOW}[8/8] 配置Nginx...${NC}"

# 替换域名
sed "s/your-domain.com/$DOMAIN/g" nginx.conf > /tmp/nginx-$APP_NAME.conf

# 复制配置
sudo cp /tmp/nginx-$APP-name.conf /etc/nginx/sites-available/$APP_NAME
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
sudo ufw allow 'Nginx Full' 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

echo ""
echo "=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "=========================================="
echo ""
echo "应用信息:"
echo "  - 域名: http://$DOMAIN"
echo "  - 后端API: http://$DOMAIN/api"
echo "  - 应用目录: $APP_DIR"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs $APP_NAME-api"
echo "  重启后端: pm2 restart $APP_NAME-api"
echo "  重启Nginx: sudo systemctl restart nginx"
echo ""
echo "下一步:"
echo "  1. 配置DNS解析，将 $DOMAIN 指向服务器IP"
echo "  2. 配置SSL证书: sudo certbot --nginx -d $DOMAIN"
echo ""
