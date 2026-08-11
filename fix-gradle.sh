#!/bin/bash
# Fix script for Gradle 8.7 deprecation issues
# Run: ./fix-gradle.sh

echo "🔧 Fixing Gradle deprecation warnings..."

# 1. Clean
echo "1️⃣  Cleaning Gradle cache..."
cd android
./gradlew clean --stop || true

# 2. Stop daemon
./gradlew --stop

# 3. Fix permissions
chmod +x gradlew

# Back to root
cd ..

# 4. Clean node modules
echo "2️⃣  Cleaning node modules cache..."
rm -rf node_modules/.cache
npm ci

# 5. Prebuild
echo "3️⃣  Prebuilding with Expo..."
npx expo prebuild --clean

echo "✅ Gradle fixes complete!"
echo "🚀 Ready to build: npx expo run:android"
