import os

file_path = 'script.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add component loading to the very top of DOMContentLoaded
component_loader = """
async function loadComponents() {
  try {
    const [headerRes, footerRes] = await Promise.all([
      fetch('/components/header.html'),
      fetch('/components/footer.html')
    ]);
    
    if (headerRes.ok) {
      document.getElementById('header-placeholder').innerHTML = await headerRes.text();
    }
    if (footerRes.ok) {
      document.getElementById('footer-placeholder').innerHTML = await footerRes.text();
    }
    
    // Re-initialize UI scripts that depend on the navbar
    setupMobileMenu();
    setupThemeToggle();
  } catch (error) {
    console.error("Error loading components:", error);
  }
}

"""

# We need to extract the theme toggle logic from setupEventListeners (or wherever it is) and make it callable after component load.
# Actually, the original script doesn't have theme toggle logic in a separate function?
# Let's write a targeted replace.
content = component_loader + content.replace('document.addEventListener("DOMContentLoaded", () => {', 'document.addEventListener("DOMContentLoaded", async () => {\n  await loadComponents();')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Component Loader")
