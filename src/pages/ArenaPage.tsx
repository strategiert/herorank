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

interface ToastMessage {
  id: number;
  text: string;
  damage?: number;
  icon?: string;
}

export default function ArenaPage() {
  const [fighter1, setFighter1] = useState<Hero | null>(null);
  const [fighter2, setFighter2] = useState<Hero | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [_battleHistory] = useState<number>(0);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [shake, setShake] = useState<1 | 2 | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
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
    // Handle 0-values: use minimum of 10 for missing stats
    const effectiveDurability = hero.stats.durability || 10;
    const effectiveStrength = hero.stats.strength || 10;

    // Calculate base HP
    const baseHP = Math.round(
      (effectiveDurability * 15) +
      (effectiveStrength * 5) +
      (hero.power * 3)
    );

    // Guarantee minimum HP based on tier/power
    const minHP = hero.power >= 90 ? 2000 : hero.power >= 70 ? 1500 : hero.power >= 50 ? 1000 : 500;

    return Math.max(baseHP, minHP);
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

  const showToast = (text: string, damage?: number, icon?: string) => {
    const id = Date.now();
    setToast({ id, text, damage, icon });
    setTimeout(() => {
      setToast(null);
    }, 2500);
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
    setToast(null);
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

    showToast(`${fighter1.name} vs ${fighter2.name}!`, undefined, '⚔️');
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
    showToast(`${fighter1.name} nutzt ${ability1}!`, actualDamage1, fighter1.image);

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
      showToast(`🏆 ${fighter1.name} gewinnt!`, undefined, '🏆');
      stopAutoMode();
      return;
    }

    // Fighter 2 attacks
    setTimeout(() => {
      const ability2Index = Math.floor(Math.random() * Math.min(4, fighter2.abilities.length));
      const ability2 = fighter2.abilities[ability2Index] || 'Angriff';
      const damage2 = getAbilityPower(fighter2, ability2Index);
      const isCrit2 = Math.random() > 0.85;
      const actualDamage2 = Math.max(1, Math.round((damage2 - Math.floor(fighter1.stats.durability / 10)) * (isCrit2 ? 1.5 : 1)));
      newHp1 = Math.max(0, newHp1 - actualDamage2);

      // Trigger effects
      triggerShake(1);
      addFloatingDamage(actualDamage2, 1, isCrit2);
      showToast(`${fighter2.name} nutzt ${ability2}!`, actualDamage2, fighter2.image);

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
        showToast(`🏆 ${fighter2.name} gewinnt!`, undefined, '🏆');
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
    }, 800);
  };

  const startAutoMode = () => {
    if (!battleState?.isActive) {
      startBattle();
      setTimeout(() => {
        setIsAutoMode(true);
        autoIntervalRef.current = window.setInterval(() => {
          executeRound();
        }, 2000);
      }, 300);
    } else {
      setIsAutoMode(true);
      autoIntervalRef.current = window.setInterval(() => {
        executeRound();
      }, 2000);
    }
  };

  const stopAutoMode = () => {
    setIsAutoMode(false);
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  };

  // Fighter Panel Component - Mobile Gaming Style
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
          className="flex-1 rounded-2xl border-4 border-dashed border-gray-600/30 p-8 flex flex-col items-center justify-center min-h-[280px] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.3), rgba(20, 20, 35, 0.5))'
          }}
        >
          <span className="text-8xl mb-4 opacity-15">👤</span>
          <span className="text-gray-400 text-xl font-bold">Kämpfer {position}</span>
        </div>
      );
    }

    const displayHp = hp ?? calculateHP(hero);
    const displayMaxHp = maxHp ?? calculateHP(hero);
    const hpPercent = (displayHp / displayMaxHp) * 100;
    const glowColor = hero.universe === 'Marvel' ? '#e74c3c' : '#3498db';

    return (
      <div
        className={`flex-1 flex flex-col gap-4 transition-transform duration-200 ${
          shake === position ? 'animate-shake' : ''
        }`}
        style={{
          filter: `drop-shadow(0 0 24px ${glowColor}50)`
        }}
      >
        {/* Floating Damage Numbers */}
        {floatingDamages
          .filter(d => d.position === position)
          .map(({ id, damage, isCrit }) => (
            <div
              key={id}
              className="absolute -top-12 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none z-50"
              style={{
                fontSize: isCrit ? '3rem' : '2.5rem',
                fontWeight: '900',
                color: isCrit ? '#ff6b6b' : '#ef4444',
                textShadow: '0 0 20px rgba(239, 68, 68, 0.9), 0 4px 8px rgba(0,0,0,0.5)'
              }}
            >
              -{damage}
            </div>
          ))}

        {/* Hero Avatar - LARGE 160px */}
        <div className="text-center relative">
          <div
            className="inline-block transition-transform duration-300 hover:scale-105 active:scale-95"
            style={{
              fontSize: '10rem',
              filter: `drop-shadow(0 8px 24px ${hero.color}99)`
            }}
          >
            {hero.image}
          </div>

          {/* Hero Name - Large & Bold */}
          <h3 className="text-2xl font-black text-white mt-3 mb-2 tracking-tight">
            {hero.name}
          </h3>

          {/* Publisher Badge - Large Pill */}
          <span
            className={`inline-block text-base px-6 py-2 rounded-full font-black uppercase tracking-wide ${
              hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            {hero.universe}
          </span>
        </div>

        {/* HP Bar - LARGE 24px height with text inside */}
        <div className="w-full">
          <div
            className="h-8 rounded-xl overflow-hidden shadow-lg relative"
            style={{
              background: 'linear-gradient(to bottom, rgba(30,30,40,0.9), rgba(20,20,30,0.95))',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
          >
            {/* HP Fill */}
            <div
              className="h-full transition-all duration-700 ease-out relative"
              style={{
                width: `${hpPercent}%`,
                background: hpPercent > 50
                  ? 'linear-gradient(90deg, #4ade80, #22c55e, #16a34a)'
                  : hpPercent > 25
                  ? 'linear-gradient(90deg, #facc15, #eab308, #ca8a04)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626, #b91c1c)',
                boxShadow: hpPercent > 50
                  ? '0 0 20px rgba(74, 222, 128, 0.7), inset 0 2px 4px rgba(255,255,255,0.3)'
                  : hpPercent > 25
                  ? '0 0 20px rgba(250, 204, 21, 0.7), inset 0 2px 4px rgba(255,255,255,0.3)'
                  : '0 0 20px rgba(239, 68, 68, 0.7), inset 0 2px 4px rgba(255,255,255,0.3)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>

            {/* HP Text INSIDE Bar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-lg drop-shadow-lg tracking-wide">
                {displayHp} / {displayMaxHp}
              </span>
            </div>
          </div>
        </div>

        {/* Abilities - 2x2 Grid with LARGE touch targets */}
        <div className="grid grid-cols-2 gap-4">
          {hero.abilities.slice(0, 4).map((ability, idx) => {
            const statIcons = ['👊', '🔮', '⚔️', '⚡'];
            const statColors = ['#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];
            const pwrValue = Math.floor(Math.random() * 40) + 60;

            return (
              <div
                key={idx}
                className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-4 min-h-[100px] flex flex-col justify-between border-2 border-gray-700/50 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                style={{
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)'
                }}
              >
                {/* Icon - Large */}
                <div className="text-4xl mb-2 transition-transform duration-200 group-hover:scale-110">
                  {statIcons[idx]}
                </div>

                {/* Ability Name */}
                <div className="text-sm font-bold text-gray-200 leading-tight mb-2">
                  {ability.length > 18 ? ability.substring(0, 18) + '...' : ability}
                </div>

                {/* PWR Badge - Large, bottom right */}
                <div
                  className="absolute bottom-3 right-3 text-xl font-black px-3 py-1 rounded-lg shadow-md"
                  style={{
                    background: statColors[idx],
                    color: 'white'
                  }}
                >
                  {pwrValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(to bottom, #0f0f19, #1a1a2e)' }}>
      {/* Toast Message Overlay */}
      {toast && (
        <div
          className="fixed top-4 left-4 right-4 z-50 animate-slide-down"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          <div
            className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-yellow-500/30"
            style={{
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            {toast.icon && <span className="text-5xl">{toast.icon}</span>}
            <div className="flex-1">
              <p className="text-white text-lg font-bold">{toast.text}</p>
              {toast.damage && (
                <p className="text-red-400 text-2xl font-black mt-1">-{toast.damage} HP</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Mobile First, Max 600px */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header - Minimal */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">⚔️</span>
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
              Battle Arena
            </span>
          </h1>
          <p className="text-base text-gray-400 font-medium">
            200 Kämpfer • RPG-Kampfsystem
          </p>

          {/* Historie Button - Touch-friendly */}
          <button
            onClick={() => setShowLogModal(true)}
            className="mt-4 px-6 py-3 bg-slate-800/70 hover:bg-slate-700/70 active:scale-95 rounded-xl text-base text-gray-300 font-bold flex items-center gap-3 mx-auto transition-all shadow-lg"
            style={{ minHeight: '48px' }}
          >
            <History size={20} />
            Kampflog ({battleLog.length})
          </button>
        </div>

        {/* Battle Arena - Vertical Stacking */}
        <div className="space-y-8 mb-8">
          {/* Fighter Panels - Vertical on Mobile */}
          <div className="space-y-8">
            <FighterPanel
              hero={fighter1}
              hp={battleState?.hp1}
              maxHp={battleState?.maxHp1}
              position={1}
            />

            {/* VS Divider - LARGE */}
            <div className="flex flex-col items-center justify-center py-6">
              <div
                className="text-7xl font-black mb-3"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24, #f59e0b, #d97706)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
                  animation: 'pulse-vs 2s ease-in-out infinite'
                }}
              >
                VS
              </div>
              {battleState && (
                <div className="text-xl text-gray-300 font-black bg-slate-800/60 px-6 py-2 rounded-full shadow-lg">
                  Runde {battleState.round}
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

          {/* Action Buttons - LARGE, Full Width, Gaming Style */}
          <div className="space-y-4">
            {(!battleState || !battleState.isActive) && fighter1 && fighter2 && (
              <button
                onClick={startBattle}
                className="w-full rounded-2xl font-black text-2xl uppercase flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95"
                style={{
                  minHeight: '72px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a, #15803d)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                }}
              >
                <Play size={32} fill="white" />
                Start!
              </button>
            )}

            {battleState?.isActive && !isAutoMode && (
              <button
                onClick={startAutoMode}
                className="w-full rounded-2xl font-black text-2xl uppercase flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95"
                style={{
                  minHeight: '72px',
                  background: 'linear-gradient(135deg, #9333ea, #7e22ce, #6b21a8)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(147, 51, 234, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                }}
              >
                <Play size={32} fill="white" />
                Auto
              </button>
            )}

            {/* Secondary Buttons - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={randomFighters}
                disabled={battleState?.isActive}
                className="rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  minHeight: '56px',
                  background: battleState?.isActive
                    ? '#4b5563'
                    : 'linear-gradient(135deg, #a855f7, #9333ea)',
                  color: 'white'
                }}
              >
                <Shuffle size={24} />
                Zufall
              </button>

              <button
                onClick={clearFighters}
                className="rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                style={{
                  minHeight: '56px',
                  background: 'linear-gradient(135deg, #4b5563, #374151)',
                  color: 'white'
                }}
              >
                <RotateCcw size={24} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Fighter Selection - Large Thumbnails */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.8), rgba(30, 30, 50, 0.8))',
            border: '2px solid rgba(100, 100, 150, 0.2)'
          }}
        >
          <h3 className="text-xl font-black text-white mb-4">
            Kämpfer wählen ({sortedHeroes.length})
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
            compact
          />

          {/* Hero Grid - Large Touch Targets 80x80px */}
          <div className="mt-4 overflow-x-auto -mx-6 px-6 pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="flex gap-4">
              {sortedHeroes.slice(0, 25).map((hero) => {
                const isSelected = fighter1?.id === hero.id || fighter2?.id === hero.id;
                const tierBadge = hero.tier === 'Cosmic' ? 'C' : hero.tier.charAt(0);
                const tierColor = tierColors[hero.tier].bg;

                return (
                  <div
                    key={hero.id}
                    onClick={() => selectFighter(hero)}
                    className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 ${
                      isSelected ? 'ring-4 ring-yellow-400' : ''
                    }`}
                    style={{
                      width: '110px',
                      minHeight: '140px',
                      background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95), rgba(20, 20, 35, 0.95))',
                      borderTop: `5px solid ${hero.universe === 'Marvel' ? '#dc2626' : '#2563eb'}`,
                      boxShadow: isSelected
                        ? `0 12px 32px ${tierColor}70, 0 0 0 4px #facc15`
                        : `0 6px 16px rgba(0,0,0,0.4)`,
                    }}
                  >
                    {/* Tier Badge */}
                    <div
                      className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black z-10 shadow-lg"
                      style={{
                        background: tierColors[hero.tier].bg,
                        color: tierColors[hero.tier].text,
                      }}
                    >
                      {tierBadge}
                    </div>

                    {/* Hero Class Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <HeroClassIcon heroClass={hero.heroClass} size="sm" />
                    </div>

                    {/* Hero Avatar - LARGE */}
                    <div className="pt-10 pb-3 text-center">
                      <div className="text-5xl mb-2">{hero.image}</div>
                      <div className="text-xs font-bold text-white px-2 leading-tight">
                        {hero.name.length > 12 ? hero.name.substring(0, 12) + '...' : hero.name}
                      </div>
                    </div>

                    {/* Publisher Badge Bottom */}
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <span className={`text-xs font-black px-3 py-1 rounded-lg shadow-md ${
                        hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
                      }`}>
                        {hero.universe === 'Marvel' ? 'M' : 'DC'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Kampflog Modal */}
      {showLogModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-2xl font-black text-white">📜 Kampflog</h2>
            </div>

            {/* Log Content */}
            <div
              ref={logRef}
              className="overflow-y-auto p-6 space-y-3"
              style={{ maxHeight: 'calc(80vh - 120px)' }}
            >
              {battleLog.length === 0 ? (
                <p className="text-gray-500 text-center py-12">
                  Noch keine Kämpfe...
                </p>
              ) : (
                battleLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-5 py-4 rounded-2xl transition-all shadow-lg ${
                      entry.type === 'start'
                        ? 'bg-blue-900/40 text-blue-200 border-l-4 border-blue-400'
                        : entry.type === 'end'
                        ? 'bg-yellow-900/40 text-yellow-200 font-bold border-l-4 border-yellow-400'
                        : 'bg-slate-800/60 text-gray-300 border-l-4 border-red-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base">{entry.text}</span>
                      {entry.damage && (
                        <span className="text-red-400 font-black text-xl">
                          -{entry.damage} HP
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <div className="px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setShowLogModal(false)}
                className="w-full rounded-xl font-bold text-lg py-4 bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all"
                style={{ minHeight: '56px' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes pulse-vs {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
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
            transform: translate(-50%, -80px);
          }
        }

        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        .animate-shimmer {
          animation: shimmer 2.5s infinite;
        }

        /* Touch-friendly scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
}
