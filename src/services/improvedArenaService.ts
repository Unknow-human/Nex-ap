import { authService } from './authService';
import { supabase } from './supabaseClient';

const ARENA_TABLE = 'arenas';
const MATCH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function mapArenaRow(row: any) {
  return {
    id: row.id,
    arenaId: row.id,
    secretCode: row.secret_code,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    players: row.players || [],
    attempts: row.attempts || [],
    status: row.status,
    difficulty: row.difficulty || undefined,
    winnerId: row.winner_id || undefined,
    abandonedBy: row.abandoned_by || undefined,
    gameStarted: row.game_started,
    gameStartedAt: row.game_started_at || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at_ms,
    expiresAt: row.expires_at_ms,
    lastUpdated: row.last_updated_ms,
  };
}

/**
 * Service d'Arena amélioré (migré vers Supabase)
 * Gère la création, rejoindre et synchronisation des arenas
 */
export const improvedArenaService = {
  /**
   * Créer une nouvelle arena avec un ID lisible
   */
  async createArena(playerId: string, playerName: string): Promise<{
    arenaId: string;
    secretCode: string;
  }> {
    try {
      console.log('📝 [improvedArenaService] Création arena:', { playerId, playerName });

      // S'assurer que l'utilisateur est authentifié (anonyme si besoin)
      if (!authService.getCurrentUser()) {
        try {
          await authService.initializeAuth();
        } catch (e) {
          console.warn('[improvedArenaService] Impossible d\'initialiser auth avant création:', e);
        }
      }

      // getEffectiveUser() gère le fallback cache — mais attention : un uid
      // venant UNIQUEMENT du cache local n'a PAS de session Postgres valide
      // derrière lui. Les policies RLS (arenas.insert: auth.uid() = creator_id)
      // rejetteront quand même l'insert dans ce cas. Le vrai correctif est
      // de réactiver l'auth anonyme côté Supabase (Dashboard > Authentication
      // > Providers > Anonymous), pas ce fallback.
      const effective = await authService.getEffectiveUser();
      const creatorUid = effective?.uid;
      if (!creatorUid) {
        throw new Error('Impossible de récupérer l\'utilisateur Supabase. Vérifiez la connexion ou la configuration Auth.');
      }
      if (effective?.isOffline) {
        console.warn('[improvedArenaService] Session hors-cache (pas de token Supabase valide) : la création risque d\'être refusée par les policies RLS. Vérifiez que l\'auth anonyme est activée côté Supabase.');
      }

      const arenaId = `ARENA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const secretCode = this.generateSecretCode();
      const now = Date.now();

      console.log('🔐 [improvedArenaService] Codes générés:', { arenaId, secretCode });

      const { error } = await supabase.from(ARENA_TABLE).insert({
        id: arenaId,
        secret_code: secretCode,
        creator_id: creatorUid,
        creator_name: playerName,
        players: [{ id: creatorUid, name: playerName, joinedAt: now }],
        status: 'waiting',
        created_at_ms: now,
        expires_at_ms: now + MATCH_TIMEOUT,
        last_updated_ms: now,
        game_started: false,
        attempts: [],
      });

      if (error) throw error;

      console.log('✅ [improvedArenaService] Arena créée avec ID:', arenaId);
      return { arenaId, secretCode };
    } catch (error: any) {
      console.error('❌ [improvedArenaService] Erreur création arena:', error);
      throw error;
    }
  },

  /**
   * Rejoindre une arena existante
   */
  async joinArena(
    arenaId: string,
    playerId: string,
    playerName: string
  ): Promise<{
    secretCode: string;
    players: any[];
  } | null> {
    try {
      if (!authService.getCurrentUser()) {
        try {
          await authService.initializeAuth();
        } catch (e) {
          console.warn('[improvedArenaService] Impossible d\'initialiser auth avant join:', e);
        }
      }

      const { data: arenaData, error: fetchError } = await supabase
        .from(ARENA_TABLE)
        .select('*')
        .eq('id', arenaId)
        .maybeSingle();

      if (fetchError || !arenaData) {
        console.warn(`Arena ${arenaId} non trouvée`);
        return null;
      }

      if (arenaData.status !== 'waiting') {
        console.warn(`Arena ${arenaId} n'est pas en attente`);
        return null;
      }

      if (arenaData.expires_at_ms < Date.now()) {
        console.warn(`Arena ${arenaId} a expiré`);
        return null;
      }

      const joiningEffective = await authService.getEffectiveUser();
      const joiningUid = joiningEffective?.uid || playerId;
      const players: any[] = arenaData.players || [];

      const alreadyJoined = players.some((p: any) => p.id === joiningUid);
      if (alreadyJoined) {
        return { secretCode: arenaData.secret_code, players };
      }

      const updatedPlayers = [...players, { id: joiningUid, name: playerName, joinedAt: Date.now() }];
      const newStatus = updatedPlayers.length >= 2 ? 'active' : 'waiting';

      const { error: updateError } = await supabase
        .from(ARENA_TABLE)
        .update({ players: updatedPlayers, status: newStatus, last_updated_ms: Date.now() })
        .eq('id', arenaId);

      if (updateError) throw updateError;

      console.log(`Joueur ${playerName} a rejoint l'arena ${arenaId}`);
      return { secretCode: arenaData.secret_code, players: updatedPlayers };
    } catch (error) {
      console.error('Erreur rejoindre arena:', error);
      throw error;
    }
  },

  /**
   * Écouter les changements d'une arena en temps réel (Supabase Realtime)
   */
  subscribeToArena(arenaId: string, callback: (data: any) => void): () => void {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase.from(ARENA_TABLE).select('*').eq('id', arenaId).maybeSingle();
      if (!error && data && !cancelled) {
        callback(mapArenaRow(data));
      }
    };

    load();

    const channel = supabase
      .channel(`arena_${arenaId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: ARENA_TABLE, filter: `id=eq.${arenaId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },

  /**
   * Obtenir l'arena par son ID
   */
  async getArena(arenaId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase.from(ARENA_TABLE).select('*').eq('id', arenaId).maybeSingle();
      if (error || !data) return null;
      return mapArenaRow(data);
    } catch (error) {
      console.error('Erreur getArena:', error);
      return null;
    }
  },

  /**
   * Mettre à jour la difficulté de l'arena
   */
  async updateDifficulty(arenaId: string, difficulty: string): Promise<void> {
    try {
      await supabase
        .from(ARENA_TABLE)
        .update({ difficulty, game_started_at: Date.now(), status: 'playing' })
        .eq('id', arenaId);
    } catch (error) {
      console.error('Erreur updateDifficulty:', error);
    }
  },

  /**
   * Marquer une arena comme démarrée (sans définir la difficulté)
   */
  async startArena(arenaId: string): Promise<void> {
    try {
      await supabase
        .from(ARENA_TABLE)
        .update({ status: 'playing', game_started_at: Date.now(), last_updated_ms: Date.now() })
        .eq('id', arenaId);
    } catch (error) {
      console.error('Erreur startArena:', error);
    }
  },

  /**
   * Ajouter une tentative à l'arena (via RPC atomique pour éviter les
   * races entre deux joueurs qui soumettent en même temps)
   */
  async addAttempt(arenaId: string, playerId: string, attempt: any): Promise<void> {
    try {
      const { error } = await supabase.rpc('add_arena_attempt', {
        p_arena_id: arenaId,
        p_attempt: { ...attempt, playerId, timestamp: Date.now() },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erreur addAttempt:', error);
    }
  },

  /**
   * Marquer l'arena comme terminée
   */
  async completeArena(arenaId: string, winnerId: string): Promise<void> {
    try {
      await supabase
        .from(ARENA_TABLE)
        .update({ status: 'completed', winner_id: winnerId, completed_at: Date.now() })
        .eq('id', arenaId);
    } catch (error) {
      console.error('Erreur completeArena:', error);
    }
  },

  /**
   * Quitter une arena en cours (bouton "Annuler" en salle d'attente,
   * ou abandon pendant la partie). Corrige le bug où l'adversaire
   * restait bloqué indéfiniment sans savoir que l'autre joueur est parti :
   *  - En salle d'attente : retire simplement le joueur de la liste,
   *    l'adversaire voit la mise à jour en temps réel.
   *  - En pleine partie (pas encore de gagnant) : attribue la victoire
   *    à l'adversaire restant (abandoned_by = celui qui part), pour que
   *    son client soit notifié au lieu d'attendre indéfiniment.
   */
  async leaveArena(arenaId: string, playerId: string): Promise<void> {
    try {
      const { data: arenaRow, error: fetchError } = await supabase
        .from(ARENA_TABLE)
        .select('*')
        .eq('id', arenaId)
        .maybeSingle();

      if (fetchError || !arenaRow) return;

      if (arenaRow.status === 'waiting') {
        const remainingPlayers = (arenaRow.players || []).filter((p: any) => p.id !== playerId);
        await supabase
          .from(ARENA_TABLE)
          .update({ players: remainingPlayers, last_updated_ms: Date.now() })
          .eq('id', arenaId);
      } else if (arenaRow.status === 'playing' && !arenaRow.winner_id) {
        const opponent = (arenaRow.players || []).find((p: any) => p.id !== playerId);
        if (opponent) {
          await supabase
            .from(ARENA_TABLE)
            .update({
              status: 'completed',
              winner_id: opponent.id,
              abandoned_by: playerId,
              completed_at: Date.now(),
            })
            .eq('id', arenaId);
        }
      }
    } catch (error) {
      console.error('Erreur leaveArena:', error);
    }
  },

  /**
   * "Battement de coeur" envoyé périodiquement par chaque joueur pendant
   * qu'il est dans l'arène (salle d'attente ou partie en cours). Permet à
   * l'autre client de détecter une déconnexion "sale" (app tuée, crash,
   * perte réseau) et pas seulement un clic volontaire sur "Quitter" —
   * corrige le cas où l'adversaire disparaît sans prévenir le serveur et
   * laisse l'autre joueur bloqué indéfiniment.
   */
  async heartbeat(arenaId: string, playerId: string): Promise<void> {
    try {
      const { data: arenaRow, error: fetchError } = await supabase
        .from(ARENA_TABLE)
        .select('players')
        .eq('id', arenaId)
        .maybeSingle();

      if (fetchError || !arenaRow) return;

      const players = (arenaRow.players || []).map((p: any) =>
        p.id === playerId ? { ...p, lastSeen: Date.now() } : p
      );

      await supabase
        .from(ARENA_TABLE)
        .update({ players })
        .eq('id', arenaId);
    } catch (error) {
      // Non bloquant : un heartbeat raté ne doit jamais interrompre la partie.
      console.warn('Erreur heartbeat arena:', error);
    }
  },

  /**
   * Appelé côté client quand on détecte que l'adversaire n'a pas envoyé
   * de heartbeat depuis trop longtemps (voir ARENA_TIMEOUT_MS côté
   * useGame). Attribue la victoire au joueur restant, exactement comme
   * un abandon volontaire (leaveArena), mais déclenché par l'autre client
   * puisque celui qui a disparu ne peut plus, par définition, le faire
   * lui-même.
   */
  async claimOpponentTimeout(arenaId: string, activePlayerId: string, opponentId: string): Promise<void> {
    try {
      const { data: arenaRow, error: fetchError } = await supabase
        .from(ARENA_TABLE)
        .select('status, winner_id')
        .eq('id', arenaId)
        .maybeSingle();

      if (fetchError || !arenaRow) return;
      // Idempotent : si la partie est déjà terminée (l'autre client a pu
      // gagner normalement entre-temps), on ne touche à rien.
      if (arenaRow.status !== 'playing' || arenaRow.winner_id) return;

      await supabase
        .from(ARENA_TABLE)
        .update({
          status: 'completed',
          winner_id: activePlayerId,
          abandoned_by: opponentId,
          completed_at: Date.now(),
        })
        .eq('id', arenaId);
    } catch (error) {
      console.warn('Erreur claimOpponentTimeout:', error);
    }
  },

  /**
   * Supprimer une arena expirée
   */
  async deleteArena(arenaId: string): Promise<void> {
    try {
      await supabase.from(ARENA_TABLE).delete().eq('id', arenaId);
    } catch (error) {
      console.error('Erreur deleteArena:', error);
    }
  },

  /**
   * Générer un code secret aléatoire
   */
  generateSecretCode(): string {
    const digits: number[] = [];
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      digits.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }

    return digits.join('');
  },

  /**
   * Nettoyer les arenas expirées
   */
  async cleanupExpiredArenas(): Promise<void> {
    try {
      const now = Date.now();
      const { error, count } = await supabase
        .from(ARENA_TABLE)
        .delete({ count: 'exact' })
        .eq('status', 'waiting')
        .lt('expires_at_ms', now);

      if (error) throw error;
      console.log(`${count ?? 0} arenas expirées supprimées`);
    } catch (error) {
      console.error('Erreur cleanup arenas:', error);
    }
  },
};
