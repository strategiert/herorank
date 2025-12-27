export interface HeroStats {
  strength: number;
  speed: number;
  durability: number;
  intelligence: number;
  combat: number;
}

export interface Hero {
  id: number;
  name: string;
  universe: 'Marvel' | 'DC';
  tier: 'Cosmic' | 'S' | 'A' | 'B' | 'C' | 'D';
  power: number;
  image: string;
  color: string;
  abilities: string[];
  description: string;
  reason: string;
  stats: HeroStats;
}

export interface BattleResult {
  winner: Hero;
  loser: Hero;
  verdict: string;
  score1: number;
  score2: number;
  rounds?: BattleRound[];
}

export interface BattleRound {
  roundNumber: number;
  attacker: Hero;
  defender: Hero;
  damage: number;
  description: string;
}

export type TierType = 'Cosmic' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierInfo {
  bg: string;
  text: string;
  glow: string;
  description: string;
}

export const tierColors: Record<TierType, Omit<TierInfo, 'description'>> = {
  Cosmic: { bg: "linear-gradient(135deg, #9400D3, #4B0082)", text: "#FFFFFF", glow: "#9400D3" },
  S: { bg: "linear-gradient(135deg, #FF0000, #FF6B6B)", text: "#FFFFFF", glow: "#FF0000" },
  A: { bg: "linear-gradient(135deg, #FF8C00, #FFA500)", text: "#000000", glow: "#FF8C00" },
  B: { bg: "linear-gradient(135deg, #FFD700, #FFEB3B)", text: "#000000", glow: "#FFD700" },
  C: { bg: "linear-gradient(135deg, #32CD32, #90EE90)", text: "#000000", glow: "#32CD32" },
  D: { bg: "linear-gradient(135deg, #808080, #A9A9A9)", text: "#FFFFFF", glow: "#808080" }
};

export const tierDescriptions: Record<TierType, string> = {
  Cosmic: "Omnipotent / Multiversal",
  S: "Planetar / Kosmisch",
  A: "Omega-Level",
  B: "Übermenschlich",
  C: "Menschlich+",
  D: "Straßenlevel"
};

// Tier order for sorting (Cosmic is highest)
export const tierOrder: Record<TierType, number> = {
  Cosmic: 0,
  S: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5
};

// ========== HERO CLASSIFICATION SYSTEM ==========

// Hero Class - automatisch berechnet aus Stats
export type HeroClass = 'Cosmic' | 'Tank' | 'Bruiser' | 'Speedster' | 'Controller' | 'Assassin' | 'Blaster';

export const heroClassInfo: Record<HeroClass, { label: string; icon: string; color: string; description: string }> = {
  Cosmic: { label: 'Cosmic', icon: '🌟', color: '#9400D3', description: 'Universelle Macht' },
  Tank: { label: 'Tank', icon: '🛡️', color: '#22C55E', description: 'Hohe Widerstandsfähigkeit' },
  Bruiser: { label: 'Bruiser', icon: '💪', color: '#EF4444', description: 'Stärke & Ausdauer' },
  Speedster: { label: 'Speedster', icon: '⚡', color: '#3B82F6', description: 'Blitzschnell' },
  Controller: { label: 'Controller', icon: '🧠', color: '#A855F7', description: 'Taktisches Genie' },
  Assassin: { label: 'Assassin', icon: '🗡️', color: '#6B7280', description: 'Tödliche Präzision' },
  Blaster: { label: 'Blaster', icon: '💥', color: '#F59E0B', description: 'Fernkampf-Spezialist' }
};

// Power Type - aus Abilities-Text extrahiert
export type PowerType = 'Physical' | 'Energy' | 'Magic' | 'Cosmic' | 'Tech' | 'Psionic' | 'Elemental' | 'Nature' | 'Mystic';

export const powerTypeInfo: Record<PowerType, { label: string; icon: string; color: string }> = {
  Physical: { label: 'Physisch', icon: '👊', color: '#EF4444' },
  Energy: { label: 'Energie', icon: '⚡', color: '#F59E0B' },
  Magic: { label: 'Magie', icon: '✨', color: '#A855F7' },
  Cosmic: { label: 'Kosmisch', icon: '🌌', color: '#9400D3' },
  Tech: { label: 'Tech', icon: '🔧', color: '#6B7280' },
  Psionic: { label: 'Psionisch', icon: '🧠', color: '#EC4899' },
  Elemental: { label: 'Elementar', icon: '🔥', color: '#F97316' },
  Nature: { label: 'Natur', icon: '🌿', color: '#22C55E' },
  Mystic: { label: 'Mystisch', icon: '😇', color: '#FFD700' }
};

// Stat Rank - Gesamtstärke
export type StatRank = 'Elite' | 'Champion' | 'Skilled' | 'Standard' | 'Rookie';

export const statRankInfo: Record<StatRank, { label: string; color: string; minAvg: number }> = {
  Elite: { label: 'Elite', color: '#FFD700', minAvg: 90 },
  Champion: { label: 'Champion', color: '#A855F7', minAvg: 70 },
  Skilled: { label: 'Skilled', color: '#3B82F6', minAvg: 50 },
  Standard: { label: 'Standard', color: '#22C55E', minAvg: 30 },
  Rookie: { label: 'Rookie', color: '#6B7280', minAvg: 0 }
};
