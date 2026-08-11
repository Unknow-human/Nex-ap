import { LinearGradient } from 'expo-linear-gradient';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Brain, Gamepad2, Hourglass, Skull, Sprout, Swords } from 'lucide-react-native';
import { THEME } from '../../theme';
import { GameDifficulty } from '../../types';
import { styles } from './gameScreenStyles';

interface ArenaDifficultySelectionScreenProps {
  fadeAnim: Animated.Value;
  onDifficultyChosen: (difficulty: GameDifficulty) => void;
  onBack: () => void;
}

/**
 * Sélection de difficulté en arène MULTI-ONLINE — variante CRÉATEUR.
 * Le créateur choisit la difficulté pour toute l'arène ; le choix est
 * poussé côté serveur (improvedArenaService.updateDifficulty) par le
 * gestionnaire passé en prop `onDifficultyChosen`, qui gère aussi les
 * erreurs réseau (Alert) et la transition d'état — cette logique reste
 * dans GameScreen.tsx pour ne pas dupliquer l'accès au service.
 *
 * Extraction mécanique : aucune logique modifiée, juste déplacée.
 */
export function ArenaDifficultySelectionScreen({
  fadeAnim,
  onDifficultyChosen,
  onBack,
}: ArenaDifficultySelectionScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', alignItems: 'center', paddingVertical: 40 }}
        >
          <Animated.View
            style={[
              styles.difficultyContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.titleIconRow}>
              <Gamepad2 size={26} color={THEME.colors.primary} />
              <Text style={styles.difficultySelectionTitle}>SÉLECTION DIFFICULTÉ</Text>
            </View>
            <Text style={styles.difficultySelectionSubtitle}>Pour toute l'arène</Text>

            <View style={styles.difficultyContainer}>
              {/* Débutant */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onDifficultyChosen('DEBUTANT')}
              >
                <Sprout size={40} color={THEME.colors.success} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>DÉBUTANT</Text>
                <Text style={styles.difficultyDesc}>Plus facile</Text>
              </TouchableOpacity>

              {/* Normal */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onDifficultyChosen('NORMAL')}
              >
                <Swords size={40} color={THEME.colors.primary} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>NORMAL</Text>
                <Text style={styles.difficultyDesc}>Équilibré</Text>
              </TouchableOpacity>

              {/* Expert */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onDifficultyChosen('EXPERT')}
              >
                <Brain size={40} color={THEME.colors.warning} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>EXPERT</Text>
                <Text style={styles.difficultyDesc}>Plus difficile</Text>
              </TouchableOpacity>

              {/* Impossible */}
              <TouchableOpacity
                style={styles.difficultyButton}
                onPress={() => onDifficultyChosen('IMPOSSIBLE')}
              >
                <Skull size={40} color={THEME.colors.error} style={styles.difficultyIconWrap} />
                <Text style={styles.difficultyLevel}>IMPOSSIBLE</Text>
                <Text style={styles.difficultyDesc}>Ultime défi</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Retour */}
            <TouchableOpacity style={[styles.difficultyReturnButton, styles.difficultyReturnRow]} onPress={onBack}>
              <ArrowLeft size={14} color={THEME.colors.white} />
              <Text style={styles.difficultyReturnText}>RETOUR</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ArenaWaitingForDifficultyScreenProps {
  fadeAnim: Animated.Value;
  rotateAnim: Animated.Value;
  onCancel: () => void;
}

/**
 * Sélection de difficulté en arène MULTI-ONLINE — variante JOUEUR (non créateur).
 * Simple écran d'attente pendant que le créateur choisit la difficulté ;
 * la synchronisation d'état (arenaGameActive / showDifficultySelection)
 * reste pilotée par GameScreen.tsx via les abonnements Realtime existants.
 *
 * Correctif : cet écran n'avait auparavant AUCUN moyen d'en sortir. Si le
 * créateur quittait sans le faire proprement (ou mettait du temps à
 * choisir), le joueur restait bloqué indéfiniment sur ce fond bleu avec
 * juste un spinner ("écran bleu" signalé par les utilisateurs). On ajoute
 * un bouton Annuler qui réutilise le même handleBackToMenu que partout
 * ailleurs (notifie le serveur, nettoie l'état local, revient au menu).
 */
export function ArenaWaitingForDifficultyScreen({
  fadeAnim,
  rotateAnim,
  onCancel,
}: ArenaWaitingForDifficultyScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
      <LinearGradient
        colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View
          style={[
            {
              justifyContent: 'center',
              alignItems: 'center',
              gap: 20,
            },
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.titleIconRow}>
            <Hourglass size={24} color={THEME.colors.primary} />
            <Text style={styles.difficultySelectionTitle}>EN ATTENTE...</Text>
          </View>
          <Text style={styles.difficultySelectionSubtitle}>Le créateur sélectionne la difficulté</Text>
          <Animated.View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 3,
              borderColor: THEME.colors.primary,
              borderTopColor: 'transparent',
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          />
          <TouchableOpacity style={[styles.difficultyReturnButton, styles.difficultyReturnRow]} onPress={onCancel}>
            <ArrowLeft size={14} color={THEME.colors.white} />
            <Text style={styles.difficultyReturnText}>ANNULER</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}
