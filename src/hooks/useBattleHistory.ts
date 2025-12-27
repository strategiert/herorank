import { useState, useEffect, useCallback } from 'react';
import { supabase, getAnonymousUserId, type BattleHistory } from '../lib/supabase';
import type { Hero } from '../types/hero';

interface BattleRecord {
  id: string;
  winnerId: number;
  loserId: number;
  winnerName: string;
  loserName: string;
  rounds: number;
  date: string;
}

/**
 * Hook für Battle-Historie mit Supabase-Sync
 */
export function useBattleHistory() {
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{ wins: Record<number, number>; battles: number }>({
    wins: {},
    battles: 0
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);

    if (supabase) {
      try {
        const userId = getAnonymousUserId();
        const { data, error } = await supabase
          .from('battle_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          const records: BattleRecord[] = data.map((b: BattleHistory) => ({
            id: b.id,
            winnerId: b.winner_id,
            loserId: b.loser_id,
            winnerName: b.winner_name,
            loserName: b.loser_name,
            rounds: b.rounds,
            date: b.created_at
          }));
          setHistory(records);
          calculateStats(records);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Supabase Fehler:', e);
      }
    }

    // Fallback: localStorage
    const stored = localStorage.getItem('herorank_battle_history');
    if (stored) {
      try {
        const records = JSON.parse(stored);
        setHistory(records);
        calculateStats(records);
      } catch {
        setHistory([]);
      }
    }
    setIsLoading(false);
  };

  const calculateStats = (records: BattleRecord[]) => {
    const wins: Record<number, number> = {};
    for (const record of records) {
      wins[record.winnerId] = (wins[record.winnerId] || 0) + 1;
    }
    setStats({ wins, battles: records.length });
  };

  const recordBattle = useCallback(async (winner: Hero, loser: Hero, rounds: number) => {
    const record: BattleRecord = {
      id: crypto.randomUUID(),
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      rounds,
      date: new Date().toISOString()
    };

    // Optimistisches Update
    const newHistory = [record, ...history].slice(0, 100);
    setHistory(newHistory);
    calculateStats(newHistory);
    localStorage.setItem('herorank_battle_history', JSON.stringify(newHistory));

    // Sync mit Supabase
    if (supabase) {
      const userId = getAnonymousUserId();

      try {
        await supabase.from('battle_history').insert({
          user_id: userId,
          winner_id: winner.id,
          loser_id: loser.id,
          winner_name: winner.name,
          loser_name: loser.name,
          rounds
        });
      } catch (e) {
        console.warn('Supabase Sync Fehler:', e);
      }
    }
  }, [history]);

  const getWinCount = useCallback((heroId: number) => {
    return stats.wins[heroId] || 0;
  }, [stats]);

  return {
    history,
    recordBattle,
    getWinCount,
    totalBattles: stats.battles,
    isLoading
  };
}
