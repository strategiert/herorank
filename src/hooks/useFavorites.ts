import { useState, useEffect } from 'react';
import type { Hero } from '../types/hero';

const STORAGE_KEY = 'herorank-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  const toggleFavorite = (hero: Hero) => {
    setFavorites((prev) => {
      if (prev.includes(hero.id)) {
        return prev.filter((id) => id !== hero.id);
      }
      return [...prev, hero.id];
    });
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const isFavorite = (heroId: number) => favorites.includes(heroId);

  return {
    favorites,
    toggleFavorite,
    clearFavorites,
    isFavorite,
  };
}
