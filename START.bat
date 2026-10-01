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
title Webcom AI - Host Daemon and Console Launcher
cd /d "%~dp0"

echo ================================================================
echo   Webcom AI [Webcom + Hermes Agent WASM Console]
echo ================================================================
echo.

REM 1. Find usable Python interpreter (skip WindowsApps stubs)
echo [INFO] Checking Python 3 environment...
set "PY="
set "PY_CMD="

REM 1. Check local embedded or workspace python first (python\, .venv\, venv\)
if exist "%~dp0python\python.exe" (
    "%~dp0python\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0python\python.exe"
        set "PY_CMD="%~dp0python\python.exe""
        goto :PYTHON_FOUND
    )
)
if exist "%~dp0python\Scripts\python.exe" (
    "%~dp0python\Scripts\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0python\Scripts\python.exe"
        set "PY_CMD="%~dp0python\Scripts\python.exe""
        goto :PYTHON_FOUND
    )
)
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0.venv\Scripts\python.exe"
        set "PY_CMD="%~dp0.venv\Scripts\python.exe""
        goto :PYTHON_FOUND
    )
)
if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" -c "import sys; sys.exit(0)" >nul 2>&1
    if not errorlevel 1 (
        set "PY=%~dp0venv\Scripts\python.exe"
        set "PY_CMD="%~dp0venv\Scripts\python.exe""
        goto :PYTHON_FOUND
    )
)

REM 2. Check PATH python using 'where' command (skip WindowsApps stubs)
for /f "tokens=*" %%I in ('where python 2^>nul') do (
    set "CAND=%%I"
    echo !CAND! | findstr /i "WindowsApps" >nul
    if errorlevel 1 (
        "!CAND!" -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=!CAND!"
            set "PY_CMD="!CAND!""
            goto :PYTHON_FOUND
        )
    )
)

REM 3. Check Windows py launcher
py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3"
    set "PY_CMD=py -3"
    goto :PYTHON_FOUND
)

REM Search common install and package manager paths
for %%P in (
    "%LocalAppData%\hermes\hermes-agent\venv\Scripts\python.exe"
    "%LocalAppData%\Python\bin\python.exe"
    "%LocalAppData%\Programs\Python\Python314\python.exe"
    "%LocalAppData%\Programs\Python\Python313\python.exe"
    "%LocalAppData%\Programs\Python\Python312\python.exe"
    "%LocalAppData%\Programs\Python\Python311\python.exe"
    "%LocalAppData%\Programs\Python\Python310\python.exe"
    "%ProgramFiles%\Python314\python.exe"
    "%ProgramFiles%\Python313\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
    "%ProgramFiles%\Python310\python.exe"
    "C:\Python314\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\ProgramData\chocolatey\bin\python.exe"
    "%UserProfile%\scoop\apps\python\current\python.exe"
    "%UserProfile%\miniconda3\python.exe"
    "%UserProfile%\anaconda3\python.exe"
    "%UserProfile%\miniconda3\Scripts\python.exe"
    "%UserProfile%\anaconda3\Scripts\python.exe"
) do (
    if exist %%P (
        %%P -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=%%~P"
            set "PY_CMD="%%~P""
            goto :PYTHON_FOUND
        )
    )
)

REM Search registry for PythonCore installs
for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Python\PythonCore" /s /v "ExecutablePath" 2^>nul ^| findstr /i "ExecutablePath"') do (
    if exist "%%B" (
        "%%B" -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=%%B"
            set "PY_CMD="%%B""
            goto :PYTHON_FOUND
        )
    )
)
for /f "tokens=2*" %%A in ('reg query "HKLM\Software\Python\PythonCore" /s /v "ExecutablePath" 2^>nul ^| findstr /i "ExecutablePath"') do (
    if exist "%%B" (
        "%%B" -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=%%B"
            set "PY_CMD="%%B""
            goto :PYTHON_FOUND
        )
    )
)

:PYTHON_MISSING
echo [WARN] No usable Python 3 found on this system.
echo.
echo ================================================================
echo   [提示] 系統未在 PATH 或本地找到 Python 3
echo ================================================================
echo   Webcom AI 前端控制台支援純瀏覽器 WASM / Pyodide (免安裝)。
echo   若欲啟用 Port 8001 後端服務 (OCR / PPT 向量還原 / 本機 Shell)，
echo   系統正在透過 PowerShell 自動下載官方輕量可攜版 Python 3 (~15MB)...
echo ================================================================
echo.

powershell -NoProfile -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '正在下載官方 Python 3.11 輕量嵌入版 (約 15MB)...'; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile '%~dp0python.zip'; Write-Host '正在解壓縮至 %~dp0python ...'; Expand-Archive -Path '%~dp0python.zip' -DestinationPath '%~dp0python' -Force; Remove-Item '%~dp0python.zip' -Force; Write-Host 'Python 可攜環境配置完成！' }"

if exist "%~dp0python\python.exe" (
    echo.
    echo [OK] Python 3 可攜版已自動就緒！
    set "PY=%~dp0python\python.exe"
    set "PY_CMD="%~dp0python\python.exe""
    goto :PYTHON_FOUND
)

echo [INFO] Switching to pure Browser WASM mode (免後端純前端模式)...
if exist "%~dp0web\index.html" (
    start "" "%~dp0web\index.html"
    echo [OK] Opened frontend WASM console in default browser.
) else (
    echo [ERROR] Cannot find frontend file: %~dp0web\index.html
)
echo.
echo [TIP] 要啟用 Port 8001 後端服務 (OCR/PPT方塊圖向量編譯/本地Shell)，請手動安裝:
echo       1. 前往: https://www.python.org/downloads/
echo       2. 下載 Python 3.10 或 3.11 (Windows installer)
echo       3. ⚠️ 重要：安裝畫面務必勾選 【Add python.exe to PATH】
echo       4. 安裝完成後重新執行 START.bat
goto :PAUSE_EXIT

:PYTHON_FOUND
echo [OK] Python found: %PY%

REM 2. Verify ALL required dependencies
echo [INFO] Verifying dependencies...
%PY_CMD% -c "import fastapi, uvicorn, pydantic, ezdxf, cv2, numpy, PIL, pptx, pytesseract, websockets" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Missing packages detected - installing from requirements.txt...
    if exist "%~dp0daemon\requirements.txt" (
        %PY_CMD% -m pip install -r "%~dp0daemon\requirements.txt"
    ) else (
        echo [INFO] requirements.txt not found, installing core packages...
        %PY_CMD% -m pip install fastapi uvicorn pydantic ezdxf opencv-python-headless Pillow python-pptx pytesseract numpy websockets requests packaging
    )
    if errorlevel 1 (
        echo.
        echo [WARN] Automatic pip install reported an issue.
        echo [INFO] Checking if core web server packages (fastapi, uvicorn) can still run...
        %PY_CMD% -c "import fastapi, uvicorn" >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] Core packages (fastapi, uvicorn) are missing.
            echo [TIP]   Please check internet connection or run manually:
            echo         %PY_CMD% -m pip install -r daemon\requirements.txt
            set "SERVER_EXIT_CODE=1"
            goto :PAUSE_EXIT
        ) else (
            echo [WARN] Running in degraded mode: advanced vision/diagram features may require:
            echo        %PY_CMD% -m pip install -r daemon\requirements.txt
        )
    ) else (
        echo [OK] All dependencies installed successfully.
    )
) else (
    echo [OK] All dependencies are ready.
)

REM 3. Check backend entry point
echo [INFO] Checking service entry point...
if not exist "%~dp0daemon\server.py" (
    echo [ERROR] Entry point not found: %~dp0daemon\server.py
    set "SERVER_EXIT_CODE=2"
    goto :PAUSE_EXIT
)

REM 4. Release port 8001 if occupied by a previous run
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":8001 .*LISTENING"') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo [INFO] Releasing port 8001 (PID %%a)...
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM 5. Display Local LAN IP for other devices
echo.
echo ================================================================
echo   [Webcom AI Server Network Access]
echo   Local Device : http://127.0.0.1:8001
%PY_CMD% -c "import socket; [print(f'  Other Device : http://{ip}:8001') for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith('127.') and not ip.startswith('169.254.')]" 2>nul
echo ================================================================
echo.

REM 6. Launch browser with short delay so backend service finishes socket binding
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8001"

echo [INFO] Service running in foreground on 0.0.0.0:8001 [Press Ctrl+C to stop]...
echo [TIP]  If other devices cannot connect, check Windows Firewall for port 8001:
echo        netsh advfirewall firewall add rule name="WebcomAI_8001" dir=in action=allow protocol=TCP localport=8001
echo.
%PY_CMD% "%~dp0daemon\server.py"
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

