import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Platform,
    StatusBar,
} from 'react-native';
import { useGame } from '../hooks/useGame';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChat } from '../hooks/useChat';
import { authService } from '../services/authService';
import { arenaChatService } from '../services/supabase';
import { improvedArenaService } from '../services/improvedArenaService';
import { matchmakingService } from '../services/matchmaking';
import { messageCleanupService } from '../services/messageCleanupService';
import { recordsPersistenceService } from '../services/recordsPersistence';
import { statsService } from '../services/statsService';
import { THEME } from '../theme';
import { GameDifficulty, GameMode } from '../types';
import { genererCodeSecret } from '../utils/gameLogic';
import { ArenaDifficultySelectionScreen, ArenaWaitingForDifficultyScreen } from './game/ArenaDifficultyScreens';
import { DifficultySelectionScreen } from './game/DifficultySelectionScreen';
import { LocalPlayerSelectionScreen } from './game/LocalPlayerSelectionScreen';
import { MainGameScreen } from './game/MainGameScreen';
import { ModeSelectionScreen } from './game/ModeSelectionScreen';
import { WaitingRoomScreen } from './game/WaitingRoomScreen';

const AGENT_NAME_KEY = '@nexus_arena_agent_name';
const ARENA_STATE_KEY = '@nexus_arena_state'; // Pour synchroniser l'état d'arène
const INITIAL_TIME = 9999; // Sans limite réelle

export function GameScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [agentName, setAgentName] = useState<string>('');
  const [mode, setMode] = useState<GameMode>('SOLO');
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [arenaId, setArenaId] = useState<string>('');
  const [showArenaInput, setShowArenaInput] = useState(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [arenaPlayers, setArenaPlayers] = useState<string[]>([]);
  const prevArenaPlayersCountRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  // Feature flag: Online arena functionality enabled
  const ONLINE_ENABLED = true;

  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [showLocalPlayerSelection, setShowLocalPlayerSelection] = useState(false);
  const [localPlayer1, setLocalPlayer1] = useState<string>('');
  const [localPlayer2, setLocalPlayer2] = useState<string>('');
  const [currentLocalPlayer, setCurrentLocalPlayer] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isOwn: boolean;
  }>>([]);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchPoolId, setMatchPoolId] = useState<string>('');
  const [matchmakingAttempts, setMatchmakingAttempts] = useState(0);
  const [sharedSecretCode, setSharedSecretCode] = useState<string>('');
  const [isArenaCreator, setIsArenaCreator] = useState(false);
  const [sharedAttempts, setSharedAttempts] = useState<any[]>([]);
  const [showDifficultySelection, setShowDifficultySelection] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('NORMAL');
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [isCreatingArena, setIsCreatingArena] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [arenaGameActive, setArenaGameActive] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(-100)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const abandonButtonAnim = useRef(new Animated.Value(1)).current;
  // Feedback néon : pulse cyan sur bonne réponse, glitch sur mauvaise réponse
  const feedbackGlowAnim = useRef(new Animated.Value(0)).current;
  const feedbackShakeAnim = useRef(new Animated.Value(0)).current;
  
  // Waiting Room animations
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  const { gameState, currentAttempt, revealedPositions, opponentAttempts, addDigit, removeDigit, submitAttempt, resetGame } = useGame(
    mode,
    mode === 'MULTI-LOCAL' ? sharedSecretCode : undefined,
    mode === 'MULTI-ONLINE' ? arenaId : undefined,
    mode === 'MULTI-ONLINE' ? playerId : undefined,
    selectedDifficulty
  );

  const { sendMessage } = useChat(agentName);

  useEffect(() => {
    const init = () => {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          setPlayerId(user.uid);
        } else {
          setPlayerId(`player_${Date.now()}`);
        }
      } catch {
        setPlayerId(`player_${Date.now()}`);
      }

      loadAgentName();
      animateEntrance();
    };

    init();
  }, []);

  // Vérifier la connectivité périodiquement pour désactiver les actions réseau si hors-ligne
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const online = await authService.isOnline();
        if (mounted) setIsConnected(online);
      } catch (e) {
        if (mounted) setIsConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.colors.bgPrimary, false);
      StatusBar.setBarStyle('dark-content');
      StatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    if (gameState.attempts.length > 0) {
      triggerPulseAnimation();
    }
  }, [gameState.attempts.length]);

  useEffect(() => {
    const handleVictory = async () => {
      if (!gameState.isVictory || !agentName) return;

      // Calculer le temps en secondes
      const elapsedTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;

      // En mode SOLO, sauvegarder le record OFFLINE d'abord, puis tenter la synchro
      if (mode === 'SOLO') {
        const recordPayload = {
          agentName,
          attempts: gameState.attempts.length,
          time: elapsedTime,
          mode: 'SOLO' as GameMode,
          difficulty: selectedDifficulty as GameDifficulty | undefined,
          timestamp: Date.now(),
        };

        try {
          await recordsPersistenceService.queueRecord(recordPayload);
          // Essayer de synchroniser en arrière-plan (si réseau dispo)
          recordsPersistenceService
            .trySyncPendingRecords()
            .then(({ synced, remaining }) => {
              if (synced > 0) {
                console.log(
                  `✅ Records synchronisés: ${synced}, en attente: ${remaining}`
                );
              }
            })
            .catch((err) => {
              console.warn('Erreur sync records (background):', err);
            });
        } catch (error) {
          console.warn('Erreur enregistrement record local:', error);
        }

        // ELO SOLO (converti en score, jamais de perte) + streaks — non
        // bloquant : une erreur ici ne doit jamais gâcher l'écran de victoire.
        if (playerId && selectedDifficulty) {
          statsService.recordSoloResult(playerId, selectedDifficulty as GameDifficulty, gameState.attempts.length);
        }
      }

      // En mode MULTI (local ou online), sauvegarder un record d'arène pour le vainqueur
      // — sauf victoire par forfait (adversaire parti) : ce n'est pas une
      // vraie résolution du code, on ne veut pas polluer les classements
      // de temps/tentatives avec ça.
      if ((mode === 'MULTI-ONLINE' || mode === 'MULTI-LOCAL') && !gameState.opponentAbandoned) {
        // Déterminer le nom de l'adversaire si possible
        const computedOpponent = opponentName || (localPlayer1 && localPlayer2 ? (localPlayer1 === agentName ? localPlayer2 : localPlayer1) : undefined);

        const recordPayload = {
          agentName,
          attempts: gameState.attempts.length,
          time: elapsedTime,
          mode: mode as GameMode,
          difficulty: selectedDifficulty as GameDifficulty | undefined,
          opponentName: computedOpponent,
          timestamp: Date.now(),
        };

        try {
          await recordsPersistenceService.queueRecord(recordPayload);
          recordsPersistenceService.trySyncPendingRecords().catch((err) => {
            console.warn('Erreur sync records (background):', err);
          });
        } catch (error) {
          console.warn('Erreur enregistrement record d\'arène local:', error);
        }
      }

      if (mode === 'MULTI-ONLINE' || mode === 'MULTI-LOCAL') {
        // ELO / streaks — non bloquant. On les crédite même en cas
        // d'abandon adverse : la victoire compte pour le classement.
        if (mode === 'MULTI-ONLINE' && arenaId) {
          // Idempotent côté serveur : peut être appelé par les deux clients
          // sans risque de double comptage (voir supabase/schema.sql).
          statsService.recordMatchResult(arenaId);
        } else if (mode === 'MULTI-LOCAL' && playerId) {
          // Pas d'ELO/win_streak fiable pour des joueurs locaux sans compte
          // séparé (voir commentaire dans schema.sql) — uniquement le streak
          // quotidien de l'appareil/compte connecté.
          statsService.touchDailyStreak(playerId);
        }
      }

      // Message dédié quand la victoire vient d'un abandon adverse
      if (gameState.opponentAbandoned) {
        Alert.alert('⚔️ Victoire par forfait', 'Ton adversaire a quitté la partie — la manche te revient !');
      }

      // Afficher la modal victoire au lieu d'une Alert
      setShowVictoryModal(true);
    };

    handleVictory();
  }, [gameState.isGameOver, gameState.isVictory, gameState.opponentAbandoned, agentName, gameStartTime, mode, selectedDifficulty, gameState.attempts.length, resetGame, navigation, setShowModeSelection]);

  // Animer le modal quand il s'ouvre/se ferme
  useEffect(() => {
    if (showArenaInput) {
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showArenaInput]);

  // Animer les points de chargement du waiting room
  useEffect(() => {
    if (showWaitingRoom) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim1, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showWaitingRoom]);

  // Animer l'opacité du waiting room pour éviter un écran blanc si l'animation était à 0
  useEffect(() => {
    if (showWaitingRoom) {
      // reset to 0 then animate in for a smooth entrance
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    // Pas de fade-out ici : fadeAnim est partagé avec les écrans suivants
    // (ModeSelectionScreen, etc.) qui pilotent eux-mêmes leur entrée via
    // animateEntrance(). Le faire disparaître ici entrait en conflit avec
    // cette animation d'entrée et laissait l'écran de destination invisible
    // (juste le fond bleu du gradient, sans aucun contenu visible).
  }, [showWaitingRoom]);

  // Synchroniser l'état d'arène en temps réel pendant le waiting room
  useEffect(() => {
    if (!showWaitingRoom || !arenaId) return;
    
    const syncArenaState = async () => {
      try {
        const arenaStateStr = await AsyncStorage.getItem(ARENA_STATE_KEY);
        if (arenaStateStr) {
          const arenaState = JSON.parse(arenaStateStr);
          
          // Vérifier que c'est la bonne arène
          if (arenaState.arenaId === arenaId) {
            // Mettre à jour la liste de joueurs
            const playerNames = arenaState.players.map((p: any) => p.name);
            setArenaPlayers(playerNames);
          }
        }
      } catch (error) {
        console.warn('Erreur sync arena:', error);
      }
    };
    
    // Sync immédiat et tous les 500ms
    syncArenaState();
    const interval = setInterval(syncArenaState, 500);
    
    return () => clearInterval(interval);
  }, [showWaitingRoom, arenaId]);

  // Animer l'écran de sélection des joueurs LOCAL
  useEffect(() => {
    if (showLocalPlayerSelection) {
      slideInAnim.setValue(-100);
      Animated.parallel([
        Animated.timing(slideInAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLocalPlayerSelection]);

  // Animer l'écran de sélection de difficulté SOLO
  useEffect(() => {
    if (showDifficultySelection) {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
      rotateAnim.setValue(0);
      
      // Animation de rotation infinie
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
      
      // Animations d'entrée
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      fadeAnim.setValue(1);
    }
  }, [showDifficultySelection]);

  // Synchroniser les tentatives avec l'historique partagé en mode LOCAL
  useEffect(() => {
    if (mode === 'MULTI-LOCAL') {
      setSharedAttempts(gameState.attempts);
    }
  }, [gameState.attempts, mode]);

  // Feedback visuel néon après chaque tentative : pulse cyan (bonne réponse
  // = au moins un chiffre bien placé) ou glitch (mauvaise réponse = rien de correct)
  useEffect(() => {
    if (gameState.attempts.length === 0) return;
    const lastAttempt = gameState.attempts[gameState.attempts.length - 1];

    if (lastAttempt.bp > 0) {
      feedbackGlowAnim.setValue(0);
      Animated.sequence([
        Animated.timing(feedbackGlowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(feedbackGlowAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      feedbackShakeAnim.setValue(0);
      Animated.sequence([
        // useNativeDriver: false ici — ce Animated.Value pilote le même
        // noeud (codeInputBox) que feedbackGlowAnim (borderColor/shadowOpacity),
        // qui lui NE PEUT PAS utiliser le native driver (couleurs non supportées).
        // Mélanger native:true et native:false sur un même noeud provoque le
        // crash "Attempting to run JS driven animation on animated node that
        // has been moved to native".
        Animated.timing(feedbackShakeAnim, { toValue: 1, duration: 45, useNativeDriver: false }),
        Animated.timing(feedbackShakeAnim, { toValue: -1, duration: 45, useNativeDriver: false }),
        Animated.timing(feedbackShakeAnim, { toValue: 0.6, duration: 45, useNativeDriver: false }),
        Animated.timing(feedbackShakeAnim, { toValue: -0.6, duration: 45, useNativeDriver: false }),
        Animated.timing(feedbackShakeAnim, { toValue: 0, duration: 45, useNativeDriver: false }),
      ]).start();
    }
  }, [gameState.attempts.length]);

  // Les tentatives ne sont plus envoyées au chat public
  // Elles restent privées dans l'historique du jeu

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerPulseAnimation = () => {
    pulseAnim.setValue(1);
    Animated.sequence([
      // useNativeDriver: false — même raison que feedbackShakeAnim ci-dessus :
      // pulseAnim pilote le transform "scale" du même noeud (codeInputBox)
      // que feedbackGlowAnim (borderColor/shadowOpacity, natif impossible).
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateButtonPress = () => {
    buttonScaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadAgentName = async () => {
    try {
      const saved = await AsyncStorage.getItem(AGENT_NAME_KEY);
      if (saved) {
        setAgentName(saved);
        return;
      }

      // Aucun nom local -> essayer de dériver depuis l'utilisateur (online ou cache)
      try {
        const currentUser = authService.getCurrentUser();
        let name: string | null = null;

        if (currentUser && (currentUser as any).displayName) {
          name = (currentUser as any).displayName;
        } else {
          // getEffectiveUser covers the offline cached email/uid case
          const effective = await authService.getEffectiveUser();
          if (effective && effective.email) {
            name = effective.email.split('@')[0];
          } else if (effective && effective.uid) {
            name = `Player_${(effective.uid || '').slice(-6)}`;
          }
        }

        if (name) {
          setAgentName(name);
          // Persist for offline reuse
          try { await AsyncStorage.setItem(AGENT_NAME_KEY, name); } catch (e) { /* ignore */ }
        } else {
          // Aucun nom disponible, générer un nom temporaire non bloquant
          const gen = `Agent_${String(Date.now()).slice(-4)}`;
          setAgentName(gen);
          try { await AsyncStorage.setItem(AGENT_NAME_KEY, gen); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.warn('[GameScreen] Impossible de dériver le nom depuis l\'utilisateur:', err);
        const gen = `Agent_${String(Date.now()).slice(-4)}`;
        setAgentName(gen);
        try { await AsyncStorage.setItem(AGENT_NAME_KEY, gen); } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Vérifier si on peut soumettre la tentative (adapté à la difficulté)
  const canSubmitAttempt = () => {
    if (gameState.isGameOver) return false;
    
    if (selectedDifficulty === 'DEBUTANT' && gameState.lockedPositions) {
      const requiredLength = 4 - Object.keys(gameState.lockedPositions).length;
      return currentAttempt.length === requiredLength;
    }
    
    return currentAttempt.length === 4;
  };

  const handleModeSelect = (selectedMode: GameMode) => {
    // Réinitialiser l'état avant de commencer
    resetGame();
    setChatMessages([]);
    setOpponentName('');
    setArenaId('');
    setShowArenaInput(false);
    
    if (selectedMode === 'MULTI-LOCAL') {
      // Afficher l'écran de sélection des joueurs locaux
      setShowModeSelection(false);
      setShowLocalPlayerSelection(true);
    } else if (selectedMode === 'MULTI-ONLINE') {
      // Bloquer l'accès à l'arène si hors-ligne
      if (!isConnected) {
        Alert.alert('Hors‑ligne', 'Le mode ARÈNE nécessite une connexion Internet. Connectez‑vous pour jouer en ligne.');
        return;
      }
      setShowModeSelection(false);
      setShowArenaInput(true);
    } else if (selectedMode === 'SOLO') {
      // Afficher la sélection de difficulté
      setMode(selectedMode);
      setShowModeSelection(false);
      setShowDifficultySelection(true);
    }
  };

  const handleStartSoloGame = async (difficulty: GameDifficulty) => {
    setSelectedDifficulty(difficulty);
    setGameStartTime(Date.now());
    
    // Si c'est un mode multijoueur en ligne, synchroniser la difficulté
    if (mode === 'MULTI-ONLINE' && arenaId && isArenaCreator) {
      try {
        await improvedArenaService.updateDifficulty(arenaId, difficulty);
      } catch (error) {
        console.error('Erreur mise à jour difficulté:', error);
      }
    }
    
    setShowDifficultySelection(false);
    resetGame();
  };

  const handleStartRandomMatch = async () => {
    try {
      if (!isConnected) {
        Alert.alert('Hors‑ligne', 'La recherche d\'adversaire nécessite une connexion Internet.');
        return;
      }
      setIsMatchmaking(true);
      const poolId = await matchmakingService.joinMatchPool(playerId, agentName);
      setMatchPoolId(poolId);

      // Rechercher un adversaire toutes les 2 secondes pendant 60 secondes max
      let found = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!found && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
        setMatchmakingAttempts(attempts);

        const match = await matchmakingService.findOpponent(playerId, poolId);
        if (match) {
          setArenaId(match.id);
          setOpponentName(match.player2.playerName);
          setMode('MULTI-ONLINE');
          setShowModeSelection(false);
          setIsMatchmaking(false);
          found = true;

          Alert.alert(
            '🎮 MATCH TROUVÉ',
            `Adversaire: ${match.player2.playerName}\nQuasi prêt !`,
            [{ text: 'OK' }]
          );
        }
      }

      if (!found) {
        setIsMatchmaking(false);
        await matchmakingService.leaveMatchPool(poolId);
        Alert.alert('TIMEOUT', 'Aucun adversaire disponible. Réessayez.');
      }
    } catch (error) {
      setIsMatchmaking(false);
      console.error('Erreur matchmaking:', error);
      Alert.alert('ERREUR', 'Erreur lors de la recherche d\'adversaire');
    }
  };

  // Alerter quand un adversaire quitte la salle d'attente (le nombre de
  // joueurs baisse pendant qu'on attend encore) — corrige le fait que
  // l'autre joueur restait bloqué sans savoir que la salle s'était vidée.
  useEffect(() => {
    if (showWaitingRoom) {
      if (prevArenaPlayersCountRef.current === 2 && arenaPlayers.length === 1) {
        Alert.alert('👋 Joueur parti', 'L\'autre joueur a quitté la salle d\'attente.');
      }
      prevArenaPlayersCountRef.current = arenaPlayers.length;
    } else {
      prevArenaPlayersCountRef.current = 0;
    }
  }, [arenaPlayers.length, showWaitingRoom]);

  const handleJoinArena = async (arenaIdOverride?: string) => {
    const targetArenaId = arenaIdOverride ?? arenaId;

    if (!isConnected) {
      Alert.alert('Hors‑ligne', 'Le mode ARÈNE nécessite une connexion Internet.');
      return;
    }

    if (!targetArenaId.trim()) {
      Alert.alert('⚠️', 'Entrez un ID de salle');
      return;
    }
    if (!agentName.trim()) return;
    
    try {
      // Rejoindre l'arena
      const result = await improvedArenaService.joinArena(targetArenaId.trim().toUpperCase(), playerId, agentName);
      
      if (!result) {
        Alert.alert('⚠️ ERREUR', 'Cette salle n\'existe pas ou a expiré');
        setArenaId('');
        return;
      }
      
      // Mettre à jour l'état local
      setMode('MULTI-ONLINE');
      setArenaId(targetArenaId.trim().toUpperCase());
      setArenaPlayers(result.players.map((p: any) => p.name));
      setIsArenaCreator(false);
      setSharedSecretCode(result.secretCode);
      setShowWaitingRoom(true);
      setShowArenaInput(false);
      setShowModeSelection(false);
      
      // Notification succès amicale
      Alert.alert(
        '✅ TU ES DANS LA PARTIE !',
        `Salle: ${targetArenaId.trim().toUpperCase()}\n\n👥 ${result.players.length} joueur${result.players.length > 1 ? 's' : ''}\n\n⏳ Attends le créateur pour lancer...`,
        [{ text: 'ALLONS-Y!' }]
      );
      
      // S'abonner aux changements en temps réel
      try {
        const unsub = improvedArenaService.subscribeToArena(targetArenaId.trim().toUpperCase(), (arenaData) => {
          setArenaPlayers(arenaData.players.map((p: any) => p.name));
          setSharedSecretCode(arenaData.secretCode);

          // Propagation de l'état de jeu : si le créateur a lancé la partie
          if (arenaData.status === 'playing') {
            setArenaGameActive(true);
            setShowWaitingRoom(false);
            setShowModeSelection(false);

            // Si la difficulté est déjà définie, démarrer la partie pour le joueur
            if (arenaData.difficulty) {
              setSelectedDifficulty(arenaData.difficulty as GameDifficulty);
              setShowDifficultySelection(false);
              setGameStartTime(arenaData.gameStartedAt || Date.now());
              resetGame();
            } else {
              // En attente que le créateur choisisse la difficulté
              setShowDifficultySelection(true);
            }
          }
        });

        // Sauvegarder unsubscribe pour cleanup
        (global as any).__lastArenaUnsub = unsub;
      } catch (e) {
        console.warn('Erreur abonnement arena:', e);
      }
    } catch (error) {
      console.error('Erreur rejoindre arena:', error);
      Alert.alert('⚠️ ERREUR', 'Impossible de rejoindre la salle');
    }
  };

  const handleStartLocalGame = () => {
    if (localPlayer1.trim() && localPlayer2.trim()) {
      const secretCode = genererCodeSecret();
      setSharedSecretCode(secretCode);
      setSharedAttempts([]);
      setMode('MULTI-LOCAL');
      setCurrentLocalPlayer(localPlayer1);
      setOpponentName(localPlayer2);
      setShowLocalPlayerSelection(false);
      setShowModeSelection(false);
    }
  };

  // Auto-rejoindre une arène lorsqu'on arrive depuis un défi ami accepté
  // (voir FriendsScreen.tsx → navigation.navigate('Game', { joinArenaId })).
  useEffect(() => {
    const targetId = route.params?.joinArenaId as string | undefined;
    if (targetId && agentName.trim() && isConnected) {
      handleJoinArena(targetId);
      navigation.setParams({ joinArenaId: undefined });
    }
  }, [route.params?.joinArenaId, agentName, isConnected]);

  // ✅ S'abonner au chat de l'arène en MULTI-ONLINE
  useEffect(() => {
    if (mode !== 'MULTI-ONLINE' || !arenaId) return;

    console.log('📢 [GameScreen] S\'abonnement au chat de l\'arène:', arenaId);

    const unsubscribe = arenaChatService.subscribeToArenaChat(arenaId, (messages) => {
      console.log('💬 [GameScreen] Messages reçus:', messages);
      const formattedMessages = messages.map((msg: any) => ({
        id: msg.id || `${msg.playerId}_${msg.timestamp}`,
        sender: msg.playerName || 'Inconnu',
        text: msg.message,
        timestamp: msg.timestamp,
        // ⚠️ Comparer par playerId (unique) et non par playerName : deux joueurs
        // peuvent choisir le même pseudo, ce qui inversait/mélangeait les bulles.
        isOwn: msg.playerId === playerId,
      }));
      setChatMessages(formattedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [mode, arenaId, agentName]);

  const handleCreateArena = async () => {
    if (!isConnected) {
      Alert.alert('Hors‑ligne', 'La création d\'arène nécessite une connexion Internet.');
      return;
    }

    if (!agentName.trim() || isCreatingArena) return;
    
    setIsCreatingArena(true);
    try {
      console.log('🎮 [GameScreen] Création arène pour:', { playerId, agentName });
      console.log('🔍 [GameScreen] Vérification auth avant création...');
      
      // Créer l'arène sur Firebase directement
      const { arenaId: newArenaId, secretCode } = await improvedArenaService.createArena(playerId, agentName);
      
      console.log('✅ [GameScreen] Arène créée:', { newArenaId, secretCode });
      
      // Mettre à jour l'état local
      setArenaId(newArenaId);
      setIsArenaCreator(true);
      setMode('MULTI-ONLINE');
      setSharedSecretCode(secretCode);
      setShowArenaInput(false);
      setShowModeSelection(false);

      // Initialiser liste de joueurs et sauvegarder l'état local pour la waiting room
      const initialPlayers = [{ id: playerId, name: agentName, joinedAt: Date.now() }];
      setArenaPlayers([agentName]);

      const arenaState = {
        arenaId: newArenaId,
        players: initialPlayers,
        secretCode,
        creatorId: playerId,
        createdAt: Date.now(),
      };
      try {
        await AsyncStorage.setItem(ARENA_STATE_KEY, JSON.stringify(arenaState));
      } catch (e) {
        console.warn('Erreur sauvegarde état arène local:', e);
      }

      // S'abonner aux changements de l'arena en temps réel (avant affichage)
      const unsubArena = improvedArenaService.subscribeToArena(newArenaId, async (arenaData) => {
        console.log('🔄 [GameScreen] Arena mise à jour:', arenaData);
        if (arenaData.players) {
          const playerNames = arenaData.players.map((p: any) => p.name);
          setArenaPlayers(playerNames);

          // Mettre à jour aussi le stockage local pour la sync
          const updatedState = {
            arenaId: newArenaId,
            players: arenaData.players,
            secretCode: arenaData.secretCode || secretCode,
            creatorId: arenaData.creatorId || playerId,
            updatedAt: Date.now(),
          };
          try {
            await AsyncStorage.setItem(ARENA_STATE_KEY, JSON.stringify(updatedState));
          } catch (err) {
            console.warn('Erreur mise à jour état arène local:', err);
          }

          // Si le créateur déclenche le démarrage (status playing), synchroniser le flux localement
          if (arenaData.status === 'playing') {
            setArenaGameActive(true);

            // Si la difficulté a été définie dans Firestore (par ex. second click), mettre à jour localement
            if (arenaData.difficulty) {
              setSelectedDifficulty(arenaData.difficulty as GameDifficulty);
              setShowDifficultySelection(false);
              setShowWaitingRoom(false);
              setGameStartTime(arenaData.gameStartedAt || Date.now());
              resetGame();
            } else {
              // Attente que le créateur choisisse la difficulté
              setShowDifficultySelection(true);
            }
          }
        }
      });

      // Afficher la waiting room
      setShowWaitingRoom(true);

      // Garder l'unsubscribe pour cleanup si nécessaire
      // (on l'utilisera via handleBackToMenu pour annuler l'abonnement)
      (global as any).__lastArenaUnsub = unsubArena;

      // Notification succès avec message de partage amical
      const downloadLink = 'https://nexus-arena-118r.onrender.com/';
      const joinLink = `${downloadLink}?arena=${encodeURIComponent(newArenaId)}`;
      const shareMessage = `🎮 NEXUS ARENA - ${newArenaId}\n\nRejoins via ce lien:\n${joinLink}\n\nTu n\'as pas l\'app ? Télécharge-la ici:\n${downloadLink}`;

      Alert.alert(
        '✅ ARÈNE CRÉÉE ! LET\'S GOOOO',
        `🎮 ID ARÈNE:\n${newArenaId}\n\n🔐\n\n⏳ En attente d\'un adversaire...`,
        [
          {
            text: '📋 COPIER INVITE',
            onPress: async () => {
              await Clipboard.setStringAsync(shareMessage);
              Alert.alert('✅ COPIÉ !', 'Message de partage copié. Envoie-le à tes amis !');
            },
          },
          {
            text: '🆔 COPIER ID',
            onPress: async () => {
              await Clipboard.setStringAsync(joinLink);
              Alert.alert('✅ LIEN COPIÉ !', 'Le lien pour rejoindre l\'arène est dans le presse-papiers. Partage-le !');
            },
          },
          {
            text: 'FERMER',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ [GameScreen] Erreur création arena:', error);
      console.error('Détails erreur:', { 
        message: error.message, 
        code: error.code,
        stack: error.stack 
      });
      const errorMsg = error.code === 'permission-denied' 
        ? 'Problème de permission Firebase. Vérifiez votre connexion.'
        : error.message;
      Alert.alert('⚠️ ERREUR CRÉATION', `${errorMsg}\n\nVérifiez la console (F12) pour plus de détails.`, [
        { text: 'OK' }
      ]);
    } finally {
      setIsCreatingArena(false);
    }
  };

  const handleBackToMenu = async () => {
    // Notifier le serveur qu'on quitte, pour que l'adversaire ne reste pas
    // bloqué indéfiniment (salle d'attente : mise à jour de la liste des
    // joueurs ; partie en cours : victoire attribuée à l'adversaire restant).
    if (mode === 'MULTI-ONLINE' && arenaId && playerId) {
      improvedArenaService.leaveArena(arenaId, playerId).catch((err) => {
        console.warn('Erreur leaveArena:', err);
      });
    }

    // Nettoyer les messages du duel si mode MULTI-ONLINE
    if (mode === 'MULTI-ONLINE' && arenaId) {
      try {
        await messageCleanupService.cleanupArenaChatMessages(arenaId);
      } catch (error) {
        console.warn('Erreur cleanup arena chat:', error);
      }
    }

    // Supprimer l'état local de l'arène
    try {
      await AsyncStorage.removeItem(ARENA_STATE_KEY);
    } catch (err) {
      console.warn('Erreur suppression état arène local:', err);
    }

    // Annuler l'abonnement si présent
    try {
      const unsub = (global as any).__lastArenaUnsub;
      if (typeof unsub === 'function') unsub();
      (global as any).__lastArenaUnsub = null;
    } catch (err) {
      // ignore
    }

    // Nettoyer complètement l'état du jeu
    setShowModeSelection(true);
    setMode('SOLO');
    setArenaId('');
    setShowArenaInput(false);
    setShowWaitingRoom(false);
    setShowLocalPlayerSelection(false);
    setShowDifficultySelection(false);
    // Correctif : cet état n'était jamais remis à false ici. En restant à
    // `true` après un retour au menu, il pouvait faire sauter l'écran de
    // sélection de difficulté lors d'une arène suivante dans la même
    // session (condition `arenaGameActive` à tort déjà vraie).
    setArenaGameActive(false);
    setIsMatchmaking(false);
    setMatchPoolId('');
    setMatchmakingAttempts(0);
    setChatMessages([]);
    setOpponentName('');
    setCurrentLocalPlayer('');
    setLocalPlayer1('');
    setLocalPlayer2('');
    setArenaPlayers([]);
    setSharedSecretCode('');
    setIsArenaCreator(false);
    resetGame();
    animateEntrance();
  };

  // Rendre le code "EN COURS" avec révélation progressive en DEBUTANT
  const getRevealedCode = () => {
    // En mode DEBUTANT avec positions verrouillées
    if (selectedDifficulty === 'DEBUTANT' && gameState.lockedPositions && Object.keys(gameState.lockedPositions).length > 0) {
      const display = ['·', '·', '·', '·'];
      
      // Placer les chiffres verrouillés
      Object.entries(gameState.lockedPositions).forEach(([posStr, digit]) => {
        display[parseInt(posStr)] = digit;
      });
      
      // Placer les nouveaux chiffres en cours
      let newDigitIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (display[i] === '·' && newDigitIdx < currentAttempt.length) {
          display[i] = currentAttempt[newDigitIdx];
          newDigitIdx++;
        }
      }
      
      return display.join(' ');
    }

    // En mode DEBUTANT sans positions verrouillées encore
    if (!currentAttempt || currentAttempt.length === 0) {
      return '- - - -';
    }

    // Affichage normal
    return currentAttempt.split('').join(' ').padEnd(7, '·');
  };

  // Écran de sélection des joueurs pour mode LOCAL
  if (showLocalPlayerSelection) {
    return (
      <LocalPlayerSelectionScreen
        scaleAnim={scaleAnim}
        fadeAnim={fadeAnim}
        slideInAnim={slideInAnim}
        buttonScaleAnim={buttonScaleAnim}
        localPlayer1={localPlayer1}
        setLocalPlayer1={setLocalPlayer1}
        localPlayer2={localPlayer2}
        setLocalPlayer2={setLocalPlayer2}
        onStartLocalGame={handleStartLocalGame}
        onBack={() => {
          setShowLocalPlayerSelection(false);
          setShowModeSelection(true);
          setLocalPlayer1('');
          setLocalPlayer2('');
        }}
      />
    );
  }

  if (showDifficultySelection && mode !== 'MULTI-ONLINE') {
    return (
      <DifficultySelectionScreen
        scaleAnim={scaleAnim}
        fadeAnim={fadeAnim}
        onSelectDifficulty={handleStartSoloGame}
        onBack={() => {
          setShowDifficultySelection(false);
          setShowModeSelection(true);
        }}
      />
    );
  }

  // Si on est en attente de sélection de difficulté pour l'arène (créateur uniquement)
  if (showDifficultySelection && mode === 'MULTI-ONLINE' && isArenaCreator && arenaGameActive) {
    return (
      <ArenaDifficultySelectionScreen
        fadeAnim={fadeAnim}
        onDifficultyChosen={async (diff: GameDifficulty) => {
          setSelectedDifficulty(diff);
          try {
            if (arenaId) {
              await improvedArenaService.updateDifficulty(arenaId, diff);
            }
            setGameStartTime(Date.now());
            resetGame();
          } catch (err) {
            console.error('Erreur updateDifficulty:', err);
            Alert.alert('Erreur', 'Impossible de définir la difficulté. Réessayez.');
          } finally {
            setShowDifficultySelection(false);
          }
        }}
        onBack={() => {
          setShowDifficultySelection(false);
          setShowWaitingRoom(true);
          setArenaGameActive(false);
        }}
      />
    );
  }

  // Si le créateur sélectionne la difficulté et qu'on est joueur, afficher attente
  if (showDifficultySelection && mode === 'MULTI-ONLINE' && !isArenaCreator && arenaGameActive) {
    return (
      <ArenaWaitingForDifficultyScreen fadeAnim={fadeAnim} rotateAnim={rotateAnim} onCancel={handleBackToMenu} />
    );
  }

  if (showWaitingRoom) {
    const handleLaunchArenaGame = () => {
      if (arenaPlayers.length >= 2) {
        Animated.sequence([
          Animated.timing(buttonScaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
          Animated.timing(buttonScaleAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
          Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        setTimeout(async () => {
          setGameStartTime(Date.now());
          setArenaGameActive(true);
          setShowWaitingRoom(false);
          setShowDifficultySelection(true); // Afficher la sélection de difficulté

          // Notifier Firestore que la partie démarre (en attente de la sélection de difficulté)
          try {
            if (arenaId) {
              await improvedArenaService.startArena(arenaId);
            }
          } catch (err) {
            console.error('Erreur startArena:', err);
          }
        }, 150);
      }
    };

    return (
      <WaitingRoomScreen
        arenaId={arenaId}
        agentName={agentName}
        arenaPlayers={arenaPlayers}
        isArenaCreator={isArenaCreator}
        fadeAnim={fadeAnim}
        pulseAnim={pulseAnim}
        dotAnim1={dotAnim1}
        dotAnim2={dotAnim2}
        dotAnim3={dotAnim3}
        onLaunch={handleLaunchArenaGame}
        onCancel={handleBackToMenu}
      />
    );
  }
  if (showModeSelection) {
    return (
      <ModeSelectionScreen
        scaleAnim={scaleAnim}
        fadeAnim={fadeAnim}
        isConnected={isConnected}
        onlineEnabled={ONLINE_ENABLED}
        arenaId={arenaId}
        setArenaId={setArenaId}
        isCreatingArena={isCreatingArena}
        onSelectSolo={() => {
          setMode('SOLO');
          setShowModeSelection(false);
          setShowDifficultySelection(true);
          triggerPulseAnimation();
        }}
        onSelectLocal={() => {
          setMode('MULTI-LOCAL');
          setShowLocalPlayerSelection(true);
          setShowModeSelection(false);
        }}
        onCreateArena={handleCreateArena}
        onJoinArena={handleJoinArena}
      />
    );
  }

  // Écran de jeu - THÈME LUMINEUX MODERNE
  return (
    <MainGameScreen
      mode={mode}
      agentName={agentName}
      currentLocalPlayer={currentLocalPlayer}
      localPlayer1={localPlayer1}
      localPlayer2={localPlayer2}
      selectedDifficulty={selectedDifficulty}
      gameState={gameState}
      opponentAttempts={opponentAttempts}
      sharedAttempts={sharedAttempts}
      playerId={playerId}
      opponentName={opponentName}
      chatMessages={chatMessages}
      isConnected={isConnected}
      arenaId={arenaId}
      arenaPlayers={arenaPlayers}
      gameStartTime={gameStartTime}
      showVictoryModal={showVictoryModal}
      onlineEnabled={ONLINE_ENABLED}
      pulseAnim={pulseAnim}
      feedbackShakeAnim={feedbackShakeAnim}
      feedbackGlowAnim={feedbackGlowAnim}
      buttonScaleAnim={buttonScaleAnim}
      abandonButtonAnim={abandonButtonAnim}
      getRevealedCode={getRevealedCode}
      canSubmitAttempt={canSubmitAttempt}
      animateButtonPress={animateButtonPress}
      addDigit={addDigit}
      removeDigit={removeDigit}
      submitAttempt={submitAttempt}
      resetGame={resetGame}
      handleBackToMenu={handleBackToMenu}
      setCurrentLocalPlayer={setCurrentLocalPlayer}
      setOpponentName={setOpponentName}
      setShowVictoryModal={setShowVictoryModal}
      onGoToRecords={() => navigation.navigate('Records')}
    />
  );
}

export default GameScreen;

