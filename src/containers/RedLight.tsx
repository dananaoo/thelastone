import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { WS_EVENTS } from '../utils/constants';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { PlayerSprite } from '../canvas/PlayerSprite';
import useImage from 'use-image';

export const RedLight: React.FC = () => {
  const { game, user, sendWS, setGame } = useGameStore();
  const [step, setStep] = useState(0);
  const [playerPosition, setPlayerPosition] = useState({ x: 50, y: window.innerHeight - 100 });
  const [gameStarted, setGameStarted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Адаптивные размеры на основе размера экрана
  const screenWidth = windowSize.width;
  const screenHeight = windowSize.height;
  const baseScreenWidth = 1920;
  const baseScreenHeight = 1080;
  
  const scaleX = screenWidth / baseScreenWidth;
  const scaleY = screenHeight / baseScreenHeight;
  const scale = Math.min(scaleX, scaleY);

  // Новые состояния для механики игры
  const [aselEyesOpen, setAselEyesOpen] = useState(false); // true = глаза открыты (красный свет)
  const [lightState, setLightState] = useState<'green' | 'yellow' | 'red'>('green'); // зеленый, желтый, красный
  const [gamePhase, setGamePhase] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Set<number>>(new Set());
  const [eliminationMessage, setEliminationMessage] = useState<string>('');
  const [showEliminationMessage, setShowEliminationMessage] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState<string>('');
  const [showVictoryMessage, setShowVictoryMessage] = useState(false);
  
  // Аудио и таймеры
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameTimeoutsRef = useRef<number[]>([]);

  // Загружаем изображения
  const [aselImage] = useImage('/asel.png');
  const [closedAselImage] = useImage('/closedasel.png');
  const [bakhImage] = useImage('/bakh.png');

  // Состояния для персонажей bakh
  const [bakhs, setBakhs] = useState([
    { id: 1, x: 100, y: 500, direction: 1, speed: 2 }, // direction: 1 = вправо, -1 = влево
    { id: 2, x: 400, y: 600, direction: -1, speed: 1.5 },
    { id: 3, x: 700, y: 550, direction: 1, speed: 2.5 },
    { id: 4, x: 1000, y: 650, direction: -1, speed: 1.8 }
  ]);
  const [bakhStep, setBakhStep] = useState(0); // Анимация ног bakh

  // Анимация движения bakh
  useEffect(() => {
    if (!gameStarted || gamePhase !== 'playing') return;

    const moveBakhs = () => {
      setBakhs(prevBakhs => 
        prevBakhs.map(bakh => {
          const newX = bakh.x + (bakh.direction * bakh.speed * 2);
          
          // Отскок от краев экрана
          if (newX <= 50 || newX >= screenWidth - 50) {
            return {
              ...bakh,
              x: newX <= 50 ? 50 : screenWidth - 50,
              direction: -bakh.direction // меняем направление
            };
          }
          
          return { ...bakh, x: newX };
        })
      );
    };

    const interval = setInterval(moveBakhs, 50); // Обновляем каждые 50мс для плавного движения
    return () => clearInterval(interval);
  }, [gameStarted, gamePhase, screenWidth]);

  // Анимация ног bakh
  useEffect(() => {
    if (!gameStarted || gamePhase !== 'playing') return;

    const animateBakhLegs = () => {
      setBakhStep(prev => (prev + 1) % 4); // 4 кадра анимации
    };

    const interval = setInterval(animateBakhLegs, 100); // Анимация ног каждые 100мс
    return () => clearInterval(interval);
  }, [gameStarted, gamePhase]);

  // Проверка столкновений с bakh
  const checkBakhCollision = (playerX: number, playerY: number) => {
    return bakhs.some(bakh => {
      const distance = Math.sqrt((playerX - bakh.x) ** 2 + (playerY - bakh.y) ** 2);
      return distance < 40 * scale; // Радиус столкновения
    });
  };

  // Слушатель изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      stopGameCompletely();
    };
  }, []);

  // Функция для полной остановки игры
  const stopGameCompletely = () => {
    // Останавливаем аудио
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Очищаем все таймауты
    gameTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    gameTimeoutsRef.current = [];
    
    // Сбрасываем состояние Асель
    setAselEyesOpen(false);
    setLightState('green');
  };

  // Обновляем позицию игрока при изменении размера окна
  useEffect(() => {
    setPlayerPosition(prev => ({ ...prev, y: screenHeight - 100 }));
  }, [screenHeight]);

  // Адаптивные размеры для Asel
  const aselWidth = 300 * scale;
  const aselHeight = 450 * scale;
  const aselX = 850 * scaleX;
  const aselY = 250 * scaleY;

  // Финишная линия (дверь)
  const finishLineX = 1200 * scaleX;
  const finishLineY = 600 * scaleY;
  const finishLineWidth = 300 * scaleX;

  // Границы пола
  const floorStartY = 400;
  const floorEndY = screenHeight - 50;
  const floorStartX = 50;
  const floorEndX = screenWidth - 50;

  // Начальные позиции для множественных игроков
  const getStartingPositions = (playerCount: number) => {
    const positions = [];
    const baseX = 50;
    const baseY = screenHeight - 100;
    const spacing = 120 * scale;

    for (let i = 0; i < playerCount; i++) {
      const row = Math.floor(i / 5);
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
    return distance < 60 * scale;
  };

  // Проверка достижения финишной линии
  const checkFinishLine = (x: number, y: number) => {
    return x >= finishLineX && x <= finishLineX + finishLineWidth && 
           Math.abs(y - finishLineY) < 50 * scale;
  };

  // Получение позиций всех игроков
  const getAllPlayerPositions = () => {
    if (!game) return [];
    
    const alivePlayers = game.players.filter(player => player.is_alive && !eliminatedPlayers.has(player.player_number));
    const startingPositions = getStartingPositions(alivePlayers.length);
    
    return alivePlayers.map((player, index) => {
      const isCurrentPlayer = player.nickname === user?.nickname;
      return {
        player,
        position: isCurrentPlayer ? playerPosition : startingPositions[index] || { x: 50, y: screenHeight - 100 },
        isCurrentPlayer
      };
    });
  };

  // Анимация ходьбы
  useEffect(() => {
    const interval = setInterval(() => setStep(s => (s + 1) % 2), 300);
    return () => clearInterval(interval);
  }, []);

  // Игровой цикл с аудио и анимацией Асель
  useEffect(() => {
    // Если игра остановлена, полностью останавливаем все
    if (!gameStarted || gamePhase !== 'playing') {
      stopGameCompletely();
      return;
    }

    // Создаем аудио элемент
    if (!audioRef.current) {
      audioRef.current = new Audio('/squid-game-sound.mp3');
      audioRef.current.loop = true;
    }

    // Запускаем аудио
    audioRef.current.play().catch(console.error);

    // Игровой цикл: 5 секунд глаза закрыты (4с зеленый + 1с желтый), 3 секунды глаза открыты (красный)
    const gameLoop = () => {
      // Проверяем, что игра все еще идет
      if (!gameStarted || gamePhase !== 'playing') {
        return;
      }

      // Начинаем с зеленого света (4 секунды)
      setAselEyesOpen(false);
      setLightState('green');
      
      const greenTimeout = setTimeout(() => {
        // Проверяем, что игра все еще идет
        if (!gameStarted || gamePhase !== 'playing') {
          return;
        }
        
        // Желтый свет (1 секунда) - подготовка
        setLightState('yellow');
        
        const yellowTimeout = setTimeout(() => {
          // Проверяем, что игра все еще идет
          if (!gameStarted || gamePhase !== 'playing') {
            return;
          }
          
          // Красный свет (3 секунды) - глаза открыты
          setAselEyesOpen(true);
          setLightState('red');
          
          const redTimeout = setTimeout(() => {
            // Проверяем, что игра все еще идет
            if (!gameStarted || gamePhase !== 'playing') {
              return;
            }
            
            // Проверяем, достигли ли игроки финишной линии
            const allPlayers = getAllPlayerPositions();
            const finishedPlayers = allPlayers.filter(p => 
              checkFinishLine(p.position.x, p.position.y)
            );
            
            // Если половина игроков достигла финиша, завершаем игру
            // Для нечетного количества округляем вверх (например: 3 игрока = 2 проходят, 5 игроков = 3 проходят)
            const requiredPlayers = Math.ceil(allPlayers.length / 2);
            if (finishedPlayers.length >= requiredPlayers) {
              setGamePhase('finished');
              setVictoryMessage(`Поздравляем! ${finishedPlayers.length} игроков прошли на 2 этап!`);
              setShowVictoryMessage(true);
              stopGameCompletely();
              
              // Переходим на Quiz этап через 5 секунд
              setTimeout(() => {
                setShowVictoryMessage(false);
                if (game) {
                  setGame({
                    ...game,
                    stage: 'quiz',
                    current_stage: 2
                  });
                  sendWS(WS_EVENTS.STAGE_TRANSITION, { stage: 'quiz' });
                }
              }, 5000);
              return;
            }
            
            // Продолжаем цикл
            if (gameStarted && gamePhase === 'playing') {
              gameLoop();
            }
          }, 3000); // 3 секунды красный свет
          
          // Сохраняем ID таймаута для очистки
          gameTimeoutsRef.current.push(redTimeout);
        }, 1000); // 1 секунда желтый свет
        
        // Сохраняем ID таймаута для очистки
        gameTimeoutsRef.current.push(yellowTimeout);
      }, 4000); // 4 секунды зеленый свет
      
      // Сохраняем ID таймаута для очистки
      gameTimeoutsRef.current.push(greenTimeout);
    };

    gameLoop();

    // Очистка при размонтировании или изменении зависимостей
    return () => {
      stopGameCompletely();
    };
  }, [gameStarted, gamePhase]);

  // Обработка движения игрока
  useEffect(() => {
    const handleKeyDownEvent = (e: KeyboardEvent) => {
      if (!game || !gameStarted || gamePhase !== 'playing' || (lightState !== 'green' && lightState !== 'yellow')) return;

      const moveDistance = 15;
      let newX = playerPosition.x;
      let newY = playerPosition.y;

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

      // Проверяем столкновения
      let hasCollision = false;
      for (const otherPlayer of otherPlayers) {
        if (checkCollision({ x: newX, y: newY }, otherPlayer.position)) {
          hasCollision = true;
          const pushDistance = 10;
          const dx = newX - playerPosition.x;
          const dy = newY - playerPosition.y;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
              otherPlayer.position.x = Math.min(floorEndX, otherPlayer.position.x + pushDistance);
            } else {
              otherPlayer.position.x = Math.max(floorStartX, otherPlayer.position.x - pushDistance);
            }
          } else {
            if (dy > 0) {
              otherPlayer.position.y = Math.min(floorEndY, otherPlayer.position.y + pushDistance);
            } else {
              otherPlayer.position.y = Math.max(floorStartY, otherPlayer.position.y - pushDistance);
            }
          }
          break;
        }
      }

      // Проверяем столкновения с bakh
      if (checkBakhCollision(newX, newY)) {
        hasCollision = true;
        // Игрок столкнулся с bakh - смерть
        if (user) {
          setEliminatedPlayers(prev => new Set([...prev, user.user_id]));
          setEliminationMessage(`${user.nickname} умер! Столкновение с bakh!`);
          setShowEliminationMessage(true);
          
          setTimeout(() => {
            setShowEliminationMessage(false);
          }, 3000);
          
          sendWS(WS_EVENTS.PLAYER_ELIMINATED, { 
            player_number: user.user_id,
            reason: 'bakh_collision'
          });
        }
      }

      if (!hasCollision) {
        setPlayerPosition({ x: newX, y: newY });
        sendWS(WS_EVENTS.PLAYER_MOVEMENT, { 
          x: newX, 
          y: newY, 
          timestamp: new Date().toISOString() 
        });
        
        // Проверяем, достиг ли игрок финишной линии
        if (checkFinishLine(newX, newY)) {
          // Проверяем, достигли ли достаточно игроков финиша
          const allPlayers = getAllPlayerPositions();
          const finishedPlayers = allPlayers.filter(p => 
            checkFinishLine(p.position.x, p.position.y)
          );
          
          const requiredPlayers = Math.ceil(allPlayers.length / 2);
          if (finishedPlayers.length >= requiredPlayers) {
            setGamePhase('finished');
            setVictoryMessage(`Поздравляем! ${finishedPlayers.length} игроков прошли на 2 этап!`);
            setShowVictoryMessage(true);
            stopGameCompletely();
            
            // Переходим на Quiz этап через 5 секунд
            setTimeout(() => {
              setShowVictoryMessage(false);
              if (game) {
                setGame({
                  ...game,
                  stage: 'quiz',
                  current_stage: 2
                });
                sendWS(WS_EVENTS.STAGE_TRANSITION, { stage: 'quiz' });
              }
            }, 5000);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownEvent);
    return () => window.removeEventListener('keydown', handleKeyDownEvent);
  }, [playerPosition, game, sendWS, gameStarted, gamePhase, lightState]);

  // Обработка движения во время красного света (смерть)
  useEffect(() => {
    if (lightState !== 'red' || !gameStarted || gamePhase !== 'playing') return;

    const handleMovementDuringRedLight = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        // Игрок двинулся во время красного света - смерть
        if (user) {
          setEliminatedPlayers(prev => new Set([...prev, user.user_id]));
          setEliminationMessage(`${user.nickname} умер! Движение во время красного света!`);
          setShowEliminationMessage(true);
          
          setTimeout(() => {
            setShowEliminationMessage(false);
          }, 3000);
          
          sendWS(WS_EVENTS.PLAYER_ELIMINATED, { 
            player_number: user.user_id,
            reason: 'movement_during_red_light'
          });
        }
      }
    };

    window.addEventListener('keydown', handleMovementDuringRedLight);
    return () => window.removeEventListener('keydown', handleMovementDuringRedLight);
  }, [lightState, gameStarted, gamePhase, user, sendWS]);

  const handleStartGame = () => {
    // Полностью останавливаем предыдущую игру
    stopGameCompletely();
    
    // Начинаем новую игру
    setGameStarted(true);
    setGamePhase('playing');
    setEliminatedPlayers(new Set());
    // Сбрасываем позицию игрока на начальную
    setPlayerPosition({ x: 50, y: screenHeight - 100 });
    sendWS('start_red_light', { started: true });
  };

  const handleStopGame = () => {
    setGameStarted(false);
    setGamePhase('waiting');
    // Полностью останавливаем игру
    stopGameCompletely();
    sendWS('stop_red_light', { started: false });
  };

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

  const canvasWidth = screenWidth;
  const canvasHeight = screenHeight;
  const allPlayers = getAllPlayerPositions();
  const finishedPlayers = allPlayers.filter(p => checkFinishLine(p.position.x, p.position.y));

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" 
      style={{ backgroundImage: 'url(/red.png)' }}
      tabIndex={0}
    >
      {/* Сигнал света */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`px-8 py-4 rounded-lg text-2xl font-bold text-white shadow-lg ${
          lightState === 'red' 
            ? 'bg-red-600 animate-pulse' 
            : lightState === 'yellow'
            ? 'bg-yellow-600'
            : 'bg-green-600'
        }`}>
          {lightState === 'red' ? '🔴 КРАСНЫЙ СВЕТ' : 
           lightState === 'yellow' ? '🟡 ЖЕЛТЫЙ СВЕТ' : 
           '🟢 ЗЕЛЕНЫЙ СВЕТ'}
        </div>
      </div>

      {/* Сообщение о смерти */}
      {showEliminationMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="bg-red-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg animate-pulse">
            {eliminationMessage}
          </div>
        </div>
      )}

      {/* Сообщение о победе */}
      {showVictoryMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="bg-green-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg animate-pulse">
            {victoryMessage}
          </div>
        </div>
      )}

      {/* Canvas с игроками */}
      <div className="absolute inset-0 z-10">
        <Stage width={canvasWidth} height={canvasHeight}>
          <Layer>
            {/* Финишная линия */}
            <Rect
              x={finishLineX}
              y={finishLineY - 25 * scale}
              width={finishLineWidth}
              height={50 * scale}
              fill="rgba(255, 255, 0, 0.3)"
              stroke="yellow"
              strokeWidth={3 * scale}
            />
            
            {/* Изображение Asel */}
            {(aselImage || closedAselImage) && (
              <Image
                image={aselEyesOpen ? aselImage : closedAselImage}
                x={aselX}
                y={aselY}
                width={aselWidth}
                height={aselHeight}
              />
            )}
            
            {/* Все игроки */}
            {allPlayers.map((playerData) => (
              <PlayerSprite
                key={playerData.player.player_number}
                x={playerData.position.x}
                y={playerData.position.y}
                nickname={playerData.player.nickname + (playerData.isCurrentPlayer ? ' (Вы)' : '')}
                isCurrentPlayer={playerData.isCurrentPlayer}
                step={step}
                scale={scale}
              />
            ))}

            {/* Все bakh */}
            {bakhs.map(bakh => (
              <React.Fragment key={bakh.id}>
                {/* Основное тело bakh */}
                <Image
                  image={bakhImage}
                  x={bakh.x}
                  y={bakh.y}
                  width={40 * scale}
                  height={40 * scale}
                />
                
                {/* Ноги bakh - анимированные */}
                {[...Array(6)].map((_, legIndex) => {
                  const legAngle = (legIndex * 60) + (bakhStep * 15); // Угол ноги
                  const legLength = 8 * scale;
                  const legX = bakh.x + 20 * scale + Math.cos(legAngle * Math.PI / 180) * legLength;
                  const legY = bakh.y + 20 * scale + Math.sin(legAngle * Math.PI / 180) * legLength;
                  
                  return (
                    <Rect
                      key={`leg-${legIndex}`}
                      x={legX}
                      y={legY}
                      width={2 * scale}
                      height={legLength}
                      fill="#8B4513"
                      rotation={legAngle}
                      offsetX={1 * scale}
                      offsetY={legLength / 2}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Счетчик игроков и кнопки */}
      <div className="absolute top-8 right-8 z-30 flex flex-col items-end space-y-4">
        <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
          <p className="text-lg font-bold">Игроков: {allPlayers.length}</p>
          <p className="text-sm">Достигли финиша: {finishedPlayers.length}</p>
          <p className="text-sm">Умерли: {eliminatedPlayers.size}</p>
        </div>
        
        {gamePhase === 'finished' && (
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
            <p className="text-lg font-bold">Игра завершена!</p>
            <p className="text-sm">Победители: {finishedPlayers.length} игроков</p>
          </div>
        )}
        
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

      {/* Инструкции */}
      {showControls && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black bg-opacity-70 text-white px-6 py-4 rounded-lg text-center max-w-md">
            <p className="text-lg font-medium mb-2">Управление</p>
            <p className="text-sm mb-2">WASD или стрелки для движения</p>
            <p className="text-sm mb-2">Двигайтесь на зеленый и желтый свет!</p>
            <p className="text-sm mb-2">Красный свет - стоп, движение = смерть!</p>
            <p className="text-sm mb-2">Достигните желтой линии для победы</p>
            <p className="text-sm mb-4 text-yellow-300">Только первая половина игроков пройдет дальше</p>
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