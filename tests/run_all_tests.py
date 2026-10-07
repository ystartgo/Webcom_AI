import pytest

# 引入所有測試文件和資源，以確保一個乾淨的、全面的運行環境。
pytest_plugins = ["pytest_asyncio"] # 需要支持異步測試
"""
This file should be run by PyTest to validate the entire extraction module.
It serves as documentation for running the suite:

1. Install dependencies: pip install -r requirements-dev.txt
2. Run tests: pytest Webcom_AI_temp/tests/test_extraction_utils.py \
    Webcom_AI_temp/tests/test_integration_extraction.py