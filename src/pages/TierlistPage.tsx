import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Hero, TierType } from '../types/hero';
import { tierColors, tierDescriptions } from '../types/hero';
import { superheroes } from '../data/superheroes';
import HeroCard from '../components/HeroCard';
import HeroDetail from '../components/HeroDetail';
import { AdvancedFilter } from '../components/AdvancedFilter';
import { useHeroFilter } from '../hooks/useHeroFilter';

interface TierlistPageProps {
  favorites: number[];
  toggleFavorite: (hero: Hero) => void;
}

export default function TierlistPage({ favorites, toggleFavorite }: TierlistPageProps) {
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Record<TierType, boolean>>({
    Cosmic: true,
    S: true,
    A: true,
    B: true,
    C: true,
    D: true,
  });

  // Nutze den erweiterten Filter-Hook
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

  const toggleTier = (tier: TierType) => {
    setExpandedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  // Gruppiere nach Tier - filteredHeroes sind bereits EnrichedHeroes
  const getHeroesByTier = useMemo(() => {
    return (tier: TierType) => {
      return filteredHeroes
        .filter((h) => h.tier === tier)
        .sort((a, b) => b.power - a.power);
    };
  }, [filteredHeroes]);

  const tiers: TierType[] = ['Cosmic', 'S', 'A', 'B', 'C', 'D'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
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

      <div className="space-y-3 sm:space-y-4 mt-4">
        {tiers.map((tier) => {
          const heroes = getHeroesByTier(tier);
          if (heroes.length === 0) return null;

          return (
            <div
              key={tier}
              className="rounded-xl sm:rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(20, 20, 30, 0.6)',
                boxShadow: `0 0 20px ${tierColors[tier].glow}10`,
              }}
            >
              {/* Tier Header */}
              <div
                className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all hover:brightness-110"
                onClick={() => toggleTier(tier)}
                style={{ background: tierColors[tier].bg }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className="text-xl sm:text-2xl font-black"
                    style={{ color: tierColors[tier].text }}
                  >
                    {tier}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-sm sm:text-base"
                      style={{ color: tierColors[tier].text }}
                    >
                      {tierDescriptions[tier]}
                    </span>
                    <span
                      className="text-xs sm:text-sm opacity-70 bg-black/20 px-2 py-0.5 rounded-full"
                      style={{ color: tierColors[tier].text }}
                    >
                      {heroes.length} Helden
                    </span>
                  </div>
                </div>
                {expandedTiers[tier] ? (
                  <ChevronUp size={20} color={tierColors[tier].text} />
                ) : (
                  <ChevronDown size={20} color={tierColors[tier].text} />
                )}
              </div>

              {/* Tier Content */}
              {expandedTiers[tier] && (
                <div className="p-2 sm:p-3">
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-start">
                    {heroes.map((hero) => (
                      <HeroCard
                        key={hero.id}
                        hero={hero}
                        onClick={setSelectedHero}
                        isFavorite={favorites.includes(hero.id)}
                        onToggleFavorite={toggleFavorite}
                        heroClass={hero.heroClass}
                      />
                    ))}
                  </div>
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
