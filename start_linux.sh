#!/bin/bash
# Linux 啟動腳本 for Webcom AI

echo "================================================================"
echo "  Webcom AI [Webcom + Hermes Agent WASM Console]"
echo "  Linux 啟動器 / Console & Daemon Launcher"
echo "================================================================"
echo ""

# 檢查虛擬環境是否存在
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    echo "[OK] Virtual environment created"
fi

# 使用虛擬環境的 Python
PYTHON_CMD=".venv/bin/python"
if [ ! -f "$PYTHON_CMD" ]; then
    echo "[ERROR] Virtual environment Python not found"
    exit 1
fi

echo "[OK] Using Python from virtual environment: $($PYTHON_CMD --version)"

# 檢查依賴套件
echo "[INFO] Checking dependencies..."
$PYTHON_CMD -c "import fastapi, uvicorn, pydantic, requests, numpy, PIL" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INFO] Installing required packages..."
    if [ -f "daemon/requirements.txt" ]; then
        $PYTHON_CMD -m pip install --upgrade pip setuptools wheel
        $PYTHON_CMD -m pip install -r daemon/requirements.txt
    else
        $PYTHON_CMD -m pip install fastapi uvicorn pydantic requests numpy Pillow opencv-python-headless
    fi
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
    echo "[OK] Dependencies installed successfully"
else
    echo "[OK] Core dependencies are ready"
fi

# 檢查服務入口點
if [ ! -f "daemon/server.py" ]; then
    echo "[ERROR] Entry point not found: daemon/server.py"
    exit 2
fi

# 釋放端口 8001
echo "[INFO] Checking port 8001..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# 啟動瀏覽器並啟動服務
echo "[INFO] Starting Webcom AI Host Daemon on http://127.0.0.1:8001..."
echo "[INFO] Service will start in foreground [Press Ctrl+C to stop]..."

# 嘗試開啟瀏覽器
if command -v xdg-open >/dev/null 2>&1; then
    (sleep 2 && xdg-open "http://127.0.0.1:8001" >/dev/null 2>&1) &
fi

# 啟動 FastAPI 服務
cd "$(dirname "$0")"
$PYTHON_CMD daemon/server.py