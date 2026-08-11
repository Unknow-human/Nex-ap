import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, CornerUpLeft, Mic, MessageCircle, Palette, Send, Square, X } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { BackgroundPickerModal } from '../components/BackgroundPickerModal';
import { ChatMessage } from '../components/ChatMessage';
import { ModernButton } from '../components/ModernButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { useAudioCache } from '../hooks/useAudioCache';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/supabase';
import { notificationService } from '../services/notifications';
import { encodeReply, decodeReply } from '../utils/chatReply';
import { THEME } from '../theme';

const AGENT_NAME_KEY = '@nexus_arena_agent_name';

export function ChatScreen() {
  const { width } = useWindowDimensions();
  const [agentName, setAgentName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [showSetName, setShowSetName] = useState(false);
  const [tempName, setTempName] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { getAudioUri, setAudioUri } = useAudioCache();
  const [replyTo, setReplyTo] = useState<{ id: string; agentName: string; message: string } | null>(null);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const { messages, isLoading, error, sendMessage } = useChat(agentName);

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const isSmallScreen = width < 375;
  const isPhone = width < 600;
  const isTablet = width >= 600;

  useEffect(() => {
    loadAgentName();
  }, []);

  // Clear local notifications when opening the chat screen (user is viewing messages)
  useEffect(() => {
    (async () => {
      try {
        await notificationService.clearAll();
      } catch (err) {
        console.warn('Erreur clear notifications on ChatScreen mount:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadAgentName = async () => {
    try {
      const saved = await AsyncStorage.getItem(AGENT_NAME_KEY);
      if (saved) {
        setAgentName(saved);
      } else {
        setShowSetName(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setShowSetName(true);
    }
  };

  const handleSetName = async () => {
    if (tempName.trim()) {
      setAgentName(tempName.trim());
      await AsyncStorage.setItem(AGENT_NAME_KEY, tempName.trim());
      setShowSetName(false);
      setTempName('');
    }
  };

  const handleSend = async () => {
    if (message.trim() && agentName) {
      try {
        // Encoder la référence de reply (invisible, parsée à l'affichage)
        // au lieu de la concaténer en texte brut dans le message — c'était
        // la cause de l'affichage "bizarre" des réponses.
        const messageToSend = encodeReply(message.trim(), replyTo);

        // Vider le champ IMMÉDIATEMENT avant d'envoyer
        setMessage('');
        setReplyTo(null);
        
        // Envoyer le message
        await sendMessage(messageToSend);
      } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
      }
    }
  };

  const startRecording = async () => {
    try {
      // Demander la permission
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert('Permission refusée pour accéder au microphone');
        return;
      }

      // Configurer et démarrer l'enregistrement
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Mettre à jour la durée chaque 100ms
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      return () => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      alert('Erreur lors du démarrage de l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      // Capturer la durée avant de reset
      const duration = Math.round(recordingDuration);

      // Arrêter le timer de durée
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);

      if (uri && agentName) {
        // Stocker localement l'URI pour playback immédiat
        const messageKey = `audio-${Date.now()}`;
        setAudioUri(messageKey, uri);

        // Essayer d'uploader l'audio vers Firebase Storage
        let downloadUrl: string | null = null;
        try {
          const remotePath = `chat-audio/${messageKey}.m4a`;
          downloadUrl = await chatService.uploadFile(uri, remotePath);
        } catch (err) {
          console.warn('Erreur upload audio:', err);
        }

        // Si upload OK, associer la clé au remote URL pour playback
        if (downloadUrl) {
          setAudioUri(messageKey, downloadUrl);
        }

        // Envoyer le message vocal avec référence à la clé et (optionnellement) l'URL
        await sendMessage(`[Audio] 🎙️ ${duration}s|${messageKey}`, downloadUrl || undefined);
        setMessage('');
      }
      
      setRecordingDuration(0);
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
    }
  };

  if (showSetName && !agentName) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Chat Global" icon={MessageCircle} />
        <View style={styles.setNameContainer}>
          <Text style={styles.setNameTitle}>Votre Nom</Text>
          <TextInput
            style={styles.setNameInput}
            value={tempName}
            onChangeText={setTempName}
            placeholder="Entrez votre nom..."
            placeholderTextColor={THEME.colors.textMuted}
            maxLength={20}
          />
          <ModernButton
            text="Confirmer"
            variant="secondary"
            size="md"
            disabled={!tempName.trim()}
            style={{ width: '100%' }}
            onPress={handleSetName}
          />
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.colors.bgPrimary, false);
      StatusBar.setBarStyle('dark-content');
      StatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <ScreenBackground overlayOpacity={0.6}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <AppHeader
          title="Chat Global"
          subtitle={agentName}
          icon={MessageCircle}
          connectedAs={agentName}
          actionIcon={Palette}
          onPressAction={() => setShowBackgroundPicker(true)}
        />
        <BackgroundPickerModal visible={showBackgroundPicker} onClose={() => setShowBackgroundPicker(false)} />
      <Animated.View
        style={[
          styles.keyboardView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            flex: 1,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, paddingTop: 12 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={isSmallScreen ? 120 : isPhone ? 140 : 160}
        >
        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorRow}>
              <AlertTriangle size={13} color={THEME.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement des messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun message</Text>
            <Text style={styles.emptySubtext}>Soyez le premier à écrire!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => {
              // Extract audio key from message: "[Audio] 🎙️ duration|key"
              const { body: itemBody } = decodeReply(item.message);
              const audioKeyMatch = itemBody.match(/\|([^\s]+)$/);
              const audioKey = audioKeyMatch ? audioKeyMatch[1] : null;
              // Prefer local cached URI, sinon utiliser audioUri envoyé depuis le serveur
              const audioUri = audioKey ? (getAudioUri(audioKey) || item.audioUri) : item.audioUri;
              
              return (
                <View style={styles.messageWrapper}>
                  <ChatMessage 
                    message={item}
                    audioUri={audioUri}
                  />
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => setReplyTo({
                      id: item.id,
                      agentName: item.agentName,
                      message: itemBody,
                    })}
                  >
                    <View style={styles.replyButtonRow}>
                      <CornerUpLeft size={11} color={THEME.colors.primary} />
                      <Text style={styles.replyButtonText}>Répondre</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {replyTo && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewLabel}>Répondre à {replyTo.agentName}</Text>
              <Text style={styles.replyPreviewMessage} numberOfLines={1}>
                {replyTo.message.substring(0, 50)}...
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTo(null)}
              style={styles.replyPreviewCloseButton}
            >
              <X size={14} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingIndicator} />
              <Text style={styles.recordingText}>
                Enregistrement... {recordingDuration.toFixed(1)}s
              </Text>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <View style={styles.stopButtonRow}>
                  <Square size={12} color={THEME.colors.white} fill={THEME.colors.white} />
                  <Text style={styles.stopButtonText}>Arrêter</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Votre message..."
                placeholderTextColor={THEME.colors.textSecondary}
                multiline
                maxLength={200}
                onFocus={() => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={startRecording}
              >
                <Mic size={18} color={THEME.colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!message.trim()}
              >
                <Send size={16} color={THEME.colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
    flexDirection: 'column',
  },
  setNameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  setNameTitle: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    fontSize: 16,
  },
  setNameInput: {
    width: '100%',
    backgroundColor: THEME.colors.bgSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderRadius: 12,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorContainer: {
    backgroundColor: THEME.colors.errorLight,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.error,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 11,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.colors.bgTertiary,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: THEME.colors.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...THEME.shadow.sm,
    shadowColor: THEME.colors.secondary,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.colors.gray400,
    opacity: 0.5,
  },
  sendButtonText: {
    fontWeight: '700',
    color: THEME.colors.white,
    fontSize: 12,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadow.sm,
  },
  voiceButtonText: {
    fontSize: 18,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: THEME.colors.error,
    gap: 8,
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.error,
  },
  recordingText: {
    flex: 1,
    color: THEME.colors.error,
    fontWeight: '700',
    fontSize: 12,
  },
  stopButton: {
    backgroundColor: THEME.colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stopButtonText: {
    color: THEME.colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  messageWrapper: {
    marginHorizontal: 10,
    marginBottom: 8,
  },
  replyButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: THEME.colors.primary,
  },
  replyButtonText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  replyButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  replyPreviewContent: {
    flex: 1,
    gap: 4,
  },
  replyPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  replyPreviewMessage: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  replyPreviewCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreviewCloseText: {
    fontSize: 16,
    color: THEME.colors.white,
    fontWeight: 'bold',
  },
});
