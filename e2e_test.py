import os
import glob
from bs4 import BeautifulSoup

def run_tests():
    print("--- Starting End-to-End Checks ---")
    html_files = glob.glob('**/*.html', recursive=True)
    
    errors = 0
    warnings = 0
    
    for file in html_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Check Title
            if not soup.title or not soup.title.string:
                print(f"[ERROR] Missing <title> in {file}")
                errors += 1
                
            # Check Canonical
            canonical = soup.find('link', rel='canonical')
            if not canonical or 'waterejector.github.io' not in canonical.get('href', ''):
                print(f"[ERROR] Missing or incorrect canonical link in {file}")
                errors += 1
                
            # Check Footer Backlink
            backlink = soup.find('a', href='https://www.devdeskapp.com/')
            if not backlink:
                print(f"[ERROR] Missing DevDeskApp backlink in {file}")
                errors += 1
                
            # Check old string
            if 'tryfixmyspeaker' in content.lower():
                print(f"[WARNING] Found 'tryfixmyspeaker' leftover in {file}")
                warnings += 1

    print("\\n--- Test Results ---")
    print(f"Files tested: {len(html_files)}")
    print(f"Errors found: {errors}")
    print(f"Warnings found: {warnings}")
    
    if errors == 0:
        print("ALL TESTS PASSED! (SUCCESS)")
    else:
        print("TESTS FAILED! (ERROR)")
        exit(1)

if __name__ == '__main__':
    run_tests()
