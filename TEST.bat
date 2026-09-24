@echo off
chcp 65001 >nul
title Webcom AI - Tool Routing & Sync Unit Tests
echo ================================================================
echo   Running Webcom AI Unit Tests
echo ================================================================
echo.

cd /d "%~dp0"
python -m unittest tests\test_tool_routing.py

echo.
pause
