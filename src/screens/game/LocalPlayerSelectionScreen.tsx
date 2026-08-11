import { LinearGradient } from 'expo-linear-gradient';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Users } from 'lucide-react-native';
import { THEME } from '../../theme';
import { styles } from './gameScreenStyles';

/**
 * Écran "MODE LOCAL" — saisie des noms des deux joueurs avant une partie
 * en duo sur le même appareil.
 * Extrait de GameScreen.tsx (bloc `if (showLocalPlayerSelection)`),
 * comportement inchangé.
 */
interface LocalPlayerSelectionScreenProps {
  scaleAnim: Animated.Value;
  fadeAnim: Animated.Value;
  slideInAnim: Animated.Value;
  buttonScaleAnim: Animated.Value;
  localPlayer1: string;
  setLocalPlayer1: (name: string) => void;
  localPlayer2: string;
  setLocalPlayer2: (name: string) => void;
  onStartLocalGame: () => void;
  onBack: () => void;
}

export function LocalPlayerSelectionScreen({
  scaleAnim,
  fadeAnim,
  slideInAnim,
  buttonScaleAnim,
  localPlayer1,
  setLocalPlayer1,
  localPlayer2,
  setLocalPlayer2,
  onStartLocalGame,
  onBack,
}: LocalPlayerSelectionScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary }}>
      <LinearGradient
        colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.containerGradient}
      >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Animated.View
        style={[
          styles.playerSelectionContainer,
          {
            transform: [
              { scale: scaleAnim },
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles.titleIconRow}>
          <Users size={22} color={THEME.colors.primary} />
          <Text style={styles.playerSelectionTitle}>MODE LOCAL</Text>
        </View>
        <Text style={styles.playerSelectionSubtitle}>Enregistrez les noms des joueurs</Text>

        <View style={styles.playerInputsContainer}>
          {/* Joueur 1 */}
          <Animated.View
            style={[
              styles.playerInputSection,
              {
                transform: [{ translateY: slideInAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            <Text style={styles.playerInputLabel}>Joueur 1</Text>
            <TextInput
              style={styles.playerInput}
              placeholder="Nom du joueur 1"
              placeholderTextColor={THEME.colors.gray200}
              value={localPlayer1}
              onChangeText={setLocalPlayer1}
              maxLength={20}
            />
          </Animated.View>

          {/* Joueur 2 */}
          <Animated.View
            style={[
              styles.playerInputSection,
              {
                transform: [{ translateY: slideInAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            <Text style={styles.playerInputLabel}>Joueur 2</Text>
            <TextInput
              style={styles.playerInput}
              placeholder="Nom du joueur 2"
              placeholderTextColor={THEME.colors.gray200}
              value={localPlayer2}
              onChangeText={setLocalPlayer2}
              maxLength={20}
            />
          </Animated.View>
        </View>

        {/* Boutons */}
        <View style={styles.playerButtonsRow}>
          <TouchableOpacity
            style={[styles.startLocalButton, styles.difficultyReturnRow, (!localPlayer1.trim() || !localPlayer2.trim()) && styles.startLocalButtonDisabled]}
            onPress={() => {
              Animated.sequence([
                Animated.timing(buttonScaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
                Animated.timing(buttonScaleAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
                Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
              ]).start();

              setTimeout(onStartLocalGame, 150);
            }}
            disabled={!localPlayer1.trim() || !localPlayer2.trim()}
          >
            <Play size={14} color={THEME.colors.white} fill={THEME.colors.white} />
            <Text style={styles.startLocalButtonText}>COMMENCER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backButton, styles.difficultyReturnRow]}
            onPress={onBack}
          >
            <ArrowLeft size={14} color={THEME.colors.white} />
            <Text style={styles.backButtonText}>RETOUR</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

export default LocalPlayerSelectionScreen;
