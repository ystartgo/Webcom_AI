# Hermes Agent Upstream 同步比對報告 (Sync Report)

- **同步執行時間**: `2026-09-24 10:28:57`
- **來源路徑**: `Zip Archive: portable-hermes-agent-main.zip`
- **發現 Upstream 核心工具數**: `101`
- **發現 Toolsets 分組數**: `49`
- **發現實作檔案數**: `710`

---

## 1. 工具變更統計

| 類別 | 數量 | 說明 |
| :--- | :--- | :--- |
| 🟢 **新增工具 (Added)** | `101` | 本次新增並已自動生成 Adapter 模板 |
| 🔵 **維持工具 (Retained)** | `0` | 兩端一致 |
| 🔴 **Upstream 缺席/廢棄 (Missing/Deprecated)** | `0` | 原地保留本地設定以防斷連 |

### 🟢 新增工具清單
- `web_search` (指派 Tier 2)
- `web_extract` (指派 Tier 2)
- `terminal` (指派 Tier 3)
- `process` (指派 Tier 3)
- `read_file` (指派 Tier 3)
- `write_file` (指派 Tier 3)
- `patch` (指派 Tier 3)
- `search_files` (指派 Tier 3)
- `vision_analyze` (指派 Tier 3)
- `image_generate` (指派 Tier 3)
- `skills_list` (指派 Tier 3)
- `skill_view` (指派 Tier 3)
- `skill_manage` (指派 Tier 3)
- `browser_navigate` (指派 Tier 3)
- `browser_snapshot` (指派 Tier 3)
- `browser_click` (指派 Tier 3)
- `browser_type` (指派 Tier 3)
- `browser_scroll` (指派 Tier 3)
- `browser_back` (指派 Tier 3)
- `browser_press` (指派 Tier 3)
- `browser_get_images` (指派 Tier 3)
- `browser_vision` (指派 Tier 3)
- `browser_console` (指派 Tier 3)
- `browser_cdp` (指派 Tier 3)
- `browser_dialog` (指派 Tier 3)
- `browser-use` (指派 Tier 3)
- `browser_exec` (指派 Tier 3)
- `text_to_speech` (指派 Tier 3)
- `todo` (指派 Tier 1)
- `memory` (指派 Tier 1)
- `session_search` (指派 Tier 1)
- `clarify` (指派 Tier 1)
- `execute_code` (指派 Tier 1)
- `delegate_task` (指派 Tier 3)
- `cronjob` (指派 Tier 3)
- `ha_list_entities` (指派 Tier 3)
- `ha_get_state` (指派 Tier 3)
- `ha_list_services` (指派 Tier 3)
- `ha_call_service` (指派 Tier 3)
- `kanban_show` (指派 Tier 3)
- `kanban_list` (指派 Tier 3)
- `kanban_complete` (指派 Tier 3)
- `kanban_block` (指派 Tier 3)
- `kanban_request_review` (指派 Tier 3)
- `kanban_request_changes` (指派 Tier 3)
- `kanban_heartbeat` (指派 Tier 3)
- `kanban_comment` (指派 Tier 3)
- `kanban_create` (指派 Tier 3)
- `kanban_link` (指派 Tier 3)
- `kanban_unblock` (指派 Tier 3)
- `kanban_attach` (指派 Tier 3)
- `kanban_attach_url` (指派 Tier 3)
- `kanban_attachments` (指派 Tier 3)
- `computer_use` (指派 Tier 3)
- `run_python` (指派 Tier 1)
- `gpu_info` (指派 Tier 3)
- `switch_model` (指派 Tier 2)
- `lm_studio_status` (指派 Tier 2)
- `lm_studio_models` (指派 Tier 2)
- `lm_studio_load` (指派 Tier 3)
- `lm_studio_unload` (指派 Tier 3)
- `lm_studio_search` (指派 Tier 3)
- `lm_studio_download` (指派 Tier 3)
- `lm_studio_model_info` (指派 Tier 3)
- `lm_studio_tokenize` (指派 Tier 2)
- `lm_studio_embed` (指派 Tier 2)
- `lm_studio_chat` (指派 Tier 2)
- `music_status` (指派 Tier 3)
- `music_generate` (指派 Tier 3)
- `music_models` (指派 Tier 3)
- `music_model_load` (指派 Tier 3)
- `music_model_unload` (指派 Tier 3)
- `music_outputs` (指派 Tier 3)
- `music_install` (指派 Tier 3)
- `tts_server_status` (指派 Tier 3)
- `tts_server_generate` (指派 Tier 3)
- `tts_server_models` (指派 Tier 3)
- `tts_server_model_load` (指派 Tier 3)
- `tts_server_model_unload` (指派 Tier 3)
- `tts_server_voices` (指派 Tier 3)
- `tts_server_jobs` (指派 Tier 3)
- `comfyui_status` (指派 Tier 3)
- `comfyui_instances` (指派 Tier 3)
- `comfyui_instance_start` (指派 Tier 3)
- `comfyui_instance_stop` (指派 Tier 3)
- `comfyui_generate` (指派 Tier 3)
- `comfyui_models` (指派 Tier 3)
- `comfyui_nodes` (指派 Tier 3)
- `update_hermes` (指派 Tier 3)
- `check_hermes_updates` (指派 Tier 3)
- `create_tool` (指派 Tier 3)
- `delete_tool` (指派 Tier 3)
- `list_custom_tools` (指派 Tier 3)
- `workflow_create` (指派 Tier 3)
- `workflow_run` (指派 Tier 3)
- `workflow_list` (指派 Tier 3)
- `workflow_delete` (指派 Tier 3)
- `workflow_show` (指派 Tier 3)
- `workflow_schedule` (指派 Tier 3)
- `serper_search` (指派 Tier 2)
- `search_guide` (指派 Tier 1)

### 🔴 Upstream 缺席工具
_無缺席工具_

---

## 2. 工具分層 (Execution Tier) 現況

- **Tier 1 (純 WASM / 瀏覽器內執行)**: `7` 款
- **Tier 2 (直連 HTTP / Fetch)**: `9` 款
- **Tier 3 (Host Daemon 委派)**: `85` 款

---

## 3. 下一步行動建議
1. 檢視 `hermes_bridge/adapters/` 內新產生的適配器檔案。
2. 若新工具有特定的 WASM / Pyodide 實作邏輯，請直接在該適配器內覆寫。
3. 執行 `TEST.bat` 驗證前端工具調用與 Daemon 探針。
