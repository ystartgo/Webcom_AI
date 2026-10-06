import sqlite3
import json
import time
import sys
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "dictionary_rag.db"
RAGPACK_DIR = PROJECT_ROOT / "data" / "ragpacks"
RAGPACK_DIR.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("⚡ 正在從 SQLite 資料庫高速產生含繁簡對照之精華 RagPack...")

# 1. 精選成語包 (2,500條)
cur.execute("""
    SELECT dict_id, word, simplified, zhuyin, pinyin, synonyms, antonyms, definition
    FROM dictionary_entries
    WHERE category = 'idioms' AND (synonyms != '' OR antonyms != '' OR length(definition) > 30)
    LIMIT 2500
""")
idioms = []
for r in cur.fetchall():
    w = r["word"]
    sim = r["simplified"]
    zhuyin = r["zhuyin"]
    pinyin = r["pinyin"]
    defn = r["definition"]
    syn = r["synonyms"]
    ant = r["antonyms"]
    simp_str = f" (簡體: {sim})" if sim and sim != w else ""
    content = f"【成語】{w}{simp_str}\n【注音】{zhuyin}\n【拼音】{pinyin}\n【釋義】{defn}"
    if syn: content += f"\n【相似詞】{syn}"
    if ant: content += f"\n【相反詞】{ant}"
    idioms.append({
        "id": f"idiom_{r['dict_id']}",
        "title": f"成語：{w}{simp_str}",
        "category": "idioms",
        "content": content,
        "metadata": {
            "word": w,
            "simplified": sim,
            "zhuyin": zhuyin,
            "pinyin": pinyin,
            "synonyms": syn,
            "antonyms": ant
        }
    })

# 2. 國字部首包 (1,500條)
cur.execute("""
    SELECT dict_id, word, simplified, radical, total_strokes, non_radical_strokes, zhuyin, pinyin, definition, variant_chars
    FROM dictionary_entries
    WHERE category = 'single_chars'
    LIMIT 1500
""")
chars = []
for r in cur.fetchall():
    w = r["word"]
    sim = r["simplified"]
    rad = r["radical"]
    strokes = r["total_strokes"]
    non_rad = r["non_radical_strokes"]
    zhuyin = r["zhuyin"]
    pinyin = r["pinyin"]
    defn = r["definition"]
    vars_ = r["variant_chars"]
    simp_str = f" (簡體: {sim})" if sim and sim != w else ""
    content = f"【國字】{w}{simp_str}\n【部首】{rad} (總筆畫: {strokes} 畫，部首外: {non_rad} 畫)\n【注音】{zhuyin}\n【拼音】{pinyin}\n【釋義】{defn}"
    if vars_: content += f"\n【異體字】{vars_}"
    chars.append({
        "id": f"char_{r['dict_id']}",
        "title": f"國字：{w}{simp_str} (部首: {rad}, {strokes}畫)",
        "category": "single_chars",
        "content": content,
        "metadata": {
            "word": w,
            "simplified": sim,
            "radical": rad,
            "strokes": strokes,
            "zhuyin": zhuyin
        }
    })

# 3. 俗諺名句包 (1,200條)
cur.execute("""
    SELECT dict_id, word, simplified, zhuyin, pinyin, definition
    FROM dictionary_entries
    WHERE category = 'phrases_proverbs'
    LIMIT 1200
""")
proverbs = []
for r in cur.fetchall():
    w = r["word"]
    sim = r["simplified"]
    zhuyin = r["zhuyin"]
    defn = r["definition"]
    simp_str = f" (簡體: {sim})" if sim and sim != w else ""
    content = f"【俗諺名句】{w}{simp_str}\n【注音】{zhuyin}\n【釋義】{defn}"
    proverbs.append({
        "id": f"proverb_{r['dict_id']}",
        "title": f"俗諺名句：{w}{simp_str}",
        "category": "phrases_proverbs",
        "content": content,
        "metadata": {
            "word": w,
            "simplified": sim,
            "zhuyin": zhuyin
        }
    })

packs = [
    ("moe_idioms_essential.ragpack.json", "教育部國語辭典：常用四字成語精選包 (2,500條 · 含繁簡對照)", idioms),
    ("moe_radicals_and_chars.ragpack.json", "教育部國語辭典：核心國字與部首規範包 (1,500條 · 含繁簡對照)", chars),
    ("moe_proverbs_sayings.ragpack.json", "教育部國語辭典：俗諺歇後語與名言名句包 (1,200條 · 含繁簡對照)", proverbs)
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

conn.close()
print("🎉 模組化精華包更新完成！")
