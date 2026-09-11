﻿@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PORT=6000"

echo ==========================================
echo   词宠岛 WordPet Island 后端服务
echo ==========================================
echo.

rem 优先 Node（纯静态依赖为零）；没有 Node 再找“真正可用”的 Python。
rem 注意：Windows 应用商店的 python.exe 占位程序会出现在 PATH 里但执行失败，必须实测。
set "RUNNER="
where node >nul 2>nul
if not errorlevel 1 set "RUNNER=node"

if not defined RUNNER (
    python -c "import sys" >nul 2>nul
    if not errorlevel 1 set "RUNNER=python"
)

if not defined RUNNER (
    echo [错误] 未检测到可用的 Node.js 或 Python，请安装其中之一：
    echo        Node.js  https://nodejs.org/            ^(推荐，无需额外依赖^)
    echo        Python   https://www.python.org/downloads/  ^(安装时勾选 Add Python to PATH^)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%RUNNER% --version 2^>^&1') do echo 运行时: %%v
echo 监听端口: %PORT%
echo 接口: GET /api/leaderboard   POST /api/score/register/login
echo 反向代理应指向: http://127.0.0.1:%PORT%
echo.
echo 按 Ctrl+C 可停止服务
echo.

if "%RUNNER%"=="node" (
    node "%~dp0tools\serve.js" %PORT%
) else (
    python "%~dp0tools\serve.py" %PORT%
)

echo.
echo [提示] 服务已退出。若无法启动，请检查端口 %PORT% 是否被占用。
pause
