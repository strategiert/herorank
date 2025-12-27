import { useState, useMemo, useCallback } from 'react';
import type { Hero, TierType, HeroClass, PowerType } from '../types/hero';
import type { FilterState, StatRanges } from '../types/filters';
import { defaultFilterState, defaultStatRanges } from '../types/filters';
import { enrichHero, type EnrichedHero } from '../utils/heroClassification';

interface FilterStats {
  total: number;
  filtered: number;
  byUniverse: { Marvel: number; DC: number };
  byTier: Record<TierType, number>;
  byHeroClass: Record<HeroClass, number>;
  byPowerType: Record<PowerType, number>;
}

interface UseHeroFilterReturn {
  // Gefilterte & angereicherte Helden
  filteredHeroes: EnrichedHero[];

  // Statistiken für UI
  filterStats: FilterStats;

  // Filter State
  filters: FilterState;

  // Update-Funktionen
  setSearchTerm: (term: string) => void;
  setUniverseFilter: (universe: 'all' | 'Marvel' | 'DC') => void;
  setTierFilter: (tier: TierType | 'all') => void;
  setHeroClassFilter: (heroClass: HeroClass | 'all') => void;
  setPowerTypeFilter: (powerType: PowerType | 'all') => void;
  setStatRange: (stat: keyof StatRanges, range: [number, number]) => void;

  // Reset
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Zentraler Hook für Hero-Filterung mit Performance-Optimierung
 */
export function useHeroFilter(heroes: Hero[]): UseHeroFilterReturn {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);

  // Alle Helden mit berechneten Kategorien anreichern (einmalig)
  const enrichedHeroes = useMemo(() => {
    return heroes.map(enrichHero);
  }, [heroes]);

  // Gefilterte Helden
  const filteredHeroes = useMemo(() => {
    const searchLower = filters.searchTerm.toLowerCase().trim();

    return enrichedHeroes.filter((hero) => {
      // 1. Text-Suche (schnellster Check zuerst bei leerem String)
      if (searchLower && !hero.name.toLowerCase().includes(searchLower)) {
        return false;
      }

      // 2. Universe Filter
      if (filters.universeFilter !== 'all' && hero.universe !== filters.universeFilter) {
        return false;
      }

      // 3. Tier Filter
      if (filters.tierFilter !== 'all' && hero.tier !== filters.tierFilter) {
        return false;
      }

      // 4. Hero Class Filter
      if (filters.heroClassFilter !== 'all' && hero.heroClass !== filters.heroClassFilter) {
        return false;
      }

      // 5. Power Type Filter
      if (filters.powerTypeFilter !== 'all' && !hero.powerTypes.includes(filters.powerTypeFilter)) {
        return false;
      }

      // 6. Stat Range Filters
      const { statRanges } = filters;

      // Power (Gesamt-Power)
      if (hero.power < statRanges.power[0] || hero.power > statRanges.power[1]) {
        return false;
      }

      // Individual Stats
      if (hero.stats.strength < statRanges.strength[0] || hero.stats.strength > statRanges.strength[1]) {
        return false;
      }
      if (hero.stats.speed < statRanges.speed[0] || hero.stats.speed > statRanges.speed[1]) {
        return false;
      }
      if (hero.stats.durability < statRanges.durability[0] || hero.stats.durability > statRanges.durability[1]) {
        return false;
      }
      if (hero.stats.intelligence < statRanges.intelligence[0] || hero.stats.intelligence > statRanges.intelligence[1]) {
        return false;
      }
      if (hero.stats.combat < statRanges.combat[0] || hero.stats.combat > statRanges.combat[1]) {
        return false;
      }

      return true;
    });
  }, [enrichedHeroes, filters]);

  // Statistiken berechnen
  const filterStats = useMemo((): FilterStats => {
    const stats: FilterStats = {
      total: enrichedHeroes.length,
      filtered: filteredHeroes.length,
      byUniverse: { Marvel: 0, DC: 0 },
      byTier: { Cosmic: 0, S: 0, A: 0, B: 0, C: 0, D: 0 },
      byHeroClass: {
        Cosmic: 0, Tank: 0, Bruiser: 0, Speedster: 0,
        Controller: 0, Assassin: 0, Blaster: 0
      },
      byPowerType: {
        Physical: 0, Energy: 0, Magic: 0, Cosmic: 0, Tech: 0,
        Psionic: 0, Elemental: 0, Nature: 0, Mystic: 0
      }
    };

    // Zähle aus gefilterten Helden
    for (const hero of filteredHeroes) {
      stats.byUniverse[hero.universe]++;
      stats.byTier[hero.tier]++;
      stats.byHeroClass[hero.heroClass]++;

      // Power Types können mehrfach sein
      for (const pt of hero.powerTypes) {
        stats.byPowerType[pt]++;
      }
    }

    return stats;
  }, [enrichedHeroes.length, filteredHeroes]);

  // Update-Funktionen mit useCallback für stabile Referenzen
  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setUniverseFilter = useCallback((universe: 'all' | 'Marvel' | 'DC') => {
    setFilters(prev => ({ ...prev, universeFilter: universe }));
  }, []);

  const setTierFilter = useCallback((tier: TierType | 'all') => {
    setFilters(prev => ({ ...prev, tierFilter: tier }));
  }, []);

  const setHeroClassFilter = useCallback((heroClass: HeroClass | 'all') => {
    setFilters(prev => ({ ...prev, heroClassFilter: heroClass }));
  }, []);

  const setPowerTypeFilter = useCallback((powerType: PowerType | 'all') => {
    setFilters(prev => ({ ...prev, powerTypeFilter: powerType }));
  }, []);

  const setStatRange = useCallback((stat: keyof StatRanges, range: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      statRanges: { ...prev.statRanges, [stat]: range }
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilterState);
  }, []);

  // Check ob Filter aktiv sind
  const hasActiveFilters = useMemo(() => {
    if (filters.searchTerm !== '') return true;
    if (filters.universeFilter !== 'all') return true;
    if (filters.tierFilter !== 'all') return true;
    if (filters.heroClassFilter !== 'all') return true;
    if (filters.powerTypeFilter !== 'all') return true;

    // Check stat ranges
    const { statRanges } = filters;
    for (const key of Object.keys(defaultStatRanges) as (keyof StatRanges)[]) {
      if (statRanges[key][0] !== 0 || statRanges[key][1] !== 100) {
        return true;
      }
    }

    return false;
  }, [filters]);

  return {
    filteredHeroes,
    filterStats,
    filters,
    setSearchTerm,
    setUniverseFilter,
    setTierFilter,
    setHeroClassFilter,
    setPowerTypeFilter,
    setStatRange,
    resetFilters,
    hasActiveFilters
  };
}

export type { FilterStats, UseHeroFilterReturn };
