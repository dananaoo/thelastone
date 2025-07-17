// Типы для игры "TheLastCeo"

export type GameStage = 'lobby' | 'red_light' | 'quiz' | 'demoday';

export interface Player {
  player_number: number;
  nickname: string;
  avatar_color: string;
  avatar_pattern: string;
  is_alive: boolean;
  position_x: number;
  position_y: number;
}

export interface GameState {
  stage: GameStage;
  session_id: string;
  status: string;
  current_stage: number;
  prize_pool: number;
  players: Player[];
  timestamp: string;
}

export interface User {
  token: string;
  user_id: number;
  nickname: string;
  balance: number;
  avatar_color: string;
  avatar_pattern: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  time_limit: number;
}

export interface RedLightSignal {
  state: 'red' | 'green';
  duration: number;
}

export interface ChatMessage {
  id: number;
  player_number: number;
  nickname: string;
  message: string;
  timestamp: string;
}

export interface Winner {
  player_number: number;
  nickname: string;
  prize: number;
}

export interface GameFinished {
  winners: Winner[];
  total_prize_pool: number;
}

export interface ShopItem {
  value: string;
  name: string;
  cost: number;
}

export interface ShopItems {
  colors: ShopItem[];
  patterns: ShopItem[];
}

export interface PlayerStats {
  total_games: number;
  total_wins: number;
  win_rate: number;
  total_earnings: number;
  current_balance: number;
}

export interface HallOfFameEntry {
  rank: number;
  nickname: string;
  total_earnings: number;
  games_played: number;
  games_won: number;
  win_rate: number;
}

// WebSocket сообщения
export interface WSMessage {
  type: string;
  data: unknown;
}

// REST API ответы
export interface AuthResponse {
  token: string;
  user_id: number;
  nickname: string;
  balance: number;
}

export interface JoinGameResponse {
  message: string;
  player_number: number;
  session_id: string;
}

export interface AvailableGame {
  session_id: string;
  status: string;
  max_players: number;
  prize_pool: number;
  current_stage: number;
  alive_players_count: number;
  created_at: string;
} 