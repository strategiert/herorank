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

// Action types for turn-based combat
type ActionType = 'attack' | 'tactics' | 'defense' | 'ultimate';

interface BattleState {
  hp1: number;
  hp2: number;
  maxHp1: number;
  maxHp2: number;
  energy1: number; // 0-100, builds up for ultimate
  energy2: number;
  round: number;
  isActive: boolean;
  winner: Hero | null;
  waitingForPlayer: boolean; // True when player needs to choose action
  isDefending1: boolean; // Defense status for damage reduction
  isDefending2: boolean;
  coins: number; // Coins earned this battle
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
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [shake, setShake] = useState<1 | 2 | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);
  const [totalCoins, setTotalCoins] = useState(() => {
    const saved = localStorage.getItem('herorank_coins');
    return saved ? parseInt(saved, 10) : 0;
  });
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
    // NEW: Much simpler HP for faster battles (6-8 rounds)
    // Target: 100-200 HP range
    const effectiveDurability = hero.stats.durability || 10;
    const baseHP = 100 + Math.round(effectiveDurability * 1.2 + hero.power * 0.5);

    // Cap at 250 to ensure battles don't drag
    return Math.min(250, Math.max(100, baseHP));
  };

  // NEW DAMAGE FORMULA - Faster, more balanced battles
  const calculateDamage = (
    attacker: Hero,
    defender: Hero,
    actionType: ActionType,
    defenderIsDefending: boolean
  ): number => {
    let baseDamage = 0;

    switch (actionType) {
      case 'attack':
        // High damage, scales with strength
        baseDamage = (attacker.stats.strength || 50) * 0.4 + attacker.power * 0.15;
        break;
      case 'tactics':
        // Moderate damage, guaranteed hit
        baseDamage = (attacker.stats.intelligence || 50) * 0.3 + attacker.power * 0.12;
        break;
      case 'ultimate':
        // Massive damage! 3x attack damage
        baseDamage = ((attacker.stats.strength || 50) * 0.4 + attacker.power * 0.15) * 3;
        break;
      case 'defense':
        // No damage when defending
        return 0;
    }

    // Defender's durability reduces damage
    const defense = (defender.stats.durability || 50) * 0.15;
    let finalDamage = Math.max(10, baseDamage - defense);

    // Defense stance blocks 50% damage
    if (defenderIsDefending) {
      finalDamage *= 0.5;
    }

    // Minimum 10% of max HP damage to ensure battles end
    const minDamage = calculateHP(defender) * 0.1;
    return Math.round(Math.max(minDamage, finalDamage));
  };

  // OPPONENT AI - Simple but strategic
  const getOpponentAction = (opponentHP: number, maxHP: number, energy: number): ActionType => {
    const hpPercent = (opponentHP / maxHP) * 100;

    // Use ultimate if available
    if (energy >= 100) {
      return 'ultimate';
    }

    // Low HP? Defend more often
    if (hpPercent < 30 && Math.random() < 0.6) {
      return 'defense';
    }

    // Medium HP? Mixed strategy
    if (hpPercent < 60) {
      const rand = Math.random();
      if (rand < 0.4) return 'attack';
      if (rand < 0.7) return 'tactics';
      return 'defense';
    }

    // High HP? Aggressive
    const rand = Math.random();
    if (rand < 0.5) return 'attack';
    if (rand < 0.85) return 'tactics';
    return 'defense';
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
    setFloatingDamages([]);
    setToast(null);
    setShowVictoryScreen(false);
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
      energy1: 0,
      energy2: 0,
      round: 1,
      isActive: true,
      winner: null,
      waitingForPlayer: true,
      isDefending1: false,
      isDefending2: false,
      coins: 0,
    });

    setBattleLog([{
      text: `${fighter1.name} vs ${fighter2.name}! WÄHLE DEINE AKTION!`,
      type: 'start'
    }]);

    showToast(`${fighter1.name} vs ${fighter2.name}!`, undefined, '⚔️');
    setShowVictoryScreen(false);
  };

  // NEW TURN-BASED EXECUTION
  const executePlayerAction = (playerAction: ActionType) => {
    if (!fighter1 || !fighter2 || !battleState || !battleState.isActive || !battleState.waitingForPlayer) return;

    const newLog: BattleLogEntry[] = [];
    let newHp1 = battleState.hp1;
    let newHp2 = battleState.hp2;
    let newEnergy1 = battleState.energy1;
    let newEnergy2 = battleState.energy2;

    // Player action
    const actionNames = {
      attack: 'ANGRIFF',
      tactics: 'TAKTIK',
      defense: 'VERTEIDIGUNG',
      ultimate: 'ULTIMATE!'
    };

    const damage1 = calculateDamage(fighter1, fighter2, playerAction, battleState.isDefending2);

    if (playerAction === 'defense') {
      newLog.push({
        text: `${fighter1.name} geht in Verteidigung! (+50% Schutz)`,
        type: 'defense',
        actor: fighter1.name
      });
      showToast(`${fighter1.name} verteidigt!`, undefined, '🛡️');
    } else {
      newHp2 = Math.max(0, newHp2 - damage1);
      triggerShake(2);
      addFloatingDamage(damage1, 2, playerAction === 'ultimate');
      showToast(`${fighter1.name}: ${actionNames[playerAction]}!`, damage1, fighter1.image);

      newLog.push({
        text: `${fighter1.name} nutzt ${actionNames[playerAction]}! ${damage1} Schaden!`,
        type: playerAction === 'ultimate' ? 'special' : 'attack',
        damage: damage1,
        actor: fighter1.name
      });
    }

    // Build energy (except ultimate which consumes it)
    if (playerAction === 'ultimate') {
      newEnergy1 = 0;
    } else if (playerAction === 'tactics') {
      newEnergy1 = Math.min(100, newEnergy1 + 30);
    } else {
      newEnergy1 = Math.min(100, newEnergy1 + 20);
    }

    // Check if opponent defeated
    if (newHp2 <= 0) {
      const coinsEarned = 50;
      const newTotalCoins = totalCoins + coinsEarned;
      setTotalCoins(newTotalCoins);
      localStorage.setItem('herorank_coins', newTotalCoins.toString());

      setBattleState({
        ...battleState,
        hp1: newHp1,
        hp2: 0,
        energy1: newEnergy1,
        energy2: newEnergy2,
        isActive: false,
        winner: fighter1,
        waitingForPlayer: false,
        coins: coinsEarned,
      });
      setBattleLog(prev => [...prev, ...newLog, {
        text: `🏆 ${fighter1.name} GEWINNT! +${coinsEarned} Coins!`,
        type: 'end'
      }]);
      showToast(`🏆 ${fighter1.name} gewinnt!`, undefined, '🏆');
      setShowVictoryScreen(true);
      return;
    }

    // Opponent AI action (after delay)
    setTimeout(() => {
      const opponentAction = getOpponentAction(newHp2, battleState.maxHp2, newEnergy2);
      const damage2 = calculateDamage(fighter2, fighter1, opponentAction, playerAction === 'defense');

      if (opponentAction === 'defense') {
        newLog.push({
          text: `${fighter2.name} verteidigt!`,
          type: 'defense',
          actor: fighter2.name
        });
        showToast(`${fighter2.name} verteidigt!`, undefined, '🛡️');
      } else {
        newHp1 = Math.max(0, newHp1 - damage2);
        triggerShake(1);
        addFloatingDamage(damage2, 1, opponentAction === 'ultimate');
        showToast(`${fighter2.name}: ${actionNames[opponentAction]}!`, damage2, fighter2.image);

        newLog.push({
          text: `${fighter2.name} nutzt ${actionNames[opponentAction]}! ${damage2} Schaden!`,
          type: opponentAction === 'ultimate' ? 'special' : 'attack',
          damage: damage2,
          actor: fighter2.name
        });
      }

      // Build opponent energy
      if (opponentAction === 'ultimate') {
        newEnergy2 = 0;
      } else if (opponentAction === 'tactics') {
        newEnergy2 = Math.min(100, newEnergy2 + 30);
      } else {
        newEnergy2 = Math.min(100, newEnergy2 + 20);
      }

      // Check if player defeated
      if (newHp1 <= 0) {
        setBattleState({
          ...battleState,
          hp1: 0,
          hp2: newHp2,
          energy1: newEnergy1,
          energy2: newEnergy2,
          isActive: false,
          winner: fighter2,
          waitingForPlayer: false,
          coins: 0,
        });
        setBattleLog(prev => [...prev, ...newLog, {
          text: `${fighter2.name} gewinnt den Kampf!`,
          type: 'end'
        }]);
        showToast(`${fighter2.name} gewinnt!`, undefined, '💀');
        return;
      }

      // Continue battle
      setBattleState({
        ...battleState,
        hp1: newHp1,
        hp2: newHp2,
        energy1: newEnergy1,
        energy2: newEnergy2,
        round: battleState.round + 1,
        waitingForPlayer: true,
        isDefending1: playerAction === 'defense',
        isDefending2: opponentAction === 'defense',
      });
      setBattleLog(prev => [...prev, ...newLog]);
    }, 1000);

    // Temporarily disable player input
    setBattleState({
      ...battleState,
      waitingForPlayer: false,
    });
  };

  // Auto-mode removed - now using turn-based battle system

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

          {/* ENERGY BAR - NEW! */}
          {(battleState?.energy1 !== undefined && position === 1) || (battleState?.energy2 !== undefined && position === 2) ? (
            <div className="w-full mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-400 font-gaming text-sm uppercase tracking-wider">Energy</span>
                <span className="text-cyan-400 font-gaming text-sm font-bold">
                  {position === 1 ? battleState?.energy1 : battleState?.energy2}%
                </span>
              </div>
              <div className="h-4 rounded-full overflow-hidden relative border border-cyan-500/30"
                style={{
                  background: 'linear-gradient(to bottom, rgba(20,25,45,0.95), rgba(15,20,40,0.98))',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                }}
              >
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${position === 1 ? battleState?.energy1 : battleState?.energy2}%`,
                    background: 'linear-gradient(90deg, #00d4ff, #00a8cc, #0088aa)',
                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.8), inset 0 1px 4px rgba(255,255,255,0.3)'
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ animation: 'shimmer 2s infinite' }}
                  />
                </div>
              </div>
            </div>
          ) : null}

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

        {/* Action Buttons - NEW TURN-BASED RPG STYLE */}
        <div className="max-w-2xl mx-auto space-y-4 mb-10">
          {/* Coin Display */}
          <div className="text-center mb-4">
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 140, 0, 0.1))',
                backdropFilter: 'blur(10px)',
                borderColor: '#ffd70060',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1)'
              }}
            >
              <span className="text-3xl">💰</span>
              <span className="text-2xl font-gaming font-black text-yellow-400">
                {totalCoins} COINS
              </span>
            </div>
          </div>

          {/* START Button */}
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

          {/* TURN-BASED ACTION BUTTONS */}
          {battleState?.isActive && battleState?.waitingForPlayer && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <div className="text-2xl font-gaming font-black text-cyan-400 animate-pulse"
                  style={{
                    textShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff'
                  }}
                >
                  WÄHLE DEINE AKTION!
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* ATTACK Button */}
                <button
                  onClick={() => executePlayerAction('attack')}
                  className="rounded-2xl font-gaming font-black text-xl uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:scale-105 border-2"
                  style={{
                    minHeight: '90px',
                    background: 'linear-gradient(135deg, #ff6b35, #ff4500)',
                    color: '#fff',
                    borderColor: '#ff6b35',
                    boxShadow: '0 0 40px rgba(255, 107, 53, 0.6), inset 0 2px 6px rgba(255,255,255,0.2)'
                  }}
                >
                  <Zap size={32} fill="#fff" />
                  <span>ANGRIFF</span>
                  <span className="text-sm font-stats">Hoher Schaden</span>
                </button>

                {/* TACTICS Button */}
                <button
                  onClick={() => executePlayerAction('tactics')}
                  className="rounded-2xl font-gaming font-black text-xl uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:scale-105 border-2"
                  style={{
                    minHeight: '90px',
                    background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                    color: '#fff',
                    borderColor: '#a855f7',
                    boxShadow: '0 0 40px rgba(168, 85, 247, 0.6), inset 0 2px 6px rgba(255,255,255,0.2)'
                  }}
                >
                  <Brain size={32} />
                  <span>TAKTIK</span>
                  <span className="text-sm font-stats">+Energy</span>
                </button>

                {/* DEFENSE Button */}
                <button
                  onClick={() => executePlayerAction('defense')}
                  className="rounded-2xl font-gaming font-black text-xl uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:scale-105 border-2"
                  style={{
                    minHeight: '90px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff',
                    borderColor: '#22c55e',
                    boxShadow: '0 0 40px rgba(34, 197, 94, 0.6), inset 0 2px 6px rgba(255,255,255,0.2)'
                  }}
                >
                  <Shield size={32} />
                  <span>VERTEIDIGUNG</span>
                  <span className="text-sm font-stats">-50% Schaden</span>
                </button>

                {/* ULTIMATE Button */}
                <button
                  onClick={() => executePlayerAction('ultimate')}
                  disabled={!battleState?.energy1 || battleState.energy1 < 100}
                  className="rounded-2xl font-gaming font-black text-xl uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:scale-110 border-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  style={{
                    minHeight: '90px',
                    background: battleState?.energy1 >= 100
                      ? 'linear-gradient(135deg, #ffd700, #ff8c00, #ff6b35)'
                      : 'linear-gradient(135deg, #4b5563, #374151)',
                    color: '#fff',
                    borderColor: battleState?.energy1 >= 100 ? '#ffd700' : '#4b5563',
                    boxShadow: battleState?.energy1 >= 100
                      ? '0 0 60px rgba(255, 215, 0, 0.9), inset 0 2px 8px rgba(255,255,255,0.3), 0 0 90px rgba(255, 140, 0, 0.6)'
                      : '0 4px 16px rgba(0,0,0,0.3)',
                    animation: battleState?.energy1 >= 100 ? 'pulse 1s ease-in-out infinite' : 'none'
                  }}
                >
                  <Swords size={32} fill={battleState?.energy1 >= 100 ? '#fff' : undefined} />
                  <span>ULTIMATE!</span>
                  <span className="text-sm font-stats">
                    {battleState?.energy1 >= 100 ? 'BEREIT!' : `${battleState?.energy1}/100`}
                  </span>
                </button>
              </div>
            </div>
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

      {/* VICTORY SCREEN - NEW! */}
      {showVictoryScreen && battleState?.winner && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-6"
          onClick={() => setShowVictoryScreen(false)}
        >
          <div
            className="rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-4 animate-float"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 20, 40, 0.98), rgba(10, 15, 30, 0.99))',
              backdropFilter: 'blur(30px)',
              borderColor: battleState.winner.id === fighter1?.id ? '#00ff88' : '#ff4444',
              boxShadow: battleState.winner.id === fighter1?.id
                ? '0 0 100px rgba(0, 255, 136, 0.8), 0 20px 80px rgba(0,0,0,0.6)'
                : '0 0 100px rgba(255, 68, 68, 0.8), 0 20px 80px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-10 text-center border-b border-white/10">
              <div
                className="text-8xl font-gaming font-black mb-6"
                style={{
                  background: battleState.winner.id === fighter1?.id
                    ? 'linear-gradient(180deg, #00ff88, #00cc66)'
                    : 'linear-gradient(180deg, #ff4444, #cc0000)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
                  animation: 'neon-pulse 2s ease-in-out infinite'
                }}
              >
                {battleState.winner.id === fighter1?.id ? 'VICTORY!' : 'DEFEAT...'}
              </div>

              {/* Winner Display */}
              <div
                className="text-7xl mb-4"
                style={{
                  filter: `drop-shadow(0 10px 40px ${battleState.winner.color})`,
                  animation: 'float 3s ease-in-out infinite'
                }}
              >
                {battleState.winner.image}
              </div>

              <h2
                className="text-5xl font-hero mb-4 uppercase"
                style={{
                  color: battleState.winner.universe === 'Marvel' ? '#e74c3c' : '#3498db',
                  textShadow: `0 0 20px ${battleState.winner.universe === 'Marvel' ? '#e74c3c' : '#3498db'}`
                }}
              >
                {battleState.winner.name}
              </h2>

              <div className="text-2xl font-gaming text-cyan-400">
                RUNDE {battleState.round}
              </div>
            </div>

            {/* Rewards */}
            {battleState.winner.id === fighter1?.id && (
              <div className="px-8 py-8 bg-black/40">
                <div className="text-center mb-6">
                  <div className="text-3xl font-gaming font-black text-yellow-400 mb-4"
                    style={{
                      textShadow: '0 0 30px #ffd700, 0 0 60px #ffd700',
                      animation: 'neon-pulse 2s ease-in-out infinite'
                    }}
                  >
                    BELOHNUNGEN
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 mb-6">
                  <div
                    className="flex items-center gap-4 px-8 py-5 rounded-2xl border-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.15))',
                      borderColor: '#ffd700',
                      boxShadow: '0 0 40px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.1)'
                    }}
                  >
                    <span className="text-6xl">💰</span>
                    <div>
                      <div className="text-5xl font-gaming font-black text-yellow-400">
                        +{battleState.coins}
                      </div>
                      <div className="text-lg font-stats text-yellow-300">COINS</div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-cyan-300 font-gaming text-xl">
                  Gesamt: {totalCoins} Coins
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="px-8 py-6">
              <button
                onClick={() => {
                  setShowVictoryScreen(false);
                  clearFighters();
                }}
                className="w-full rounded-2xl font-gaming font-black text-2xl py-6 transition-all active:scale-95 hover:scale-105 border-2"
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                  borderColor: '#00d4ff',
                  color: '#000',
                  boxShadow: '0 0 50px rgba(0, 212, 255, 0.6), inset 0 2px 8px rgba(255,255,255,0.3)'
                }}
              >
                WEITER
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
