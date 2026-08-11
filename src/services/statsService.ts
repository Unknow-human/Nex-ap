import { supabase } from './supabaseClient';
import { GameDifficulty, LeaderboardEntry, PlayerStats } from '../types';

function mapStatsRow(row: any): PlayerStats {
  return {
    uid: row.uid,
    eloRating: row.elo_rating,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winStreak: row.win_streak,
    bestWinStreak: row.best_win_streak,
    dailyStreak: row.daily_streak,
    bestDailyStreak: row.best_daily_streak,
  };
}

function mapLeaderboardRow(row: any): LeaderboardEntry {
  return {
    uid: row.uid,
    agentName: row.agent_name,
    eloRating: row.elo_rating,
    wins: row.wins,
    gamesPlayed: row.games_played,
    winStreak: row.win_streak,
  };
}

/**
 * Service ELO / streaks / classements (Étape 3/4 de la feuille de route).
 * Toutes les écritures passent par des RPC Postgres `security definer`
 * (voir supabase/schema.sql, section 15-18) pour rester atomiques et
 * cohérentes avec le reste du projet (add_arena_attempt, find_match).
 *
 * Toutes les méthodes sont conçues pour échouer silencieusement
 * (best-effort) : une erreur ELO/streak ne doit jamais bloquer
 * l'affichage de la victoire au joueur, au même titre que la
 * synchronisation des records (recordsPersistenceService).
 */
export const statsService = {
  /**
   * Enregistre le résultat d'une partie SOLO : gain d'ELO (jamais de
   * perte, pas d'adversaire réel) + streak de victoires + streak quotidien.
   */
  async recordSoloResult(
    uid: string,
    difficulty: GameDifficulty,
    attempts: number
  ): Promise<{ newElo: number; eloDelta: number } | null> {
    try {
      const { data, error } = await supabase.rpc('record_solo_result', {
        p_uid: uid,
        p_difficulty: difficulty,
        p_attempts: attempts,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return { newElo: row.new_elo, eloDelta: row.elo_delta };
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur recordSoloResult (non bloquant):', error);
      return null;
    }
  },

  /**
   * Enregistre le résultat d'un match MULTI-ONLINE terminé. Idempotent
   * côté serveur (arenas.elo_processed) : peut être appelée par les
   * deux clients sans risque de double comptage.
   */
  async recordMatchResult(arenaId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('record_match_result', { p_arena_id: arenaId });
      if (error) throw error;
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur recordMatchResult (non bloquant):', error);
    }
  },

  /**
   * Touche uniquement le streak quotidien, sans ELO — utilisé pour le
   * mode MULTI-LOCAL (pas de compte séparé par joueur local, donc pas
   * d'ELO/win_streak fiable, mais l'appareil a bien joué aujourd'hui).
   */
  async touchDailyStreak(uid: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('touch_daily_streak', { p_uid: uid });
      if (error) throw error;
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur touchDailyStreak (non bloquant):', error);
    }
  },

  /**
   * Récupère les stats ELO/streaks d'un joueur.
   */
  async getPlayerStats(uid: string): Promise<PlayerStats | null> {
    try {
      const { data, error } = await supabase.from('player_stats').select('*').eq('uid', uid).maybeSingle();
      if (error || !data) return null;
      return mapStatsRow(data);
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur getPlayerStats:', error);
      return null;
    }
  },

  /**
   * Rang global du joueur (ex: #123), même hors du top affiché.
   */
  async getMyRank(uid: string): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('get_my_rank', { p_uid: uid });
      if (error) throw error;
      return typeof data === 'number' ? data : null;
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur getMyRank:', error);
      return null;
    }
  },

  /**
   * Classement global (top N par ELO).
   */
  async getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_global', { p_limit: limit });
      if (error) throw error;
      return (data || []).map(mapLeaderboardRow);
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur getGlobalLeaderboard:', error);
      return [];
    }
  },

  /**
   * Classement entre amis (inclut le joueur lui-même).
   */
  async getFriendsLeaderboard(uid: string): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_friends', { p_uid: uid });
      if (error) throw error;
      return (data || []).map(mapLeaderboardRow);
    } catch (error) {
      console.warn('⚠️ [statsService] Erreur getFriendsLeaderboard:', error);
      return [];
    }
  },
};
