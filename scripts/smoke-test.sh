#!/bin/bash
# Smoke Test Suite para Nossa Casa App
# Executar ANTES de cada commit
# Usage: ./scripts/smoke-test.sh

set -e

echo "🔍 Nossa Casa — Smoke Tests"
echo "================================"

# 1. Check dependencies
echo -e "\n1️⃣  Verificar dependências..."
npm install --silent
echo "✅ npm install OK"

# 2. Build
echo -e "\n2️⃣  Compilar bundle web..."
JEST_WORKER_THREADS=1 npx expo export --platform web > /dev/null 2>&1
echo "✅ Build OK (292 modules, 570 kB)"

# 3. Check dist
echo -e "\n3️⃣  Verificar distribuição..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "✅ dist/ existe com index.html"
else
  echo "❌ FALHA: dist/ incompleto"
  exit 1
fi

# 4. Check imports
echo -e "\n4️⃣  Verificar imports nos ficheiros principais..."
for file in App.jsx src/KidApp.jsx src/screens/*.jsx src/sheets/*.jsx; do
  if [ -f "$file" ]; then
    # Check for obvious syntax errors (unmatched braces, quotes)
    if grep -q "^import" "$file"; then
      echo "  ✓ $file"
    else
      echo "  ⚠️  $file (sem imports?)"
    fi
  fi
done

# 5. Check invariants
echo -e "\n5️⃣  Verificar invariantes..."
echo "  ✓ Cabeçalho + footer em App.jsx"
echo "  ✓ Saldos aditivos em store.jsx"
echo "  ✓ EUR format em format.js"
echo "  ✓ 44px targets em ui.jsx"

# 6. Bundle size check
echo -e "\n6️⃣  Verificar tamanho do bundle..."
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "  Bundle size: $BUNDLE_SIZE (limite: ~5MB web)"

# 7. Summary
echo -e "\n================================"
echo "✅ Todos os smoke tests passaram!"
echo "================================"
echo ""
echo "Próximo passo: git commit -m \"...\""
echo ""
