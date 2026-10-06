import urllib.request
import json
import urllib.parse
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

for query in ['義無反顧', '国家', '學習', '破釜沉舟']:
    q_enc = urllib.parse.quote(query)
    res = urllib.request.urlopen(f'http://127.0.0.1:8001/api/rag/dictionary/search?q={q_enc}')
    data = json.loads(res.read().decode('utf-8'))
    print(f'Search "{query}" -> {data["count"]} hits (in {data["latency_ms"]}ms):')
    for r in data['results'][:2]:
        print(f'  繁體: {r["word"]}  ⇄  簡體: {r.get("simplified")}  [{r.get("category_name")}]')
