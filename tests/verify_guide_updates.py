import os
import sys

def verify():
    with open('web/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    checks = [
        ('guide-tab-graphrag', 'GraphRAG Tab Pane ID'),
        ('data-tab="guide-tab-graphrag"', 'GraphRAG Tab Button data-tab'),
        ('data-i18n="guideTabGraphRag"', 'GraphRAG Tab Button i18n attribute'),
        ('v2.2.0-Hermes-GraphRAG-Jev-WebGPU-MultiTier', 'Full Version String in FAQ & License'),
        ('ezdxf', 'ezdxf third-party acknowledgement'),
        ('NousResearch Hermes Agent', 'NousResearch Hermes Agent acknowledgement'),
        ('顯示卡資源保護上限 (90%)', 'GPU 90% Ceiling Guard Quick Guide'),
        ('本地 JSON 壓時即時自動存檔', 'Timestamped Auto-Save Quick Guide'),
        ('Jev 500 自動重試與 Agent 防幻覺死循環', 'Jev 500 & Loop Breaker Quick Guide'),
        ('v2.2.0', 'Footer Version String'),
    ]

    print("[1] Verifying web/index.html...")
    for text, label in checks:
        if text in html:
            print(f"  ✔ Found: {label}")
        else:
            print(f"  ❌ Missing: {label} ({text})")
            sys.exit(1)

    print("\n[2] Verifying web/app.js...")
    with open('web/app.js', 'r', encoding='utf-8') as f:
        app_js = f.read()
    
    app_checks = [
        ('guideTabGraphRag: "🕸️ GraphRAG 圖譜"', 'zh-TW translation for guideTabGraphRag'),
        ('guideTabGraphRag: "🕸️ GraphRAG Graph"', 'en translation for guideTabGraphRag')
    ]
    for text, label in app_checks:
        if text in app_js:
            print(f"  ✔ Found: {label}")
        else:
            print(f"  ❌ Missing: {label}")
            sys.exit(1)

    print("\n[3] Verifying README.md...")
    with open('README.md', 'r', encoding='utf-8') as f:
        readme = f.read()

    readme_checks = [
        ('GraphRAG-Multi--Hop', 'GraphRAG Badge'),
        ('GPU_Guard-90%25', 'GPU Guard Badge'),
        ('GraphRAG 實體關聯圖譜與多跳推論', 'GraphRAG Section in Chinese'),
        ('GraphRAG Entity Knowledge Graph & Multi-Hop Traversal', 'GraphRAG Section in English'),
        ('顯示卡資源保護上限 (GPU 90% Guard)', 'GPU Guard in Chinese'),
        ('GPU 90% Ceiling Guard', 'GPU Guard in English'),
        ('v2.2.0', 'Version v2.2.0 in README')
    ]
    for text, label in readme_checks:
        if text in readme:
            print(f"  ✔ Found: {label}")
        else:
            print(f"  ❌ Missing: {label}")
            sys.exit(1)

    print("\n🎉 ALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    verify()
