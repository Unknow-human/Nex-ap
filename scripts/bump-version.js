#!/usr/bin/env node

/**
 * Script de bump automatique des versions
 * Usage: node scripts/bump-version.js [major|minor|patch]
 * Par défaut: patch
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // major, minor, ou patch

// Fonction pour parser et incrémenter une version
function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  
  switch (type.toLowerCase()) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
  }
  
  return parts.join('.');
}

try {
  // Lire package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const oldVersion = packageJson.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  
  // Mettre à jour package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Mettre à jour app.json
  const appPath = path.join(__dirname, '..', 'app.json');
  let appJson = fs.readFileSync(appPath, 'utf8');
  appJson = appJson.replace(
    `"version": "${oldVersion}"`,
    `"version": "${newVersion}"`
  );
  
  // Incrémenter versionCode Android
  const currentVersionCode = parseInt(appJson.match(/"versionCode": (\d+)/)[1]);
  const newVersionCode = currentVersionCode + 1;
  appJson = appJson.replace(
    `"versionCode": ${currentVersionCode}`,
    `"versionCode": ${newVersionCode}`
  );

  // Aligner runtimeVersion Android sur la version de l'app si format string
  appJson = appJson.replace(
    /"runtimeVersion"\s*:\s*"[^"]+"/,
    `"runtimeVersion": "${newVersion}"`
  );
  
  fs.writeFileSync(appPath, appJson);

  // Mettre à jour android/app/build.gradle
  const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, gradle);

  // Mettre à jour android/app/src/main/res/values/strings.xml
  const stringsPath = path.join(
    __dirname,
    '..',
    'android',
    'app',
    'src',
    'main',
    'res',
    'values',
    'strings.xml'
  );
  let stringsXml = fs.readFileSync(stringsPath, 'utf8');
  stringsXml = stringsXml.replace(
    /<string name="expo_runtime_version">[^<]+<\/string>/,
    `<string name="expo_runtime_version">${newVersion}</string>`
  );
  fs.writeFileSync(stringsPath, stringsXml);
  
  console.log('✅ Versions mises à jour avec succès!');
  console.log(`   Version: ${oldVersion} → ${newVersion}`);
  console.log(`   Android versionCode: ${currentVersionCode} → ${newVersionCode}`);
  console.log('\nProchaines étapes:');
  console.log('  1. git add .');
  console.log('  2. git commit -m "chore: bump version to ' + newVersion + '"');
  console.log('  3. npx eas build --platform android --profile production');
  console.log('  4. npx eas update --channel production');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour des versions:', error.message);
  process.exit(1);
}
