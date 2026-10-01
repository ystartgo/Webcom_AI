@echo off
setlocal
chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

title Webcom AI - Update
echo ================================================================
echo   Webcom AI Update Utility / 一鍵更新工具
echo ================================================================
echo.

where git >nul 2>&1
if errorlevel 1 goto :UPDATE_VIA_POWERSHELL

echo [*] Pulling latest changes from origin main / 正在透過 Git 拉取最新變更...
git pull origin main
set "GIT_EXIT=%errorlevel%"

echo.
if "%GIT_EXIT%"=="0" (
    echo [OK] Webcom AI is up to date! / Webcom AI 已是最新版本！
    echo [TIP] You can now launch START.bat / 您現在可以直接執行 START.bat 啟動系統。
) else (
    echo [WARN] Git pull encountered conflicts or issues / Git 更新發生衝突或異常。
)
echo.
pause
exit /b %GIT_EXIT%

:UPDATE_VIA_POWERSHELL
echo [INFO] Git is not installed on this machine / 本機未安裝 Git 命令行工具。
echo [*] Downloading latest Webcom AI archive from GitHub / 正在自 GitHub 下載最新版更新包...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '[1/4] Downloading update package (~32 MB) / 正在下載更新包...' -ForegroundColor Cyan; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://github.com/ystartgo/Webcom_AI/archive/refs/heads/main.zip', '%SCRIPT_DIR%update.zip'); Write-Host '[2/4] Extracting package / 正在解壓縮更新檔案...' -ForegroundColor Cyan; Expand-Archive -Path '%SCRIPT_DIR%update.zip' -DestinationPath '%SCRIPT_DIR%update_temp' -Force; Write-Host '[3/4] Updating files / 正在覆蓋更新核心檔案...' -ForegroundColor Cyan; Copy-Item -Path '%SCRIPT_DIR%update_temp\Webcom_AI-main\*' -Destination '%SCRIPT_DIR%' -Recurse -Force; Write-Host '[4/4] Cleaning temporary files / 正在清理暫存檔...' -ForegroundColor Cyan; Remove-Item '%SCRIPT_DIR%update.zip' -Force; Remove-Item '%SCRIPT_DIR%update_temp' -Recurse -Force; Write-Host '✔ Update finished successfully! / Webcom AI 更新完成！' -ForegroundColor Green"

if exist "%SCRIPT_DIR%START.bat" (
    echo.
    echo [OK] Update completed successfully! / 更新成功！
    echo [TIP] You can now launch START.bat / 您現在可以直接執行 START.bat 啟動系統。
) else (
    echo.
    echo [ERROR] Update failed. Please check internet connection / 更新失敗，請檢查網路連線。
)

echo.
pause
exit /b 0
