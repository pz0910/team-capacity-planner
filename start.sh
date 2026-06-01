#!/bin/bash
# 人力排期管理工具 - 一键启动脚本

echo "========================================="
echo "  人力排期管理工具 - Team Capacity Planner"
echo "========================================="
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 清除 Vite 缓存
echo "[1/3] 清除缓存..."
rm -rf node_modules/.vite 2>/dev/null

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "[2/3] 安装依赖..."
    npm install --no-progress --loglevel=error
else
    echo "[2/3] 依赖已安装"
fi

# 启动开发服务器
echo "[3/3] 启动开发服务器..."
echo ""
echo "========================================="
echo "  访问地址: http://localhost:5173"
echo "  按 Ctrl+C 停止服务器"
echo "========================================="
echo ""

npx vite --host
