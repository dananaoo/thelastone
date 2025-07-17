import React, { useState, useEffect } from 'react';
import { gamesAPI } from '../api/games';
import { useGameStore } from '../store/gameStore';
import type { AvailableGame } from '../utils/types';
import { formatCurrency } from '../utils/constants';

interface GameSelectorProps {
  onGameJoined: () => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({ onGameJoined }) => {
  const [games, setGames] = useState<AvailableGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, connectWebSocket } = useGameStore();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const availableGames = await gamesAPI.getAvailableGames();
      setGames(availableGames);
    } catch (err) {
      setError('Ошибка загрузки игр');
      console.error('Error loading games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (sessionId: string) => {
    try {
      setIsJoining(true);
      setError(null);
      
      await gamesAPI.joinGame(sessionId);
      
      // Подключаемся к WebSocket
      if (user?.token) {
        connectWebSocket(user.token);
      }
      
      onGameJoined();
    } catch (err) {
      setError('Ошибка присоединения к игре');
      console.error('Error joining game:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      setIsJoining(true);
      setError(null);
      
      await gamesAPI.createGame();
      
      // Подключаемся к WebSocket
      if (user?.token) {
        connectWebSocket(user.token);
      }
      
      onGameJoined();
    } catch (err) {
      setError('Ошибка создания игры');
      console.error('Error creating game:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка доступных игр...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">TheLastCeo</h1>
          <p className="text-blue-200">
            Добро пожаловать, {user?.nickname}! Баланс: {formatCurrency(user?.balance || 0)}
          </p>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Кнопка создания игры */}
        <div className="mb-6">
          <button
            onClick={handleCreateGame}
            disabled={isJoining}
            className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Создание...' : '🎮 Создать новую игру'}
          </button>
        </div>

        {/* Список игр */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.session_id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Игра #{game.session_id.slice(-8)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Создана: {formatDate(game.created_at)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  game.status === 'waiting' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {game.status === 'waiting' ? 'Ожидание' : 'В процессе'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Призовой фонд:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(game.prize_pool)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Игроков:</span>
                  <span className="font-semibold">
                    {game.alive_players_count}/{game.max_players}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Этап:</span>
                  <span className="font-semibold">
                    {game.current_stage === 0 ? 'Лобби' : `Этап ${game.current_stage}`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleJoinGame(game.session_id)}
                disabled={isJoining || game.alive_players_count >= game.max_players}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Присоединение...' : 'Присоединиться'}
              </button>
            </div>
          ))}
        </div>

        {/* Если нет игр */}
        {games.length === 0 && !isLoading && (
          <div className="text-center bg-white rounded-lg shadow-lg p-8">
            <p className="text-gray-600 mb-4">Нет доступных игр</p>
            <button
              onClick={handleCreateGame}
              disabled={isJoining}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Создание...' : 'Создать первую игру'}
            </button>
          </div>
        )}

        {/* Кнопка обновления */}
        <div className="text-center mt-6">
          <button
            onClick={loadGames}
            disabled={isLoading}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Обновление...' : '🔄 Обновить список'}
          </button>
        </div>
      </div>
    </div>
  );
}; 