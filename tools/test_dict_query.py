import sqlite3
import time
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'C:\Apps\webcom_AI\data\dictionary_rag.db')
cur = conn.cursor()

def test_query(q):
    t0 = time.time()
    cur.execute('''
        SELECT word, category_name, zhuyin, definition, synonyms, antonyms 
        FROM dictionary_entries 
        WHERE word = ? OR word LIKE ?
        LIMIT 3
    ''', (q, f'{q}%'))
    rows = cur.fetchall()
    ms = (time.time() - t0) * 1000
    print(f'Exact/Prefix Query "{q}" in {ms:.2f}ms: found {len(rows)} rows')
    for r in rows:
        defn = (r[3] or '').replace('\n', ' ')[:60]
        print(f'  [{r[1]}] {r[0]} ({r[2]}): {defn}...')

def test_fts(kw):
    t0 = time.time()
    cur.execute('''
        SELECT e.word, e.category_name, e.zhuyin, snippet(dictionary_fts, 6, '<b>', '</b>', '...', 10)
        FROM dictionary_fts f
        JOIN dictionary_entries e ON f.rowid = e.id
        WHERE dictionary_fts MATCH ?
        LIMIT 3
    ''', (kw,))
    rows = cur.fetchall()
    ms = (time.time() - t0) * 1000
    print(f'FTS Query "{kw}" in {ms:.2f}ms: found {len(rows)} rows')
    for r in rows:
        snip = (r[3] or '').replace('\n', ' ')
        print(f'  [{r[1]}] {r[0]} ({r[2]}): {snip}')

def test_graph_relations(word):
    t0 = time.time()
    cur.execute('''
        SELECT relation, target_word FROM dictionary_relations
        WHERE source_word = ?
        LIMIT 5
    ''', (word,))
    rows = cur.fetchall()
    ms = (time.time() - t0) * 1000
    print(f'Graph Relations for "{word}" in {ms:.2f}ms: {rows}')

test_query('破釜沉舟')
test_query('天')
test_fts('堅持')
test_graph_relations('破釜沉舟')
test_graph_relations('謙虛')
