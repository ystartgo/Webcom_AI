@echo off
chcp 65001 >nul
title Webcom AI - GitHub Push
echo ================================================================
echo   Pushing Webcom AI to GitHub: https://github.com/ystartgo/Webcom_AI.git
echo ================================================================
echo.

cd /d "%~dp0"

echo [*] Pushing main branch to origin...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo [✔] Push completed successfully!
    echo 👉 Repository: https://github.com/ystartgo/Webcom_AI
) else (
    echo.
    echo [!] Push failed. Please make sure the repository is created on GitHub:
    echo     https://github.com/new?name=Webcom_AI
)

echo.
pause
