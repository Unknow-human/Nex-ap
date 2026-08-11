import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_KEY = '@nexus_arena_background';

export type BackgroundConfig =
  | { type: 'default' }
  | { type: 'color'; value: string }
  | { type: 'photo'; uri: string };

const DEFAULT_BACKGROUND: BackgroundConfig = { type: 'default' };

/**
 * Persistance locale (par appareil) du choix d'arrière-plan de
 * l'utilisateur — couleur unie ou photo depuis la galerie. Appliqué
 * globalement (Accueil, Chat, Jeu) via le contexte `useBackground`.
 *
 * Stockage local plutôt que Supabase : le fond d'écran est une
 * préférence d'affichage, pas une donnée de gameplay à synchroniser
 * entre appareils — AsyncStorage suffit et fonctionne hors-ligne.
 */
export const backgroundService = {
  async getBackground(): Promise<BackgroundConfig> {
    try {
      const raw = await AsyncStorage.getItem(BACKGROUND_KEY);
      if (!raw) return DEFAULT_BACKGROUND;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed as BackgroundConfig;
      }
      return DEFAULT_BACKGROUND;
    } catch (error) {
      console.warn('Erreur lecture arrière-plan:', error);
      return DEFAULT_BACKGROUND;
    }
  },

  async setBackground(config: BackgroundConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKGROUND_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Erreur sauvegarde arrière-plan:', error);
      throw error;
    }
  },

  async resetBackground(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BACKGROUND_KEY);
    } catch (error) {
      console.warn('Erreur reset arrière-plan:', error);
    }
  },
};

/** Palette de couleurs proposées dans le sélecteur (thème cyberpunk cohérent). */
export const BACKGROUND_COLOR_PRESETS: string[] = [
  '#0a0a1a', // défaut (bleu nuit)
  '#05050c', // noir profond
  '#1a1a2e', // bleu-violet
  '#16213e', // bleu marine
  '#0f3d29', // vert sombre
  '#3d0f1c', // rouge sombre
  '#2c1a4d', // violet profond
  '#1a2e2e', // sarcelle sombre
  '#3d2c0a', // ambre sombre
  '#0a1a2e', // bleu acier
];
