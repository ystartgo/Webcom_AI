#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Webcom AI - 教育部國語辭典修訂本 高效能 RAG 檢索與語意圖譜引擎
Author: startgo (startgo@yia.app) | Webcom AI

特色：
- 零前端記憶體膨脹：163,924 筆完整詞條由後端 SQLite + FTS5 全文索引託管
- 毫秒級檢索 (<5ms)：精確比對、字首比對、FTS5 全文高光比對
- 語意分類過濾：idioms, single_chars, phrases_proverbs, semantic_network, common_lexicon, rare_classical
- GraphRAG 實體三元組：提供相似詞、相反詞自動聯想與提示詞上下文注入
"""

import time
import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DICT_DB_PATH = DATA_DIR / "dictionary_rag.db"
RAGPACK_DIR = DATA_DIR / "ragpacks"

CATEGORY_NAMES = {
    'idioms': '成語與四字熟語',
    'single_chars': '國字與部首規範',
    'phrases_proverbs': '俗諺歇後語與名言',
    'semantic_network': '同反義語意網絡詞',
    'rare_classical': '文言生僻與典籍古音',
    'common_lexicon': '現代繁體通用詞彙'
}

class DictionaryEngine:
    def __init__(self, db_path: Path = DICT_DB_PATH):
        self.db_path = db_path
        self._categories_cache = None

    def is_ready(self) -> bool:
        return self.db_path.exists() and self.db_path.stat().st_size > 1000

    def get_connection(self) -> Optional[sqlite3.Connection]:
        if not self.is_ready():
            return None
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def get_categories(self) -> Dict[str, Any]:
        """取得分類列表與統計條目數"""
        if self._categories_cache:
            return self._categories_cache

        conn = self.get_connection()
        if not conn:
            return {
                "status": "error",
                "message": "辭典資料庫尚未建置，請執行 tools/convert_dictionary_rag.py",
                "total_entries": 0,
                "categories": []
            }

        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT category, category_name, entry_count, description 
                FROM category_stats 
                ORDER BY entry_count DESC
            """)
            rows = cur.fetchall()
            total = sum(r["entry_count"] for r in rows)
            categories = [{
                "id": r["category"],
                "name": r["category_name"],
                "count": r["entry_count"],
                "desc": r["description"]
            } for r in rows]

            res = {
                "status": "success",
                "total_entries": total,
                "categories": categories
            }
            self._categories_cache = res
            return res
        finally:
            conn.close()

    def search(
        self,
        query: str,
        category: Optional[str] = "all",
        limit: int = 15,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        高效能複合搜尋：
        1. 優先精確詞條比對
        2. 字首比對 (prefix match)
        3. FTS5 全文檢索 (釋義、注音、拼音、部首、同反義詞)
        4. 補全關聯三元組 (GraphRAG 相似詞/相反詞)
        """
        t0 = time.time()
        conn = self.get_connection()
        if not conn:
            return {
                "status": "error",
                "message": "辭典資料庫尚未建置",
                "query": query,
                "count": 0,
                "results": [],
                "latency_ms": 0
            }

        q = (query or "").strip()
        if not q:
            return {
                "status": "success",
                "query": "",
                "category": category,
                "count": 0,
                "results": [],
                "latency_ms": 0
            }

        limit = min(max(1, limit), 100)
        offset = max(0, offset)
        category_clean = category.strip() if category else "all"

        try:
            cur = conn.cursor()
            results = []
            seen_ids = set()

            # 1. 精確比對 (Exact Match - 支援繁體與簡體即時命中)
            exact_sql = """
                SELECT id, dict_id, word, char_count, category, category_name,
                       radical, total_strokes, non_radical_strokes, zhuyin, pinyin,
                       variant_zhuyin, variant_pinyin, synonyms, antonyms,
                       definition, polyphone_ref, variant_chars, simplified
                FROM dictionary_entries
                WHERE (word = ? OR simplified = ?)
            """
            params = [q, q]
            if category_clean != "all":
                exact_sql += " AND category = ?"
                params.append(category_clean)
            exact_sql += " LIMIT ?"
            params.append(limit)

            cur.execute(exact_sql, params)
            for r in cur.fetchall():
                d = dict(r)
                seen_ids.add(d["id"])
                d["match_type"] = "exact"
                results.append(d)

            # 2. 字首比對 (Prefix Match using B-tree range query with UNION - sub-5ms)
            if len(results) < limit:
                remaining = limit - len(results)
                q_upper = q + chr(0x10ffff)
                cat_clause = " AND category = ?" if category_clean != "all" else ""
                prefix_sql = f"""
                    SELECT id, dict_id, word, char_count, category, category_name,
                           radical, total_strokes, non_radical_strokes, zhuyin, pinyin,
                           variant_zhuyin, variant_pinyin, synonyms, antonyms,
                           definition, polyphone_ref, variant_chars, simplified
                    FROM dictionary_entries
                    WHERE word >= ? AND word < ? AND word != ?{cat_clause}
                    UNION
                    SELECT id, dict_id, word, char_count, category, category_name,
                           radical, total_strokes, non_radical_strokes, zhuyin, pinyin,
                           variant_zhuyin, variant_pinyin, synonyms, antonyms,
                           definition, polyphone_ref, variant_chars, simplified
                    FROM dictionary_entries
                    WHERE simplified >= ? AND simplified < ? AND simplified != ?{cat_clause}
                    LIMIT ?
                """
                params = [q, q_upper, q]
                if category_clean != "all":
                    params.append(category_clean)
                params.extend([q, q_upper, q])
                if category_clean != "all":
                    params.append(category_clean)
                params.append(remaining * 2)

                cur.execute(prefix_sql, params)
                for r in cur.fetchall():
                    d = dict(r)
                    if d["id"] not in seen_ids:
                        seen_ids.add(d["id"])
                        d["match_type"] = "prefix"
                        results.append(d)
                        if len(results) >= limit:
                            break

            # 3. FTS5 全文索引比對 (Full-Text Search on Definition & Synonyms)
            if len(results) < limit:
                remaining = limit - len(results)
                fts_query = f'"{q}"' if ' ' not in q else q
                fts_sql = """
                    SELECT e.id, e.dict_id, e.word, e.char_count, e.category, e.category_name,
                           e.radical, e.total_strokes, e.non_radical_strokes, e.zhuyin, e.pinyin,
                           e.variant_zhuyin, e.variant_pinyin, e.synonyms, e.antonyms,
                           e.definition, e.polyphone_ref, e.variant_chars, e.simplified,
                           snippet(dictionary_fts, 6, '<mark>', '</mark>', '...', 12) as snippet
                    FROM dictionary_fts f
                    JOIN dictionary_entries e ON f.rowid = e.id
                    WHERE dictionary_fts MATCH ?
                """
                fts_params = [fts_query]
                if category_clean != "all":
                    fts_sql += " AND e.category = ?"
                    fts_params.append(category_clean)
                fts_sql += " LIMIT ?"
                fts_params.append(remaining * 3)

                try:
                    cur.execute(fts_sql, fts_params)
                    for r in cur.fetchall():
                        d = dict(r)
                        if d["id"] not in seen_ids:
                            seen_ids.add(d["id"])
                            d["match_type"] = "fts"
                            results.append(d)
                            if len(results) >= limit:
                                break
                except Exception:
                    pass

            # 4. 抽取關聯實體 (Graph Triples)
            for item in results[:6]:
                w = item["word"]
                cur.execute("""
                    SELECT relation, target_word 
                    FROM dictionary_relations 
                    WHERE source_word = ? 
                    LIMIT 8
                """, (w,))
                item["relations"] = [{"relation": rel, "target": tgt} for rel, tgt in cur.fetchall()]

            latency_ms = round((time.time() - t0) * 1000, 2)
            return {
                "status": "success",
                "query": q,
                "category": category_clean,
                "count": len(results),
                "results": results,
                "latency_ms": latency_ms
            }
        finally:
            conn.close()

    def get_word(self, word: str) -> Optional[Dict[str, Any]]:
        """精確查詢單字或詞條詳細資料，含圖譜關聯"""
        conn = self.get_connection()
        if not conn:
            return None
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM dictionary_entries WHERE word = ? OR simplified = ? LIMIT 1", (word.strip(), word.strip()))
            row = cur.fetchone()
            if not row:
                return None
            entry = dict(row)

            # 抓取雙向關聯
            cur.execute("""
                SELECT relation, target_word FROM dictionary_relations 
                WHERE source_word = ?
                UNION
                SELECT '被' || relation, source_word FROM dictionary_relations 
                WHERE target_word = ?
                LIMIT 15
            """, (word.strip(), word.strip()))
            entry["relations"] = [{"relation": r[0], "target": r[1]} for r in cur.fetchall()]
            return entry
        finally:
            conn.close()

    def format_rag_prompt(self, word_or_query: str, results: List[Dict[str, Any]]) -> str:
        """將辭典條目格式化為適合注入 LLM System Prompt 的 RAG 上下文 (含繁簡對照)"""
        if not results:
            return ""
        lines = [f"=== 教育部國語辭典修訂本參考資料 (查詢: {word_or_query}) ==="]
        for idx, item in enumerate(results[:5], 1):
            w = item.get("word", "")
            sim = item.get("simplified", "")
            cat = item.get("category_name", "")
            zhuyin = item.get("zhuyin", "")
            pinyin = item.get("pinyin", "")
            defn = (item.get("definition") or "").replace("\r\n", " ").replace("\n", " ")
            syn = item.get("synonyms")
            ant = item.get("antonyms")

            sim_str = f" [簡體: {sim}]" if sim and sim != w else ""
            chunk = f"{idx}. 【{w}】{sim_str} [{cat}] 注音: {zhuyin} | 拼音: {pinyin}\n   釋義: {defn}"
            if syn:
                chunk += f"\n   相似詞: {syn}"
            if ant:
                chunk += f"\n   相反詞: {ant}"
            lines.append(chunk)
        return "\n".join(lines)

    def list_curated_ragpacks(self) -> List[Dict[str, Any]]:
        """列出預先建立的前端免延遲模組化知識包"""
        if not RAGPACK_DIR.exists():
            return []
        packs = []
        for p in RAGPACK_DIR.glob("*.ragpack.json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                packs.append({
                    "filename": p.name,
                    "title": meta.get("name", p.stem),
                    "count": meta.get("count", 0),
                    "size_kb": round(p.stat().st_size / 1024, 1),
                    "url": f"/api/rag/dictionary/download/{p.name}"
                })
            except Exception:
                pass
        return sorted(packs, key=lambda x: x["count"], reverse=True)

backend_dictionary = DictionaryEngine()
