// IMPORTANT : expo-file-system v19 (SDK 54) a remplacé l'ancienne API
// (readAsStringAsync, EncodingType, ...) par une nouvelle API basée sur
// File/Directory. L'import par défaut 'expo-file-system' n'expose plus
// forcément readAsStringAsync/EncodingType de façon fiable — on importe
// explicitement le sous-module /legacy pour garantir leur présence.
// Sans ça, EncodingType.Base64 peut être undefined, ce qui fait lire le
// fichier audio binaire en UTF-8 par défaut et le corrompt/vide avant
// même l'upload (symptôme observé : fichiers 00:00 dans Supabase Storage).
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { ChatMessage, Record } from '../types';
import { supabase } from './supabaseClient';

// Ré-export pour les modules qui veulent le client brut (ex: RPC custom)
export { supabase };

/**
 * Service de Chat global
 * (remplace chatService dans firebase.ts — même API publique)
 */
export const chatService = {
  /**
   * Uploader un fichier local (ex: audio) vers Supabase Storage
   * et retourner l'URL publique.
   *
   * NB: on n'utilise volontairement PAS fetch(uri).blob() ici — sur
   * React Native/Hermes cette méthode corrompt ou tronque les fichiers
   * binaires locaux (audio, images), ce qui produisait des fichiers
   * audio vides/cassés (durée 00:00) une fois uploadés.
   */
  async uploadFile(localUri: string, remotePath: string): Promise<string | null> {
    try {
      // Vérif taille locale avant tout : un fichier 0 octet indique un
      // problème d'enregistrement (pas d'upload) — inutile d'aller plus loin.
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists || (info as any).size === 0) {
        console.warn('[uploadFile] Fichier local vide ou introuvable, upload annulé:', localUri, info);
        return null;
      }

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!base64 || base64.length === 0) {
        console.warn('[uploadFile] Lecture base64 vide malgré un fichier local non-vide — probable régression d\'API expo-file-system:', localUri);
        return null;
      }

      const arrayBuffer = decode(base64);
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.warn('[uploadFile] arrayBuffer vide après decode(), upload annulé:', remotePath);
        return null;
      }

      const { error } = await supabase.storage
        .from('audio-messages')
        .upload(remotePath, arrayBuffer, { upsert: true, contentType: 'audio/m4a' });

      if (error) {
        // Cas fréquent : RLS a rejeté l'insert car auth.role() !== 'authenticated'
        // (session anonyme/cache, pas un vrai token Supabase). Le message
        // Postgres le dit généralement explicitement ("new row violates
        // row-level security policy").
        console.warn('[uploadFile] Upload Supabase refusé (souvent RLS / session non authentifiée):', error.message);
        return null;
      }

      console.log(`[uploadFile] Upload OK: ${remotePath} (${arrayBuffer.byteLength} octets)`);
      const { data } = supabase.storage.from('audio-messages').getPublicUrl(remotePath);
      return data.publicUrl;
    } catch (error) {
      console.warn('Erreur upload fichier:', error);
      return null;
    }
  },

  /**
   * Envoyer un message dans le chat global
   */
  async sendMessage(agentName: string, message: string, audioUrl?: string): Promise<void> {
    try {
      const { authService } = await import('./authService');
      const effective = await authService.getEffectiveUser();

      const payload: any = {
        agent_name: agentName || 'Anonyme',
        creator_id: effective ? effective.uid : null,
        message: message.trim(),
        message_type: audioUrl ? 'audio' : 'message',
        timestamp_ms: Date.now(),
      };

      if (audioUrl) {
        payload.audio_url = audioUrl;
      }

      if (!effective || effective.isOffline) {
        console.log('[chatService] Offline ou pas d\'utilisateur: mise en file d\'attente');
        await authService._savePendingChatMessageForTests(payload);
        return;
      }

      const { error } = await supabase.from('chat_messages').insert(payload);
      if (error) throw error;
    } catch (error) {
      console.error('Erreur envoi message:', error);
      throw error;
    }
  },

  // Utilisé en interne par authService pour envoyer les messages en file d'attente
  async _sendMessageDirect(payload: any): Promise<void> {
    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) throw error;
  },

  /**
   * Envoyer un log de combat dans le chat
   */
  async sendCombatLog(agentName: string, attempt: { code: string; bp: number; mp: number }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('Utilisateur non authentifié');
    }
    const { error } = await supabase.from('chat_messages').insert({
      agent_name: agentName,
      creator_id: userData.user.id,
      message: `a tenté ${attempt.code} - ${attempt.bp}BP, ${attempt.mp}MP`,
      message_type: 'combat-log',
      attempt,
      timestamp_ms: Date.now(),
    });
    if (error) throw error;
  },

  /**
   * Écouter les nouveaux messages du chat (Supabase Realtime)
   */
  subscribeToChat(callback: (messages: ChatMessage[]) => void): () => void {
    const mapRow = (row: any): ChatMessage => ({
      id: row.id,
      agentName: row.agent_name,
      message: row.message,
      timestamp: row.timestamp_ms,
      type: row.message_type,
      attempt: row.attempt || undefined,
      audioUri: row.audio_url || undefined,
    });

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp_ms', { ascending: false })
        .limit(100);

      if (!error && data && !cancelled) {
        callback(data.map(mapRow).reverse());
      }
    };

    load();

    const channel = supabase
      .channel(`chat_messages_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Service de Chat d'Arena (messages privés entre joueurs)
 */
export const arenaChatService = {
  async sendArenaMessage(arenaId: string, playerId: string, playerName: string, message: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('Utilisateur non authentifié');
    }
    const { error } = await supabase.from('arena_chat_messages').insert({
      arena_id: arenaId,
      player_id: playerId,
      player_name: playerName,
      creator_id: userData.user.id,
      message: message.trim(),
      timestamp_ms: Date.now(),
    });
    if (error) throw error;
  },

  subscribeToArenaChat(arenaId: string, callback: (messages: any[]) => void): () => void {
    const mapRow = (row: any) => ({
      id: row.id,
      arenaId: row.arena_id,
      playerId: row.player_id,
      playerName: row.player_name,
      message: row.message,
      timestamp: row.timestamp_ms,
    });

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('arena_chat_messages')
        .select('*')
        .eq('arena_id', arenaId)
        .order('timestamp_ms', { ascending: true });

      if (!error && data && !cancelled) {
        callback(data.map(mapRow));
      }
    };

    load();

    const channel = supabase
      .channel(`arena_chat_${arenaId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'arena_chat_messages', filter: `arena_id=eq.${arenaId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Service de Records
 */
export const recordsService = {
  async saveRecord(record: Omit<Record, 'id'>): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('Utilisateur non authentifié');
    }
    const { error } = await supabase.from('records').insert({
      agent_name: record.agentName,
      player_id: userData.user.id,
      attempts: record.attempts,
      time_seconds: record.time,
      mode: record.mode,
      difficulty: record.difficulty,
      opponent_name: record.opponentName,
      timestamp_ms: record.timestamp ?? Date.now(),
    });
    if (error) throw error;
  },

  subscribeToRecords(callback: (records: Record[]) => void): () => void {
    const mapRow = (row: any): Record => ({
      id: row.id,
      agentName: row.agent_name,
      attempts: row.attempts,
      time: row.time_seconds,
      mode: row.mode,
      difficulty: row.difficulty || undefined,
      opponentName: row.opponent_name || undefined,
      timestamp: row.timestamp_ms,
    });

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('timestamp_ms', { ascending: false });

      if (!error && data && !cancelled) {
        callback(data.map(mapRow));
      }
    };

    load();

    const channel = supabase
      .channel(`records_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'records' }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },
};
