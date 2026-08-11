import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, Palette, RotateCcw, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BACKGROUND_COLOR_PRESETS } from '../services/backgroundService';
import { useBackground } from '../hooks/useBackground';
import { THEME } from '../theme';

interface BackgroundPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Sélecteur d'arrière-plan : chaque utilisateur peut choisir une photo
 * depuis sa galerie ou une couleur unie parmi une palette cohérente avec
 * le thème. Accessible depuis le Chat et l'Accueil (bouton 🎨 dans l'en-tête).
 */
export function BackgroundPickerModal({ visible, onClose }: BackgroundPickerModalProps) {
  const { background, setColorBackground, setPhotoBackground, resetBackground } = useBackground();
  const [isPicking, setIsPicking] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Autorisation requise',
          'Autorise l\'accès à tes photos pour choisir un arrière-plan personnalisé.'
        );
        return;
      }

      setIsPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await setPhotoBackground(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.error('Erreur sélection photo arrière-plan:', error);
      Alert.alert('Erreur', 'Impossible de charger cette photo. Réessaie avec une autre.');
    } finally {
      setIsPicking(false);
    }
  };

  const handlePickColor = async (color: string) => {
    try {
      await setColorBackground(color);
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer cette couleur.');
    }
  };

  const handleReset = async () => {
    try {
      await resetBackground();
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de réinitialiser l\'arrière-plan.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>🎨 Arrière-plan</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto} disabled={isPicking}>
            <ImageIcon size={18} color={THEME.colors.white} />
            <Text style={styles.photoButtonText}>
              {isPicking ? 'Chargement...' : 'Choisir une photo'}
            </Text>
          </TouchableOpacity>

          <View style={styles.colorSectionHeader}>
            <Palette size={16} color={THEME.colors.textSecondary} />
            <Text style={styles.colorSectionLabel}>ou une couleur unie</Text>
          </View>

          <View style={styles.colorGrid}>
            {BACKGROUND_COLOR_PRESETS.map((color) => {
              const isSelected = background.type === 'color' && background.value === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                  onPress={() => handlePickColor(color)}
                />
              );
            })}
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RotateCcw size={16} color={THEME.colors.textSecondary} />
            <Text style={styles.resetButtonText}>Revenir au thème par défaut</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  photoButtonText: {
    color: THEME.colors.black,
    fontWeight: '700',
    fontSize: 14,
  },
  colorSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  colorSectionLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  colorSwatchSelected: {
    borderColor: THEME.colors.primary,
    borderWidth: 3,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
