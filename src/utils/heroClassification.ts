import type { Hero, HeroClass, PowerType, StatRank } from '../types/hero';

// Keywords für Power-Type Erkennung (deutsche + englische Begriffe)
const powerTypeKeywords: Record<PowerType, string[]> = {
  Physical: ['Superstärke', 'Kampfkunst', 'Meisterkämpfer', 'Training', 'Martial', 'Stärke', 'Nahkampf', 'Kraft'],
  Energy: ['Energieprojektion', 'Strahlen', 'Laser', 'Energie', 'Licht', 'Plasma', 'Hitze'],
  Magic: ['Magie', 'Zauber', 'mystisch', 'Hexerei', 'Zauberei', 'Arkan', 'Beschwörung'],
  Cosmic: ['Kosmisch', 'Realitätskontrolle', 'Omnipotenz', 'Multiversum', 'Universum', 'Allwissen', 'Göttliche Macht'],
  Tech: ['Ausrüstung', 'Gadgets', 'Technologie', 'Rüstung', 'Tech', 'Cyborg', 'Roboter', 'Mechanisch'],
  Psionic: ['Telepathie', 'Telekinese', 'Gedankenkontrolle', 'mental', 'psychisch', 'Gedanken', 'Psionik'],
  Elemental: ['Feuer', 'Eis', 'Wetter', 'Blitz', 'Wasser', 'Erde', 'Wind', 'Elektrizität', 'Frost'],
  Nature: ['Tier', 'Verwandlung', 'Formwandel', 'wild', 'Natur', 'Bestie', 'Instinkt', 'Animal'],
  Mystic: ['Göttlich', 'Dämonisch', 'Unsterblichkeit', 'Engel', 'Gott', 'Heilig', 'Übernatürlich', 'Jenseitig']
};

/**
 * Berechnet die Hero-Klasse basierend auf den Stats
 */
export function calculateHeroClass(hero: Hero): HeroClass {
  const stats = hero.stats;

  // Null-Check für Stats
  if (!stats || stats.strength == null || stats.speed == null) {
    return 'Blaster'; // Default
  }

  const { strength, speed, durability, intelligence, combat } = stats;
  const avg = (strength + speed + durability + intelligence + combat) / 5;

  // Cosmic: Cosmic Tier oder sehr hohe Gesamtwerte
  if (hero.tier === 'Cosmic' || avg >= 90) {
    return 'Cosmic';
  }

  // Speedster: Speed dominiert deutlich (+20 über Durchschnitt)
  if (speed >= avg + 20 && speed >= 70) {
    return 'Speedster';
  }

  // Tank: Durability dominiert und ist höher als Strength
  if (durability >= avg + 15 && durability >= 70 && durability > strength) {
    return 'Tank';
  }

  // Bruiser: Strength + Durability beide hoch
  if (strength >= 70 && durability >= 60 && strength >= durability) {
    return 'Bruiser';
  }

  // Assassin: Combat/Speed hoch, Durability niedrig
  if (combat >= 70 && speed >= 60 && durability < 50) {
    return 'Assassin';
  }

  // Controller: Intelligence dominiert
  if (intelligence >= avg + 15 && intelligence >= 70) {
    return 'Controller';
  }

  // Blaster: Default für alle anderen
  return 'Blaster';
}

/**
 * Ermittelt die Power-Types basierend auf den Abilities
 */
export function calculatePowerTypes(hero: Hero): PowerType[] {
  const types: PowerType[] = [];
  const abilitiesText = hero.abilities.join(' ').toLowerCase();

  for (const [type, keywords] of Object.entries(powerTypeKeywords)) {
    for (const keyword of keywords) {
      if (abilitiesText.includes(keyword.toLowerCase())) {
        types.push(type as PowerType);
        break; // Nur einmal pro Type
      }
    }
  }

  // Falls keine erkannt, basierend auf dominantem Stat
  if (types.length === 0) {
    const stats = hero.stats;
    if (stats.strength >= 70) {
      types.push('Physical');
    } else if (stats.intelligence >= 70) {
      types.push('Psionic');
    } else {
      types.push('Physical'); // Default
    }
  }

  return types;
}

/**
 * Berechnet den Stat-Rang basierend auf Durchschnitts-Stats
 */
export function calculateStatRank(hero: Hero): StatRank {
  const stats = hero.stats;

  if (!stats || stats.strength == null) {
    return 'Standard';
  }

  const values = Object.values(stats).filter((v): v is number => v != null);
  const avgStat = values.reduce((a, b) => a + b, 0) / values.length;

  if (avgStat >= 90) return 'Elite';
  if (avgStat >= 70) return 'Champion';
  if (avgStat >= 50) return 'Skilled';
  if (avgStat >= 30) return 'Standard';
  return 'Rookie';
}

/**
 * Berechnet den Durchschnitt aller Stats
 */
export function calculateAverageStats(hero: Hero): number {
  const stats = hero.stats;
  if (!stats) return 0;

  const values = Object.values(stats).filter((v): v is number => v != null);
  if (values.length === 0) return 0;

  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// Erweiterter Hero-Typ mit berechneten Kategorien
export interface EnrichedHero extends Hero {
  heroClass: HeroClass;
  powerTypes: PowerType[];
  statRank: StatRank;
  avgStats: number;
}

/**
 * Reichert einen Helden mit berechneten Kategorien an
 */
export function enrichHero(hero: Hero): EnrichedHero {
  return {
    ...hero,
    heroClass: calculateHeroClass(hero),
    powerTypes: calculatePowerTypes(hero),
    statRank: calculateStatRank(hero),
    avgStats: calculateAverageStats(hero),
  };
}

/**
 * Reichert ein Array von Helden an
 */
export function enrichHeroes(heroes: Hero[]): EnrichedHero[] {
  return heroes.map(enrichHero);
}
