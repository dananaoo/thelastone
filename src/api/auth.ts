import axios from 'axios';
import type { AuthResponse } from '../utils/types';
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

export interface RegisterData {
  nickname: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginData {
  nickname: string;
  password: string;
}

// Заглушки для API
const mockAuthResponse: AuthResponse = {
  token: 'mock-token-12345',
  user_id: 1,
  nickname: 'TestPlayer',
  balance: 200000
};

export const authAPI = {
  // Регистрация
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      // Заглушка - замените на реальный API вызов
      console.log('Registering with data:', data);
      
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Проверка данных
      if (data.password !== data.confirm_password) {
        throw new Error('Passwords do not match');
      }
      
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Сохраняем токен в localStorage
      localStorage.setItem('token', mockAuthResponse.token);
      
      return mockAuthResponse;
      
      // Реальный API вызов (раскомментируйте когда бэкенд готов):
      // const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
      // localStorage.setItem('token', response.data.token);
      // return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Вход
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      // Заглушка - замените на реальный API вызов
      console.log('Logging in with data:', data);
      
      // Имитация задержки сети
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Проверка данных
      if (!data.nickname || !data.password) {
        throw new Error('Nickname and password are required');
      }
      
      // Сохраняем токен в localStorage
      localStorage.setItem('token', mockAuthResponse.token);
      
      return mockAuthResponse;
      
      // Реальный API вызов (раскомментируйте когда бэкенд готов):
      // const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, data);
      // localStorage.setItem('token', response.data.token);
      // return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Выход
  logout: (): void => {
    localStorage.removeItem('token');
    console.log('Logged out');
  },

  // Проверка токена
  checkAuth: (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Получение токена
  getToken: (): string | null => {
    return localStorage.getItem('token');
  }
}; 