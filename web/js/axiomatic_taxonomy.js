// ================================================================
// Webcom AI - 8-Level Axiomatic-Hierarchical Taxonomy Module
// Standard: 8-Level Axiomatic-Hierarchical Classification
// Includes: Standardized 8-Level Electronics Component Library Schema with Manufacturer/AVL Mapping
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

    const ELECTRONICS_LEVELS = {
        "L1": { name: "Domain", nameZh: "領域 (Domain)", color: "indigo", badge: "bg-indigo-950 text-indigo-300 border-indigo-700/60" },
        "L2": { name: "Category", nameZh: "大類 (Category)", color: "purple", badge: "bg-purple-950 text-purple-300 border-purple-700/60" },
        "L3": { name: "Subcategory", nameZh: "子類 (Subcategory)", color: "blue", badge: "bg-blue-950 text-blue-300 border-blue-700/60" },
        "L4": { name: "Family", nameZh: "家族系列 (Family)", color: "cyan", badge: "bg-cyan-950 text-cyan-300 border-cyan-700/60" },
        "L5": { name: "Subfamily", nameZh: "子家族 (Subfamily)", color: "emerald", badge: "bg-emerald-950 text-emerald-300 border-emerald-700/60" },
        "L6": { name: "Package", nameZh: "封裝樣式 (Package)", color: "amber", badge: "bg-amber-950 text-amber-300 border-amber-700/60" },
        "L7": { name: "Key Parameter Group", nameZh: "關鍵參數群 (IPN)", color: "orange", badge: "bg-orange-950 text-orange-300 border-orange-700/60" },
        "L8": { name: "Parts (AVL / MPN)", nameZh: "原廠核可零件 (AVL)", color: "rose", badge: "bg-rose-950 text-rose-300 border-rose-700/60" }
    };

    // Standardized 8-Level Electronics Component Library Schema with Manufacturer/AVL Mapping
    const ELECTRONICS_TAXONOMY_SCHEMA = {
        "_metadata": {
            "author": "startgo (startgo@yia.app)",
            "license": "GPLv3",
            "timestamp": "2026-10-02T10:33:00+08:00",
            "version": "1.0.0",
            "schema": "electronics_component_library_taxonomy_8level",
            "description": "Standardized 8-Level Electronics Component Library Schema with Manufacturer/AVL Mapping"
        },
        "manufacturers_registry": [
            {
                "mfr_id": "MFR_001",
                "code": "MUR",
                "name": "Murata",
                "full_name": "Murata Manufacturing Co., Ltd.",
                "country": "JPN",
                "flag": "🇯🇵",
                "website": "https://www.murata.com"
            },
            {
                "mfr_id": "MFR_002",
                "code": "TDK",
                "name": "TDK",
                "full_name": "TDK Corporation",
                "country": "JPN",
                "flag": "🇯🇵",
                "website": "https://www.tdk.com"
            },
            {
                "mfr_id": "MFR_003",
                "code": "YAG",
                "name": "Yageo",
                "full_name": "Yageo Corporation",
                "country": "TWN",
                "flag": "🇹🇼",
                "website": "https://www.yageo.com"
            },
            {
                "mfr_id": "MFR_004",
                "code": "ST",
                "name": "STMicroelectronics",
                "full_name": "STMicroelectronics N.V.",
                "country": "CHE",
                "flag": "🇨🇭",
                "website": "https://www.st.com"
            },
            {
                "mfr_id": "MFR_005",
                "code": "TI",
                "name": "Texas Instruments",
                "full_name": "Texas Instruments Incorporated",
                "country": "USA",
                "flag": "🇺🇸",
                "website": "https://www.ti.com"
            }
        ],
        "taxonomy_tree": [
            {
                "level": 1,
                "level_name": "Domain",
                "code": "01",
                "name_en": "Electrical",
                "name_zh": "電氣元件",
                "children": [
                    {
                        "level": 2,
                        "level_name": "Category",
                        "code": "10",
                        "name_en": "Passives",
                        "name_zh": "被動元件",
                        "children": [
                            {
                                "level": 3,
                                "level_name": "Subcategory",
                                "code": "110",
                                "name_en": "Capacitors",
                                "name_zh": "電容器",
                                "children": [
                                    {
                                        "level": 4,
                                        "level_name": "Family",
                                        "code": "1110",
                                        "name_en": "Multilayer Ceramic Capacitors (MLCC)",
                                        "name_zh": "多層陶瓷電容器",
                                        "children": [
                                            {
                                                "level": 5,
                                                "level_name": "Subfamily",
                                                "code": "01",
                                                "name_en": "Surface Mount / General Purpose",
                                                "name_zh": "表面黏著 / 通用型",
                                                "children": [
                                                    {
                                                        "level": 6,
                                                        "level_name": "Package",
                                                        "code": "C0603",
                                                        "name_en": "0603 (1608 Metric)",
                                                        "name_zh": "0603 (1608 公制)",
                                                        "children": [
                                                            {
                                                                "level": 7,
                                                                "level_name": "Key Parameter Group",
                                                                "code": "104-50V-X7R-K",
                                                                "name_en": "100nF 50V ±10% X7R",
                                                                "name_zh": "100nF 50V ±10% X7R",
                                                                "ipn": "CAP-0603-X7R-104K-50V",
                                                                "schematic_symbol": "C_SMALL",
                                                                "footprint": "CAPC1608X90N",
                                                                "electrical_specs": {
                                                                    "capacitance": { "value": 100, "unit": "nF", "exp": -9 },
                                                                    "tolerance": { "value": "±10%", "code": "K" },
                                                                    "rated_voltage_dc": { "value": 50, "unit": "V" },
                                                                    "dielectric_characteristic": "X7R",
                                                                    "operating_temperature": { "min_celsius": -55, "max_celsius": 125 }
                                                                },
                                                                "level_8_parts": [
                                                                    {
                                                                        "mfr_id": "MFR_001",
                                                                        "mfr_code": "MUR",
                                                                        "mpn": "GRM188R71H104KA93D",
                                                                        "sku": "CAP-0603-X7R-104K-50V-MUR-T",
                                                                        "preference_rank": 1,
                                                                        "lifecycle_status": "ACTIVE",
                                                                        "packaging": "Tape & Reel 7\"",
                                                                        "datasheet_url": "https://www.murata.com/products/productdetail?partno=GRM188R71H104KA93D",
                                                                        "compliance": {
                                                                            "rohs": true,
                                                                            "reach": true,
                                                                            "automotive_grade": false
                                                                        }
                                                                    },
                                                                    {
                                                                        "mfr_id": "MFR_002",
                                                                        "mfr_code": "TDK",
                                                                        "mpn": "C1608X7R1H104K080AA",
                                                                        "sku": "CAP-0603-X7R-104K-50V-TDK-T",
                                                                        "preference_rank": 2,
                                                                        "lifecycle_status": "ACTIVE",
                                                                        "packaging": "Tape & Reel 7\"",
                                                                        "datasheet_url": "https://product.tdk.com/en/search/ceramic/ceramic/mlcc/info?part_no=C1608X7R1H104K080AA",
                                                                        "compliance": {
                                                                            "rohs": true,
                                                                            "reach": true,
                                                                            "automotive_grade": false
                                                                        }
                                                                    },
                                                                    {
                                                                        "mfr_id": "MFR_003",
                                                                        "mfr_code": "YAG",
                                                                        "mpn": "CC0603KRX7R9BB104",
                                                                        "sku": "CAP-0603-X7R-104K-50V-YAG-T",
                                                                        "preference_rank": 3,
                                                                        "lifecycle_status": "ACTIVE",
                                                                        "packaging": "Tape & Reel 7\"",
                                                                        "datasheet_url": "https://www.yageo.com/en/Product/Type/CC0603KRX7R9BB104",
                                                                        "compliance": {
                                                                            "rohs": true,
                                                                            "reach": true,
                                                                            "automotive_grade": false
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
                        "level": 2,
                        "level_name": "Category",
                        "code": "20",
                        "name_en": "Active Semiconductor",
                        "name_zh": "主動半導體",
                        "children": [
                            {
                                "level": 3,
                                "level_name": "Subcategory",
                                "code": "210",
                                "name_en": "Digital Integrated Circuits",
                                "name_zh": "數位積體電路",
                                "children": [
                                    {
                                        "level": 4,
                                        "level_name": "Family",
                                        "code": "2110",
                                        "name_en": "Microcontrollers (MCU)",
                                        "name_zh": "微控制器",
                                        "children": [
                                            {
                                                "level": 5,
                                                "level_name": "Subfamily",
                                                "code": "01",
                                                "name_en": "ARM Cortex-M4 32-bit",
                                                "name_zh": "ARM Cortex-M4 32位元核心",
                                                "children": [
                                                    {
                                                        "level": 6,
                                                        "level_name": "Package",
                                                        "code": "QFP64",
                                                        "name_en": "LQFP-64 (10x10mm)",
                                                        "name_zh": "LQFP-64 (10x10mm)",
                                                        "children": [
                                                            {
                                                                "level": 7,
                                                                "level_name": "Key Parameter Group",
                                                                "code": "168M-1M-192K",
                                                                "name_en": "168MHz / 1MB Flash / 192KB RAM",
                                                                "name_zh": "168MHz / 1MB Flash / 192KB RAM",
                                                                "ipn": "MCU-STM32F405-LQFP64",
                                                                "schematic_symbol": "MCU_STM32F405RGT6",
                                                                "footprint": "QFP50P1200X1200X160-64N",
                                                                "electrical_specs": {
                                                                    "core_architecture": "ARM Cortex-M4",
                                                                    "max_frequency_mhz": 168,
                                                                    "flash_size_bytes": 1048576,
                                                                    "sram_size_bytes": 196608,
                                                                    "operating_voltage_min": 1.8,
                                                                    "operating_voltage_max": 3.6,
                                                                    "io_count": 51,
                                                                    "operating_temperature": { "min_celsius": -40, "max_celsius": 85 }
                                                                },
                                                                "level_8_parts": [
                                                                    {
                                                                        "mfr_id": "MFR_004",
                                                                        "mfr_code": "ST",
                                                                        "mpn": "STM32F405RGT6",
                                                                        "sku": "MCU-STM32F405-LQFP64-ST-TRAY",
                                                                        "preference_rank": 1,
                                                                        "lifecycle_status": "ACTIVE",
                                                                        "packaging": "Tray",
                                                                        "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f405rg.pdf",
                                                                        "compliance": {
                                                                            "rohs": true,
                                                                            "reach": true,
                                                                            "automotive_grade": false
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
                            },
                            {
                                "level": 3,
                                "level_name": "Subcategory",
                                "code": "220",
                                "name_en": "Analog / Power Management IC (PMIC)",
                                "name_zh": "類比 / 電源管理 IC",
                                "children": [
                                    {
                                        "level": 4,
                                        "level_name": "Family",
                                        "code": "2210",
                                        "name_en": "Step-Down DC-DC Regulators",
                                        "name_zh": "降壓型直流轉換器",
                                        "children": [
                                            {
                                                "level": 5,
                                                "level_name": "Subfamily",
                                                "code": "01",
                                                "name_en": "Nonsynchronous Step-Down Converter",
                                                "name_zh": "非同步降壓轉換器",
                                                "children": [
                                                    {
                                                        "level": 6,
                                                        "level_name": "Package",
                                                        "code": "HSOIC8",
                                                        "name_en": "SO PowerPAD-8",
                                                        "name_zh": "SO PowerPAD-8",
                                                        "children": [
                                                            {
                                                                "level": 7,
                                                                "level_name": "Key Parameter Group",
                                                                "code": "VIN42V-IO3.5A",
                                                                "name_en": "Vin 3.5V-42V / 3.5A Out",
                                                                "name_zh": "輸入 3.5V-42V / 輸出 3.5A",
                                                                "ipn": "PMIC-TPS54340-SO8",
                                                                "schematic_symbol": "TPS54340DDAR",
                                                                "footprint": "SOIC127P600X170-8N-PAD",
                                                                "electrical_specs": {
                                                                    "input_voltage_min": 3.5,
                                                                    "input_voltage_max": 42.0,
                                                                    "max_output_current_a": 3.5,
                                                                    "switching_frequency_khz": { "min": 100, "max": 2500 },
                                                                    "topology": "Step-Down (Buck)",
                                                                    "operating_temperature": { "min_celsius": -40, "max_celsius": 150 }
                                                                },
                                                                "level_8_parts": [
                                                                    {
                                                                        "mfr_id": "MFR_005",
                                                                        "mfr_code": "TI",
                                                                        "mpn": "TPS54340DDAR",
                                                                        "sku": "PMIC-TPS54340-SO8-TI-R",
                                                                        "preference_rank": 1,
                                                                        "lifecycle_status": "ACTIVE",
                                                                        "packaging": "Tape & Reel 13\"",
                                                                        "datasheet_url": "https://www.ti.com/lit/ds/symlink/tps54340.pdf",
                                                                        "compliance": {
                                                                            "rohs": true,
                                                                            "reach": true,
                                                                            "automotive_grade": false
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

    function convertElectronicsNode(item, parentPath = '') {
        const lvlKey = 'L' + item.level;
        const currentPath = parentPath ? (parentPath + '.' + item.code) : item.code;
        const nameZh = item.name_zh || item.name || '';
        const nameEn = item.name_en || '';
        const name = (nameZh && nameEn) ? (nameZh + ' (' + nameEn + ')') : (nameZh || nameEn || item.code);

        const node = {
            level: lvlKey,
            code: currentPath,
            raw_code: item.code,
            name: name,
            name_zh: nameZh,
            name_en: nameEn,
            level_name: item.level_name,
            is_electronics: true,
            children: []
        };

        if (item.level === 1) {
            node.axiomatic_constants = {
                "標準邏輯電平 (Logic Levels)": "CMOS 3.3V / 1.8V",
                "基準環境工作溫度 (Ref Temp)": "25.0 °C",
                "射頻高頻基準特徵阻抗 (RF Z0)": "50.0 Ω",
                "人體模型靜電防護標準 (ESD HBM)": "Class 2 (2000V)",
                "無鉛迴焊高峰焊接溫度 (Reflow)": "260.0 °C",
                "PCB 封裝設計規範 (IPC Standard)": "IPC-7351B / IPC-A-610"
            };
        }

        if (item.ipn) node.ipn = item.ipn;
        if (item.schematic_symbol) node.schematic_symbol = item.schematic_symbol;
        if (item.footprint) node.footprint = item.footprint;
        if (item.electrical_specs) node.electrical_specs = item.electrical_specs;
        if (item.level_8_parts) node.level_8_parts = item.level_8_parts;

        if (item.children && Array.isArray(item.children)) {
            node.children = item.children.map(child => convertElectronicsNode(child, currentPath));
        }

        // Expand level_8_parts into L8 child nodes
        if (item.level === 7 && Array.isArray(item.level_8_parts)) {
            item.level_8_parts.forEach((part) => {
                const partCode = currentPath + '.' + part.mfr_code;
                const mfrObj = (ELECTRONICS_TAXONOMY_SCHEMA.manufacturers_registry || []).find(m => m.mfr_id === part.mfr_id || m.code === part.mfr_code);
                const mfrName = mfrObj ? (mfrObj.name + ' (' + mfrObj.country + ')') : part.mfr_code;
                const mfrFlag = mfrObj ? (mfrObj.flag || '') : '';

                const l8Node = {
                    level: "L8",
                    code: partCode,
                    raw_code: part.mpn,
                    name: (part.mfr_code + ' · ' + part.mpn + ' [Rank ' + part.preference_rank + (part.preference_rank === 1 ? ' ⭐首選' : '') + ']'),
                    is_electronics: true,
                    is_avl_part: true,
                    mfr_code: part.mfr_code,
                    mfr_name: mfrName,
                    mfr_flag: mfrFlag,
                    mpn: part.mpn,
                    sku: part.sku,
                    preference_rank: part.preference_rank,
                    lifecycle_status: part.lifecycle_status,
                    packaging: part.packaging,
                    datasheet_url: part.datasheet_url,
                    compliance: part.compliance,
                    part_data: part,
                    leaf_properties: {
                        "原廠料號 (MPN)": part.mpn,
                        "內部 SKU": part.sku,
                        "製造商 (MFR)": mfrName + (mfrFlag ? ' ' + mfrFlag : ''),
                        "核可偏好等級": 'Rank ' + part.preference_rank + (part.preference_rank === 1 ? ' (首選 / Primary)' : ' (備選 / Secondary)'),
                        "生命週期狀態": part.lifecycle_status,
                        "包裝形式 (Packaging)": part.packaging,
                        "RoHS 環保合規": part.compliance?.rohs ? "COMPLIANT (符合)" : "NON-COMPLIANT",
                        "REACH 環保合規": part.compliance?.reach ? "COMPLIANT (符合)" : "NON-COMPLIANT",
                        "車規級認證 (Automotive)": part.compliance?.automotive_grade ? "AEC-Q 認證" : "標準商用工業級",
                        "原廠規格書 (Datasheet)": part.datasheet_url
                    },
                    children: []
                };
                node.children.push(l8Node);
            });
        }

        return node;
    }

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
                "name": "本地物理與生活現實世界 (Local Physical & Lifestyle Reality)",
                "axiomatic_constants": {
                    "spacetime_dimensions": "3+1D",
                    "speed_of_light_m_s": 299792458.0,
                    "reduced_planck_constant_j_s": 1.054571817e-34,
                    "fine_structure_constant": 0.0072973525693,
                    "gravitational_constant_m3_kg_s2": 6.6743e-11,
                    "gauge_group": "SU(3)_C x SU(2)_L x U(1)_Y",
                    "gravity_acceleration_m_s2": 9.80665,
                    "standard_atmosphere_bar": 1.01325,
                    "pure_water_boiling_point_c": 100.0,
                    "ambient_oxygen_ratio": 0.2095
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
                    },
                    {
                        "level": "L2",
                        "code": "U00.600",
                        "name": "居家飲食與品味享受 (Food & Beverage Experience)",
                        "children": [
                            {
                                "level": "L3",
                                "code": "U00.600.610",
                                "name": "飲品調製與品味 (Coffee & Beverage Craft)",
                                "children": [
                                    {
                                        "level": "L4",
                                        "code": "U00.600.610.612",
                                        "name": "精品咖啡沖煮 (Specialty Coffee Extraction)",
                                        "children": [
                                            {
                                                "level": "L5",
                                                "code": "U00.600.610.612.4",
                                                "name": "半自動義式濃縮萃取 (Espresso Machine Method)",
                                                "children": [
                                                    {
                                                        "level": "L6",
                                                        "code": "U00.600.610.612.43",
                                                        "name": "變壓萃取與預浸潤控制 (Profiling & Pre-infusion)",
                                                        "children": [
                                                            {
                                                                "level": "L7",
                                                                "code": "U00.600.610.612.431",
                                                                "name": "淺焙埃塞俄比亞日曬豆 1:2 萃取方案 (Light Roast SOE SOP)",
                                                                "children": [
                                                                    {
                                                                        "level": "L8",
                                                                        "code": "U00.600.610.612.431.2",
                                                                        "name": "萃取壓力與水溫精確指標 (Espresso Brew Metric)",
                                                                        "leaf_properties": {
                                                                            "dose_in_g": 20.0,
                                                                            "liquid_out_g": 40.0,
                                                                            "water_temp_celsius": 93.5,
                                                                            "pre_infusion_pressure_bar": 3.0,
                                                                            "pre_infusion_duration_s": 8.0,
                                                                            "peak_pressure_bar": 9.0,
                                                                            "total_brew_time_s": 26.0,
                                                                            "target_tds_percentage": 9.2
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
                "children": []
            }
        ]
    };

    class AxiomaticTaxonomyEngine {
        constructor() {
            this.storageKey = 'webcom_axiomatic_taxonomy';
            this.activePreset = localStorage.getItem('webcom_taxonomy_preset') || 'electronics';
            this.electronicsTaxonomy = ELECTRONICS_TAXONOMY_SCHEMA;
            this.taxonomy = this.loadTaxonomy();
            this.activeSelectedCode = this.activePreset === 'electronics' ? '01' : 'U00';
            this.collapsedNodes = new Set();
        }

        loadTaxonomy() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.universes && parsed.universes.length) {
                        this._mergeMissingDefaults(parsed);
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn('[Taxonomy] Error loading from storage:', e);
            }
            const base = JSON.parse(JSON.stringify(DEFAULT_AXIOMATIC_TAXONOMY));
            this._mergeMissingDefaults(base);
            return base;
        }

        _mergeMissingDefaults(parsed) {
            if (!parsed || !parsed.universes) return false;
            let modified = false;

            // 1. Ensure axiomatic universe domains exist
            DEFAULT_AXIOMATIC_TAXONOMY.universes.forEach(defUni => {
                const existUni = parsed.universes.find(u => u.code === defUni.code);
                if (!existUni) {
                    parsed.universes.push(JSON.parse(JSON.stringify(defUni)));
                    modified = true;
                }
            });

            // 2. Ensure electronics component library domain '01' exists
            const electronicsRoot = convertElectronicsNode(ELECTRONICS_TAXONOMY_SCHEMA.taxonomy_tree[0]);
            const existElectronics = parsed.universes.find(u => u.code === '01');
            if (!existElectronics) {
                parsed.universes.push(electronicsRoot);
                modified = true;
            } else {
                // Ensure electronic children up to L8 are preserved
                if (!existElectronics.children || existElectronics.children.length === 0) {
                    existElectronics.children = electronicsRoot.children;
                    modified = true;
                }
            }

            if (modified) {
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(parsed));
                } catch (_) {}
            }
            return modified;
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
            this._mergeMissingDefaults(this.taxonomy);
            this.saveTaxonomy();
            return this.taxonomy;
        }

        getLevelInfo(level, isElectronics = false) {
            if (isElectronics || this.activePreset === 'electronics') {
                return ELECTRONICS_LEVELS[level] || TAXONOMY_LEVELS[level] || { name: level, nameZh: level, badge: "bg-gray-800 text-gray-300" };
            }
            return TAXONOMY_LEVELS[level] || { name: level, nameZh: level, badge: "bg-gray-800 text-gray-300" };
        }

        setPreset(preset) {
            this.activePreset = preset || 'all';
            try {
                localStorage.setItem('webcom_taxonomy_preset', this.activePreset);
            } catch (_) {}

            const targetUniverses = this.getTargetUniverses();
            if (targetUniverses.length > 0) {
                if (!targetUniverses.some(u => u.code === this.activeSelectedCode || this.findNodeByCode(this.activeSelectedCode, [u]))) {
                    this.activeSelectedCode = targetUniverses[0].code;
                }
            }

            this.updateLegendUI();

            const treeList = document.getElementById('taxonomy-tree-list');
            if (treeList) this.renderTree(treeList);
            const detailPanel = document.getElementById('taxonomy-node-detail-panel');
            if (detailPanel) {
                const node = this.findNodeByCode(this.activeSelectedCode) || targetUniverses[0];
                if (node) this.renderDetailPanel(detailPanel, node);
            }
        }

        updateLegendUI() {
            const legendEl = document.getElementById('taxonomy-level-legend');
            if (!legendEl) return;
            const isElec = (this.activePreset === 'electronics');
            const lvlMap = isElec ? ELECTRONICS_LEVELS : TAXONOMY_LEVELS;
            const keys = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];

            legendEl.innerHTML = keys.map((k, idx) => {
                const info = lvlMap[k];
                const chevron = (idx < keys.length - 1) ? '<span class="text-gray-600">❯</span>' : '';
                return `<span class="px-2 py-0.5 rounded font-bold ${info.badge}">${k}: ${info.nameZh}</span>${chevron}`;
            }).join(' ');
        }

        getTargetUniverses() {
            if (this.activePreset === 'electronics') {
                return this.taxonomy.universes.filter(u => u.code === '01' || u.code.startsWith('01'));
            } else if (this.activePreset === 'axiomatic') {
                return this.taxonomy.universes.filter(u => u.code !== '01' && !u.code.startsWith('01'));
            }
            return this.taxonomy.universes;
        }

        findNodeByCode(code, nodes = null) {
            if (!code) return null;
            const targetList = nodes || this.taxonomy.universes;
            for (const item of targetList) {
                if (item.code === code || item.raw_code === code || item.mpn === code || item.ipn === code) return item;
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
                    if (node.code === code || node.raw_code === code) {
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
            traverse(nodes || this.getTargetUniverses());
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
            if (!nextLevel) return { success: false, message: '已達最底層 L8，無法再新增子層級！' };

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
                is_electronics: parent.is_electronics || parent.code.startsWith('01'),
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
            if (!code || code === 'U00' || code === '01') return false;

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
                const codeMatch = n.code && n.code.toLowerCase().includes(q);
                const rawMatch = n.raw_code && n.raw_code.toLowerCase().includes(q);
                const mpnMatch = n.mpn && n.mpn.toLowerCase().includes(q);
                const ipnMatch = n.ipn && n.ipn.toLowerCase().includes(q);
                const nameMatch = n.name && n.name.toLowerCase().includes(q);
                const constantsMatch = n.axiomatic_constants && JSON.stringify(n.axiomatic_constants).toLowerCase().includes(q);
                const leafMatch = n.leaf_properties && JSON.stringify(n.leaf_properties).toLowerCase().includes(q);
                const specsMatch = n.electrical_specs && JSON.stringify(n.electrical_specs).toLowerCase().includes(q);
                const partsMatch = n.level_8_parts && JSON.stringify(n.level_8_parts).toLowerCase().includes(q);
                return codeMatch || rawMatch || mpnMatch || ipnMatch || nameMatch || constantsMatch || leafMatch || specsMatch || partsMatch;
            });
        }

        focusNode(code) {
            if (!code) return false;
            const target = this.findNodeByCode(code.trim());
            if (!target) return false;
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

            const targetUniverses = this.getTargetUniverses();

            const renderNode = (node, depth = 0) => {
                const wrapper = document.createElement('div');
                wrapper.className = "taxonomy-tree-node space-y-0.5";

                const hasChildren = node.children && node.children.length > 0;
                const isCollapsed = this.collapsedNodes.has(node.code);
                const isActive = (node.code === this.activeSelectedCode);
                const lvlInfo = this.getLevelInfo(node.level, node.is_electronics);

                const matchingDocsCount = docs.filter(d => d.taxonomy_code && (d.taxonomy_code === node.code || d.taxonomy_code.startsWith(node.code + '.'))).length;

                const row = document.createElement('div');
                row.className = `flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition text-[11px] ${
                    isActive
                        ? 'bg-purple-900/50 border border-purple-500/70 text-white font-semibold'
                        : 'hover:bg-gray-900 text-gray-300 border border-transparent'
                }`;
                row.style.paddingLeft = `${depth * 13 + 6}px`;

                const chevronIcon = hasChildren
                    ? `<span class="toggle-chevron w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-white transition transform ${isCollapsed ? '' : 'rotate-90'}">▶</span>`
                    : `<span class="w-3.5 h-3.5 inline-block text-gray-600 text-center">•</span>`;

                const docCountBadge = matchingDocsCount > 0
                    ? `<span class="ml-auto text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono font-bold">${matchingDocsCount} 篇</span>`
                    : '';

                const avlCountBadge = (node.level === 'L7' && node.level_8_parts && node.level_8_parts.length)
                    ? `<span class="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 font-mono">AVL: ${node.level_8_parts.length}家</span>`
                    : '';

                row.innerHTML = `
                    ${chevronIcon}
                    <span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${lvlInfo.badge}">${node.level}</span>
                    <span class="font-mono text-purple-300 font-bold tracking-tight">${node.raw_code || node.code}</span>
                    <span class="truncate flex-1 text-gray-200" title="${node.name}">${node.name}</span>
                    ${avlCountBadge}
                    ${docCountBadge}
                `;

                row.querySelector('.toggle-chevron')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.collapsedNodes.has(node.code)) {
                        this.collapsedNodes.delete(node.code);
                    } else {
                        this.collapsedNodes.add(node.code);
                    }
                    this.renderTree(containerEl, onSelect);
                });

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

            targetUniverses.forEach(uni => {
                containerEl.appendChild(renderNode(uni, 0));
            });

            const detailPanel = document.getElementById('taxonomy-node-detail-panel');
            if (detailPanel) {
                const activeNode = this.findNodeByCode(this.activeSelectedCode) || targetUniverses[0] || this.taxonomy.universes[0];
                if (activeNode) this.renderDetailPanel(detailPanel, activeNode);
            }
        }

        renderDetailPanel(containerEl, node) {
            if (!containerEl || !node) return;
            const ancestors = this.getNodeAncestors(node.code);
            const isElec = Boolean(node.is_electronics || node.code.startsWith('01'));
            const lvlInfo = this.getLevelInfo(node.level, isElec);

            const docs = (typeof window.getStorageDocs === 'function')
                ? window.getStorageDocs()
                : (JSON.parse(localStorage.getItem('webcom_rag_docs') || '[]'));
            const matchingDocs = docs.filter(d => d.taxonomy_code && (d.taxonomy_code === node.code || d.taxonomy_code.startsWith(node.code + '.')));

            // Breadcrumb HTML
            const breadcrumbHtml = ancestors.map((anc, idx) => {
                const isLast = (idx === ancestors.length - 1);
                const ancLvlInfo = this.getLevelInfo(anc.level, isElec);
                return `
                    <span class="inline-flex items-center gap-1 cursor-pointer hover:text-purple-300 ${isLast ? 'text-purple-300 font-bold' : 'text-gray-400'}" data-code="${anc.code}">
                        <span class="text-[9px] px-1 py-0.2 rounded font-mono ${ancLvlInfo.badge}">${anc.level}</span>
                        <span class="font-mono text-[11px]">${anc.raw_code || anc.code}</span>
                    </span>
                    ${!isLast ? '<span class="text-gray-600">❯</span>' : ''}
                `;
            }).join(' ');

            // EDA & Footprint Specs (if node has IPN, Symbol, or Footprint)
            let edaHtml = '';
            if (node.ipn || node.schematic_symbol || node.footprint) {
                edaHtml = `
                    <div class="space-y-2 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40">
                        <div class="text-xs font-bold text-cyan-300 flex items-center justify-between">
                            <span class="flex items-center gap-1.5">
                                <i data-lucide="cpu" class="w-4 h-4 text-cyan-400"></i>
                                <span>📐 EDA & CAD 零件標準規格 (Internal Part Number & Footprint)</span>
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 font-mono">
                                IPC-7351B 規範
                            </span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                            <div class="p-2.5 bg-black/60 rounded-lg border border-cyan-900/40">
                                <div class="text-cyan-400 text-[10px] uppercase font-bold">內部標準料號 (IPN)</div>
                                <div class="text-white font-bold select-all truncate mt-0.5">${node.ipn || '-'}</div>
                            </div>
                            <div class="p-2.5 bg-black/60 rounded-lg border border-cyan-900/40">
                                <div class="text-cyan-400 text-[10px] uppercase font-bold">原理圖符號 (Symbol)</div>
                                <div class="text-white select-all truncate mt-0.5">${node.schematic_symbol || '-'}</div>
                            </div>
                            <div class="p-2.5 bg-black/60 rounded-lg border border-cyan-900/40">
                                <div class="text-cyan-400 text-[10px] uppercase font-bold">PCB 封裝腳印 (Footprint)</div>
                                <div class="text-white select-all truncate mt-0.5">${node.footprint || '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Electrical Specs (if present)
            let specsHtml = '';
            if (node.electrical_specs && Object.keys(node.electrical_specs).length) {
                const specItems = Object.entries(node.electrical_specs).map(([key, val]) => {
                    let formattedVal = '';
                    if (typeof val === 'object' && val !== null) {
                        if (val.value !== undefined) {
                            formattedVal = `${val.value} ${val.unit || ''} ${val.code ? `(${val.code})` : ''}`;
                        } else if (val.min !== undefined && val.max !== undefined) {
                            formattedVal = `${val.min} ~ ${val.max}`;
                        } else if (val.min_celsius !== undefined) {
                            formattedVal = `${val.min_celsius}°C ~ ${val.max_celsius}°C`;
                        } else {
                            formattedVal = JSON.stringify(val);
                        }
                    } else {
                        formattedVal = String(val);
                    }
                    const label = key.replace(/_/g, ' ').toUpperCase();
                    return `
                        <div class="p-2.5 bg-black/60 rounded-lg border border-amber-900/40 text-[11px] space-y-0.5">
                            <div class="text-amber-400 font-mono text-[10px] font-bold tracking-tight">${label}</div>
                            <div class="text-white font-mono font-bold select-all">${formattedVal}</div>
                        </div>
                    `;
                }).join('');

                specsHtml = `
                    <div class="space-y-2 p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40">
                        <div class="text-xs font-bold text-amber-300 flex items-center justify-between">
                            <span class="flex items-center gap-1.5">
                                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
                                <span>⚡ 電氣特性與極限參數 (Electrical Specifications)</span>
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50 font-mono">
                                關鍵特性參數
                            </span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            ${specItems}
                        </div>
                    </div>
                `;
            }

            // AVL - Authorized Vendor List (Level 8 Parts)
            let avlHtml = '';
            if (node.level_8_parts && Array.isArray(node.level_8_parts) && node.level_8_parts.length) {
                const partCards = node.level_8_parts.map((p) => {
                    const mfrObj = (ELECTRONICS_TAXONOMY_SCHEMA.manufacturers_registry || []).find(m => m.mfr_id === p.mfr_id || m.code === p.mfr_code);
                    const mfrName = mfrObj ? `${mfrObj.name} (${mfrObj.country})` : p.mfr_code;
                    const mfrFlag = mfrObj ? (mfrObj.flag || '') : '';
                    const isRank1 = (p.preference_rank === 1);

                    return `
                        <div class="p-3 bg-black/80 rounded-xl border ${isRank1 ? 'border-emerald-600/60 bg-emerald-950/10' : 'border-gray-800'} space-y-2">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isRank1 ? 'bg-emerald-500 text-black shadow' : 'bg-gray-800 text-gray-300'}">
                                        ${isRank1 ? '⭐ 首選 (Rank 1)' : `次選 (Rank ${p.preference_rank})`}
                                    </span>
                                    <span class="text-xs font-bold text-white flex items-center gap-1">
                                        <span>${mfrFlag}</span>
                                        <span>${mfrName}</span>
                                    </span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    ${p.compliance?.rohs ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-green-950 text-green-300 border border-green-800">RoHS ✓</span>' : ''}
                                    ${p.compliance?.reach ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-green-950 text-green-300 border border-green-800">REACH ✓</span>' : ''}
                                    ${p.compliance?.automotive_grade ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">AEC-Q 車規</span>' : ''}
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                                <div>
                                    <span class="text-gray-500">原廠料號 (MPN): </span>
                                    <span class="text-cyan-300 font-bold select-all">${p.mpn}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">內部 SKU: </span>
                                    <span class="text-purple-300 select-all">${p.sku}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">包裝形式: </span>
                                    <span class="text-gray-300">${p.packaging}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">供貨狀態: </span>
                                    <span class="text-emerald-400 font-bold">🟢 ${p.lifecycle_status}</span>
                                </div>
                            </div>

                            <div class="pt-1 border-t border-gray-800/80 flex items-center justify-between">
                                <a href="${p.datasheet_url}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1">
                                    <i data-lucide="external-link" class="w-3 h-3"></i>
                                    <span>📑 原廠規格書 (Official Datasheet)</span>
                                </a>
                                <span class="text-[10px] text-gray-500 font-mono">${p.mfr_id}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                avlHtml = `
                    <div class="space-y-2 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                        <div class="text-xs font-bold text-emerald-300 flex items-center justify-between">
                            <span class="flex items-center gap-1.5">
                                <i data-lucide="factory" class="w-4 h-4 text-emerald-400"></i>
                                <span>🏭 核可原廠零件清單 (Level 8 AVL - Authorized Vendor List)</span>
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 font-mono">
                                ${node.level_8_parts.length} 家合格原廠
                            </span>
                        </div>
                        <div class="space-y-2 pt-1">
                            ${partCards}
                        </div>
                    </div>
                `;
            }

            // Axiomatic Constants HTML (if present)
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
                            <span>🌌 領域基準公理常數 (Axiomatic Constants)</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            ${items}
                        </div>
                    </div>
                `;
            }

            // Leaf Properties HTML (if present)
            let leafPropsHtml = '';
            if (node.leaf_properties && Object.keys(node.leaf_properties).length && !node.is_avl_part) {
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

            // If node itself is an L8 AVL Part
            let partDetailHtml = '';
            if (node.is_avl_part && node.part_data) {
                const p = node.part_data;
                partDetailHtml = `
                    <div class="p-4 rounded-xl bg-emerald-950/25 border border-emerald-700/50 space-y-3">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <span class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
                                <span>核可原廠零件詳細檔案 (AVL Part Detail)</span>
                            </span>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded font-bold ${p.preference_rank === 1 ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300'}">
                                偏好順序: Rank ${p.preference_rank}
                            </span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                            <div class="p-2.5 bg-black/70 rounded-lg border border-gray-800">
                                <span class="text-gray-400">製造商:</span>
                                <div class="text-white font-bold text-sm mt-0.5">${node.mfr_name} ${node.mfr_flag || ''}</div>
                            </div>
                            <div class="p-2.5 bg-black/70 rounded-lg border border-gray-800">
                                <span class="text-gray-400">原廠料號 (MPN):</span>
                                <div class="text-cyan-300 font-bold text-sm mt-0.5 select-all">${p.mpn}</div>
                            </div>
                            <div class="p-2.5 bg-black/70 rounded-lg border border-gray-800">
                                <span class="text-gray-400">企業內部 SKU:</span>
                                <div class="text-purple-300 select-all mt-0.5">${p.sku}</div>
                            </div>
                            <div class="p-2.5 bg-black/70 rounded-lg border border-gray-800">
                                <span class="text-gray-400">包裝規格:</span>
                                <div class="text-gray-200 mt-0.5">${p.packaging}</div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-1">
                            <a href="${p.datasheet_url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-600/60 text-xs font-medium transition flex items-center gap-1.5">
                                <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                                <span>開啟原廠 PDF 規格書 (Datasheet)</span>
                            </a>
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
                            <code class="text-sm font-bold font-mono text-purple-300 bg-black px-2.5 py-0.5 rounded border border-purple-800/50">${node.raw_code || node.code}</code>
                            ${node.ipn ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">IPN: ${node.ipn}</span>` : ''}
                        </div>
                        <span class="text-[10px] text-gray-400 font-mono">${lvlInfo.name}</span>
                    </div>
                    <h3 class="text-base font-bold text-white tracking-wide">${node.name}</h3>
                </div>

                ${edaHtml}
                ${specsHtml}
                ${avlHtml}
                ${partDetailHtml}
                ${constantsHtml}
                ${leafPropsHtml}
                ${docsHtml}

                <!-- Action Bar -->
                <div class="pt-2 border-t border-gray-800 flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center flex-wrap gap-2">
                        <button type="button" id="btn-apply-taxonomy-code" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow">
                            <span>🧭 套用代碼至新文件</span>
                        </button>
                        <button type="button" id="btn-copy-taxonomy-code" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs transition cursor-pointer flex items-center gap-1 font-mono">
                            <span>📋 複製代碼</span>
                        </button>
                        <button type="button" id="btn-copy-pkm-template" class="px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-700/60 text-xs transition cursor-pointer flex items-center gap-1 font-medium" title="複製 Obsidian / Logseq 筆記模板 (含電氣規格與 AVL 核可廠商清單)">
                            <span>📝 複製 PKM 模板</span>
                        </button>
                        <button type="button" id="btn-download-pkm-md" class="px-3 py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-100 border border-sky-600/60 text-xs transition cursor-pointer flex items-center gap-1 font-medium" title="下載為 .md 檔案，可直接放入 Obsidian Vault">
                            <span>📥 下載 .md 筆記</span>
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

            // Copy PKM Template
            containerEl.querySelector('#btn-copy-pkm-template')?.addEventListener('click', (e) => {
                const md = this.generatePkmMarkdown(node);
                navigator.clipboard.writeText(md);
                const btn = e.currentTarget;
                const prev = btn.innerHTML;
                btn.innerHTML = '<span>✅ 已複製 PKM 模板！</span>';
                setTimeout(() => btn.innerHTML = prev, 1500);
            });

            // Download PKM Markdown
            containerEl.querySelector('#btn-download-pkm-md')?.addEventListener('click', () => {
                this.downloadPkmMarkdown(node);
            });

            // Apply Code to Document Form
            containerEl.querySelector('#btn-apply-taxonomy-code')?.addEventListener('click', () => {
                const docTaxInput = document.getElementById('rag-doc-taxonomy-code');
                if (docTaxInput) docTaxInput.value = node.code;
                const knowTaxInput = document.getElementById('knowledge-edit-taxonomy-code');
                if (knowTaxInput) knowTaxInput.value = node.code;

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
                const childName = prompt(`請輸入 ${nextLvl} 子層級主題名稱 (例如: 新封裝或新規格) :`);
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

            // Re-render Lucide icons inside panel
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }

        generatePkmMarkdown(node) {
            if (!node) return '';
            const ancestors = this.getNodeAncestors(node.code);
            const uniNode = ancestors[0] || node;
            const universeId = uniNode.code || 'U00';
            const today = new Date().toISOString().split('T')[0];
            const isElec = Boolean(node.is_electronics || node.code.startsWith('01'));

            const hier = {};
            ancestors.forEach(a => {
                hier[a.level.toLowerCase()] = `${a.raw_code || a.code} ${a.name}`;
            });
            if (!hier[node.level.toLowerCase()]) {
                hier[node.level.toLowerCase()] = `${node.raw_code || node.code} ${node.name}`;
            }

            const tags = ancestors.map(a =>
                (a.name_zh || a.name || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').toLowerCase()
            ).filter(Boolean);

            if (isElec) {
                if (!tags.includes('pkm/electronics')) tags.unshift('pkm/electronics');
                if (!tags.includes('eda/component')) tags.push('eda/component');

                let specsYaml = '';
                let specsTable = '';
                if (node.electrical_specs) {
                    specsYaml = 'electrical_specs:\n';
                    specsTable = '| 參數項目 | 規格值 | 說明 / 條件 |\n| :--- | :--- | :--- |\n';
                    for (const [k, v] of Object.entries(node.electrical_specs)) {
                        let disp = (typeof v === 'object') ? JSON.stringify(v) : v;
                        specsYaml += `  ${k}: "${disp}"\n`;
                        specsTable += `| **${k}** | \`${disp}\` | 標準額定 |\n`;
                    }
                }

                let avlTable = '';
                if (node.level_8_parts && node.level_8_parts.length) {
                    avlTable = '## 核可原廠零件清單 (Level 8 AVL - Approved Vendor List)\n| 偏好等級 | 製造商代碼 | 原廠型號 (MPN) | 內部 SKU | 包裝形式 | 環保認證 | 原廠規格書 |\n| :---: | :---: | :--- | :--- | :--- | :---: | :--- |\n';
                    node.level_8_parts.forEach(p => {
                        const rankLabel = p.preference_rank === 1 ? '⭐ 首選 (Rank 1)' : `次選 (Rank ${p.preference_rank})`;
                        const comp = [p.compliance?.rohs ? 'RoHS' : '', p.compliance?.reach ? 'REACH' : ''].filter(Boolean).join('/');
                        avlTable += `| ${rankLabel} | **${p.mfr_code}** | \`${p.mpn}\` | \`${p.sku}\` | ${p.packaging} | ${comp || '-'} | [${p.mfr_code} 規格書](${p.datasheet_url}) |\n`;
                    });
                }

                return `---
code: "${node.code}"
ipn: "${node.ipn || ''}"
schematic_symbol: "${node.schematic_symbol || ''}"
footprint: "${node.footprint || ''}"
type: "ELECTRONIC_COMPONENT"
hierarchy:
  domain: "${hier.l1 || '01 電氣元件'}"
  category: "${hier.l2 || ''}"
  subcategory: "${hier.l3 || ''}"
  family: "${hier.l4 || ''}"
  subfamily: "${hier.l5 || ''}"
  package: "${hier.l6 || ''}"
tags:
${tags.map(t => `  - ${t}`).join('\n')}
${specsYaml.trimEnd()}
updated: ${today}
---

# ${node.code} ${node.name}

> [!INFO] 8 級電子元件標準庫 (Standard 8-Level Component Architecture)
> **內部料號 (IPN)**: \`${node.ipn || '-'}\`
> **原理圖符號**: \`${node.schematic_symbol || '-'}\` | **PCB 腳印**: \`${node.footprint || '-'}\`

${specsTable ? `## 電氣規格參數規格表 (Electrical Specifications)\n${specsTable}\n` : ''}
${avlTable}

## SMT 生產與進料檢驗規範 (Incoming Quality Control)
1. **包裝檢驗**: 確認包裝卷盤標籤與 AVL MPN 吻合，符合濕度敏感等級 (MSL)。
2. **SMT 貼片**: 封裝代碼符合腳印尺寸標準，鋼網開孔公差精確控制。
3. **焊接驗證**: 符合 IPC-A-610 Class 2/3 標準。
`;
            }

            // Otherwise, general axiomatic physics / lifestyle note
            if (!tags.includes('pkm/axiomatic')) tags.unshift('pkm/axiomatic');

            let metricsObj = node.leaf_properties || {};
            if (Object.keys(metricsObj).length === 0 && node.axiomatic_constants) {
                metricsObj = node.axiomatic_constants;
            }

            let metricsYaml = '';
            let metricsTableRows = '';
            for (const [k, v] of Object.entries(metricsObj)) {
                metricsYaml += `  ${k}: ${typeof v === 'string' ? `"${v}"` : v}\n`;
                metricsTableRows += `| **${k}** | \`${v}\` | 標準定義 |\n`;
            }
            if (!metricsYaml) metricsYaml = '  # 無特定原子指標\n';
            if (!metricsTableRows) metricsTableRows = '| **狀態** | \`定義中\` | 預設 |\n';

            return `---
code: "${node.code}"
universe_id: "${universeId}"
hierarchy:
  l1: "${hier.l1 || ''}"
  l2: "${hier.l2 || ''}"
  l3: "${hier.l3 || ''}"
  l4: "${hier.l4 || ''}"
  l5: "${hier.l5 || hier[node.level.toLowerCase()] || ''}"
tags:
${tags.map(t => `  - ${t}`).join('\n')}
relations:
  - "[[\${ancestors[ancestors.length - 1]?.name || '上層關聯'}]]"
metrics:
${metricsYaml.trimEnd()}
updated: ${today}
---

# ${node.name}

> [!INFO] 8 級公理階層代碼: \`${node.code}\` (層級: ${node.level})
> 隸屬公理域: **${uniNode.name}** (\`${universeId}\`)

## L5: 核心原理與拓撲 (Concept & Method)
本筆記記錄 **${node.name}** 之核心概念、運作架構與理論基礎。

## L6: 實現架構與關鍵控制點 (Implementation & Critical Points)
- **架構特徵**: 遵循 ${hier.l4 || '專案規範'} 之工程與實作要求。
- **關鍵控制點**: 確保參數符合物理公理邊界與運作穩定性。

## L7: 具體實例與 SOP 步驟 (Recipe / SOP / Model)
1. **前置準備**: 檢查環境條件與初始設定。
2. **作業流程**: 依據標準程序進行操作與調校。
3. **驗證校準**: 檢測輸出結果並記錄原子指標。

## L8: 實測極限指標與參數規範 (Atomic Metrics)
| 參數項目 | 規格值 / 指標 | 測試基準 / 條件 |
| :--- | :--- | :--- |
${metricsTableRows.trimEnd()}
`;
        }

        downloadPkmMarkdown(node) {
            const md = this.generatePkmMarkdown(node);
            const safeName = (node.name || 'note').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 50);
            const fileName = `${node.raw_code || node.code}_${safeName}.md`;
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        exportJSON() {
            let exportData;
            if (this.activePreset === 'electronics') {
                exportData = this.electronicsTaxonomy || ELECTRONICS_TAXONOMY_SCHEMA;
            } else if (this.activePreset === 'axiomatic') {
                exportData = {
                    "$schema": "https://json-schema.org/draft/2020-12/schema",
                    "taxonomy_metadata": this.taxonomy.taxonomy_metadata,
                    "universes": this.taxonomy.universes.filter(u => u.code !== '01' && !u.code.startsWith('01'))
                };
            } else {
                exportData = {
                    ...this.taxonomy,
                    "electronics_component_library": this.electronicsTaxonomy || ELECTRONICS_TAXONOMY_SCHEMA,
                    "manufacturers_registry": (this.electronicsTaxonomy && this.electronicsTaxonomy.manufacturers_registry) || ELECTRONICS_TAXONOMY_SCHEMA.manufacturers_registry
                };
            }

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `webcom_taxonomy_8level_${this.activePreset}_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        importJSON(content) {
            try {
                const parsed = JSON.parse(content);
                if (!parsed) return { success: false, message: 'JSON 格式無效或為空' };

                // Case 1: Standard electronics component library schema
                if (parsed.schema === 'electronics_component_library_taxonomy_8level' ||
                    (parsed._metadata && parsed._metadata.schema === 'electronics_component_library_taxonomy_8level') ||
                    (parsed.taxonomy_tree && Array.isArray(parsed.taxonomy_tree))) {

                    this.electronicsTaxonomy = parsed;
                    const convertedNode = convertElectronicsNode(parsed.taxonomy_tree[0]);

                    const existingIdx = this.taxonomy.universes.findIndex(u => u.code === convertedNode.code);
                    if (existingIdx >= 0) {
                        this.taxonomy.universes[existingIdx] = convertedNode;
                    } else {
                        this.taxonomy.universes.push(convertedNode);
                    }

                    this.saveTaxonomy();
                    this.setPreset('electronics');
                    const presetSelect = document.getElementById('taxonomy-preset-select');
                    if (presetSelect) presetSelect.value = 'electronics';

                    this.focusNode('01');
                    return { success: true, count: 1, type: 'electronics' };
                }

                // Case 2: Axiomatic universes
                if (parsed.universes && Array.isArray(parsed.universes)) {
                    this.taxonomy = parsed;
                    this._mergeMissingDefaults(this.taxonomy);
                    this.saveTaxonomy();
                    this.setPreset('axiomatic');
                    const presetSelect = document.getElementById('taxonomy-preset-select');
                    if (presetSelect) presetSelect.value = 'axiomatic';

                    this.focusNode(parsed.universes[0]?.code || 'U00');
                    return { success: true, count: parsed.universes.length, type: 'universes' };
                }

                return { success: false, message: 'JSON 缺少有效的 universes 或 taxonomy_tree 規格節點' };
            } catch (e) {
                return { success: false, message: `解析失敗: ${e.message}` };
            }
        }

        initEvents() {
            // Preset Switcher Select
            const presetSelect = document.getElementById('taxonomy-preset-select');
            if (presetSelect) {
                presetSelect.value = this.activePreset;
                presetSelect.addEventListener('change', (e) => {
                    this.setPreset(e.target.value);
                });
            }

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
                        const lvlInfo = this.getLevelInfo(n.level, n.is_electronics);
                        div.innerHTML = `
                            <div class="flex items-center gap-1.5 font-mono">
                                <span class="text-[9px] px-1 py-0.2 rounded font-bold ${lvlInfo.badge}">${n.level}</span>
                                <span class="text-purple-300 font-bold">${n.raw_code || n.code}</span>
                                ${n.ipn ? `<span class="text-[9px] text-cyan-400">(${n.ipn})</span>` : ''}
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
                            alert(`成功匯入 8 級階層目錄規格 (${res.type === 'electronics' ? '電子元件與 AVL 體系' : '宇宙公理域'})！`);
                            const treeList = document.getElementById('taxonomy-tree-list');
                            if (treeList) this.renderTree(treeList);
                        }
                    };
                    reader.readAsText(file);
                });
            }

            // Reset
            document.getElementById('btn-reset-taxonomy')?.addEventListener('click', () => {
                if (confirm('確定重設 8 級公理階層體系為標準預設值？')) {
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
    window.ELECTRONICS_LEVELS = ELECTRONICS_LEVELS;
    window.ELECTRONICS_TAXONOMY_SCHEMA = ELECTRONICS_TAXONOMY_SCHEMA;

    document.addEventListener('DOMContentLoaded', () => {
        taxonomyEngine.initEvents();
    });
})();
