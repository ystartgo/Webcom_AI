@echo off
setlocal
chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

title Webcom AI - Update
echo ================================================================
echo   Webcom AI Update Utility
echo ================================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [INFO] Git is not installed on this machine.
    echo [*] Downloading latest Webcom AI archive from GitHub...
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '[1/4] 正在自 GitHub 下載更新壓縮包 (約 32 MB)...' -ForegroundColor Cyan; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://github.com/ystartgo/Webcom_AI/archive/refs/heads/main.zip', '%SCRIPT_DIR%update.zip'); Write-Host '[2/4] 下載完成，正在解壓縮檔案...' -ForegroundColor Cyan; Expand-Archive -Path '%SCRIPT_DIR%update.zip' -DestinationPath '%SCRIPT_DIR%update_temp' -Force; Write-Host '[3/4] 正在覆蓋更新核心檔案...' -ForegroundColor Cyan; Copy-Item -Path '%SCRIPT_DIR%update_temp\Webcom_AI-main\*' -Destination '%SCRIPT_DIR%' -Recurse -Force; Write-Host '[4/4] 正在清理臨時更新暫存檔...' -ForegroundColor Cyan; Remove-Item '%SCRIPT_DIR%update.zip' -Force; Remove-Item '%SCRIPT_DIR%update_temp' -Recurse -Force; Write-Host '✔ Webcom AI 更新完成！' -ForegroundColor Green"
    if exist "%SCRIPT_DIR%START.bat" (
        echo.
        echo [OK] 更新成功！核心檔案已同步至最新版。
        echo [提示] 您現在可以直接執行 START.bat 啟動系統。
    ) else (
        echo.
        echo [錯誤] 更新失敗，請檢查網路連線後重試。
    )
    echo.
    pause
    exit /b 0
)

echo [*] Pulling latest changes from origin main...
git pull origin main
set "GIT_EXIT=%errorlevel%"

echo.
if "%GIT_EXIT%"=="0" (
    echo [OK] Webcom AI is up to date!
    echo [TIP] You can now launch START.bat.
) else (
    echo [WARN] Git pull encountered conflicts or issues.
)

echo.
pause
exit /b %GIT_EXIT%
