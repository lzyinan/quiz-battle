import { useState, useEffect } from 'react';
import type { Question } from '../../../../shared/types';
import { isFavorite, toggleFavorite } from '../../utils/favorites';

interface FavoriteButtonProps {
  question: Question;
  className?: string;
}

export default function FavoriteButton({ question, className = '' }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(() => isFavorite(question.id));

  useEffect(() => {
    setFavorited(isFavorite(question.id));
  }, [question.id]);

  const handleToggle = () => {
    toggleFavorite(question);
    setFavorited(!favorited);
  };

  return (
    <button
      onClick={handleToggle}
      className={`transition-all duration-200 hover:scale-110 active:scale-95 ${className}`}
      title={favorited ? '取消收藏' : '收藏此题'}
    >
      <span className={`text-xl ${favorited ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
        {favorited ? '⭐' : '☆'}
      </span>
    </button>
  );
}
