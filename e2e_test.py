import os

errors = 0
warnings = 0
files_tested = 0

print("--- Starting End-to-End Checks ---")

for root, dirs, files in os.walk('.'):
    # Ignore hidden dirs, git, and components since components are fragments
    if '.git' in root or '.github' in root or 'google' in root or 'components' in root:
        continue
        
    for file in files:
        if file.endswith('.html') and 'google' not in file:
            files_tested += 1
            file_path = os.path.join(root, file)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 1. Check title
            if '<title>' not in content:
                print(f"[ERROR] Missing <title> in {file_path}")
                errors += 1

            # 2. Check canonical
            if '<link rel="canonical"' not in content:
                print(f"[ERROR] Missing canonical link in {file_path}")
                errors += 1

            # 3. Check inline JS scripts for errors (basic)
            if 'easypusher' in content or 'llvpn' in content:
                print(f"[ERROR] Adware found in {file_path}")
                errors += 1

# Check if footer component has backlink
if os.path.exists('components/footer.html'):
    with open('components/footer.html', 'r', encoding='utf-8') as f:
        if 'https://www.devdeskapp.com/' not in f.read():
            print(f"[ERROR] Missing DevDeskApp backlink in components/footer.html")
            errors += 1
else:
    print(f"[ERROR] components/footer.html not found")
    errors += 1

print("\\n--- Test Results ---")
print(f"Files tested: {files_tested}")
print(f"Errors found: {errors}")
print(f"Warnings found: {warnings}")

if errors > 0:
    print("TESTS FAILED! (ERROR)")
    exit(1)
else:
    print("ALL TESTS PASSED! (SUCCESS)")
    exit(0)
