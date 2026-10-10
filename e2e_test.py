import os
import re
import json
import sys
import xml.etree.ElementTree as ET

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

def run_tests():
    print("=" * 65)
    print("END-TO-END VALIDATION TEST: WaterEjector")
    print(f"Directory: {BASE_DIR}")
    print("=" * 65)

    errors = 0

    # 1. Check Essential Root Files
    required_files = [
        "index.html", "style.css", "script.js",
        "ads.txt", "app-ads.txt", "robots.txt", "sitemap.xml",
        "favicon.ico", "icon.svg", "icon-192.png", "icon-512.png",
        "manifest.json", "sw.js"
    ]
    print("\n[1] Checking Essential Root Files...")
    for rf in required_files:
        full_p = os.path.join(BASE_DIR, rf)
        if not os.path.exists(full_p):
            print(f"[ERROR] Missing file: {rf}")
            errors += 1
        else:
            print(f" [OK] {rf} present ({os.path.getsize(full_p)} bytes)")

    # 2. Check HTML Pages
    html_pages = []
    for root, dirs, files in os.walk(BASE_DIR):
        if '.git' in root or 'components' in root:
            continue
        for f in files:
            if f.endswith('.html') and not f.startswith('google'):
                html_pages.append(os.path.join(root, f))

    print(f"\n[2] Checking {len(html_pages)} HTML Pages for SEO & Structure...")
    for page in html_pages:
        rel_p = os.path.relpath(page, BASE_DIR)
        with open(page, 'r', encoding='utf-8') as f:
            content = f.read()

        # Title
        if not re.search(r'<title>.*?</title>', content):
            print(f"[ERROR] Missing <title> in {rel_p}")
            errors += 1

        # Meta description
        if not re.search(r'<meta\s+name=["\']description["\']', content, re.I):
            print(f"[ERROR] Missing description in {rel_p}")
            errors += 1

        # Exactly 1 H1
        h1_matches = re.findall(r'<h1[^>]*>.*?</h1>', content, re.I | re.S)
        if len(h1_matches) != 1:
            print(f"[ERROR] Found {len(h1_matches)} <h1> tags in {rel_p} (expected 1)")
            errors += 1

        # Canonical link
        if not re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']https://waterejector\.devdeskapp\.com/', content):
            print(f"[ERROR] Missing or invalid canonical in {rel_p}")
            errors += 1

        # Header and Footer placeholders
        if '<div id="header-placeholder"></div>' not in content:
            print(f"[ERROR] Missing header placeholder in {rel_p}")
            errors += 1
        if '<div id="footer-placeholder"></div>' not in content:
            print(f"[ERROR] Missing footer placeholder in {rel_p}")
            errors += 1

        # Manifest link
        if '<link rel="manifest" href="/manifest.json">' not in content:
            print(f"[ERROR] Missing manifest link in {rel_p}")
            errors += 1

    # 3. Check Shared Components
    print("\n[3] Checking Header & Footer Components...")
    header_p = os.path.join(BASE_DIR, "components", "header.html")
    footer_p = os.path.join(BASE_DIR, "components", "footer.html")
    if not os.path.exists(header_p):
        print("[ERROR] components/header.html missing!")
        errors += 1
    else:
        print(" [OK] components/header.html present")

    if not os.path.exists(footer_p):
        print("[ERROR] components/footer.html missing!")
        errors += 1
    else:
        with open(footer_p, 'r', encoding='utf-8') as f:
            fc = f.read()
        if "https://www.devdeskapp.com/" not in fc:
            print("[ERROR] DevDeskApp backlink missing in footer.html!")
            errors += 1
        else:
            print(" [OK] components/footer.html verified with DevDeskApp backlink")

    # 4. Check Sitemap.xml
    print("\n[4] Validating sitemap.xml...")
    sitemap_p = os.path.join(BASE_DIR, "sitemap.xml")
    try:
        tree = ET.parse(sitemap_p)
        root = tree.getroot()
        ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('.//ns:loc', ns) or root.findall('.//loc')
        if len(urls) != 14:
            print(f"[ERROR] Expected 14 URLs in sitemap, found {len(urls)}")
            errors += 1
        else:
            print(f" [OK] sitemap.xml verified with {len(urls)} registered URLs")
    except Exception as e:
        print(f"[ERROR] sitemap.xml invalid XML: {e}")
        errors += 1

    # 5. Check manifest.json
    print("\n[5] Validating manifest.json...")
    manifest_p = os.path.join(BASE_DIR, "manifest.json")
    try:
        with open(manifest_p, 'r', encoding='utf-8') as f:
            m = json.load(f)
        if "icons" not in m or len(m["icons"]) < 2:
            print("[ERROR] Manifest icons missing or incomplete")
            errors += 1
        else:
            print(f" [OK] manifest.json valid. Name: '{m.get('name')}', Icons: {len(m['icons'])}")
    except Exception as e:
        print(f"[ERROR] manifest.json invalid JSON: {e}")
        errors += 1

    # 6. Check ads.txt
    print("\n[6] Validating ads.txt...")
    ads_p = os.path.join(BASE_DIR, "ads.txt")
    if os.path.exists(ads_p):
        with open(ads_p, 'r', encoding='utf-8') as f:
            ac = f.read().strip()
        if "pub-2136229145694242" in ac and "DIRECT" in ac:
            print(" [OK] ads.txt verified (pub-2136229145694242, DIRECT)")
        else:
            print("[ERROR] ads.txt invalid publisher ID or format")
            errors += 1

    # 7. Check robots.txt
    print("\n[7] Validating robots.txt...")
    robots_p = os.path.join(BASE_DIR, "robots.txt")
    if os.path.exists(robots_p):
        with open(robots_p, 'r', encoding='utf-8') as f:
            rc = f.read()
        if "User-agent: *" in rc and "Sitemap: https://waterejector.devdeskapp.com/sitemap.xml" in rc:
            print(" [OK] robots.txt verified")
        else:
            print("[ERROR] robots.txt missing User-agent or Sitemap directive")
            errors += 1

    print("\n" + "=" * 65)
    print(f"FINAL SUMMARY: Errors: {errors}")
    print("=" * 65)
    if errors > 0:
        print("TESTS FAILED!")
        sys.exit(1)
    else:
        print("ALL TESTS PASSED SUCCESSFULLY! (SUCCESS)")
        sys.exit(0)

if __name__ == '__main__':
    run_tests()
