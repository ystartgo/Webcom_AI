@echo off
chcp 65001 >nul
title Webcom AI - Hermes Upstream Synchronizer
echo ================================================================
echo   Hermes Agent Upstream Synchronization & Tool Adapter Generator
echo ================================================================
echo.

cd /d "%~dp0"

set "DEFAULT_UPSTREAM=C:\Apps\portable-hermes-agent-main.zip"
if not exist "%DEFAULT_UPSTREAM%" (
    set "DEFAULT_UPSTREAM=C:\Apps\portable-hermes-agent-main"
)

echo [*] Synchronizing with Upstream: %DEFAULT_UPSTREAM%
python sync\sync_upstream_hermes.py --upstream "%DEFAULT_UPSTREAM%"

echo.
echo [*] Sync complete. Opening report...
if exist "sync\sync_report.md" (
    notepad "sync\sync_report.md"
)
pause
