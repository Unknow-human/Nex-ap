import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

interface UpdateConfig {
  checkInterval: number; // ms
  forceUpdateUrl?: string;
}

class UpdateService {
  private isChecking = false;
  private lastCheckTime = 0;
  private config: UpdateConfig = {
    checkInterval: 60 * 60 * 1000, // Check toutes les heures
  };

  /**
   * Initialiser le service de mise à jour
   */
  async initialize() {
    try {
      // Vérifier les mises à jour disponibles au démarrage
      await this.checkForUpdates();
      
      // Mettre en place un intervalle de vérification
      this.setupPeriodicCheck();
    } catch (error) {
      if (__DEV__) {
        console.warn('UpdateService init error:', error);
      }
    }
  }

  /**
   * Vérifier les mises à jour
   */
  private async checkForUpdates() {
    if (this.isChecking) return;
    // En dev, ou si les mises à jour Expo ne sont pas activées, on ne fait rien
    if (__DEV__ || !Updates.isEnabled) return;

    this.isChecking = true;
    const now = Date.now();

    try {
      // Vérifier s'il ne s'est pas passé trop peu de temps depuis la dernière vérification
      if (now - this.lastCheckTime < this.config.checkInterval) {
        this.isChecking = false;
        return;
      }

      this.lastCheckTime = now;

      // Vérifier la disponibilité d'une mise à jour
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await this.handleUpdateAvailable();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Update check error:', error);
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Gérer la mise à jour disponible (demande de confirmation)
   */
  private async handleUpdateAvailable() {
    try {
      Alert.alert(
        '🆕 Mise à jour disponible',
        'Une nouvelle version est prête. Voulez-vous l’installer maintenant ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Mettre à jour', onPress: () => this.installUpdate() },
        ],
        { cancelable: true }
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('[UpdateService] Erreur affichage mise à jour:', error);
      }
    }
  }

  /**
   * Installer la mise à jour (version ancienne avec dialog - gardée pour référence)
   */
  private async installUpdate() {
    try {
      Alert.alert(
        '⏳ Installation en cours',
        'Nexus Arena se met à jour. L\'application redémarrera automatiquement.',
        [{ text: 'OK' }],
        { cancelable: false }
      );

      // Télécharger et installer la mise à jour
      await Updates.fetchUpdateAsync();
      
      // Redémarrer l'app
      await Updates.reloadAsync();
    } catch (error) {
      if (__DEV__) {
        console.error('Install update error:', error);
      }
      Alert.alert(
        '⚠️ Erreur',
        'Impossible de mettre à jour automatiquement. Veuillez réinstaller l\'application.',
        [
          {
            text: 'OK',
          },
        ]
      );
    }
  }

  /**
   * Mettre en place une vérification périodique
   */
  private setupPeriodicCheck() {
    // Vérifier toutes les heures (utilisateur peut quitter l'app et revenir)
    setInterval(async () => {
      await this.checkForUpdates();
    }, this.config.checkInterval);
  }

  /**
   * Vérifier manuellement les mises à jour (bouton depuis l'app)
   */
  async checkManually() {
    try {
      this.lastCheckTime = 0; // Reset le timer
      await this.checkForUpdates();
    } catch (error) {
      if (__DEV__) {
        console.error('Manual update check error:', error);
      }
      Alert.alert('⚠️', 'Erreur lors de la vérification des mises à jour');
    }
  }

  /**
   * Configurer les paramètres du service
   */
  configure(config: Partial<UpdateConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export const updateService = new UpdateService();
