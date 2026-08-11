import * as Notifications from 'expo-notifications';

/**
 * Service de notifications push
 * Gère les notifications pour les messages du chat global
 * 
 * ⚠️ Note: expo-notifications est optionnel. Si non installé, les notifications sont silencieuses.
 */
export const notificationService = {
  /**
   * Initialiser le service de notifications
   */
  async initialize(): Promise<void> {
    try {
      if (!Notifications) {
        console.warn('expo-notifications non disponible');
        return;
      }

      // Demander les permissions
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Permissions de notifications non accordées');
        return;
      }

      // Configurer le comportement par défaut
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (error) {
      console.warn('Erreur initialisation notifications (non critique):', error);
      // Ne pas jeter d'erreur - les notifications ne sont pas critiques
    }
  },

  /**
   * Envoyer une notification pour un nouveau message du chat global
   */
  async notifyNewChatMessage(senderName: string, messagePreview: string): Promise<void> {
    try {
      if (!Notifications) return;

      // Essayer d'incrémenter le badge si l'API est disponible
      try {
        if ((Notifications as any).getBadgeCountAsync && (Notifications as any).setBadgeCountAsync) {
          // @ts-ignore
          const current = await (Notifications as any).getBadgeCountAsync();
          // @ts-ignore
          await (Notifications as any).setBadgeCountAsync((current || 0) + 1);
        }
      } catch (err) {
        console.warn('Badge API non disponible:', err);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💬 Nouveau message',
          body: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
          sound: 'default',
          data: {
            type: 'chat-message',
            sender: senderName,
          },
        },
        trigger: null, // Immédiat
      });
    } catch (error) {
      console.warn('Erreur envoi notification:', error);
    }
  },

  /**
   * Envoyer une notification quand un adversaire rejoint une arène
   */
  async notifyPlayerJoined(playerName: string, arenaId: string): Promise<void> {
    try {
      if (!Notifications) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎮 Adversaire trouvé!',
          body: `${playerName} a rejoint l'arène ${arenaId}`,
          sound: 'default',
          badge: 1,
          data: {
            type: 'arena-player-joined',
            arenaId,
            playerName,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Erreur notification arène:', error);
    }
  },

  /**
   * Envoyer une notification quand le matchmaking trouve un adversaire
   */
  async notifyMatchFound(opponentName: string): Promise<void> {
    try {
      if (!Notifications) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚡ Match trouvé!',
          body: `Vous allez affronter ${opponentName}`,
          sound: 'default',
          badge: 1,
          data: {
            type: 'match-found',
            opponent: opponentName,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Erreur notification match:', error);
    }
  },

  /**
   * Effacer toutes les notifications locales et remettre le badge à zéro
   */
  async clearAll(): Promise<void> {
    try {
      if (!Notifications) return;
      if ((Notifications as any).dismissAllNotificationsAsync) {
        // @ts-ignore
        await (Notifications as any).dismissAllNotificationsAsync();
      }
      if ((Notifications as any).setBadgeCountAsync) {
        // @ts-ignore: expo-notifications types
        await (Notifications as any).setBadgeCountAsync(0);
      }
    } catch (error) {
      console.warn('Erreur clear notifications:', error);
    }
  },
};
