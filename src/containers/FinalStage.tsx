import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const FinalStage: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { game } = useGameStore();
  const [isMasked, setIsMasked] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  // Победители — все живые игроки
  const winners = game?.players.filter(p => p.is_alive) || [];

  // Конфетти эффект
  useEffect(() => {
    const interval = setInterval(() => {
      setShowConfetti(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMaskClick = () => {
    setIsMasked(!isMasked);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-y-auto" style={{ background: 'url(/final.png) center/cover no-repeat' }}>
      {/* Конфетти эффект */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400'][Math.floor(Math.random() * 5)]}`}></div>
            </div>
          ))}
        </div>
      )}

      <div className="absolute inset-0 z-10">
        {/* Canvas для ведущего и победителей */}
        <div className="flex flex-col items-center justify-center py-12">
          {/* Заголовок с анимацией */}
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg mb-8 mt-12 animate-pulse" 
              style={{ 
                textShadow: '0 4px 20px #000, 0 0 40px rgba(255, 215, 0, 0.5)',
                animationDuration: '3s'
              }}>
            🎉 Поздравляем победителей! 🎉
          </h1>

          {/* Подзаголовок */}
          <p className="text-xl md:text-2xl text-yellow-300 mb-12 animate-bounce" style={{ animationDuration: '2s' }}>
            🏆 Вы прошли все испытания! 🏆
          </p>

          <div className="flex flex-row items-end justify-center gap-8 mb-12">
            {/* Победители с анимацией */}
            {winners.map((player, index) => (
              <div 
                key={player.player_number} 
                className="flex flex-col items-center animate-bounce"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                {/* Аватарка с эффектами */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-300 flex items-center justify-center overflow-hidden mb-4 shadow-2xl hover:scale-110 transition-transform duration-300 relative">
                  {/* Блики */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent opacity-30 rounded-full"></div>
                  <span className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg relative z-10">
                    {player.nickname[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-white font-bold text-lg md:text-xl drop-shadow-lg text-center" 
                      style={{ textShadow: '0 2px 8px #000' }}>
                  {player.nickname}
                </span>
                {/* Корона для победителя */}
                <div className="text-2xl mt-2 animate-pulse">👑</div>
              </div>
            ))}

            {/* Ведущий с интерактивностью */}
            <div className="flex flex-col items-center ml-12">
              <div 
                className="cursor-pointer hover:scale-110 transition-transform duration-300"
                onClick={handleMaskClick}
                title="Нажмите, чтобы раскрыть тайну!"
              >
                {isMasked ? (
                  <img 
                    src="/maska.png" 
                    alt="Ведущий" 
                    className="w-32 md:w-48 drop-shadow-2xl" 
                  />
                ) : (
                  <img 
                    src="/ceo.png" 
                    alt="CEO" 
                    className="w-40 md:w-56 drop-shadow-2xl" 
                  />
                )}
              </div>
              <span className="text-white text-lg md:text-xl mt-3 font-semibold drop-shadow-lg">
                {isMasked ? 'Ведущий' : 'CEO'}
              </span>
              <span className="text-yellow-300 text-sm md:text-base mt-2 animate-pulse">
                {isMasked ? '👆 Нажмите!' : '🎭 Тайна раскрыта!'}
              </span>
            </div>
          </div>

          {/* Статистика */}
          <div className="bg-black bg-opacity-50 rounded-2xl p-6 mb-8 backdrop-blur-sm border border-yellow-400">
            <div className="text-center text-white">
              <p className="text-lg md:text-xl font-bold mb-2">
                🎮 Всего игроков: {game?.players.length || 0}
              </p>
              <p className="text-lg md:text-xl font-bold text-yellow-300">
                🏆 Победителей: {winners.length}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                💰 Призовой фонд: {new Intl.NumberFormat('kk-KZ', {
                  style: 'currency',
                  currency: 'KZT',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(game?.prize_pool || 0)}
              </p>
            </div>
          </div>

          {/* Кнопка выхода с эффектами */}
          <button
            onClick={onExit}
            className="mt-8 px-12 py-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-xl font-bold rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-3xl border-2 border-yellow-300 animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            🚪 Выйти в лобби
          </button>
        </div>
      </div>
    </div>
  );
}; 