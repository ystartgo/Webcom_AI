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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading update package...'; Invoke-WebRequest -Uri 'https://github.com/ystartgo/Webcom_AI/archive/refs/heads/main.zip' -OutFile '%SCRIPT_DIR%update.zip'; Write-Host 'Extracting update...'; Expand-Archive -Path '%SCRIPT_DIR%update.zip' -DestinationPath '%SCRIPT_DIR%update_temp' -Force; Copy-Item -Path '%SCRIPT_DIR%update_temp\Webcom_AI-main\*' -Destination '%SCRIPT_DIR%' -Recurse -Force; Remove-Item '%SCRIPT_DIR%update.zip' -Force; Remove-Item '%SCRIPT_DIR%update_temp' -Recurse -Force; Write-Host 'Update finished successfully!'"
    if exist "%SCRIPT_DIR%START.bat" (
        echo.
        echo [OK] Update completed successfully!
        echo [TIP] You can now launch START.bat.
    ) else (
        echo.
        echo [ERROR] Update failed. Please check your internet connection.
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
