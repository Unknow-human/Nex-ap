import { supabase } from './supabaseClient';

export interface PlayerProfile {
  uid?: string;
  email: string;
  displayName: string;
  createdAt?: string | Date | any;
  updatedAt?: string | Date | any;
  agentName?: string;
}

function mapRow(row: any): PlayerProfile {
  return {
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    agentName: row.agent_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Service pour gérer les profils joueurs (table `profiles`)
 */
export const playerService = {
  /**
   * Créer ou mettre à jour le profil d'un joueur
   */
  async createOrUpdatePlayerProfile(uid: string, data: Partial<PlayerProfile>): Promise<void> {
    try {
      console.log('📝 [playerService] Création/mise à jour profil:', uid);

      const payload: any = { uid, updated_at: new Date().toISOString() };
      if (data.email !== undefined) payload.email = data.email;
      if (data.displayName !== undefined) payload.display_name = data.displayName;
      if (data.agentName !== undefined) payload.agent_name = data.agentName;

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'uid' });
      if (error) throw error;

      console.log('✅ [playerService] Profil enregistré:', uid);
    } catch (error: any) {
      console.error('❌ [playerService] Erreur:', error.message);
      throw error;
    }
  },

  /**
   * Récupérer le profil d'un joueur
   */
  async getPlayerProfile(uid: string): Promise<PlayerProfile | null> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('uid', uid).maybeSingle();
      if (error || !data) return null;
      return mapRow(data);
    } catch (error: any) {
      console.error('❌ [playerService] Erreur récupération profil:', error.message);
      throw error;
    }
  },

  /**
   * Mettre à jour le nom d'agent du joueur
   */
  async updateAgentName(uid: string, agentName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ agent_name: agentName.trim(), updated_at: new Date().toISOString() })
        .eq('uid', uid);
      if (error) throw error;
      console.log('✅ [playerService] Nom d\'agent mis à jour:', agentName);
    } catch (error: any) {
      console.error('❌ [playerService] Erreur mise à jour nom:', error.message);
      throw error;
    }
  },
};
