import { create } from 'zustand';
import type { GameState, User, QuizQuestion, ChatMessage, RedLightSignal } from '../utils/types';
import { WS_EVENTS } from '../utils/constants';

export type Gender = 'male' | 'female';
export type Hat = 'none' | 'cap' | 'crown' | 'bandana';
export type Accessory = 'none' | 'glasses' | 'earrings' | 'scarf';

interface Customization {
  gender: Gender;
  hat: Hat;
  accessory: Accessory;
}

interface GameStore {
  // Состояние игры
  game: GameState | null;
  user: User | null;
  quiz: QuizQuestion | null;
  redLightSignal: RedLightSignal | null;
  chatMessages: ChatMessage[];
  websocket: WebSocket | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  customization: Customization;
  
  // Действия
  setGame: (game: GameState) => void;
  setUser: (user: User) => void;
  setQuiz: (quiz: QuizQuestion | null) => void;
  setRedLightSignal: (signal: RedLightSignal | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  updatePlayer: (playerNumber: number, updates: Partial<GameState['players'][0]>) => void;
  eliminatePlayer: (playerNumber: number) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  setIsConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCustomization: (custom: Partial<Customization>) => void;
  resetGame: () => void;
  resetBalance: () => void;
  // WebSocket действия
  sendWS: (type: string, data: unknown) => void;
  connectWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;
}

const defaultCustomization: Customization = {
  gender: 'male',
  hat: 'none',
  accessory: 'none',
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Начальное состояние
  game: null,
  user: null,
  quiz: null,
  redLightSignal: null,
  chatMessages: [],
  websocket: null,
  isConnected: false,
  isLoading: false,
  error: null,
  customization: defaultCustomization,
  
  // Действия
  setGame: (game) => set({ game }),
  setUser: (user) => set({ user }),
  setQuiz: (quiz) => set({ quiz }),
  setRedLightSignal: (signal) => set({ redLightSignal: signal }),
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  updatePlayer: (playerNumber, updates) => set((state) => {
    if (!state.game) return state;
    const updatedPlayers = state.game.players.map(player =>
      player.player_number === playerNumber
        ? { ...player, ...updates }
        : player
    );
    return {
      game: {
        ...state.game,
        players: updatedPlayers
      }
    };
  }),
  eliminatePlayer: (playerNumber) => set((state) => {
    if (!state.game) return state;
    const updatedPlayers = state.game.players.map(player =>
      player.player_number === playerNumber
        ? { ...player, is_alive: false }
        : player
    );
    return {
      game: {
        ...state.game,
        players: updatedPlayers
      }
    };
  }),
  setWebSocket: (websocket) => set({ websocket }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCustomization: (custom) => set((state) => ({ customization: { ...state.customization, ...custom } })),
  resetGame: () => set({
    game: null,
    quiz: null,
    redLightSignal: null,
    chatMessages: [],
    error: null,
    customization: defaultCustomization,
  }),
  resetBalance: () => set((state) => ({
    user: state.user ? { ...state.user, balance: 200000 } : null
  })),
  // WebSocket действия
  sendWS: (type, data) => {
    const { websocket } = get();
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type, data }));
    }
  },
  connectWebSocket: (token) => {
    const { setWebSocket, setIsConnected, setError } = get();
    try {
      // Заглушка для WebSocket - имитируем подключение
      console.log('Connecting to WebSocket with token:', token);
      setTimeout(() => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected (mock)');
        setTimeout(() => {
          const mockGameState = {
            stage: 'lobby' as const,
            session_id: 'mock-session-123',
            status: 'waiting',
            current_stage: 0,
            prize_pool: 8000000,
            players: [
              {
                player_number: 1,
                nickname: 'TestPlayer',
                avatar_color: '#FF6B6B',
                avatar_pattern: 'solid',
                is_alive: true,
                position_x: 0,
                position_y: 0
              },
              {
                player_number: 2,
                nickname: 'Player2',
                avatar_color: '#4ECDC4',
                avatar_pattern: 'solid',
                is_alive: true,
                position_x: 0,
                position_y: 0
              }
            ],
            timestamp: new Date().toISOString()
          };
          handleWebSocketMessage({
            type: WS_EVENTS.GAME_STATE_UPDATE,
            data: mockGameState
          });
        }, 1000);
      }, 500);
      const mockWs = {
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          console.log('WebSocket send (mock):', data);
        },
        close: () => {
          setIsConnected(false);
          console.log('WebSocket disconnected (mock)');
        },
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null
      };
      setWebSocket(mockWs as WebSocket);
    } catch (error) {
      setError('Failed to connect to WebSocket');
      console.error('WebSocket connection failed:', error);
    }
  },
  disconnectWebSocket: () => {
    const { websocket, setWebSocket, setIsConnected } = get();
    if (websocket) {
      websocket.close();
      setWebSocket(null);
      setIsConnected(false);
    }
  },
}));

const handleWebSocketMessage = (message: { type: string; data: unknown }) => {
  const { setGame, setQuiz, setRedLightSignal, addChatMessage, eliminatePlayer } = useGameStore.getState();
  switch (message.type) {
    case WS_EVENTS.GAME_STATE_UPDATE:
      setGame(message.data as GameState);
      break;
    case WS_EVENTS.QUIZ_QUESTION:
      setQuiz(message.data as QuizQuestion);
      break;
    case WS_EVENTS.RED_LIGHT_SIGNAL:
      setRedLightSignal(message.data as RedLightSignal);
      break;
    case WS_EVENTS.CHAT_MESSAGE:
      addChatMessage(message.data as ChatMessage);
      break;
    case WS_EVENTS.PLAYER_ELIMINATED: {
      const { player_number } = message.data as { player_number: number };
      eliminatePlayer(player_number);
      break;
    }
    case WS_EVENTS.STAGE_TRANSITION: {
      const { stage } = message.data as { stage: string };
      const currentGame = useGameStore.getState().game;
      if (currentGame) {
        setGame({ ...currentGame, stage: stage as GameState['stage'] });
      }
      break;
    }
    default:
      console.log('Unknown WebSocket message type:', message.type);
  }
}; 