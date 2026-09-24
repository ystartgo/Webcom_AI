@echo off
REM ================================================================
REM Webcom AI - Host Daemon & Console Launcher
REM Author: startgo (startgo@yia.app)
REM License: GPLv3
REM Version: v1.0.2
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

REM 1. 智慧尋找可用之 Python 直譯器 [排除 WindowsApps 假捷徑]
echo [INFO] 正在檢查 Python 3 執行環境...
set "PY="

REM 優先檢查系統 PATH 中的 python 是否為真實可用環境
python -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=python"
    goto :PYTHON_FOUND
)

REM 檢查官方 py launcher [Windows 預設常駐在 C:\Windows\py.exe]
py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3"
    goto :PYTHON_FOUND
)

REM 搜尋常見 Python 預設安裝路徑 [適用於未勾選 Add Python to PATH 之電腦]
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
echo [WARN] 未在系統中檢測到可用的 Python 3 環境。
echo [INFO] 自動切換至 [純 Browser WASM 模式] 啟動...
if exist "%~dp0web\index.html" (
    start "" "%~dp0web\index.html"
    echo [OK] 已在預設瀏覽器中開啟純前端 WASM 主控台。
) else (
    echo [ERROR] 找不到前端檔案: %~dp0web\index.html
)
echo.
echo 提示: 若需使用本機 Shell、檔案讀寫或 GPU 探針，請安裝 Python:
echo 👉 https://www.python.org/downloads/ [安裝時請勾選 Add python.exe to PATH]
goto :PAUSE_EXIT

:PYTHON_FOUND
echo [OK] 找到可用之 Python: %PY%

REM 2. 驗證核心相依套件 [fastapi, uvicorn, pydantic]
echo [INFO] 正在驗證核心相依套件...
%PY% -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if errorlevel 1 (
    echo [INFO] 缺少部分依賴套件，正在透過 pip 自動安裝...
    if exist "%~dp0daemon\requirements.txt" (
        %PY% -m pip install -r "%~dp0daemon\requirements.txt"
    ) else (
        echo [INFO] 未找到 requirements.txt，直接安裝核心套件...
        %PY% -m pip install fastapi uvicorn pydantic
    )
    if errorlevel 1 (
        echo [ERROR] pip 套件安裝失敗。請檢查網路連線或系統權限。
        set "SERVER_EXIT_CODE=1"
        goto :PAUSE_EXIT
    )
    echo [OK] 相依套件安裝完成。
) else (
    echo [OK] 核心相依套件已就緒。
)

REM 3. 檢查後端服務檔案
echo [INFO] 檢查服務進入點...
if not exist "%~dp0daemon\server.py" (
    echo [ERROR] 找不到進入點檔案: %~dp0daemon\server.py
    set "SERVER_EXIT_CODE=2"
    goto :PAUSE_EXIT
)

REM 4. 自動釋放被佔用之 Port 8001 [避免上次異常中斷導致崩潰]
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM 5. 啟動瀏覽器並執行主服務
echo [INFO] 正在啟動 Webcom AI 主控台: http://127.0.0.1:8001
start "" "http://127.0.0.1:8001"

echo [INFO] 服務正在前台運行中 [按 Ctrl+C 可停止服務]...
echo.
%PY% "%~dp0daemon\server.py"
set "SERVER_EXIT_CODE=%errorlevel%"

echo.
echo ================================================================
if %SERVER_EXIT_CODE% neq 0 (
    echo [ERROR] 服務行程異常終止，結束代碼: %SERVER_EXIT_CODE%
) else (
    echo [OK] 服務行程已正常停止。
)
echo ================================================================

:PAUSE_EXIT
echo.
echo 按任意鍵關閉此視窗...
pause >nul
exit /b %SERVER_EXIT_CODE%
