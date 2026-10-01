@echo off
chcp 65001 >nul
title Webcom AI - Git Pull Update
echo ================================================================
echo   Updating Webcom AI from GitHub (git pull origin main)
echo ================================================================
echo.

cd /d "%~dp0"

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo [TIP]   Please install Git for Windows: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [*] Pulling latest changes from origin main...
git pull origin main

if %errorlevel% equ 0 (
    echo.
    echo [✔] Webcom AI is up to date!
    echo [TIP] You can now launch START.bat to run the latest version.
) else (
    echo.
    echo [!] Git pull encountered an issue.
    echo [TIP] If you modified local files, you can run:
    echo       git stash
    echo       git pull origin main
    echo       git stash pop
)

echo.
pause
