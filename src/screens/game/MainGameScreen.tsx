import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, Check, Circle, Lock, RefreshCw, Settings, Skull, Sprout, Swords, Trophy, X } from 'lucide-react-native';
import { CustomKeyboard } from '../../components/CustomKeyboard';
import { FluxList } from '../../components/FluxList';
import { GameChat } from '../../components/GameChat';
import { VictoryModal } from '../../components/VictoryModal';
import { arenaChatService } from '../../services/supabase';
import { THEME } from '../../theme';
import { GameDifficulty, GameMode } from '../../types';
import { styles } from './gameScreenStyles';

interface MainGameScreenProps {
  mode: GameMode;
  agentName: string;
  currentLocalPlayer: string;
  localPlayer1: string;
  localPlayer2: string;
  selectedDifficulty: GameDifficulty;
  gameState: any;
  opponentAttempts: any[];
  sharedAttempts: any[];
  playerId: string;
  opponentName: string;
  chatMessages: Array<{ id: string; sender: string; text: string; timestamp: number; isOwn: boolean }>;
  isConnected: boolean;
  arenaId: string;
  arenaPlayers: string[];
  gameStartTime: number;
  showVictoryModal: boolean;
  onlineEnabled: boolean;
  // Animations
  pulseAnim: Animated.Value;
  feedbackShakeAnim: Animated.Value;
  feedbackGlowAnim: Animated.Value;
  buttonScaleAnim: Animated.Value;
  abandonButtonAnim: Animated.Value;
  // Handlers / dérivés (logique inchangée, juste passés en props)
  getRevealedCode: () => string;
  canSubmitAttempt: () => boolean;
  animateButtonPress: () => void;
  addDigit: (digit: string) => void;
  removeDigit: () => void;
  submitAttempt: () => void;
  resetGame: () => void;
  handleBackToMenu: () => void;
  setCurrentLocalPlayer: (name: string) => void;
  setOpponentName: (name: string) => void;
  setShowVictoryModal: (visible: boolean) => void;
  onGoToRecords: () => void;
}

/**
 * Écran de jeu principal : saisie du code, historique des tentatives,
 * clavier, boutons d'action (valider/abandonner/reset), modale de
 * victoire et chat de partie (MULTI-ONLINE).
 *
 * Extraction mécanique depuis GameScreen.tsx : aucune logique modifiée,
 * juste déplacée. Les handlers qui touchent à de l'état partagé complexe
 * (navigation, services réseau) restent dans GameScreen et sont passés
 * ici via props.
 */
export function MainGameScreen({
  mode,
  agentName,
  currentLocalPlayer,
  localPlayer1,
  localPlayer2,
  selectedDifficulty,
  gameState,
  opponentAttempts,
  sharedAttempts,
  playerId,
  opponentName,
  chatMessages,
  isConnected,
  arenaId,
  arenaPlayers,
  gameStartTime,
  showVictoryModal,
  onlineEnabled,
  pulseAnim,
  feedbackShakeAnim,
  feedbackGlowAnim,
  buttonScaleAnim,
  abandonButtonAnim,
  getRevealedCode,
  canSubmitAttempt,
  animateButtonPress,
  addDigit,
  removeDigit,
  submitAttempt,
  resetGame,
  handleBackToMenu,
  setCurrentLocalPlayer,
  setOpponentName,
  setShowVictoryModal,
  onGoToRecords,
}: MainGameScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.bgPrimary, paddingTop: 12 }}>
      <LinearGradient
        colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.containerGradient}
      >
        <View style={styles.gameContainer}>
          {/* Header - Compact */}
          <View style={styles.gameHeader}>
            <View style={styles.agentInfo}>
              <Text style={styles.agentLabel}>JOUEUR</Text>
              <Text style={styles.agentName} numberOfLines={1} ellipsizeMode="tail">
                {mode === 'MULTI-LOCAL' ? currentLocalPlayer : agentName}
              </Text>
            </View>
            <View style={styles.modeInfoGame}>
              <LinearGradient
                colors={[THEME.colors.secondary, THEME.colors.primary]}
                style={styles.modeBadge}
              >
                <Text style={styles.modeLabelGame}>{mode}</Text>
                {mode === 'SOLO' && (
                  <View style={styles.difficultyBadgeRow}>
                    {selectedDifficulty === 'DEBUTANT' && <Sprout size={12} color={THEME.colors.white} />}
                    {selectedDifficulty === 'NORMAL' && <Swords size={12} color={THEME.colors.white} />}
                    {selectedDifficulty === 'EXPERT' && <Brain size={12} color={THEME.colors.white} />}
                    {selectedDifficulty === 'IMPOSSIBLE' && <Skull size={12} color={THEME.colors.white} />}
                    <Text style={styles.difficultyBadgeText}>{selectedDifficulty}</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Alert.alert(
                  '⚠️ Quitter la partie',
                  mode === 'MULTI-ONLINE'
                    ? 'Retourner au menu ? Ton adversaire remportera la manche.'
                    : 'Retourner au menu ? La partie en cours sera perdue.',
                  [
                    { text: 'NON', style: 'cancel' },
                    { text: 'OUI', style: 'destructive', onPress: handleBackToMenu },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Settings size={18} color={THEME.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Main Content - Side by Side Layout */}
          <View style={styles.mainContent}>
            {/* Left: Code Input - Validation Section */}
            <View style={styles.leftPanel}>
              <Animated.View
                style={[
                  styles.codeInputBox,
                  {
                    transform: [
                      { scale: pulseAnim },
                      {
                        translateX: feedbackShakeAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: [-8, 8],
                        }),
                      },
                    ],
                    borderColor: feedbackGlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [THEME.colors.border, THEME.colors.neonCyan],
                    }),
                    shadowOpacity: feedbackGlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.8],
                    }),
                    shadowColor: THEME.colors.neonCyan,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                <Text style={styles.codeLabel}>CODES</Text>
                {gameState.attempts.length === 0 ? (
                  <Text style={styles.codeDisplayEmpty}>-</Text>
                ) : (
                  <>
                    <Text style={styles.codeDisplay}>
                      {gameState.attempts[gameState.attempts.length - 1].code}
                    </Text>
                    <View style={styles.feedbackRow}>
                      <View style={styles.feedbackBadge}>
                        <Text style={styles.feedbackLabel}>BP</Text>
                        <Text style={styles.feedbackValue}>{gameState.attempts[gameState.attempts.length - 1].bp}</Text>
                      </View>
                      <View style={styles.feedbackBadge}>
                        <Text style={styles.feedbackLabel}>MP</Text>
                        <Text style={styles.feedbackValue}>{gameState.attempts[gameState.attempts.length - 1].mp}</Text>
                      </View>
                    </View>
                  </>
                )}
              </Animated.View>

              {/* Current Code Input */}
              <View style={styles.currentCodeSection}>
                <Text style={styles.currentCodeLabel}>EN COURS</Text>
                <Text style={styles.currentCodeDisplay}>
                  {getRevealedCode()}
                </Text>

                {/* Indicateur pour positions verrouillées en DÉBUTANT */}
                {selectedDifficulty === 'DEBUTANT' && gameState.lockedPositions && Object.keys(gameState.lockedPositions).length > 0 && (
                  <View style={[styles.lockedPositionsHint, styles.difficultyReturnRow, { justifyContent: 'center', paddingVertical: 4 }]}>
                    <Lock size={11} color={THEME.colors.primary} />
                    <Text style={{ fontSize: 11, color: THEME.colors.primary, fontWeight: '700' }}>
                      {Object.keys(gameState.lockedPositions).length} position(s) verrouillée(s)
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right: Attempts List */}
            <View style={styles.rightPanel}>
              <View style={styles.fluxWrapper}>
                <FluxList attempts={mode === 'MULTI-LOCAL' ? sharedAttempts : gameState.attempts} inverted={true} />
              </View>
              {mode === 'MULTI-ONLINE' && (
                <View style={styles.fluxWrapper}>
                  <FluxList attempts={opponentAttempts} inverted={true} title="ADVERSAIRE" />
                </View>
              )}
            </View>
          </View>

          {/* Bottom Section - Always Visible */}
          <View style={styles.bottomSection}>
            {/* Keyboard */}
            <View style={styles.keyboardWrapper}>
              <CustomKeyboard
                onDigitPress={addDigit}
                onDelete={removeDigit}
                disabled={gameState.isGameOver}
              />
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              {/* Submit Button */}
              <Animated.View style={[styles.submitButtonContainer, { transform: [{ scale: buttonScaleAnim }] }]}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !canSubmitAttempt() && styles.submitButtonDisabled,
                  ]}
                  onPress={() => {
                    if (canSubmitAttempt() && !gameState.isGameOver) {
                      animateButtonPress();
                      submitAttempt();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      !canSubmitAttempt() || gameState.isGameOver
                        ? [THEME.colors.gray200, THEME.colors.gray200]
                        : [THEME.colors.secondary, THEME.colors.primary]
                    }
                    style={styles.submitGradient}
                  >
                    {canSubmitAttempt() ? (
                      <Check size={20} color={THEME.colors.bgSecondary} strokeWidth={3} />
                    ) : (
                      <Circle size={16} color={THEME.colors.bgSecondary} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Abandon Button */}
              <TouchableOpacity
                style={styles.abandonButtonSmall}
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(abandonButtonAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
                    Animated.timing(abandonButtonAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
                    Animated.timing(abandonButtonAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                  ]).start();

                  setTimeout(() => {
                    Alert.alert(
                      '⚠️ ABANDONNER',
                      'Quitter la partie ?',
                      [
                        { text: 'NON', style: 'cancel' },
                        { text: 'OUI', style: 'destructive', onPress: handleBackToMenu },
                      ]
                    );
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ scale: abandonButtonAnim }] }}>
                  <X size={20} color={THEME.colors.white} />
                </Animated.View>
              </TouchableOpacity>

              {/* Reset Button */}
              {gameState.isGameOver && (
                <TouchableOpacity
                  style={styles.resetButtonSmall}
                  onPress={() => {
                    Animated.sequence([
                      Animated.timing(buttonScaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
                      Animated.timing(buttonScaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
                      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                    ]).start();

                    if (gameState.isVictory) {
                      onGoToRecords();
                    } else {
                      setTimeout(resetGame, 100);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {gameState.isVictory ? (
                    <Trophy size={20} color={THEME.colors.white} />
                  ) : (
                    <RefreshCw size={20} color={THEME.colors.white} />
                  )}
                </TouchableOpacity>
              )}

              {/* Switch Player Button - Mode LOCAL */}
              {mode === 'MULTI-LOCAL' && (
                <TouchableOpacity
                  style={styles.switchPlayerButton}
                  onPress={() => {
                    const newPlayer = currentLocalPlayer === localPlayer1 ? localPlayer2 : localPlayer1;
                    setCurrentLocalPlayer(newPlayer);
                    setOpponentName(currentLocalPlayer);
                    // En mode LOCAL, ne pas réinitialiser l'historique partagé, juste le joueur actuel
                  }}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={20} color={THEME.colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Victory Modal */}
          {gameState.isVictory && (
            <VictoryModal
              visible={showVictoryModal}
              attempts={gameState.attempts.length}
              timeSeconds={gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0}
              playerName={mode === 'MULTI-LOCAL' ? currentLocalPlayer : agentName}
              mode={mode}
              difficulty={mode === 'SOLO' ? selectedDifficulty : undefined}
              opponentName={opponentName || (arenaPlayers[0] === agentName ? arenaPlayers[1] : arenaPlayers[0])}
              onNewGame={() => {
                setShowVictoryModal(false);
                resetGame();
              }}
              onRecords={() => {
                setShowVictoryModal(false);
                onGoToRecords();
              }}
              onMenu={handleBackToMenu}
            />
          )}

          {/* Game Chat - Multijoueur uniquement (désactivé si ONLINE_ENABLED=false) */}
          {onlineEnabled && mode === 'MULTI-ONLINE' && (
            <GameChat
              playerId={playerId}
              playerName={agentName}
              opponentName={opponentName || 'Adversaire'}
              messages={chatMessages}
              onSendMessage={async (msg) => {
                if (!isConnected) {
                  Alert.alert('Hors‑ligne', 'Impossible d\'envoyer le message en mode hors‑ligne.');
                  return;
                }
                try {
                  console.log('📤 [GameScreen] Envoi message:', { arenaId, agentName, msg });
                  // Envoyer le message via Firebase
                  await arenaChatService.sendArenaMessage(arenaId, playerId, agentName, msg);
                  console.log('✅ [GameScreen] Message envoyé avec succès');
                } catch (error) {
                  console.error('❌ [GameScreen] Erreur envoi message:', error);
                  Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
                }
              }}
            />
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
