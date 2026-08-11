import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Pause, Play } from 'lucide-react-native';

interface AudioMessageProps {
  message: string;
  audioUri?: string;
  duration: number;
}

export function AudioMessage({ message, audioUri, duration }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Décharger le son quand le composant est démonté (changement d'écran
  // pendant la lecture) pour éviter une lecture fantôme en arrière-plan.
  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;

    setCurrentTime(status.positionMillis / 1000);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      // Décharger complètement pour permettre de rejouer (sinon le bouton
      // play ne fait plus rien après la première lecture) et remettre
      // l'icône/le curseur à l'état initial.
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const startPlayback = async () => {
    if (!audioUri) return;

    try {
      setIsLoading(true);

      if (soundRef.current) {
        // Son déjà chargé (mise en pause) : reprendre la lecture.
        await soundRef.current.playAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      setIsLoading(false);
    }
  };

  const stopPlayback = async () => {
    try {
      if (soundRef.current) {
        // Pause (pas de déchargement) : on garde le son en mémoire pour
        // pouvoir reprendre exactement là où on s'est arrêté.
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
    } catch (error) {
      console.error('Erreur pause audio:', error);
    }
  };

  return (
    <View style={styles.audioContainer}>
      <View style={styles.playerContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : (
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={isPlaying ? stopPlayback : startPlayback}
          >
            {isPlaying ? (
              <Pause size={18} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={18} color="#ffffff" fill="#ffffff" />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.audioLabelRow}>
            <Mic size={12} color="#6366f1" />
            <Text style={styles.audioLabel}>Message Audio</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>
              {Math.round(currentTime)}s / {duration}s
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
      {message && (
        <Text style={styles.messageText}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  audioContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playButtonActive: {
    backgroundColor: '#4f46e5',
  },
  playButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    gap: 6,
  },
  audioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  audioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressContainer: {
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2d3748',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  messageText: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 8,
    fontWeight: '500',
  },
});
