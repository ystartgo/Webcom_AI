#!/bin/bash
# Webcom AI 完整啟動腳本

echo "================================================================"
echo "  Webcom AI 完整啟動"
echo "================================================================"
echo ""

# 檢查是否在虛擬環境中運行
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -d ".venv" ]; then
        echo "[INFO] Activating virtual environment..."
        source .venv/bin/activate
    else
        echo "[ERROR] Virtual environment not found"
        echo "[INFO] Creating virtual environment..."
        python3 -m venv .venv
        source .venv/bin/activate
    fi
fi

# 安裝依賴
echo "[INFO] Checking dependencies..."
python -c "import fastapi, uvicorn, pydantic" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INFO] Installing dependencies..."
    pip install --upgrade pip setuptools wheel
    pip install -r daemon/requirements.txt
fi

# 檢查端口
echo "[INFO] Checking port 8001..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# 啟動服務
echo "[INFO] Starting Webcom AI on http://127.0.0.1:8001"
echo "[INFO] Web UI: http://127.0.0.1:8001/web/index.html"
echo "[INFO] API Docs: http://127.0.0.1:8001/docs"
echo ""
echo "按下 Ctrl+C 停止服務"
echo ""

python daemon/server.py