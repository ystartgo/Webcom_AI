import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from daemon.dictionary_engine import backend_dictionary

for query in ['義無反顧', '国家', '學習', '破釜沉舟']:
    data = backend_dictionary.search(query, limit=5)
    print(f'Search "{query}" -> {data["count"]} hits in {data["latency_ms"]}ms:')
    for r in data['results'][:2]:
        print(f'  繁體: {r["word"]}  ⇄  簡體: {r.get("simplified")}  [{r.get("category_name")}]')

print("\nPrompt test:")
res = backend_dictionary.search('學習', limit=1)
print(backend_dictionary.format_rag_prompt('學習', res['results']))
