#!/bin/bash
# Script de vérification pré-build pour NEXUS ARENA v1.0.0

echo "==================================================="
echo "🔍 VÉRIFICATION PRÉ-BUILD NEXUS ARENA v1.0.0"
echo "==================================================="
echo ""

# Vérifier Node.js
echo "✅ Vérification Node.js..."
node -v || { echo "❌ Node.js non trouvé"; exit 1; }
npm -v || { echo "❌ npm non trouvé"; exit 1; }

# Vérifier Expo CLI
echo "✅ Vérification Expo CLI..."
expo --version || { echo "⚠️  Expo CLI non installé globalement"; }

# Vérifier fichiers critiques
echo "✅ Vérification des fichiers..."
FILES=(
  "app.json"
  "eas.json"
  ".env.local"
  "src/services/firebase.ts"
  "src/services/authService.ts"
  "firestore.rules"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ MANQUANT: $file"
    exit 1
  fi
done

# Vérifier assets
echo "✅ Vérification des assets..."
ASSETS=(
  "assets/icon.png"
  "assets/Nex-Arena.png"
  "assets/favicon.png"
)

for asset in "${ASSETS[@]}"; do
  if [ -f "$asset" ]; then
    echo "  ✅ $asset"
  else
    echo "  ❌ MANQUANT: $asset"
    exit 1
  fi
done

# Vérifier dépendances
echo "✅ Vérification des dépendances installées..."
if [ ! -d "node_modules" ]; then
  echo "  ⚠️  node_modules non trouvé. Installation requise"
  npm install || exit 1
fi

# Vérifier version
echo "✅ Vérification version..."
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
if [ "$VERSION" = "1.0.0" ]; then
  echo "  ✅ Version: $VERSION"
else
  echo "  ❌ Version incorrecte: $VERSION (attendu: 1.0.0)"
  exit 1
fi

# Vérifier versionCode
echo "✅ Vérification versionCode..."
VERSIONCODE=$(grep '"versionCode"' app.json | sed 's/.*"versionCode": \([0-9]*\).*/\1/')
if [ "$VERSIONCODE" = "1" ]; then
  echo "  ✅ versionCode: $VERSIONCODE"
else
  echo "  ❌ versionCode incorrect: $VERSIONCODE (attendu: 1)"
  exit 1
fi

# Vérifier EAS projectId
echo "✅ Vérification EAS projectId..."
if grep -q "f3da69de-ec22-4c96-939b-9e4bcd929d63" eas.json app.json; then
  echo "  ✅ EAS projectId configuré"
else
  echo "  ⚠️  EAS projectId non trouvé"
fi

echo ""
echo "==================================================="
echo "✅ VÉRIFICATION COMPLÈTE - PRÊT POUR BUILD"
echo "==================================================="
echo ""
echo "Commandes suivantes:"
echo "  1. npm install"
echo "  2. eas login"
echo "  3. eas build --platform android"
echo ""
