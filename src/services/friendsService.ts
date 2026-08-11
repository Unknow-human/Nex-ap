import { supabase } from './supabaseClient';
import { Challenge, Friend } from '../types';

function mapFriendRow(row: any): Friend {
  return {
    uid: row.uid,
    agentName: row.agent_name,
    eloRating: row.elo_rating,
    wins: row.wins,
    gamesPlayed: row.games_played,
    winStreak: row.win_streak,
  };
}

function mapChallengeRow(row: any): Challenge {
  return {
    id: row.id,
    fromPlayerId: row.from_player_id,
    fromPlayerName: row.from_player_name,
    toPlayerId: row.to_player_id,
    arenaId: row.arena_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Service amis / défis directs (Étape 3/4 de la feuille de route).
 * Les amis sont ajoutés automatiquement par le serveur après chaque
 * match MULTI-ONLINE terminé (voir statsService.recordMatchResult /
 * RPC record_match_result) — il n'y a pas d'ajout manuel par pseudo.
 */
export const friendsService = {
  /**
   * Liste des amis rencontrés en ligne (classement entre amis inclus
   * via statsService.getFriendsLeaderboard — ici, juste la liste brute
   * pour l'écran "Amis").
   */
  async getFriends(uid: string): Promise<Friend[]> {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id, friend_name')
        .eq('player_id', uid);
      if (error || !data) return [];

      const friendIds = data.map((r: any) => r.friend_id);
      if (friendIds.length === 0) return [];

      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select('uid, elo_rating, wins, games_played, win_streak')
        .in('uid', friendIds);
      if (statsError) throw statsError;

      const statsByUid = new Map((stats || []).map((s: any) => [s.uid, s]));

      return data.map((r: any) => {
        const s = statsByUid.get(r.friend_id);
        return mapFriendRow({
          uid: r.friend_id,
          agent_name: r.friend_name || 'Joueur',
          elo_rating: s?.elo_rating ?? 1200,
          wins: s?.wins ?? 0,
          games_played: s?.games_played ?? 0,
          win_streak: s?.win_streak ?? 0,
        });
      });
    } catch (error) {
      console.warn('⚠️ [friendsService] Erreur getFriends:', error);
      return [];
    }
  },

  /**
   * Défie un ami directement : crée l'arène + le défi en un seul appel
   * serveur (RPC create_challenge), sans code de salle à partager.
   */
  async challengeFriend(
    toUid: string,
    toName: string,
    fromName: string
  ): Promise<{ arenaId: string; secretCode: string } | null> {
    try {
      const { data, error } = await supabase.rpc('create_challenge', {
        p_to_uid: toUid,
        p_to_name: toName,
        p_from_name: fromName,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return { arenaId: row.arena_id, secretCode: row.secret_code };
    } catch (error) {
      console.error('❌ [friendsService] Erreur challengeFriend:', error);
      return null;
    }
  },

  /**
   * Accepte ou refuse un défi reçu. En cas d'acceptation, renvoie
   * l'arenaId à rejoindre via le flux existant (improvedArenaService.joinArena).
   */
  async respondToChallenge(challengeId: string, accept: boolean): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('respond_challenge', {
        p_challenge_id: challengeId,
        p_accept: accept,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row?.arena_id || null;
    } catch (error) {
      console.error('❌ [friendsService] Erreur respondToChallenge:', error);
      return null;
    }
  },

  /**
   * Écoute en temps réel les défis reçus par ce joueur (nouveaux défis
   * en attente). Retourne une fonction pour se désabonner.
   */
  subscribeToIncomingChallenges(uid: string, callback: (challenge: Challenge) => void): () => void {
    const channel = supabase
      .channel(`challenges_${uid}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges', filter: `to_player_id=eq.${uid}` },
        (payload) => {
          const challenge = mapChallengeRow(payload.new);
          if (challenge.status === 'pending') callback(challenge);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
