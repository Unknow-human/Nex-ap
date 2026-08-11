import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Send } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

interface GameChatProps {
  playerId: string;
  playerName: string;
  opponentName?: string;
  onSendMessage?: (message: string) => void;
  messages?: ChatMessage[];
}

export function GameChat({
  playerId,
  playerName,
  opponentName = 'Adversaire',
  onSendMessage,
  messages = [],
}: GameChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Sur Android (edge-to-edge par défaut), `SafeAreaView` de react-native ne fait
  // rien : sans cette marge le bouton se retrouve sous la barre de navigation
  // système / la zone de geste, donc invisible ou impossible à toucher.
  const bottomOffset = 12 + insets.bottom;
  // Le panneau ne doit jamais dépasser de l'écran sur téléphone étroit
  // (24 = marge de 12px de chaque côté, cf. `container` positionné à right:12).
  const panelWidth = Math.min(280, screenWidth - 24);
  const panelMaxHeight = Math.min(280, screenHeight * 0.5);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const flatListRef = useRef<FlatList>(null);
  
  // Créer le PanResponder pour le drag
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: panAnim.x, dy: panAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        // Garder la position après le drag
        panAnim.flattenOffset();
      },
      onPanResponderGrant: () => {
        // Préparer pour le drag
        panAnim.setOffset({
          x: (panAnim.x as any)._value || 0,
          y: (panAnim.y as any)._value || 0,
        });
      },
    })
  ).current;

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      // Vider IMMÉDIATEMENT
      setInputValue('');
      // Puis envoyer
      onSendMessage?.(inputValue.trim());
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // On fait confiance à isOwn calculé en amont via playerId (unique),
    // pas via le pseudo qui peut être partagé par deux joueurs.
    const isOwn = item.isOwn;
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {!isOwn && <Text style={styles.senderName}>{item.sender}</Text>}
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const expandedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, panelMaxHeight],
  });

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      {/* Bouton Toggle - Draggable */}
      <Animated.View
        style={[
          styles.toggleButton,
          isExpanded && styles.toggleButtonActive,
          {
            transform: [
              { translateX: panAnim.x },
              { translateY: panAnim.y }
            ]
          }
        ]}
        {...panResponderRef.panHandlers}
      >
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.7}
        >
          <MessageCircle size={22} color="#6366f1" />
          <Text style={styles.toggleText}>
            {messages.length > 0 ? messages.length : 'Chat'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Expanded - Fixed */}
      <Animated.View style={[styles.chatPanel, { width: panelWidth, height: expandedHeight, opacity: heightAnim, bottom: 58 }]}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={13} color="#6366f1" />
            <Text style={styles.chatTitle}>CHAT PUBLIC</Text>
          </View>
          <Text style={styles.opponentName}>Communiquez avec tous</Text>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted={false}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            placeholderTextColor="#8892b0"
            value={inputValue}
            onChangeText={setInputValue}
            maxLength={100}
            multiline={false}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputValue.trim()}
            activeOpacity={0.7}
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // `bottom` est recalculé dynamiquement (12 + inset bas de sécurité) et
    // passé en style inline — voir bottomOffset. Ne pas laisser une valeur
    // fixe ici, sinon on retombe sous la barre système Android.
    right: 12,
    zIndex: 100,
    // Le conteneur n'a pas de taille propre : elle vient du bouton (flux
    // normal ci-dessous), pas d'un second `position: absolute` imbriqué
    // qui l'effondrait à 0x0 et déplaçait tout le reste.
    alignItems: 'flex-end',
  },
  toggleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#5b6ef5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 100,
  },
  toggleButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f7f9fc',
  },
  toggleIcon: {
    fontSize: 24,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 2,
  },
  chatPanel: {
    position: 'absolute',
    bottom: 58,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  chatHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chatTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.8,
  },
  opponentName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 3,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: '80%',
  },
  ownBubble: {
    backgroundColor: '#6366f1',
  },
  otherBubble: {
    backgroundColor: '#f5f7fa',
  },
  senderName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 16,
  },
  ownText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  otherText: {
    color: '#1a202c',
    fontWeight: '500',
  },
  inputArea: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1a202c',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  sendIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
});
