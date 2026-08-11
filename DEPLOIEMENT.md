# Nexus Arena — Guide de déploiement

Dernière mise à jour : Étape 1 quasi terminée — tous les écrans utilisent maintenant les tokens `THEME.colors` (plus aucune couleur codée en dur), et les CTA principaux de Home/Auth/Chat sont sur `ModernButton`/`ModernCard`.

## 1. Stack actuelle

- **Expo SDK 50** (React Native 0.73.6), managed workflow, pas de code natif custom hors plugins Expo standards (`expo-av`, `expo-secure-store`).
- **Backend : Supabase** (Postgres + Realtime + Auth + Storage). Firebase a été retiré du code (plus de `firebase.ts`).
- **⚠️ `render.yaml` est obsolète** : il référence encore des variables `NEXT_PUBLIC_FIREBASE_*` pour le déploiement du site landing. À corriger avant le prochain déploiement du site (remplacer par les variables Supabase, voir section 2).

## 2. Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

```
EXPO_PUBLIC_SUPABASE_URL=https://<ton-projet>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ta clé anon>
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_EAS_PROJECT_ID=<id du projet EAS>
```

Côté Supabase Dashboard (Project Settings > API) :
1. Exécuter `supabase/schema.sql` dans l'éditeur SQL (tables `profiles`, `chat_messages`, `arenas`, `arena_chat_messages`, `records`, `match_pool` + RLS).
2. Activer l'authentification anonyme (Authentication > Providers > Anonymous Sign-Ins).
3. Créer le bucket de stockage `audio-messages` (public en lecture) pour les messages vocaux.

## 3. Lancer en local

```
npm install
npx expo start
```

## 4. Tester sur iPhone (rapide, sans build) — Expo Go

1. Installer **Expo Go** depuis l'App Store.
2. `npx expo start` sur l'ordi (même Wi-Fi que l'iPhone).
3. Scanner le QR code affiché avec l'appareil photo de l'iPhone.
4. Si ça ne se connecte pas (réseau restreint/VPN) : `npx expo start --tunnel`.

**Limite connue** : les notifications push distantes (`expo-notifications`) ne fonctionnent pas dans Expo Go depuis SDK 50. Seules les notifications locales marchent. Pour tester les push, il faudra un vrai build (dev client ou TestFlight).

## 5. Build APK Android (EAS)

```
eas build --platform android --profile production
```
Profil déjà configuré dans `eas.json` (buildType apk).

## 6. Build iOS (TestFlight / App Store) — pas encore configuré

`eas.json` n'a pour l'instant **qu'un profil Android**. Pour livrer une vraie appli iOS installable, il faudra :
1. Un compte Apple Developer Program (99 $/an).
2. Ajouter un bloc `"ios"` dans les profils `eas.json`.
3. `eas build --platform ios --profile production`
4. `eas submit --platform ios` pour pousser vers TestFlight.

À faire quand on passera à cette étape (pas encore lancé).

## 7. État d'avancement du plan V2

| Étape | Statut |
|---|---|
| 1. Thème cyberpunk unifié | 🔶 Quasi terminée. `theme/index.ts` fait. **Couleurs codées en dur éliminées partout** : `ChatScreen` (44), `RecordsScreen` (44), `HelpScreen` (48, `THEME` était importé mais jamais utilisé), `WebAppScreen` (5) — tout passe maintenant par `THEME.colors`. `GameScreen.tsx` utilisait déjà `THEME.colors` partout (0 hex en dur trouvé dès le départ), donc rien à corriger côté couleurs. **CTA migrés vers `ModernButton`/`ModernCard`** : `HomeScreen`, `AuthScreen`, `ChatScreen` (bouton "Confirmer"). **Pas fait** : les 49 `TouchableOpacity` de `GameScreen.tsx` (submit, abandon, reset, switch player...) n'ont pas été convertis en `ModernButton` — plusieurs ont des animations de press sur-mesure liées au feel du jeu ; risqué à faire sans pouvoir compiler. À traiter en même temps que le découpage du fichier (voir plus bas). `RecordsScreen`/`HelpScreen` : boutons pas encore migrés vers `ModernButton` (onglets et sections dépliables, moins prioritaire visuellement). |
| 2. Migration Firebase → Supabase | ✅ Faite pour l'essentiel — plus de `firebase.ts`, schéma Postgres en place. À vérifier : RLS complètes, listeners `postgres_changes`, RPC de matchmaking atomique. |
| 3. Boucle de jeu (ELO, ligues, streak) | 🔶 Entamée — références ELO/ligue/streak présentes dans `useGame.ts`, `GameScreen.tsx`, `RecordsScreen.tsx`. Pas vérifié si complet. |
| 4. Social & croissance | ⬜ Pas commencée. |
| Découpage `GameScreen.tsx` (2862 lignes) | ⬜ Pas commencé. |
| Nettoyage fichiers `_backup/_new/_clean/_pro` | ✅ Fait, aucun fichier de ce type dans le repo. |

## 8. Bugs corrigés au passage

- `ChatScreen` : le texte tapé dans l'input de message était en `#404a63` (gris foncé) sur fond bleu marine — quasi invisible. Corrigé en `THEME.colors.textPrimary`.

## 9. Nettoyage restant identifié

- Corriger `render.yaml` (variables Firebase → Supabase) avant le prochain déploiement du site landing.
