import { LinearGradient } from 'expo-linear-gradient';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Brain, Gamepad2, Skull, Sprout, Swords } from 'lucide-react-native';
import { THEME } from '../../theme';
import { GameDifficulty } from '../../types';
import { styles } from './gameScreenStyles';

interface DifficultySelectionScreenProps {
  scaleAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  onBack: () => void;
}

/**
 * Écran de sélection de difficulté en mode SOLO / DUO LOCAL
 * (le cas MULTI-ONLINE, avec ses 2 variantes créateur/joueur, reste
 * dans GameScreen.tsx pour l'instant — il dépend de trop d'appels
 * réseau/état partagé pour être extrait sans risque de régression).
 *
 * Extraction mécanique : aucune logique modifiée, juste déplacée.
 */
export function DifficultySelectionScreen({
  scaleAnim,
  fadeAnim,
  onSelectDifficulty,
  onBack,
}: DifficultySelectionScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
      <LinearGradient
        colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.containerGradient}
      >
        <ScrollView
          contentContainerStyle={[styles.difficultyScrollContent, { paddingTop: 12 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.difficultySelectionContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.titleIconRow}>
              <Gamepad2 size={26} color={THEME.colors.primary} />
              <Text style={styles.difficultySelectionTitle}>SÉLECTION DIFFICULTÉ</Text>
            </View>
            <Text style={styles.difficultySelectionSubtitle}>Choisissez votre niveau</Text>

            <View style={styles.difficultyContainer}>
              {/* Débutant */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onSelectDifficulty('DEBUTANT')}
              >
                <Sprout size={40} color={THEME.colors.success} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>DÉBUTANT</Text>
                <Text style={styles.difficultyDesc}>Plus facile</Text>
              </TouchableOpacity>

              {/* Normal */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onSelectDifficulty('NORMAL')}
              >
                <Swords size={40} color={THEME.colors.primary} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>NORMAL</Text>
                <Text style={styles.difficultyDesc}>Équilibré</Text>
              </TouchableOpacity>

              {/* Expert */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onSelectDifficulty('EXPERT')}
              >
                <Brain size={40} color={THEME.colors.warning} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>EXPERT</Text>
                <Text style={styles.difficultyDesc}>Plus difficile</Text>
              </TouchableOpacity>

              {/* Impossible */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onSelectDifficulty('IMPOSSIBLE')}
              >
                <Skull size={40} color={THEME.colors.error} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>IMPOSSIBLE</Text>
                <Text style={styles.difficultyDesc}>Ultime défi</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Retour */}
            <TouchableOpacity style={[styles.backButton, styles.difficultyReturnRow]} onPress={onBack}>
              <ArrowLeft size={14} color={THEME.colors.white} />
              <Text style={styles.backButtonText}>RETOUR</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
