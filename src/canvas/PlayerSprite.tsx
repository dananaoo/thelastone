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
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({
  x,
  y,
  nickname,
  avatarUrl = '/per.png',
  isCurrentPlayer = false,
  step = 0,
}) => {
  // Загружаем аватар
  const [image] = useImage(avatarUrl);

  // Размеры
  const avatarSize = 32;
  const legWidth = 6;
  const legHeight = 18;
  const bodyWidth = 24;
  const bodyHeight = 8;

  // Смещение ног для анимации
  const legOffset = step === 0 ? -4 : 4;

  return (
    <Group x={x} y={y}>
      {/* Никнейм */}
      <Text
        text={nickname}
        fontSize={12}
        fontStyle={isCurrentPlayer ? 'bold' : 'normal'}
        fill={isCurrentPlayer ? '#2563eb' : '#333'}
        align="center"
        width={avatarSize}
        y={-24}
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
        cornerRadius={4}
        shadowBlur={2}
      />
      {/* Левая нога */}
      <Rect
        x={-bodyWidth / 4 - legWidth / 2 + legOffset}
        y={bodyHeight}
        width={legWidth}
        height={legHeight}
        fill="#444"
        cornerRadius={3}
      />
      {/* Правая нога */}
      <Rect
        x={bodyWidth / 4 - legWidth / 2 - legOffset}
        y={bodyHeight}
        width={legWidth}
        height={legHeight}
        fill="#444"
        cornerRadius={3}
      />
    </Group>
  );
}; 