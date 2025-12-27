import { useState, useRef, useEffect } from 'react';
import { Shuffle, Play, RotateCcw, History, Zap, Shield, Sparkles } from 'lucide-react';
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
  type: 'start' | 'attack' | 'defense' | 'special' | 'end';
  damage?: number;
  actor?: string;
}

interface FloatingDamage {
  id: number;
  damage: number;
  position: 1 | 2;
  isCrit?: boolean;
}

export default function ArenaPage() {
  const [fighter1, setFighter1] = useState<Hero | null>(null);
  const [fighter2, setFighter2] = useState<Hero | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [battleHistory] = useState<any[]>([]);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [shake, setShake] = useState<1 | 2 | null>(null);
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

  const addFloatingDamage = (damage: number, position: 1 | 2, isCrit = false) => {
    const id = Date.now() + Math.random();
    setFloatingDamages(prev => [...prev, { id, damage, position, isCrit }]);
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id));
    }, 1500);
  };

  const triggerShake = (position: 1 | 2) => {
    setShake(position);
    setTimeout(() => setShake(null), 200);
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
    setFloatingDamages([]);
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
    const ability1Index = Math.floor(Math.random() * Math.min(4, fighter1.abilities.length));
    const ability1 = fighter1.abilities[ability1Index] || 'Angriff';
    const damage1 = getAbilityPower(fighter1, ability1Index);
    const isCrit1 = Math.random() > 0.85;
    const actualDamage1 = Math.max(1, Math.round((damage1 - Math.floor(fighter2.stats.durability / 10)) * (isCrit1 ? 1.5 : 1)));
    newHp2 = Math.max(0, newHp2 - actualDamage1);

    // Trigger effects
    triggerShake(2);
    addFloatingDamage(actualDamage1, 2, isCrit1);

    newLog.push({
      text: `${fighter1.name} nutzt ${ability1}!`,
      type: 'attack',
      damage: actualDamage1,
      actor: fighter1.name
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
        text: `${fighter1.name} gewinnt den Kampf!`,
        type: 'end'
      }]);
      stopAutoMode();
      return;
    }

    // Fighter 2 attacks
    const ability2Index = Math.floor(Math.random() * Math.min(4, fighter2.abilities.length));
    const ability2 = fighter2.abilities[ability2Index] || 'Angriff';
    const damage2 = getAbilityPower(fighter2, ability2Index);
    const isCrit2 = Math.random() > 0.85;
    const actualDamage2 = Math.max(1, Math.round((damage2 - Math.floor(fighter1.stats.durability / 10)) * (isCrit2 ? 1.5 : 1)));
    newHp1 = Math.max(0, newHp1 - actualDamage2);

    // Trigger effects
    triggerShake(1);
    addFloatingDamage(actualDamage2, 1, isCrit2);

    newLog.push({
      text: `${fighter2.name} nutzt ${ability2}!`,
      type: 'attack',
      damage: actualDamage2,
      actor: fighter2.name
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
        text: `${fighter2.name} gewinnt den Kampf!`,
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
        }, 1200);
      }, 300);
    } else {
      setIsAutoMode(true);
      autoIntervalRef.current = window.setInterval(() => {
        executeRound();
      }, 1200);
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
          className="flex-1 rounded-xl border-2 border-dashed border-gray-600/40 p-8 flex flex-col items-center justify-center min-h-[240px] transition-all duration-200"
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

    // Universe glow colors
    const glowColor = hero.universe === 'Marvel' ? '#e74c3c' : '#3498db';

    return (
      <div
        className={`flex-1 flex flex-col gap-3 transition-transform duration-200 ${
          shake === position ? 'animate-shake' : ''
        }`}
        style={{
          filter: `drop-shadow(0 0 20px ${glowColor}40)`
        }}
      >
        {/* Floating Damage Numbers */}
        {floatingDamages
          .filter(d => d.position === position)
          .map(({ id, damage, isCrit }) => (
            <div
              key={id}
              className="absolute -top-8 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none z-50"
              style={{
                fontSize: isCrit ? '2rem' : '1.5rem',
                fontWeight: 'bold',
                color: isCrit ? '#ff6b6b' : '#ef4444',
                textShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
              }}
            >
              -{damage}
            </div>
          ))}

        {/* Hero Name & Avatar */}
        <div className="text-center relative">
          <div
            className="text-7xl mb-2 inline-block transition-transform duration-300 hover:scale-110"
            style={{
              filter: `drop-shadow(0 4px 20px ${hero.color}99)`
            }}
          >
            {hero.image}
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{hero.name}</h3>
          <span
            className={`inline-block text-xs px-3 py-1 rounded-lg font-bold transition-all duration-200 ${
              hero.universe === 'Marvel' ? 'bg-red-600/90' : 'bg-blue-600/90'
            }`}
          >
            {hero.universe}
          </span>
        </div>

        {/* HP Bar with Gradient */}
        <div className="bg-slate-900/60 rounded-xl p-3 shadow-md">
          <div className="flex justify-between text-sm font-bold text-gray-300 mb-2">
            <span>HP</span>
            <span className="font-mono">{displayHp}/{displayMaxHp}</span>
          </div>
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full transition-all duration-700 ease-out rounded-full relative"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50
                  ? 'linear-gradient(90deg, #4ade80, #22c55e, #16a34a)'
                  : hpPercent > 25
                  ? 'linear-gradient(90deg, #facc15, #eab308, #ca8a04)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626, #b91c1c)',
                boxShadow: hpPercent > 50
                  ? '0 0 15px rgba(74, 222, 128, 0.6), inset 0 1px 3px rgba(255,255,255,0.2)'
                  : hpPercent > 25
                  ? '0 0 15px rgba(250, 204, 21, 0.6), inset 0 1px 3px rgba(255,255,255,0.2)'
                  : '0 0 15px rgba(239, 68, 68, 0.6), inset 0 1px 3px rgba(255,255,255,0.2)'
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              />
            </div>
          </div>
        </div>

        {/* Abilities with Enhanced Hover */}
        <div className="grid grid-cols-2 gap-2">
          {hero.abilities.slice(0, 4).map((ability, idx) => {
            const statIcons = ['👊', '🔮', '⚔️', '⚡'];
            const statColors = ['#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];
            const pwrValue = Math.floor(Math.random() * 40) + 60;

            return (
              <div
                key={idx}
                className="group relative flex items-center gap-2 bg-slate-900/70 rounded-lg px-3 py-2.5 border border-gray-700/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                style={{
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                title={ability}
              >
                {/* PWR Badge */}
                <div
                  className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm"
                  style={{
                    background: statColors[idx],
                    color: 'white'
                  }}
                >
                  {pwrValue}
                </div>

                <span className="text-lg transition-transform duration-200 group-hover:scale-110">
                  {statIcons[idx]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-200 truncate font-medium">
                    {ability}
                  </div>
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                  {ability}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Log Icon Helper
  const getLogIcon = (type: BattleLogEntry['type']) => {
    switch (type) {
      case 'attack': return <Zap size={14} className="text-red-400" />;
      case 'defense': return <Shield size={14} className="text-blue-400" />;
      case 'special': return <Sparkles size={14} className="text-yellow-400" />;
      default: return null;
    }
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
          <button className="mt-3 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-sm text-gray-300 flex items-center gap-2 mx-auto transition-all duration-200 hover:shadow-md">
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
          <div className="flex gap-6 items-start mb-6 relative">
            <FighterPanel
              hero={fighter1}
              hp={battleState?.hp1}
              maxHp={battleState?.maxHp1}
              position={1}
            />

            {/* VS Divider with Pulse Animation */}
            <div className="flex flex-col items-center justify-center px-4 py-8">
              {/* Vertical Divider Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent" />

              <div
                className="text-5xl font-black mb-2 animate-pulse-subtle relative z-10"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24, #f59e0b, #d97706)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 25px rgba(251, 191, 36, 0.4)',
                  animation: 'pulse-vs 2s ease-in-out infinite'
                }}
              >
                VS
              </div>
              {battleState && (
                <div className="text-sm text-gray-400 font-mono bg-slate-800/50 px-3 py-1 rounded-full shadow-sm relative z-10">
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
                className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-200 shadow-lg hover:scale-105 hover:shadow-xl"
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
                className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-200 shadow-lg hover:scale-105"
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
              className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-200 shadow-lg hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-200 shadow-lg hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #4b5563, #374151)',
                color: 'white'
              }}
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>

          {/* Enhanced Kampflog */}
          {battleLog.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl p-4 shadow-md">
              <h3 className="text-sm font-bold text-yellow-500 mb-3 flex items-center gap-2">
                <span>📜</span> Kampflog
              </h3>
              <div
                ref={logRef}
                className="max-h-32 overflow-y-auto space-y-2 text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              >
                {battleLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-2.5 rounded-lg transition-all duration-300 animate-slide-in ${
                      entry.type === 'start'
                        ? 'bg-blue-900/40 text-blue-200 border-l-4 border-blue-400 shadow-sm'
                        : entry.type === 'end'
                        ? 'bg-yellow-900/40 text-yellow-200 font-bold border-l-4 border-yellow-400 shadow-md'
                        : 'bg-slate-800/60 text-gray-300 border-l-4 border-red-500/50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getLogIcon(entry.type)}
                      <span>{entry.text}</span>
                      {entry.damage && (
                        <span className="ml-auto font-bold text-red-400">
                          -{entry.damage} HP
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage Types & Elements */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Kampf-Dreieck */}
            <div className="bg-slate-900/40 rounded-xl p-3 shadow-sm">
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
            <div className="bg-slate-900/40 rounded-xl p-3 shadow-sm">
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

        {/* Enhanced Fighter Selection */}
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

          {/* Enhanced Hero Grid */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <select className="px-3 py-1.5 bg-slate-800/80 text-gray-300 text-xs rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-all duration-200">
                <option>Alle</option>
              </select>
              <select className="px-3 py-1.5 bg-slate-800/80 text-gray-300 text-xs rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-all duration-200">
                <option>Alle</option>
              </select>
            </div>

            <div className="relative">
              {/* Scroll indicators */}
              <button className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-r-lg shadow-lg transition-all duration-200">
                <span className="text-white text-xl">◀</span>
              </button>
              <button className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-l-lg shadow-lg transition-all duration-200">
                <span className="text-white text-xl">▶</span>
              </button>

              <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="flex gap-3 px-8">
                  {sortedHeroes.slice(0, 25).map((hero) => {
                    const isSelected = fighter1?.id === hero.id || fighter2?.id === hero.id;
                    const tierBadge = hero.tier === 'Cosmic' ? 'C' : hero.tier.charAt(0);
                    const tierColor = tierColors[hero.tier].bg;

                    return (
                      <div
                        key={hero.id}
                        onClick={() => selectFighter(hero)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-110 hover:-translate-y-1 flex-shrink-0 ${
                          isSelected ? 'ring-4 ring-yellow-400 opacity-70 scale-105' : ''
                        }`}
                        style={{
                          width: '100px',
                          background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 35, 0.95))',
                          borderTop: `4px solid ${hero.universe === 'Marvel' ? '#dc2626' : '#2563eb'}`,
                          boxShadow: isSelected
                            ? `0 8px 20px ${tierColor}60, 0 0 0 4px #facc15`
                            : `0 4px 12px rgba(0,0,0,0.3)`,
                        }}
                      >
                        {/* Tier Badge */}
                        <div
                          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold z-10 shadow-md"
                          style={{
                            background: tierColors[hero.tier].bg,
                            color: tierColors[hero.tier].text,
                          }}
                        >
                          {tierBadge}
                        </div>

                        {/* Hero Class Badge */}
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <HeroClassIcon heroClass={hero.heroClass} size="sm" />
                        </div>

                        {/* Publisher Badge */}
                        <div className={`absolute bottom-1 left-1 right-1 text-center z-10`}>
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-md shadow-sm ${
                            hero.universe === 'Marvel' ? 'bg-red-600/95' : 'bg-blue-600/95'
                          }`}>
                            {hero.universe === 'Marvel' ? 'M' : 'DC'}
                          </span>
                        </div>

                        <div className="p-2 pt-7 pb-6 text-center">
                          <div className="text-4xl mb-1">{hero.image}</div>
                          <div className="text-[10px] font-medium text-white truncate px-1">
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

      {/* Custom Animations */}
      <style>{`
        @keyframes pulse-vs {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }

        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -60px);
          }
        }

        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.7);
        }
      `}</style>
    </div>
  );
}
