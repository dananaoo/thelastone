import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { WS_EVENTS } from '../utils/constants';
import { Stage, Layer } from 'react-konva';
import { PlayerSprite } from '../canvas/PlayerSprite';

export const Lobby: React.FC = () => {
  const { game, user, sendWS, setGame } = useGameStore();
  const [isReady, setIsReady] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setStep(s => (s + 1) % 2), 300);
    return () => clearInterval(interval);
  }, []);

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    sendWS(WS_EVENTS.READY_CHECK, { ready: newReadyState });
  };

  const handleStartGame = () => {
    if (game) {
      // Обновляем состояние игры на Red Light
      setGame({
        ...game,
        stage: 'red_light',
        current_stage: 1
      });
      // Отправляем WebSocket сообщение о начале игры
      sendWS(WS_EVENTS.STAGE_TRANSITION, { stage: 'red_light' });
    }
  };

  const handleSendMessage = (message: string) => {
    if (message.trim()) {
      sendWS(WS_EVENTS.CHAT_MESSAGE, { message: message.trim() });
    }
  };

  if (!game) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: 'url(/lobby.png)' }}>
        <div className="text-center text-white bg-black bg-opacity-50 p-8 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Загрузка лобби...</p>
        </div>
      </div>
    );
  }

  const alivePlayers = game.players.filter(player => player.is_alive);
  const canvasWidth = 900;
  const canvasHeight = 400;
  const colCount = Math.min(8, alivePlayers.length);
  const rowCount = Math.ceil(alivePlayers.length / colCount);
  const cellW = canvasWidth / Math.max(1, colCount);
  const cellH = canvasHeight / Math.max(1, rowCount);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: 'url(/lobby.png)' }}>
      {/* Центрированный текст */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-center z-20 select-none px-8 py-4 rounded-lg bg-gray-800 bg-opacity-70 shadow-lg">
        <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">Лобби</h1>
        <p className="text-xl text-white drop-shadow mb-2">Игроков в комнате: {alivePlayers.length}</p>
      </div>

      {/* Canvas с игроками */}
      <div className="flex flex-col items-center justify-center w-full z-10">
        <Stage width={canvasWidth} height={canvasHeight} className="mx-auto rounded-lg bg-transparent">
          <Layer>
            {alivePlayers.map((player, idx) => {
              const col = idx % colCount;
              const row = Math.floor(idx / colCount);
              const x = cellW * (col + 0.5);
              const y = cellH * (row + 0.7);
              return (
                <PlayerSprite
                  key={player.player_number}
                  x={x}
                  y={y}
                  nickname={player.nickname + (player.nickname === user?.nickname ? ' (Вы)' : '')}
                  isCurrentPlayer={player.nickname === user?.nickname}
                  step={step}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Кнопка готов строго по центру экрана */}
      <div className="absolute left-1/2 bottom-24 transform -translate-x-1/2 z-30 flex flex-col items-center space-y-4">
        <button
          onClick={handleReadyToggle}
          className={`px-12 py-4 rounded-lg font-medium text-lg transition-colors shadow-lg ${
            isReady
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-700 text-white hover:bg-gray-800'
          }`}
          style={{ minWidth: 200 }}
        >
          {isReady ? '✅ Готов' : '⏳ Не готов'}
        </button>
        
        {/* Кнопка "Начать игру" - пока видна всем */}
        <button
          onClick={handleStartGame}
          className="px-12 py-4 rounded-lg font-bold text-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
          style={{ minWidth: 200 }}
        >
          🚦 Начать игру
        </button>
      </div>

      {/* Чат слева, прозрачный, при hover яркий */}
      <div className="absolute top-24 left-8 z-30">
        <Chat onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

// Чат — прозрачный, при hover яркий, слева
interface ChatProps {
  onSendMessage: (message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ onSendMessage }) => {
  const { chatMessages } = useGameStore();
  const [message, setMessage] = useState('');
  const [hover, setHover] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(message);
    setMessage('');
  };

  return (
    <div
      className={`rounded-2xl shadow-lg p-8 flex flex-col transition-all duration-200 ${
        hover ? 'bg-white bg-opacity-95' : 'bg-white bg-opacity-40'
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ minWidth: 340, width: 360, height: 480 }}
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Чат</h2>
      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Нет сообщений</p>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="bg-gray-100 rounded-lg p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-800">{msg.nickname}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-gray-700">{msg.message}</p>
            </div>
          ))
        )}
      </div>
      {/* Форма отправки */}
      <form onSubmit={handleSubmit} className="flex w-full gap-2 mt-auto justify-start">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение..."
          className="flex-1 max-w-[210px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 max-w-[110px] bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}; 