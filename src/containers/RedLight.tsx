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

  // Состояния для персонажей bakh (адаптивные позиции в нижней половине экрана)
  const [bakhs, setBakhs] = useState(() => {
    const basePositions = [
      { id: 1, x: 100, y: 0.6, direction: 1, speed: 2 }, // y как процент от высоты экрана
      { id: 2, x: 400, y: 0.7, direction: -1, speed: 1.5 },
      { id: 3, x: 700, y: 0.65, direction: 1, speed: 2.5 },
      { id: 4, x: 1000, y: 0.75, direction: -1, speed: 1.8 },
      { id: 5, x: 300, y: 0.8, direction: 1, speed: 2.2 },
      { id: 6, x: 800, y: 0.55, direction: -1, speed: 1.7 }
    ];
    
    return basePositions.map(bakh => ({
      ...bakh,
      x: bakh.x * scaleX,
      y: bakh.y * screenHeight // y как процент от высоты экрана
    }));
  });
  const [bakhStep, setBakhStep] = useState(0); // Анимация ног bakh

  // Анимация движения bakh
  useEffect(() => {
    if (!gameStarted || gamePhase !== 'playing') return;

    const moveBakhs = () => {
      setBakhs(prevBakhs => 
        prevBakhs.map(bakh => {
          const newX = bakh.x + (bakh.direction * bakh.speed * 2);
          
          // Отскок от краев экрана (по всей ширине)
          const minX = 50 * scaleX;
          const maxX = (screenWidth - 50) * scaleX;
          
          if (newX <= minX || newX >= maxX) {
            return {
              ...bakh,
              x: newX <= minX ? minX : maxX,
              direction: -bakh.direction // меняем направление
            };
          }
          
          return { ...bakh, x: newX };
        })
      );
      
      // Отладочная информация (только при столкновении)
      const collidedBakh = checkBakhCollision(playerPosition.x, playerPosition.y);
      if (collidedBakh) {
        console.log('Столкновение в moveBakhs!', { playerPos: playerPosition, bakhPos: collidedBakh });
      }
    };

    const interval = setInterval(moveBakhs, 50); // Обновляем каждые 50мс для плавного движения
    return () => clearInterval(interval);
  }, [gameStarted, gamePhase, screenWidth, scaleX]);

  // Анимация ног bakh
  useEffect(() => {
    if (!gameStarted || gamePhase !== 'playing') return;

    const animateBakhLegs = () => {
      setBakhStep(prev => (prev + 1) % 4); // 4 кадра анимации
    };

    const interval = setInterval(animateBakhLegs, 100); // Анимация ног каждые 100мс
    return () => clearInterval(interval);
  }, [gameStarted, gamePhase]);

  // Проверка столкновений с bakh (отдельный эффект)
  useEffect(() => {
    if (!gameStarted || gamePhase !== 'playing' || !user) return;

    const checkBakhCollisions = () => {
      const collidedBakh = checkBakhCollision(playerPosition.x, playerPosition.y);
      if (collidedBakh) {
        console.log('Столкновение с bakh!', { playerPos: playerPosition, bakhPos: collidedBakh });
        // Игрок столкнулся с bakh - смерть
        setEliminatedPlayers(prev => {
          const newEliminated = new Set([...prev, user.user_id]);
          
          // Проверяем, не завершилась ли игра после смерти этого игрока
          setTimeout(() => {
            const allPlayers = getAllPlayerPositions();
            const finishedPlayers = allPlayers.filter(p => 
              checkFinishLine(p.position.x, p.position.y)
            );
            
            // Проверяем количество живых игроков (не достигших финиша и не умерших)
            const alivePlayers = allPlayers.filter(p => 
              !checkFinishLine(p.position.x, p.position.y) && 
              !newEliminated.has(p.player.player_number)
            );
            
            const requiredPlayers = Math.ceil(allPlayers.length / 2);
            
            // Если меньше половины дошло до финиша, но остальные все умерли - проходят те, кто дошел
            if (finishedPlayers.length < requiredPlayers && alivePlayers.length === 0 && finishedPlayers.length > 0) {
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
          }, 100); // Небольшая задержка для обновления состояния
          
          return newEliminated;
        });
        
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
    };

    const interval = setInterval(checkBakhCollisions, 50); // Проверяем каждые 50мс для более частой проверки
    return () => clearInterval(interval);
  }, [gameStarted, gamePhase, user, playerPosition.x, playerPosition.y, sendWS]);

  // Проверка столкновений с bakh
  const checkBakhCollision = (playerX: number, playerY: number) => {
    return bakhs.find(bakh => {
      // Упрощенная проверка - используем прямоугольники вместо кругов
      const bakhSize = 60 * scale; // Размер bakh
      const playerSize = 50 * scale; // Размер игрока
      
      const bakhLeft = bakh.x;
      const bakhRight = bakh.x + bakhSize;
      const bakhTop = bakh.y;
      const bakhBottom = bakh.y + bakhSize;
      
      const playerLeft = playerX - playerSize / 2;
      const playerRight = playerX + playerSize / 2;
      const playerTop = playerY - playerSize / 2;
      const playerBottom = playerY + playerSize / 2;
      
      // Проверяем пересечение прямоугольников
      return !(playerLeft > bakhRight || 
               playerRight < bakhLeft || 
               playerTop > bakhBottom || 
               playerBottom < bakhTop);
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

  // Обновляем позиции bakh при изменении размера экрана
  useEffect(() => {
    const basePositions = [
      { id: 1, x: 100, y: 0.6, direction: 1, speed: 2 }, // y как процент от высоты экрана
      { id: 2, x: 400, y: 0.7, direction: -1, speed: 1.5 },
      { id: 3, x: 700, y: 0.65, direction: 1, speed: 2.5 },
      { id: 4, x: 1000, y: 0.75, direction: -1, speed: 1.8 },
      { id: 5, x: 300, y: 0.8, direction: 1, speed: 2.2 },
      { id: 6, x: 800, y: 0.55, direction: -1, speed: 1.7 }
    ];
    
    setBakhs(basePositions.map(bakh => ({
      ...bakh,
      x: bakh.x * scaleX,
      y: bakh.y * screenHeight // y как процент от высоты экрана
    })));
  }, [scaleX, screenHeight]);

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
            
            // Проверяем количество живых игроков (не достигших финиша и не умерших)
            const alivePlayers = allPlayers.filter(p => 
              !checkFinishLine(p.position.x, p.position.y) && 
              !eliminatedPlayers.has(p.player.player_number)
            );
            
            // Если половина игроков достигла финиша - игра сразу заканчивается
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
            
            // Если меньше половины дошло до финиша, но остальные все умерли - проходят те, кто дошел
            if (finishedPlayers.length < requiredPlayers && alivePlayers.length === 0 && finishedPlayers.length > 0) {
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
      const collidedBakh = checkBakhCollision(newX, newY);
      if (collidedBakh) {
        console.log('Столкновение с bakh при движении!', { newPos: { x: newX, y: newY }, bakhPos: collidedBakh });
        // Игрок столкнулся с bakh - смерть
        if (user) {
          setEliminatedPlayers(prev => {
            const newEliminated = new Set([...prev, user.user_id]);
            
            // Проверяем, не завершилась ли игра после смерти этого игрока
            setTimeout(() => {
              const allPlayers = getAllPlayerPositions();
              const finishedPlayers = allPlayers.filter(p => 
                checkFinishLine(p.position.x, p.position.y)
              );
              
              // Проверяем количество живых игроков (не достигших финиша и не умерших)
              const alivePlayers = allPlayers.filter(p => 
                !checkFinishLine(p.position.x, p.position.y) && 
                !newEliminated.has(p.player.player_number)
              );
              
              const requiredPlayers = Math.ceil(allPlayers.length / 2);
              
              // Если меньше половины дошло до финиша, но остальные все умерли - проходят те, кто дошел
              if (finishedPlayers.length < requiredPlayers && alivePlayers.length === 0 && finishedPlayers.length > 0) {
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
            }, 100); // Небольшая задержка для обновления состояния
            
            return newEliminated;
          });
          
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
        return; // Прерываем выполнение функции
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
          
          // Проверяем количество живых игроков (не достигших финиша и не умерших)
          const alivePlayers = allPlayers.filter(p => 
            !checkFinishLine(p.position.x, p.position.y) && 
            !eliminatedPlayers.has(p.player.player_number)
          );
          
          const requiredPlayers = Math.ceil(allPlayers.length / 2);
          
          // Если половина игроков достигла финиша - игра сразу заканчивается
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
          
          // Если меньше половины дошло до финиша, но остальные все умерли - проходят те, кто дошел
          if (finishedPlayers.length < requiredPlayers && alivePlayers.length === 0 && finishedPlayers.length > 0) {
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
          setEliminatedPlayers(prev => {
            const newEliminated = new Set([...prev, user.user_id]);
            
            // Проверяем, не завершилась ли игра после смерти этого игрока
            setTimeout(() => {
              const allPlayers = getAllPlayerPositions();
              const finishedPlayers = allPlayers.filter(p => 
                checkFinishLine(p.position.x, p.position.y)
              );
              
              // Проверяем количество живых игроков (не достигших финиша и не умерших)
              const alivePlayers = allPlayers.filter(p => 
                !checkFinishLine(p.position.x, p.position.y) && 
                !newEliminated.has(p.player.player_number)
              );
              
              const requiredPlayers = Math.ceil(allPlayers.length / 2);
              
              // Если меньше половины дошло до финиша, но остальные все умерли - проходят те, кто дошел
              if (finishedPlayers.length < requiredPlayers && alivePlayers.length === 0 && finishedPlayers.length > 0) {
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
            }, 100); // Небольшая задержка для обновления состояния
            
            return newEliminated;
          });
          
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
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 z-30"
        style={{ top: `${32 * scale}px` }}
      >
        <div 
          className={`rounded-lg font-bold text-white shadow-lg ${
            lightState === 'red' 
              ? 'bg-red-600 animate-pulse' 
              : lightState === 'yellow'
              ? 'bg-yellow-600'
              : 'bg-green-600'
          }`}
          style={{
            padding: `${24 * scale}px ${48 * scale}px`,
            fontSize: `${32 * scale}px`,
            minWidth: `${300 * scale}px`,
            textAlign: 'center'
          }}
        >
          {lightState === 'red' ? '🔴 КРАСНЫЙ СВЕТ' : 
           lightState === 'yellow' ? '🟡 ЖЕЛТЫЙ СВЕТ' : 
           '🟢 ЗЕЛЕНЫЙ СВЕТ'}
        </div>
      </div>

      {/* Сообщение о смерти */}
      {showEliminationMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div 
            className="bg-red-600 text-white rounded-lg font-bold shadow-lg animate-pulse"
            style={{
              padding: `${16 * scale}px ${32 * scale}px`,
              fontSize: `${24 * scale}px`,
              minWidth: `${300 * scale}px`,
              textAlign: 'center'
            }}
          >
            {eliminationMessage}
          </div>
        </div>
      )}

      {/* Сообщение о победе */}
      {showVictoryMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div 
            className="bg-green-600 text-white rounded-lg font-bold shadow-lg animate-pulse"
            style={{
              padding: `${16 * scale}px ${32 * scale}px`,
              fontSize: `${24 * scale}px`,
              minWidth: `${300 * scale}px`,
              textAlign: 'center'
            }}
          >
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
                {/* Ноги bakh - анимированные и более видимые (снизу) */}
                {[...Array(6)].map((_, legIndex) => {
                  const legAngle = (legIndex * 60) + (bakhStep * 15); // Угол ноги
                  const legLength = 12 * scale;
                  const legX = bakh.x + 30 * scale + Math.cos(legAngle * Math.PI / 180) * legLength;
                  const legY = bakh.y + 30 * scale + Math.sin(legAngle * Math.PI / 180) * legLength;
                  
                  return (
                    <Rect
                      key={`leg-${legIndex}`}
                      x={legX}
                      y={legY}
                      width={3 * scale}
                      height={legLength}
                      fill="#654321"
                      stroke="#8B4513"
                      strokeWidth={1 * scale}
                      rotation={legAngle}
                      offsetX={1.5 * scale}
                      offsetY={legLength / 2}
                    />
                  );
                })}
                
                {/* Основное тело bakh (сверху) */}
                <Image
                  image={bakhImage}
                  x={bakh.x}
                  y={bakh.y}
                  width={60 * scale}
                  height={60 * scale}
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Счетчик игроков и кнопки */}
      <div 
        className="absolute right-8 z-30 flex flex-col items-end"
        style={{ 
          top: `${32 * scale}px`,
          gap: `${16 * scale}px` 
        }}
      >
        <div 
          className="bg-black bg-opacity-70 text-white rounded-lg"
          style={{
            padding: `${16 * scale}px ${24 * scale}px`,
            minWidth: `${200 * scale}px`
          }}
        >
          <p style={{ fontSize: `${24 * scale}px`, fontWeight: 'bold' }}>Игроков: {allPlayers.length}</p>
          <p style={{ fontSize: `${18 * scale}px` }}>Достигли финиша: {finishedPlayers.length}</p>
          <p style={{ fontSize: `${18 * scale}px` }}>Умерли: {eliminatedPlayers.size}</p>
        </div>
        
        {gamePhase === 'finished' && (
          <div 
            className="bg-green-600 text-white rounded-lg"
            style={{
              padding: `${16 * scale}px ${24 * scale}px`,
              minWidth: `${200 * scale}px`
            }}
          >
            <p style={{ fontSize: `${24 * scale}px`, fontWeight: 'bold' }}>Игра завершена!</p>
            <p style={{ fontSize: `${18 * scale}px` }}>Победители: {finishedPlayers.length} игроков</p>
          </div>
        )}
        
        <button
          onClick={gameStarted ? handleStopGame : handleStartGame}
          className={`rounded-lg font-bold transition-colors shadow-lg ${
            gameStarted 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          style={{
            padding: `${16 * scale}px ${40 * scale}px`,
            fontSize: `${24 * scale}px`,
            minWidth: `${160 * scale}px`
          }}
        >
          {gameStarted ? '⏹️ Остановить игру' : '🚦 Начать игру'}
        </button>
      </div>

      {/* Инструкции */}
      {showControls && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 z-30"
          style={{ bottom: `${32 * scale}px` }}
        >
          <div 
            className="bg-black bg-opacity-70 text-white rounded-lg text-center"
            style={{
              padding: `${16 * scale}px ${24 * scale}px`,
              maxWidth: `${400 * scale}px`,
              minWidth: `${300 * scale}px`
            }}
          >
            <p style={{ fontSize: `${18 * scale}px`, fontWeight: '500', marginBottom: `${8 * scale}px` }}>Управление</p>
            <p style={{ fontSize: `${14 * scale}px`, marginBottom: `${8 * scale}px` }}>WASD или стрелки для движения</p>
            <p style={{ fontSize: `${14 * scale}px`, marginBottom: `${8 * scale}px` }}>Двигайтесь на зеленый и желтый свет!</p>
            <p style={{ fontSize: `${14 * scale}px`, marginBottom: `${8 * scale}px` }}>Красный свет - стоп, движение = смерть!</p>
            <p style={{ fontSize: `${14 * scale}px`, marginBottom: `${8 * scale}px` }}>Достигните желтой линии для победы</p>
            <p style={{ fontSize: `${14 * scale}px`, marginBottom: `${16 * scale}px`, color: '#fbbf24' }}>Только первая половина игроков пройдет дальше</p>
            <button
              onClick={() => setShowControls(false)}
              className="bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              style={{
                padding: `${8 * scale}px ${24 * scale}px`,
                fontSize: `${14 * scale}px`
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 