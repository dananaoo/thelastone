import React from 'react';
import { Group, Rect, Image, Text } from 'react-konva';
import useImage from 'use-image';

interface PlayerSpriteProps {
  x: number;
  y: number;
  nickname: string;
  avatarUrl?: string;
  isCurrentPlayer?: boolean;
  step?: number;
  scale?: number;
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({
  x,
  y,
  nickname,
  avatarUrl = '/per.png',
  isCurrentPlayer = false,
  step = 0,
  scale = 1,
}) => {
  // Загружаем аватар
  const [image] = useImage(avatarUrl);

  // Размеры с учетом масштаба - увеличенные размеры
  const avatarSize = 48 * scale; // Увеличили с 32 до 48
  const legWidth = 8 * scale;    // Увеличили с 6 до 8
  const legHeight = 24 * scale;  // Увеличили с 18 до 24
  const bodyWidth = 32 * scale;  // Увеличили с 24 до 32
  const bodyHeight = 12 * scale; // Увеличили с 8 до 12

  // Смещение ног для анимации
  const legOffset = (step === 0 ? -6 : 6) * scale; // Увеличили с 4 до 6

  return (
    <Group x={x} y={y}>
      {/* Никнейм */}
      <Text
        text={nickname}
        fontSize={16 * scale} // Увеличили с 12 до 16
        fontStyle={isCurrentPlayer ? 'bold' : 'normal'}
        fill={isCurrentPlayer ? '#2563eb' : '#333'}
        align="center"
        width={avatarSize}
        y={-32 * scale} // Увеличили с -24 до -32
        x={-avatarSize / 2}
      />
      {/* Аватар */}
      <Image
        image={image}
        width={avatarSize}
        height={avatarSize}
        x={-avatarSize / 2}
        y={-avatarSize}
        cornerRadius={avatarSize / 2}
      />
      {/* Туловище (можно убрать если не нужно) */}
      <Rect
        x={-bodyWidth / 2}
        y={0}
        width={bodyWidth}
        height={bodyHeight}
        fill={isCurrentPlayer ? '#2563eb' : '#bbb'}
        cornerRadius={4 * scale}
        shadowBlur={2 * scale}
      />
      {/* Левая нога */}
      <Rect
        x={-bodyWidth / 4 - legWidth / 2 + legOffset}
        y={bodyHeight}
        width={legWidth}
        height={legHeight}
        fill="#444"
        cornerRadius={3 * scale}
      />
      {/* Правая нога */}
      <Rect
        x={bodyWidth / 4 - legWidth / 2 - legOffset}
        y={bodyHeight}
        width={legWidth}
        height={legHeight}
        fill="#444"
        cornerRadius={3 * scale}
      />
    </Group>
  );
}; 