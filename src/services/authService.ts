import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

// Nécessaire pour que le résultat du navigateur d'auth revienne bien vers
// l'app (ferme l'onglet/la feuille du navigateur système après redirection).
WebBrowser.maybeCompleteAuthSession();

// Client IDs Google OAuth — à créer sur https://console.cloud.google.com
// (écran de consentement OAuth + identifiants "ID client OAuth"). Un ID
// distinct est nécessaire par plateforme :
//  - Web : type "Application Web", avec comme origine/redirection
//    autorisée l'URL affichée par `AuthSession.makeRedirectUri()` en dev.
//  - Android : type "Android", avec le nom de package (`nexus.renosd`,
//    voir app.json) et l'empreinte SHA-1 de la clé de signature.
//  - iOS : type "iOS", avec le bundle identifier (`com.nexusarena.app`).
// Sans ces variables définies (.env.local), le bouton Google reste masqué
// (voir canUseGoogleSignIn) plutôt que de planter à l'utilisation.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function getGoogleClientId(): string | undefined {
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android') return GOOGLE_ANDROID_CLIENT_ID;
  return GOOGLE_WEB_CLIENT_ID;
}

// Clés de stockage
const AUTH_CACHE_KEY = '@nexus_auth_cache_v1';
const HAS_SEEN_LOGIN_KEY = '@nexus_has_seen_login_v1';
const AGENT_NAME_KEY = '@nexus_arena_agent_name';
const PENDING_CHAT_KEY = '@nexus_pending_chat_messages_v1';
const PENDING_RESET_KEY = '@nexus_pending_password_resets_v1';
const PENDING_ACCOUNT_KEY = '@nexus_pending_account_v1';

/**
 * Forme normalisée d'un utilisateur, compatible avec l'ancienne API
 * Firebase (`.uid`, `.email`, `.displayName`) utilisée dans le reste
 * de l'app — évite de réécrire tous les écrans consommateurs.
 */
export interface NexusUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

interface EffectiveUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  isOffline?: boolean;
}

function toNexusUser(user: User): NexusUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
    isAnonymous: user.is_anonymous ?? false,
  };
}

let cachedAuthSnapshot: EffectiveUser | null = null;
let currentSupabaseUser: User | null = null;

export const authService = {
  /**
   * INITIALISATION : Vérifie l'état au démarrage.
   * Se connecte anonymement via Supabase Auth si aucune session
   * n'existe encore (équivalent de l'auth anonyme Firebase).
   */
  async initializeAuth(): Promise<NexusUser | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session?.user) {
        currentSupabaseUser = sessionData.session.user;
        console.log('✅ [authService] Session trouvée:', currentSupabaseUser.id);
        await this._persistLocalAuth(currentSupabaseUser);
        return toNexusUser(currentSupabaseUser);
      }

      // Pas de session : tenter une connexion anonyme
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('[authService] Échec connexion anonyme:', error.message);
        const cached = await this.getCachedAuth();
        if (cached) {
          console.log('ℹ️ [authService] Session restaurée depuis le cache');
          cachedAuthSnapshot = cached;
        }
        return null;
      }

      currentSupabaseUser = data.user;
      if (currentSupabaseUser) {
        await this._persistLocalAuth(currentSupabaseUser);
        return toNexusUser(currentSupabaseUser);
      }
      return null;
    } catch (e) {
      console.error('[authService] Erreur initializeAuth:', e);
      const cached = await this.getCachedAuth();
      if (cached) cachedAuthSnapshot = cached;
      return null;
    }
  },

  /**
   * PERSISTENCE : Sauvegarde les données et le NOM de l'agent
   */
  async _persistLocalAuth(user: User) {
    try {
      const payload: EffectiveUser = {
        uid: user.id,
        email: user.email ?? null,
        isAnonymous: user.is_anonymous ?? true,
      };

      await AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
      cachedAuthSnapshot = payload;

      let nameToStore = (user.user_metadata?.display_name as string | undefined) ?? null;
      if (!nameToStore && user.email) {
        nameToStore = user.email.split('@')[0];
      }

      if (nameToStore) {
        await AsyncStorage.setItem(AGENT_NAME_KEY, nameToStore);
        console.log('👤 [authService] Agent Name Persisté:', nameToStore);
      }
    } catch (e) {
      console.error('[authService] Erreur persistance:', e);
    }
  },

  // Marque que l'utilisateur a passé l'écran de login
  async markLoginSeen() {
    await AsyncStorage.setItem(HAS_SEEN_LOGIN_KEY, '1');
  },

  // Vérifie si on doit afficher le login
  async hasSeenLogin(): Promise<boolean> {
    const v = await AsyncStorage.getItem(HAS_SEEN_LOGIN_KEY);
    return v === '1';
  },

  async getCachedAuth(): Promise<EffectiveUser | null> {
    try {
      const s = await AsyncStorage.getItem(AUTH_CACHE_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },

  /**
   * Utilisateur courant, de façon synchrone (dernier connu en mémoire).
   * Retourne null si aucune session n'a encore été chargée dans ce
   * cycle de vie de l'app — préférer initializeAuth() au démarrage.
   */
  getCurrentUser(): NexusUser | null {
    return currentSupabaseUser ? toNexusUser(currentSupabaseUser) : null;
  },

  /**
   * Utilisateur "effectif" : session en ligne si disponible, sinon
   * l'utilisateur mis en cache localement (mode hors-ligne).
   */
  async getEffectiveUser(): Promise<EffectiveUser | null> {
    if (currentSupabaseUser) {
      return {
        uid: currentSupabaseUser.id,
        email: currentSupabaseUser.email ?? null,
        isAnonymous: currentSupabaseUser.is_anonymous ?? true,
        isOffline: false,
      };
    }

    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      currentSupabaseUser = data.session.user;
      return {
        uid: currentSupabaseUser.id,
        email: currentSupabaseUser.email ?? null,
        isAnonymous: currentSupabaseUser.is_anonymous ?? true,
        isOffline: false,
      };
    }

    const cached = cachedAuthSnapshot ?? (await this.getCachedAuth());
    if (cached) {
      return { ...cached, isOffline: true };
    }

    return null;
  },

  /**
   * Vérifie la connectivité au backend Supabase (ping léger).
   */
  async isOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('records').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  // ------------------------------------------------------------
  // Connexion par email / mot de passe
  // ------------------------------------------------------------

  /**
   * Crée un compte email/mot de passe. Si la création échoue faute de
   * réseau, la demande est sauvegardée localement (comportement déjà
   * attendu par AuthScreen via le code d'erreur OFFLINE_PENDING_ACCOUNT_SAVED).
   */
  async createAccountWithEmail(email: string, password: string): Promise<NexusUser | null> {
    const online = await this.isOnline();
    if (!online) {
      try {
        await AsyncStorage.setItem(PENDING_ACCOUNT_KEY, JSON.stringify({ email, password, requestedAt: Date.now() }));
      } catch (e) {
        console.error('[authService] Erreur sauvegarde compte hors-ligne:', e);
      }
      const err: any = new Error('Hors-ligne : compte sauvegardé localement');
      err.code = 'OFFLINE_PENDING_ACCOUNT_SAVED';
      throw err;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) return null;

    currentSupabaseUser = data.user;
    await this._persistLocalAuth(data.user);
    return toNexusUser(data.user);
  },

  async signInWithEmail(email: string, password: string, _remember: boolean = true): Promise<NexusUser | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) return null;

    currentSupabaseUser = data.user;
    await this._persistLocalAuth(data.user);
    return toNexusUser(data.user);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const online = await this.isOnline();
    if (!online) {
      try {
        const raw = await AsyncStorage.getItem(PENDING_RESET_KEY);
        const pending: string[] = raw ? JSON.parse(raw) : [];
        pending.push(email);
        await AsyncStorage.setItem(PENDING_RESET_KEY, JSON.stringify(pending));
      } catch (e) {
        console.error('[authService] Erreur sauvegarde reset hors-ligne:', e);
      }
      const err: any = new Error('Hors-ligne : demande sauvegardée localement');
      err.code = 'OFFLINE_PENDING_RESET_SAVED';
      throw err;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // ------------------------------------------------------------
  // Connexion Google via expo-auth-session (flux OAuth "id_token" côté
  // client) + Supabase `signInWithIdToken`. Nécessite :
  //  1. Un provider Google activé dans Supabase (Dashboard > Authentication
  //     > Providers > Google), avec le même Web Client ID renseigné.
  //  2. Les variables EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID /
  //     EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  //     définies dans .env.local (voir .env.example) — sans ça,
  //     canUseGoogleSignIn() renvoie false et l'UI masque le bouton au
  //     lieu de planter à l'usage.
  // ------------------------------------------------------------
  canUseGoogleSignIn(): boolean {
    return Boolean(getGoogleClientId());
  },

  async signInWithGoogle(): Promise<NexusUser | null> {
    const clientId = getGoogleClientId();
    if (!clientId) {
      throw new Error(
        'Connexion Gmail non configurée. Ajoute EXPO_PUBLIC_GOOGLE_*_CLIENT_ID dans .env.local (voir .env.example).'
      );
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'nexus-arena' });
    const nonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce: hashedNonce },
    });

    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Connexion Google annulée.');
    }
    if (result.type !== 'success' || !result.params?.id_token) {
      throw new Error(result.type === 'error' ? (result.error?.message || 'Erreur Google Sign-In') : 'Connexion Google annulée.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: result.params.id_token,
      nonce,
    });

    if (error) throw error;
    if (!data.user) return null;

    currentSupabaseUser = data.user;
    return toNexusUser(data.user);
  },

  /**
   * File d'attente locale des messages de chat en attente d'envoi
   * (mode hors-ligne).
   */
  async _savePendingChatMessageForTests(payload: any): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_CHAT_KEY);
      const pending = raw ? JSON.parse(raw) : [];
      pending.push(payload);
      await AsyncStorage.setItem(PENDING_CHAT_KEY, JSON.stringify(pending));
    } catch (e) {
      console.error('[authService] Erreur mise en file du message:', e);
    }
  },

  /**
   * Tente d'envoyer les messages de chat mis en attente hors-ligne.
   */
  async flushPendingChatMessages(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_CHAT_KEY);
      const pending = raw ? JSON.parse(raw) : [];
      if (pending.length === 0) return;

      const { chatService } = await import('./supabase');
      const remaining: any[] = [];
      for (const payload of pending) {
        try {
          await chatService._sendMessageDirect(payload);
        } catch {
          remaining.push(payload);
        }
      }
      await AsyncStorage.setItem(PENDING_CHAT_KEY, JSON.stringify(remaining));
    } catch (e) {
      console.error('[authService] Erreur flush messages en attente:', e);
    }
  },

  /**
   * LOGOUT : Nettoyage complet pour forcer le login au retour
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove([AUTH_CACHE_KEY, HAS_SEEN_LOGIN_KEY, AGENT_NAME_KEY]);
      cachedAuthSnapshot = null;
      currentSupabaseUser = null;
      console.log('✅ [authService] Déconnexion et reset total.');
    } catch (error) {
      console.error('❌ [authService] Erreur logout:', error);
    }
  },

  /**
   * Écoute les changements d'état d'authentification (connexion,
   * déconnexion, refresh de session). Retourne une fonction pour
   * se désabonner.
   */
  onAuthStateChanged(callback: (user: NexusUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        currentSupabaseUser = session.user;
        callback(toNexusUser(session.user));
      } else {
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  },

  isAuthenticated(): boolean {
    return currentSupabaseUser !== null || (cachedAuthSnapshot !== null && !cachedAuthSnapshot.isAnonymous);
  },

  // ------------------------------------------------------------
  // Helpers réservés aux tests (files d'attente hors-ligne)
  // ------------------------------------------------------------
  async _getPendingAccountForTests(): Promise<any | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_ACCOUNT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async _clearPendingAccountForTests(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_ACCOUNT_KEY);
  },

  async _getPendingResetsForTests(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_RESET_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async _clearPendingResetsForTests(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_RESET_KEY);
  },

  async _getPendingChatMessagesForTests(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_CHAT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async _clearPendingChatMessagesForTests(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_CHAT_KEY);
  },
};
