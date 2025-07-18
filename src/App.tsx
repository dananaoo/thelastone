import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { Auth } from './components/Auth';
import { Lobby } from './containers/Lobby';
import { RedLight } from './containers/RedLight';
import { Quiz } from './containers/Quiz';
import { ProfileCustomization } from './components/ProfileCustomization';
import { authAPI } from './api/auth';
import { FinalStage } from './containers/FinalStage';
import './App.css';

function App() {
  const { user, game, isConnected, resetGame, connectWebSocket } = useGameStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [lobbyTimeout, setLobbyTimeout] = useState<number | null>(null);

  // Сайт всегда начинается с авторизации
  useEffect(() => {
    setIsAuthenticated(false);
    setShowCustomization(false);
  }, []);

  // Fallback для долгой загрузки лобби
  useEffect(() => {
    if (isAuthenticated && !showCustomization && !game && user?.token) {
      setLobbyError(null);
      if (lobbyTimeout) clearTimeout(lobbyTimeout);
      const timeout = setTimeout(() => {
        setLobbyError('Лобби не загрузилось. Попробуйте снова.');
      }, 3500);
      setLobbyTimeout(timeout);
      return () => clearTimeout(timeout);
    } else {
      setLobbyError(null);
      if (lobbyTimeout) clearTimeout(lobbyTimeout);
    }
    // eslint-disable-next-line
  }, [isAuthenticated, showCustomization, game, user?.token]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowCustomization(true);
  };

  const handleLogout = () => {
    authAPI.logout();
    localStorage.clear();
    setIsAuthenticated(false);
    setShowCustomization(false);
    resetGame();
  };

  const handleCustomizationDone = () => {
    setShowCustomization(false);
    // После кастомизации всегда подключаемся к WebSocket (инициализация игры)
    if (user?.token) {
      connectWebSocket(user.token);
    }
  };

  const handleRestartGame = () => {
    authAPI.logout();
    localStorage.clear();
    resetGame();
    setIsAuthenticated(false);
    setShowCustomization(false);
  };

  const handleRetryLobby = () => {
    setLobbyError(null);
    if (user?.token) {
      connectWebSocket(user.token);
    }
  };

  // Определяем текущий экран
  const getCurrentScreen = () => {
    if (!isAuthenticated) {
      return <Auth onAuthSuccess={handleAuthSuccess} />;
    }
    if (showCustomization) {
      return <ProfileCustomization onDone={handleCustomizationDone} />;
    }
    
    // Проверяем текущий этап игры
    if (game?.stage === 'red_light') {
      return <RedLight />;
    }
    if (game?.stage === 'quiz') {
      return <Quiz />;
    }
    if (game?.stage === 'final_stage') {
      return <FinalStage onExit={handleRestartGame} />;
    }
    
    // Только одна глобальная игра, сразу лобби
    return <LobbyWithRestart onRestart={handleRestartGame} lobbyError={lobbyError} onRetry={handleRetryLobby} />;
  };

  return (
    <div className="App">
      {/* Header с информацией о пользователе */}
      {isAuthenticated && user && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-800">TheLastCeo</h1>
                {game && (
                  <span className="text-sm text-gray-600">
                    Игра #{game.session_id.slice(-8)}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{user.nickname}</p>
                  <p className="text-xs text-gray-500">
                    Баланс: {new Intl.NumberFormat('kk-KZ', {
                      style: 'currency',
                      currency: 'KZT',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(user.balance)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Подключено' : 'Отключено'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      {/* Основной контент */}
      <main>
        {getCurrentScreen()}
      </main>
    </div>
  );
}

// Обертка для лобби с кнопкой рестарта и обработкой ошибок
const LobbyWithRestart: React.FC<{ onRestart: () => void; lobbyError: string | null; onRetry: () => void }> = ({ onRestart, lobbyError, onRetry }) => {
  return (
    <div className="relative">
      <Lobby />
      <button
        onClick={onRestart}
        className="fixed top-6 right-6 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-yellow-600 transition"
      >
        Рестарт игры
      </button>
      {lobbyError && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-red-300 text-red-700 px-6 py-4 rounded-lg shadow-lg flex flex-col items-center">
          <span className="mb-2">{lobbyError}</span>
          <button
            onClick={onRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
