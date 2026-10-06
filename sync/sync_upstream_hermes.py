#!/usr/bin/env python3
"""
sync_upstream_hermes.py

Automated Upstream Synchronization & Tool Adapter Generator for Webcom AI.
Tracks updates from native Hermes Agent (zip archive, folder, or git repository),
detects schema changes, and generates adapter scaffolding for Webcom.
"""

import os
import sys
import json
import zipfile
import re
import argparse
from datetime import datetime
from pathlib import Path

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_ROOT / "hermes_bridge" / "schema" / "hermes_tools_manifest.json"
ADAPTERS_DIR = PROJECT_ROOT / "hermes_bridge" / "adapters"
REPORT_PATH = PROJECT_ROOT / "sync" / "sync_report.md"

# Known default tool classification rules (Tier 1: WASM, Tier 2: HTTP API, Tier 3: Host Daemon)
DEFAULT_TIER_RULES = {
    # Tier 1: Pure WASM / In-Browser
    "run_python": 1,
    "execute_code": 1,
    "todo": 1,
    "memory": 1,
    "clarify": 1,
    "svg": 1,
    "query_knowledge_base": 1,
    "session_search": 1,
    "search_guide": 1,
    
    # Tier 2: Direct HTTP / Fetch
    "web_search": 2,
    "web_extract": 2,
    "serper_search": 2,
    "switch_model": 2,
    "lm_studio_status": 2,
    "lm_studio_models": 2,
    "lm_studio_chat": 2,
    "lm_studio_tokenize": 2,
    "lm_studio_embed": 2,
    
    # Tier 3: Host Daemon Delegated (System & Heavy services)
    "terminal": 3,
    "process": 3,
    "execute_shell": 3,
    "read_file": 3,
    "write_file": 3,
    "patch": 3,
    "search_files": 3,
    "gpu_info": 3,
    "comfyui_status": 3,
    "comfyui_generate": 3,
    "comfyui_models": 3,
    "comfyui_instances": 3,
    "tts_server_status": 3,
    "tts_server_generate": 3,
    "tts_server_models": 3,
    "music_status": 3,
    "music_generate": 3,
    "music_models": 3,
}

def extract_tools_from_toolsets_code(code_text: str):
    """Parse toolsets.py code to extract _HERMES_CORE_TOOLS and toolset groupings."""
    tools = []
    # Match _HERMES_CORE_TOOLS = [ ... ]
    core_match = re.search(r'_HERMES_CORE_TOOLS\s*=\s*\[(.*?)\]', code_text, re.DOTALL)
    if core_match:
        content = core_match.group(1)
        raw_items = re.findall(r'["\']([a-zA-Z0-9_\-]+)["\']', content)
        tools.extend(raw_items)
        
    # Match TOOLSETS dictionary
    toolsets = {}
    toolset_matches = re.finditer(r'["\']([a-zA-Z0-9_\-]+)["\']\s*:\s*\{[^}]*?["\']tools["\']\s*:\s*\[(.*?)\]', code_text, re.DOTALL)
    for m in toolset_matches:
        name = m.group(1)
        t_list = re.findall(r'["\']([a-zA-Z0-9_\-]+)["\']', m.group(2))
        toolsets[name] = t_list
        
    return list(dict.fromkeys(tools)), toolsets

def inspect_zip_source(zip_path: Path):
    """Inspect upstream zip archive to locate toolsets.py and tools/*.py."""
    with zipfile.ZipFile(zip_path, 'r') as z:
        namelist = z.namelist()
        
        # Find toolsets.py
        toolsets_file = next((f for f in namelist if f.endswith('/toolsets.py') or f == 'toolsets.py'), None)
        if not toolsets_file:
            raise FileNotFoundError(f"Could not find toolsets.py in {zip_path}")
            
        toolsets_code = z.read(toolsets_file).decode('utf-8', errors='ignore')
        core_tools, toolsets = extract_tools_from_toolsets_code(toolsets_code)
        
        # Discover all python files under tools/
        tool_impl_files = [f for f in namelist if '/tools/' in f and f.endswith('.py') and not f.endswith('__init__.py')]
        
        return core_tools, toolsets, tool_impl_files, f"Zip Archive: {zip_path.name}"

def inspect_dir_source(dir_path: Path):
    """Inspect upstream directory to locate toolsets.py and tools/*.py."""
    toolsets_file = list(dir_path.glob("**/toolsets.py"))
    if not toolsets_file:
        raise FileNotFoundError(f"Could not find toolsets.py in {dir_path}")
        
    toolsets_code = toolsets_file[0].read_text(encoding='utf-8', errors='ignore')
    core_tools, toolsets = extract_tools_from_toolsets_code(toolsets_code)
    
    tool_impl_files = [str(p) for p in dir_path.glob("**/tools/*.py") if not p.name.startswith("__")]
    
    return core_tools, toolsets, tool_impl_files, f"Directory: {dir_path}"

def load_or_create_manifest():
    """Load existing manifest or return an empty baseline."""
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "version": "1.0.0",
        "last_sync": None,
        "upstream_source": None,
        "tools": {},
        "toolsets": {}
    }

def generate_adapter_scaffolding(tool_name: str, tier: int):
    """Generate a JS/TS adapter template for a new tool if it doesn't already exist."""
    ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    adapter_file = ADAPTERS_DIR / f"{tool_name}.js"
    
    if adapter_file.exists():
        return False
        
    tier_comments = {
        1: "Tier 1: Pure WASM / Client Browser Execution (Pyodide or JS)",
        2: "Tier 2: Direct HTTP Fetch / In-Browser API Call",
        3: "Tier 3: Delegated to Host Daemon (Port 8001 / WebSocket / REST)"
    }
    
    tier_code_template = {
        1: f"""    // Tier 1 execution: in-memory or Pyodide sandbox
    console.log(`[Adapter] Executing {tool_name} locally in WASM...`, args);
    return {{
        status: "success",
        tool: "{tool_name}",
        result: `Executed {tool_name} in WASM sandbox`
    }};""",
        2: f"""    // Tier 2 execution: fetch directly from browser
    console.log(`[Adapter] Executing {tool_name} via Direct HTTP...`, args);
    return {{
        status: "success",
        tool: "{tool_name}",
        result: `HTTP request completed for {tool_name}`
    }};""",
        3: f"""    // Tier 3 execution: forward to Webcom Host Daemon (Port 8001)
    console.log(`[Adapter] Delegating {tool_name} to Host Daemon...`, args);
    const resp = await context.callDaemon("/api/hermes/execute_tool", {{
        name: "{tool_name}",
        arguments: args
    }});
    return resp;"""
    }
    
    content = f"""/**
 * Adapter for Hermes Tool: '{tool_name}'
 * Execution Tier: {tier} ({tier_comments.get(tier, 'Custom')})
 * Auto-generated by sync_upstream_hermes.py
 */

export async function execute_{tool_name}(args = {{}}, context = {{}}) {{
{tier_code_template.get(tier, tier_code_template[3])}
}}
"""
    with open(adapter_file, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

def run_sync(upstream_path: str):
    source_path = Path(upstream_path)
    if not source_path.exists():
        print(f"[Error] Upstream source not found: {source_path}")
        return 1
        
    print(f"[*] Analyzing Upstream Hermes Source: {source_path}...")
    if source_path.is_file() and source_path.suffix.lower() == '.zip':
        upstream_tools, upstream_toolsets, impl_files, source_desc = inspect_zip_source(source_path)
    elif source_path.is_dir():
        upstream_tools, upstream_toolsets, impl_files, source_desc = inspect_dir_source(source_path)
    else:
        print("[Error] Unsupported upstream format. Must be a .zip file or a directory.")
        return 1

    manifest = load_or_create_manifest()
    existing_tools = manifest.get("tools", {})
    
    added_tools = []
    modified_tools = []
    retained_tools = []
    
    # Process tools
    for tool in upstream_tools:
        tier = DEFAULT_TIER_RULES.get(tool, 3) # default to Tier 3 if unknown
        
        if tool not in existing_tools:
            added_tools.append(tool)
            existing_tools[tool] = {
                "name": tool,
                "tier": tier,
                "description": f"Hermes Agent tool: {tool}",
                "adapter": f"hermes_bridge/adapters/{tool}.js",
                "first_seen": datetime.now().isoformat()
            }
            # Generate adapter stub
            generate_adapter_scaffolding(tool, tier)
        else:
            retained_tools.append(tool)
            # Ensure tier is populated
            if "tier" not in existing_tools[tool]:
                existing_tools[tool]["tier"] = tier

    # Check for removed tools
    removed_tools = [t for t in existing_tools if t not in upstream_tools]
    
    # Update manifest
    manifest["last_sync"] = datetime.now().isoformat()
    manifest["upstream_source"] = source_desc
    manifest["total_tools"] = len(existing_tools)
    manifest["tools"] = existing_tools
    manifest["toolsets"] = upstream_toolsets
    
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        
    # Generate sync report
    report_content = f"""# Hermes Agent Upstream 同步比對報告 (Sync Report)

- **同步執行時間**: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`
- **來源路徑**: `{source_desc}`
- **發現 Upstream 核心工具數**: `{len(upstream_tools)}`
- **發現 Toolsets 分組數**: `{len(upstream_toolsets)}`
- **發現實作檔案數**: `{len(impl_files)}`

---

## 1. 工具變更統計

| 類別 | 數量 | 說明 |
| :--- | :--- | :--- |
| 🟢 **新增工具 (Added)** | `{len(added_tools)}` | 本次新增並已自動生成 Adapter 模板 |
| 🔵 **維持工具 (Retained)** | `{len(retained_tools)}` | 兩端一致 |
| 🔴 **Upstream 缺席/廢棄 (Missing/Deprecated)** | `{len(removed_tools)}` | 原地保留本地設定以防斷連 |

### 🟢 新增工具清單
{chr(10).join([f'- `{t}` (指派 Tier {existing_tools[t]["tier"]})' for t in added_tools]) if added_tools else '_無新增工具_'}

### 🔴 Upstream 缺席工具
{chr(10).join([f'- `{t}`' for t in removed_tools]) if removed_tools else '_無缺席工具_'}

---

## 2. 工具分層 (Execution Tier) 現況

- **Tier 1 (純 WASM / 瀏覽器內執行)**: `{sum(1 for t in existing_tools.values() if t.get('tier') == 1)}` 款
- **Tier 2 (直連 HTTP / Fetch)**: `{sum(1 for t in existing_tools.values() if t.get('tier') == 2)}` 款
- **Tier 3 (Host Daemon 委派)**: `{sum(1 for t in existing_tools.values() if t.get('tier') == 3)}` 款

---

## 3. 下一步行動建議
1. 檢視 `hermes_bridge/adapters/` 內新產生的適配器檔案。
2. 若新工具有特定的 WASM / Pyodide 實作邏輯，請直接在該適配器內覆寫。
3. 執行 `TEST.bat` 驗證前端工具調用與 Daemon 探針。
"""
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(report_content)
        
    print(f"\n[+] Upstream Sync Completed Successfully!")
    print(f"    - Manifest updated: {MANIFEST_PATH}")
    print(f"    - Report generated: {REPORT_PATH}")
    print(f"    - Newly added tools: {len(added_tools)}")
    print(f"    - Total registered tools: {len(existing_tools)}")
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync Webcom AI with Upstream Hermes Agent")
    parser.add_argument(
        "--upstream",
        default=r"C:\Apps\portable-hermes-agent-main.zip",
        help="Path to upstream zip archive or extracted directory"
    )
    args = parser.parse_args()
    sys.exit(run_sync(args.upstream))
