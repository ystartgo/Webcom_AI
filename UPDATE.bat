@echo off
REM ================================================================
REM Webcom AI - One-Click Git & Asset Updater
REM Portable architecture: Checks Git, provides clear fallback
REM ================================================================
setlocal
chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

title Webcom AI - Update
echo ================================================================
echo   Webcom AI — 一鍵更新工具
echo ================================================================
echo.

REM 1. 檢查系統是否安裝 Git
where git >nul 2>&1
if errorlevel 1 (
    echo [提示] 本機未安裝 Git 命令行工具。
    echo.
    echo 若您是透過 GitHub 下載 ZIP 壓縮檔使用，更新方式：
    echo 1. 前往 GitHub 專案頁面：
    echo    https://github.com/ystartgo/Webcom_AI
    echo 2. 點擊綠色【Code】按鈕 -^> 【Download ZIP】
    echo 3. 解壓縮並覆蓋本目錄即可完成更新。
    echo.
    echo (若欲使用一鍵自動更新，可安裝 Git for Windows: https://git-scm.com/)
    echo.
    pause
    exit /b 0
)

REM 2. 使用 Git 同步最新程式碼
echo [*] 正在從 GitHub (origin/main) 拉取最新更新...
git pull origin main
set "GIT_EXIT=%errorlevel%"

echo.
if "%GIT_EXIT%"=="0" (
    echo [✔] Webcom AI 已成功更新至最新版本！
    echo [提示] 您現在可以直接執行 START.bat 啟動服務。
) else (
    echo [!] 更新遇到衝突或錯誤。
    echo 若本地有修改過設定檔，可嘗試依序輸入以下指令解決衝突：
    echo   git stash
    echo   git pull origin main
    echo   git stash pop
)

echo.
pause
exit /b %GIT_EXIT%
