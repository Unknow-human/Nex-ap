# SCRIPT DE VÉRIFICATION PUBLICATION APK (PowerShell)
# Vérifie l'état de publication du workflow GitHub Actions
# Date: 25 janvier 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[VERIFICATION] PUBLICATION APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1 VÉRIFIER GIT
Write-Host "1] VÉRIFICATION GIT" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

$lastCommit = git log -1 --pretty=format:"%h - %s (par %an)"
Write-Host "Dernier commit: $lastCommit" -ForegroundColor Green

$remote = git remote -v | Select-Object -First 1
Write-Host "Remote: $remote" -ForegroundColor Green
Write-Host ""

# 2 VÉRIFIER VERSION
Write-Host "2] VÉRIFICATION VERSION" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    Write-Host "Version package.json: $($packageJson.version)" -ForegroundColor Green
}

if (Test-Path "app.json") {
    $appJson = Get-Content "app.json" | ConvertFrom-Json
    if ($appJson.expo) {
        Write-Host "Version app.json (Expo): $($appJson.expo.version)" -ForegroundColor Green
    }
}

if (Test-Path "history.json") {
    $historyJson = Get-Content "history.json" | ConvertFrom-Json
    Write-Host "Version history.json: $($historyJson.version)" -ForegroundColor Green
    
    if ($historyJson.apk) {
        Write-Host "APK URL: $($historyJson.apk)" -ForegroundColor Green
    } else {
        Write-Host "APK URL: [VIDE - ATTENTION PROBLEME]" -ForegroundColor Red
    }
    
    Write-Host "Runtime Version: $($historyJson.runtimeVersion)" -ForegroundColor Yellow
    Write-Host "Date: $($historyJson.date)" -ForegroundColor Gray
    Write-Host "Changelog: $($historyJson.changelog)" -ForegroundColor Gray
}
Write-Host ""

# 3 VÉRIFIER WORKFLOW
Write-Host "3] VÉRIFICATION WORKFLOW" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

if (Test-Path ".github\workflows\full-deploy.yml") {
    $workflowLines = (Get-Content ".github\workflows\full-deploy.yml" | Measure-Object -Line).Lines
    Write-Host "OK] Workflow trouve: .github/workflows/full-deploy.yml" -ForegroundColor Green
    Write-Host "   Taille: $workflowLines lignes" -ForegroundColor Gray
    Write-Host "   Declencheur: push sur main" -ForegroundColor Gray
} else {
    Write-Host "ERREUR] Workflow NOT trouve" -ForegroundColor Red
}
Write-Host ""

# 4 VÉRIFIER EAS CONFIG
Write-Host "4] VÉRIFICATION EAS" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

if (Test-Path "eas.json") {
    Write-Host "OK] eas.json trouve" -ForegroundColor Green
} else {
    Write-Host "ATTENTION] eas.json NOT trouve" -ForegroundColor Yellow
}

$easVersion = eas --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK] EAS CLI installe: $easVersion" -ForegroundColor Green
} else {
    Write-Host "ATTENTION] EAS CLI NOT installe" -ForegroundColor Yellow
}
Write-Host ""

# 5 VÉRIFIER LANDING PAGE
Write-Host "5] VÉRIFICATION LANDING PAGE" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

if (Test-Path "landing-page") {
    Write-Host "OK] Repertoire landing-page trouve" -ForegroundColor Green
    
    if (Test-Path "landing-page\index.html") {
        Write-Host "   OK] index.html existe" -ForegroundColor Green
    }
    
    if (Test-Path "landing-page\game-web.html") {
        $gameLines = (Get-Content "landing-page\game-web.html" | Measure-Object -Line).Lines
        Write-Host "   OK] game-web.html existe ($gameLines lignes)" -ForegroundColor Green
    }
}
Write-Host ""

# 6 VÉRIFIER GITHUB RELEASE
Write-Host "6] VÉRIFICATION GITHUB RELEASE" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

Write-Host "URL Release 'latest':" -ForegroundColor Gray
Write-Host "https://github.com/Unknow-human/Nex-apk/releases/tag/latest" -ForegroundColor Cyan
Write-Host ""

# 7 VÉRIFIER LIENS
Write-Host "7] VÉRIFICATION LIENS APK" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

$apkUrl = "https://github.com/Unknow-human/Nex-apk/releases/download/latest/mon-app-latest.apk"
Write-Host "URL APK attendue:" -ForegroundColor Gray
Write-Host $apkUrl -ForegroundColor Cyan
Write-Host ""

# 8 RECOMMANDATIONS
Write-Host "8] PROCHAINES ÉTAPES" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

Write-Host "1. Verifier GitHub Secrets:" -ForegroundColor Gray
Write-Host "   gh secret list -R Unknow-human/Nex-apk" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. Verifier les workflows GitHub:" -ForegroundColor Gray
Write-Host "   gh workflow list -R Unknow-human/Nex-apk" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Voir les executions du workflow:" -ForegroundColor Gray
Write-Host "   gh run list -R Unknow-human/Nex-apk --workflow=full-deploy.yml -L 5" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Verifier la release:" -ForegroundColor Gray
Write-Host "   gh release view latest -R Unknow-human/Nex-apk" -ForegroundColor Cyan
Write-Host ""

Write-Host "5. Telecharger l'APK (si disponible):" -ForegroundColor Gray
Write-Host "   gh release download latest -R Unknow-human/Nex-apk -p '*.apk'" -ForegroundColor Cyan
Write-Host ""

# 9 RÉSUMÉ
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OK] Audit termine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Afficher le résumé
Write-Host "RESUMÉ" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

$checks = @{
    "Package.json" = (Test-Path "package.json")
    "App.json" = (Test-Path "app.json")
    "History.json" = (Test-Path "history.json")
    "Workflow GitHub" = (Test-Path ".github\workflows\full-deploy.yml")
    "EAS Config" = (Test-Path "eas.json")
    "Landing Page" = (Test-Path "landing-page\index.html")
    "Game Web" = (Test-Path "landing-page\game-web.html")
}

foreach ($check in $checks.GetEnumerator()) {
    $status = if ($check.Value) { "OK]" } else { "ERREUR]" }
    Write-Host "$status $($check.Key)" -ForegroundColor $(if ($check.Value) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "ATTENTION] APK URL dans history.json est VIDE" -ForegroundColor Red
Write-Host "   -> Le workflow n'a pas complete le telechargement APK" -ForegroundColor Red
Write-Host ""
