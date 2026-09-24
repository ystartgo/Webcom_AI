import sys
import re
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

html = Path("web/index.html").read_text(encoding="utf-8")
app_js = Path("web/app.js").read_text(encoding="utf-8")

i18n_keys = re.findall(r'data-i18n="([^"]+)"', html)
i18n_title_keys = re.findall(r'data-i18n-title="([^"]+)"', html)
i18n_placeholders = re.findall(r'data-i18n-placeholder="([^"]+)"', html)

print(f"data-i18n: {len(i18n_keys)}, data-i18n-title: {len(i18n_title_keys)}, data-i18n-placeholder: {len(i18n_placeholders)}")

# Extract translations dictionary from app.js
tw_chunk = re.search(r'"zh-TW":\s*\{(.*?)\n    \},', app_js, re.DOTALL)
en_chunk = re.search(r'"en":\s*\{(.*?)\n    \}', app_js, re.DOTALL)

tw_keys = set(re.findall(r'(\w+):\s*["\'`]', tw_chunk.group(1))) if tw_chunk else set()
en_keys = set(re.findall(r'(\w+):\s*["\'`]', en_chunk.group(1))) if en_chunk else set()

all_html_keys = set(i18n_keys + i18n_title_keys + i18n_placeholders)
missing_in_en = all_html_keys - en_keys
missing_in_tw = all_html_keys - tw_keys

print(f"Missing in EN ({len(missing_in_en)}): {missing_in_en}")
print(f"Missing in TW ({len(missing_in_tw)}): {missing_in_tw}")

# Find elements with Chinese text without data-i18n or inside options/labels
pattern = re.compile(r'>([^<]*[\u4e00-\u9fff]+[^<]*)<')
matches = pattern.findall(html)
print(f"\nElements with Chinese text: {len(matches)}")
untranslated = []
for m in matches:
    clean = m.strip()
    if clean and not any(k in clean for k in ["{{", "}}"]):
        untranslated.append(clean)

print(f"Sample untranslated Chinese nodes ({len(untranslated)}):")
for u in untranslated[:30]:
    print(" -", u[:60])
