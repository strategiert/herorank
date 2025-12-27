import { useState, useMemo } from 'react';
import { BarChart3, Plus, X, Trophy, Zap, Shield, Brain, Gauge, Swords } from 'lucide-react';
import type { Hero } from '../types/hero';
import { superheroes } from '../data/superheroes';
import { CompactFilter } from '../components/CompactFilter';
import { useHeroFilter } from '../hooks/useHeroFilter';
import { HeroClassBadge } from '../components/HeroClassBadge';

export default function ComparePage() {
  const [selectedHeroes, setSelectedHeroes] = useState<Hero[]>([]);

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

  // Sortiere und filtere bereits ausgewählte Helden aus
  const availableHeroes = useMemo(() => {
    return filteredHeroes
      .filter(hero => !selectedHeroes.some(h => h.id === hero.id))
      .sort((a, b) => b.power - a.power);
  }, [filteredHeroes, selectedHeroes]);

  const addHero = (hero: Hero) => {
    if (selectedHeroes.length < 4) {
      setSelectedHeroes([...selectedHeroes, hero]);
    }
  };

  const removeHero = (heroId: number) => {
    setSelectedHeroes(selectedHeroes.filter((h) => h.id !== heroId));
  };

  const getMaxStat = (stat: keyof Hero['stats']) => {
    if (selectedHeroes.length === 0) return 100;
    return Math.max(...selectedHeroes.map((h) => h.stats[stat]));
  };

  const statLabels = {
    strength: { label: 'Stärke', icon: Zap, color: '#EF4444' },
    speed: { label: 'Geschwindigkeit', icon: Gauge, color: '#3B82F6' },
    durability: { label: 'Widerstand', icon: Shield, color: '#22C55E' },
    intelligence: { label: 'Intelligenz', icon: Brain, color: '#A855F7' },
    combat: { label: 'Kampfkunst', icon: Swords, color: '#F59E0B' },
  };

  // Finde enriched Versionen der ausgewählten Helden für heroClass
  const enrichedSelected = useMemo(() => {
    return selectedHeroes.map(hero => {
      const enriched = filteredHeroes.find(h => h.id === hero.id);
      return enriched || hero;
    });
  }, [selectedHeroes, filteredHeroes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <BarChart3 className="text-purple-500" />
          Helden Vergleich
        </h1>
        <p className="text-gray-400">Vergleiche bis zu 4 Helden nebeneinander</p>
      </div>

      {/* Selected Heroes Comparison */}
      {selectedHeroes.length > 0 && (
        <div className="glass-dark rounded-2xl p-6 mb-6">
          {/* Hero Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {enrichedSelected.map((hero) => (
              <div
                key={hero.id}
                className="relative rounded-xl p-4 text-center"
                style={{
                  background: `linear-gradient(145deg, ${hero.color}22, ${hero.color}08)`,
                  border: `2px solid ${hero.color}66`,
                }}
              >
                <button
                  onClick={() => removeHero(hero.id)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <X size={16} />
                </button>
                <div
                  className="text-5xl mb-2"
                  style={{ filter: `drop-shadow(0 0 10px ${hero.color}66)` }}
                >
                  {hero.image}
                </div>
                <h3 className="font-bold text-white">{hero.name}</h3>
                <div className="flex justify-center gap-1 mt-1 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                  >
                    {hero.universe}
                  </span>
                  {'heroClass' in hero && (
                    <HeroClassBadge heroClass={(hero as typeof filteredHeroes[0]).heroClass} size="sm" />
                  )}
                </div>
                <div className="mt-2 text-yellow-500 font-bold">
                  <Trophy size={14} className="inline mr-1" />
                  Power: {hero.power}
                </div>
              </div>
            ))}

            {/* Add More Slot */}
            {selectedHeroes.length < 4 && (
              <div className="rounded-xl border-2 border-dashed border-gray-600 p-4 flex flex-col items-center justify-center text-gray-500 min-h-[160px]">
                <Plus size={32} />
                <span className="text-sm mt-2">Held hinzufügen</span>
              </div>
            )}
          </div>

          {/* Stats Comparison */}
          <div className="space-y-6">
            {(Object.keys(statLabels) as Array<keyof typeof statLabels>).map((stat) => {
              const { label, icon: Icon, color } = statLabels[stat];
              const maxValue = getMaxStat(stat);

              return (
                <div key={stat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={20} style={{ color }} />
                    <span className="font-bold text-white">{label}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedHeroes.map((hero) => {
                      const value = hero.stats[stat];
                      const isMax = value === maxValue;

                      return (
                        <div key={hero.id} className="flex items-center gap-3">
                          <div className="w-20 text-sm text-gray-400 truncate">{hero.name}</div>
                          <div className="flex-1 h-6 bg-gray-700/50 rounded-full overflow-hidden relative">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${value}%`,
                                background: isMax
                                  ? `linear-gradient(90deg, ${color}, ${color}cc)`
                                  : `linear-gradient(90deg, ${hero.color}88, ${hero.color}44)`,
                                boxShadow: isMax ? `0 0 10px ${color}66` : 'none',
                              }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                              {value}
                              {isMax && ' 👑'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-8 p-4 rounded-xl bg-white/5">
            <h3 className="font-bold text-white mb-3">Gesamtübersicht</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedHeroes.map((hero) => {
                const total = Object.values(hero.stats).reduce((a, b) => a + b, 0);
                const avg = Math.round(total / 5);
                return (
                  <div
                    key={hero.id}
                    className="text-center p-3 rounded-lg"
                    style={{ background: `${hero.color}11` }}
                  >
                    <div className="text-2xl mb-1">{hero.image}</div>
                    <div className="text-sm text-gray-400">{hero.name}</div>
                    <div className="text-2xl font-bold text-white">{avg}</div>
                    <div className="text-xs text-gray-500">Durchschnitt</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hero Selection */}
      <div className="glass-dark rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-green-400" />
          Helden auswählen ({selectedHeroes.length}/4)
        </h3>

        {/* Compact Filter */}
        <CompactFilter
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

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-2">
          {availableHeroes.map((hero) => (
            <button
              key={hero.id}
              onClick={() => addHero(hero)}
              disabled={selectedHeroes.length >= 4}
              className={`p-2 rounded-lg text-center transition-all hover:scale-105 ${
                selectedHeroes.length >= 4
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-white/10'
              }`}
              style={{
                background: `${hero.color}11`,
                border: `1px solid ${hero.color}33`,
              }}
            >
              <div className="text-2xl">{hero.image}</div>
              <div className="text-xs text-white truncate mt-1">{hero.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
