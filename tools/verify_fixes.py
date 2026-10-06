import re

with open('web/app.js', encoding='utf-8') as f:
    app_js = f.read()

t_start = app_js.find('const TRANSLATIONS')
class_start = app_js.find('class WebcomAIApp')
trans_block = app_js[t_start:class_start]

zhtw_start = trans_block.find('"zh-TW"')
en_start = trans_block.find('"en"')
zhtw_block = trans_block[zhtw_start:en_start]
keys = re.findall(r'(\w+):', zhtw_block)
print(f'zh-TW keys: {len(keys)}')

guide_keys = [
    'guideModalTitle', 'fourModesTitle', 'guideTabQuick', 'guideTabArtifact',
    'guideTabJev', 'guideTabTerm', 'guideTabFaq', 'guideTabAbout',
    'guideTabAi', 'guideTabOffline', 'modalClose', 'superviseCardTitle', 'superviseCardDesc'
]
missing = [k for k in guide_keys if k not in keys]
print(f'Missing guide keys: {missing}')
print('All guide keys OK!' if not missing else 'STILL MISSING!')

wired = re.findall(r"'(btn-open-\w+-menu)'", app_js)
print(f'Dropdown buttons wired: {wired}')
