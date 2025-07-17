import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { WS_EVENTS } from '../utils/constants';
import { Stage, Layer } from 'react-konva';
import { PlayerSprite } from '../canvas/PlayerSprite';

export const RedLight: React.FC = () => {
  const { game, user, redLightSignal, sendWS } = useGameStore();
  const [step, setStep] = useState(0);
  const [playerPosition, setPlayerPosition] = useState({ x: 50, y: window.innerHeight - 100 });
  const [gameStarted, setGameStarted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Границы пола - теперь на весь экран
  const floorStartY = 400; // Начало пола по Y
  const floorEndY = window.innerHeight - 50;   // Конец пола по Y (почти до низа экрана)
  const floorStartX = 50;  // Левая граница пола
  const floorEndX = window.innerWidth - 50;   // Правая граница пола

  // Начальные позиции для множественных игроков
  const getStartingPositions = (playerCount: number) => {
    const positions = [];
    const baseX = 50;
    const baseY = window.innerHeight - 100;
    const spacing = 80; // Расстояние между игроками

    for (let i = 0; i < playerCount; i++) {
      const row = Math.floor(i / 5); // 5 игроков в ряду
      const col = i % 5;
      positions.push({
        x: baseX + col * spacing,
        y: baseY - row * spacing
      });
    }
    return positions;
  };

  // Проверка столкновений между игроками
  const checkCollision = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    const distance = Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
    return distance < 40; // Радиус столкновения
  };

  // Получение позиций всех игроков
  const getAllPlayerPositions = () => {
    if (!game) return [];
    
    const alivePlayers = game.players.filter(player => player.is_alive);
    const startingPositions = getStartingPositions(alivePlayers.length);
    
    return alivePlayers.map((player, index) => {
      const isCurrentPlayer = player.nickname === user?.nickname;
      return {
        player,
        position: isCurrentPlayer ? playerPosition : startingPositions[index] || { x: 50, y: window.innerHeight - 100 },
        isCurrentPlayer
      };
    });
  };

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

      // Получаем позиции всех игроков для проверки столкновений
      const allPlayers = getAllPlayerPositions();
      const otherPlayers = allPlayers.filter(p => !p.isCurrentPlayer);

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

      // Проверяем столкновения с другими игроками
      let hasCollision = false;
      for (const otherPlayer of otherPlayers) {
        if (checkCollision({ x: newX, y: newY }, otherPlayer.position)) {
          hasCollision = true;
          // Толкаем другого игрока в направлении движения
          const pushDistance = 10;
          const dx = newX - playerPosition.x;
          const dy = newY - playerPosition.y;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            // Горизонтальное движение
            if (dx > 0) {
              otherPlayer.position.x = Math.min(floorEndX, otherPlayer.position.x + pushDistance);
            } else {
              otherPlayer.position.x = Math.max(floorStartX, otherPlayer.position.x - pushDistance);
            }
          } else {
            // Вертикальное движение
            if (dy > 0) {
              otherPlayer.position.y = Math.min(floorEndY, otherPlayer.position.y + pushDistance);
            } else {
              otherPlayer.position.y = Math.max(floorStartY, otherPlayer.position.y - pushDistance);
            }
          }
          break;
        }
      }

      // Если нет столкновения, обновляем позицию
      if (!hasCollision) {
        setPlayerPosition({ x: newX, y: newY });
        sendWS(WS_EVENTS.PLAYER_MOVEMENT, { 
          x: newX, 
          y: newY, 
          timestamp: new Date().toISOString() 
        });
      }
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

  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;
  const allPlayers = getAllPlayerPositions();

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

      {/* Canvas с игроками - на весь экран */}
      <div className="absolute inset-0 z-10">
        <Stage width={canvasWidth} height={canvasHeight}>
          <Layer>
            {/* Все игроки */}
            {allPlayers.map((playerData) => (
              <PlayerSprite
                key={playerData.player.player_number}
                x={playerData.position.x}
                y={playerData.position.y}
                nickname={playerData.player.nickname + (playerData.isCurrentPlayer ? ' (Вы)' : '')}
                isCurrentPlayer={playerData.isCurrentPlayer}
                step={step}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Счетчик игроков и кнопка "Начать" */}
      <div className="absolute top-8 right-8 z-30 flex flex-col items-end space-y-4">
        <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
          <p className="text-lg font-bold">Игроков: {allPlayers.length}</p>
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