# Script de vérification pré-build pour NEXUS ARENA v1.0.0 (Windows)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION PRE-BUILD NEXUS ARENA v1.0.0" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
Write-Host "Verification Node.js..." -ForegroundColor Green
if (!(Test-Path (Get-Command node -ErrorAction SilentlyContinue).Source)) {
  Write-Host "ERREUR: Node.js non trouvé" -ForegroundColor Red
  exit 1
}
node -v

# Vérifier npm
Write-Host "Verification npm..." -ForegroundColor Green
if (!(Test-Path (Get-Command npm -ErrorAction SilentlyContinue).Source)) {
  Write-Host "ERREUR: npm non trouvé" -ForegroundColor Red
  exit 1
}
npm -v

# Vérifier fichiers critiques
Write-Host "Verification des fichiers..." -ForegroundColor Green
$files = @(
  "app.json",
  "eas.json",
  ".env.local",
  "src\services\firebase.ts",
  "src\services\authService.ts",
  "firestore.rules"
)

foreach ($file in $files) {
  if (Test-Path $file) {
    Write-Host "  OK: $file" -ForegroundColor Green
  } else {
    Write-Host "  MANQUANT: $file" -ForegroundColor Red
    exit 1
  }
}

# Vérifier assets
Write-Host "Verification des assets..." -ForegroundColor Green
$assets = @(
  "assets\icon.png",
  "assets\Nex-Arena.png",
  "assets\favicon.png"
)

foreach ($asset in $assets) {
  if (Test-Path $asset) {
    Write-Host "  OK: $asset" -ForegroundColor Green
  } else {
    Write-Host "  MANQUANT: $asset" -ForegroundColor Red
    exit 1
  }
}

# Vérifier dépendances
Write-Host "Verification des dépendances..." -ForegroundColor Green
if (!(Test-Path "node_modules")) {
  Write-Host "  ATTENTION: node_modules non trouvé" -ForegroundColor Yellow
  Write-Host "  Installation requise: npm install" -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
  Write-Host "  OK: node_modules trouvé" -ForegroundColor Green
}

# Vérifier version
Write-Host "Verification version..." -ForegroundColor Green
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
if ($version -eq "1.0.0") {
  Write-Host "  OK: Version $version" -ForegroundColor Green
} else {
  Write-Host "  ERREUR: Version incorrecte $version (attendu 1.0.0)" -ForegroundColor Red
  exit 1
}

# Vérifier versionCode
Write-Host "Verification versionCode..." -ForegroundColor Green
$appJson = Get-Content "app.json" | ConvertFrom-Json
$versionCode = $appJson.expo.android.versionCode
if ($versionCode -eq 1) {
  Write-Host "  OK: versionCode $versionCode" -ForegroundColor Green
} else {
  Write-Host "  ERREUR: versionCode incorrect $versionCode (attendu 1)" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION COMPLETE - PRET POUR BUILD" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "  1. eas login" -ForegroundColor White
Write-Host "  2. eas build --platform android --profile preview" -ForegroundColor White
Write-Host ""
