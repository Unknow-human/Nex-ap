#!/bin/bash

# 🔍 SCRIPT DE VÉRIFICATION PUBLICATION APK
# Vérifie l'état de publication du workflow GitHub Actions
# Date: 25 janvier 2026

echo "========================================"
echo "🔍 VÉRIFICATION PUBLICATION APK"
echo "========================================"
echo ""

# 1️⃣ VÉRIFIER GIT
echo "1️⃣ VÉRIFICATION GIT"
echo "---"
git log -1 --pretty=format:"Dernier commit: %h - %s (par %an le %ad)"
echo ""
git remote -v | head -1
echo ""

# 2️⃣ VÉRIFIER VERSION
echo "2️⃣ VÉRIFICATION VERSION"
echo "---"
if [ -f "package.json" ]; then
  VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
  echo "Version package.json: $VERSION"
fi

if [ -f "app.json" ]; then
  EXPO_VERSION=$(grep '"version"' app.json | head -1 | cut -d'"' -f4)
  echo "Version app.json: $EXPO_VERSION"
fi

if [ -f "history.json" ]; then
  HISTORY_VERSION=$(grep '"version"' history.json | cut -d'"' -f4)
  HISTORY_APK=$(grep '"apk"' history.json | cut -d'"' -f4)
  echo "Version history.json: $HISTORY_VERSION"
  echo "APK URL: ${HISTORY_APK:-[VIDE - ⚠️ PROBLÈME]}"
fi
echo ""

# 3️⃣ VÉRIFIER WORKFLOW
echo "3️⃣ VÉRIFICATION WORKFLOW"
echo "---"
if [ -f ".github/workflows/full-deploy.yml" ]; then
  echo "✅ Workflow trouvé: .github/workflows/full-deploy.yml"
  echo "   Taille: $(wc -l < .github/workflows/full-deploy.yml) lignes"
  echo "   Déclencheur: push sur main"
else
  echo "❌ Workflow NOT trouvé"
fi
echo ""

# 4️⃣ VÉRIFIER EAS CONFIG
echo "4️⃣ VÉRIFICATION EAS"
echo "---"
if command -v eas &> /dev/null; then
  echo "✅ EAS CLI installé: $(eas --version)"
else
  echo "⚠️  EAS CLI NOT installé. Installer: npm install -g eas-cli"
fi
echo ""

# 5️⃣ VÉRIFIER SECRETS
echo "5️⃣ VÉRIFICATION SECRETS GITHUB"
echo "---"
if command -v gh &> /dev/null; then
  echo "GitHub CLI présent"
  if gh auth status &> /dev/null; then
    echo "✅ Authentifié avec GitHub CLI"
    
    # Afficher les secrets (masqués)
    echo ""
    echo "Secrets GitHub (si connecté):"
    gh secret list -R Unknow-human/Nex-apk 2>/dev/null | grep -E "EXPO|GITHUB" || echo "   ⚠️  Impossible de lister les secrets"
  else
    echo "⚠️  Non authentifié avec GitHub CLI. Login: gh auth login"
  fi
else
  echo "⚠️  GitHub CLI NOT installé. Installer: https://cli.github.com"
fi
echo ""

# 6️⃣ VÉRIFIER LANDING PAGE
echo "6️⃣ VÉRIFICATION LANDING PAGE"
echo "---"
if [ -d "landing-page" ]; then
  echo "✅ Répertoire landing-page trouvé"
  if [ -f "landing-page/index.html" ]; then
    echo "   ✅ index.html existe"
  fi
  if [ -f "landing-page/game-web.html" ]; then
    echo "   ✅ game-web.html existe ($(wc -l < landing-page/game-web.html) lignes)"
  fi
fi
echo ""

# 7️⃣ RECOMMANDATIONS
echo "7️⃣ PROCHAINES ÉTAPES"
echo "---"
echo "1. Vérifier EXPO_TOKEN:"
echo "   gh secret list -R Unknow-human/Nex-apk"
echo ""
echo "2. Déclencher le workflow manuellement:"
echo "   gh workflow run full-deploy.yml -R Unknow-human/Nex-apk"
echo ""
echo "3. Vérifier les exécutions:"
echo "   gh run list -R Unknow-human/Nex-apk --workflow=full-deploy.yml"
echo ""
echo "4. Voir les logs:"
echo "   gh run view <RUN_ID> -R Unknow-human/Nex-apk --log"
echo ""
echo "5. Vérifier la release GitHub:"
echo "   gh release view latest -R Unknow-human/Nex-apk"
echo ""

echo "========================================"
echo "✅ Audit terminé"
echo "========================================"
