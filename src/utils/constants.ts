// Константы для игры "TheLastCeo"

export const GAME_STAGES = {
  LOBBY: 'lobby',
  RED_LIGHT: 'red_light',
  QUIZ: 'quiz',
  DEMODAY: 'demoday'
} as const;

export const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Purple
  '#FFB347', // Orange
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE'  // Lavender
];

export const AVATAR_PATTERNS = [
  'solid',
  'stripes',
  'stars',
  'dots',
  'checkers'
];

export const PATTERN_NAMES = {
  solid: 'Solid',
  stripes: 'Stripes',
  stars: 'Stars',
  dots: 'Dots',
  checkers: 'Checkers'
};

export const COLOR_NAMES = {
  '#FF6B6B': 'Red',
  '#4ECDC4': 'Teal',
  '#45B7D1': 'Blue',
  '#96CEB4': 'Green',
  '#FFEAA7': 'Yellow',
  '#DDA0DD': 'Purple',
  '#FFB347': 'Orange',
  '#98D8C8': 'Mint',
  '#F7DC6F': 'Gold',
  '#BB8FCE': 'Lavender'
};

// WebSocket события
export const WS_EVENTS = {
  // Клиент → Сервер
  READY_CHECK: 'ready_check',
  CHAT_MESSAGE: 'chat_message',
  QUIZ_ANSWER: 'quiz_answer',
  PLAYER_MOVEMENT: 'player_movement',
  
  // Сервер → Клиент
  GAME_STATE_UPDATE: 'game_state_update',
  STAGE_TRANSITION: 'stage_transition',
  QUIZ_QUESTION: 'quiz_question',
  RED_LIGHT_SIGNAL: 'red_light_signal',
  PLAYER_ELIMINATED: 'player_eliminated',
  GAME_FINISHED: 'game_finished'
} as const;

// REST API эндпойнты
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register/',
    LOGIN: '/api/auth/login/'
  },
  PROFILE: {
    GET: '/api/profile/',
    UPDATE: '/api/profile/update/'
  },
  GAMES: {
    AVAILABLE: '/api/games/available/',
    JOIN: (sessionId: string) => `/api/games/${sessionId}/join/`
  },
  STATS: {
    GET: '/api/stats/',
    HALL_OF_FAME: '/api/hall-of-fame/'
  },
  SHOP: {
    ITEMS: '/api/shop/items/',
    PURCHASE: '/api/shop/purchase/'
  }
} as const;

// Игровые константы
export const GAME_CONFIG = {
  MAX_PLAYERS: 80,
  STARTING_BALANCE: 200000,
  MIN_PRIZE_POOL: 8000000,
  MAX_PRIZE_POOL: 16000000,
  QUIZ_TIME_LIMIT: 30,
  RED_LIGHT_DURATION: 5
} as const;

// Форматирование валюты (тенге)
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('kk-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Форматирование времени
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}; 