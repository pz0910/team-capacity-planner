@echo off
chcp 65001 >nul
echo =========================================
echo   人力排期管理工具 - Team Capacity Planner
echo =========================================
echo.

cd /d "%~dp0"

echo [1/3] 清除缓存...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

echo [2/3] 检查依赖...
if not exist "node_modules" (
    echo 安装依赖...
    call npm install --no-progress --loglevel=error
) else (
    echo 依赖已安装
)

echo [3/3] 启动开发服务器...
echo.
echo =========================================
echo   访问地址: http://localhost:5173
echo   按 Ctrl+C 停止服务器
echo =========================================
echo.

npx vite --host
