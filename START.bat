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
echo [WARN] No usable Python 3 found on this system.
echo [INFO] Switching to pure Browser WASM mode...
if exist "%~dp0web\index.html" (
    start "" "%~dp0web\index.html"
    echo [OK] Opened frontend WASM console in default browser.
) else (
    echo [ERROR] Cannot find frontend file: %~dp0web\index.html
)
echo.
echo [TIP] To enable local Shell, file I/O and GPU probe, install Python:
echo       https://www.python.org/downloads/
echo       (Check "Add python.exe to PATH" during setup)
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
