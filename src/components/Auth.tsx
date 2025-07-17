import React, { useState } from 'react';
import { authAPI, type RegisterData, type LoginData } from '../api/auth';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../utils/constants';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useGameStore();

  const [formData, setFormData] = useState<RegisterData & LoginData>({
    nickname: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (isLogin) {
        const loginData: LoginData = {
          nickname: formData.nickname,
          password: formData.password
        };
        response = await authAPI.login(loginData);
      } else {
        const registerData: RegisterData = {
          nickname: formData.nickname,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirm_password
        };
        response = await authAPI.register(registerData);
      }

      // Обновляем пользователя в store
      setUser({
        token: response.token,
        user_id: response.user_id,
        nickname: response.nickname,
        balance: response.balance,
        avatar_color: '#FF6B6B', // Дефолтный цвет
        avatar_pattern: 'solid' // Дефолтный паттерн
      });

      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData({
      nickname: '',
      email: '',
      password: '',
      confirm_password: ''
    });
  };

  return (
    <>
      <div className="fixed inset-0 w-screen h-screen bg-cover bg-center" style={{ backgroundImage: 'url(/lobby.png), linear-gradient(135deg, #2e026d 0%, #15162c 100%)' }} />
      <div className="fixed inset-0 bg-black bg-opacity-60 z-0" />
      <div className="relative z-10 min-h-screen flex items-center justify-center overflow-y-auto" style={{ minHeight: '100vh' }}>
        <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-10 w-full max-w-md border-2 border-blue-700 backdrop-blur-md my-12 overflow-y-auto" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2"><span className="text-4xl">🕹️</span></div>
            <h1 className="text-4xl font-extrabold text-blue-800 mb-2 drop-shadow">TheLastCeo</h1>
            <p className="text-gray-700 text-lg font-medium">
              {isLogin ? 'Войдите в игру' : 'Создайте аккаунт'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label htmlFor="nickname" className="block text-base font-semibold text-gray-700 mb-2">
                Никнейм
              </label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                placeholder="Введите никнейм"
              />
            </div>
            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-base font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                  placeholder="Введите email"
                />
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-base font-semibold text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                placeholder="Введите пароль"
              />
            </div>
            {!isLogin && (
              <div>
                <label htmlFor="confirm_password" className="block text-base font-semibold text-gray-700 mb-2">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                  placeholder="Подтвердите пароль"
                />
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg text-lg font-bold shadow-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-blue-700 hover:text-blue-900 text-base font-medium underline underline-offset-2"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
          {!isLogin && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                🎁 При регистрации вы получите {formatCurrency(200000)} на баланс!
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}; 