#!/usr/bin/env pwsh
# Script de déploiement APK interactif pour NEXUS ARENA
# Étapes guidées pour publier l'APK via GitHub Actions

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  NEXUS ARENA v1.0.0 - GUIDE DE PUBLICATION APK            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Fonction pour pauser
function Pause-User {
    param([string]$Message = "Appuyez sur ENTREE pour continuer...")
    Write-Host $Message -ForegroundColor Yellow
    $null = Read-Host
}

# Menu principal
$continuer = $true
while ($continuer) {
    Write-Host ""
    Write-Host "MENU PRINCIPAL:" -ForegroundColor Cyan
    Write-Host "1. Diagnostic complet"
    Write-Host "2. Afficher le guide rapide"
    Write-Host "3. Voir l'audit complet"
    Write-Host "4. Vérifier history.json"
    Write-Host "5. Copier la commande pour créer le tag"
    Write-Host "6. Quitter"
    Write-Host ""
    
    $choix = Read-Host "Sélectionnez une option (1-6)"
    
    switch ($choix) {
        "1" {
            # Diagnostic
            Write-Host ""
            Write-Host "=== DIAGNOSTIC COMPLET ===" -ForegroundColor Green
            Write-Host ""
            
            # Vérifier fichiers
            Write-Host "1. Vérification des fichiers:" -ForegroundColor Yellow
            $files = @{
                "package.json" = "package.json"
                "app.json" = "app.json"
                "history.json" = "history.json"
                "Workflow" = ".github\workflows\full-deploy.yml"
                "EAS config" = "eas.json"
            }
            
            foreach ($file in $files.GetEnumerator()) {
                $exists = Test-Path $file.Value
                $status = if ($exists) { "OK" } else { "MANQUANT" }
                $color = if ($exists) { "Green" } else { "Red" }
                Write-Host "   $($file.Key): $status" -ForegroundColor $color
            }
            
            # Vérifier versions
            Write-Host ""
            Write-Host "2. Vérification des versions:" -ForegroundColor Yellow
            
            if (Test-Path "package.json") {
                $pkg = Get-Content "package.json" | ConvertFrom-Json
                Write-Host "   package.json: $($pkg.version)" -ForegroundColor Green
            }
            
            if (Test-Path "app.json") {
                $app = Get-Content "app.json" | ConvertFrom-Json
                if ($app.expo) {
                    Write-Host "   app.json (Expo): $($app.expo.version)" -ForegroundColor Green
                    if ($app.expo.runtimeVersion -and $app.expo.runtimeVersion -ne "unknown") {
                        Write-Host "   runtimeVersion: $($app.expo.runtimeVersion)" -ForegroundColor Green
                    } else {
                        Write-Host "   runtimeVersion: MANQUANT ou unknown" -ForegroundColor Yellow
                    }
                }
            }
            
            # Vérifier history.json
            Write-Host ""
            Write-Host "3. État de history.json:" -ForegroundColor Yellow
            
            if (Test-Path "history.json") {
                $history = Get-Content "history.json" | ConvertFrom-Json
                Write-Host "   Version: $($history.version)" -ForegroundColor Green
                
                if ($history.apk) {
                    Write-Host "   APK URL: OK (configurée)" -ForegroundColor Green
                } else {
                    Write-Host "   APK URL: VIDE - Le workflow n'a pas terminé" -ForegroundColor Red
                }
                
                Write-Host "   Date: $($history.date)" -ForegroundColor Gray
            }
            
            # Vérifier Git
            Write-Host ""
            Write-Host "4. Status Git:" -ForegroundColor Yellow
            
            try {
                $lastCommit = git log -1 --pretty=format:"%h - %s"
                Write-Host "   Dernier commit: $lastCommit" -ForegroundColor Green
                
                $branch = git rev-parse --abbrev-ref HEAD
                Write-Host "   Branche: $branch" -ForegroundColor Green
                
                $tags = git tag -l
                if ($tags) {
                    Write-Host "   Tags: $tags" -ForegroundColor Green
                } else {
                    Write-Host "   Tags: AUCUN" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   Erreur Git: $_" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "=== FIN DIAGNOSTIC ===" -ForegroundColor Green
            Pause-User
        }
        
        "2" {
            # Guide rapide
            Write-Host ""
            Write-Host "=== GUIDE RAPIDE ===" -ForegroundColor Green
            Write-Host ""
            
            $guideContent = @"
PROBLEME:
  L'APK n'a pas été publiée - history.json contient: "apk": ""

CAUSE:
  Le secret GitHub EXPO_TOKEN n'est pas configuré

SOLUTION RAPIDE (3 etapes):

1. CONFIGURER EXPO_TOKEN (5 min)
   - Aller à: https://github.com/Unknow-human/Nex-apk/settings/secrets/actions
   - Créer un nouveau secret
   - Nom: EXPO_TOKEN
   - Valeur: [token from https://auth.expo.io/]
   - Ajouter

2. MODIFIER app.json (2 min)
   - Ajouter à la section "expo":
       "runtimeVersion": "1.0.0"
   - Commit et push

3. DECLENCHER WORKFLOW (15 min)
   - Le workflow se déclenche automatiquement au push
   - Attendre que history.json soit mis à jour
   - Vérifier: APK URL devrait être peuplée

VERIFICATION:
  curl https://raw.githubusercontent.com/Unknow-human/Nex-apk/main/history.json | jq .apk
  # Devrait retourner une URL, pas une chaîne vide
"@
            
            Write-Host $guideContent
            Write-Host ""
            Pause-User
        }
        
        "3" {
            # Afficher audit complet
            if (Test-Path "APK_PUBLICATION_AUDIT_FINAL.md") {
                Write-Host ""
                Write-Host "=== AUDIT COMPLET ===" -ForegroundColor Green
                $content = Get-Content "APK_PUBLICATION_AUDIT_FINAL.md" | Select-Object -First 100
                $content | ForEach-Object { Write-Host $_ }
                Write-Host ""
                Write-Host "... (truncated - voir le fichier complet pour tous les détails)"
                Write-Host ""
            } else {
                Write-Host "Fichier audit non trouvé" -ForegroundColor Red
            }
            Pause-User
        }
        
        "4" {
            # Afficher history.json
            Write-Host ""
            Write-Host "=== CONTENU history.json ===" -ForegroundColor Green
            
            if (Test-Path "history.json") {
                $content = Get-Content "history.json"
                Write-Host $content -ForegroundColor Gray
                
                Write-Host ""
                $history = Get-Content "history.json" | ConvertFrom-Json
                
                if ($history.apk) {
                    Write-Host "Status APK: OK - URL configurée" -ForegroundColor Green
                } else {
                    Write-Host "Status APK: PROBLEME - URL vide" -ForegroundColor Red
                    Write-Host "Solution: Configurer EXPO_TOKEN et relancer le workflow" -ForegroundColor Yellow
                }
            } else {
                Write-Host "Fichier history.json non trouvé" -ForegroundColor Red
            }
            
            Write-Host ""
            Pause-User
        }
        
        "5" {
            # Commande Git tag
            Write-Host ""
            Write-Host "=== CREER GIT TAG v1.0.0 ===" -ForegroundColor Green
            Write-Host ""
            Write-Host "Copier et exécuter cette commande:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "git tag -a v1.0.0 -m ""Release v1.0.0 - NEXUS ARENA"" && git push origin v1.0.0" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Ou exécuter directement:" -ForegroundColor Yellow
            
            $createTag = Read-Host "Créer le tag maintenant? (O/N)"
            
            if ($createTag -eq "O" -or $createTag -eq "o") {
                try {
                    git tag -a v1.0.0 -m "Release v1.0.0 - NEXUS ARENA"
                    git push origin v1.0.0
                    Write-Host "Tag créé et poussé avec succès!" -ForegroundColor Green
                } catch {
                    Write-Host "Erreur: $_" -ForegroundColor Red
                }
            }
            
            Write-Host ""
            Pause-User
        }
        
        "6" {
            $continuer = $false
            Write-Host ""
            Write-Host "Au revoir!" -ForegroundColor Cyan
        }
        
        default {
            Write-Host "Option invalide. Sélectionnez 1-6." -ForegroundColor Red
        }
    }
}
