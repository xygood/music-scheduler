#!/bin/bash

echo "================================"
echo "  音乐排课系统 - Cpolar内网穿透安装"
echo "================================"
echo ""

# 1. 下载Cpolar
echo "步骤1: 下载Cpolar..."
cd /tmp
wget https://www.cpolar.com/static/downloads/cpolar-linux-amd64.zip -O cpolar.zip

if [ $? -ne 0 ]; then
    echo "下载失败，尝试使用curl..."
    curl -L https://www.cpolar.com/static/downloads/cpolar-linux-amd64.zip -o cpolar.zip
fi

echo "下载完成!"
echo ""

# 2. 解压
echo "步骤2: 解压文件..."
unzip -o cpolar.zip

if [ $? -ne 0 ]; then
    echo "解压失败，请安装unzip: sudo apt install unzip"
    exit 1
fi

echo "解压完成!"
echo ""

# 3. 安装
echo "步骤3: 安装Cpolar..."
sudo cpolar install

if [ $? -ne 0 ]; then
    echo "安装失败，请尝试手动安装"
    exit 1
fi

echo "安装完成!"
echo ""

# 4. 启动后端服务
echo "步骤4: 启动音乐排课系统后端服务..."
cd /workspace/music-scheduler/backend

# 检查是否已安装依赖
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# 启动服务（后台运行）
echo "启动Flask服务..."
nohup python teacher_management.py > ../backend.log 2>&1 &
BACKEND_PID=$!

echo "后端服务已启动 (PID: $BACKEND_PID)"
sleep 2

# 5. 启动Cpolar
echo ""
echo "步骤5: 启动Cpolar内网穿透..."
echo "选择穿透类型:"
echo "  1) 临时穿透（随机域名）- 快速测试"
echo "  2) 固定域名 - 需要注册Cpolar账号"
echo ""
read -p "请选择 (1/2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "启动临时穿透（随机域名）..."
    echo "按 Ctrl+C 可停止服务"
    echo ""
    cpolar http 5000
elif [ "$choice" = "2" ]; then
    echo ""
    echo "启动固定域名穿透..."
    echo "请先在 https://cpolar.com 注册账号并获取Authtoken"
    echo ""
    read -p "请输入您的Authtoken: " authtoken
    cpolar authtoken $authtoken
    echo ""
    echo "按 Ctrl+C 可停止服务"
    echo ""
    cpolar http 5000 --region=cn
else
    echo "无效选择，使用临时穿透..."
    cpolar http 5000
fi
