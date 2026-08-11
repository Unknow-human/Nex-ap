const fs = require('fs');
const path = require('path');

const libsDir = path.join(__dirname, '../node_modules/react-native/gradle');
const libsFile = path.join(libsDir, 'libs.versions.toml');

// Créer le répertoire s'il n'existe pas
if (!fs.existsSync(libsDir)) {
  fs.mkdirSync(libsDir, { recursive: true });
}

// Créer le fichier s'il n'existe pas
if (!fs.existsSync(libsFile)) {
  const content = `[versions]
kotlin = "1.8.0"
`;
  fs.writeFileSync(libsFile, content);
  console.log('✓ Created libs.versions.toml');
}
