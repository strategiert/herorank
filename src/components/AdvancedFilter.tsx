import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { TierType, HeroClass, PowerType } from '../types/hero';
import { heroClassInfo, powerTypeInfo, tierColors } from '../types/hero';
import type { StatRanges } from '../types/filters';
import { statInfo } from '../types/filters';
import { RangeSlider } from './RangeSlider';
import type { FilterStats } from '../hooks/useHeroFilter';

interface AdvancedFilterProps {
  // Filter State
  searchTerm: string;
  universeFilter: 'all' | 'Marvel' | 'DC';
  tierFilter: TierType | 'all';
  heroClassFilter: HeroClass | 'all';
  powerTypeFilter: PowerType | 'all';
  statRanges: StatRanges;

  // Update Functions
  onSearchChange: (term: string) => void;
  onUniverseChange: (universe: 'all' | 'Marvel' | 'DC') => void;
  onTierChange: (tier: TierType | 'all') => void;
  onHeroClassChange: (heroClass: HeroClass | 'all') => void;
  onPowerTypeChange: (powerType: PowerType | 'all') => void;
  onStatRangeChange: (stat: keyof StatRanges, range: [number, number]) => void;
  onReset: () => void;

  // Stats
  filterStats: FilterStats;
  hasActiveFilters: boolean;
}

const tiers: TierType[] = ['Cosmic', 'S', 'A', 'B', 'C', 'D'];
const heroClasses: HeroClass[] = ['Cosmic', 'Tank', 'Bruiser', 'Speedster', 'Controller', 'Assassin', 'Blaster'];
const powerTypes: PowerType[] = ['Physical', 'Energy', 'Magic', 'Cosmic', 'Tech', 'Psionic', 'Elemental', 'Nature', 'Mystic'];

export function AdvancedFilter({
  searchTerm,
  universeFilter,
  tierFilter,
  heroClassFilter,
  powerTypeFilter,
  statRanges,
  onSearchChange,
  onUniverseChange,
  onTierChange,
  onHeroClassChange,
  onPowerTypeChange,
  onStatRangeChange,
  onReset,
  filterStats,
  hasActiveFilters
}: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header Row - Always visible */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Held suchen..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
                         text-white placeholder-white/40 text-sm
                         focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Universe Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(['all', 'Marvel', 'DC'] as const).map((u) => (
              <button
                key={u}
                onClick={() => onUniverseChange(u)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  universeFilter === u
                    ? u === 'Marvel'
                      ? 'bg-red-600 text-white'
                      : u === 'DC'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {u === 'all' ? 'Alle' : u}
              </button>
            ))}
          </div>

          {/* Filter Toggle + Count */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                         ${isExpanded || hasActiveFilters
                           ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                           : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                         }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Result Count */}
            <div className="px-3 py-2.5 bg-white/5 rounded-lg text-sm">
              <span className="text-white font-medium">{filterStats.filtered}</span>
              <span className="text-white/50">/{filterStats.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="border-t border-white/5 p-3 sm:p-4 space-y-4 bg-black/20">
          {/* Tier Filter */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">Tier</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onTierChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                           ${tierFilter === 'all'
                             ? 'bg-white/20 text-white'
                             : 'bg-white/5 text-white/50 hover:bg-white/10'
                           }`}
              >
                Alle
              </button>
              {tiers.map((tier) => (
                <button
                  key={tier}
                  onClick={() => onTierChange(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                             ${tierFilter === tier
                               ? 'text-white'
                               : 'text-white/70 hover:opacity-80'
                             }`}
                  style={{
                    background: tierFilter === tier ? tierColors[tier].bg : 'rgba(255,255,255,0.05)',
                    border: tierFilter === tier ? 'none' : `1px solid ${tierColors[tier].glow}40`
                  }}
                >
                  {tier} ({filterStats.byTier[tier]})
                </button>
              ))}
            </div>
          </div>

          {/* Hero Class Filter */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">Klasse</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onHeroClassChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                           ${heroClassFilter === 'all'
                             ? 'bg-white/20 text-white'
                             : 'bg-white/5 text-white/50 hover:bg-white/10'
                           }`}
              >
                Alle
              </button>
              {heroClasses.map((hc) => {
                const info = heroClassInfo[hc];
                return (
                  <button
                    key={hc}
                    onClick={() => onHeroClassChange(hc)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    style={{
                      backgroundColor: heroClassFilter === hc ? `${info.color}30` : 'rgba(255,255,255,0.05)',
                      color: heroClassFilter === hc ? info.color : 'rgba(255,255,255,0.7)',
                      border: `1px solid ${heroClassFilter === hc ? info.color : 'transparent'}`
                    }}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                    <span className="text-white/40">({filterStats.byHeroClass[hc]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Power Type Filter */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">Kraft-Typ</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onPowerTypeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                           ${powerTypeFilter === 'all'
                             ? 'bg-white/20 text-white'
                             : 'bg-white/5 text-white/50 hover:bg-white/10'
                           }`}
              >
                Alle
              </button>
              {powerTypes.map((pt) => {
                const info = powerTypeInfo[pt];
                return (
                  <button
                    key={pt}
                    onClick={() => onPowerTypeChange(pt)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    style={{
                      backgroundColor: powerTypeFilter === pt ? `${info.color}30` : 'rgba(255,255,255,0.05)',
                      color: powerTypeFilter === pt ? info.color : 'rgba(255,255,255,0.7)',
                      border: `1px solid ${powerTypeFilter === pt ? info.color : 'transparent'}`
                    }}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                    <span className="text-white/40">({filterStats.byPowerType[pt]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stat Range Sliders */}
          <div>
            <label className="text-xs text-white/50 mb-3 block">Stats</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(statInfo) as (keyof StatRanges)[]).map((stat) => {
                const info = statInfo[stat];
                return (
                  <RangeSlider
                    key={stat}
                    label={info.label}
                    icon={info.icon}
                    color={info.color}
                    value={statRanges[stat]}
                    onChange={(range) => onStatRangeChange(stat, range)}
                  />
                );
              })}
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300
                           hover:bg-red-500/10 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
