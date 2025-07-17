import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { WS_EVENTS } from '../utils/constants';
import { Stage, Layer, Image } from 'react-konva';
import { PlayerSprite } from '../canvas/PlayerSprite';
import useImage from 'use-image';

// Кастомная CSS анимация для мягкого пульсирования
const gentlePulseStyle = `
  @keyframes gentlePulse {
    0%, 100% {
      box-shadow: 0 0 40px rgba(147, 51, 234, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
      transform: scale(1);
      opacity: 1;
    }
    50% {
      box-shadow: 0 0 60px rgba(147, 51, 234, 0.7), 0 0 30px rgba(59, 130, 246, 0.5);
      transform: scale(1.01);
      opacity: 0.95;
    }
  }
`;

// Добавляем стили в head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = gentlePulseStyle;
  document.head.appendChild(styleElement);
}

interface QuizQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

// Примеры вопросов для квиза
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Какая столица Казахстана?",
    options: {
      A: "Алматы",
      B: "Астана",
      C: "Караганда",
      D: "Шымкент"
    },
    correctAnswer: "B"
  },
  {
    id: 2,
    question: "Сколько игроков участвует в игре 'The Last CEO'?",
    options: {
      A: "50",
      B: "60", 
      C: "80",
      D: "100"
    },
    correctAnswer: "C"
  },
  {
    id: 3,
    question: "Какой цвет сигнала означает 'можно двигаться' в игре Red Light Green Light?",
    options: {
      A: "Красный",
      B: "Желтый",
      C: "Зеленый",
      D: "Синий"
    },
    correctAnswer: "C"
  }
];

export const Quiz: React.FC = () => {
  const { game, user, sendWS, setGame } = useGameStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Set<number>>(new Set());
  const [eliminationMessage, setEliminationMessage] = useState<string>('');
  const [showEliminationMessage, setShowEliminationMessage] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [timeLeft, setTimeLeft] = useState(30); // 30 секунд на ответ
  const [finalStatus, setFinalStatus] = useState<'dead' | 'win' | null>(null);

  // Загружаем изображения
  const [quizImage] = useImage('/quiz.png');

  // Слушатель изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Адаптивные размеры
  const screenWidth = windowSize.width;
  const screenHeight = windowSize.height;
  const baseScreenWidth = 1920;
  const baseScreenHeight = 1080;
  
  const scaleX = screenWidth / baseScreenWidth;
  const scaleY = screenHeight / baseScreenHeight;
  const scale = Math.min(scaleX, scaleY);

  // Позиция текущего игрока
  const [playerPosition, setPlayerPosition] = useState({ x: screenWidth/2, y: screenHeight * 0.75 });

  // Обновляем позицию игрока при изменении размера окна
  useEffect(() => {
    setPlayerPosition({ x: screenWidth / 2, y: screenHeight * 0.75 });
  }, [screenWidth, screenHeight]);

  // Размеры для персонажа в маске (адаптивные)
  const quizPersonWidth = 400 * scale;
  const quizPersonHeight = 600 * scale;
  const quizPersonX = screenWidth - quizPersonWidth - 50 * scaleX; // Отступ от правого края
  const quizPersonY = screenHeight - quizPersonHeight - 50 * scaleY; // Отступ от нижнего края

  // Позиции для игроков (по кругу в нижней части экрана, адаптивные)
  const getPlayerPositions = (playerCount: number) => {
    const positions = [];
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.75; // 75% от высоты экрана (нижняя часть)
    const radius = Math.min(screenWidth, screenHeight) * 0.12 * scale; // Адаптивный радиус
    
    for (let i = 0; i < playerCount; i++) {
      const angle = (i / playerCount) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push({ x, y });
    }
    
    return positions;
  };

  // Получение живых игроков
  const getAlivePlayers = () => {
    if (!game) return [];
    
    const alivePlayers = game.players.filter(player => 
      player.is_alive && !eliminatedPlayers.has(player.player_number)
    );
    
    return alivePlayers.map((player, index) => {
      const positions = getPlayerPositions(alivePlayers.length);
      const isCurrentPlayer = player.nickname === user?.nickname;
      
      return {
        player,
        position: isCurrentPlayer ? playerPosition : positions[index] || { x: screenWidth / 2, y: screenHeight / 2 },
        isCurrentPlayer
      };
    });
  };

  // Обработка движения игрока
  useEffect(() => {
    const handleKeyDownEvent = (e: KeyboardEvent) => {
      if (gameCompleted) return; // Не двигаемся если игра завершена

      const moveDistance = 15 * scale;
      let newX = playerPosition.x;
      let newY = playerPosition.y;

      // Границы экрана с отступами
      const minX = 0;
      const maxX = screenWidth;
      const minY = screenHeight / 2;
      const maxY = screenHeight - 50;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          newY = Math.max(minY, playerPosition.y - moveDistance);
          break;
        case 'ArrowDown':
        case 's':
          newY = Math.min(maxY, playerPosition.y + moveDistance);
          break;
        case 'ArrowLeft':
        case 'a':
          newX = Math.max(minX, playerPosition.x - moveDistance);
          break;
        case 'ArrowRight':
        case 'd':
          newX = Math.min(maxX, playerPosition.x + moveDistance);
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
  }, [playerPosition, gameCompleted, scale, screenWidth, screenHeight, sendWS]);

  // Таймер для каждого вопроса
  useEffect(() => {
    if (gameCompleted || selectedAnswer !== null) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Время истекло - игрок умирает
          if (user) {
            setEliminatedPlayers(prev => new Set([...prev, user.user_id]));
            setEliminationMessage(`${user.nickname} умер! Время истекло!`);
            setShowEliminationMessage(true);
            setFinalStatus('dead');
            sendWS(WS_EVENTS.PLAYER_ELIMINATED, { 
              player_number: user.user_id,
              reason: 'quiz_timeout'
            });
          }
          return 30; // Сброс таймера
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, gameCompleted, selectedAnswer, user, sendWS]);

  // Сброс таймера при смене вопроса
  useEffect(() => {
    setTimeLeft(30);
  }, [currentQuestionIndex]);

  // Обработка ответа
  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return; // Уже ответили
    
    setSelectedAnswer(answer);
    const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    // Если ответ неправильный - игрок умирает
    if (!correct && user) {
      setEliminatedPlayers(prev => new Set([...prev, user.user_id]));
      setEliminationMessage(`${user.nickname} умер! Неправильный ответ!`);
      setShowEliminationMessage(true);
      setFinalStatus('dead');
      sendWS(WS_EVENTS.PLAYER_ELIMINATED, { 
        player_number: user.user_id,
        reason: 'wrong_quiz_answer'
      });
      return;
    }

    // Переходим к следующему вопросу через 3 секунды
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Игра завершена
        setGameCompleted(true);
        setFinalStatus('win');
      }
    }, 3000);
  };

  if (!game) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: 'url(/karusel.png)' }}>
        <div 
          className="text-center text-white bg-black bg-opacity-50 p-8 rounded-lg"
          style={{ 
            padding: `${32 * scale}px`,
            borderRadius: `${8 * scale}px`
          }}
        >
          <div 
            className="animate-spin rounded-full border-b-2 border-white mx-auto mb-4"
            style={{ 
              height: `${48 * scale}px`,
              width: `${48 * scale}px`,
              marginBottom: `${16 * scale}px`
            }}
          ></div>
          <p style={{ fontSize: `${Math.max(14, 18 * scale)}px` }}>Загрузка квиза...</p>
        </div>
      </div>
    );
  }

  const alivePlayers = getAlivePlayers();
  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];

  // Экран смерти
  if (finalStatus === 'dead') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="text-4xl font-bold text-red-600 mb-8">Вы умерли!</div>
        <button
          className="px-8 py-4 bg-gray-800 text-white text-xl rounded-2xl shadow-lg hover:bg-gray-700 transition"
          onClick={() => {
            // Переход на финальный этап
            if (game) {
              setGame({ ...game, stage: 'final_stage' });
            }
          }}
        >
          Завершить игру
        </button>
      </div>
    );
  }

  // Экран победы
  if (finalStatus === 'win') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="text-4xl font-bold text-green-400 mb-8">Вы прошли на финальный этап!</div>
        <button
          className="px-8 py-4 bg-yellow-500 text-white text-xl rounded-2xl shadow-lg hover:bg-yellow-600 transition"
          onClick={() => {
            if (game) {
              setGame({ ...game, stage: 'final_stage' });
            }
          }}
        >
          Далее
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" 
      style={{ backgroundImage: 'url(/karusel.png)' }}
    >
      {/* Заголовок */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
        <div 
          className="bg-black bg-opacity-70 text-white px-8 py-4 rounded-lg font-bold shadow-lg" 
          style={{ 
            fontSize: `${Math.max(16, 24 * scale)}px`,
            padding: `${16 * scale}px ${32 * scale}px`
          }}
        >
          🎭 Уровень Квиз - Вопрос {currentQuestionIndex + 1} из {QUIZ_QUESTIONS.length}
        </div>
      </div>

      {/* Сообщение о смерти */}
      {showEliminationMessage && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div 
            className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg animate-pulse" 
            style={{ 
              fontSize: `${Math.max(18, 28 * scale)}px`,
              padding: `${16 * scale}px ${32 * scale}px`
            }}
          >
            {eliminationMessage}
          </div>
        </div>
      )}

      {/* Сообщение о победе */}
      {/* Сообщение о победе */}

      {/* Canvas с игроками и персонажем в маске */}
      <div className="absolute inset-0 z-10">
        <Stage width={screenWidth} height={screenHeight}>
          <Layer>
            {/* Персонаж в маске */}
            {quizImage && (
              <Image
                image={quizImage}
                x={quizPersonX}
                y={quizPersonY}
                width={quizPersonWidth}
                height={quizPersonHeight}
              />
            )}
            
            {/* Игроки по кругу */}
            {alivePlayers.map((playerData) => (
              <PlayerSprite
                key={playerData.player.player_number}
                x={playerData.position.x}
                y={playerData.position.y}
                nickname={playerData.player.nickname + (playerData.isCurrentPlayer ? ' (Вы)' : '')}
                isCurrentPlayer={playerData.isCurrentPlayer}
                step={0}
                scale={scale}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Вопрос и варианты ответов */}
      {!gameCompleted && (
        <div className="absolute top-32 z-30" style={{ 
          right: `${200 + 64}px`, // 200px влево от текущей позиции (right-16 = 64px)
          maxWidth: `${Math.min(1200 * scale, screenWidth * 0.75 + 200)}px` // +200px к ширине
        }}>
          <div className="relative">
            {/* Основной блок с градиентом и тенью */}
            <div 
              className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8 rounded-2xl relative shadow-2xl border-2 border-purple-400" 
              style={{ 
                fontSize: `${Math.max(14, 18 * scale)}px`,
                padding: `${40 * scale}px`,
                borderRadius: `${24 * scale}px`,
                boxShadow: `0 0 ${40 * scale}px rgba(147, 51, 234, 0.5), 0 0 ${20 * scale}px rgba(59, 130, 246, 0.3)`,
                animation: 'gentlePulse 3s ease-in-out infinite'
              }}
            >
              {/* Хвостик диалогового окна с градиентом */}
              <div 
                className="absolute top-1/2 -right-4 transform -translate-y-1/2 w-0 h-0"
                style={{ 
                  borderLeft: `${20 * scale}px solid #7c3aed`,
                  borderTop: `${20 * scale}px solid transparent`,
                  borderBottom: `${20 * scale}px solid transparent`,
                  filter: 'drop-shadow(2px 0 4px rgba(0,0,0,0.3))'
                }}
              ></div>
              
              {/* Декоративные элементы */}
              <div 
                className="absolute top-2 right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"
                style={{ 
                  width: `${16 * scale}px`,
                  height: `${16 * scale}px`,
                  animationDuration: '2s'
                }}
              ></div>
              <div 
                className="absolute bottom-2 left-2 w-3 h-3 bg-cyan-400 rounded-full animate-ping"
                style={{ 
                  width: `${12 * scale}px`,
                  height: `${12 * scale}px`,
                  animationDuration: '1.5s'
                }}
              ></div>
              
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="font-bold text-center flex-1" 
                  style={{ 
                    fontSize: `${Math.max(18, 28 * scale)}px`
                  }}
                >
                  {currentQuestion.question}
                </h2>
                <div 
                  className={`ml-4 px-4 py-2 rounded-full font-bold text-white ${
                    timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 
                    timeLeft <= 20 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ 
                    fontSize: `${Math.max(14, 20 * scale)}px`,
                    padding: `${8 * scale}px ${16 * scale}px`,
                    borderRadius: `${20 * scale}px`
                  }}
                >
                  ⏰ {timeLeft}s
                </div>
              </div>
              
              <div 
                className="grid grid-cols-2 gap-4"
                style={{ gap: `${16 * scale}px` }}
              >
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleAnswerSelect(key)}
                    disabled={selectedAnswer !== null}
                    className={`rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                      selectedAnswer === key
                        ? isCorrect
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                        : selectedAnswer !== null
                        ? key === currentQuestion.correctAnswer
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                          : 'bg-gray-600 text-gray-300'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ 
                      fontSize: `${Math.max(14, 20 * scale)}px`, 
                      padding: `${20 * scale}px`,
                      borderRadius: `${12 * scale}px`
                    }}
                  >
                    <span className="font-bold">{key}.</span> {value}
                  </button>
                ))}
              </div>
              
              {showResult && (
                <div className="mt-4 text-center" style={{ marginTop: `${16 * scale}px` }}>
                  <div 
                    className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}
                    style={{ fontSize: `${Math.max(16, 24 * scale)}px` }}
                  >
                    {isCorrect ? '✅ Правильно!' : '❌ Неправильно!'}
                  </div>
                  <div 
                    className="text-gray-300 mt-2"
                    style={{ 
                      fontSize: `${Math.max(12, 16 * scale)}px`,
                      marginTop: `${8 * scale}px`
                    }}
                  >
                    Правильный ответ: {currentQuestion.correctAnswer}. {currentQuestion.options[currentQuestion.correctAnswer as keyof typeof currentQuestion.options]}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Счетчик игроков */}
      <div className="absolute top-8 right-8 z-30">
        <div 
          className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg" 
          style={{ 
            fontSize: `${Math.max(12, 16 * scale)}px`,
            padding: `${8 * scale}px ${16 * scale}px`,
            borderRadius: `${8 * scale}px`
          }}
        >
          <p 
            className="font-bold"
            style={{ fontSize: `${Math.max(14, 20 * scale)}px` }}
          >
            Игроков: {alivePlayers.length}
          </p>
          <p 
            className="text-sm"
            style={{ fontSize: `${Math.max(12, 16 * scale)}px` }}
          >
            Умерли: {eliminatedPlayers.size}
          </p>
          <p 
            className="text-gray-300 mt-1"
            style={{ 
              fontSize: `${Math.max(10, 14 * scale)}px`,
              marginTop: `${4 * scale}px`
            }}
          >
            WASD для движения
          </p>
        </div>
      </div>
    </div>
  );
}; 