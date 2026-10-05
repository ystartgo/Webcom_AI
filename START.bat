@echo off
REM ================================================================
REM Webcom AI - Host Daemon & Console Launcher
REM Author: startgo (startgo@yia.app)
REM License: GPLv3
REM Version: v1.0.4
REM ================================================================
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "SERVER_EXIT_CODE=0"
set "SCRIPT_DIR=%~dp0"
set "PY_DIR=%SCRIPT_DIR%python"
set "PY_EXE=%PY_DIR%\python.exe"

title Webcom AI - Host Daemon and Console Launcher
cd /d "%SCRIPT_DIR%"

echo ================================================================
echo   Webcom AI [Webcom + Hermes Agent WASM Console]
echo   啟動器 / Console ^& Daemon Launcher
echo ================================================================
echo.

REM ================================================================
REM 1. Ensure project-local Python folder exists
REM ================================================================
if not exist "%PY_DIR%" (
    mkdir "%PY_DIR%" >nul 2>&1
    echo [INFO] Created local Python folder: %PY_DIR%
)

REM ================================================================
REM 2. Find usable Python interpreter
REM ================================================================
echo [INFO] Checking Python 3 environment...
set "PY="

if exist "%PY_EXE%" (
    "%PY_EXE%" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%PY_EXE%"
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

python -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=python"
    goto :PYTHON_FOUND
)

py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3"
    goto :PYTHON_FOUND
)

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

REM ================================================================
REM 3. If Python is missing, download a local installer into project folder
REM ================================================================
echo.
echo [WARN] No usable Python 3 detected on this machine.
echo [*] Downloading a project-local Python 3.12 installer into %PY_DIR% ...

a) 
if not exist "%PY_DIR%\python-3.12.8-amd64.exe" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe' -OutFile '%PY_DIR%\python-3.12.8-amd64.exe'" >nul 2>&1
)

if exist "%PY_DIR%\python-3.12.8-amd64.exe" (
    echo [INFO] Installing Python 3.12 into local project folder...
    "%PY_DIR%\python-3.12.8-amd64.exe" /quiet InstallAllUsers=0 PrependPath=0 TargetDir="%PY_DIR%\Python312" >nul 2>&1
    if exist "%PY_DIR%\Python312\python.exe" (
        set "PY=%PY_DIR%\Python312\python.exe"
        echo [OK] Project-local Python installed successfully.
        goto :PYTHON_FOUND
    )
)

echo.
echo [ERROR] Python installation failed.
echo [*] Please install Python 3.10+ manually:
 echo       https://www.python.org/downloads/
 echo [*] Then reopen this launcher or run "python -m pip install -r daemon\requirements.txt".
 goto :PAUSE_EXIT

:PYTHON_FOUND
echo [OK] Python found: %PY%

REM ================================================================
REM 4. Verify core dependencies
REM ================================================================
echo [INFO] Verifying core dependencies...
set "PYTHONIOENCODING=utf-8"

%PY% -c "import fastapi, uvicorn, pydantic, concurrent_log_handler, dateutil" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Missing packages detected, installing via pip...
    if exist "%SCRIPT_DIR%daemon\requirements.txt" (
        %PY% -m pip install --upgrade pip setuptools wheel
        %PY% -m pip install -r "%SCRIPT_DIR%daemon\requirements.txt"
    ) else (
        echo [INFO] Installing base packages...
        %PY% -m pip install fastapi uvicorn pydantic concurrent-log-handler python-dateutil
    )
    if errorlevel 1 (
        echo [ERROR] pip install failed. Check network or permissions.
        set "SERVER_EXIT_CODE=1"
        goto :PAUSE_EXIT
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Core dependencies are ready.
)

REM ================================================================
REM 5. Check backend entry point
REM ================================================================
echo [INFO] Checking service entry point...
if not exist "%SCRIPT_DIR%daemon\server.py" (
    echo [ERROR] Entry point not found: %SCRIPT_DIR%daemon\server.py
    set "SERVER_EXIT_CODE=2"
    goto :PAUSE_EXIT
)

REM ================================================================
REM 6. Release port 8001 if occupied by a previous run
REM ================================================================
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM ================================================================
REM 7. Launch browser and start daemon
REM ================================================================
echo [INFO] Starting Webcom AI Host Daemon on http://127.0.0.1:8001...
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8001"

echo [INFO] Service running in foreground [Press Ctrl+C to stop]...
echo.
%PY% "%SCRIPT_DIR%daemon\server.py"
set "SERVER_EXIT_CODE=%errorlevel%"

echo.
echo ================================================================
if %SERVER_EXIT_CODE% neq 0 (
    echo [ERROR] Service exited abnormally, code: %SERVER_EXIT_CODE%
) else (
    echo [OK] Service stopped normally.
)
echo ================================================================

goto :PAUSE_EXIT

:PAUSE_EXIT
echo.
echo Press any key to close this window...
pause >nul
exit /b %SERVER_EXIT_CODE%
