import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { WS_EVENTS } from '../utils/constants';
import { Stage, Layer } from 'react-konva';
import { PlayerSprite } from '../canvas/PlayerSprite';

export const RedLight: React.FC = () => {
  const { game, user, redLightSignal, sendWS } = useGameStore();
  const [step, setStep] = useState(0);
  const [playerPosition, setPlayerPosition] = useState({ x: 450, y: 300 });
  const [gameStarted, setGameStarted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Границы пола
  const floorStartY = 10; // Начало пола по Y
  const floorEndY = 380;   // Конец пола по Y (почти до низа экрана)
  const floorStartX = 0;  // Левая граница пола
  const floorEndX = 900;   // Правая граница пола

  useEffect(() => {
    const interval = setInterval(() => setStep(s => (s + 1) % 2), 300);
    return () => clearInterval(interval);
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
    // Отправляем сигнал начала игры
    sendWS('start_red_light', { started: true });
  };

  const handleStopGame = () => {
    setGameStarted(false);
    // Отправляем сигнал остановки игры
    sendWS('stop_red_light', { started: false });
  };

  useEffect(() => {
    const handleKeyDownEvent = (e: KeyboardEvent) => {
      if (!game || redLightSignal?.state === 'red' || !gameStarted) return;

      const moveDistance = 15;
      let newX = playerPosition.x;
      let newY = playerPosition.y;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          newY = Math.max(floorStartY, playerPosition.y - moveDistance);
          break;
        case 'ArrowDown':
        case 's':
          newY = Math.min(floorEndY, playerPosition.y + moveDistance);
          break;
        case 'ArrowLeft':
        case 'a':
          newX = Math.max(floorStartX, playerPosition.x - moveDistance);
          break;
        case 'ArrowRight':
        case 'd':
          newX = Math.min(floorEndX, playerPosition.x + moveDistance);
          break;
        default:
          return;
      }

      setPlayerPosition({ x: newX, y: newY });
      sendWS(WS_EVENTS.PLAYER_MOVEMENT, { 
        x: newX, 
        y: newY, 
        timestamp: new Date().toISOString() 
      });
    };

    window.addEventListener('keydown', handleKeyDownEvent);
    return () => window.removeEventListener('keydown', handleKeyDownEvent);
  }, [playerPosition, redLightSignal, game, sendWS, gameStarted]);

  if (!game) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: 'url(/red.png)' }}>
        <div className="text-center text-white bg-black bg-opacity-50 p-8 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  const canvasWidth = 900;
  const canvasHeight = 400;

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" 
      style={{ backgroundImage: 'url(/red.png)' }}
      tabIndex={0}
    >
      {/* Сигнал света */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`px-8 py-4 rounded-lg text-2xl font-bold text-white shadow-lg ${
          redLightSignal?.state === 'red' 
            ? 'bg-red-600 animate-pulse' 
            : redLightSignal?.state === 'green'
            ? 'bg-green-600'
            : 'bg-yellow-600'
        }`}>
          {redLightSignal?.state === 'red' ? '🔴 КРАСНЫЙ СВЕТ' : 
           redLightSignal?.state === 'green' ? '🟢 ЗЕЛЕНЫЙ СВЕТ' : 
           '🟡 ОЖИДАНИЕ'}
        </div>
      </div>

      {/* Canvas с игроками */}
      <div className="flex flex-col items-center justify-center w-full z-10">
        <Stage width={canvasWidth} height={canvasHeight} className="mx-auto rounded-lg bg-transparent">
          <Layer>
            {/* Фоновая разметка */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-200 to-green-400 opacity-20" />
            
            {/* Только текущий игрок */}
            <PlayerSprite
              x={playerPosition.x}
              y={playerPosition.y}
              nickname={user?.nickname + ' (Вы)'}
              isCurrentPlayer={true}
              step={step}
            />
          </Layer>
        </Stage>
      </div>

      {/* Счетчик игроков и кнопка "Начать" */}
      <div className="absolute top-8 right-8 z-30 flex flex-col items-end space-y-4">
        <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
          <p className="text-lg font-bold">Игроков: 1</p>
        </div>
        
        {/* Кнопка "Начать" / "Остановить" */}
        <button
          onClick={gameStarted ? handleStopGame : handleStartGame}
          className={`px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg ${
            gameStarted 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {gameStarted ? '⏹️ Остановить игру' : '🚦 Начать игру'}
        </button>
      </div>

      {/* Инструкции с кнопкой OK */}
      {showControls && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black bg-opacity-70 text-white px-6 py-4 rounded-lg text-center max-w-md">
            <p className="text-lg font-medium mb-2">Управление</p>
            <p className="text-sm mb-2">WASD или стрелки для движения</p>
            <p className="text-sm mb-2">Двигайтесь только на зеленый свет!</p>
            <p className="text-sm mb-4 text-yellow-300">Только первая половина аудитории пройдет игру</p>
            <button
              onClick={() => setShowControls(false)}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 