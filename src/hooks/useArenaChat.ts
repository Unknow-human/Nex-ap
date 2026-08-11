import { useState, useEffect, useRef } from 'react';
import { arenaChatService } from '../services/supabase';

interface ArenaChatMessage {
  id: string;
  arenaId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export function useArenaChat(arenaId: string, playerId: string, playerName: string) {
  const [messages, setMessages] = useState<ArenaChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!arenaId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      unsubscribeRef.current = arenaChatService.subscribeToArenaChat(arenaId, (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Erreur abonnement arena chat:', err);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [arenaId]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || !arenaId || !playerId) return;
    try {
      await arenaChatService.sendArenaMessage(arenaId, playerId, playerName, message);
    } catch (err) {
      console.error('Erreur envoi message arena:', err);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
