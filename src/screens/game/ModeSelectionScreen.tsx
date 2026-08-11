import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hourglass, Link2, Plus, Sparkles, Target, Users } from 'lucide-react-native';
import { THEME } from '../../theme';
import { styles, COLORS } from './gameScreenStyles';

/**
 * Écran d'accueil du jeu — choix SOLO / DUO LOCAL / créer ou rejoindre
 * une arène en ligne.
 * Extrait de GameScreen.tsx (bloc `if (showModeSelection)`),
 * comportement inchangé.
 */
interface ModeSelectionScreenProps {
  scaleAnim: Animated.Value;
  fadeAnim: Animated.Value;
  isConnected: boolean;
  onlineEnabled: boolean;
  arenaId: string;
  setArenaId: (id: string) => void;
  isCreatingArena: boolean;
  onSelectSolo: () => void;
  onSelectLocal: () => void;
  onCreateArena: () => void;
  onJoinArena: () => void;
}

export function ModeSelectionScreen({
  scaleAnim,
  fadeAnim,
  isConnected,
  onlineEnabled,
  arenaId,
  setArenaId,
  isCreatingArena,
  onSelectSolo,
  onSelectLocal,
  onCreateArena,
  onJoinArena,
}: ModeSelectionScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
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
          styles.modeSelectionContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          }
        ]}
      >
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Hors‑ligne — fonctions réseau désactivées</Text>
          </View>
        )}
        <View style={styles.titleIconRow}>
          <Sparkles size={26} color={THEME.colors.primary} />
          <Text style={styles.titleMain}>NEXUS</Text>
        </View>
        <Text style={styles.titleSub}>ARENA</Text>
        <Text style={styles.subtitle}>Décryptez le code galactique</Text>

        <View style={styles.modesWrapper}>
          <TouchableOpacity
            style={[styles.modeButton, { marginVertical: 6 }]}
            onPress={onSelectSolo}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.modeBtnGradient}>
              <Target size={32} color={THEME.colors.white} style={styles.difficultyIconWrap} />
              <Text style={styles.modeButtonText}>SOLO</Text>
              <Text style={styles.modeDesc}>Défi personnel</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, { marginVertical: 6 }]}
            onPress={onSelectLocal}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[COLORS.primaryDark, COLORS.primaryLight]} style={styles.modeBtnGradient}>
              <Users size={32} color={THEME.colors.white} style={styles.difficultyIconWrap} />
              <Text style={styles.modeButtonText}>DUO LOCAL</Text>
              <Text style={styles.modeDesc}>Même appareil</Text>
            </LinearGradient>
          </TouchableOpacity>

          {onlineEnabled && (
            <>
              <View style={{ width: '100%', marginTop: 12 }}>
                <TextInput
                  value={arenaId}
                  onChangeText={setArenaId}
                  placeholder="Entrez l'ID de la salle (ex: ARENA-XXXX)"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.arenaInput}
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity
                style={[styles.createBtnFull, isCreatingArena && styles.createBtnDisabled]}
                onPress={() => {
                  if (isCreatingArena) return;
                  onCreateArena();
                }}
                activeOpacity={0.7}
                disabled={isCreatingArena}
              >
                <LinearGradient
                  colors={[THEME.colors.success, THEME.colors.primary]}
                  style={styles.btnGradientFull}
                >
                  <View style={styles.difficultyReturnRow}>
                  {isCreatingArena ? (
                    <Hourglass size={16} color={THEME.colors.white} />
                  ) : (
                    <Plus size={16} color={THEME.colors.white} />
                  )}
                  <Text style={styles.modalButtonText}>
                    {isCreatingArena ? 'CRÉATION...' : 'CRÉER UNE ARÈNE'}
                  </Text>
                </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.joinBtnFull}
                onPress={() => {
                  if (!arenaId.trim()) {
                    Alert.alert('⚠️', 'Entrez un ID de salle');
                    return;
                  }
                  onJoinArena();
                }}
              >
                <LinearGradient
                  colors={[THEME.colors.secondary, THEME.colors.secondary]}
                  style={styles.btnGradientFull}
                >
                  <View style={styles.difficultyReturnRow}>
                  <Link2 size={16} color={THEME.colors.white} />
                  <Text style={styles.modalButtonText}>REJOINDRE</Text>
                </View>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

export default ModeSelectionScreen;
