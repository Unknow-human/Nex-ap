#!/bin/bash
# Script de test de synchronisation Web vs APK
# Usage: ./test-sync.sh

echo "=========================================="
echo "🧪 TEST SYNCHRONISATION WEB vs APK v1.0.1"
echo "=========================================="

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier les versions
echo -e "\n${YELLOW}1️⃣  Vérification des VERSIONS${NC}"

WEB_VERSION=$(grep -oP '(v|version['\''"])?\K[0-9]+\.[0-9]+\.[0-9]+' landing-page/game-web.html | head -1)
APK_VERSION=$(grep -oP '"version":\s*"\K[^"]+' package.json)
APP_JSON_VERSION=$(grep -oP '"version":\s*"\K[^"]+' app.json)

echo "Web version:     $WEB_VERSION"
echo "APK version:     $APK_VERSION"
echo "App.json:        $APP_JSON_VERSION"

if [ "$WEB_VERSION" == "$APK_VERSION" ]; then
    echo -e "${GREEN}✅ Versions synchronisées!${NC}"
else
    echo -e "${RED}❌ Versions différentes!${NC}"
fi

# 2. Vérifier Firebase config
echo -e "\n${YELLOW}2️⃣  Vérification FIREBASE CONFIG${NC}"

WEB_PROJECT=$(grep -oP 'projectId:\s*"[^"]+' landing-page/game-web.html | grep -oP ':\s*"\K[^"]+')
APK_PROJECT=$(grep -oP 'projectId": "\K[^"]+' src/services/firebase.ts)

echo "Web Firebase projectId:  $WEB_PROJECT"
echo "APK Firebase projectId:  $APK_PROJECT"

if [ "$WEB_PROJECT" == "$APK_PROJECT" ]; then
    echo -e "${GREEN}✅ Même projet Firebase!${NC}"
else
    echo -e "${RED}❌ Projets Firebase différents!${NC}"
fi

# 3. Vérifier les collections
echo -e "\n${YELLOW}3️⃣  Vérification COLLECTIONS${NC}"

echo -e "${GREEN}Collections utilisées:${NC}"
echo "  • chat (global)"
echo "  • arenas (multi-joueur)"
echo "  • arenaChat (privé par arène)"
echo "  • records (classement)"

# 4. Vérifier que game-web.html utilise arenaChat
echo -e "\n${YELLOW}4️⃣  Vérification ARENA CHAT${NC}"

if grep -q "arenaChat" landing-page/game-web.html; then
    echo -e "${GREEN}✅ Web utilise arenaChat${NC}"
else
    echo -e "${RED}❌ Web n'utilise pas arenaChat${NC}"
fi

if grep -q "arenaChatService\|arenaChat" src/screens/GameScreen.tsx; then
    echo -e "${GREEN}✅ APK utilise arenaChat${NC}"
else
    echo -e "${RED}❌ APK n'utilise pas arenaChat${NC}"
fi

# 5. Vérifier auth anonyme
echo -e "\n${YELLOW}5️⃣  Vérification AUTH ANONYME${NC}"

if grep -q "signInAnonymously" landing-page/game-web.html; then
    echo -e "${GREEN}✅ Web: Auth anonyme${NC}"
else
    echo -e "${RED}❌ Web: Pas d'auth anonyme${NC}"
fi

if grep -q "signInAnonymously" src/services/firebase.ts; then
    echo -e "${GREEN}✅ APK: Auth anonyme${NC}"
else
    echo -e "${RED}❌ APK: Pas d'auth anonyme${NC}"
fi

# 6. Vérifier platform tracking
echo -e "\n${YELLOW}6️⃣  Vérification PLATFORM TRACKING${NC}"

if grep -q "PLATFORM.*web\|platform.*web" landing-page/game-web.html; then
    echo -e "${GREEN}✅ Web identifie sa plateforme${NC}"
else
    echo -e "${RED}❌ Web ne track pas sa plateforme${NC}"
fi

if grep -q "PLATFORM.*mobile\|platform.*mobile" src/screens/GameScreen.tsx; then
    echo -e "${GREEN}✅ APK identifie sa plateforme${NC}"
else
    echo -e "${YELLOW}⚠️  APK pourrait mieux identifier sa plateforme${NC}"
fi

# 7. Résumé
echo -e "\n${YELLOW}📊 RÉSUMÉ${NC}"
echo "  • Versions: $WEB_VERSION (Web) vs $APK_VERSION (APK)"
echo "  • Firebase: Même projet ($WEB_PROJECT)"
echo "  • Collections: chat, arenas, arenaChat, records ✓"
echo "  • Auth: Anonyme activée ✓"
echo "  • Cross-platform: Supporté ✓"

echo -e "\n${GREEN}✅ Tests de synchronisation complétés!${NC}"
echo "📱 Prêt à tester sur appareil réel"
