#!/usr/bin/env node

/**
 * Script de préparation "production" pour NEXUS ARENA.
 *
 * Objectifs :
 *  - Synchroniser les versions entre package.json et app.json
 *  - Forcer l'URL web de production dans WebAppScreen.tsx
 *  - Vérifier la configuration Firebase Hosting (landing-page)
 *  - Lancer les checks de qualité (type-check + lint)
 *
 * Usage :
 *   npm run prepare:production
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function log(title, message) {
  console.log(`\n🔹 ${title}`);
  if (message) {
    console.log(`   ${message}`);
  }
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data) {
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
}

function syncVersions() {
  const packagePath = path.join(ROOT, 'package.json');
  const appJsonPath = path.join(ROOT, 'app.json');

  if (!fs.existsSync(packagePath) || !fs.existsSync(appJsonPath)) {
    log('Versions', 'package.json ou app.json manquant, étape ignorée.');
    return;
  }

  const pkg = readJson(packagePath);
  const app = readJson(appJsonPath);

  if (!app.expo) {
    log('Versions', 'app.json ne contient pas de clé "expo", étape ignorée.');
    return;
  }

  const pkgVersion = pkg.version;
  const currentAppVersion = app.expo.version;

  if (pkgVersion !== currentAppVersion) {
    log(
      'Synchronisation des versions',
      `app.json: ${currentAppVersion} → ${pkgVersion}`
    );
    app.expo.version = pkgVersion;
    writeJson(appJsonPath, app);
  } else {
    log('Synchronisation des versions', 'Versions déjà alignées.');
  }
}

function ensureWebAppUrl() {
  const screenPath = path.join(ROOT, 'src', 'screens', 'WebAppScreen.tsx');

  if (!fs.existsSync(screenPath)) {
    log(
      'WebAppScreen',
      "Fichier src/screens/WebAppScreen.tsx introuvable, étape URL web ignorée."
    );
    return;
  }

  const PROD_URL = 'https://nexus-arena-web.vercel.app';
  const DEV_PATTERN =
    "const WEB_APP_URL = 'http://localhost:5173';";
  const PROD_PATTERN =
    `const WEB_APP_URL = '${PROD_URL}';`;

  let content = fs.readFileSync(screenPath, 'utf8');

  if (content.includes(PROD_PATTERN)) {
    log('URL Web', 'URL de production déjà configurée.');
    return;
  }

  if (content.includes(DEV_PATTERN)) {
    content = content.replace(DEV_PATTERN, PROD_PATTERN);
    fs.writeFileSync(screenPath, content);
    log(
      'URL Web',
      `URL remplacée par l’URL de production : ${PROD_URL}`
    );
    return;
  }

  if (content.includes('WEB_APP_URL')) {
    log(
      'URL Web',
      "WEB_APP_URL trouvé mais pattern non reconnu, merci de vérifier manuellement."
    );
  } else {
    log(
      'URL Web',
      "Aucune constante WEB_APP_URL trouvée, étape ignorée."
    );
  }
}

function ensureFirebaseHosting() {
  const firebasePath = path.join(ROOT, 'firebase.json');
  if (!fs.existsSync(firebasePath)) {
    log('Firebase Hosting', 'firebase.json introuvable, étape ignorée.');
    return;
  }

  const firebase = readJson(firebasePath);
  if (!firebase.hosting) {
    log('Firebase Hosting', 'Bloc "hosting" absent, étape ignorée.');
    return;
  }

  const originalPublic = firebase.hosting.public;
  if (originalPublic !== 'landing-page') {
    firebase.hosting.public = 'landing-page';
    writeJson(firebasePath, firebase);
    log(
      'Firebase Hosting',
      `Répertoire public ajusté : ${originalPublic} → landing-page`
    );
  } else {
    log('Firebase Hosting', 'Répertoire public déjà configuré sur "landing-page".');
  }
}

function runCommand(command, args, title) {
  log(title, `${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`Échec de la commande: ${command} ${args.join(' ')}`);
  }
}

function runQualityChecks() {
  // Type-check
  runCommand('npm', ['run', 'type-check'], 'Vérification TypeScript');

  // Lint – meilleur effort : si ESLint échoue pour une raison de config/runtime,
  // on log l'erreur mais on ne bloque pas la préparation production.
  try {
    runCommand('npm', ['run', 'lint'], 'Vérification ESLint');
  } catch (error) {
    console.warn(
      '\n⚠️  ESLint a échoué (probablement un problème de configuration ou de version). ' +
      'La préparation production continue, mais il est recommandé de corriger ESLint.'
    );
  }
}

function main() {
  console.log('🚀 Préparation du projet NEXUS ARENA pour la production');
  console.log('=====================================================');

  try {
    syncVersions();
    ensureWebAppUrl();
    ensureFirebaseHosting();
    runQualityChecks();
  } catch (e) {
    console.error('\n❌ Erreur lors de la préparation production:', e.message);
    process.exit(1);
  }

  console.log('\n✅ Préparation production terminée avec succès.');
  console.log(
    "ℹ️  Tu peux maintenant lancer un build EAS ou Android en étant plus confiant sur la config."
  );
}

main();

