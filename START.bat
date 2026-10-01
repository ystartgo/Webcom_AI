@echo off
REM ================================================================
REM Webcom AI - Host Daemon & Console Launcher
REM Author: startgo (startgo@yia.app)
REM License: GPLv3
REM Version: v1.0.3
REM ================================================================
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "SERVER_EXIT_CODE=0"
title Webcom AI - Host Daemon and Console Launcher
cd /d "%~dp0"

echo ================================================================
echo   Webcom AI [Webcom + Hermes Agent WASM Console]
echo ================================================================
echo.

REM 1. Find usable Python interpreter (skip WindowsApps stubs)
echo [INFO] Checking Python 3 environment...
set "PY="

REM Check local portable python folders first
if exist "%~dp0python\python.exe" (
    "%~dp0python\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0python\python.exe"
        goto :PYTHON_FOUND
    )
)
if exist "%~dp0python_embedded\python.exe" (
    "%~dp0python_embedded\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0python_embedded\python.exe"
        goto :PYTHON_FOUND
    )
)
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0.venv\Scripts\python.exe"
        goto :PYTHON_FOUND
    )
)

REM Check system PATH python first
python -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=python"
    goto :PYTHON_FOUND
)

REM Check Windows py launcher
py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3"
    goto :PYTHON_FOUND
)

REM Search common install paths (for machines without PATH set)
for %%P in (
    "%LocalAppData%\Programs\Python\Python313\python.exe"
    "%LocalAppData%\Programs\Python\Python312\python.exe"
    "%LocalAppData%\Programs\Python\Python311\python.exe"
    "%LocalAppData%\Programs\Python\Python310\python.exe"
    "%ProgramFiles%\Python313\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
    "%ProgramFiles%\Python310\python.exe"
    "%SystemDrive%\Python312\python.exe"
    "%SystemDrive%\Python311\python.exe"
    "%SystemDrive%\Python310\python.exe"
    "%UserProfile%\miniconda3\python.exe"
    "%UserProfile%\anaconda3\python.exe"
) do (
    if exist %%P (
        %%P -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=%%~P"
            goto :PYTHON_FOUND
        )
    )
)

:PYTHON_MISSING
echo.
echo ================================================================
echo [提示] 本機未安裝任何 Python 3 環境。
echo [*] 即將自動在本機建立可攜式環境 (python\)...
echo [*] 自動自官方下載 Python 3.11 Embedded (約 10 MB) 並配置 pip...
echo ================================================================
echo.

if not exist "%~dp0python" mkdir "%~dp0python"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $pyDir = '%~dp0python'; $zipFile = Join-Path $pyDir 'python-embed.zip'; Write-Host '[1/4] 正在下載 Python 3.11.9 Embedded...' -ForegroundColor Cyan; (New-Object System.Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip', $zipFile); Write-Host '[2/4] 正在解壓縮可攜式 Python...' -ForegroundColor Cyan; Expand-Archive -Path $zipFile -DestinationPath $pyDir -Force; Remove-Item $zipFile -Force; Write-Host '[3/4] 正在解鎖 site-packages 模組路徑支援...' -ForegroundColor Cyan; Get-ChildItem -Path $pyDir -Filter '*._pth' | ForEach-Object { $c = Get-Content $_.FullName; $c = $c | ForEach-Object { if ($_ -match '^\s*#\s*import site') { 'import site' } else { $_ } }; if (-not ($c -contains 'Lib\site-packages')) { $c += 'Lib\site-packages' }; Set-Content $_.FullName $c }; Write-Host '[4/4] 正在下載並安裝 pip 套件管理器...' -ForegroundColor Cyan; $getPip = Join-Path $pyDir 'get-pip.py'; (New-Object System.Net.WebClient).DownloadFile('https://bootstrap.pypa.io/get-pip.py', $getPip); & (Join-Path $pyDir 'python.exe') $getPip --no-warn-script-location; Remove-Item $getPip -Force; Write-Host '✔ 可攜式 Python 3.11 環境配置完成！' -ForegroundColor Green"

if exist "%~dp0python\python.exe" (
    "%~dp0python\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo [OK] 可攜式 Python 初始化成功！
        set "PY=%~dp0python\python.exe"
        goto :PYTHON_FOUND
    )
)

echo.
echo [WARN] 可攜式 Python 安裝未成功，切換至純前端 WASM 離線模式...
if exist "%~dp0web\index.html" (
    start "" "%~dp0web\index.html"
    echo [OK] 已在瀏覽器開啟 WASM 控制台。
) else (
    echo [ERROR] 找不到前端檔案: %~dp0web\index.html
)
echo.
goto :PAUSE_EXIT

:PYTHON_FOUND
echo [OK] Python found: %PY%

REM 2. Verify core dependencies [fastapi, uvicorn, pydantic]
echo [INFO] Verifying core dependencies...
%PY% -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Missing packages detected, installing via pip...
    if exist "%~dp0daemon\requirements.txt" (
        %PY% -m pip install -r "%~dp0daemon\requirements.txt"
    ) else (
        echo [INFO] requirements.txt not found, installing core packages...
        %PY% -m pip install fastapi uvicorn pydantic
    )
    if errorlevel 1 (
        echo [ERROR] pip install failed. Check network or system permissions.
        set "SERVER_EXIT_CODE=1"
        goto :PAUSE_EXIT
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Core dependencies are ready.
)

REM 3. Check backend entry point
echo [INFO] Checking service entry point...
if not exist "%~dp0daemon\server.py" (
    echo [ERROR] Entry point not found: %~dp0daemon\server.py
    set "SERVER_EXIT_CODE=2"
    goto :PAUSE_EXIT
)

REM 4. Release port 8001 if occupied by a previous run
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM 5. Launch browser then start the backend service
echo [INFO] Starting Webcom AI console: http://127.0.0.1:8001
start "" "http://127.0.0.1:8001"

echo [INFO] Service running in foreground [Press Ctrl+C to stop]...
echo.
%PY% "%~dp0daemon\server.py"
set "SERVER_EXIT_CODE=%errorlevel%"

echo.
echo ================================================================
if %SERVER_EXIT_CODE% neq 0 (
    echo [ERROR] Service exited abnormally, code: %SERVER_EXIT_CODE%
) else (
    echo [OK] Service stopped normally.
)
echo ================================================================

:PAUSE_EXIT
echo.
echo Press any key to close this window...
pause >nul
exit /b %SERVER_EXIT_CODE%
