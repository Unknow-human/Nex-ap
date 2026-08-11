import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Brain, Gamepad2, Globe, Home, LucideIcon, Skull, Sprout, Swords, Target, Timer, Trophy, Users } from 'lucide-react-native';
import { THEME } from '../theme';
import { GameDifficulty, GameMode } from '../types';

const PARTICLE_COUNT = 16;
const PARTICLE_COLORS = [THEME.colors.neonCyan, THEME.colors.neonViolet, THEME.colors.neonPink];

interface VictoryModalProps {
  visible: boolean;
  attempts: number;
  timeSeconds: number;
  playerName: string;
  mode: GameMode;
  difficulty?: GameDifficulty;
  opponentName?: string;
  onNewGame: () => void;
  onRecords: () => void;
  onMenu: () => void;
}

export function VictoryModal({
  visible,
  attempts,
  timeSeconds,
  playerName,
  mode,
  difficulty,
  opponentName,
  onNewGame,
  onRecords,
  onMenu,
}: VictoryModalProps) {
  const { width, height } = useWindowDimensions();
  const isShortScreen = height < 700;
  // Empêche qu'un double-tap rapide sur un bouton déclenche deux fois
  // resetGame()/navigation en même temps (source de plantages aléatoires
  // constatés après une victoire).
  const actionTakenRef = useRef(false);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Particules néon : chacune anime sa progression (0 -> 1), angle/distance
  // fixés une fois par ouverture de modale
  const particleProgress = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))
  ).current;
  const particleConfig = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const distance = 90 + Math.random() * 70;
      return {
        angle,
        distance,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 150,
      };
    })
  ).current;

  useEffect(() => {
    if (visible) {
      actionTakenRef.current = false;
      // Réinitialiser les animations
      scaleAnim.setValue(0.5);
      fadeAnim.setValue(0);
      slideAnim.setValue(height * 0.5);
      glowAnim.setValue(0);
      particleProgress.forEach((p) => p.setValue(0));

      // Animation d'entrée
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Halo néon pulsant continu autour de la carte
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
        ])
      );
      glowLoop.start();

      // Explosion de particules néon depuis le trophée
      Animated.stagger(
        15,
        particleProgress.map((p, i) =>
          Animated.timing(p, {
            toValue: 1,
            duration: 900 + Math.random() * 400,
            delay: particleConfig[i].delay,
            useNativeDriver: true,
          })
        )
      ).start();

      // ⚠️ Sans ce cleanup, la boucle continuait indéfiniment même après
      // fermeture/démontage de la modale : à chaque réouverture (nouvelle
      // victoire), une boucle supplémentaire s'empilait sur le même
      // Animated.Value, ce qui finissait par saturer le thread JS
      // d'animations concurrentes sur Android et provoquait des plantages
      // aléatoires de l'écran de victoire après plusieurs parties.
      return () => {
        glowLoop.stop();
      };
    }
  }, [visible]);

  const modeLabel = {
    SOLO: 'SOLO',
    'MULTI-LOCAL': 'DUO LOCAL',
    'MULTI-ONLINE': 'EN LIGNE',
  }[mode];

  const ModeIcon: LucideIcon = mode === 'SOLO' ? Target : mode === 'MULTI-LOCAL' ? Users : Globe;

  const DifficultyIcon: LucideIcon = {
    DEBUTANT: Sprout,
    NORMAL: Swords,
    EXPERT: Brain,
    IMPOSSIBLE: Skull,
  }[difficulty || 'NORMAL'];

  return (
    <Modal visible={visible} transparent animationType="none">
      <SafeAreaView style={styles.container}>
        {/* Background overlay */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: fadeAnim },
          ]}
        />

        {/* Victory Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              width: Math.min(width * 0.9, 380),
              maxHeight: height - 40,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Halo néon pulsant : Animated.View séparé et dédié, piloté par
              JS (useNativeDriver: false, requis car shadowOpacity n'est pas
              supporté par le native driver). Le séparer de la carte
              ci-dessus (qui, elle, est 100% native-driven) évite de mélanger
              JS-driven et native-driven sur le même nœud de style — c'était
              la cause du crash "Attempting to run JS driven animation on
              animated node that has been moved to native". */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowHalo,
              {
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.75],
                }),
              },
            ]}
          />
          <LinearGradient
            colors={[THEME.colors.bgSecondary, THEME.colors.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
          {/* ScrollView interne : sur petit écran (SE, écrans courts en mode
              paysage, multi-fenêtrage Android), le contenu (trophée + titre +
              4 cases de stats + score + 3 boutons) peut dépasser la hauteur
              disponible. Le ScrollView garantit que tout reste accessible
              sans jamais rogner un bouton ou une info en bas de carte. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.cardScrollContent,
              isShortScreen && styles.cardScrollContentCompact,
            ]}
            bounces={false}
          >
            {/* Particules néon éclatant depuis le trophée */}
            <View style={styles.particleField} pointerEvents="none">
              {particleProgress.map((p, i) => {
                const { angle, distance, color, size } = particleConfig[i];
                const translateX = p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.cos(angle) * distance],
                });
                const translateY = p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.sin(angle) * distance],
                });
                const opacity = p.interpolate({
                  inputRange: [0, 0.15, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                });
                const scale = p.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0.3, 1, 0.4],
                });
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        shadowColor: color,
                        opacity,
                        transform: [{ translateX }, { translateY }, { scale }],
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Trophy */}
            <Trophy
              size={isShortScreen ? 52 : 80}
              color={THEME.colors.warning}
              fill={THEME.colors.warning}
              style={[styles.trophy, isShortScreen && styles.trophyCompact]}
            />

            {/* Title */}
            <Text style={[styles.title, isShortScreen && styles.titleCompact]}>VICTOIRE!</Text>
            <Text style={styles.subtitle}>Code Décrypté avec Succès!</Text>

            {/* Player info */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Joueur</Text>
              <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">{playerName}</Text>
            </View>

            {/* Game stats */}
            <View style={styles.statsContainer}>
              {/* Attempts */}
              <View style={styles.statBox}>
                <Target size={24} color={THEME.colors.textPrimary} style={styles.statIcon} />
                <Text style={styles.statLabel}>Tentatives</Text>
                <Text style={styles.statValue}>{attempts}</Text>
              </View>

              {/* Time */}
              <View style={styles.statBox}>
                <Timer size={24} color={THEME.colors.textPrimary} style={styles.statIcon} />
                <Text style={styles.statLabel}>Temps</Text>
                <Text style={styles.statValue}>{timeSeconds}s</Text>
              </View>

              {/* Mode */}
              <View style={styles.statBox}>
                <ModeIcon size={24} color={THEME.colors.textPrimary} style={styles.statIcon} />
                <Text style={styles.statLabel}>Mode</Text>
                <Text style={styles.statValue}>{modeLabel}</Text>
              </View>

              {/* Difficulty (SOLO only) */}
              {mode === 'SOLO' && difficulty && (
                <View style={styles.statBox}>
                  <DifficultyIcon size={24} color={THEME.colors.textPrimary} style={styles.statIcon} />
                  <Text style={styles.statLabel}>Difficulté</Text>
                  <Text style={styles.statValue}>{difficulty}</Text>
                </View>
              )}

              {/* Opponent (MULTI-ONLINE only) */}
              {mode === 'MULTI-ONLINE' && opponentName && (
                <View style={styles.statBox}>
                  <Swords size={24} color={THEME.colors.textPrimary} style={styles.statIcon} />
                  <Text style={styles.statLabel}>Adversaire</Text>
                  <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">{opponentName}</Text>
                </View>
              )}
            </View>

            {/* Score calculation message */}
            <View style={styles.scoreInfo}>
              <View style={styles.scoreInfoRow}>
                <Target size={16} color={THEME.colors.neonCyan} />
                <Text style={styles.scoreInfoText}>
                  Score: {Math.max(1000 - attempts * 10 - Math.floor(timeSeconds / 2), 100)} points
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.newGameButton}
                onPress={() => {
                  if (actionTakenRef.current) return;
                  actionTakenRef.current = true;
                  onNewGame();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.colors.neonViolet, THEME.colors.primaryDark]}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonRow}><Gamepad2 size={16} color={THEME.colors.black} /><Text style={styles.buttonText}>NOUVEAU JEU</Text></View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.recordsButton}
                onPress={() => {
                  if (actionTakenRef.current) return;
                  actionTakenRef.current = true;
                  onRecords();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.colors.warning, '#ff8f1f']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonRow}><BarChart3 size={16} color={THEME.colors.black} /><Text style={styles.buttonText}>RECORDS</Text></View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  if (actionTakenRef.current) return;
                  actionTakenRef.current = true;
                  onMenu();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.colors.error, '#c4184a']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonRow}><Home size={16} color={THEME.colors.black} /><Text style={styles.buttonText}>MENU</Text></View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'visible',
  },
  glowHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    elevation: 20,
    shadowColor: THEME.colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    backgroundColor: 'transparent',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardScrollContent: {
    padding: 28,
    alignItems: 'center',
  },
  cardScrollContentCompact: {
    padding: 18,
  },
  particleField: {
    position: 'absolute',
    top: 60,
    left: '50%',
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  trophy: {
    fontSize: 80,
    marginBottom: 16,
  },
  trophyCompact: {
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: THEME.colors.neonCyan,
    marginBottom: 4,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: THEME.colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  titleCompact: {
    fontSize: 30,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  playerInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  playerLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: '40%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: THEME.colors.textPrimary,
  },
  scoreInfo: {
    backgroundColor: 'rgba(0, 242, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.neonCyan,
  },
  scoreInfoText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.neonCyan,
    letterSpacing: 0.5,
  },
  scoreInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  newGameButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: THEME.colors.neonViolet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  recordsButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: THEME.colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: THEME.colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.black,
    letterSpacing: 0.8,
  },
});
