const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'web', 'out');
const dest = path.resolve(__dirname, '..', 'landing-page', 'game');

function copyRecursive(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (!fs.existsSync(src)) {
    console.error('❌ build output not found:', src);
    process.exit(1);
  }

  // remove destination if present
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });

  copyRecursive(src, dest);
  console.log('✅ Copied web/out → landing-page/game');
} catch (err) {
  console.error('❌ Error while syncing web/out to landing-page/game:', err);
  process.exit(1);
}
