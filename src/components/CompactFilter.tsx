import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { TierType, HeroClass, PowerType } from '../types/hero';
import { heroClassInfo, powerTypeInfo } from '../types/hero';
import type { StatRanges } from '../types/filters';
import { statInfo } from '../types/filters';
import { RangeSlider } from './RangeSlider';
import type { FilterStats } from '../hooks/useHeroFilter';

interface CompactFilterProps {
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

  // Optional: kompakteres Layout
  compact?: boolean;
}

const tiers: TierType[] = ['Cosmic', 'S', 'A', 'B', 'C', 'D'];
const heroClasses: HeroClass[] = ['Cosmic', 'Tank', 'Bruiser', 'Speedster', 'Controller', 'Assassin', 'Blaster'];
const powerTypes: PowerType[] = ['Physical', 'Energy', 'Magic', 'Cosmic', 'Tech', 'Psionic', 'Elemental', 'Nature', 'Mystic'];

export function CompactFilter({
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
  hasActiveFilters,
  compact = false
}: CompactFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3">
      {/* Main Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg
                       text-white placeholder-white/40 text-xs
                       focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Universe Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(['all', 'Marvel', 'DC'] as const).map((u) => (
            <button
              key={u}
              onClick={() => onUniverseChange(u)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
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

        {/* Filter Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                     ${isExpanded || hasActiveFilters
                       ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                       : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                     }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Count */}
        <div className="px-2 py-1.5 bg-white/5 rounded-lg text-xs">
          <span className="text-white font-medium">{filterStats.filtered}</span>
          <span className="text-white/50">/{filterStats.total}</span>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            title="Filter zurücksetzen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded Filter Options */}
      {isExpanded && (
        <div className="mt-2 p-3 rounded-lg bg-black/30 space-y-3">
          {/* Tier Filter - Chip Style */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-white/40 mr-1 self-center">Tier:</span>
            <button
              onClick={() => onTierChange('all')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all
                         ${tierFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
            >
              Alle
            </button>
            {tiers.map((tier) => (
              <button
                key={tier}
                onClick={() => onTierChange(tier)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all
                           ${tierFilter === tier ? 'text-white' : 'text-white/60'}`}
                style={{
                  background: tierFilter === tier ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'
                }}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Hero Class Filter */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-white/40 mr-1 self-center">Klasse:</span>
            <button
              onClick={() => onHeroClassChange('all')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all
                         ${heroClassFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
            >
              Alle
            </button>
            {heroClasses.map((hc) => {
              const info = heroClassInfo[hc];
              return (
                <button
                  key={hc}
                  onClick={() => onHeroClassChange(hc)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1"
                  style={{
                    backgroundColor: heroClassFilter === hc ? `${info.color}30` : 'rgba(255,255,255,0.05)',
                    color: heroClassFilter === hc ? info.color : 'rgba(255,255,255,0.6)'
                  }}
                >
                  <span>{info.icon}</span>
                  {!compact && <span>{info.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Power Type Filter */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-white/40 mr-1 self-center">Typ:</span>
            <button
              onClick={() => onPowerTypeChange('all')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all
                         ${powerTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
            >
              Alle
            </button>
            {powerTypes.map((pt) => {
              const info = powerTypeInfo[pt];
              return (
                <button
                  key={pt}
                  onClick={() => onPowerTypeChange(pt)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1"
                  style={{
                    backgroundColor: powerTypeFilter === pt ? `${info.color}30` : 'rgba(255,255,255,0.05)',
                    color: powerTypeFilter === pt ? info.color : 'rgba(255,255,255,0.6)'
                  }}
                >
                  <span>{info.icon}</span>
                  {!compact && <span>{info.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Stat Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
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
      )}
    </div>
  );
}
