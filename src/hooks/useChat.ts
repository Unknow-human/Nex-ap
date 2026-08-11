import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { chatPersistenceService } from '../services/chatPersistence';
import { chatService } from '../services/supabase';
import { notificationService } from '../services/notifications';
import { ChatMessage } from '../types';

export function useChat(agentName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const appStateRef = useRef<string>(AppState.currentState);

  useEffect(() => {
    loadCachedMessages();
    initializeNotifications();

    // Suivre l'état de l'app pour ne notifier que lorsque l'app est en arrière-plan
    const subscription = AppState.addEventListener('change', (nextState: string) => {
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadCachedMessages = async () => {
    try {
      const cached = await chatPersistenceService.loadCachedMessages();
      if (cached.length > 0) {
        setMessages(cached);
      }
      // Initialiser le compteur pour éviter d'envoyer des notifications rétroactives
      lastMessageCountRef.current = cached.length;
    } catch (err) {
      console.error('Erreur chargement cache:', err);
    }
  };

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
    } catch (err) {
      console.error('Erreur initialisation notifications:', err);
    }
  };

  useEffect(() => {
    if (!agentName) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      unsubscribeRef.current = chatService.subscribeToChat((newMessages) => {
        setMessages(newMessages);
        
        // Persister les messages
        chatPersistenceService.saveCachedMessages(newMessages).catch(err => 
          console.error('Erreur sauvegarde cache:', err)
        );
        
        // Envoyer notification si nouveau message (seulement si l'app n'est pas active)
        if (newMessages.length > lastMessageCountRef.current) {
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage.agentName !== agentName) {
            if (appStateRef.current !== 'active') {
              notificationService.notifyNewChatMessage(
                latestMessage.agentName || 'Anonyme',
                latestMessage.message || ''
              ).catch(err => console.error('Erreur notification:', err));
            }
          }
        }
        
        lastMessageCountRef.current = newMessages.length;
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Erreur abonnement chat:', err);
      setError('Erreur de connexion au chat');
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [agentName]);

  const sendMessage = async (message: string, audioUrl?: string) => {
    if ((!message || !message.trim()) || !agentName) return;
    try {
      setError(null);
      await chatService.sendMessage(agentName, message, audioUrl);
    } catch (err) {
      console.error('Erreur envoi:', err);
      setError('Erreur lors de l\'envoi');
    }
  };

  const sendCombatLog = async (attempt: { code: string; bp: number; mp: number }) => {
    try {
      setError(null);
      await chatService.sendCombatLog(agentName, attempt);
    } catch (err) {
      console.error('Erreur log combat:', err);
      setError('Erreur lors de l\'envoi du combat');
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendCombatLog,
  };
}
