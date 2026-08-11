#!/bin/bash
# Script de build APK Web complet
# Usage: ./build-apk-web.sh

echo "🚀 NEXUS ARENA - APK Web Build"
echo "================================"

# 1. Nettoyage
echo "🧹 Nettoyage du cache..."
rm -rf node_modules
rm -f package-lock.json
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build
echo "✅ Cache nettoyé"

# 2. Installation
echo "📦 Installation des dépendances..."
npm install
if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de l'installation"
  exit 1
fi
echo "✅ Dépendances installées"

# 3. Configuration
echo "⚙️  Vérification de la configuration..."

# Vérifier que WebAppScreen existe
if [ ! -f "src/screens/WebAppScreen.tsx" ]; then
  echo "❌ Erreur: WebAppScreen.tsx non trouvé"
  exit 1
fi
echo "✅ WebAppScreen.tsx trouvé"

# Vérifier l'URL web
WEB_URL=$(grep -o "const WEB_APP_URL = '[^']*'" src/screens/WebAppScreen.tsx | cut -d"'" -f2)
echo "📍 URL Web: $WEB_URL"

# 4. Build
echo "🔨 Compilation APK..."
echo "   (Cette étape prend 20-30 minutes)"

# Option: Local build
if [ "$1" = "local" ]; then
  echo "   Mode: Local Android build"
  npx expo run android
else
  echo "   Mode: EAS Cloud build"
  eas build --platform android --clear-cache
fi

if [ $? -ne 0 ]; then
  echo "❌ Erreur lors de la compilation"
  exit 1
fi

echo "✅ APK compilée avec succès!"
echo ""
echo "📱 APK Web est maintenant prête pour:"
echo "   - Tests locaux"
echo "   - Soumission Google Play"
echo "   - Distribution"
echo ""
echo "🎯 Prochaines étapes:"
echo "   1. Tester sur Android"
echo "   2. Vérifier la synchronisation APK+Web"
echo "   3. Vérifier le chat en temps réel"
echo "   4. Vérifier les records mélangés"
echo ""
echo "✨ Build terminé!"
