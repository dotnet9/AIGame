@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PORT=6000"

echo ==========================================
echo   词宠岛 WordPet Island 后端服务
echo ==========================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo 环境: %%v
echo 监听端口: %PORT%
echo 接口: GET /api/leaderboard   POST /api/score
echo 反向代理应指向: http://127.0.0.1:%PORT%
echo.
echo 按 Ctrl+C 可停止服务
echo.

python "%~dp0tools\serve.py" %PORT%

echo.
echo [提示] 服务已退出。若无法启动，请检查端口 %PORT% 是否被占用。
pause
