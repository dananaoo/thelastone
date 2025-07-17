import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Gender, Hat, Skin, Accessory } from '../store/gameStore';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'other', label: 'Другое' },
];
const HATS: { value: Hat; label: string }[] = [
  { value: 'none', label: 'Без головного убора' },
  { value: 'cap', label: 'Кепка' },
  { value: 'crown', label: 'Корона' },
  { value: 'bandana', label: 'Бандана' },
];
const SKINS: { value: Skin; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'tan', label: 'Смуглая' },
  { value: 'brown', label: 'Коричневая' },
  { value: 'dark', label: 'Темная' },
];
const ACCESSORIES: { value: Accessory; label: string }[] = [
  { value: 'none', label: 'Без аксессуара' },
  { value: 'glasses', label: 'Очки' },
  { value: 'earrings', label: 'Серьги' },
  { value: 'scarf', label: 'Шарф' },
];

interface ProfileCustomizationProps {
  onDone: () => void;
}

export const ProfileCustomization: React.FC<ProfileCustomizationProps> = ({ onDone }) => {
  const { user, customization, setCustomization } = useGameStore();
  const [localCustom, setLocalCustom] = useState(customization);

  const handleChange = <K extends keyof typeof localCustom>(key: K, value: typeof localCustom[K]) => {
    setLocalCustom((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomization(localCustom);
    onDone();
  };

  return (
    <>
      <div className="fixed inset-0 w-screen h-screen bg-cover bg-center" style={{ backgroundImage: 'url(/lobby.png), linear-gradient(135deg, #2e026d 0%, #15162c 100%)' }} />
      <div className="fixed inset-0 bg-black bg-opacity-60 z-0" />
      <div className="relative z-10 min-h-screen flex items-center justify-center overflow-y-auto" style={{ minHeight: '100vh' }}>
        <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-10 w-full max-w-md border-2 border-blue-700 backdrop-blur-md my-12 overflow-y-auto" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2"><span className="text-4xl">🧑‍🎨</span></div>
            <h1 className="text-4xl font-extrabold text-blue-800 mb-2 drop-shadow">Профиль</h1>
            <p className="text-gray-700 text-lg font-medium">Настройте внешний вид своего персонажа</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Никнейм</label>
              <div className="px-4 py-3 border-2 border-blue-300 rounded-lg bg-gray-100 text-gray-800 text-lg">
                {user?.nickname || '—'}
              </div>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Пол</label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                value={localCustom.gender}
                onChange={e => handleChange('gender', e.target.value as Gender)}
              >
                {GENDERS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Головной убор</label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                value={localCustom.hat}
                onChange={e => handleChange('hat', e.target.value as Hat)}
              >
                {HATS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Цвет кожи</label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                value={localCustom.skin}
                onChange={e => handleChange('skin', e.target.value as Skin)}
              >
                {SKINS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Аксессуар</label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white bg-opacity-90"
                value={localCustom.accessory}
                onChange={e => handleChange('accessory', e.target.value as Accessory)}
              >
                {ACCESSORIES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg text-lg font-bold shadow-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-150"
            >
              Далее
            </button>
          </form>
        </div>
      </div>
    </>
  );
}; 