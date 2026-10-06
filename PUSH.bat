@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0push.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [!] 執行異常，結束代碼: %errorlevel%
    pause
)
