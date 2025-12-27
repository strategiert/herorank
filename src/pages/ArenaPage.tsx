import { useState, useRef, useEffect } from 'react';
import { Trophy, Shuffle, Play, RotateCcw, Pause } from 'lucide-react';
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
      text: `R${battleState.round}: ${fighter1.name} nutzt ${ability1}! (-${actualDamage1} HP)`,
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
      text: `R${battleState.round}: ${fighter2.name} nutzt ${ability2}! (-${actualDamage2} HP)`,
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
        }, 600);
      }, 300);
    } else {
      setIsAutoMode(true);
      autoIntervalRef.current = window.setInterval(() => {
        executeRound();
      }, 600);
    }
  };

  const stopAutoMode = () => {
    setIsAutoMode(false);
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  };

  // Fighter Panel Component - wie im Referenzbild
  const FighterPanel = ({ hero, hp, maxHp, isWinner }: { hero: Hero | null; hp?: number; maxHp?: number; isWinner?: boolean }) => {
    if (!hero) {
      return (
        <div className="flex-1 rounded-xl border-2 border-dashed border-gray-600 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[280px]" style={{ background: 'rgba(20, 20, 30, 0.6)' }}>
          <span className="text-5xl opacity-30 mb-2">👤</span>
          <span className="text-gray-500 text-sm">Kämpfer wählen</span>
        </div>
      );
    }

    const displayHp = hp ?? calculateHP(hero);
    const displayMaxHp = maxHp ?? calculateHP(hero);
    const hpPercent = (displayHp / displayMaxHp) * 100;
    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444';

    return (
      <div
        className={`flex-1 rounded-xl p-4 sm:p-5 ${isWinner ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''}`}
        style={{
          background: 'rgba(20, 20, 30, 0.8)',
          border: isWinner ? '2px solid #facc15' : `2px solid ${hero.color}66`
        }}
      >
        {/* Hero Image & Name */}
        <div className="text-center mb-4">
          <div className="text-5xl sm:text-6xl mb-2" style={{ filter: `drop-shadow(0 4px 12px ${hero.color}88)` }}>
            {hero.image}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">{hero.name}</h3>
          <span className={`inline-block mt-1 text-xs px-3 py-1 rounded font-medium ${hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'}`}>
            {hero.universe}
          </span>
        </div>

        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className="font-bold">HP</span>
            <span className="font-mono">{displayHp}/{displayMaxHp}</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
            />
          </div>
        </div>

        {/* Abilities - 2x2 Grid wie im Referenzbild */}
        <div className="grid grid-cols-2 gap-2">
          {hero.abilities.slice(0, 3).map((ability, idx) => {
            const statValues = [hero.stats.strength, hero.stats.intelligence, hero.stats.combat];
            const pwrValue = Math.round(statValues[idx % 3] * (0.8 + (idx * 0.1)));
            const icons = ['👊', '🧠', '⚡'];

            return (
              <div key={idx} className="flex items-center gap-2 text-xs bg-black/40 rounded-lg px-2 py-2">
                <span className="text-sm">{icons[idx % 3]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 truncate text-[10px] sm:text-xs">{ability}</div>
                  <div className="text-yellow-500 font-bold text-[10px]">PWR:{pwrValue}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner Badge */}
        {isWinner && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500 rounded-full px-4 py-2">
              <Trophy size={20} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold">SIEGER!</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
          <span className="text-2xl">⚔️</span>
          Superhero Battle System
          <span className="text-2xl">⚔️</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">{superheroes.length} Kämpfer • RPG-Kampfsystem</p>
      </div>

      {/* Battle Arena */}
      <div className="rounded-xl p-4 sm:p-6 mb-4" style={{ background: 'rgba(15, 15, 25, 0.9)' }}>
        {/* Fighter Panels - nebeneinander */}
        <div className="flex gap-4 mb-4">
          <FighterPanel
            hero={fighter1}
            hp={battleState?.hp1}
            maxHp={battleState?.maxHp1}
            isWinner={battleState?.winner?.id === fighter1?.id}
          />

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center px-2">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-b from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              VS
            </div>
            {battleState && (
              <div className="text-sm text-gray-400 mt-1 font-mono">R{battleState.round}</div>
            )}
          </div>

          <FighterPanel
            hero={fighter2}
            hp={battleState?.hp2}
            maxHp={battleState?.maxHp2}
            isWinner={battleState?.winner?.id === fighter2?.id}
          />
        </div>

        {/* Battle Controls */}
        <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
          {(!battleState || (!battleState.isActive && !battleState.winner)) && (
            <button
              onClick={startBattle}
              disabled={!fighter1 || !fighter2}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                fighter1 && fighter2
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play size={18} />
              Start!
            </button>
          )}

          {battleState?.isActive && !isAutoMode && (
            <>
              <button
                onClick={executeRound}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
              >
                <Play size={18} />
                Nächste Runde
              </button>
              <button
                onClick={startAutoMode}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2"
              >
                <Play size={18} />
                Auto
              </button>
            </>
          )}

          {isAutoMode && (
            <button
              onClick={stopAutoMode}
              className="px-5 py-2.5 rounded-lg font-bold text-sm bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2"
            >
              <Pause size={18} />
              Stop
            </button>
          )}

          <button
            onClick={randomFighters}
            disabled={battleState?.isActive}
            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle size={18} />
            Zufall
          </button>

          <button
            onClick={clearFighters}
            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </div>

      {/* Battle Log */}
      <div className="rounded-xl p-3 sm:p-4 mb-4" style={{ background: 'rgba(15, 15, 25, 0.8)' }}>
        <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
          <span>📜</span> Kampflog
        </h3>
        <div
          ref={logRef}
          className="h-28 overflow-y-auto space-y-1 text-sm"
        >
          {battleLog.length === 0 ? (
            <p className="text-gray-600 text-xs">Wähle zwei Kämpfer und starte den Kampf...</p>
          ) : (
            battleLog.map((entry, idx) => (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded ${
                  entry.type === 'start' ? 'bg-blue-900/40 text-blue-300' :
                  entry.type === 'end' ? 'bg-yellow-900/40 text-yellow-300 font-bold text-base' :
                  'bg-gray-800/50 text-gray-300'
                }`}
              >
                {entry.type === 'start' && '⚔️ '}
                {entry.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fighter Selection - mit erweitertem Filter */}
      <div className="rounded-xl p-3 sm:p-4" style={{ background: 'rgba(15, 15, 25, 0.6)' }}>
        <h3 className="text-sm font-bold text-white mb-3">Kämpfer auswählen</h3>

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

        {/* Hero Grid - vertikal scrollbar */}
        <div className="max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {sortedHeroes.map((hero) => {
              const isSelected = fighter1?.id === hero.id || fighter2?.id === hero.id;
              const tierLabel = hero.tier === 'Cosmic' ? 'C' : hero.tier;

              return (
                <div
                  key={hero.id}
                  onClick={() => selectFighter(hero)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 ${
                    isSelected ? 'ring-2 ring-yellow-400 opacity-60' : ''
                  }`}
                  style={{
                    background: 'rgba(25, 25, 35, 0.9)',
                    borderLeft: `3px solid ${hero.universe === 'Marvel' ? '#dc2626' : '#2563eb'}`,
                  }}
                >
                  {/* Tier Badge */}
                  <div
                    className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: tierColors[hero.tier].bg,
                      color: tierColors[hero.tier].text,
                    }}
                  >
                    {tierLabel}
                  </div>

                  {/* Hero Class Badge */}
                  <div className="absolute bottom-1 right-1">
                    <HeroClassIcon heroClass={hero.heroClass} size="sm" />
                  </div>

                  <div className="p-2 pt-5 text-center">
                    <div className="text-2xl mb-1">{hero.image}</div>
                    <div className="text-[9px] font-medium text-white truncate">{hero.name}</div>
                    <div className={`text-[7px] font-bold px-1 py-0.5 rounded mt-1 inline-block ${
                      hero.universe === 'Marvel' ? 'bg-red-600/80' : 'bg-blue-600/80'
                    }`}>
                      {hero.universe}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
