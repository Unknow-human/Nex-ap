/**
 * Message Cleanup Service (migré vers Supabase)
 * Nettoie automatiquement:
 * 1. Messages de duel après la fin de la partie
 * 2. Messages du chat global après 30 jours
 * 3. Arenas et entrées de matchmaking expirées
 */

import { supabase } from './supabaseClient';

export const messageCleanupService = {
  /**
   * Nettoie les messages d'une arena spécifique après la fin du duel
   */
  async cleanupArenaChatMessages(arenaId: string): Promise<number> {
    try {
      if (!arenaId) return 0;
      const { error, count } = await supabase
        .from('arena_chat_messages')
        .delete({ count: 'exact' })
        .eq('arena_id', arenaId);

      if (error) throw error;
      console.log(`✅ Cleanup: ${count ?? 0} messages d'arena supprimés pour ${arenaId}`);
      return count ?? 0;
    } catch (error) {
      console.error('❌ Erreur lors du cleanup des messages d\'arena:', error);
      return 0;
    }
  },

  /**
   * Nettoie les messages du chat global de plus de 30 jours
   */
  async cleanupOldGlobalChatMessages(): Promise<number> {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const { error, count } = await supabase
        .from('chat_messages')
        .delete({ count: 'exact' })
        .lt('timestamp_ms', thirtyDaysAgo);

      if (error) throw error;
      if ((count ?? 0) > 0) {
        console.log(`✅ Cleanup: ${count} messages globaux > 30 jours supprimés`);
      }
      return count ?? 0;
    } catch (error) {
      console.error('❌ Erreur lors du cleanup des messages globaux:', error);
      return 0;
    }
  },

  /**
   * Nettoie les arenas expirées (waiting + expirées)
   */
  async cleanupExpiredArenas(): Promise<number> {
    try {
      const now = Date.now();

      const { data: expired, error: selectError } = await supabase
        .from('arenas')
        .select('id')
        .lt('expires_at_ms', now);

      if (selectError) throw selectError;
      if (!expired || expired.length === 0) return 0;

      for (const arena of expired) {
        await messageCleanupService.cleanupArenaChatMessages(arena.id);
      }

      const { error: deleteError, count } = await supabase
        .from('arenas')
        .delete({ count: 'exact' })
        .lt('expires_at_ms', now);

      if (deleteError) throw deleteError;
      if ((count ?? 0) > 0) {
        console.log(`✅ Cleanup: ${count} arenas expirées supprimées`);
      }
      return count ?? 0;
    } catch (error) {
      console.error('❌ Erreur lors du cleanup des arenas:', error);
      return 0;
    }
  },

  /**
   * Nettoie le Match Pool (joueurs qui n'ont pas trouvé de match)
   */
  async cleanupExpiredMatchPool(): Promise<number> {
    try {
      const { error, count } = await supabase
        .from('match_pool')
        .delete({ count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
      if ((count ?? 0) > 0) {
        console.log(`✅ Cleanup: ${count} entrées matchPool expirées supprimées`);
      }
      return count ?? 0;
    } catch (error) {
      console.error('❌ Erreur lors du cleanup du matchPool:', error);
      return 0;
    }
  },

  /**
   * Cleanup complet - appelé au démarrage de l'app
   */
  async fullCleanup(): Promise<{
    arenaMessages: number;
    globalMessages: number;
    expiredArenas: number;
    matchPool: number;
  }> {
    try {
      console.log('🧹 Démarrage du cleanup complet...');

      const [globalMessages, expiredArenas, matchPool] = await Promise.all([
        messageCleanupService.cleanupOldGlobalChatMessages(),
        messageCleanupService.cleanupExpiredArenas(),
        messageCleanupService.cleanupExpiredMatchPool(),
      ]);

      return { arenaMessages: 0, globalMessages, expiredArenas, matchPool };
    } catch (error) {
      console.error('❌ Erreur lors du cleanup complet:', error);
      return { arenaMessages: 0, globalMessages: 0, expiredArenas: 0, matchPool: 0 };
    }
  },
};
