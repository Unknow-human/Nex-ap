import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, GameAttempt, GameMode, GameDifficulty } from '../types';
import { calculerScore, calculerScoreDifficulte, genererCodeSecret, validerCode } from '../utils/gameLogic';
import { improvedArenaService } from '../services/improvedArenaService';

const GAME_STORAGE_KEY = '@nexus_arena_game_state';
const TIMER_INTERVAL = 1000; // 1 seconde
const INITIAL_TIME = 60; // 60 secondes
const HEARTBEAT_INTERVAL_MS = 8000; // Fréquence d'envoi du "je suis toujours là"
const OPPONENT_TIMEOUT_MS = 25000; // Au-delà, on considère l'adversaire déconnecté

export function useGame(
  mode: GameMode, 
  secretCode?: string, 
  arenaId?: string, 
  playerId?: string,
  difficulty?: GameDifficulty
) {
  const [gameState, setGameState] = useState<GameState>({
    mode,
    secretCode: secretCode || genererCodeSecret(),
    attempts: [],
    timeRemaining: INITIAL_TIME,
    isGameOver: false,
    isVictory: false,
    arenaId,
    playerId,
    difficulty,
    lockedPositions: difficulty === 'DEBUTANT' ? {} : undefined,
  });

  const [currentAttempt, setCurrentAttempt] = useState<string>('');
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);

  // Timer - Affichage uniquement, pas de fin de jeu
  useEffect(() => {
    if (gameState.isGameOver) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        // Ne pas terminer le jeu, juste continuer le décompte
        return { ...prev, timeRemaining: Math.max(prev.timeRemaining - 1, 0) };
      });
    }, TIMER_INTERVAL);

    return () => clearInterval(timer);
  }, [gameState.isGameOver]);

  // Sauvegarder l'état du jeu
  useEffect(() => {
    const saveGameState = async () => {
      try {
        await AsyncStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
    };

    if (gameState.attempts.length > 0) {
      saveGameState();
    }
  }, [gameState]);

  // Récupérer le code secret de l'arena en mode MULTI-ONLINE
  useEffect(() => {
    if (mode !== 'MULTI-ONLINE' || !arenaId) return;

    const loadArenaSecretCode = async () => {
      const arena = await improvedArenaService.getArena(arenaId);
      if (arena && arena.secretCode) {
        setGameState((prev) => ({
          ...prev,
          secretCode: arena.secretCode,
        }));
      }
    };

    loadArenaSecretCode();
  }, [mode, arenaId]);

  const [opponentAttempts, setOpponentAttempts] = useState<GameAttempt[]>([]);
  // Empêche d'appeler claimOpponentTimeout en boucle une fois déjà déclenché.
  const timeoutClaimedRef = useRef(false);

  // Heartbeat régulier : signale au serveur (et donc à l'adversaire) que ce
  // joueur est toujours présent dans l'arène, tant que la partie n'est pas
  // terminée. Sans ça, un adversaire qui ferme l'app / perd le réseau reste
  // invisible côté serveur et l'autre joueur attend indéfiniment.
  useEffect(() => {
    if (mode !== 'MULTI-ONLINE' || !arenaId || !playerId) return;
    if (gameState.isGameOver) return;

    improvedArenaService.heartbeat(arenaId, playerId).catch(() => {});
    const interval = setInterval(() => {
      improvedArenaService.heartbeat(arenaId, playerId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [mode, arenaId, playerId, gameState.isGameOver]);

  // Écouter les changements de l'arena en mode MULTI-ONLINE
  useEffect(() => {
    if (mode !== 'MULTI-ONLINE' || !arenaId) return;

    const unsubscribe = improvedArenaService.subscribeToArena(arenaId, (arena) => {
      // Surveillance de la présence adverse : si l'adversaire n'a pas donné
      // signe de vie depuis OPPONENT_TIMEOUT_MS alors que la partie est en
      // cours, on déclare l'abandon à sa place (déconnexion "sale" : app
      // fermée, crash, perte réseau — pas un clic volontaire sur Quitter,
      // déjà géré par leaveArena).
      if (
        arena.status === 'playing' &&
        !arena.winnerId &&
        !timeoutClaimedRef.current &&
        Array.isArray(arena.players) &&
        arena.players.length >= 2
      ) {
        const opponent = arena.players.find((p: any) => p.id !== playerId);
        if (opponent) {
          const opponentLastSeen = opponent.lastSeen || opponent.joinedAt || 0;
          if (Date.now() - opponentLastSeen > OPPONENT_TIMEOUT_MS) {
            timeoutClaimedRef.current = true;
            improvedArenaService
              .claimOpponentTimeout(arenaId, playerId as string, opponent.id)
              .catch(() => {
                timeoutClaimedRef.current = false;
              });
          }
        }
      }

      if (arena.attempts) {
        const playerAttempts = arena.attempts
          .filter((a: any) => a.playerId === playerId)
          .map((a: any) => ({
            code: a.code,
            bp: a.bp,
            mp: a.mp,
            timestamp: a.timestamp,
          }));

        const otherAttempts = arena.attempts
          .filter((a: any) => a.playerId !== playerId)
          .map((a: any) => ({
            code: a.code,
            bp: a.bp,
            mp: a.mp,
            timestamp: a.timestamp,
          }));

        setGameState((prev) => {
          // Ne jamais faire régresser la liste de tentatives du joueur
          // courant : un event realtime déclenche un nouveau GET (load())
          // qui peut renvoyer un instantané serveur temporairement en
          // retard sur notre propre écriture optimiste locale (RPC pas
          // encore commité côté serveur au moment du fetch). Écraser sans
          // condition faisait disparaître puis réapparaître la dernière
          // tentative du joueur à chaque event. On garde localAttempts si
          // le serveur en a (temporairement) moins que ce qu'on affiche déjà.
          const nextAttempts =
            playerAttempts.length >= prev.attempts.length ? playerAttempts : prev.attempts;

          // Si l'arène est marquée terminée, refléter le résultat ici aussi
          // (sans écraser un état déjà connu localement) :
          //  - l'adversaire a gagné normalement (4/4) → défaite classique.
          //  - l'adversaire a quitté la partie → victoire par forfait,
          //    signalée via opponentAbandoned pour un message dédié dans l'UI.
          if (arena.status === 'completed' && arena.winnerId && !prev.isGameOver) {
            if (arena.winnerId !== playerId) {
              return {
                ...prev,
                attempts: nextAttempts,
                isGameOver: true,
                isVictory: false,
              };
            }
            if (arena.winnerId === playerId && arena.abandonedBy && arena.abandonedBy !== playerId) {
              return {
                ...prev,
                attempts: nextAttempts,
                isGameOver: true,
                isVictory: true,
                opponentAbandoned: true,
              };
            }
          }
          return {
            ...prev,
            attempts: nextAttempts,
          };
        });
        setOpponentAttempts(otherAttempts);
      }
    });

    return unsubscribe;
  }, [mode, arenaId, playerId]);

  const addDigit = useCallback((digit: string) => {
    if (gameState.isGameOver) return;
    
    // En DÉBUTANT: limiter à la nombre de positions non-verrouillées
    if (difficulty === 'DEBUTANT' && gameState.lockedPositions) {
      const maxLength = 4 - Object.keys(gameState.lockedPositions).length;
      if (currentAttempt.length >= maxLength) return;
    } else {
      if (currentAttempt.length >= 4) return;
    }

    setCurrentAttempt((prev) => prev + digit);
  }, [currentAttempt.length, gameState.isGameOver, gameState.lockedPositions, difficulty]);

  const removeDigit = useCallback(() => {
    setCurrentAttempt((prev) => prev.slice(0, -1));
  }, []);

  const submitAttempt = useCallback(async () => {
    // En DÉBUTANT: attendre que toutes les positions non-verrouillées soient remplies
    if (difficulty === 'DEBUTANT' && gameState.lockedPositions) {
      const unlockedCount = 4 - Object.keys(gameState.lockedPositions).length;
      if (currentAttempt.length !== unlockedCount) return;
      // Valider que currentAttempt ne contient que des chiffres
      if (!/^\d+$/.test(currentAttempt)) return;
    } else {
      // Autres modes: 4 chiffres requis
      if (currentAttempt.length !== 4) return;
      if (!validerCode(currentAttempt)) return;
    }

    if (gameState.isGameOver) return;

    // Construire la tentative complète en mode DÉBUTANT
    let fullAttempt = currentAttempt;
    if (difficulty === 'DEBUTANT' && gameState.lockedPositions && Object.keys(gameState.lockedPositions).length > 0) {
      const fullCode = ['', '', '', ''];
      // Placer les chiffres verrouillés
      Object.entries(gameState.lockedPositions).forEach(([posStr, digit]) => {
        fullCode[parseInt(posStr)] = digit;
      });
      // Placer les nouveaux chiffres
      let newDigitIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (fullCode[i] === '') {
          fullCode[i] = currentAttempt[newDigitIdx];
          newDigitIdx++;
        }
      }
      fullAttempt = fullCode.join('');
    }

    let score;
    let revealed: number[] = [];

    // Utiliser la difficulté appropriée
    if (difficulty && ['DEBUTANT', 'NORMAL', 'EXPERT', 'IMPOSSIBLE'].includes(difficulty)) {
      const result = calculerScoreDifficulte(fullAttempt, gameState.secretCode, difficulty, gameState.attempts);
      score = { bp: result.bp, mp: result.mp };
      if (result.revealedPositions) {
        revealed = result.revealedPositions;
        setRevealedPositions(revealed);
      }
    } else {
      score = calculerScore(fullAttempt, gameState.secretCode);
    }

    const attempt: GameAttempt = {
      code: fullAttempt,
      bp: score.bp,
      mp: score.mp,
      timestamp: Date.now(),
    };

    // Vérifier la victoire
    if (score.bp === 4) {
      setGameState((prev) => ({
        ...prev,
        attempts: [...prev.attempts, attempt],
        isGameOver: true,
        isVictory: true,
      }));

      // En mode MULTI-ONLINE : envoyer le coup gagnant et clore la partie
      // côté serveur pour que l'adversaire soit notifié en temps réel.
      if (mode === 'MULTI-ONLINE' && arenaId && playerId) {
        await improvedArenaService.addAttempt(arenaId, playerId, { code: fullAttempt, ...score });
        await improvedArenaService.completeArena(arenaId, playerId);
      }
    } else {
      // En DÉBUTANT: mettre à jour les positions verrouillées
      if (difficulty === 'DEBUTANT' && revealed.length > 0) {
        const newLockedPositions = { ...gameState.lockedPositions };
        revealed.forEach((pos) => {
          newLockedPositions[pos] = fullAttempt[pos];
        });
        
        setGameState((prev) => ({
          ...prev,
          attempts: [...prev.attempts, attempt],
          lockedPositions: newLockedPositions,
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          attempts: [...prev.attempts, attempt],
        }));
      }

      // En mode MULTI-ONLINE, sauvegarder sur Firestore
      if (mode === 'MULTI-ONLINE' && arenaId && playerId) {
        await improvedArenaService.addAttempt(arenaId, playerId, { code: fullAttempt, ...score });
      }
    }

    setCurrentAttempt('');
  }, [currentAttempt, gameState.secretCode, gameState.isGameOver, gameState.attempts, gameState.lockedPositions, mode, arenaId, playerId, difficulty]);

  const resetGame = useCallback(() => {
    const newSecretCode = mode === 'SOLO' || mode === 'MULTI-LOCAL' 
      ? genererCodeSecret() 
      : gameState.secretCode;
    
    setGameState({
      mode,
      secretCode: newSecretCode,
      attempts: [],
      timeRemaining: INITIAL_TIME,
      isGameOver: false,
      isVictory: false,
      arenaId: mode === 'MULTI-ONLINE' ? arenaId : undefined,
      playerId: mode === 'MULTI-ONLINE' ? playerId : undefined,
      difficulty,
      lockedPositions: difficulty === 'DEBUTANT' ? {} : undefined,
    });
    setCurrentAttempt('');
    setRevealedPositions([]);
    setOpponentAttempts([]);
  }, [mode, arenaId, playerId, gameState.secretCode, difficulty]);

  return {
    gameState,
    currentAttempt,
    revealedPositions,
    opponentAttempts,
    addDigit,
    removeDigit,
    submitAttempt,
    resetGame,
  };
}
