import { useState, useRef, useEffect } from 'react';
import { Shuffle, Play, RotateCcw, History } from 'lucide-react';
import type { Hero } from '../types/hero';
import { tierColors } from '../types/hero';
import { superheroes } from '../data/superheroes';
import { CompactFilter } from '../components/CompactFilter';
import { useHeroFilter } from '../hooks/useHeroFilter';
import { HeroClassIcon } from '../components/HeroClassBadge';

interface BattleState {
  hp1: number;
  hp2: number;
  maxHp1: number;
  maxHp2: number;
  round: number;
  isActive: boolean;
  winner: Hero | null;
}

interface BattleLogEntry {
  text: string;
  type: 'start' | 'attack' | 'end';
}

export default function ArenaPage() {
  const [fighter1, setFighter1] = useState<Hero | null>(null);
  const [fighter2, setFighter2] = useState<Hero | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [battleHistory] = useState<any[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const autoIntervalRef = useRef<number | null>(null);

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

  // Sortiere nach Power
  const sortedHeroes = [...filteredHeroes].sort((a, b) => b.power - a.power);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog]);

  // Cleanup auto mode on unmount
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }
    };
  }, []);

  const calculateHP = (hero: Hero) => {
    return Math.round((hero.stats.durability * 15) + (hero.stats.strength * 5) + (hero.power * 2));
  };

  const getAbilityPower = (hero: Hero, abilityIndex: number) => {
    const baseStats = [
      hero.stats.strength,
      hero.stats.intelligence,
      hero.stats.combat,
    ];
    const basePower = baseStats[abilityIndex % 3] || hero.stats.combat;
    return Math.round(basePower * (0.8 + Math.random() * 0.4));
  };

  const selectFighter = (hero: Hero) => {
    if (battleState?.isActive) return;

    if (!fighter1) {
      setFighter1(hero);
      setBattleState(null);
      setBattleLog([]);
    } else if (!fighter2 && hero.id !== fighter1.id) {
      setFighter2(hero);
      setBattleState(null);
      setBattleLog([]);
    }
  };

  const clearFighters = () => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setFighter1(null);
    setFighter2(null);
    setBattleState(null);
    setBattleLog([]);
    setIsAutoMode(false);
  };

  const randomFighters = () => {
    if (battleState?.isActive) return;

    const shuffled = [...superheroes].sort(() => Math.random() - 0.5);
    setFighter1(shuffled[0]);
    setFighter2(shuffled[1]);
    setBattleState(null);
    setBattleLog([]);
  };

  const startBattle = () => {
    if (!fighter1 || !fighter2) return;

    const hp1 = calculateHP(fighter1);
    const hp2 = calculateHP(fighter2);

    setBattleState({
      hp1,
      hp2,
      maxHp1: hp1,
      maxHp2: hp2,
      round: 1,
      isActive: true,
      winner: null,
    });

    setBattleLog([{
      text: `${fighter1.name} vs ${fighter2.name}!`,
      type: 'start'
    }]);
  };

  const executeRound = () => {
    if (!fighter1 || !fighter2 || !battleState || !battleState.isActive) return;

    const newLog: BattleLogEntry[] = [];
    let newHp1 = battleState.hp1;
    let newHp2 = battleState.hp2;

    // Fighter 1 attacks
    const ability1Index = Math.floor(Math.random() * Math.min(3, fighter1.abilities.length));
    const ability1 = fighter1.abilities[ability1Index] || 'Angriff';
    const damage1 = getAbilityPower(fighter1, ability1Index);
    const actualDamage1 = Math.max(1, damage1 - Math.floor(fighter2.stats.durability / 10));
    newHp2 = Math.max(0, newHp2 - actualDamage1);

    newLog.push({
      text: `${fighter1.name} nutzt ${ability1}! (-${actualDamage1} HP)`,
      type: 'attack'
    });

    // Check if fighter 2 is defeated
    if (newHp2 <= 0) {
      setBattleState({
        ...battleState,
        hp1: newHp1,
        hp2: 0,
        isActive: false,
        winner: fighter1,
      });
      setBattleLog(prev => [...prev, ...newLog, {
        text: `🏆 ${fighter1.name} gewinnt den Kampf!`,
        type: 'end'
      }]);
      stopAutoMode();
      return;
    }

    // Fighter 2 attacks
    const ability2Index = Math.floor(Math.random() * Math.min(3, fighter2.abilities.length));
    const ability2 = fighter2.abilities[ability2Index] || 'Angriff';
    const damage2 = getAbilityPower(fighter2, ability2Index);
    const actualDamage2 = Math.max(1, damage2 - Math.floor(fighter1.stats.durability / 10));
    newHp1 = Math.max(0, newHp1 - actualDamage2);

    newLog.push({
      text: `${fighter2.name} nutzt ${ability2}! (-${actualDamage2} HP)`,
      type: 'attack'
    });

    // Check if fighter 1 is defeated
    if (newHp1 <= 0) {
      setBattleState({
        ...battleState,
        hp1: 0,
        hp2: newHp2,
        isActive: false,
        winner: fighter2,
      });
      setBattleLog(prev => [...prev, ...newLog, {
        text: `🏆 ${fighter2.name} gewinnt den Kampf!`,
        type: 'end'
      }]);
      stopAutoMode();
      return;
    }

    setBattleState({
      ...battleState,
      hp1: newHp1,
      hp2: newHp2,
      round: battleState.round + 1,
    });
    setBattleLog(prev => [...prev, ...newLog]);
  };

  const startAutoMode = () => {
    if (!battleState?.isActive) {
      startBattle();
      setTimeout(() => {
        setIsAutoMode(true);
        autoIntervalRef.current = window.setInterval(() => {
          executeRound();
        }, 800);
      }, 300);
    } else {
      setIsAutoMode(true);
      autoIntervalRef.current = window.setInterval(() => {
        executeRound();
      }, 800);
    }
  };

  const stopAutoMode = () => {
    setIsAutoMode(false);
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  };

  // Fighter Panel Component
  const FighterPanel = ({
    hero,
    hp,
    maxHp,
    position
  }: {
    hero: Hero | null;
    hp?: number;
    maxHp?: number;
    position: 1 | 2;
  }) => {
    if (!hero) {
      return (
        <div
          className="flex-1 rounded-xl border-2 border-dashed border-gray-600/40 p-8 flex flex-col items-center justify-center min-h-[240px]"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.4), rgba(20, 20, 35, 0.6))'
          }}
        >
          <span className="text-6xl mb-3 opacity-20">👤</span>
          <span className="text-gray-400 text-base font-medium">Kämpfer {position}</span>
        </div>
      );
    }

    const displayHp = hp ?? calculateHP(hero);
    const displayMaxHp = maxHp ?? calculateHP(hero);
    const hpPercent = (displayHp / displayMaxHp) * 100;

    return (
      <div className="flex-1 flex flex-col gap-3">
        {/* Hero Name & Avatar */}
        <div className="text-center">
          <div
            className="text-7xl mb-2 inline-block"
            style={{
              filter: `drop-shadow(0 4px 16px ${hero.color}99)`
            }}
          >
            {hero.image}
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{hero.name}</h3>
          <span
            className={`inline-block text-xs px-3 py-1 rounded font-bold ${
              hero.universe === 'Marvel' ? 'bg-red-600/90' : 'bg-blue-600/90'
            }`}
          >
            {hero.universe}
          </span>
        </div>

        {/* HP Bar */}
        <div className="bg-slate-900/60 rounded-lg p-3">
          <div className="flex justify-between text-sm font-bold text-gray-300 mb-2">
            <span>HP</span>
            <span className="font-mono">{displayHp}/{displayMaxHp}</span>
          </div>
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : hpPercent > 25
                  ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
                boxShadow: hpPercent > 50
                  ? '0 0 10px rgba(34, 197, 94, 0.5)'
                  : hpPercent > 25
                  ? '0 0 10px rgba(234, 179, 8, 0.5)'
                  : '0 0 10px rgba(239, 68, 68, 0.5)'
              }}
            />
          </div>
        </div>

        {/* Abilities */}
        <div className="grid grid-cols-2 gap-2">
          {hero.abilities.slice(0, 4).map((ability, idx) => {
            const statIcons = ['👊', '🔮', '⚔️', '⚡'];
            const statColors = ['#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];
            const pwrValue = `PWR-${Math.floor(Math.random() * 40) + 60}`;

            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-slate-900/70 rounded-lg px-3 py-2.5 border border-gray-700/50"
              >
                <span className="text-lg">{statIcons[idx]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-200 truncate font-medium">
                    {ability}
                  </div>
                  <div
                    className="text-[10px] font-bold mt-0.5"
                    style={{ color: statColors[idx] }}
                  >
                    {pwrValue}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Extract damage types from abilities
  const getDamageTypes = (hero: Hero | null) => {
    if (!hero) return [];
    const types = new Set<string>();

    hero.abilities.forEach(ability => {
      const lower = ability.toLowerCase();
      if (lower.includes('fist') || lower.includes('punch') || lower.includes('strength')) types.add('Physical');
      if (lower.includes('tech') || lower.includes('weapon')) types.add('Tech');
      if (lower.includes('cosmic') || lower.includes('space')) types.add('Cosmic');
      if (lower.includes('mind') || lower.includes('psychic') || lower.includes('mental')) types.add('Mental');
    });

    return Array.from(types).slice(0, 3);
  };

  const getElementTypes = (hero: Hero | null) => {
    if (!hero) return [];
    const elements = new Set<string>();

    hero?.abilities.forEach(ability => {
      const lower = ability.toLowerCase();
      if (lower.includes('fire') || lower.includes('heat')) elements.add('Fire');
      if (lower.includes('ice') || lower.includes('cold') || lower.includes('freeze')) elements.add('Ice');
      if (lower.includes('electric') || lower.includes('lightning') || lower.includes('thunder')) elements.add('Electric');
      if (lower.includes('light') || lower.includes('solar')) elements.add('Light');
    });

    return Array.from(elements).slice(0, 3);
  };

  const damageIcons: Record<string, string> = {
    'Physical': '👊',
    'Tech': '🔧',
    'Cosmic': '🌌',
    'Mental': '🧠'
  };

  const elementIcons: Record<string, string> = {
    'Fire': '🔥',
    'Ice': '❄️',
    'Electric': '⚡',
    'Light': '💡'
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #0f0f19, #1a1a2e)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black mb-2 flex items-center justify-center gap-3">
            <span className="text-4xl">⚔️</span>
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
              Superhero Battle System
            </span>
            <span className="text-4xl">⚔️</span>
          </h1>
          <p className="text-sm text-gray-400">
            200 Kämpfer • Typen-Effektivität • RPG-Kampfsystem
          </p>

          {/* Historie Button */}
          <button className="mt-3 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-sm text-gray-300 flex items-center gap-2 mx-auto transition-colors">
            <History size={16} />
            Historie ({battleHistory.length})
          </button>
        </div>

        {/* Battle Arena */}
        <div
          className="rounded-2xl p-6 mb-4 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(30, 30, 50, 0.95))',
            border: '1px solid rgba(100, 100, 150, 0.2)'
          }}
        >
          {/* Fighter Panels */}
          <div className="flex gap-6 items-start mb-6">
            <FighterPanel
              hero={fighter1}
              hp={battleState?.hp1}
              maxHp={battleState?.maxHp1}
              position={1}
            />

            {/* VS Divider */}
            <div className="flex flex-col items-center justify-center px-4 py-8">
              <div
                className="text-5xl font-black mb-2"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24, #f59e0b, #d97706)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
                }}
              >
                VS
              </div>
              {battleState && (
                <div className="text-sm text-gray-400 font-mono bg-slate-800/50 px-3 py-1 rounded-full">
                  R{battleState.round}
                </div>
              )}
            </div>

            <FighterPanel
              hero={fighter2}
              hp={battleState?.hp2}
              maxHp={battleState?.maxHp2}
              position={2}
            />
          </div>

          {/* Battle Controls */}
          <div className="flex justify-center gap-3 mb-4">
            {(!battleState || !battleState.isActive) && fighter1 && fighter2 && (
              <button
                onClick={startBattle}
                className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: 'white'
                }}
              >
                <Play size={18} fill="white" />
                Start!
              </button>
            )}

            {battleState?.isActive && !isAutoMode && (
              <button
                onClick={startAutoMode}
                className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
                  color: 'white'
                }}
              >
                <Play size={18} fill="white" />
                Auto
              </button>
            )}

            <button
              onClick={randomFighters}
              disabled={battleState?.isActive}
              className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: battleState?.isActive
                  ? '#4b5563'
                  : 'linear-gradient(135deg, #a855f7, #9333ea)',
                color: 'white'
              }}
            >
              <Shuffle size={18} />
              Zufall
            </button>

            <button
              onClick={clearFighters}
              className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #4b5563, #374151)',
                color: 'white'
              }}
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>

          {/* Kampflog */}
          {battleLog.length > 0 && (
            <div className="bg-slate-900/60 rounded-lg p-4">
              <h3 className="text-sm font-bold text-yellow-500 mb-2 flex items-center gap-2">
                <span>📜</span> Kampflog
              </h3>
              <div
                ref={logRef}
                className="h-24 overflow-y-auto space-y-1 text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              >
                {battleLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1.5 rounded text-sm ${
                      entry.type === 'start'
                        ? 'bg-blue-900/40 text-blue-200 border-l-2 border-blue-400'
                        : entry.type === 'end'
                        ? 'bg-yellow-900/40 text-yellow-200 font-bold border-l-2 border-yellow-400'
                        : 'bg-slate-800/50 text-gray-300'
                    }`}
                  >
                    {entry.type === 'start' && '⚔️ '}
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage Types & Elements */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Kampf-Dreieck */}
            <div className="bg-slate-900/40 rounded-lg p-3">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Kampf-Dreieck:</h4>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {getDamageTypes(fighter1).length > 0 ? (
                  getDamageTypes(fighter1).map((type, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-yellow-400">
                      <span>{damageIcons[type]}</span>
                      <span>{type}</span>
                      {idx < getDamageTypes(fighter1).length - 1 && <span className="text-gray-600">→</span>}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">Wähle Kämpfer...</span>
                )}
              </div>
            </div>

            {/* Elemente */}
            <div className="bg-slate-900/40 rounded-lg p-3">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Elemente:</h4>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {getElementTypes(fighter2).length > 0 ? (
                  getElementTypes(fighter2).map((elem, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-orange-400">
                      <span>{elementIcons[elem]}</span>
                      <span>{elem}</span>
                      {idx < getElementTypes(fighter2).length - 1 && <span className="text-gray-600">→</span>}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">Wähle Kämpfer...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fighter Selection */}
        <div
          className="rounded-2xl p-4 shadow-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.7), rgba(30, 30, 50, 0.7))',
            border: '1px solid rgba(100, 100, 150, 0.15)'
          }}
        >
          <h3 className="text-base font-bold text-white mb-3">Kämpfer ({sortedHeroes.length})</h3>

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
            compact
          />

          {/* Hero Grid */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <select className="px-3 py-1.5 bg-slate-800/80 text-gray-300 text-xs rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500">
                <option>Alle</option>
              </select>
              <select className="px-3 py-1.5 bg-slate-800/80 text-gray-300 text-xs rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500">
                <option>Alle</option>
              </select>
            </div>

            <div className="relative">
              {/* Scroll indicators */}
              <button className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-r-lg shadow-lg">
                <span className="text-white text-xl">◀</span>
              </button>
              <button className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-l-lg shadow-lg">
                <span className="text-white text-xl">▶</span>
              </button>

              <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="flex gap-2 px-8">
                  {sortedHeroes.slice(0, 25).map((hero) => {
                    const isSelected = fighter1?.id === hero.id || fighter2?.id === hero.id;
                    const tierBadge = hero.tier === 'Cosmic' ? 'C' : hero.tier.charAt(0);

                    return (
                      <div
                        key={hero.id}
                        onClick={() => selectFighter(hero)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 flex-shrink-0 ${
                          isSelected ? 'ring-2 ring-yellow-400 opacity-70' : ''
                        }`}
                        style={{
                          width: '90px',
                          background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.9), rgba(20, 20, 35, 0.9))',
                          borderTop: `3px solid ${hero.universe === 'Marvel' ? '#dc2626' : '#2563eb'}`,
                        }}
                      >
                        {/* Tier Badge */}
                        <div
                          className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold z-10"
                          style={{
                            background: tierColors[hero.tier].bg,
                            color: tierColors[hero.tier].text,
                          }}
                        >
                          {tierBadge}
                        </div>

                        {/* Hero Class Badge */}
                        <div className="absolute top-1 right-1 z-10">
                          <HeroClassIcon heroClass={hero.heroClass} size="sm" />
                        </div>

                        {/* Publisher Badge */}
                        <div className={`absolute bottom-1 left-1 right-1 text-center z-10`}>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${
                            hero.universe === 'Marvel' ? 'bg-red-600/90' : 'bg-blue-600/90'
                          }`}>
                            {hero.universe === 'Marvel' ? 'M' : 'DC'}
                          </span>
                        </div>

                        <div className="p-2 pt-6 pb-6 text-center">
                          <div className="text-3xl mb-1">{hero.image}</div>
                          <div className="text-[9px] font-medium text-white truncate px-1">
                            {hero.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
