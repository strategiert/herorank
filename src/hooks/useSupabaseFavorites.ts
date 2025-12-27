import { useState, useEffect, useCallback } from 'react';
import { supabase, getAnonymousUserId, type UserFavorite } from '../lib/supabase';
import type { Hero } from '../types/hero';

/**
 * Hook für Favoriten mit Supabase-Sync
 * Fallback auf localStorage wenn Supabase nicht konfiguriert
 */
export function useSupabaseFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Lade Favoriten beim Start
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setIsLoading(true);

    // Versuche Supabase, falls konfiguriert
    if (supabase) {
      try {
        const userId = getAnonymousUserId();
        const { data, error } = await supabase
          .from('favorites')
          .select('hero_id')
          .eq('user_id', userId);

        if (!error && data) {
          setFavorites(data.map((f: { hero_id: number }) => f.hero_id));
          setIsSynced(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Supabase Fehler, nutze localStorage:', e);
      }
    }

    // Fallback: localStorage
    const stored = localStorage.getItem('herorank_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
    setIsLoading(false);
  };

  const toggleFavorite = useCallback(async (hero: Hero) => {
    const heroId = hero.id;
    const isFavorite = favorites.includes(heroId);

    // Optimistisches Update
    const newFavorites = isFavorite
      ? favorites.filter(id => id !== heroId)
      : [...favorites, heroId];

    setFavorites(newFavorites);
    localStorage.setItem('herorank_favorites', JSON.stringify(newFavorites));

    // Sync mit Supabase
    if (supabase) {
      const userId = getAnonymousUserId();

      try {
        if (isFavorite) {
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('hero_id', heroId);
        } else {
          await supabase
            .from('favorites')
            .insert({ user_id: userId, hero_id: heroId });
        }
      } catch (e) {
        console.warn('Supabase Sync Fehler:', e);
      }
    }
  }, [favorites]);

  return {
    favorites,
    toggleFavorite,
    isLoading,
    isSynced
  };
}
