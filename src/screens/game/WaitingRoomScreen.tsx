import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Clipboard as ClipboardIcon, Gamepad2, Hourglass, User, X } from 'lucide-react-native';
import { THEME } from '../../theme';
import { styles } from './gameScreenStyles';

interface WaitingRoomScreenProps {
  arenaId: string;
  agentName: string;
  arenaPlayers: string[];
  isArenaCreator: boolean;
  fadeAnim: Animated.Value;
  pulseAnim: Animated.Value;
  dotAnim1: Animated.Value;
  dotAnim2: Animated.Value;
  dotAnim3: Animated.Value;
  onLaunch: () => void;
  onCancel: () => void;
}

/**
 * Salle d'attente d'une arène en ligne (MULTI-ONLINE) : affiche le code
 * de salle, les joueurs connectés, et le bouton de lancement (créateur
 * uniquement) ou l'indicateur d'attente (joueur).
 *
 * Extraction mécanique depuis GameScreen.tsx : aucune logique modifiée.
 * La logique de lancement (animation + startArena + transitions d'état)
 * reste dans GameScreen et est passée ici via `onLaunch`, car elle
 * touche trop d'état partagé pour être déplacée sans risque.
 */
export function WaitingRoomScreen({
  arenaId,
  agentName,
  arenaPlayers,
  isArenaCreator,
  fadeAnim,
  pulseAnim,
  dotAnim1,
  dotAnim2,
  dotAnim3,
  onLaunch,
  onCancel,
}: WaitingRoomScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', alignItems: 'center', paddingVertical: 40 }}
        >
          <Animated.View style={[{ opacity: fadeAnim }]}>
            <View style={styles.waitingRoomContent}>
              <View style={styles.titleIconRow}>
                <Gamepad2 size={24} color={THEME.colors.primary} />
                <Text style={styles.waitingTitle}>EN ATTENTE DE JOUEURS</Text>
              </View>

              {/* Arena ID Display */}
              <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', marginBottom: 20 }}>
                <Text style={styles.arenaIdLabel}>CODE DE SALLE:</Text>
                <View style={styles.arenaIdDisplay}>
                  <Text style={styles.arenaIdText}>{arenaId}</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={async () => {
                      if (Clipboard && Clipboard.setStringAsync) {
                        const downloadLink = 'https://nexus-arena-118r.onrender.com/';
                        const joinLink = `${downloadLink}?arena=${encodeURIComponent(arenaId)}`;
                        const message = `🎮 NEXUS ARENA - Rejoins-moi!\n\n🔗 Rejoins via: ${joinLink}\n\n📱 Code de salle: ${arenaId}\n\n📥 Ou télécharge l'app ici: ${downloadLink}\n\n⚡ C'est gratuit et rapide!`;
                        await Clipboard.setStringAsync(message);
                        Alert.alert('✓ Message copié!', 'Message avec le lien de la salle et le lien de téléchargement copié. Partage-le avec tes amis!');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <ClipboardIcon size={18} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.difficultyReturnRow, { justifyContent: 'center', marginBottom: 4 }]}>
                  <ClipboardIcon size={12} color={THEME.colors.textSecondary} />
                  <Text style={styles.arenaIdInfo}>Appuie pour copier le message (lien de la salle + lien téléchargement)</Text>
                </View>

                {/* Animation de chargement */}
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 30, justifyContent: 'center' }}>
                  <Animated.Text style={[styles.loadingDot, { opacity: dotAnim1 }]}>●</Animated.Text>
                  <Animated.Text style={[styles.loadingDot, { opacity: dotAnim2 }]}>●</Animated.Text>
                  <Animated.Text style={[styles.loadingDot, { opacity: dotAnim3 }]}>●</Animated.Text>
                </View>

                {/* Liste des joueurs */}
                <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', marginBottom: 20 }}>
                  <Text style={[styles.playersTitle, { textAlign: 'center', marginBottom: 12 }]}>JOUEURS: {arenaPlayers.length}/2</Text>
                  {arenaPlayers.map((player, index) => (
                    <Animated.View key={index} style={[styles.playerItem, { opacity: fadeAnim }]}>
                      <User size={16} color={THEME.colors.primary} />
                      <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">{player}</Text>
                      <Text style={styles.playerStatus}>{player === agentName ? '(Vous)' : '(Connecté)'}</Text>
                    </Animated.View>
                  ))}
                  {arenaPlayers.length < 2 && (
                    <Animated.View style={[styles.emptyPlayerSlot, { opacity: pulseAnim }]}>
                      <Hourglass size={16} color={THEME.colors.gray200} />
                      <Text style={styles.emptyPlayerText}>En attente d'un joueur...</Text>
                    </Animated.View>
                  )}
                </View>

                {/* Boutons d'action */}
                <View style={{ flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, alignSelf: 'center' }}>
                  {isArenaCreator ? (
                    <TouchableOpacity
                      style={arenaPlayers.length >= 2 ? styles.startButton : styles.startButtonDisabled}
                      onPress={onLaunch}
                      disabled={arenaPlayers.length < 2}
                    >
                      <View style={styles.difficultyReturnRow}>
                        {arenaPlayers.length >= 2 ? (
                          <Check size={16} color={THEME.colors.white} />
                        ) : (
                          <Hourglass size={16} color={THEME.colors.white} />
                        )}
                        <Text style={styles.startButtonText}>
                          {arenaPlayers.length >= 2 ? 'LANCER' : 'ATTENDRE'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.startButtonDisabled}>
                      <View style={styles.difficultyReturnRow}>
                      <Hourglass size={16} color={THEME.colors.white} />
                      <Text style={styles.startButtonText}>EN ATTENTE...</Text>
                    </View>
                    </View>
                  )}

                  <TouchableOpacity style={[styles.cancelButton, styles.difficultyReturnRow]} onPress={onCancel}>
                    <X size={14} color={THEME.colors.bgSecondary} />
                    <Text style={styles.cancelButtonText}>ANNULER</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}
