@echo off
chcp 65001 >nul
title Webcom AI - Tool Routing and Browser Tests
echo ================================================================
echo   Running Webcom AI Unit Tests
echo ================================================================
echo.

cd /d "%~dp0"
python -m unittest tests\test_tool_routing.py
if %errorlevel% neq 0 (
    echo [!] Unit tests failed!
    goto PAUSE_EXIT
)

echo.
echo ================================================================
echo   Running Browser E2E Button Validation Tests
echo ================================================================
echo.
python tests\test_browser_buttons.py
if %errorlevel% neq 0 (
    echo [!] Browser tests failed!
    goto PAUSE_EXIT
)

echo.
echo [PASS] All test suites passed successfully!

:PAUSE_EXIT
echo.
pause
