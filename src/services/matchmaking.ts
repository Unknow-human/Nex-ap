import { authService } from './authService';
import { supabase } from './supabaseClient';

const MATCH_POOL_TABLE = 'match_pool';
const MATCH_TIMEOUT_MS = 30000; // 30 secondes

interface MatchPlayer {
  playerId: string;
  playerName: string;
  timestamp: number;
}

interface Match {
  id: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  status: 'waiting' | 'matched' | 'expired';
  createdAt: number;
  matchedAt?: number;
}

export const matchmakingService = {
  /**
   * Ajoute le joueur à la file d'attente matchmaking.
   * Retourne l'ID de la ligne du pool (équivalent au poolDocId Firestore).
   */
  async joinMatchPool(playerId: string, playerName: string): Promise<string> {
    try {
      if (!playerId) {
        throw new Error('playerId requis');
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase
        .from(MATCH_POOL_TABLE)
        .insert({
          player_id: currentUser.uid,
          player_name: playerName,
          status: 'waiting',
          expires_at: new Date(Date.now() + MATCH_TIMEOUT_MS).toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Erreur joinMatchPool:', error);
      throw error;
    }
  },

  /**
   * Recherche un adversaire disponible via la fonction RPC atomique
   * `find_match` (FOR UPDATE SKIP LOCKED côté Postgres — évite les
   * doubles appariements en cas d'accès concurrents).
   */
  async findOpponent(currentPlayerId: string, poolDocId: string): Promise<Match | null> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase.rpc('find_match', {
        p_player_id: currentUser.uid,
        p_pool_id: poolDocId,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return null;
      }

      const row = data[0];
      const now = Date.now();

      return {
        id: row.match_id,
        player1: { playerId: currentUser.uid, playerName: '', timestamp: now },
        player2: { playerId: row.opponent_id, playerName: row.opponent_name, timestamp: now },
        status: 'matched',
        createdAt: now,
        matchedAt: now,
      };
    } catch (error) {
      console.error('Erreur findOpponent:', error);
      throw error;
    }
  },

  /**
   * Quitter la file d'attente/match
   */
  async leaveMatchPool(poolDocId: string): Promise<void> {
    try {
      const { error } = await supabase.from(MATCH_POOL_TABLE).delete().eq('id', poolDocId);
      if (error) throw error;
    } catch (error) {
      console.error('Erreur leaveMatchPool:', error);
      throw error;
    }
  },

  /**
   * Nettoyer les anciennes entrées expirées
   */
  async cleanupExpiredEntries(): Promise<void> {
    try {
      const { error } = await supabase.from(MATCH_POOL_TABLE).delete().lt('expires_at', new Date().toISOString());
      if (error) throw error;
    } catch (error) {
      console.error('Erreur cleanupExpiredEntries:', error);
    }
  },

  /**
   * Obtenir les stats du pool matchmaking
   */
  async getPoolStats(): Promise<{ waiting: number; matched: number }> {
    try {
      const [{ count: waiting }, { count: matched }] = await Promise.all([
        supabase.from(MATCH_POOL_TABLE).select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
        supabase.from(MATCH_POOL_TABLE).select('*', { count: 'exact', head: true }).eq('status', 'matched'),
      ]);

      return { waiting: waiting ?? 0, matched: matched ?? 0 };
    } catch (error) {
      console.error('Erreur getPoolStats:', error);
      return { waiting: 0, matched: 0 };
    }
  },
};
