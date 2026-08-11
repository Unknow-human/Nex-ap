export type GameMode = 'SOLO' | 'MULTI-LOCAL' | 'MULTI-ONLINE';
export type GameDifficulty = 'DEBUTANT' | 'NORMAL' | 'EXPERT' | 'IMPOSSIBLE';

export interface GameAttempt {
  code: string;
  bp: number; // Bien Placés
  mp: number; // Mal Placés
  timestamp: number;
}

export interface GameState {
  mode: GameMode;
  secretCode: string;
  attempts: GameAttempt[];
  timeRemaining: number;
  isGameOver: boolean;
  isVictory: boolean;
  arenaId?: string;
  playerId?: string;
  opponentId?: string;
  difficulty?: GameDifficulty;
  lockedPositions?: { [key: number]: string }; // Pour DÉBUTANT: positions verrouillées ex: { 0: "1", 1: "2" }
  /** true si la partie s'est terminée parce que l'adversaire a quitté (abandon), pas par une victoire normale. */
  opponentAbandoned?: boolean;
}

export interface ChatMessage {
  id: string;
  agentName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'combat-log' | 'audio';
  attempt?: GameAttempt;
  audioUri?: string; // URI du fichier audio pour les messages vocaux
  replyTo?: {
    id: string;
    agentName: string;
    message: string;
  }; // Réponse à un message (like WhatsApp)
}

export interface Record {
  id: string;
  agentName: string;
  attempts: number;
  time: number;
  mode: GameMode;
  difficulty?: GameDifficulty;
  opponentName?: string;
  timestamp: number;
}

export interface User {
  id: string;
  agentName: string;
  createdAt: number;
}

export interface PlayerStats {
  uid: string;
  eloRating: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  dailyStreak: number;
  bestDailyStreak: number;
}

export interface LeaderboardEntry {
  uid: string;
  agentName: string;
  eloRating: number;
  wins: number;
  gamesPlayed: number;
  winStreak: number;
}

export interface Friend {
  uid: string;
  agentName: string;
  eloRating: number;
  wins: number;
  gamesPlayed: number;
  winStreak: number;
}

export interface Challenge {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  arenaId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}
