@echo off
chcp 65001 >nul
title Webcom AI - Host Daemon & Console Launcher
echo ================================================================
echo   Webcom AI (Webcom + Hermes Agent WASM Console)
echo ================================================================
echo.

cd /d "%~dp0"

echo [*] Checking Python environment...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Python not found in PATH!
    echo [*] Launching purely in Browser WASM mode...
    start "" "%~dp0web\index.html"
    goto END
)

echo [*] Checking required packages...
python -c "import fastapi, uvicorn, pydantic" >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Installing required dependencies (fastapi, uvicorn, pydantic)...
    pip install -r daemon\requirements.txt
)

echo [*] Launching Webcom AI Host Daemon on http://127.0.0.1:8001...
start "" "http://127.0.0.1:8001"
python daemon\server.py

:END
pause
