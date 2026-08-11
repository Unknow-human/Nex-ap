import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types';

const CHAT_MESSAGES_KEY = '@nexus_chat_messages';
const CHAT_SYNC_KEY = '@nexus_chat_last_sync';

/**
 * Service de persistence des messages chat
 * Sauvegarde en local et synchronise avec Firebase
 */
export const chatPersistenceService = {
  /**
   * Charger les messages sauvegardés localement
   */
  async loadCachedMessages(): Promise<ChatMessage[]> {
    try {
      const cached = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    } catch (error) {
      console.error('Erreur chargement messages en cache:', error);
      return [];
    }
  },

  /**
   * Sauvegarder les messages en local
   */
  async saveCachedMessages(messages: ChatMessage[]): Promise<void> {
    try {
      // Garder seulement les 200 derniers messages pour éviter de saturer le storage
      const messagesToSave = messages.slice(-200);
      await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messagesToSave));
      await AsyncStorage.setItem(CHAT_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Erreur sauvegarde messages:', error);
    }
  },

  /**
   * Ajouter un message à la cache
   */
  async addMessageToCache(message: ChatMessage): Promise<void> {
    try {
      const messages = await this.loadCachedMessages();
      messages.push(message);
      await this.saveCachedMessages(messages);
    } catch (error) {
      console.error('Erreur ajout message en cache:', error);
    }
  },

  /**
   * Vider le cache (logout)
   */
  async clearCachedMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHAT_MESSAGES_KEY);
      await AsyncStorage.removeItem(CHAT_SYNC_KEY);
    } catch (error) {
      console.error('Erreur vidage cache:', error);
    }
  },

  /**
   * Obtenir le timestamp de la dernière synchro
   */
  async getLastSyncTime(): Promise<number> {
    try {
      const lastSync = await AsyncStorage.getItem(CHAT_SYNC_KEY);
      return lastSync ? parseInt(lastSync) : 0;
    } catch (error) {
      return 0;
    }
  },
};
