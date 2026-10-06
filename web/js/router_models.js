// ================================================================
// Webcom AI - LLM Router Models Catalog & TokenTable Integrator
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

window.TOKENTABLE_OFFICIAL_MODELS = [{"id": "auto", "owned_by": "tokentable", "tier": "auto", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "智慧路由：自動挑選最適模型，副餐任務免費吃到飽", "note_en": "Smart routing: Auto selects best model, side dish unlimited"}, {"id": "claude-fable-5-1", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 10, "ctx": "1M", "note_zh": "最強旗艦（最新，可選）", "note_en": "Most capable (latest, selectable)"}, {"id": "claude-fable-5", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 10, "ctx": "1M", "note_zh": "最強旗艦（可選）", "note_en": "Most capable (selectable)"}, {"id": "claude-opus-4-8", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 6, "ctx": "1M", "note_zh": "旗艦推理", "note_en": "Flagship reasoning"}, {"id": "claude-opus-5-5", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 5, "ctx": "1M", "note_zh": "最新 Opus（可選）", "note_en": "Newest Opus (selectable)"}, {"id": "claude-opus-5", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 6, "ctx": "1M", "note_zh": "最新旗艦推理（可選）", "note_en": "Latest flagship reasoning (selectable)"}, {"id": "claude-sonnet-4-6", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 4, "ctx": "1M", "note_zh": "快速旗艦", "note_en": "Fast + intelligent"}, {"id": "claude-sonnet-5", "owned_by": "anthropic", "tier": "main", "quotaMultiplier": 4, "ctx": "1M", "note_zh": "Sonnet 新旗艦（可選）", "note_en": "Sonnet flagship (selectable)"}, {"id": "gpt-6-astra", "owned_by": "openai", "tier": "main", "quotaMultiplier": 10, "ctx": "1M", "note_zh": "GPT-6 旗艦（可選）", "note_en": "GPT-6 flagship (selectable)"}, {"id": "gpt-6-sol", "owned_by": "openai", "tier": "main", "quotaMultiplier": 4, "ctx": "1M", "note_zh": "GPT-6 — Sol（可選）", "note_en": "GPT-6 — Sol (selectable)"}, {"id": "gpt-6-luna", "owned_by": "openai", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "GPT-6 — Luna（經濟款，可選）", "note_en": "GPT-6 — Luna (cost-efficient, selectable)"}, {"id": "gpt-5.5", "owned_by": "openai", "tier": "main", "quotaMultiplier": 8, "ctx": "1M", "note_zh": "最強通用", "note_en": "General purpose"}, {"id": "gpt-5.6", "owned_by": "openai", "tier": "main", "quotaMultiplier": 5, "ctx": "1M", "note_zh": "GPT 新旗艦 — Sol（可選）", "note_en": "GPT flagship — Sol (selectable)"}, {"id": "gpt-5.6-terra", "owned_by": "openai", "tier": "main", "quotaMultiplier": 4, "ctx": "1M", "note_zh": "GPT 新旗艦 — Terra（均衡，可選）", "note_en": "GPT flagship — Terra (balanced, selectable)"}, {"id": "gpt-5.6-luna", "owned_by": "openai", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "GPT 新旗艦 — Luna（經濟款，可選）", "note_en": "GPT flagship — Luna (cost-efficient, selectable)"}, {"id": "grok-4.3", "owned_by": "xai", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "即時網路", "note_en": "Real-time web"}, {"id": "grok-4.6", "owned_by": "xai", "tier": "main", "quotaMultiplier": 4, "ctx": "500k", "note_zh": "Grok 新旗艦", "note_en": "Grok flagship (new)"}, {"id": "grok-4.7", "owned_by": "xai", "tier": "main", "quotaMultiplier": 4, "ctx": "500k", "note_zh": "Grok 最新版（可選）", "note_en": "Grok latest (selectable)"}, {"id": "grok-4.5", "owned_by": "xai", "tier": "main", "quotaMultiplier": 4, "ctx": "256k", "note_zh": "Grok 推理（可選）", "note_en": "Grok reasoning (selectable)"}, {"id": "grok-4.20-0309-non-reasoning", "owned_by": "xai", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "Grok 新世代（可選）", "note_en": "Grok next-gen (selectable)"}, {"id": "grok-4.20-0309-reasoning", "owned_by": "xai", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "Grok 新世代推理（可選）", "note_en": "Grok next-gen reasoning (selectable)"}, {"id": "gemini-3.5-flash", "owned_by": "google", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "Gemini 旗艦", "note_en": "Gemini flagship"}, {"id": "gemini-3.6-flash", "owned_by": "google", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "Gemini 新世代（可選）", "note_en": "Gemini next-gen (selectable)"}, {"id": "gemini-3.8-flash", "owned_by": "google", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "Gemini 最新世代（可選）", "note_en": "Gemini latest (selectable)"}, {"id": "mistral-large-latest", "owned_by": "mistral", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "Mistral 歐洲旗艦", "note_en": "Mistral Large (EU)"}, {"id": "kimi/kimi-k3", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 5, "ctx": "1M", "note_zh": "Kimi K3 旗艦推理（可選）", "note_en": "Kimi K3 flagship (selectable)"}, {"id": "kimi/kimi-k2.8-preview", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "Kimi K2.8 預覽版（可選）", "note_en": "Kimi K2.8 preview (selectable)"}, {"id": "zai-org/GLM-5.3-Flash", "owned_by": "togetherai", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "智譜 GLM 輕量版（可選）", "note_en": "Zhipu GLM Flash (selectable)"}, {"id": "deepseek-ai/DeepSeek-V4.1-Flash", "owned_by": "togetherai", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "DeepSeek V4.1 輕量版（可選）", "note_en": "DeepSeek V4.1 Flash (selectable)"}, {"id": "qwen3.6-plus", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "中文旗艦", "note_en": "CN flagship"}, {"id": "deepseek-v4-pro", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "128k", "note_zh": "深度推理旗艦", "note_en": "Deep reasoning Pro"}, {"id": "deepseek-v4-flash", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "深度推理快閃（最新）", "note_en": "Deep reasoning Flash (new)"}, {"id": "kimi-k2.6", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "128k", "note_zh": "程式旗艦", "note_en": "Coding flagship"}, {"id": "qwen3.7-max", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "中文智能體旗艦（最新）", "note_en": "CN agent flagship (new)"}, {"id": "qwen3.8-max", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "中文旗艦（最新，視覺）", "note_en": "CN flagship (new, vision)"}, {"id": "qwen3.7-plus", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "中文視覺旗艦（最新）", "note_en": "CN vision flagship (new)"}, {"id": "qwen-plus", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "通義千問經典旗艦", "note_en": "Qwen classic flagship"}, {"id": "qwen-flash", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "通義千問極速版", "note_en": "Qwen fast (low-latency)"}, {"id": "MiniMax-M2.5", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "中文文字（可選）", "note_en": "CN text (selectable)"}, {"id": "MiniMax/MiniMax-M3", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "中文旗艦（MiniMax M3）", "note_en": "CN flagship (MiniMax M3, MSA)"}, {"id": "MiniMax/MiniMax-M2.7", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "中文智能體（MiniMax M2.7）", "note_en": "CN agentic (MiniMax M2.7)"}, {"id": "glm-5.2", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "智譜 GLM 旗艦（最新）", "note_en": "Zhipu GLM flagship (new)"}, {"id": "ZHIPU/GLM-5.3", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "智譜 GLM 次世代（可選）", "note_en": "Zhipu GLM next-gen (selectable)"}, {"id": "glm-5.3-prime", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 3, "ctx": "1M", "note_zh": "智譜 GLM-5.3 Prime（高速版，可選）", "note_en": "Zhipu GLM-5.3 Prime (fast, selectable)"}, {"id": "unisound/unisound-u2", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "160k", "note_zh": "雲知聲 U2 智能體旗艦（可選）", "note_en": "Unisound U2 agent flagship (selectable)"}, {"id": "xiaomi/mimo-v2.5-pro", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 1, "ctx": "1M", "note_zh": "小米 MiMo 旗艦（新）", "note_en": "Xiaomi MiMo flagship (new)"}, {"id": "kimi-k2.7-code", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "Kimi K2.7 程式旗艦（最新）", "note_en": "Kimi K2.7 coding (new)"}, {"id": "qwen3-max", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "中文旗艦 Max（可選）", "note_en": "CN max (selectable)"}, {"id": "kimi-k2.5", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "Kimi K2.5 程式（可選）", "note_en": "Kimi K2.5 coding (selectable)"}, {"id": "glm-5.1", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "智譜 GLM（可選）", "note_en": "Zhipu GLM (selectable)"}, {"id": "qwen3.5-plus", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "1M", "note_zh": "通義千問視覺語言旗艦（可選）", "note_en": "Qwen3.5 Plus vision-language (selectable)"}, {"id": "kimi-k2-thinking", "owned_by": "alibaba", "tier": "main", "quotaMultiplier": 2, "ctx": "256k", "note_zh": "Kimi K2 思考模式（可選）", "note_en": "Kimi K2 thinking (selectable)"}, {"id": "qwen3-vl-plus", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "視覺理解：看圖讀圖（高階視覺，不佔主餐配額）", "note_en": "Vision understanding: high capability, does not use main quota"}, {"id": "qwen3-vl-flash", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "視覺理解：看圖讀圖（極速視覺，不佔主餐配額）", "note_en": "Vision understanding: fast speed, does not use main quota"}, {"id": "wan2.7-image", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "圖片生成：WAN 2.7 提示詞插圖／產品圖", "note_en": "Image generation: WAN 2.7 prompt to image"}, {"id": "wan2.6-t2v", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "影片生成：WAN 2.6 文字／圖片生影片", "note_en": "Video generation: WAN 2.6 text/image to video"}, {"id": "kling/kling-v3-omni-image-generation", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "圖片生成：快手 Kling V3 全能生圖", "note_en": "Image generation: Kling V3 Omni Image"}, {"id": "kling/kling-v3-omni-video-generation", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "影片生成：快手 Kling V3 全能生短片", "note_en": "Video generation: Kling V3 Omni Video"}, {"id": "qwen-image-3.0", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "圖片生成：通義千問 Qwen Image 3.0", "note_en": "Image generation: Qwen Image 3.0"}, {"id": "happyhorse-1.1-t2v", "owned_by": "alibaba", "tier": "side", "quotaMultiplier": 0, "ctx": "1M", "note_zh": "影片生成：HappyHorse 1.1 動畫與短片生成", "note_en": "Video generation: HappyHorse 1.1 animation & video"}];

window.enrichTokenTableModels = function(fetchedModels) {
    const officialMap = new Map(window.TOKENTABLE_OFFICIAL_MODELS.map(m => [m.id, m]));
    return fetchedModels.map(m => {
        const off = officialMap.get(m.id);
        if (off) {
            return {
                ...m,
                tier: off.tier || m.tier,
                quotaMultiplier: (off.quotaMultiplier !== undefined) ? off.quotaMultiplier : m.quotaMultiplier,
                ctx: off.ctx || m.ctx,
                note_zh: off.note_zh || m.note_zh,
                note_en: off.note_en || m.note_en,
                owned_by: off.owned_by || m.owned_by
            };
        }
        return m;
    });
};

// Global helper method for rendering detected models in Router Settings modal
window.renderRouterDetectedModels = function(app, models, endpoint = '') {
    const container = document.getElementById('router-models-container');
    const listEl = document.getElementById('router-models-list');
    const countEl = document.getElementById('router-models-count');
    const filterPills = document.getElementById('router-models-filter-pills');
    const theApp = app || window.webcomApp || window.app;
    const isZh = (theApp?.currentLang !== 'en');
    if (!container || !listEl) return;

    if (!Array.isArray(models) || models.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    if (theApp) {
        theApp.detectedModels = models;
        theApp.detectedModelsFilter = theApp.detectedModelsFilter || 'all';
    }

    const activeProfId = theApp?.activeProfileId;
    const isTt = (endpoint && endpoint.includes('tokentable')) || (theApp?.profiles && theApp.profiles[activeProfId]?.id === 'tokentable');
    if (filterPills) {
        filterPills.style.display = isTt ? 'flex' : 'none';
    }

    const updateList = () => {
        const query = (document.getElementById('router-models-search')?.value || '').trim().toLowerCase();
        const filter = (theApp && theApp.detectedModelsFilter) || 'all';

        const filtered = models.filter(m => {
            const id = (m.id || '').toLowerCase();
            const note = (m.note_zh || m.note_en || m.description || '').toLowerCase();
            const owned = (m.owned_by || '').toLowerCase();
            const tier = (m.tier || '').toLowerCase();
            const mult = Number(m.quotaMultiplier || 0);

            // Filter by category
            if (filter === 'main') {
                if (tier !== 'main' && mult <= 0 && id !== 'claude' && !id.startsWith('gpt') && !id.startsWith('grok') && !id.startsWith('gemini')) return false;
            } else if (filter === 'side') {
                if (tier === 'main' || mult > 0) return false;
            }

            if (query) {
                return id.includes(query) || note.includes(query) || owned.includes(query);
            }
            return true;
        });

        if (countEl) {
            countEl.textContent = `${filtered.length} / ${models.length}`;
        }

        listEl.innerHTML = '';
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">${isZh ? '無符合條件的模型' : 'No matching models'}</div>`;
            return;
        }

        filtered.forEach(m => {
            const mid = m.id;
            const isAuto = mid === 'auto';
            const isSide = m.tier === 'side' || m.quotaMultiplier === 0;
            const isMain = m.tier === 'main' || (m.quotaMultiplier && m.quotaMultiplier > 0);

            let badge = '';
            if (isAuto) {
                badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950/90 text-sky-300 border border-sky-800/60 shrink-0">🤖 智能路由</span>`;
            } else if (isSide) {
                badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 shrink-0">🥗 副餐 0x</span>`;
            } else if (isMain) {
                const multStr = m.quotaMultiplier ? `${m.quotaMultiplier}x` : '主餐';
                badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/90 text-purple-300 border border-purple-800/60 shrink-0">🥩 主餐 ${multStr}</span>`;
            } else {
                badge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">模型</span>`;
            }

            const owned = m.owned_by ? `<span class="text-[10px] text-slate-400 capitalize px-1 py-0.2 bg-slate-950 rounded border border-slate-800">${m.owned_by}</span>` : '';
            const ctx = m.ctx || (m.context_window ? `${Math.round(m.context_window / 1000)}k` : (m.context_length ? `${Math.round(m.context_length / 1000)}k` : ''));
            const ctxBadge = ctx ? `<span class="text-[10px] text-slate-500 bg-slate-950 px-1 py-0.2 rounded border border-slate-800 font-mono">${ctx}</span>` : '';
            const note = isZh ? (m.note_zh || m.note_en || '') : (m.note_en || m.note_zh || '');

            const row = document.createElement('div');
            row.className = "p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 flex items-center justify-between gap-2 transition cursor-pointer group";
            row.title = isZh ? `點擊直接套用此模型：${mid}` : `Click to select model: ${mid}`;
            row.innerHTML = `
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    ${badge}
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-slate-200 group-hover:text-purple-300 text-xs truncate font-mono">${mid}</span>
                            ${owned}
                            ${ctxBadge}
                        </div>
                        ${note ? `<div class="text-[10.5px] text-slate-400 truncate mt-0.5 font-sans">${note}</div>` : ''}
                    </div>
                </div>
                <button type="button" class="px-2 py-0.5 rounded bg-purple-900/50 group-hover:bg-purple-600 text-purple-200 group-hover:text-white text-[10.5px] font-bold shrink-0 transition">
                    ${isZh ? '套用' : 'Select'}
                </button>
            `;

            row.onclick = () => {
                const modelInput = document.getElementById('cfg-prof-model');
                if (modelInput) {
                    modelInput.value = mid;
                    modelInput.focus();
                    modelInput.classList.add('border-emerald-400', 'ring-2', 'ring-emerald-400/30');
                    setTimeout(() => {
                        modelInput.classList.remove('border-emerald-400', 'ring-2', 'ring-emerald-400/30');
                    }, 800);
                    const statusEl = document.getElementById('test-conn-status');
                    if (statusEl) {
                        statusEl.innerHTML = `<span class="text-emerald-400 font-bold font-mono">✓ ${isZh ? '已選擇模型' : 'Selected'}: ${mid}</span>`;
                    }
                }
            };

            listEl.appendChild(row);
        });

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    };

    // Bind search input
    const searchInput = document.getElementById('router-models-search');
    if (searchInput && !searchInput._hasBind) {
        searchInput._hasBind = true;
        searchInput.addEventListener('input', () => updateList());
    }

    // Bind filter pills
    document.querySelectorAll('#router-models-filter-pills .btn-model-filter').forEach(btn => {
        if (!btn._hasBind) {
            btn._hasBind = true;
            btn.addEventListener('click', () => {
                if (theApp) theApp.detectedModelsFilter = btn.getAttribute('data-filter') || 'all';
                document.querySelectorAll('#router-models-filter-pills .btn-model-filter').forEach(b => {
                    const active = (b === btn);
                    b.className = active
                        ? "btn-model-filter px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-600 text-white transition cursor-pointer"
                        : "btn-model-filter px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer";
                });
                updateList();
            });
        }
    });

    updateList();
};
