#!/bin/bash
set -e

echo "Building Lifetracker (CDN mode, no npm required)..."

# Clean dist
rm -rf dist
mkdir -p dist/pages dist/components

# 1. Compile TypeScript -> JavaScript using globally installed tsc
echo "Compiling TypeScript..."
tsc -p tsconfig.cdn.json

# 2. Post-process compiled JS files
echo "Post-processing JavaScript files..."
python3 << 'PYEOF'
import re
import os
import glob

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Add .js extension to relative imports/exports that are missing it
    def add_js_ext(m):
        prefix = m.group(1)
        import_path = m.group(2)
        suffix = m.group(3)
        # Only modify relative paths without extensions
        if import_path.startswith('.') and '.' not in os.path.basename(import_path):
            import_path += '.js'
        return prefix + import_path + suffix

    content = re.sub(
        r'((?:from|import)\s+["\'])(\.[^"\']+)(["\'])',
        add_js_ext, content
    )

    # Replace import.meta.env.BASE_URL with the actual base path
    content = content.replace('import.meta.env.BASE_URL', '"/Lifetracker/"')

    # Remove CSS side-effect imports
    content = re.sub(r'import\s+["\'][^"\']+\.css["\'];?\n?', '', content)

    with open(path, 'w') as f:
        f.write(content)

js_files = glob.glob('dist/**/*.js', recursive=True) + glob.glob('dist/*.js')
for js_file in js_files:
    process_file(js_file)

print(f"  Processed {len(js_files)} JavaScript files")
PYEOF

# 3. Copy static assets from public/
echo "Copying static assets..."
cp public/* dist/ 2>/dev/null || true

# 4. Copy CSS
cp src/App.css dist/

# 5. Create index.html with import maps
cat > dist/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0f0f1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/Lifetracker/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/Lifetracker/icon-180x180.png" />
    <link rel="stylesheet" href="/Lifetracker/App.css" />
    <title>LifeTracker</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18",
        "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
        "react-dom/client": "https://esm.sh/react-dom@18/client",
        "react-router-dom": "https://esm.sh/react-router-dom@6"
      }
    }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/Lifetracker/main.js"></script>
  </body>
</html>
HTML

echo ""
echo "Build complete! Output in dist/"
echo "Files:"
find dist -name "*.js" -o -name "*.html" -o -name "*.css" | sort
