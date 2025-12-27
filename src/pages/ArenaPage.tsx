import { useState, useRef, useEffect } from 'react';
import {
  Shuffle,
  Play,
  RotateCcw,
  History,
  Zap,
  Shield,
  Swords,
  Brain,
  Gauge,
  ChevronDown,
  X
} from 'lucide-react';
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
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [shake, setShake] = useState<1 | 2 | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
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
    }, 2000);
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

  // Stat Icons with Neon Glow
  const StatIcon = ({ stat, value }: { stat: string; value: number }) => {
    const icons = {
      strength: { Icon: Zap, color: '#ff6b35' },
      speed: { Icon: Gauge, color: '#00d4ff' },
      durability: { Icon: Shield, color: '#4ade80' },
      intelligence: { Icon: Brain, color: '#a855f7' },
      combat: { Icon: Swords, color: '#ef4444' },
    };

    const config = icons[stat as keyof typeof icons] || icons.combat;
    const { Icon, color } = config;

    return (
      <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2 py-1.5 border border-white/10">
        <Icon
          size={16}
          style={{
            color,
            filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`
          }}
        />
        <span className="text-white font-stats font-bold text-sm">{value}</span>
      </div>
    );
  };

  // Fighter Panel Component - CYBER NEON STYLE
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
          className="flex-1 rounded-3xl border-2 border-dashed border-cyan-500/30 p-8 flex flex-col items-center justify-center min-h-[320px] transition-all duration-300 hover:border-cyan-500/50"
          style={{
            background: 'rgba(10, 15, 30, 0.6)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-8xl mb-4 opacity-20">👤</div>
          <span className="text-cyan-400 text-xl font-gaming uppercase tracking-wider">
            Kämpfer {position}
          </span>
        </div>
      );
    }

    const displayHp = hp ?? calculateHP(hero);
    const displayMaxHp = maxHp ?? calculateHP(hero);
    const hpPercent = (displayHp / displayMaxHp) * 100;
    const universeColor = hero.universe === 'Marvel' ? '#e74c3c' : '#3498db';

    return (
      <div
        className={`flex-1 flex flex-col gap-4 transition-all duration-500 ${
          shake === position ? 'animate-shake' : ''
        } ${position === 1 ? 'animate-tilt-left' : 'animate-tilt-right'}`}
        style={{
          filter: `drop-shadow(0 0 30px ${universeColor}60)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* GLASSMORPHISM CARD */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden border-2"
          style={{
            background: `linear-gradient(135deg, rgba(15, 20, 40, 0.85), rgba(10, 15, 30, 0.90))`,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderColor: `${universeColor}40`,
            boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 0 60px ${universeColor}30, inset 0 0 40px ${universeColor}10`
          }}
        >
          {/* Floating Damage Numbers - HUGE */}
          {floatingDamages
            .filter(d => d.position === position)
            .map(({ id, damage, isCrit }) => (
              <div
                key={id}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-up pointer-events-none z-50 font-gaming"
                style={{
                  fontSize: isCrit ? '5rem' : '4rem',
                  fontWeight: '900',
                  color: isCrit ? '#ff3366' : '#ff6b35',
                  textShadow: isCrit
                    ? '0 0 30px #ff3366, 0 0 60px #ff3366, 0 0 90px #ff3366, 0 4px 20px rgba(0,0,0,0.8)'
                    : '0 0 20px #ff6b35, 0 0 40px #ff6b35, 0 0 60px #ff6b35, 0 4px 20px rgba(0,0,0,0.8)',
                  animation: 'float-up 2s ease-out forwards, neon-pulse 0.5s ease-in-out'
                }}
              >
                -{damage}
              </div>
            ))}

          {/* Hero Avatar - MASSIVE with NEON GLOW */}
          <div className="text-center relative mb-4">
            <div
              className="inline-block transition-transform duration-500 hover:scale-110 active:scale-95 relative"
              style={{
                fontSize: '11rem',
                filter: `drop-shadow(0 10px 40px ${hero.color}) drop-shadow(0 0 80px ${hero.color}80)`,
                animation: 'float 4s ease-in-out infinite'
              }}
            >
              {hero.image}
            </div>

            {/* Hero Name - GAMING FONT with NEON */}
            <h3
              className="text-4xl font-hero mt-4 mb-2 tracking-wider uppercase"
              style={{
                color: universeColor,
                textShadow: `0 0 10px ${universeColor}, 0 0 20px ${universeColor}, 0 0 40px ${universeColor}`,
                animation: 'neon-pulse 3s ease-in-out infinite'
              }}
            >
              {hero.name}
            </h3>

            {/* Publisher Badge - GLOWING PILL */}
            <div
              className={`inline-block text-lg px-8 py-2 rounded-full font-gaming font-black uppercase tracking-widest ${
                hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{
                boxShadow: hero.universe === 'Marvel'
                  ? '0 0 20px #e74c3c, 0 0 40px #e74c3c80, 0 4px 20px rgba(0,0,0,0.5)'
                  : '0 0 20px #3498db, 0 0 40px #3498db80, 0 4px 20px rgba(0,0,0,0.5)',
                border: `2px solid ${hero.universe === 'Marvel' ? '#ff6b6b' : '#5dade2'}`,
              }}
            >
              {hero.universe}
            </div>
          </div>

          {/* HP Bar - THICK with NEON GRADIENT */}
          <div className="w-full mb-4">
            <div
              className="h-10 rounded-full overflow-hidden relative border-2 border-white/20"
              style={{
                background: 'linear-gradient(to bottom, rgba(20,25,45,0.95), rgba(15,20,40,0.98))',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* HP Fill with GRADIENT & GLOW */}
              <div
                className="h-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{
                  width: `${hpPercent}%`,
                  background: hpPercent > 50
                    ? 'linear-gradient(90deg, #00ff88, #00cc66, #00aa55)'
                    : hpPercent > 25
                    ? 'linear-gradient(90deg, #ffdd00, #ffbb00, #ff9900)'
                    : 'linear-gradient(90deg, #ff4444, #cc0000, #aa0000)',
                  boxShadow: hpPercent > 50
                    ? '0 0 30px rgba(0, 255, 136, 0.8), inset 0 2px 8px rgba(255,255,255,0.4)'
                    : hpPercent > 25
                    ? '0 0 30px rgba(255, 221, 0, 0.8), inset 0 2px 8px rgba(255,255,255,0.4)'
                    : '0 0 30px rgba(255, 68, 68, 0.8), inset 0 2px 8px rgba(255,255,255,0.4)'
                }}
              >
                {/* Shimmer Effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ animation: 'shimmer 3s infinite' }}
                />
                {/* Pulsing Glow */}
                {hpPercent < 30 && (
                  <div
                    className="absolute inset-0 bg-red-500/30"
                    style={{ animation: 'pulse 1s ease-in-out infinite' }}
                  />
                )}
              </div>

              {/* HP Text INSIDE with CYBER FONT */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-white font-gaming font-black text-xl tracking-wider"
                  style={{
                    textShadow: '0 0 10px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8), 0 0 20px currentColor'
                  }}
                >
                  {displayHp} / {displayMaxHp}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid with NEON ICONS */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatIcon stat="strength" value={hero.stats.strength || 10} />
            <StatIcon stat="speed" value={hero.stats.speed || 10} />
            <StatIcon stat="durability" value={hero.stats.durability || 10} />
            <StatIcon stat="combat" value={hero.stats.combat || 10} />
          </div>

          {/* Abilities - 2x2 with GLOWING BORDERS */}
          <div className="grid grid-cols-2 gap-3">
            {hero.abilities.slice(0, 4).map((ability, idx) => {
              const abilityColors = ['#ff6b35', '#a855f7', '#ef4444', '#00d4ff'];
              const pwrValue = Math.floor(Math.random() * 40) + 60;

              return (
                <div
                  key={idx}
                  className="group relative bg-black/60 rounded-2xl p-3 min-h-[90px] flex flex-col justify-between transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    border: `2px solid ${abilityColors[idx]}40`,
                    boxShadow: `0 0 20px ${abilityColors[idx]}30, inset 0 0 20px ${abilityColors[idx]}10`,
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = abilityColors[idx];
                    e.currentTarget.style.boxShadow = `0 0 30px ${abilityColors[idx]}, inset 0 0 30px ${abilityColors[idx]}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${abilityColors[idx]}40`;
                    e.currentTarget.style.boxShadow = `0 0 20px ${abilityColors[idx]}30, inset 0 0 20px ${abilityColors[idx]}10`;
                  }}
                >
                  {/* Ability Name */}
                  <div className="text-xs font-stats font-bold text-gray-200 leading-tight">
                    {ability.length > 16 ? ability.substring(0, 16) + '...' : ability}
                  </div>

                  {/* PWR Badge - NEON */}
                  <div
                    className="text-2xl font-gaming font-black"
                    style={{
                      color: abilityColors[idx],
                      textShadow: `0 0 10px ${abilityColors[idx]}, 0 0 20px ${abilityColors[idx]}`
                    }}
                  >
                    {pwrValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen pb-24 relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0a0e1a, #050810)',
      }}
    >
      {/* CYBER NEON BACKGROUND - Radial Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Marvel Red Glow - Top Left */}
        <div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(231, 76, 60, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        {/* DC Blue Glow - Top Right */}
        <div
          className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(52, 152, 219, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        {/* Cyan Accent - Bottom */}
        <div
          className="absolute -bottom-1/2 left-1/4 w-3/4 h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
      </div>

      {/* Toast Message Overlay - NEON STYLE */}
      {toast && (
        <div
          className="fixed top-6 left-4 right-4 z-50 animate-slide-down"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          <div
            className="rounded-2xl p-5 shadow-2xl border-2 border-cyan-500/50"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.95), rgba(10, 15, 30, 0.98))',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.4), 0 8px 32px rgba(0,0,0,0.5), inset 0 0 40px rgba(0, 212, 255, 0.1)',
              minHeight: '90px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            {toast.icon && (
              <span
                className="text-6xl"
                style={{
                  filter: 'drop-shadow(0 0 20px currentColor)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                {toast.icon}
              </span>
            )}
            <div className="flex-1">
              <p className="text-white text-xl font-gaming font-bold">{toast.text}</p>
              {toast.damage && (
                <p
                  className="text-4xl font-black font-gaming mt-2"
                  style={{
                    color: '#ff6b35',
                    textShadow: '0 0 20px #ff6b35, 0 0 40px #ff6b35'
                  }}
                >
                  -{toast.damage} HP
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header - CYBER STYLE */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-gaming font-black mb-3 flex items-center justify-center gap-4">
            <Swords
              size={56}
              className="text-cyan-400"
              style={{
                filter: 'drop-shadow(0 0 20px #00d4ff) drop-shadow(0 0 40px #00d4ff)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
            <span
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              style={{
                textShadow: '0 0 40px rgba(0, 212, 255, 0.5)',
                animation: 'neon-pulse 3s ease-in-out infinite'
              }}
            >
              BATTLE ARENA
            </span>
            <Swords
              size={56}
              className="text-cyan-400"
              style={{
                filter: 'drop-shadow(0 0 20px #00d4ff) drop-shadow(0 0 40px #00d4ff)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          </h1>
          <p className="text-cyan-300 text-lg font-stats font-semibold tracking-wide">
            200 KÄMPFER • RPG-KAMPFSYSTEM • CYBER NEON
          </p>

          {/* Historie Button - NEON */}
          <button
            onClick={() => setShowLogModal(true)}
            className="mt-6 px-8 py-4 rounded-2xl text-lg font-gaming font-bold flex items-center gap-3 mx-auto transition-all active:scale-95 border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.8), rgba(10, 15, 30, 0.9))',
              backdropFilter: 'blur(10px)',
              borderColor: '#00d4ff40',
              color: '#00d4ff',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)',
              minHeight: '56px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00d4ff';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#00d4ff40';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)';
            }}
          >
            <History size={24} />
            KAMPFLOG ({battleLog.length})
          </button>
        </div>

        {/* Battle Arena - Desktop: Side by Side, Mobile: Vertical */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <FighterPanel
            hero={fighter1}
            hp={battleState?.hp1}
            maxHp={battleState?.maxHp1}
            position={1}
          />

          <FighterPanel
            hero={fighter2}
            hp={battleState?.hp2}
            maxHp={battleState?.maxHp2}
            position={2}
          />
        </div>

        {/* VS Divider - MASSIVE NEON */}
        <div className="flex flex-col items-center justify-center py-8 mb-10">
          <div
            className="text-9xl font-gaming font-black mb-4"
            style={{
              background: 'linear-gradient(180deg, #ffd700, #ff8c00, #ff6b35)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
              animation: 'neon-pulse 2s ease-in-out infinite, pulse 2s ease-in-out infinite',
              filter: 'drop-shadow(0 0 60px #ffd700) drop-shadow(0 0 90px #ff8c00)'
            }}
          >
            VS
          </div>
          {battleState && (
            <div
              className="text-2xl font-gaming font-black px-8 py-3 rounded-full border-2"
              style={{
                background: 'rgba(10, 15, 30, 0.9)',
                backdropFilter: 'blur(10px)',
                borderColor: '#ffd70040',
                color: '#ffd700',
                textShadow: '0 0 20px #ffd700',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1)'
              }}
            >
              RUNDE {battleState.round}
            </div>
          )}
        </div>

        {/* Action Buttons - CYBER GAMING STYLE */}
        <div className="max-w-2xl mx-auto space-y-4 mb-10">
          {(!battleState || !battleState.isActive) && fighter1 && fighter2 && (
            <button
              onClick={startBattle}
              className="w-full rounded-2xl font-gaming font-black text-3xl uppercase flex items-center justify-center gap-4 transition-all active:scale-95 border-2"
              style={{
                minHeight: '80px',
                background: 'linear-gradient(135deg, #00ff88, #00cc66, #00aa55)',
                color: '#000',
                borderColor: '#00ff88',
                boxShadow: '0 0 50px rgba(0, 255, 136, 0.6), 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.3)'
              }}
            >
              <Play size={40} fill="#000" />
              START!
            </button>
          )}

          {battleState?.isActive && !isAutoMode && (
            <button
              onClick={startAutoMode}
              className="w-full rounded-2xl font-gaming font-black text-3xl uppercase flex items-center justify-center gap-4 transition-all active:scale-95 border-2"
              style={{
                minHeight: '80px',
                background: 'linear-gradient(135deg, #a855f7, #9333ea, #7e22ce)',
                color: '#fff',
                borderColor: '#a855f7',
                boxShadow: '0 0 50px rgba(168, 85, 247, 0.6), 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.2)'
              }}
            >
              <Play size={40} fill="#fff" />
              AUTO
            </button>
          )}

          {/* Secondary Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={randomFighters}
              disabled={battleState?.isActive}
              className="rounded-2xl font-gaming font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-2 disabled:opacity-40"
              style={{
                minHeight: '64px',
                background: battleState?.isActive
                  ? 'linear-gradient(135deg, #4b5563, #374151)'
                  : 'linear-gradient(135deg, #00d4ff, #0099cc)',
                color: '#000',
                borderColor: battleState?.isActive ? '#4b5563' : '#00d4ff',
                boxShadow: battleState?.isActive
                  ? '0 4px 16px rgba(0,0,0,0.3)'
                  : '0 0 40px rgba(0, 212, 255, 0.5), inset 0 2px 6px rgba(255,255,255,0.3)'
              }}
            >
              <Shuffle size={28} />
              ZUFALL
            </button>

            <button
              onClick={clearFighters}
              className="rounded-2xl font-gaming font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-2"
              style={{
                minHeight: '64px',
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: '#fff',
                borderColor: '#6b7280',
                boxShadow: '0 0 30px rgba(107, 114, 128, 0.4), inset 0 2px 6px rgba(255,255,255,0.2)'
              }}
            >
              <RotateCcw size={28} />
              RESET
            </button>
          </div>
        </div>

        {/* Fighter Selection with Drawer */}
        <div className="relative">
          {/* Filter Drawer Button */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="w-full mb-4 px-6 py-4 rounded-2xl font-gaming font-bold text-xl flex items-center justify-between transition-all active:scale-95 border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.9), rgba(10, 15, 30, 0.95))',
              backdropFilter: 'blur(10px)',
              borderColor: showFilterDrawer ? '#00d4ff' : '#00d4ff40',
              color: '#00d4ff',
              boxShadow: showFilterDrawer
                ? '0 0 40px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.2)'
                : '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)'
            }}
          >
            <span>KÄMPFER WÄHLEN ({sortedHeroes.length})</span>
            <ChevronDown
              size={28}
              className={`transition-transform duration-300 ${showFilterDrawer ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Filter Drawer Content */}
          {showFilterDrawer && (
            <div
              className="rounded-2xl p-6 mb-4 border-2 overflow-hidden transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.95), rgba(10, 15, 30, 0.98))',
                backdropFilter: 'blur(20px)',
                borderColor: '#00d4ff40',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.1)',
                animation: 'slide-down 0.3s ease-out'
              }}
            >
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
            </div>
          )}

          {/* Hero Grid - CYBER CARDS */}
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
            <div className="flex gap-4 px-2">
              {sortedHeroes.slice(0, 30).map((hero) => {
                const isSelected = fighter1?.id === hero.id || fighter2?.id === hero.id;
                const tierBadge = hero.tier === 'Cosmic' ? 'C' : hero.tier.charAt(0);
                const tierColor = tierColors[hero.tier].bg;
                const universeColor = hero.universe === 'Marvel' ? '#e74c3c' : '#3498db';

                return (
                  <div
                    key={hero.id}
                    onClick={() => selectFighter(hero)}
                    className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0 ${
                      isSelected ? 'ring-4 ring-cyan-400' : ''
                    }`}
                    style={{
                      width: '130px',
                      minHeight: '170px',
                      background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.95), rgba(10, 15, 30, 0.98))',
                      backdropFilter: 'blur(10px)',
                      borderTop: `4px solid ${universeColor}`,
                      boxShadow: isSelected
                        ? `0 0 40px ${universeColor}, 0 12px 40px rgba(0,0,0,0.5)`
                        : `0 8px 24px rgba(0,0,0,0.4), 0 0 20px ${universeColor}30`,
                    }}
                  >
                    {/* Tier Badge - GLOWING */}
                    <div
                      className="absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-gaming font-black z-10 border-2"
                      style={{
                        background: tierColor,
                        color: tierColors[hero.tier].text,
                        borderColor: 'rgba(255,255,255,0.3)',
                        boxShadow: `0 0 20px ${tierColor}, 0 4px 12px rgba(0,0,0,0.4)`
                      }}
                    >
                      {tierBadge}
                    </div>

                    {/* Hero Class Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <HeroClassIcon heroClass={hero.heroClass} size="sm" />
                    </div>

                    {/* Hero Avatar */}
                    <div className="pt-12 pb-4 text-center">
                      <div
                        className="text-6xl mb-2"
                        style={{
                          filter: `drop-shadow(0 0 20px ${hero.color})`
                        }}
                      >
                        {hero.image}
                      </div>
                      <div className="text-xs font-stats font-bold text-white px-2 leading-tight mb-2">
                        {hero.name.length > 14 ? hero.name.substring(0, 14) + '...' : hero.name}
                      </div>

                      {/* Publisher Badge */}
                      <span
                        className={`text-xs font-gaming font-black px-3 py-1 rounded-lg ${
                          hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
                        }`}
                        style={{
                          boxShadow: hero.universe === 'Marvel'
                            ? '0 0 15px #e74c3c'
                            : '0 0 15px #3498db'
                        }}
                      >
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

      {/* Kampflog Modal - CYBER STYLE */}
      {showLogModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.98), rgba(10, 15, 30, 0.99))',
              backdropFilter: 'blur(30px)',
              borderColor: '#00d4ff60',
              boxShadow: '0 0 60px rgba(0, 212, 255, 0.4), 0 20px 80px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-4 pb-2 sm:hidden">
              <div className="w-16 h-2 bg-cyan-500/50 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-8 py-6 border-b border-cyan-500/30">
              <h2 className="text-4xl font-gaming font-black text-cyan-400 flex items-center gap-4">
                <History size={36} />
                KAMPFLOG
              </h2>
            </div>

            {/* Log Content */}
            <div
              ref={logRef}
              className="overflow-y-auto p-8 space-y-4"
              style={{ maxHeight: 'calc(85vh - 200px)' }}
            >
              {battleLog.length === 0 ? (
                <p className="text-cyan-400/60 text-center py-16 text-xl font-gaming">
                  NOCH KEINE KÄMPFE...
                </p>
              ) : (
                battleLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-6 py-5 rounded-2xl transition-all border-2 ${
                      entry.type === 'start'
                        ? 'bg-blue-900/40 text-blue-200 border-blue-400/50'
                        : entry.type === 'end'
                        ? 'bg-yellow-900/40 text-yellow-200 font-bold border-yellow-400/50'
                        : 'bg-slate-800/60 text-gray-300 border-red-500/40'
                    }`}
                    style={{
                      boxShadow: entry.type === 'end'
                        ? '0 0 30px rgba(250, 204, 21, 0.4)'
                        : '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-lg font-stats">{entry.text}</span>
                      {entry.damage && (
                        <span
                          className="font-gaming font-black text-2xl"
                          style={{
                            color: '#ff6b35',
                            textShadow: '0 0 20px #ff6b35'
                          }}
                        >
                          -{entry.damage}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <div className="px-8 py-6 border-t border-cyan-500/30">
              <button
                onClick={() => setShowLogModal(false)}
                className="w-full rounded-2xl font-gaming font-bold text-xl py-5 transition-all active:scale-95 border-2 flex items-center justify-center gap-3"
                style={{
                  background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                  borderColor: '#6b7280',
                  color: '#fff',
                  boxShadow: '0 0 30px rgba(107, 114, 128, 0.4)'
                }}
              >
                <X size={24} />
                SCHLIESSEN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -150%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -250%) scale(0.8);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 5px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.5);
          border-radius: 5px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
