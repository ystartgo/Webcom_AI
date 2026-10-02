// ================================================================
// Webcom AI - 8-Level Axiomatic-Hierarchical Taxonomy Module
// Standard: 8-Level Axiomatic-Hierarchical Classification
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    const TAXONOMY_LEVELS = {
        "L1": { name: "Universe Axiomatic Domain", nameZh: "宇宙公理域", color: "indigo", badge: "bg-indigo-950 text-indigo-300 border-indigo-700/60" },
        "L2": { name: "Main Class", nameZh: "主門類", color: "purple", badge: "bg-purple-950 text-purple-300 border-purple-700/60" },
        "L3": { name: "Division", nameZh: "部類/分科", color: "blue", badge: "bg-blue-950 text-blue-300 border-blue-700/60" },
        "L4": { name: "Section", nameZh: "專題部", color: "cyan", badge: "bg-cyan-950 text-cyan-300 border-cyan-700/60" },
        "L5": { name: "Sub-Section", nameZh: "綱要細部", color: "emerald", badge: "bg-emerald-950 text-emerald-300 border-emerald-700/60" },
        "L6": { name: "Specialty / Topic", nameZh: "專精主題", color: "amber", badge: "bg-amber-950 text-amber-300 border-amber-700/60" },
        "L7": { name: "Implementation / Method", nameZh: "實現方法", color: "orange", badge: "bg-orange-950 text-orange-300 border-orange-700/60" },
        "L8": { name: "Facet / Atomic Metric", nameZh: "面向/原子測度指標", color: "rose", badge: "bg-rose-950 text-rose-300 border-rose-700/60" }
    };

    const DEFAULT_AXIOMATIC_TAXONOMY = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "taxonomy_metadata": {
            "standard": "8-Level Axiomatic-Hierarchical Classification",
            "version": "1.0.0",
            "author": "startgo (startgo@yia.app)",
            "license": "GPLv3",
            "timestamp": "2026-10-02T10:04:00+08:00",
            "levels": {
                "L1": "Universe Axiomatic Domain",
                "L2": "Main Class",
                "L3": "Division",
                "L4": "Section",
                "L5": "Sub-Section",
                "L6": "Specialty / Topic",
                "L7": "Implementation / Method",
                "L8": "Facet / Atomic Metric"
            }
        },
        "universes": [
            {
                "level": "L1",
                "code": "U00",
                "name": "本宇宙標準公理域 (Local Standard Universe)",
                "axiomatic_constants": {
                    "spacetime_dimensions": "3+1D",
                    "speed_of_light_m_s": 299792458.0,
                    "reduced_planck_constant_j_s": 1.054571817e-34,
                    "fine_structure_constant": 0.0072973525693,
                    "gravitational_constant_m3_kg_s2": 6.6743e-11,
                    "gauge_group": "SU(3)_C x SU(2)_L x U(1)_Y"
                },
                "children": [
                    {
                        "level": "L2",
                        "code": "U00.300",
                        "name": "科技與系統工程 (Technology & Applied Engineering)",
                        "children": [
                            {
                                "level": "L3",
                                "code": "U00.300.320",
                                "name": "通訊與射頻工程 (Telecommunications & RF Engineering)",
                                "children": [
                                    {
                                        "level": "L4",
                                        "code": "U00.300.320.324",
                                        "name": "無線電波與天線陣列 (Wireless & Antenna Propagation)",
                                        "children": [
                                            {
                                                "level": "L5",
                                                "code": "U00.300.320.324.3",
                                                "name": "空間波束成形技術 (Beamforming Architecture)",
                                                "children": [
                                                    {
                                                        "level": "L6",
                                                        "code": "U00.300.320.324.35",
                                                        "name": "毫米波主動相控陣 (mmWave Active Phased Arrays)",
                                                        "children": [
                                                            {
                                                                "level": "L7",
                                                                "code": "U00.300.320.324.352",
                                                                "name": "射頻前端類比移相架構 (RF Analog Phase Shifters)",
                                                                "children": [
                                                                    {
                                                                        "level": "L8",
                                                                        "code": "U00.300.320.324.352.1",
                                                                        "name": "60GHz 帶外旁瓣抑制比與相位雜訊 (60GHz SLL & Phase Noise Metric)",
                                                                        "leaf_properties": {
                                                                            "target_metric": "SLL_dB",
                                                                            "noise_type": "PN_1MHz_dBc_Hz",
                                                                            "applicable_standard": "IEEE 802.11ad/ay"
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "level": "L2",
                        "code": "U00.100",
                        "name": "物質與時空現象 (Physical Sciences & Spacetime)",
                        "children": [
                            {
                                "level": "L3",
                                "code": "U00.100.130",
                                "name": "理論物理與基本相互作用 (Fundamental Physics & Interactions)",
                                "children": [
                                    {
                                        "level": "L4",
                                        "code": "U00.100.130.135",
                                        "name": "高能物理與場論 (High Energy & Field Theory)",
                                        "children": [
                                            {
                                                "level": "L5",
                                                "code": "U00.100.130.135.4",
                                                "name": "超越標準模型理論 (Beyond Standard Model Physics)",
                                                "children": [
                                                    {
                                                        "level": "L6",
                                                        "code": "U00.100.130.135.42",
                                                        "name": "非重子暗物質機制 (Non-Baryonic Dark Matter)",
                                                        "children": [
                                                            {
                                                                "level": "L7",
                                                                "code": "U00.100.130.135.421",
                                                                "name": "超導諧振腔軸子探測 (Axion Haloscope Resonator)",
                                                                "children": [
                                                                    {
                                                                        "level": "L8",
                                                                        "code": "U00.100.130.135.421.1",
                                                                        "name": "雙光子耦合常數測值上限 (g_aγγ Coupling Limit)",
                                                                        "leaf_properties": {
                                                                            "unit": "GeV^-1",
                                                                            "detection_method": "Primakoff_Effect",
                                                                            "target_frequency_ghz": 5.4
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "level": "L1",
                "code": "U01",
                "name": "高維膜宇宙公理域 (Bulk-Brane Multiverse Domain)",
                "axiomatic_constants": {
                    "spacetime_dimensions": "10+1D (Bulk Compactified to 4D Brane)",
                    "bulk_planck_mass_scale_tev": 10.0,
                    "scalar_field_varying_c": true,
                    "graviton_bulk_propagation": true,
                    "gauge_boson_brane_confined": true
                },
                "children": [
                    {
                        "level": "L2",
                        "code": "U01.100",
                        "name": "異域物質與高維幾何 (Exotic Physics & Hyper-Geometry)",
                        "children": [
                            {
                                "level": "L3",
                                "code": "U01.100.110",
                                "name": "膜宇宙學與幾何動力學 (Brane Cosmology & Dynamics)",
                                "children": [
                                    {
                                        "level": "L4",
                                        "code": "U01.100.110.114",
                                        "name": "跨膜滲透與交互作用 (Inter-Brane Leakage Mechanics)",
                                        "children": [
                                            {
                                                "level": "L5",
                                                "code": "U01.100.110.114.6",
                                                "name": "體引力波殘留特徵 (Bulk Graviton Infiltration Signatures)",
                                                "children": [
                                                    {
                                                        "level": "L6",
                                                        "code": "U01.100.110.114.63",
                                                        "name": "泡泡碰撞拓撲缺陷 (Bubble Collision Topological Remnants)",
                                                        "children": [
                                                            {
                                                                "level": "L7",
                                                                "code": "U01.100.110.114.632",
                                                                "name": "CMB 極化冷斑幾何分析 (CMB Cold Spot Polarization Mapping)",
                                                                "children": [
                                                                    {
                                                                        "level": "L8",
                                                                        "code": "U01.100.110.114.632.4",
                                                                        "name": "能量動量張量洩漏比 (Stress-Energy Tensor Leakage Ratio)",
                                                                        "leaf_properties": {
                                                                            "leakage_ratio_epsilon": 0.043,
                                                                            "cross_brane_tension": "1.2e19 GeV^4",
                                                                            "observable_signature": "Non_Gaussianity_fnl"
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "level": "L1",
                "code": "U02",
                "name": "變動常數強耦合宇宙公理域 (Strong-Coupled Alternative Domain)",
                "axiomatic_constants": {
                    "spacetime_dimensions": "3+1D",
                    "speed_of_light_m_s": 149896229.0,
                    "reduced_planck_constant_j_s": 2.1091436e-34,
                    "fine_structure_constant": 0.0117647,
                    "photon_effective_rest_mass_ev": 1.2e-6,
                    "broken_invariance": "Lorentz Invariance Violation (LIV)"
                },
                "children": [
                    {
                        "level": "L2",
                        "code": "U02.100",
                        "name": "變動常數力學與場論 (Modified Fundamental Fields)",
                        "children": [
                            {
                                "level": "L3",
                                "code": "U02.100.130",
                                "name": "非線性電動力學 (Nonlinear Electrodynamics)",
                                "children": [
                                    {
                                        "level": "L4",
                                        "code": "U02.100.130.133",
                                        "name": "有限光子壽命傳播理論 (Proca Field Wave Dynamics)",
                                        "children": [
                                            {
                                                "level": "L5",
                                                "code": "U02.100.130.133.4",
                                                "name": "真空色散效應 (Vacuum Phase Dispersion)",
                                                "children": [
                                                    {
                                                        "level": "L6",
                                                        "code": "U02.100.130.133.41",
                                                        "name": "普朗克尺度色散能散模型 (Planck-scale Energy Dispersion)",
                                                        "children": [
                                                            {
                                                                "level": "L7",
                                                                "code": "U02.100.130.133.411",
                                                                "name": "波長相依傳播延遲檢驗 (Wavelength-Dependent Arrival Latency)",
                                                                "children": [
                                                                    {
                                                                        "level": "L8",
                                                                        "code": "U02.100.130.133.411.1",
                                                                        "name": "真空中微波-伽馬射線群延遲 (Vacuum Microwave-Gamma Group Delay)",
                                                                        "leaf_properties": {
                                                                            "dispersion_coefficient_xi": 1.48e-5,
                                                                            "modified_cutoff_freq_ghz": 12.8,
                                                                            "attenuation_per_mpc_db": 3.2
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };

    class AxiomaticTaxonomyEngine {
        constructor() {
            this.storageKey = 'webcom_axiomatic_taxonomy';
            this.taxonomy = this.loadTaxonomy();
            this.activeSelectedCode = 'U00';
            this.collapsedNodes = new Set();
        }

        loadTaxonomy() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.universes && parsed.universes.length) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn('[Taxonomy] Error loading from storage:', e);
            }
            return JSON.parse(JSON.stringify(DEFAULT_AXIOMATIC_TAXONOMY));
        }

        saveTaxonomy() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.taxonomy));
            } catch (e) {
                console.error('[Taxonomy] Error saving to storage:', e);
            }
        }

        resetToDefault() {
            this.taxonomy = JSON.parse(JSON.stringify(DEFAULT_AXIOMATIC_TAXONOMY));
            this.saveTaxonomy();
            return this.taxonomy;
        }

        findNodeByCode(code, nodes = null) {
            if (!code) return null;
            const targetList = nodes || this.taxonomy.universes;
            for (const item of targetList) {
                if (item.code === code) return item;
                if (item.children && item.children.length) {
                    const found = this.findNodeByCode(code, item.children);
                    if (found) return found;
                }
            }
            return null;
        }

        getNodeAncestors(code) {
            if (!code) return [];
            const path = [];

            const dfs = (nodes, currentChain) => {
                for (const node of nodes) {
                    const nextChain = [...currentChain, node];
                    if (node.code === code) {
                        path.push(...nextChain);
                        return true;
                    }
                    if (node.children && node.children.length) {
                        if (dfs(node.children, nextChain)) return true;
                    }
                }
                return false;
            };

            dfs(this.taxonomy.universes, []);
            return path;
        }

        getAllNodesFlat(nodes = null) {
            const list = [];
            const traverse = (itemList) => {
                for (const item of itemList) {
                    list.push(item);
                    if (item.children && item.children.length) {
                        traverse(item.children);
                    }
                }
            };
            traverse(nodes || this.taxonomy.universes);
            return list;
        }

        getNextLevel(currentLevel) {
            const levels = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];
            const idx = levels.indexOf(currentLevel);
            if (idx >= 0 && idx < levels.length - 1) {
                return levels[idx + 1];
            }
            return null;
        }

        addChildNode(parentCode, childData) {
            const parent = this.findNodeByCode(parentCode);
            if (!parent) return { success: false, message: `找不到父層代碼「${parentCode}」` };

            const nextLevel = this.getNextLevel(parent.level);
            if (!nextLevel) return { success: false, message: `已達最底層 L8，無法再新增子層級！` };

            const code = (childData.code || '').trim();
            const name = (childData.name || '').trim();

            if (!code || !name) {
                return { success: false, message: '請填寫代碼與名稱！' };
            }

            if (this.findNodeByCode(code)) {
                return { success: false, message: `代碼「${code}」已存在，請使用不同代碼！` };
            }

            if (!parent.children) parent.children = [];

            const newNode = {
                level: nextLevel,
                code,
                name,
                children: []
            };

            if (childData.leaf_properties && nextLevel === 'L8') {
                newNode.leaf_properties = childData.leaf_properties;
            }

            parent.children.push(newNode);
            this.saveTaxonomy();
            return { success: true, node: newNode };
        }

        deleteNode(code) {
            if (!code || code === 'U00') return false;

            const dfsDelete = (list) => {
                const idx = list.findIndex(n => n.code === code);
                if (idx >= 0) {
                    list.splice(idx, 1);
                    return true;
                }
                for (const n of list) {
                    if (n.children && n.children.length) {
                        if (dfsDelete(n.children)) return true;
                    }
                }
                return false;
            };

            const deleted = dfsDelete(this.taxonomy.universes);
            if (deleted) this.saveTaxonomy();
            return deleted;
        }

        searchTaxonomy(keyword) {
            if (!keyword || !keyword.trim()) return [];
            const q = keyword.trim().toLowerCase();
            const all = this.getAllNodesFlat();
            return all.filter(n => {
                const codeMatch = n.code.toLowerCase().includes(q);
                const nameMatch = n.name.toLowerCase().includes(q);
                const constantsMatch = n.axiomatic_constants && JSON.stringify(n.axiomatic_constants).toLowerCase().includes(q);
                const leafMatch = n.leaf_properties && JSON.stringify(n.leaf_properties).toLowerCase().includes(q);
                return codeMatch || nameMatch || constantsMatch || leafMatch;
            });
        }

        focusNode(code) {
            if (!code) return false;
            const target = this.findNodeByCode(code.trim());
            if (!target) return false;
            // Expand all ancestor nodes so the focused node is visible
            const ancestors = this.getNodeAncestors(target.code);
            ancestors.forEach(anc => {
                this.collapsedNodes.delete(anc.code);
            });
            this.activeSelectedCode = target.code;
            const treeList = document.getElementById('taxonomy-tree-list');
            if (treeList) this.renderTree(treeList);
            const detailPanel = document.getElementById('taxonomy-node-detail-panel');
            if (detailPanel) this.renderDetailPanel(detailPanel, target);
            return true;
        }

        renderTree(containerEl, onSelect = null) {
            if (!containerEl) return;
            containerEl.innerHTML = '';

            const docs = (typeof window.getStorageDocs === 'function')
                ? window.getStorageDocs()
                : (JSON.parse(localStorage.getItem('webcom_rag_docs') || '[]'));

            const renderNode = (node, depth = 0) => {
                const wrapper = document.createElement('div');
                wrapper.className = "taxonomy-tree-node space-y-0.5";

                const hasChildren = node.children && node.children.length > 0;
                const isCollapsed = this.collapsedNodes.has(node.code);
                const isActive = (node.code === this.activeSelectedCode);
                const lvlInfo = TAXONOMY_LEVELS[node.level] || { name: node.level, color: "gray", badge: "bg-gray-800 text-gray-300" };

                // Count docs matching this exact code or starting with this code
                const matchingDocsCount = docs.filter(d => d.taxonomy_code && (d.taxonomy_code === node.code || d.taxonomy_code.startsWith(node.code + '.'))).length;

                const row = document.createElement('div');
                row.className = `flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition text-[11px] ${
                    isActive
                        ? 'bg-purple-900/50 border border-purple-500/70 text-white font-semibold'
                        : 'hover:bg-gray-900 text-gray-300 border border-transparent'
                }`;
                row.style.paddingLeft = `${depth * 14 + 6}px`;

                const chevronIcon = hasChildren
                    ? `<span class="toggle-chevron w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-white transition transform ${isCollapsed ? '' : 'rotate-90'}">▶</span>`
                    : `<span class="w-3.5 h-3.5 inline-block text-gray-600 text-center">•</span>`;

                const docCountBadge = matchingDocsCount > 0
                    ? `<span class="ml-auto text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono font-bold">${matchingDocsCount} 篇</span>`
                    : '';

                row.innerHTML = `
                    ${chevronIcon}
                    <span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${lvlInfo.badge}">${node.level}</span>
                    <span class="font-mono text-purple-300 font-bold tracking-tight">${node.code}</span>
                    <span class="truncate flex-1 text-gray-200" title="${node.name}">${node.name}</span>
                    ${docCountBadge}
                `;

                // Click toggle chevron
                row.querySelector('.toggle-chevron')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.collapsedNodes.has(node.code)) {
                        this.collapsedNodes.delete(node.code);
                    } else {
                        this.collapsedNodes.add(node.code);
                    }
                    this.renderTree(containerEl, onSelect);
                });

                // Click row to select
                row.addEventListener('click', () => {
                    this.activeSelectedCode = node.code;
                    this.renderTree(containerEl, onSelect);
                    const detailPanel = document.getElementById('taxonomy-node-detail-panel');
                    if (detailPanel) this.renderDetailPanel(detailPanel, node);
                    if (typeof onSelect === 'function') onSelect(node);
                });

                wrapper.appendChild(row);

                if (hasChildren && !isCollapsed) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = "tree-children space-y-0.5";
                    node.children.forEach(child => {
                        childrenContainer.appendChild(renderNode(child, depth + 1));
                    });
                    wrapper.appendChild(childrenContainer);
                }

                return wrapper;
            };

            this.taxonomy.universes.forEach(uni => {
                containerEl.appendChild(renderNode(uni, 0));
            });

            // Re-render detail panel if active node exists
            const detailPanel = document.getElementById('taxonomy-node-detail-panel');
            if (detailPanel) {
                const activeNode = this.findNodeByCode(this.activeSelectedCode) || this.taxonomy.universes[0];
                if (activeNode) this.renderDetailPanel(detailPanel, activeNode);
            }
        }

        renderDetailPanel(containerEl, node) {
            if (!containerEl || !node) return;
            const ancestors = this.getNodeAncestors(node.code);
            const lvlInfo = TAXONOMY_LEVELS[node.level] || { name: node.level, nameZh: node.level, badge: "bg-gray-800 text-gray-300" };

            // Find matching docs
            const docs = (typeof window.getStorageDocs === 'function')
                ? window.getStorageDocs()
                : (JSON.parse(localStorage.getItem('webcom_rag_docs') || '[]'));
            const matchingDocs = docs.filter(d => d.taxonomy_code && (d.taxonomy_code === node.code || d.taxonomy_code.startsWith(node.code + '.')));

            // Breadcrumb HTML
            const breadcrumbHtml = ancestors.map((anc, idx) => {
                const isLast = (idx === ancestors.length - 1);
                return `
                    <span class="inline-flex items-center gap-1 cursor-pointer hover:text-purple-300 ${isLast ? 'text-purple-300 font-bold' : 'text-gray-400'}" data-code="${anc.code}">
                        <span class="text-[9px] px-1 py-0.2 rounded font-mono ${TAXONOMY_LEVELS[anc.level]?.badge || ''}">${anc.level}</span>
                        <span class="font-mono text-[11px]">${anc.code}</span>
                    </span>
                    ${!isLast ? '<span class="text-gray-600">❯</span>' : ''}
                `;
            }).join(' ');

            // Constants HTML (if present)
            let constantsHtml = '';
            if (node.axiomatic_constants && Object.keys(node.axiomatic_constants).length) {
                const items = Object.entries(node.axiomatic_constants).map(([k, v]) => `
                    <div class="p-2 bg-black/60 rounded-lg border border-indigo-900/40 text-[11px] space-y-0.5">
                        <div class="text-indigo-400 font-mono text-[10px] uppercase font-bold">${k.replace(/_/g, ' ')}</div>
                        <div class="text-white font-mono font-semibold">${v}</div>
                    </div>
                `).join('');
                constantsHtml = `
                    <div class="space-y-1.5 p-3 rounded-xl bg-indigo-950/20 border border-indigo-700/40">
                        <div class="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                            <span>🌌 宇宙公理常數與規範群定義 (Axiomatic Constants)</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            ${items}
                        </div>
                    </div>
                `;
            }

            // Leaf Properties HTML (if present)
            let leafPropsHtml = '';
            if (node.leaf_properties && Object.keys(node.leaf_properties).length) {
                const items = Object.entries(node.leaf_properties).map(([k, v]) => `
                    <div class="p-2 bg-black/60 rounded-lg border border-rose-900/40 text-[11px] space-y-0.5">
                        <div class="text-rose-400 font-mono text-[10px] uppercase font-bold">${k.replace(/_/g, ' ')}</div>
                        <div class="text-white font-mono font-semibold">${v}</div>
                    </div>
                `).join('');
                leafPropsHtml = `
                    <div class="space-y-1.5 p-3 rounded-xl bg-rose-950/20 border border-rose-700/40">
                        <div class="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                            <span>🎯 面向與原子指標參數 (Leaf Properties & Metric)</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            ${items}
                        </div>
                    </div>
                `;
            }

            // Matching Docs HTML
            let docsHtml = '';
            if (matchingDocs.length > 0) {
                const docItems = matchingDocs.map(d => `
                    <div class="p-2.5 bg-black rounded-lg border border-gray-800 text-xs flex items-center justify-between gap-2">
                        <div class="truncate flex-1">
                            <span class="text-emerald-400 font-bold font-sans">${d.title}</span>
                            <span class="text-[10px] text-gray-500 font-mono ml-2">(${d.taxonomy_code})</span>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 shrink-0">${d.category || 'general'}</span>
                    </div>
                `).join('');
                docsHtml = `
                    <div class="space-y-2 pt-1">
                        <div class="flex items-center justify-between text-xs font-bold text-gray-300">
                            <span>📚 掛載於此層級之 RAG 文件 (${matchingDocs.length} 篇)</span>
                        </div>
                        <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            ${docItems}
                        </div>
                    </div>
                `;
            } else {
                docsHtml = `
                    <div class="p-3 bg-black/40 rounded-lg border border-gray-800/60 text-center text-xs text-gray-500 font-mono">
                        尚無文件掛載於此層級代碼 (${node.code})
                    </div>
                `;
            }

            const canAddChild = node.level !== 'L8';
            const nextLvl = this.getNextLevel(node.level);

            containerEl.innerHTML = `
                <!-- Breadcrumbs -->
                <div class="p-2 bg-black rounded-lg border border-gray-800 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 scrollbar-thin">
                    ${breadcrumbHtml}
                </div>

                <!-- Node Header Card -->
                <div class="p-4 bg-gray-900 rounded-xl border border-gray-800 space-y-2">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xs px-2 py-0.5 rounded font-bold uppercase font-mono ${lvlInfo.badge}">
                                ${node.level}: ${lvlInfo.nameZh}
                            </span>
                            <code class="text-sm font-bold font-mono text-purple-300 bg-black px-2.5 py-0.5 rounded border border-purple-800/50">${node.code}</code>
                        </div>
                        <span class="text-[10px] text-gray-400 font-mono">${lvlInfo.name}</span>
                    </div>
                    <h3 class="text-base font-bold text-white tracking-wide">${node.name}</h3>
                </div>

                ${constantsHtml}
                ${leafPropsHtml}
                ${docsHtml}

                <!-- Action Bar -->
                <div class="pt-2 border-t border-gray-800 flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <button type="button" id="btn-apply-taxonomy-code" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow">
                            <span>🧭 套用代碼至新文件</span>
                        </button>
                        <button type="button" id="btn-copy-taxonomy-code" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs transition cursor-pointer flex items-center gap-1 font-mono">
                            <span>📋 複製代碼</span>
                        </button>
                        <button type="button" id="btn-filter-taxonomy-docs" class="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs transition cursor-pointer flex items-center gap-1">
                            <span>🔍 篩選此層文件</span>
                        </button>
                    </div>
                    ${canAddChild ? `
                    <button type="button" id="btn-add-child-taxonomy-node" class="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/60 text-xs font-semibold transition cursor-pointer flex items-center gap-1">
                        <span>➕ 新增 ${nextLvl} 子層級</span>
                    </button>
                    ` : ''}
                </div>
            `;

            // Breadcrumb click handlers
            containerEl.querySelectorAll('[data-code]').forEach(el => {
                el.addEventListener('click', () => {
                    const code = el.getAttribute('data-code');
                    const targetNode = this.findNodeByCode(code);
                    if (targetNode) {
                        this.activeSelectedCode = code;
                        const treeList = document.getElementById('taxonomy-tree-list');
                        if (treeList) this.renderTree(treeList);
                        this.renderDetailPanel(containerEl, targetNode);
                    }
                });
            });

            // Copy Code Button
            containerEl.querySelector('#btn-copy-taxonomy-code')?.addEventListener('click', (e) => {
                navigator.clipboard.writeText(node.code);
                const btn = e.currentTarget;
                const prev = btn.innerHTML;
                btn.innerHTML = '<span>✅ 已複製！</span>';
                setTimeout(() => btn.innerHTML = prev, 1500);
            });

            // Apply Code to Document Form
            containerEl.querySelector('#btn-apply-taxonomy-code')?.addEventListener('click', () => {
                const docTaxInput = document.getElementById('rag-doc-taxonomy-code');
                if (docTaxInput) docTaxInput.value = node.code;
                const knowTaxInput = document.getElementById('knowledge-edit-taxonomy-code');
                if (knowTaxInput) knowTaxInput.value = node.code;

                // Switch to docs tab or notify
                if (typeof window.switchRagTab === 'function') {
                    window.switchRagTab('docs');
                }
                alert(`已將代碼「${node.code}」(${node.name}) 自動填入文件公理階層代碼輸入框！`);
            });

            // Filter Docs in RAG
            containerEl.querySelector('#btn-filter-taxonomy-docs')?.addEventListener('click', () => {
                if (typeof window.switchRagTab === 'function') {
                    window.switchRagTab('docs');
                }
                const searchInp = document.getElementById('rag-search-input');
                if (searchInp) searchInp.value = node.code;
                if (typeof window.renderRagDocList === 'function') {
                    window.renderRagDocList(node.code);
                }
            });

            // Add Child Node Modal
            containerEl.querySelector('#btn-add-child-taxonomy-node')?.addEventListener('click', () => {
                const childCode = prompt(`請輸入 ${nextLvl} 子層代碼 (父層: ${node.code})，例如: ${node.code}.1 :`, `${node.code}.`);
                if (!childCode || !childCode.trim()) return;
                const childName = prompt(`請輸入 ${nextLvl} 子層級主題名稱 (例如: 新相控陣架構) :`);
                if (!childName || !childName.trim()) return;

                const res = this.addChildNode(node.code, { code: childCode.trim(), name: childName.trim() });
                if (!res.success) {
                    alert(res.message);
                } else {
                    this.activeSelectedCode = childCode.trim();
                    const treeList = document.getElementById('taxonomy-tree-list');
                    if (treeList) this.renderTree(treeList);
                    this.renderDetailPanel(containerEl, res.node);
                }
            });
        }

        initEvents() {
            // Search input in taxonomy tab
            const searchInput = document.getElementById('taxonomy-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const q = e.target.value.trim();
                    const treeList = document.getElementById('taxonomy-tree-list');
                    if (!q) {
                        if (treeList) this.renderTree(treeList);
                        return;
                    }
                    const results = this.searchTaxonomy(q);
                    if (!treeList) return;
                    treeList.innerHTML = '';
                    if (!results.length) {
                        treeList.innerHTML = `<div class="p-4 text-center text-xs text-gray-500 font-mono">找不到符合「${q}」的階層節點</div>`;
                        return;
                    }
                    results.forEach(n => {
                        const div = document.createElement('div');
                        div.className = "p-2 rounded bg-black border border-gray-800 hover:border-purple-500/60 cursor-pointer text-xs space-y-0.5";
                        const lvlInfo = TAXONOMY_LEVELS[n.level] || { badge: 'bg-gray-800 text-gray-300' };
                        div.innerHTML = `
                            <div class="flex items-center gap-1.5 font-mono">
                                <span class="text-[9px] px-1 py-0.2 rounded font-bold ${lvlInfo.badge}">${n.level}</span>
                                <span class="text-purple-300 font-bold">${n.code}</span>
                            </div>
                            <div class="text-white truncate">${n.name}</div>
                        `;
                        div.addEventListener('click', () => {
                            this.activeSelectedCode = n.code;
                            const detailPanel = document.getElementById('taxonomy-node-detail-panel');
                            if (detailPanel) this.renderDetailPanel(detailPanel, n);
                        });
                        treeList.appendChild(div);
                    });
                });
            }

            // Export JSON
            document.getElementById('btn-export-taxonomy-json')?.addEventListener('click', () => {
                this.exportJSON();
            });

            // Import JSON
            const fileInp = document.getElementById('file-import-taxonomy-json');
            document.getElementById('btn-import-taxonomy-json')?.addEventListener('click', () => {
                fileInp?.click();
            });
            if (fileInp) {
                fileInp.addEventListener('change', (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const content = evt.target.result;
                        const res = this.importJSON(content);
                        if (!res.success) {
                            alert(`匯入失敗: ${res.message}`);
                        } else {
                            alert('成功匯入 8 級公理階層目錄體系！');
                            const treeList = document.getElementById('taxonomy-tree-list');
                            if (treeList) this.renderTree(treeList);
                        }
                    };
                    reader.readAsText(file);
                });
            }

            // Reset
            document.getElementById('btn-reset-taxonomy')?.addEventListener('click', () => {
                if (confirm('確定重設 8 級公理階層體系為標準預設值 (U00, U01, U02)？')) {
                    this.resetToDefault();
                    const treeList = document.getElementById('taxonomy-tree-list');
                    if (treeList) this.renderTree(treeList);
                }
            });

            // Expand all & Collapse all
            document.getElementById('btn-taxonomy-expand-all')?.addEventListener('click', () => {
                this.collapsedNodes.clear();
                const treeList = document.getElementById('taxonomy-tree-list');
                if (treeList) this.renderTree(treeList);
            });

            document.getElementById('btn-taxonomy-collapse-all')?.addEventListener('click', () => {
                this.getAllNodesFlat().forEach(n => {
                    if (n.children && n.children.length) this.collapsedNodes.add(n.code);
                });
                const treeList = document.getElementById('taxonomy-tree-list');
                if (treeList) this.renderTree(treeList);
            });
        }
    }

    const taxonomyEngine = new AxiomaticTaxonomyEngine();
    window.axiomaticTaxonomyEngine = taxonomyEngine;
    window.TAXONOMY_LEVELS = TAXONOMY_LEVELS;

    document.addEventListener('DOMContentLoaded', () => {
        taxonomyEngine.initEvents();
    });
})();

