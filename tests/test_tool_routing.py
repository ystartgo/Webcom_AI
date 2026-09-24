#!/usr/bin/env python3
"""
test_tool_routing.py - Unit tests for Webcom AI Tool Routing & Upstream Sync
"""

import unittest
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_ROOT / "hermes_bridge" / "schema" / "hermes_tools_manifest.json"
ADAPTERS_DIR = PROJECT_ROOT / "hermes_bridge" / "adapters"

class TestHermesToolRouting(unittest.TestCase):
    def setUp(self):
        self.assertTrue(MANIFEST_PATH.exists(), "hermes_tools_manifest.json must exist")
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            self.manifest = json.load(f)

    def test_manifest_structure(self):
        """Verify manifest contains version, tools, and toolsets."""
        self.assertIn("version", self.manifest)
        self.assertIn("tools", self.manifest)
        self.assertIn("toolsets", self.manifest)
        
        tools = self.manifest["tools"]
        self.assertGreaterEqual(len(tools), 100, "Manifest should track >= 100 Hermes tools")

    def test_tier_assignments(self):
        """Verify key tools are assigned to the correct execution tiers."""
        tools = self.manifest["tools"]
        
        # Tier 1 (Pure WASM)
        self.assertEqual(tools["run_python"]["tier"], 1)
        self.assertEqual(tools["todo"]["tier"], 1)
        self.assertEqual(tools["memory"]["tier"], 1)
        self.assertEqual(tools["clarify"]["tier"], 1)
        
        # Tier 2 (Direct HTTP)
        self.assertEqual(tools["web_search"]["tier"], 2)
        self.assertEqual(tools["switch_model"]["tier"], 2)
        self.assertEqual(tools["lm_studio_status"]["tier"], 2)
        
        # Tier 3 (Host Daemon Delegated)
        self.assertEqual(tools["terminal"]["tier"], 3)
        self.assertEqual(tools["process"]["tier"], 3)
        self.assertEqual(tools["gpu_info"]["tier"], 3)
        self.assertEqual(tools["comfyui_generate"]["tier"], 3)
        self.assertEqual(tools["tts_server_generate"]["tier"], 3)

    def test_adapters_exist(self):
        """Verify adapter scaffolding files were generated for tools."""
        tools = self.manifest["tools"]
        for tool_name, info in list(tools.items())[:10]: # check first 10
            adapter_path = PROJECT_ROOT / info["adapter"]
            self.assertTrue(adapter_path.exists(), f"Adapter missing for {tool_name}: {adapter_path}")

    def test_sync_report_exists(self):
        """Verify sync_report.md exists and is populated."""
        report_path = PROJECT_ROOT / "sync" / "sync_report.md"
        self.assertTrue(report_path.exists())
        content = report_path.read_text(encoding="utf-8")
        self.assertIn("Hermes Agent Upstream 同步比對報告", content)

if __name__ == "__main__":
    unittest.main()
