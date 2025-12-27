import type { TierType, HeroClass, PowerType } from './hero';

export interface StatRanges {
  power: [number, number];
  strength: [number, number];
  speed: [number, number];
  durability: [number, number];
  intelligence: [number, number];
  combat: [number, number];
}

export interface FilterState {
  // Text-Suche
  searchTerm: string;

  // Kategorie-Filter
  universeFilter: 'all' | 'Marvel' | 'DC';
  tierFilter: TierType | 'all';
  heroClassFilter: HeroClass | 'all';
  powerTypeFilter: PowerType | 'all';

  // Stat Range Filter (mit Slidern)
  statRanges: StatRanges;
}

export const defaultStatRanges: StatRanges = {
  power: [0, 100],
  strength: [0, 100],
  speed: [0, 100],
  durability: [0, 100],
  intelligence: [0, 100],
  combat: [0, 100],
};

export const defaultFilterState: FilterState = {
  searchTerm: '',
  universeFilter: 'all',
  tierFilter: 'all',
  heroClassFilter: 'all',
  powerTypeFilter: 'all',
  statRanges: defaultStatRanges,
};

// Stat-Info für UI (Labels und Farben)
export const statInfo: Record<keyof StatRanges, { label: string; icon: string; color: string }> = {
  power: { label: 'Power', icon: '⚡', color: '#FFD700' },
  strength: { label: 'Stärke', icon: '💪', color: '#EF4444' },
  speed: { label: 'Speed', icon: '🏃', color: '#3B82F6' },
  durability: { label: 'Ausdauer', icon: '🛡️', color: '#22C55E' },
  intelligence: { label: 'Intelligenz', icon: '🧠', color: '#A855F7' },
  combat: { label: 'Kampf', icon: '⚔️', color: '#F97316' },
};
