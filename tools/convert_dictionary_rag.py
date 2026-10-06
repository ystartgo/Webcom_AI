#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Webcom AI - 教育部國語辭典修訂本 RAG 高效能轉換與分類索引建置工具
Author: startgo (startgo@yia.app) | Webcom AI

功能：
1. 流式讀取 163,924 筆 Dictionary_Zh_TW.xlsx (免記憶體膨脹)
2. 進行 RAG 語意多維度分類 (成語典故、國字部首、俗諺名句、同反義語意網絡、現代通用、文言生僻)
3. 建立 SQLite + FTS5 全文索引資料庫 (data/dictionary_rag.db)，檢索時間 < 5ms
4. 抽取同義詞/反義詞關係邊，建構 GraphRAG 關聯網絡
5. 匯出模組化精華輕量知識包 (.ragpack.json)，方便前端免伺服器直接秒載使用
"""

import os
import sys
import time
import json
import sqlite3
import re
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = PROJECT_ROOT / "Dictionary_Zh_TW.xlsx"
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "dictionary_rag.db"
RAGPACK_DIR = DATA_DIR / "ragpacks"

CATEGORY_NAMES = {
    'idioms': '成語與四字熟語',
    'single_chars': '國字與部首規範',
    'phrases_proverbs': '俗諺歇後語與名言',
    'semantic_network': '同反義語意網絡詞',
    'rare_classical': '文言生僻與典籍古音',
    'common_lexicon': '現代繁體通用詞彙'
}

def clean_cell(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.startswith('="') and s.endswith('"'):
        s = s[2:-1]
    return s

def classify_entry(word, char_count, syn, ant, var_zhuyin, defn):
    """
    RAG 智能分類演算法：
    1. single_chars: 單字 (char_count == 1)
    2. idioms: 四字成語與典故熟語 (char_count == 4)
    3. phrases_proverbs: 五字及以上之名句、俗諺、歇後語 (char_count >= 5)
    4. semantic_network: 具有相似詞或相反詞的詞彙 (2~3字為主，構成高密度語意網絡)
    5. rare_classical: 含變體音、生僻音或古漢語標注
    6. common_lexicon: 現代通用繁體詞彙
    """
    if char_count == 1:
        return 'single_chars'
    elif char_count == 4:
        return 'idioms'
    elif char_count >= 5:
        return 'phrases_proverbs'
    elif syn or ant:
        return 'semantic_network'
    elif var_zhuyin:
        return 'rare_classical'
    else:
        return 'common_lexicon'

def init_database(db_path: Path):
    """建立支援 FTS5 與 GraphRAG 實體關聯的 SQLite 資料庫結構"""
    if db_path.exists():
        try:
            db_path.unlink()
        except Exception:
            pass

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # 優化寫入效能
    cur.execute("PRAGMA journal_mode = WAL;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA temp_store = MEMORY;")
    cur.execute("PRAGMA cache_size = -64000;") # 64MB cache

    # 主表
    cur.execute("""
    CREATE TABLE IF NOT EXISTS dictionary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dict_id TEXT,
        word TEXT NOT NULL,
        alias TEXT,
        char_count INTEGER,
        category TEXT NOT NULL,
        category_name TEXT NOT NULL,
        radical TEXT,
        total_strokes INTEGER,
        non_radical_strokes INTEGER,
        polyphone_order INTEGER,
        zhuyin TEXT,
        pinyin TEXT,
        variant_zhuyin TEXT,
        variant_pinyin TEXT,
        synonyms TEXT,
        antonyms TEXT,
        definition TEXT,
        polyphone_ref TEXT,
        variant_chars TEXT,
        simplified TEXT
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_word ON dictionary_entries(word);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_category ON dictionary_entries(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_radical ON dictionary_entries(radical);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_zhuyin ON dictionary_entries(zhuyin);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_pinyin ON dictionary_entries(pinyin);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_char_count ON dictionary_entries(char_count);")

    # FTS5 全文檢索虛擬表 (支援詞、注音、拼音、部首、同反義詞、釋義即時高光檢索)
    cur.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_fts USING fts5(
        word,
        zhuyin,
        pinyin,
        radical,
        synonyms,
        antonyms,
        definition,
        category UNINDEXED,
        content='dictionary_entries',
        content_rowid='id',
        tokenize='unicode61'
    );
    """)

    # 關聯三元組表 (GraphRAG 實體網絡)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS dictionary_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_word TEXT NOT NULL,
        relation TEXT NOT NULL,
        target_word TEXT NOT NULL,
        entry_id INTEGER
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_rel_src ON dictionary_relations(source_word);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_rel_tgt ON dictionary_relations(target_word);")

    # 分類統計快取表
    cur.execute("""
    CREATE TABLE IF NOT EXISTS category_stats (
        category TEXT PRIMARY KEY,
        category_name TEXT NOT NULL,
        entry_count INTEGER NOT NULL,
        description TEXT
    );
    """)

    conn.commit()
    return conn

def parse_relation_words(text):
    """解析相似詞或相反詞欄位中的多個詞條"""
    if not text:
        return []
    # 支援逗號、頓號、分號、空格分隔
    parts = re.split(r'[,、;；\s]+', text.strip())
    return [p.strip() for p in parts if p.strip()]

def convert_excel_to_rag(excel_path: Path, db_path: Path, ragpack_dir: Path):
    import openpyxl

    print(f"📖 開始開啟辭典檔案：{excel_path} ...")
    t0 = time.time()
    wb = openpyxl.load_workbook(str(excel_path), read_only=True)
    ws = wb.active
    print(f"✅ Excel 載入耗時：{time.time() - t0:.2f} 秒 (工作表: {ws.title})")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAGPACK_DIR.mkdir(parents=True, exist_ok=True)

    conn = init_database(db_path)
    cur = conn.cursor()

    row_iter = ws.iter_rows(values_only=True)
    headers = [str(c or '').strip() for c in next(row_iter)]
    idx = {h: i for i, h in enumerate(headers)}
    print(f"📋 偵測到 {len(headers)} 個欄位：{headers[:8]}...")

    category_counts = {k: 0 for k in CATEGORY_NAMES}
    total_rows = 0
    batch_entries = []
    batch_relations = []
    
    # 收集輕量精選包 (免前端大檔 lag)
    curated_idioms = []
    curated_radicals = []
    curated_proverbs = []

    print("🚀 開始串流解析與建立 RAG 索引...")
    t_process = time.time()

    for r in row_iter:
        word = clean_cell(r[idx.get('字詞名', 0)])
        if not word:
            continue

        total_rows += 1
        dict_id = clean_cell(r[idx.get('字詞號', 3)])
        alias = clean_cell(r[idx.get('辭條別名', 1)])
        
        try:
            char_count = int(r[idx.get('字數', 2)] or len(word))
        except (ValueError, TypeError):
            char_count = len(word)

        radical = clean_cell(r[idx.get('部首字', 4)])
        
        try:
            total_strokes = int(r[idx.get('總筆畫數', 5)] or 0)
        except (ValueError, TypeError):
            total_strokes = 0
            
        try:
            non_rad_strokes = int(r[idx.get('部首外筆畫數', 6)] or 0)
        except (ValueError, TypeError):
            non_rad_strokes = 0

        try:
            poly_order = int(r[idx.get('多音排序', 7)] or 0)
        except (ValueError, TypeError):
            poly_order = 0

        zhuyin = clean_cell(r[idx.get('注音一式', 8)])
        var_zhuyin = clean_cell(r[idx.get('變體注音', 10)])
        pinyin = clean_cell(r[idx.get('漢語拼音', 11)])
        var_pinyin = clean_cell(r[idx.get('變體漢語拼音', 12)])
        synonyms = clean_cell(r[idx.get('相似詞', 13)])
        antonyms = clean_cell(r[idx.get('相反詞', 14)])
        definition = clean_cell(r[idx.get('釋義', 15)])
        poly_ref = clean_cell(r[idx.get('多音參見訊息', 16)])
        var_chars = clean_cell(r[idx.get('異體字', 17)])
        simplified = clean_cell(r[idx.get('简体中文', 18)])

        # 智能分類
        cat = classify_entry(word, char_count, synonyms, antonyms, var_zhuyin, definition)
        category_counts[cat] += 1
        cat_name = CATEGORY_NAMES[cat]

        entry_data = (
            dict_id, word, alias, char_count, cat, cat_name,
            radical, total_strokes, non_rad_strokes, poly_order,
            zhuyin, pinyin, var_zhuyin, var_pinyin,
            synonyms, antonyms, definition, poly_ref, var_chars, simplified
        )
        batch_entries.append(entry_data)

        # 抽取 GraphRAG 實體關聯三元組
        if synonyms:
            for s_word in parse_relation_words(synonyms):
                batch_relations.append((word, '相似詞', s_word, total_rows))
        if antonyms:
            for a_word in parse_relation_words(antonyms):
                batch_relations.append((word, '相反詞', a_word, total_rows))

        # 挑選精華包條目 (成語、部首字、名句俗諺)
        if cat == 'idioms' and len(curated_idioms) < 2500:
            if definition and (synonyms or antonyms or len(definition) > 30):
                curated_idioms.append({
                    "id": f"idiom_{dict_id or total_rows}",
                    "title": f"成語：{word}",
                    "category": "idioms",
                    "content": f"【成語】{word}\n【注音】{zhuyin}\n【拼音】{pinyin}\n【釋義】{definition}" + (f"\n【相似詞】{synonyms}" if synonyms else "") + (f"\n【相反詞】{antonyms}" if antonyms else ""),
                    "metadata": {"word": word, "zhuyin": zhuyin, "pinyin": pinyin, "synonyms": synonyms, "antonyms": antonyms}
                })
        elif cat == 'single_chars' and len(curated_radicals) < 1500:
            curated_radicals.append({
                "id": f"char_{dict_id or total_rows}",
                "title": f"國字：{word} (部首: {radical}, 筆畫: {total_strokes})",
                "category": "single_chars",
                "content": f"【字詞】{word}\n【部首】{radical} (總筆畫: {total_strokes} 畫，部首外: {non_rad_strokes} 畫)\n【注音】{zhuyin}\n【拼音】{pinyin}\n【釋義】{definition}" + (f"\n【異體字】{var_chars}" if var_chars else ""),
                "metadata": {"word": word, "radical": radical, "strokes": total_strokes, "zhuyin": zhuyin}
            })
        elif cat == 'phrases_proverbs' and len(curated_proverbs) < 1200:
            curated_proverbs.append({
                "id": f"proverb_{dict_id or total_rows}",
                "title": f"俗諺名句：{word}",
                "category": "phrases_proverbs",
                "content": f"【名句】{word}\n【注音】{zhuyin}\n【釋義】{definition}",
                "metadata": {"word": word, "zhuyin": zhuyin}
            })

        # 批量寫入資料庫
        if len(batch_entries) >= 5000:
            cur.executemany("""
            INSERT INTO dictionary_entries (
                dict_id, word, alias, char_count, category, category_name,
                radical, total_strokes, non_radical_strokes, polyphone_order,
                zhuyin, pinyin, variant_zhuyin, variant_pinyin,
                synonyms, antonyms, definition, polyphone_ref, variant_chars, simplified
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
            """, batch_entries)
            
            if batch_relations:
                cur.executemany("""
                INSERT INTO dictionary_relations (source_word, relation, target_word, entry_id)
                VALUES (?,?,?,?);
                """, batch_relations)
                
            conn.commit()
            batch_entries = []
            batch_relations = []
            print(f"  已處理 {total_rows:,} 條詞彙... ({total_rows/163924*100:.1f}%)")

    # 寫入剩餘記錄
    if batch_entries:
        cur.executemany("""
        INSERT INTO dictionary_entries (
            dict_id, word, alias, char_count, category, category_name,
            radical, total_strokes, non_radical_strokes, polyphone_order,
            zhuyin, pinyin, variant_zhuyin, variant_pinyin,
            synonyms, antonyms, definition, polyphone_ref, variant_chars, simplified
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
        """, batch_entries)
        
    if batch_relations:
        cur.executemany("""
        INSERT INTO dictionary_relations (source_word, relation, target_word, entry_id)
        VALUES (?,?,?,?);
        """, batch_relations)
    conn.commit()

    print(f"⚡ 資料寫入完成！總計：{total_rows:,} 筆。建立 FTS5 全文索引中...")
    t_fts = time.time()
    cur.execute("""
    INSERT INTO dictionary_fts(rowid, word, zhuyin, pinyin, radical, synonyms, antonyms, definition, category)
    SELECT id, word, zhuyin, pinyin, radical, synonyms, antonyms, definition, category
    FROM dictionary_entries;
    """)
    conn.commit()
    print(f"✅ FTS5 全文索引建立完成，耗時：{time.time() - t_fts:.2f} 秒！")

    # 記錄分類統計快取
    cat_desc = {
        'idioms': '四字成語、經典名言典故、熟語出處與近反義對仗',
        'single_chars': '常用單字、教育部規範部首、筆畫、說文解字與異體字標注',
        'phrases_proverbs': '五字以上俗諺名句、歇後語、古詩詞聯句與民間諺語',
        'semantic_network': '具備相似詞或相反詞關聯之字詞，支援 GraphRAG 實體網絡跳轉',
        'rare_classical': '文言典籍、古音讀法、多音異讀與生僻字音訓',
        'common_lexicon': '日常生活、科技文化、各專業學術領域常用現代繁體詞彙'
    }
    for cat_id, cnt in category_counts.items():
        cur.execute("""
        INSERT OR REPLACE INTO category_stats (category, category_name, entry_count, description)
        VALUES (?,?,?,?);
        """, (cat_id, CATEGORY_NAMES[cat_id], cnt, cat_desc.get(cat_id, '')))
    conn.commit()
    conn.close()

    # 匯出精華包 (.ragpack.json)
    print("📦 匯出前端輕量化免卡頓知識包 (.ragpack.json)...")
    packs = [
        ("moe_idioms_essential.ragpack.json", "教育部國語辭典：常用四字成語精選包 (2,500條)", curated_idioms),
        ("moe_radicals_and_chars.ragpack.json", "教育部國語辭典：核心國字與部首規範包 (1,500條)", curated_radicals),
        ("moe_proverbs_sayings.ragpack.json", "教育部國語辭典：俗諺歇後語與名言名句包 (1,200條)", curated_proverbs)
    ]
    for filename, pack_title, docs in packs:
        out_path = RAGPACK_DIR / filename
        pack_data = {
            "version": "1.0",
            "name": pack_title,
            "category": "moe_dictionary",
            "count": len(docs),
            "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "documents": docs
        }
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(pack_data, f, ensure_ascii=False, indent=2)
        print(f"  ✨ {filename}: {len(docs)} 條 ({out_path.stat().st_size / (1024*1024):.2f} MB)")

    db_size_mb = db_path.stat().st_size / (1024 * 1024)
    print("\n" + "="*60)
    print(f"🎉 辭典 RAG 轉換與分類建置全部完成！總耗時：{time.time() - t_process:.2f} 秒")
    print(f"📁 SQLite FTS5 資料庫路徑：{db_path} (大小：{db_size_mb:.2f} MB)")
    print(f"📊 分類統計明細：")
    for cat_id, count in category_counts.items():
        print(f"  ● {CATEGORY_NAMES[cat_id]:18s} ({cat_id:18s}): {count:7,d} 條")
    print(f"  總條目數：{total_rows:,} 條")
    print("="*60)

if __name__ == "__main__":
    convert_excel_to_rag(EXCEL_PATH, DB_PATH, RAGPACK_DIR)
