import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CornerUpLeft, User } from 'lucide-react-native';
import { ChatMessage as ChatMessageType } from '../types';
import { AudioMessage } from './AudioMessage';
import { decodeReply } from '../utils/chatReply';

interface ChatMessageProps {
  message: ChatMessageType;
  audioUri?: string;
}

export function ChatMessage({ message, audioUri }: ChatMessageProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isCombatLog = message.type === 'combat-log';

  // Décoder une éventuelle référence de reply encodée dans le texte
  // (voir src/utils/chatReply.ts). `body` est le contenu réel du message,
  // sans le préfixe invisible.
  const { replyTo, body } = decodeReply(message.message);
  const isAudioMessage = body.includes('[Audio]');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getFormattedTime = () => {
    const time = message.timestamp ? new Date(message.timestamp) : new Date();
    return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Parse audio message format: "[Audio] 🎙️ duration|key"
  const parseAudioMessage = (msg: string) => {
    const match = msg.match(/\[Audio\].*?(\d+)s\|([^\s]+)/);
    if (match) {
      return {
        duration: parseInt(match[1]),
        key: match[2],
      };
    }
    return null;
  };

  const audioData = isAudioMessage ? parseAudioMessage(body) : null;

  return (
    <Animated.View
      style={[
        styles.container,
        isCombatLog && styles.combatLogContainer,
        isAudioMessage && styles.audioMessageContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.agentNameRow}>
          <User size={11} color="#5b6ef5" />
          <Text style={styles.agentName} numberOfLines={1}>{message.agentName}</Text>
        </View>
        <Text style={styles.timestamp}>{getFormattedTime()}</Text>
      </View>

      {replyTo && (
        <View style={styles.replyQuote}>
          <View style={styles.replyQuoteBar} />
          <View style={styles.replyQuoteTextBlock}>
            <View style={styles.replyQuoteAuthorRow}>
              <CornerUpLeft size={11} color="#5b6ef5" />
              <Text style={styles.replyQuoteAuthor} numberOfLines={1}>
                {replyTo.agentName}
              </Text>
            </View>
            <Text style={styles.replyQuoteText} numberOfLines={2}>
              {replyTo.message}
            </Text>
          </View>
        </View>
      )}

      {isAudioMessage && audioData ? (
        <AudioMessage 
          message={body} 
          audioUri={audioUri}
          duration={audioData.duration}
        />
      ) : (
        <Text style={[styles.messageText, isCombatLog && styles.combatLogText]}>
          {body}
        </Text>
      )}
      {message.attempt && (
        <View style={styles.attemptInfo}>
          <View style={styles.attemptCode}>
            <Text style={styles.codeText}>{message.attempt.code}</Text>
          </View>
          <View style={[styles.scoreBadge, styles.bpBadge]}>
            <Text style={styles.scoreText}>{message.attempt.bp} BP</Text>
          </View>
          <View style={[styles.scoreBadge, styles.mpBadge]}>
            <Text style={styles.scoreText}>{message.attempt.mp} MP</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d3748',
    borderLeftWidth: 3,
    borderLeftColor: '#5b6ef5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#5b6ef5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  audioMessageContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderLeftColor: '#6366f1',
  },
  combatLogContainer: {
    borderLeftColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexShrink: 1,
  },
  agentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b6ef5',
    letterSpacing: 0.5,
    flex: 1,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 10,
    color: '#a0aec0',
    fontWeight: '600',
    flexShrink: 0,
  },
  messageText: {
    fontSize: 13,
    color: '#f8f9fa',
    lineHeight: 18,
  },
  replyQuote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    gap: 8,
  },
  replyQuoteBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#5b6ef5',
  },
  replyQuoteTextBlock: {
    flex: 1,
  },
  replyQuoteAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  replyQuoteAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5b6ef5',
    marginBottom: 2,
  },
  replyQuoteText: {
    fontSize: 12,
    color: '#a0aec0',
  },
  combatLogText: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  attemptInfo: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  attemptCode: {
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: '#5b6ef5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5b6ef5',
    letterSpacing: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: '#5b6ef5',
  },
  bpBadge: {},
  mpBadge: {
    borderColor: '#8b5cf6',
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5b6ef5',
  },
});
