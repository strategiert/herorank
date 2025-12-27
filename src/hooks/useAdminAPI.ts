import { useState, useEffect, useCallback } from 'react';
import type { Hero } from '../types/hero';

const API_BASE = 'http://localhost:3001/api';

export function useAdminAPI() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all heroes
  const fetchHeroes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/heroes`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setHeroes(data);
    } catch (err) {
      console.error('Failed to fetch heroes:', err);
      setError(err instanceof Error ? err.message : 'Verbindung zum Server fehlgeschlagen. Ist der Server gestartet?');
      // Fallback to local data if API is not available
      try {
        const { superheroes } = await import('../data/superheroes');
        setHeroes(superheroes);
      } catch {
        setHeroes([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a single hero
  const updateHero = useCallback(async (id: number, updates: Partial<Hero>) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/heroes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const updatedHero = await res.json();
      setHeroes(prev => prev.map(h => h.id === id ? updatedHero : h));
      return updatedHero;
    } catch (err) {
      console.error('Failed to update hero:', err);
      setError(err instanceof Error ? err.message : 'Update fehlgeschlagen');
      throw err;
    }
  }, []);

  // Bulk update heroes
  const bulkUpdateHeroes = useCallback(async (updates: Array<{ id: number } & Partial<Hero>>) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/heroes/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroes: updates }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      // Refresh the full list after bulk update
      await fetchHeroes();
      return data;
    } catch (err) {
      console.error('Failed to bulk update heroes:', err);
      setError(err instanceof Error ? err.message : 'Bulk update fehlgeschlagen');
      throw err;
    }
  }, [fetchHeroes]);

  // Export heroes
  const exportHeroes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/export`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to export heroes:', err);
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen');
      throw err;
    }
  }, []);

  // Get stats
  const getStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to get stats:', err);
      throw err;
    }
  }, []);

  // Refresh heroes from API
  const refreshHeroes = useCallback(() => {
    fetchHeroes();
  }, [fetchHeroes]);

  // Initial fetch
  useEffect(() => {
    fetchHeroes();
  }, [fetchHeroes]);

  return {
    heroes,
    loading,
    error,
    updateHero,
    bulkUpdateHeroes,
    exportHeroes,
    getStats,
    refreshHeroes,
  };
}
