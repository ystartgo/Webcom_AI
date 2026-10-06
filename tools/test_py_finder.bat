@echo off
setlocal enabledelayedexpansion
set "PY="

echo Testing where python search...
for /f "tokens=*" %%I in ('where python 2^>nul') do (
    set "CAND=%%I"
    echo Check: !CAND!
    echo !CAND! | findstr /i "WindowsApps" >nul
    if errorlevel 1 (
        "!CAND!" -c "import sys; sys.exit(0)" >nul 2>&1
        if not errorlevel 1 (
            set "PY=!CAND!"
            goto :FOUND
        )
    ) else (
        echo   [SKIP] WindowsApps stub
    )
)

:FOUND
if defined PY (
    echo SUCCESS: Found Python: !PY!
    !PY! --version
) else (
    echo FAILED: No python found
)
