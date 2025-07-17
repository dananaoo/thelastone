import axios from 'axios';
import type { AvailableGame, JoinGameResponse } from '../utils/types';
// import { API_ENDPOINTS } from '../utils/constants'; // Раскомментируйте когда бэкенд готов

// Создаем axios инстанс с базовым URL
const api = axios.create({
  baseURL: 'http://localhost:8000', // Замените на реальный URL бэкенда
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Заглушки для API
const mockAvailableGames: AvailableGame[] = [
  {
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'waiting',
    max_players: 80,
    prize_pool: 8000000,
    current_stage: 0,
    alive_players_count: 40,
    created_at: '2025-07-17T12:00:00Z'
  },
  {
    session_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'waiting',
    max_players: 80,
    prize_pool: 12000000,
    current_stage: 0,
    alive_players_count: 25,
    created_at: '2025-07-17T12:30:00Z'
  }
];

const mockJoinResponse: JoinGameResponse = {
  message: 'Successfully joined game',
  player_number: 42,
  session_id: '550e8400-e29b-41d4-a716-446655440000'
};

export const gamesAPI = {
  // Получение доступных игр
  getAvailableGames: async (): Promise<AvailableGame[]> => {
    try {
      // Заглушка - замените на реальный API вызов
      console.log('Fetching available games');
      
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockAvailableGames;
      
      // Реальный API вызов (раскомментируйте когда бэкенд готов):
      // const response = await api.get<AvailableGame[]>(API_ENDPOINTS.GAMES.AVAILABLE);
      // return response.data;
    } catch (error) {
      console.error('Error fetching available games:', error);
      throw error;
    }
  },

  // Присоединение к игре
  joinGame: async (sessionId: string): Promise<JoinGameResponse> => {
    try {
      // Заглушка - замените на реальный API вызов
      console.log('Joining game:', sessionId);
      
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Проверяем, что игра существует
      const gameExists = mockAvailableGames.some(game => game.session_id === sessionId);
      if (!gameExists) {
        throw new Error('Game not found');
      }
      
      return {
        ...mockJoinResponse,
        session_id: sessionId
      };
      
      // Реальный API вызов (раскомментируйте когда бэкенд готов):
      // const response = await api.post<JoinGameResponse>(API_ENDPOINTS.GAMES.JOIN(sessionId), {});
      // return response.data;
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  },

  // Создание новой игры (если нужно)
  createGame: async (): Promise<JoinGameResponse> => {
    try {
      // Заглушка - замените на реальный API вызов
      console.log('Creating new game');
      
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newSessionId = `game-${Date.now()}`;
      
      return {
        message: 'Game created successfully',
        player_number: 1,
        session_id: newSessionId
      };
      
      // Реальный API вызов (раскомментируйте когда бэкенд готов):
      // const response = await api.post<JoinGameResponse>('/api/games/create/', {});
      // return response.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }
}; 