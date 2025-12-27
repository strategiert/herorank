import { useState, useMemo } from 'react';
import { Trophy, Medal, TrendingUp } from 'lucide-react';
import type { Hero } from '../types/hero';
import { tierColors } from '../types/hero';
import { superheroes } from '../data/superheroes';
import HeroDetail from '../components/HeroDetail';
import { AdvancedFilter } from '../components/AdvancedFilter';
import { useHeroFilter } from '../hooks/useHeroFilter';
import { HeroClassBadge } from '../components/HeroClassBadge';

type SortBy = 'power' | 'strength' | 'speed' | 'durability' | 'intelligence' | 'combat' | 'average';

export default function RankingsPage() {
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('power');

  // Erweiterter Filter Hook
  const {
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
  } = useHeroFilter(superheroes);

  const sortOptions: { value: SortBy; label: string; color: string }[] = [
    { value: 'power', label: 'Power', color: '#FFD700' },
    { value: 'strength', label: 'Stärke', color: '#EF4444' },
    { value: 'speed', label: 'Geschwindigkeit', color: '#3B82F6' },
    { value: 'durability', label: 'Widerstand', color: '#22C55E' },
    { value: 'intelligence', label: 'Intelligenz', color: '#A855F7' },
    { value: 'combat', label: 'Kampfkunst', color: '#F59E0B' },
    { value: 'average', label: 'Durchschnitt', color: '#EC4899' },
  ];

  const rankedHeroes = useMemo(() => {
    return [...filteredHeroes].sort((a, b) => {
      if (sortBy === 'power') return b.power - a.power;
      if (sortBy === 'average') {
        return b.avgStats - a.avgStats;
      }
      return b.stats[sortBy] - a.stats[sortBy];
    });
  }, [filteredHeroes, sortBy]);

  const getValue = (hero: typeof filteredHeroes[0]): number => {
    if (sortBy === 'power') return hero.power;
    if (sortBy === 'average') return hero.avgStats;
    return hero.stats[sortBy];
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-300" size={24} />;
    if (rank === 3) return <Medal className="text-amber-600" size={24} />;
    return <span className="text-gray-500 font-bold text-lg">#{rank}</span>;
  };

  const currentSortOption = sortOptions.find((o) => o.value === sortBy)!;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <TrendingUp className="text-yellow-500" />
          Power Rankings
        </h1>
        <p className="text-gray-400">Die stärksten Helden nach verschiedenen Kategorien</p>
      </div>

      {/* Advanced Filter */}
      <div className="mb-4">
        <AdvancedFilter
          searchTerm={filters.searchTerm}
          universeFilter={filters.universeFilter}
          tierFilter={filters.tierFilter}
          heroClassFilter={filters.heroClassFilter}
          powerTypeFilter={filters.powerTypeFilter}
          statRanges={filters.statRanges}
          onSearchChange={setSearchTerm}
          onUniverseChange={setUniverseFilter}
          onTierChange={setTierFilter}
          onHeroClassChange={setHeroClassFilter}
          onPowerTypeChange={setPowerTypeFilter}
          onStatRangeChange={setStatRange}
          onReset={resetFilters}
          filterStats={filterStats}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Sort Options */}
      <div className="glass-dark rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-500 mr-2">Sortieren nach:</span>
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                sortBy === option.value
                  ? 'text-white shadow-lg'
                  : 'glass text-gray-400 hover:text-white'
              }`}
              style={{
                background: sortBy === option.value ? option.color : undefined,
                boxShadow: sortBy === option.value ? `0 0 20px ${option.color}44` : undefined,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
        {rankedHeroes.map((hero, index) => {
          const rank = index + 1;
          const value = getValue(hero);
          const isTop3 = rank <= 3;

          return (
            <div
              key={hero.id}
              onClick={() => setSelectedHero(hero)}
              className={`glass-dark rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                isTop3 ? 'ring-2' : ''
              }`}
              style={{
                borderColor: isTop3 ? hero.color : undefined,
                boxShadow: isTop3 ? `0 0 20px ${hero.color}22` : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-12 flex justify-center">{getRankBadge(rank)}</div>

                {/* Hero Info */}
                <div
                  className="text-4xl p-2 rounded-xl"
                  style={{
                    background: `linear-gradient(145deg, ${hero.color}22, transparent)`,
                  }}
                >
                  {hero.image}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-lg">{hero.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        hero.universe === 'Marvel' ? 'bg-red-600/80' : 'bg-blue-600/80'
                      }`}
                    >
                      {hero.universe}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: tierColors[hero.tier].bg,
                        color: tierColors[hero.tier].text,
                      }}
                    >
                      {hero.tier}
                    </span>
                    <HeroClassBadge heroClass={hero.heroClass} size="sm" showLabel />
                  </div>
                  <p className="text-gray-400 text-sm truncate">{hero.description}</p>
                </div>

                {/* Value */}
                <div className="text-right">
                  <div
                    className="text-3xl font-black"
                    style={{ color: currentSortOption.color }}
                  >
                    {value}
                  </div>
                  <div className="text-xs text-gray-500">{currentSortOption.label}</div>
                </div>
              </div>

              {/* Top 3 Stats Bar */}
              {isTop3 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {(['strength', 'speed', 'durability', 'intelligence', 'combat'] as const).map(
                    (stat) => {
                      const statOption = sortOptions.find((o) => o.value === stat)!;
                      return (
                        <div key={stat} className="text-center">
                          <div className="h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${hero.stats[stat]}%`,
                                background: statOption.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{hero.stats[stat]}</span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hero Detail Modal */}
      {selectedHero && (
        <HeroDetail hero={selectedHero} onClose={() => setSelectedHero(null)} />
      )}
    </div>
  );
}
