const fs = require('fs');
const path = require('path');

// Load Marvel data from Excel conversion
const marvelRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/marvel-raw.json')));

// Load power corrections
const powerCorrections = JSON.parse(fs.readFileSync(path.join(__dirname, 'corrections/power-corrections.json')));

// Load manual descriptions
const manualDescriptions = JSON.parse(fs.readFileSync(path.join(__dirname, 'corrections/descriptions.json')));

// Get manual description if available
function getManualDescription(name, universe) {
  const universeDescs = manualDescriptions[universe];
  if (universeDescs && universeDescs[name]) {
    return universeDescs[name];
  }
  return null;
}

// Helper function to find correction for a hero
function findCorrection(name, universe) {
  const corrections = powerCorrections.corrections[universe];
  if (!corrections) return null;

  // Check all tier categories
  const tiers = ['Cosmic', 'S', 'A', 'B', 'C', 'D', 'downgrade'];
  for (const tier of tiers) {
    if (corrections[tier] && corrections[tier][name]) {
      const correction = corrections[tier][name];
      // If tier is specified in correction, use it; otherwise use the category key
      return {
        ...correction,
        tier: correction.tier || (tier === 'downgrade' ? correction.tier : tier)
      };
    }
  }
  return null;
}

// Calculate power from stats if not corrected
function calculatePower(stats) {
  const { strength, speed, durability, intelligence, combat } = stats;
  return Math.round(
    strength * 0.25 +
    speed * 0.15 +
    durability * 0.25 +
    intelligence * 0.15 +
    combat * 0.2
  );
}

// Determine tier from power if not specified
// Note: Only use Cosmic tier for explicitly corrected heroes
function determineTier(power) {
  if (power >= 90) return 'S';
  if (power >= 75) return 'A';
  if (power >= 55) return 'B';
  if (power >= 40) return 'C';
  return 'D';
}

// Check if stats are suspiciously all maxed out (data quality issue)
function hasMaxedStats(stats) {
  return stats.strength === 100 && stats.speed === 100 &&
         stats.durability === 100 && stats.intelligence === 100 &&
         stats.combat === 100;
}

// Assign default stats for heroes with broken data
function getDefaultStats(race) {
  const raceDefaults = {
    'human': { strength: 30, speed: 30, durability: 30, intelligence: 50, combat: 50 },
    'mutant': { strength: 50, speed: 45, durability: 50, intelligence: 55, combat: 60 },
    'inhuman': { strength: 55, speed: 50, durability: 55, intelligence: 50, combat: 55 },
    'asgardian': { strength: 75, speed: 60, durability: 80, intelligence: 60, combat: 75 },
    'eternal': { strength: 70, speed: 65, durability: 75, intelligence: 70, combat: 65 },
    'demon': { strength: 65, speed: 50, durability: 70, intelligence: 55, combat: 60 },
    'vampire': { strength: 55, speed: 50, durability: 60, intelligence: 50, combat: 60 },
    'alien': { strength: 55, speed: 50, durability: 55, intelligence: 55, combat: 50 },
    'robot': { strength: 60, speed: 45, durability: 70, intelligence: 60, combat: 50 },
    'symbiote': { strength: 65, speed: 55, durability: 60, intelligence: 40, combat: 65 },
    'god': { strength: 80, speed: 70, durability: 85, intelligence: 70, combat: 75 }
  };

  const raceLower = race.toLowerCase();
  for (const [key, defaults] of Object.entries(raceDefaults)) {
    if (raceLower.includes(key)) {
      return defaults;
    }
  }
  // Default for unknown races
  return { strength: 45, speed: 40, durability: 45, intelligence: 45, combat: 45 };
}

// Ability templates based on race/type
const abilityTemplates = {
  'mutant': ['Mutantenkraft', 'Genetische Besonderheit', 'X-Gen'],
  'human': ['Menschliche Fähigkeiten', 'Training', 'Ausrüstung'],
  'asgardian': ['Göttliche Kraft', 'Langlebigkeit', 'Asgardische Magie'],
  'kree': ['Kree-Physiologie', 'Übermenschliche Stärke', 'Kampftraining'],
  'skrull': ['Formwandlung', 'Infiltration', 'Skrull-Technologie'],
  'inhuman': ['Terrigenese', 'Inhuman-Kraft', 'Genetische Mutation'],
  'eternal': ['Kosmische Energie', 'Unsterblichkeit', 'Molekularmanipulation'],
  'deviant': ['Deviant-Mutation', 'Monströse Kraft', 'Genetische Instabilität'],
  'god': ['Göttliche Macht', 'Unsterblichkeit', 'Realitätskontrolle'],
  'demon': ['Höllische Kräfte', 'Dämonische Magie', 'Seelenmanipulation'],
  'vampire': ['Vampirstärke', 'Regeneration', 'Hypnose', 'Unsterblichkeit'],
  'robot': ['Mechanische Stärke', 'Computerintelligenz', 'Waffensysteme'],
  'android': ['Synthetische Kraft', 'KI', 'Anpassungsfähigkeit'],
  'synthezoid': ['Dichtemanipulation', 'Energieprojektion', 'Flug'],
  'cyborg': ['Kybernetische Verbesserungen', 'Waffenintegration', 'Enhanced Senses'],
  'alien': ['Außerirdische Physiologie', 'Fremde Technologie'],
  'construct': ['Konstruierte Existenz', 'Energiebasiert'],
  'abstract': ['Kosmisches Wesen', 'Realitätsmanipulation', 'Omnipräsenz'],
  'symbiote': ['Symbiotenbindung', 'Formwandlung', 'Organische Waffen'],
  'clone': ['Genetische Replikation', 'Übernommene Kräfte']
};

// Description template variations for unique descriptions
const descriptionVariations = {
  'Cosmic': [
    (name, race) => `${name} ist eine omnipotente kosmische Entität. Als ${race} existiert dieses Wesen jenseits der normalen Realität und besitzt nahezu unbegrenzte Macht.`,
    (name, race) => `${name} verkörpert kosmische Macht in ihrer reinsten Form. Diese ${race}-Entität beeinflusst das Schicksal ganzer Universen.`,
    (name, race) => `Als ${race} transzendiert ${name} die Grenzen der Sterblichkeit. Kosmische Energien fließen durch dieses allmächtige Wesen.`,
    (name, race) => `${name} steht an der Spitze der kosmischen Hierarchie. Die Macht dieser ${race}-Entität reicht über alle bekannten Dimensionen.`,
  ],
  'S': [
    (name, race) => `${name} ist einer der mächtigsten Wesen des Universums. Als ${race} besitzt er/sie nahezu gottgleiche Kräfte.`,
    (name, race) => `Die Macht von ${name} ist legendär. Dieser ${race} kann ganze Zivilisationen retten oder zerstören.`,
    (name, race) => `${name} gehört zur absoluten Elite der Überwesen. Als ${race} sind seine/ihre Fähigkeiten weltbewegend.`,
    (name, race) => `Wenige können es mit ${name} aufnehmen. Diese ${race}-Macht erstreckt sich über planetare Grenzen hinaus.`,
  ],
  'A': [
    (name, race) => `${name} gehört zu den stärksten Helden/Schurken. Als ${race} verfügt er/sie über außergewöhnliche Fähigkeiten.`,
    (name, race) => `Die Fähigkeiten von ${name} sind beeindruckend. Dieser ${race} hat sich als mächtiger Verbündeter oder Feind erwiesen.`,
    (name, race) => `${name} zählt zu den gefährlichsten Kämpfern. Als ${race} ist er/sie ein Gegner, den man nicht unterschätzen sollte.`,
    (name, race) => `Mit überragenden Kräften macht ${name} sich einen Namen. Dieser ${race} hat in zahllosen Schlachten seine Stärke bewiesen.`,
  ],
  'B': [
    (name, race) => `${name} ist ein bedeutender Charakter mit übermenschlichen Kräften. Als ${race} ist er/sie ein formidabler Kämpfer.`,
    (name, race) => `${name} hat sich einen Namen als fähiger Held/Schurke gemacht. Dieser ${race} ist in seiner Liga gefürchtet und respektiert.`,
    (name, race) => `Die Fähigkeiten von ${name} übertreffen die normaler Menschen deutlich. Als ${race} stellt er/sie eine ernste Bedrohung dar.`,
    (name, race) => `${name} operiert auf übermenschlichem Niveau. Dieser ${race} ist ein Gegner, mit dem zu rechnen ist.`,
  ],
  'C': [
    (name, race) => `${name} ist ein fähiger Held/Schurke mit besonderen Fähigkeiten. Als ${race} hat er/sie seinen/ihren Platz im Universum.`,
    (name, race) => `${name} verfügt über Fähigkeiten, die ihn/sie von normalen Menschen abheben. Dieser ${race} ist ein kompetenter Kämpfer.`,
    (name, race) => `Mit speziellen Kräften ausgestattet, ist ${name} mehr als ein gewöhnlicher Gegner. Als ${race} meistert er/sie seinen Bereich.`,
    (name, race) => `${name} nutzt seine besonderen Fähigkeiten effektiv. Dieser ${race} hat sich in vielen Situationen bewährt.`,
  ],
  'D': [
    (name, race) => `${name} kämpft auf Straßenebene mit besonderen Fähigkeiten. Als ${race} ist er/sie in seinem Bereich effektiv.`,
    (name, race) => `Trotz begrenzter Kräfte macht ${name} das Beste aus seinen Fähigkeiten. Dieser ${race} ist nicht zu unterschätzen.`,
    (name, race) => `${name} operiert im Straßenlevel-Bereich. Als ${race} hat er/sie einen Platz im größeren Geschehen.`,
    (name, race) => `${name} mag keine kosmischen Kräfte haben, ist aber in seinem Element gefährlich. Dieser ${race} kennt seine Stärken.`,
  ]
};

// Get description with variation
function getDescription(name, race, tier, abilities, power, universe) {
  // First check for manual description
  const manual = getManualDescription(name, universe);
  if (manual) {
    return manual;
  }

  // Use variations based on name hash for consistency
  const variations = descriptionVariations[tier] || descriptionVariations['C'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const idx = hash % variations.length;

  return variations[idx](name, race);
}

// Keep old templates for backward compatibility
const descriptionTemplates = {
  'Cosmic': (name, race) => descriptionVariations['Cosmic'][0](name, race),
  'S': (name, race) => descriptionVariations['S'][0](name, race),
  'A': (name, race) => descriptionVariations['A'][0](name, race),
  'B': (name, race) => descriptionVariations['B'][0](name, race),
  'C': (name, race) => descriptionVariations['C'][0](name, race),
  'D': (name, race) => descriptionVariations['D'][0](name, race)
};

// Reason templates
const reasonTemplates = {
  'Cosmic': 'Omnipotente Entität mit Macht über Realität und Existenz selbst.',
  'S': 'Kosmische oder gottgleiche Kräfte, die das Universum beeinflussen können.',
  'A': 'Omega-Level Fähigkeiten mit erheblichem Zerstörungspotential.',
  'B': 'Übermenschliche Kräfte, die weit über normale Menschen hinausgehen.',
  'C': 'Verbesserte Fähigkeiten oder spezielle Kräfte auf mittlerem Niveau.',
  'D': 'Menschliche Spitzenleistung oder begrenzte übermenschliche Fähigkeiten.'
};

// Process Marvel heroes
function processMarvelHeroes() {
  return marvelRaw.map((hero, idx) => {
    const race = (hero.race || 'Unknown').toLowerCase();

    // Check for power corrections
    const correction = findCorrection(hero.name, 'Marvel');

    // Find matching ability template
    let abilities = ['Spezielle Fähigkeiten'];
    for (const [key, abs] of Object.entries(abilityTemplates)) {
      if (race.includes(key)) {
        abilities = [...abs];
        break;
      }
    }

    // Add energy projection if high
    if (hero.energyProjection >= 50) {
      abilities.push('Energieprojektion');
    }
    if (hero.stats.strength >= 80) {
      abilities.push('Superstärke');
    }
    if (hero.stats.speed >= 80) {
      abilities.push('Supergeschwindigkeit');
    }
    if (hero.stats.durability >= 80) {
      abilities.push('Unverwundbarkeit');
    }
    if (hero.stats.intelligence >= 80) {
      abilities.push('Genius-Intellekt');
    }
    if (hero.stats.combat >= 80) {
      abilities.push('Meisterkämpfer');
    }

    // Limit abilities
    abilities = [...new Set(abilities)].slice(0, 6);

    // Apply corrections or calculate from stats
    let finalPower, finalTier, finalReason;
    let finalStats = hero.stats;

    if (correction) {
      // Use correction values
      finalPower = correction.power;
      finalTier = correction.tier;
      finalReason = correction.reason;
    } else {
      // Check for broken data (all stats at 100)
      if (hasMaxedStats(hero.stats)) {
        // Use race-based defaults for broken data
        finalStats = getDefaultStats(hero.race || 'Unknown');
      }
      // Calculate power from stats and determine tier
      finalPower = calculatePower(finalStats);
      finalTier = determineTier(finalPower);
      finalReason = reasonTemplates[finalTier];
    }

    return {
      id: idx + 1,
      name: hero.name,
      universe: 'Marvel',
      tier: finalTier,
      power: finalPower,
      image: hero.image,
      color: hero.color,
      abilities: abilities,
      description: getDescription(hero.name, hero.race || 'Unknown', finalTier, abilities, finalPower, 'Marvel'),
      reason: finalReason,
      stats: finalStats
    };
  });
}

// DC Heroes - Extended list (manually created since no Excel data)
const dcHeroesBase = [
  // S-TIER
  { name: "Superman", image: "🦸", color: "#0066CC", tier: "S", power: 100,
    abilities: ["Superstärke", "Flug", "Hitzeblick", "Unverwundbarkeit", "Supergeschwindigkeit", "Eisatem"],
    description: "Der Mann aus Stahl, Kal-El von Krypton. Symbol der Hoffnung.",
    reason: "Nahezu unbegrenzte Kraft durch gelbe Sonne, kann Planeten bewegen.",
    stats: { strength: 100, speed: 95, durability: 98, intelligence: 75, combat: 70 }},
  { name: "Dr. Manhattan", image: "🔵", color: "#00BFFF", tier: "S", power: 100,
    abilities: ["Realitätsmanipulation", "Unsterblichkeit", "Allwissenheit", "Materie-Kontrolle"],
    description: "Gottgleiches Wesen mit absoluter Kontrolle über Materie.",
    reason: "Existiert außerhalb der Zeit und ist praktisch allmächtig.",
    stats: { strength: 100, speed: 100, durability: 100, intelligence: 100, combat: 50 }},
  { name: "Darkseid", image: "👿", color: "#4A0E0E", tier: "S", power: 98,
    abilities: ["Omega-Strahlen", "Unsterblichkeit", "Superstärke", "Telepathie"],
    description: "Der tyrannische Herrscher von Apokolips.",
    reason: "Seine Omega-Strahlen können alles zerstören.",
    stats: { strength: 98, speed: 70, durability: 99, intelligence: 95, combat: 85 }},
  { name: "Spectre", image: "👻", color: "#2E8B57", tier: "S", power: 99,
    abilities: ["Göttliche Macht", "Realitätsverzerrung", "Unsterblichkeit"],
    description: "Der Geist der Vergeltung, Gottes Zorn.",
    reason: "Verkörpert Gottes Zorn mit unbegrenzter Macht.",
    stats: { strength: 100, speed: 90, durability: 100, intelligence: 90, combat: 70 }},
  { name: "Anti-Monitor", image: "💀", color: "#1a1a1a", tier: "S", power: 100,
    abilities: ["Antimaterie-Kontrolle", "Universenzerstörung", "Kosmische Macht"],
    description: "Zerstörer unzähliger Universen in der Crisis.",
    reason: "Kann ganze Universen vernichten.",
    stats: { strength: 100, speed: 85, durability: 100, intelligence: 95, combat: 60 }},
  { name: "Trigon", image: "😈", color: "#8B0000", tier: "S", power: 97,
    abilities: ["Dämonische Allmacht", "Dimensionskontrolle", "Realitätsmanipulation"],
    description: "Interdimensionaler Dämon und Ravens Vater.",
    reason: "Herrscht über ganze Dimensionen.",
    stats: { strength: 98, speed: 80, durability: 98, intelligence: 90, combat: 75 }},
  { name: "Parallax", image: "💛", color: "#FFD700", tier: "S", power: 96,
    abilities: ["Furcht-Manipulation", "Realitätsverzerrung", "Possession"],
    description: "Die Entität der Furcht, gebunden an die gelben Ringe.",
    reason: "Eine der emotionalen Entitäten des DC-Universums.",
    stats: { strength: 95, speed: 90, durability: 95, intelligence: 80, combat: 70 }},
  { name: "Nekron", image: "💀", color: "#000000", tier: "S", power: 98,
    abilities: ["Todeskontrolle", "Untoten-Armee", "Unsterblichkeit"],
    description: "Die Verkörperung des Todes und Leere.",
    reason: "Herrscht über das Reich der Toten.",
    stats: { strength: 95, speed: 75, durability: 100, intelligence: 85, combat: 70 }},
  { name: "Imperiex", image: "🌌", color: "#800080", tier: "S", power: 99,
    abilities: ["Urknall-Energie", "Universale Zerstörung", "Kosmische Macht"],
    description: "Manifestation der Urknall-Energie.",
    reason: "Wollte das Universum zerstören und neu erschaffen.",
    stats: { strength: 100, speed: 90, durability: 100, intelligence: 90, combat: 65 }},
  { name: "Mister Mxyzptlk", image: "🎭", color: "#FF69B4", tier: "S", power: 95,
    abilities: ["5D-Manipulation", "Realitätsverzerrung", "Omnipotenz"],
    description: "Kobold aus der 5. Dimension mit Allmacht.",
    reason: "Kann Realität nach Belieben verformen.",
    stats: { strength: 80, speed: 100, durability: 100, intelligence: 85, combat: 30 }},
  { name: "Wally West", image: "⚡", color: "#FFD700", tier: "S", power: 93,
    abilities: ["Speed Force Master", "Zeitreisen", "Dimensionsreisen"],
    description: "Der schnellste Flash aller Zeiten.",
    reason: "Hat die Speed Force gemeistert wie kein anderer.",
    stats: { strength: 50, speed: 100, durability: 60, intelligence: 75, combat: 75 }},

  // A-TIER
  { name: "Wonder Woman", image: "👸", color: "#DC143C", tier: "A", power: 88,
    abilities: ["Amazonen-Stärke", "Lasso der Wahrheit", "Kampfkunst", "Flug"],
    description: "Diana von Themyscira, Prinzessin der Amazonen.",
    reason: "Göttliche Abstammung und Jahrtausende Kampferfahrung.",
    stats: { strength: 88, speed: 85, durability: 85, intelligence: 80, combat: 98 }},
  { name: "Flash (Barry Allen)", image: "⚡", color: "#FF0000", tier: "A", power: 90,
    abilities: ["Speed Force", "Zeitreisen", "Phasen durch Materie"],
    description: "Der schnellste Mann der Welt.",
    reason: "Kann schneller als das Licht laufen.",
    stats: { strength: 50, speed: 100, durability: 60, intelligence: 85, combat: 70 }},
  { name: "Martian Manhunter", image: "👽", color: "#006400", tier: "A", power: 89,
    abilities: ["Telepathie", "Formwandlung", "Superstärke", "Phasen"],
    description: "J'onn J'onzz, der letzte Mars-Überlebende.",
    reason: "Hat Supermans Kräfte plus Telepathie.",
    stats: { strength: 92, speed: 85, durability: 85, intelligence: 90, combat: 80 }},
  { name: "Green Lantern (Hal Jordan)", image: "💚", color: "#00FF00", tier: "A", power: 87,
    abilities: ["Power Ring", "Lichtkonstrukte", "Willenskraft"],
    description: "Das furchtloseste Mitglied des GL Corps.",
    reason: "Der Ring kann alles erschaffen.",
    stats: { strength: 80, speed: 85, durability: 75, intelligence: 75, combat: 80 }},
  { name: "Shazam", image: "⚡", color: "#FFD700", tier: "A", power: 91,
    abilities: ["Götterkräfte", "Blitze", "Weisheit Salomos"],
    description: "Billy Batson, Champion der Götter.",
    reason: "Kombiniert die Kräfte von sechs Göttern.",
    stats: { strength: 95, speed: 90, durability: 90, intelligence: 70, combat: 75 }},
  { name: "Supergirl", image: "💫", color: "#0066CC", tier: "A", power: 86,
    abilities: ["Kryptonische Kräfte", "Hitzeblick", "Flug"],
    description: "Kara Zor-El, Supermans Cousine.",
    reason: "Volle kryptonische Kräfte.",
    stats: { strength: 92, speed: 90, durability: 90, intelligence: 75, combat: 70 }},
  { name: "Doctor Fate", image: "🎭", color: "#FFD700", tier: "A", power: 90,
    abilities: ["Ordnungsmagie", "Helm von Nabu", "Realitätsmanipulation"],
    description: "Träger des Helms von Nabu.",
    reason: "Nahezu unbegrenzte magische Macht.",
    stats: { strength: 50, speed: 70, durability: 80, intelligence: 90, combat: 75 }},
  { name: "Swamp Thing", image: "🌿", color: "#228B22", tier: "A", power: 88,
    abilities: ["Pflanzen-Elementar", "Das Grün", "Regeneration"],
    description: "Avatar des Grün.",
    reason: "Kann überall erscheinen wo Pflanzen wachsen.",
    stats: { strength: 90, speed: 40, durability: 95, intelligence: 75, combat: 60 }},
  { name: "Black Adam", image: "⚡", color: "#000000", tier: "A", power: 91,
    abilities: ["Ägyptische Götterkräfte", "Unsterblichkeit", "Blitze"],
    description: "Der erste Champion der Götter.",
    reason: "Shazams Kräfte mit Jahrtausenden Erfahrung.",
    stats: { strength: 95, speed: 88, durability: 92, intelligence: 75, combat: 90 }},
  { name: "Orion", image: "🔥", color: "#FF4500", tier: "A", power: 87,
    abilities: ["Neue Götter Kraft", "Astro-Force", "Mother Box"],
    description: "Sohn von Darkseid, Krieger von New Genesis.",
    reason: "Einer der mächtigsten Neuen Götter.",
    stats: { strength: 90, speed: 80, durability: 88, intelligence: 70, combat: 90 }},
  { name: "Big Barda", image: "💪", color: "#FF1493", tier: "A", power: 85,
    abilities: ["Neue Götter Kraft", "Mega-Rod", "Kampftraining"],
    description: "Ehemalige Führerin der Female Furies.",
    reason: "Eine der stärksten Kriegerinnen.",
    stats: { strength: 88, speed: 75, durability: 85, intelligence: 70, combat: 95 }},
  { name: "Etrigan", image: "😈", color: "#FF4500", tier: "A", power: 84,
    abilities: ["Höllenfeuer", "Dämonenstärke", "Magie"],
    description: "Dämon gebunden an Jason Blood.",
    reason: "Mächtige dämonische Kräfte.",
    stats: { strength: 85, speed: 70, durability: 88, intelligence: 75, combat: 80 }},

  // B-TIER
  { name: "Batman", image: "🦇", color: "#2F4F4F", tier: "B", power: 72,
    abilities: ["Kampfkunst", "Gadgets", "Detektivfähigkeiten", "Taktik"],
    description: "Bruce Wayne, der Dunkle Ritter.",
    reason: "Mit Vorbereitung kann er jeden besiegen.",
    stats: { strength: 35, speed: 40, durability: 40, intelligence: 100, combat: 100 }},
  { name: "Aquaman", image: "🔱", color: "#20B2AA", tier: "B", power: 78,
    abilities: ["Unterwasseratmung", "Superstärke", "Marine Telepathie"],
    description: "Arthur Curry, König von Atlantis.",
    reason: "Unter Wasser praktisch unbesiegbar.",
    stats: { strength: 85, speed: 70, durability: 80, intelligence: 70, combat: 80 }},
  { name: "Cyborg", image: "🤖", color: "#4682B4", tier: "B", power: 76,
    abilities: ["Technopathie", "Boom Tubes", "Superstärke"],
    description: "Victor Stone, halb Mensch halb Maschine.",
    reason: "Zugang zu Mutter-Boxen und Technologie.",
    stats: { strength: 80, speed: 60, durability: 85, intelligence: 90, combat: 75 }},
  { name: "Zatanna", image: "🎩", color: "#9400D3", tier: "B", power: 80,
    abilities: ["Rückwärts-Zauber", "Realitätsverzerrung", "Teleportation"],
    description: "Die mächtigste Bühnenmagierin.",
    reason: "Ihre Magie ist sehr real.",
    stats: { strength: 25, speed: 40, durability: 35, intelligence: 85, combat: 60 }},
  { name: "Raven", image: "🖤", color: "#4B0082", tier: "B", power: 82,
    abilities: ["Dunkle Magie", "Empathie", "Dämonenkräfte"],
    description: "Tochter des Dämons Trigon.",
    reason: "Kann Dimensionen beeinflussen.",
    stats: { strength: 40, speed: 60, durability: 60, intelligence: 80, combat: 65 }},
  { name: "Starfire", image: "🌸", color: "#FF6347", tier: "B", power: 79,
    abilities: ["Sternenbolzen", "Flug", "Superstärke"],
    description: "Koriand'r, Prinzessin von Tamaran.",
    reason: "Absorbiert UV-Strahlung für Energie.",
    stats: { strength: 80, speed: 85, durability: 75, intelligence: 60, combat: 80 }},
  { name: "Nightwing", image: "🌙", color: "#1E90FF", tier: "B", power: 65,
    abilities: ["Akrobatik", "Kampfkunst", "Escrima-Stöcke"],
    description: "Dick Grayson, der erste Robin.",
    reason: "Bester Kämpfer der Bat-Familie.",
    stats: { strength: 35, speed: 45, durability: 40, intelligence: 85, combat: 95 }},
  { name: "Power Girl", image: "💪", color: "#FFFFFF", tier: "B", power: 84,
    abilities: ["Kryptonische Kräfte", "Superstärke", "Hitzeblick"],
    description: "Kara Zor-L von Erde-2.",
    reason: "Volle kryptonische Kräfte.",
    stats: { strength: 92, speed: 88, durability: 90, intelligence: 70, combat: 75 }},
  { name: "Firestorm", image: "🔥", color: "#FF4500", tier: "B", power: 82,
    abilities: ["Nuklearmann", "Materie-Transmutation", "Energiestrahlen"],
    description: "Fusion zweier Menschen.",
    reason: "Kann Materie auf molekularer Ebene umwandeln.",
    stats: { strength: 70, speed: 75, durability: 80, intelligence: 80, combat: 65 }},
  { name: "Hawkman", image: "🦅", color: "#FFD700", tier: "B", power: 72,
    abilities: ["Nth-Metal-Flügel", "Reinkarnation", "Kampferfahrung"],
    description: "Reinkarnierter ägyptischer Prinz.",
    reason: "Tausende Leben Kampferfahrung.",
    stats: { strength: 70, speed: 70, durability: 75, intelligence: 70, combat: 90 }},
  { name: "Hawkgirl", image: "🦅", color: "#228B22", tier: "B", power: 70,
    abilities: ["Nth-Metal-Flügel", "Streitkeule", "Reinkarnation"],
    description: "Partnerin von Hawkman.",
    reason: "Gleiche Fähigkeiten wie Hawkman.",
    stats: { strength: 65, speed: 70, durability: 70, intelligence: 70, combat: 88 }},
  { name: "Black Canary", image: "🐦", color: "#000000", tier: "B", power: 70,
    abilities: ["Canary Cry", "Kampfkunst", "Akrobatik"],
    description: "Dinah Lance, Meisterkämpferin.",
    reason: "Ihr Schrei kann Gebäude zerstören.",
    stats: { strength: 40, speed: 50, durability: 45, intelligence: 70, combat: 95 }},

  // C-TIER
  { name: "Green Arrow", image: "🏹", color: "#228B22", tier: "C", power: 58,
    abilities: ["Meisterschütze", "Trick-Pfeile", "Kampfkunst"],
    description: "Oliver Queen, Milliardär und Bogenschütze.",
    reason: "Bester Bogenschütze der DC-Welt.",
    stats: { strength: 35, speed: 40, durability: 35, intelligence: 75, combat: 85 }},
  { name: "Red Hood", image: "🎭", color: "#FF0000", tier: "C", power: 62,
    abilities: ["Kampfkunst", "Marksmanship", "All-Caste Training"],
    description: "Jason Todd, der zweite Robin.",
    reason: "Von Batman und Assassinen trainiert.",
    stats: { strength: 35, speed: 40, durability: 40, intelligence: 80, combat: 90 }},
  { name: "Beast Boy", image: "🦁", color: "#228B22", tier: "C", power: 68,
    abilities: ["Tierverwandlung", "DNA-Gedächtnis"],
    description: "Garfield Logan, kann sich in jedes Tier verwandeln.",
    reason: "Unendliche Vielseitigkeit.",
    stats: { strength: 70, speed: 70, durability: 60, intelligence: 55, combat: 65 }},
  { name: "Blue Beetle (Jaime)", image: "🪲", color: "#0000FF", tier: "C", power: 72,
    abilities: ["Alien-Rüstung", "Waffen", "Flug"],
    description: "Teenager mit Scarab-Rüstung.",
    reason: "Die Rüstung kann sich anpassen.",
    stats: { strength: 75, speed: 70, durability: 80, intelligence: 65, combat: 70 }},
  { name: "Constantine", image: "🚬", color: "#8B4513", tier: "C", power: 65,
    abilities: ["Okkultismus", "Dämonenverhandlung", "Magie"],
    description: "John Constantine, zynischer Magier.",
    reason: "Besiegt durch List statt rohe Macht.",
    stats: { strength: 20, speed: 25, durability: 30, intelligence: 95, combat: 40 }},
  { name: "Vixen", image: "🦊", color: "#FF8C00", tier: "C", power: 68,
    abilities: ["Tantu-Totem", "Tierkräfte"],
    description: "Mari McCabe channelt Tierkräfte.",
    reason: "Kann alle Tierfähigkeiten kombinieren.",
    stats: { strength: 70, speed: 75, durability: 60, intelligence: 65, combat: 75 }},
  { name: "Static", image: "⚡", color: "#9932CC", tier: "C", power: 68,
    abilities: ["Elektrokinese", "Magnetismus", "Flug"],
    description: "Virgil Hawkins, elektrischer Teenager.",
    reason: "Kann Elektrizität kontrollieren.",
    stats: { strength: 40, speed: 70, durability: 50, intelligence: 80, combat: 65 }},
  { name: "Booster Gold", image: "⭐", color: "#FFD700", tier: "C", power: 65,
    abilities: ["Zukunftstechnologie", "Kraftfeld", "Zeitreisen"],
    description: "Michael Jon Carter aus dem 25. Jahrhundert.",
    reason: "Geheimer Beschützer der Zeitlinie.",
    stats: { strength: 60, speed: 65, durability: 70, intelligence: 70, combat: 60 }},
  { name: "Atom (Ray Palmer)", image: "🔬", color: "#FF0000", tier: "C", power: 62,
    abilities: ["Größenschrumpfung", "Massenkontrolle"],
    description: "Wissenschaftler mit Schrumpfkraft.",
    reason: "Kann in Gehirne eindringen.",
    stats: { strength: 35, speed: 50, durability: 30, intelligence: 95, combat: 60 }},

  // D-TIER
  { name: "Robin (Damian)", image: "🐦", color: "#FF0000", tier: "D", power: 52,
    abilities: ["Kampfkunst", "Assassinen-Training", "Katana"],
    description: "Sohn von Batman und Talia.",
    reason: "Tödlichster Robin, aber noch Kind.",
    stats: { strength: 25, speed: 35, durability: 30, intelligence: 80, combat: 90 }},
  { name: "Batgirl (Barbara)", image: "🦇", color: "#800080", tier: "D", power: 55,
    abilities: ["Kampfkunst", "Hacking", "Gadgets"],
    description: "Tochter von Commissioner Gordon.",
    reason: "Genius-level Hackerin.",
    stats: { strength: 30, speed: 35, durability: 30, intelligence: 95, combat: 85 }},
  { name: "Catwoman", image: "🐱", color: "#000000", tier: "D", power: 50,
    abilities: ["Akrobatik", "Diebstahl", "Peitsche"],
    description: "Selina Kyle, Meisterdiebin.",
    reason: "Keine Superkräfte, aber sehr geschickt.",
    stats: { strength: 25, speed: 40, durability: 30, intelligence: 75, combat: 80 }},
  { name: "Huntress", image: "🏹", color: "#800080", tier: "D", power: 54,
    abilities: ["Armbrust", "Kampfkunst", "Taktik"],
    description: "Helena Bertinelli, Rächerin.",
    reason: "Menschlich aber tödlich.",
    stats: { strength: 30, speed: 38, durability: 35, intelligence: 75, combat: 88 }},
  { name: "Red Robin", image: "🐦", color: "#DC143C", tier: "D", power: 56,
    abilities: ["Kampfkunst", "Detektivarbeit", "Gadgets"],
    description: "Tim Drake, dritter Robin.",
    reason: "Der klügste Robin.",
    stats: { strength: 28, speed: 38, durability: 32, intelligence: 92, combat: 85 }},
];

// Generate more DC heroes to reach ~500+
function generateMoreDCHeroes() {
  const additionalDC = [];
  let idCounter = dcHeroesBase.length + 1;

  // Expanded DC characters list - including villains, more heroes, and supporting characters
  const moreDCCharacters = [
    // ========== S-TIER ==========
    { name: "The Presence", tier: "S", power: 100, image: "✨", abilities: ["Omnipotenz", "Allwissenheit", "Allgegenwart"] },
    { name: "Lucifer Morningstar", tier: "S", power: 99, image: "😈", abilities: ["Schöpfungskraft", "Realitätsmanipulation", "Unsterblichkeit"] },
    { name: "Michael Demiurgos", tier: "S", power: 99, image: "👼", abilities: ["Göttliche Macht", "Unsterblichkeit", "Energiekontrolle"] },
    { name: "The Endless (Dream)", tier: "S", power: 95, image: "💭", abilities: ["Traumkontrolle", "Unsterblichkeit", "Realitätsmanipulation"] },
    { name: "The Endless (Death)", tier: "S", power: 95, image: "💀", abilities: ["Todeskontrolle", "Unsterblichkeit", "Omnipräsenz"] },
    { name: "The Endless (Destiny)", tier: "S", power: 94, image: "📖", abilities: ["Schicksalskontrolle", "Allwissenheit", "Buch des Schicksals"] },
    { name: "The Endless (Destruction)", tier: "S", power: 93, image: "💥", abilities: ["Zerstörungskraft", "Unsterblichkeit", "Kosmische Macht"] },
    { name: "The Endless (Desire)", tier: "S", power: 92, image: "💋", abilities: ["Verführung", "Manipulation", "Unsterblichkeit"] },
    { name: "The Endless (Despair)", tier: "S", power: 91, image: "😢", abilities: ["Hoffnungslosigkeit", "Spiegelreisen", "Unsterblichkeit"] },
    { name: "The Endless (Delirium)", tier: "S", power: 90, image: "🌀", abilities: ["Wahnsinn", "Realitätsverzerrung", "Unsterblichkeit"] },
    { name: "Superboy-Prime", tier: "S", power: 98, image: "🦸", abilities: ["Kryptonische Kräfte", "Realitätspunching", "Superstärke"] },
    { name: "Monarch", tier: "S", power: 94, image: "👑", abilities: ["Quantenmanipulation", "Zeitreisen", "Superstärke"] },
    { name: "Ion (Kyle Rayner)", tier: "S", power: 96, image: "💚", abilities: ["Ion-Entität", "Realitätsmanipulation", "Willenskraft"] },
    { name: "Black Flash", tier: "S", power: 92, image: "💀", abilities: ["Speed Force Avatar", "Todeskraft", "Unausweichlich"] },
    { name: "Perpetua", tier: "S", power: 99, image: "🌌", abilities: ["Multiversum-Schöpfung", "Kosmische Macht", "Unsterblichkeit"] },
    { name: "The World Forger", tier: "S", power: 97, image: "🔨", abilities: ["Universums-Schmied", "Realitätskontrolle", "Kosmische Macht"] },
    { name: "Barbatos", tier: "S", power: 96, image: "🦇", abilities: ["Dark Multiverse", "Unsterblichkeit", "Korruption"] },
    { name: "The Batman Who Laughs", tier: "S", power: 92, image: "😈", abilities: ["Batmans Intellekt", "Jokers Wahnsinn", "Dark Metal"] },
    { name: "Eclipso", tier: "S", power: 93, image: "🌑", abilities: ["Schwarze Diamant", "Körperbesitz", "Dunkle Macht"] },
    { name: "Mordru", tier: "S", power: 91, image: "🧙", abilities: ["Chaos-Magie", "Unsterblichkeit", "Realitätsverzerrung"] },

    // ========== A-TIER ==========
    { name: "John Stewart", tier: "A", power: 86, image: "💚", abilities: ["Power Ring", "Architekt-Verstand", "Willenskraft"] },
    { name: "Guy Gardner", tier: "A", power: 85, image: "💚", abilities: ["Power Ring", "Willenskraft", "Rote Ring-Wut"] },
    { name: "Jessica Cruz", tier: "A", power: 84, image: "💚", abilities: ["Power Ring", "Überwindung von Furcht", "Willenskraft"] },
    { name: "Simon Baz", tier: "A", power: 84, image: "💚", abilities: ["Power Ring", "Emerald Sight", "Willenskraft"] },
    { name: "Sinestro", tier: "A", power: 88, image: "💛", abilities: ["Gelber Ring", "Furcht-Induktion", "Willenskraft"] },
    { name: "Atrocitus", tier: "A", power: 86, image: "🔴", abilities: ["Roter Ring", "Blut-Magie", "Unsterbliche Wut"] },
    { name: "Larfleeze", tier: "A", power: 87, image: "🧡", abilities: ["Orangener Ring", "Habgier-Kontrolle", "Konstrukt-Armee"] },
    { name: "Saint Walker", tier: "A", power: 83, image: "💙", abilities: ["Blauer Ring", "Hoffnung", "Heilung"] },
    { name: "Indigo-1", tier: "A", power: 82, image: "💜", abilities: ["Indigo Ring", "Mitgefühl", "Power-Kopie"] },
    { name: "Star Sapphire", tier: "A", power: 83, image: "💜", abilities: ["Violetter Ring", "Liebe", "Kristallisierung"] },
    { name: "Captain Atom", tier: "A", power: 89, image: "⚛️", abilities: ["Quantenkräfte", "Energieprojektion", "Molekularmanipulation"] },
    { name: "Firehawk", tier: "A", power: 80, image: "🔥", abilities: ["Nuklearkräfte", "Energieprojektion", "Flug"] },
    { name: "Zauriel", tier: "A", power: 85, image: "👼", abilities: ["Engelsflügel", "Flammenschwert", "Göttliche Magie"] },
    { name: "Phantom Stranger", tier: "A", power: 86, image: "🎭", abilities: ["Mystische Macht", "Unsterblichkeit", "Teleportation"] },
    { name: "Deadman", tier: "A", power: 75, image: "👻", abilities: ["Geistform", "Körperbesitz", "Unsichtbarkeit"] },
    { name: "Mera", tier: "A", power: 82, image: "🌊", abilities: ["Hydrokinese", "Superstärke", "Atlantische Magie"] },
    { name: "Ocean Master", tier: "A", power: 81, image: "🔱", abilities: ["Atlantische Kräfte", "Trident-Magie", "Hydrokinese"] },
    { name: "Black Manta", tier: "A", power: 78, image: "🦈", abilities: ["Kampfanzug", "Laser", "Tieftaucher"] },
    { name: "Killer Frost", tier: "A", power: 79, image: "❄️", abilities: ["Kryokinese", "Wärmeabsorption", "Eiskonstrukte"] },
    { name: "Circe", tier: "A", power: 85, image: "🧙", abilities: ["Göttermagie", "Verwandlung", "Unsterblichkeit"] },
    { name: "Doomsday", tier: "A", power: 92, image: "💀", abilities: ["Anpassung", "Superstärke", "Regeneration", "Unsterblichkeit"] },
    { name: "Mongul", tier: "A", power: 88, image: "👹", abilities: ["Superstärke", "Kampfkunst", "Warworld-Herrscher"] },
    { name: "Despero", tier: "A", power: 89, image: "👁️", abilities: ["Telepathie", "Superstärke", "Drittes Auge"] },
    { name: "Braniac", tier: "A", power: 90, image: "🤖", abilities: ["12-Level-Intellekt", "Miniaturisierung", "Android-Kräfte"] },
    { name: "General Zod", tier: "A", power: 88, image: "⚔️", abilities: ["Kryptonische Kräfte", "Militärtaktik", "Hitzeblick"] },
    { name: "Faora", tier: "A", power: 86, image: "⚔️", abilities: ["Kryptonische Kräfte", "Kampfkunst", "Superspeed"] },
    { name: "Non", tier: "A", power: 85, image: "💪", abilities: ["Kryptonische Kräfte", "Superstärke", "Flug"] },
    { name: "Bizarro", tier: "A", power: 84, image: "🤪", abilities: ["Umgekehrte Kräfte", "Eisblick", "Feueratem"] },
    { name: "Cyborg Superman", tier: "A", power: 88, image: "🤖", abilities: ["Kryptonische Kräfte", "Technopathie", "Regeneration"] },
    { name: "Grundy", tier: "A", power: 80, image: "🧟", abilities: ["Untot", "Superstärke", "Regeneration"] },
    { name: "Lobo", tier: "A", power: 87, image: "🏍️", abilities: ["Czarnian-Physiologie", "Regeneration", "Superstärke"] },
    { name: "Amazo", tier: "A", power: 91, image: "🤖", abilities: ["Power-Kopie", "Alle JL-Kräfte", "Android"] },
    { name: "Ares (DC)", tier: "A", power: 86, image: "⚔️", abilities: ["Kriegsgott", "Unsterblichkeit", "Stärke durch Konflikt"] },
    { name: "Cheetah", tier: "A", power: 82, image: "🐆", abilities: ["Götter-Geschenk", "Superspeed", "Krallen"] },
    { name: "Steppenwolf", tier: "A", power: 85, image: "🪓", abilities: ["Neue Götter Kraft", "Elektro-Axt", "Paradämon-Anführer"] },
    { name: "Granny Goodness", tier: "A", power: 80, image: "👵", abilities: ["Neue Götter Kraft", "Folter-Expertise", "Furies-Führung"] },
    { name: "Kalibak", tier: "A", power: 83, image: "👹", abilities: ["Neue Götter Kraft", "Beta-Club", "Kampfwut"] },

    // ========== B-TIER ==========
    { name: "Donna Troy", tier: "B", power: 80, image: "⭐", abilities: ["Amazonen-Stärke", "Flug", "Lasso"] },
    { name: "Cassie Sandsmark", tier: "B", power: 78, image: "⭐", abilities: ["Zeus-Segen", "Superstärke", "Flug"] },
    { name: "Blue Beetle (Ted Kord)", tier: "B", power: 62, image: "🪲", abilities: ["Gadgets", "Kampfkunst", "Genius"] },
    { name: "Metamorpho", tier: "B", power: 75, image: "🌈", abilities: ["Element-Wandlung", "Formwandlung", "Chemische Macht"] },
    { name: "Plastic Man", tier: "B", power: 76, image: "🔴", abilities: ["Elastizität", "Formwandlung", "Unsterblichkeit"] },
    { name: "Ralph Dibny", tier: "B", power: 65, image: "🟠", abilities: ["Elastizität", "Detektivarbeit", "Gingold"] },
    { name: "Animal Man", tier: "B", power: 75, image: "🦁", abilities: ["Tierkräfte", "The Red", "Morphogenetisches Feld"] },
    { name: "Atom Smasher", tier: "B", power: 74, image: "💪", abilities: ["Größenwachstum", "Superstärke", "Invulnerabilität"] },
    { name: "Damage (Grant)", tier: "B", power: 76, image: "💥", abilities: ["Explosionskraft", "Superstärke", "Unverwundbarkeit"] },
    { name: "Hourman", tier: "B", power: 70, image: "⏰", abilities: ["Miraclo-Kraft", "Superstärke", "Zeitbegrenzt"] },
    { name: "Wildcat", tier: "B", power: 58, image: "🐱", abilities: ["Boxer", "Neun Leben", "Kampfkunst"] },
    { name: "Jay Garrick", tier: "B", power: 75, image: "⚡", abilities: ["Speed Force", "Superspeed", "Erfahrung"] },
    { name: "Alan Scott", tier: "B", power: 78, image: "💚", abilities: ["Starheart", "Lichtkonstrukte", "Magie"] },
    { name: "Doctor Mid-Nite", tier: "B", power: 60, image: "🌙", abilities: ["Nachtsicht", "Blackout-Bomben", "Medizin"] },
    { name: "Mr. Terrific", tier: "B", power: 65, image: "🎯", abilities: ["T-Spheres", "Genius", "Olympia-Athlet"] },
    { name: "Stargirl", tier: "B", power: 72, image: "⭐", abilities: ["Kosmischer Stab", "Kosmischer Gürtel", "Energie"] },
    { name: "S.T.R.I.P.E.", tier: "B", power: 68, image: "🤖", abilities: ["Mech-Anzug", "Waffen", "Flug"] },
    { name: "Cyclone", tier: "B", power: 70, image: "🌪️", abilities: ["Aerokinese", "Flug", "Windkontrolle"] },
    { name: "Jesse Quick", tier: "B", power: 76, image: "⚡", abilities: ["Speed Force", "Flug", "Stärke-Formel"] },
    { name: "Max Mercury", tier: "B", power: 74, image: "⚡", abilities: ["Speed Force", "Zen", "Speedster-Mentor"] },
    { name: "Kid Flash (Wally)", tier: "B", power: 78, image: "⚡", abilities: ["Speed Force", "Superspeed", "Potential"] },
    { name: "Impulse (Bart)", tier: "B", power: 76, image: "⚡", abilities: ["Speed Force", "Superspeed", "Zukunftswissen"] },
    { name: "XS", tier: "B", power: 74, image: "⚡", abilities: ["Speed Force", "Legion", "Zukunft"] },
    { name: "Steel", tier: "B", power: 72, image: "🔨", abilities: ["Rüstung", "Hammer", "Genius"] },
    { name: "Natasha Irons", tier: "B", power: 70, image: "🔨", abilities: ["Rüstung", "Technologie", "Flug"] },
    { name: "Icon", tier: "B", power: 82, image: "⚡", abilities: ["Außerirdische Kräfte", "Superstärke", "Flug"] },
    { name: "Rocket (DC)", tier: "B", power: 70, image: "🚀", abilities: ["Inertia-Gürtel", "Kinetische Absorption", "Flug"] },
    { name: "Hardware", tier: "B", power: 72, image: "🤖", abilities: ["Rüstung", "Waffen", "Genius"] },
    { name: "Joker", tier: "B", power: 68, image: "🃏", abilities: ["Wahnsinn", "Chemie", "Unberechenbarkeit"] },
    { name: "Lex Luthor", tier: "B", power: 75, image: "👨‍🦲", abilities: ["Genius-Intellekt", "Warsuit", "Ressourcen"] },
    { name: "Bane", tier: "B", power: 72, image: "💪", abilities: ["Venom", "Superstärke", "Taktik"] },
    { name: "Deathstroke", tier: "B", power: 78, image: "🗡️", abilities: ["Supersoldat", "Taktik", "Regeneration"] },
    { name: "Ra's al Ghul", tier: "B", power: 70, image: "⚔️", abilities: ["Lazarus Pit", "Kampfkunst", "Unsterblichkeit"] },
    { name: "Talia al Ghul", tier: "B", power: 65, image: "⚔️", abilities: ["Kampfkunst", "Assassine", "League-Führung"] },
    { name: "Lady Shiva", tier: "B", power: 68, image: "🥋", abilities: ["Beste Kämpferin", "Leopard Blow", "Assassine"] },
    { name: "Bronze Tiger", tier: "B", power: 65, image: "🐅", abilities: ["Kampfkunst", "Klauen", "League-Training"] },
    { name: "Deadshot", tier: "B", power: 62, image: "🎯", abilities: ["Perfekter Schütze", "Waffen", "Söldner"] },
    { name: "Captain Cold", tier: "B", power: 65, image: "❄️", abilities: ["Cold Gun", "Absolute Zero", "Rogues-Anführer"] },
    { name: "Heat Wave", tier: "B", power: 60, image: "🔥", abilities: ["Heat Gun", "Pyromanie", "Rogues"] },
    { name: "Mirror Master", tier: "B", power: 68, image: "🪞", abilities: ["Spiegel-Dimension", "Teleportation", "Illusion"] },
    { name: "Weather Wizard", tier: "B", power: 72, image: "🌩️", abilities: ["Wetterkontrolle", "Blitze", "Stürme"] },
    { name: "Trickster", tier: "B", power: 55, image: "🎪", abilities: ["Gadgets", "Akrobatik", "Tricks"] },
    { name: "Golden Glider", tier: "B", power: 58, image: "⛸️", abilities: ["Eisschlittschuhe", "Juwelen-Waffen", "Akrobatik"] },
    { name: "Gorilla Grodd", tier: "B", power: 80, image: "🦍", abilities: ["Telepathie", "Superstärke", "Genius"] },
    { name: "Reverse Flash", tier: "B", power: 88, image: "⚡", abilities: ["Negative Speed Force", "Zeitreisen", "Obsession"] },
    { name: "Zoom (Hunter)", tier: "B", power: 85, image: "⚡", abilities: ["Zeitmanipulation", "Scheingeschwindigkeit", "Trauma"] },
    { name: "Godspeed", tier: "B", power: 82, image: "⚡", abilities: ["Speed Force", "Klon-Erstellung", "Blitzabsorption"] },
    { name: "Black Flash", tier: "B", power: 88, image: "💀", abilities: ["Speed Force Tod", "Unausweichlich", "Schnitter"] },
    { name: "Poison Ivy", tier: "B", power: 72, image: "🌿", abilities: ["Pflanzenkontrolle", "Pheromone", "Toxine"] },
    { name: "Harley Quinn", tier: "B", power: 58, image: "🃏", abilities: ["Akrobatik", "Hammer", "Unberechenbar"] },
    { name: "Scarecrow", tier: "B", power: 60, image: "🎃", abilities: ["Furchtgas", "Psychologie", "Manipulation"] },
    { name: "Two-Face", tier: "B", power: 55, image: "🪙", abilities: ["Taktik", "Waffen", "Münze"] },
    { name: "Penguin", tier: "B", power: 50, image: "🐧", abilities: ["Gadgets", "Kriminalität", "Ressourcen"] },
    { name: "Riddler", tier: "B", power: 55, image: "❓", abilities: ["Genius", "Rätsel", "Hacking"] },
    { name: "Mr. Freeze", tier: "B", power: 65, image: "🥶", abilities: ["Cryo-Anzug", "Cold Gun", "Wissenschaft"] },
    { name: "Clayface", tier: "B", power: 72, image: "🟤", abilities: ["Formwandlung", "Superstärke", "Mimikry"] },
    { name: "Man-Bat", tier: "B", power: 68, image: "🦇", abilities: ["Fledermaus-Mutation", "Sonar", "Flug"] },
    { name: "Killer Croc", tier: "B", power: 70, image: "🐊", abilities: ["Reptilien-Mutation", "Superstärke", "Regeneration"] },
    { name: "Ventriloquist", tier: "B", power: 45, image: "🪆", abilities: ["Scarface", "Kriminalität", "Manipulation"] },
    { name: "Mad Hatter", tier: "B", power: 52, image: "🎩", abilities: ["Gedankenkontrolle", "Technologie", "Wahnsinn"] },
    { name: "Professor Pyg", tier: "B", power: 48, image: "🐷", abilities: ["Chirurgie", "Dollotrons", "Wahnsinn"] },
    { name: "Court of Owls", tier: "B", power: 75, image: "🦉", abilities: ["Geheimbund", "Talons", "Ressourcen"] },
    { name: "Talon (Calvin)", tier: "B", power: 72, image: "🦉", abilities: ["Unsterblichkeit", "Kampfkunst", "Regeneration"] },
    { name: "Hush", tier: "B", power: 68, image: "🩹", abilities: ["Chirurgie", "Taktik", "Identitätsdiebstahl"] },
    { name: "Black Mask", tier: "B", power: 55, image: "💀", abilities: ["Kriminalität", "Folter", "Unterwelt-Boss"] },
    { name: "Red Hood (Villain)", tier: "B", power: 65, image: "🎭", abilities: ["Kampfkunst", "Waffen", "Taktik"] },

    // ========== C-TIER ==========
    { name: "Speedy (Roy Harper)", tier: "C", power: 60, image: "🏹", abilities: ["Bogenschütze", "Arsenal", "Kämpfer"] },
    { name: "Arsenal (Roy)", tier: "C", power: 62, image: "🏹", abilities: ["Waffen", "Kampfkunst", "Taktik"] },
    { name: "Red Arrow", tier: "C", power: 64, image: "🏹", abilities: ["Bogenschütze", "Kampfkunst", "Spionage"] },
    { name: "Artemis (Tigress)", tier: "C", power: 60, image: "🏹", abilities: ["Bogenschützin", "Kampfkunst", "Akrobatik"] },
    { name: "Spoiler", tier: "C", power: 55, image: "💜", abilities: ["Kampfkunst", "Gadgets", "Akrobatik"] },
    { name: "Orphan (Cassandra)", tier: "C", power: 62, image: "🦇", abilities: ["Kampfkunst", "Körpersprache", "Assassine"] },
    { name: "Signal (Duke)", tier: "C", power: 58, image: "💛", abilities: ["Lichtkontrolle", "Kampfkunst", "Gadgets"] },
    { name: "Batwing", tier: "C", power: 60, image: "🦇", abilities: ["Anzug", "Kampfkunst", "Flug"] },
    { name: "Batwoman", tier: "C", power: 58, image: "🦇", abilities: ["Kampfkunst", "Gadgets", "Militärtraining"] },
    { name: "Renee Montoya", tier: "C", power: 54, image: "❓", abilities: ["Question", "Kampfkunst", "Detektiv"] },
    { name: "Vigilante (Adrian)", tier: "C", power: 52, image: "🎸", abilities: ["Marksmanship", "Kampfkunst", "Motorrad"] },
    { name: "Ragman", tier: "C", power: 68, image: "🧥", abilities: ["Seelenmantel", "Superstärke", "Seelen"] },
    { name: "Blue Devil", tier: "C", power: 70, image: "😈", abilities: ["Dämonenstärke", "Trident", "Flug"] },
    { name: "Creeper", tier: "C", power: 65, image: "🤡", abilities: ["Superstärke", "Regeneration", "Wahnsinn"] },
    { name: "Resurrection Man", tier: "C", power: 72, image: "♻️", abilities: ["Unsterblichkeit", "Neue Kräfte", "Regeneration"] },
    { name: "Warp", tier: "C", power: 66, image: "🌀", abilities: ["Teleportation", "Portale", "Brotherhood"] },
    { name: "Geo-Force", tier: "C", power: 74, image: "🌍", abilities: ["Geokinese", "Lava", "Superstärke"] },
    { name: "Terra", tier: "C", power: 72, image: "🪨", abilities: ["Geokinese", "Erdkontrolle", "Flug"] },
    { name: "Halo", tier: "C", power: 70, image: "🌈", abilities: ["Aurakräfte", "Flug", "Lichtstrahlen"] },
    { name: "Katana", tier: "C", power: 60, image: "⚔️", abilities: ["Soultaker", "Kampfkunst", "Samurai"] },
    { name: "Looker", tier: "C", power: 68, image: "👁️", abilities: ["Telepathie", "Telekinese", "Vampir"] },
    { name: "Tempest (Garth)", tier: "C", power: 74, image: "🌊", abilities: ["Wassermagie", "Atlantier", "Superstärke"] },
    { name: "Aqualad (Kaldur)", tier: "C", power: 72, image: "🌊", abilities: ["Hydrokinese", "Wasserklingen", "Elektrizität"] },
    { name: "Miss Martian", tier: "C", power: 78, image: "👽", abilities: ["Telepathie", "Formwandlung", "Unsichtbarkeit"] },
    { name: "Superboy (Kon-El)", tier: "C", power: 80, image: "🦸", abilities: ["Kryptonische Kräfte", "Taktile TK", "Superstärke"] },
    { name: "Jinx", tier: "C", power: 62, image: "🔮", abilities: ["Pech-Magie", "Hexerei", "Teen Titans Feind"] },
    { name: "Mammoth", tier: "C", power: 70, image: "🦣", abilities: ["Superstärke", "Unverwundbar", "Fearsome Five"] },
    { name: "Gizmo", tier: "C", power: 55, image: "🔧", abilities: ["Genius", "Gadgets", "Technologie"] },
    { name: "Shimmer", tier: "C", power: 60, image: "✨", abilities: ["Transmutation", "Elementumwandlung"] },
    { name: "Psimon", tier: "C", power: 72, image: "🧠", abilities: ["Telepathie", "Telekinese", "Psychische Macht"] },
    { name: "Brother Blood", tier: "C", power: 74, image: "🩸", abilities: ["Vampirismus", "Magie", "Kult-Anführer"] },
    { name: "Trigons Söhne", tier: "C", power: 70, image: "😈", abilities: ["Dämonenkräfte", "Elementar-Macht"] },
    { name: "Blackfire", tier: "C", power: 78, image: "👸", abilities: ["Tamaranische Kräfte", "Sternenbolzen", "Flug"] },
    { name: "Red X", tier: "C", power: 65, image: "❌", abilities: ["Gadgets", "Kampfkunst", "Diebstahl"] },
    { name: "Slade Wilson Jr", tier: "C", power: 68, image: "🗡️", abilities: ["Ravager", "Kampfkunst", "Präkognition"] },
    { name: "Jericho", tier: "C", power: 70, image: "👁️", abilities: ["Körperbesitz", "Stummheit", "Sohn von Deathstroke"] },
    { name: "Rose Wilson", tier: "C", power: 66, image: "⚔️", abilities: ["Ravager", "Präkognition", "Kampfkunst"] },
    { name: "Osiris", tier: "C", power: 75, image: "⚡", abilities: ["Shazam-Kräfte", "Black Adams Nachfolger"] },
    { name: "Isis", tier: "C", power: 78, image: "🌸", abilities: ["Naturkontrolle", "Göttinnenkräfte", "Magie"] },
    { name: "Mary Marvel", tier: "C", power: 82, image: "⚡", abilities: ["Shazam-Kräfte", "Flug", "Superstärke"] },
    { name: "Captain Marvel Jr", tier: "C", power: 80, image: "⚡", abilities: ["Shazam-Kräfte", "Blitz", "Superstärke"] },
    { name: "Black Lightning", tier: "C", power: 72, image: "⚡", abilities: ["Elektrokinese", "Blitze", "Olympia-Athlet"] },
    { name: "Thunder", tier: "C", power: 70, image: "💥", abilities: ["Dichteerhöhung", "Unverwundbarkeit", "Superstärke"] },
    { name: "Lightning", tier: "C", power: 68, image: "⚡", abilities: ["Elektrokinese", "Geschwindigkeit", "Energie"] },
    { name: "Grace Choi", tier: "C", power: 72, image: "💪", abilities: ["Amazon-Erbe", "Superstärke", "Regeneration"] },
    { name: "Shift", tier: "C", power: 65, image: "🔄", abilities: ["Metamorpho-Fragment", "Element-Wandlung"] },
    { name: "Indigo (Android)", tier: "C", power: 70, image: "💜", abilities: ["Android", "Brainiacs Erbe", "Technologie"] },
    { name: "Argent", tier: "C", power: 65, image: "🌑", abilities: ["Plasma-Konstrukte", "H'San Natall Hybrid"] },
    { name: "Risk", tier: "C", power: 60, image: "🎲", abilities: ["Superstärke", "Adrenalin", "Unverwundbar"] },
    { name: "Prysm", tier: "C", power: 62, image: "💎", abilities: ["Lichtbrechung", "Energieabsorption"] },
    { name: "Fringe", tier: "C", power: 58, image: "🔮", abilities: ["Psionische Kräfte", "H'San Natall"] },
    { name: "Joto", tier: "C", power: 64, image: "🔥", abilities: ["Wärmeabsorption", "Feuerkontrolle"] },
    { name: "Captain Comet", tier: "C", power: 75, image: "☄️", abilities: ["Psionische Kräfte", "Mutant", "Telepathie"] },
    { name: "Starman (Jack)", tier: "C", power: 70, image: "⭐", abilities: ["Kosmischer Stab", "Flug", "Gravitation"] },
    { name: "Starman (Thom)", tier: "C", power: 72, image: "⭐", abilities: ["Legion", "Gravitation", "Zukunft"] },
    { name: "Sanderson Hawkins", tier: "C", power: 68, image: "🪨", abilities: ["Silizium-Form", "Prophetische Träume"] },
    { name: "Obsidian", tier: "C", power: 72, image: "🖤", abilities: ["Schatten-Kontrolle", "Schattenwelt", "JSA"] },
    { name: "Jade (Jennie)", tier: "C", power: 74, image: "💚", abilities: ["Starheart-Verbindung", "Energie", "Flug"] },
    { name: "Power Ring (Earth-3)", tier: "C", power: 75, image: "💚", abilities: ["Ring von Volthoom", "Angst-Kraft"] },
    { name: "Ultraman", tier: "C", power: 90, image: "🦸", abilities: ["Anti-Superman", "Kryptonit-Kraft"] },
    { name: "Owlman", tier: "C", power: 70, image: "🦉", abilities: ["Anti-Batman", "Genius", "Kampfkunst"] },
    { name: "Superwoman (CSA)", tier: "C", power: 85, image: "👸", abilities: ["Anti-Wonder Woman", "Lasso", "Superstärke"] },
    { name: "Johnny Quick (CSA)", tier: "C", power: 82, image: "⚡", abilities: ["Anti-Flash", "Speed-Droge"] },
    { name: "Atomica", tier: "C", power: 60, image: "⚛️", abilities: ["Anti-Atom", "Schrumpfung", "Spionage"] },
    { name: "Grid", tier: "C", power: 75, image: "🤖", abilities: ["Anti-Cyborg", "Digitale Existenz"] },
    { name: "Deathstorm", tier: "C", power: 80, image: "🔥", abilities: ["Anti-Firestorm", "Nuklearkräfte"] },
    { name: "Sea King", tier: "C", power: 78, image: "🔱", abilities: ["Anti-Aquaman", "Tyrannei"] },
    { name: "Mazahs", tier: "C", power: 88, image: "⚡", abilities: ["Anti-Shazam", "Power-Diebstahl"] },

    // ========== D-TIER ==========
    { name: "Robin (Tim Drake)", tier: "D", power: 56, image: "🐦", abilities: ["Kampfkunst", "Detektiv", "Bo-Staff"] },
    { name: "Robin (Dick Early)", tier: "D", power: 55, image: "🐦", abilities: ["Akrobatik", "Kampfkunst", "Gadgets"] },
    { name: "Robin (Jason Early)", tier: "D", power: 54, image: "🐦", abilities: ["Kampfkunst", "Aggression", "Gadgets"] },
    { name: "Alfred Pennyworth", tier: "D", power: 40, image: "🎩", abilities: ["Butler", "Medizin", "MI6"] },
    { name: "Commissioner Gordon", tier: "D", power: 42, image: "🚔", abilities: ["Polizeiarbeit", "Waffen", "Führung"] },
    { name: "Harvey Bullock", tier: "D", power: 38, image: "🚔", abilities: ["Polizist", "Ermittlung", "Zähigkeit"] },
    { name: "Ace the Bat-Hound", tier: "D", power: 35, image: "🐕", abilities: ["Spürhund", "Loyal", "Trainiert"] },
    { name: "Krypto", tier: "D", power: 75, image: "🐕", abilities: ["Kryptonischer Hund", "Superkräfte", "Treue"] },
    { name: "Streaky", tier: "D", power: 65, image: "🐱", abilities: ["Kryptonische Katze", "Superkräfte", "Unberechenbar"] },
    { name: "Comet (Super-Horse)", tier: "D", power: 70, image: "🐴", abilities: ["Kryptonisches Pferd", "Superkräfte", "Flug"] },
    { name: "Detective Chimp", tier: "D", power: 50, image: "🐵", abilities: ["Genius", "Magie-Wissen", "Deduktion"] },
    { name: "Rex the Wonder Dog", tier: "D", power: 45, image: "🐕", abilities: ["Überhund", "Langlebigkeit", "Kampfhund"] },
    { name: "Jonah Hex", tier: "D", power: 52, image: "🤠", abilities: ["Revolverheld", "Überleben", "Kopfgeldjäger"] },
    { name: "Crimson Avenger", tier: "D", power: 48, image: "🔴", abilities: ["Pistolen", "Erster Held", "Mysterium"] },
    { name: "Sandman (Wesley)", tier: "D", power: 50, image: "😴", abilities: ["Schlafgas", "Detektiv", "Prophetie"] },
    { name: "Slam Bradley", tier: "D", power: 42, image: "🕵️", abilities: ["Detektiv", "Boxer", "Ermittler"] },
    { name: "Lois Lane", tier: "D", power: 35, image: "📰", abilities: ["Journalismus", "Mut", "Ermittlung"] },
    { name: "Jimmy Olsen", tier: "D", power: 38, image: "📷", abilities: ["Fotografie", "Signal-Uhr", "Verwandlungen"] },
    { name: "Perry White", tier: "D", power: 30, image: "📰", abilities: ["Journalismus", "Führung", "Kontakte"] },
    { name: "Cat Grant", tier: "D", power: 32, image: "📰", abilities: ["Journalismus", "Medien", "PR"] },
    { name: "Steve Trevor", tier: "D", power: 45, image: "✈️", abilities: ["Pilot", "Militär", "Spionage"] },
    { name: "Etta Candy", tier: "D", power: 40, image: "🍬", abilities: ["ARGUS", "Logistik", "Unterstützung"] },
    { name: "Iris West", tier: "D", power: 32, image: "📰", abilities: ["Journalismus", "Flash-Verbindung", "Speedster-Wissen"] },
    { name: "Joe West", tier: "D", power: 42, image: "🚔", abilities: ["Polizeiarbeit", "Ermittlung", "Vaterfigur"] },
    { name: "Wally West (Kid)", tier: "D", power: 55, image: "⚡", abilities: ["Speed Force Lernen", "Potential"] },
    { name: "Linda Park", tier: "D", power: 30, image: "📺", abilities: ["Journalismus", "Flassh-Anker"] },
    { name: "Hippolyta", tier: "D", power: 75, image: "👑", abilities: ["Amazonen-Königin", "Kampfkunst", "Unsterblich"] },
    { name: "Philippus", tier: "D", power: 65, image: "⚔️", abilities: ["Amazonen-General", "Kampfkunst", "Taktik"] },
    { name: "Nubia", tier: "D", power: 72, image: "👸", abilities: ["Amazonen-Kriegerin", "Superstärke", "Kampfkunst"] },
    { name: "Artemis (Amazon)", tier: "D", power: 70, image: "🏹", abilities: ["Bana-Mighdall", "Bogenschützin", "Kriegerin"] },
    { name: "Vulko", tier: "D", power: 55, image: "🌊", abilities: ["Atlantis-Berater", "Magie-Wissen", "Politik"] },
    { name: "Nuidis Vulko", tier: "D", power: 52, image: "🌊", abilities: ["Atlantische Geschichte", "Beratung"] },
    { name: "Topo", tier: "D", power: 40, image: "🐙", abilities: ["Oktopus", "Intelligenz", "Aquaman-Freund"] },
    { name: "Mister Bones", tier: "D", power: 58, image: "💀", abilities: ["Cyanid-Berührung", "DEO-Direktor"] },
    { name: "King Faraday", tier: "D", power: 48, image: "🕵️", abilities: ["Spionage", "Taktik", "Checkmate"] },
    { name: "Nemesis (Tom)", tier: "D", power: 52, image: "🎭", abilities: ["Verkleidung", "Spionage", "Gadgets"] },
    { name: "Sgt. Rock", tier: "D", power: 50, image: "🪖", abilities: ["Soldat", "Führung", "WWII"] },
    { name: "Easy Company", tier: "D", power: 48, image: "🪖", abilities: ["Soldaten", "Teamwork", "WWII"] },
    { name: "Unknown Soldier", tier: "D", power: 55, image: "🎭", abilities: ["Verkleidung", "Attentäter", "Spion"] },
    { name: "Enemy Ace", tier: "D", power: 45, image: "✈️", abilities: ["Pilot", "WWI", "Ehre"] },
    { name: "Haunted Tank", tier: "D", power: 50, image: "🪖", abilities: ["Geister-Panzer", "WWII", "Kampf"] },
    { name: "Creature Commandos", tier: "D", power: 55, image: "🧟", abilities: ["Monster", "Militär", "Horror"] },
    { name: "Warlord (Travis)", tier: "D", power: 58, image: "⚔️", abilities: ["Skartaris", "Krieger", "Taktik"] },
    { name: "Amethyst", tier: "D", power: 70, image: "💎", abilities: ["Gemworld", "Magie", "Prinzessin"] },
    { name: "Claw the Unconquered", tier: "D", power: 55, image: "🗡️", abilities: ["Dämonenhand", "Krieger", "Fantasy"] },
    { name: "Arak", tier: "D", power: 52, image: "🪓", abilities: ["Krieger", "Mittelalter", "Magie"] },
    { name: "Nightmaster", tier: "D", power: 60, image: "⚔️", abilities: ["Magisches Schwert", "Shadowpact", "Ritter"] },
    { name: "Enchantress (DC)", tier: "D", power: 75, image: "🧙", abilities: ["Magie", "Bessenheit", "Suicide Squad"] },
    { name: "Nightshade", tier: "D", power: 65, image: "🌑", abilities: ["Schattenreisen", "Suicide Squad", "Teleportation"] },
    { name: "Count Vertigo", tier: "D", power: 60, image: "🌀", abilities: ["Vertigo-Effekt", "Gleichgewichtsstörung"] },
    { name: "Captain Boomerang", tier: "D", power: 55, image: "🪃", abilities: ["Bumerangs", "Rogues", "Suicide Squad"] },
    { name: "Captain Boomerang Jr", tier: "D", power: 65, image: "🪃", abilities: ["Speed Force Touch", "Bumerangs"] },
    { name: "Copperhead", tier: "D", power: 58, image: "🐍", abilities: ["Schlangen-Fähigkeiten", "Gift", "Flexibilität"] },
    { name: "El Diablo", tier: "D", power: 68, image: "🔥", abilities: ["Feuerkontrolle", "Pyrokinese", "Suicide Squad"] },
    { name: "King Shark", tier: "D", power: 72, image: "🦈", abilities: ["Hai-Mutation", "Superstärke", "Wasseratmung"] },
    { name: "Slipknot", tier: "D", power: 42, image: "🪢", abilities: ["Seile", "Klettern", "Infiltration"] },
    { name: "Ratcatcher", tier: "D", power: 40, image: "🐀", abilities: ["Ratten-Kontrolle", "Technologie"] },
    { name: "Ratcatcher 2", tier: "D", power: 45, image: "🐀", abilities: ["Ratten-Kontrolle", "Empathie"] },
    { name: "Polka-Dot Man", tier: "D", power: 50, image: "🔴", abilities: ["Interdimensionale Punkte", "Waffen"] },
    { name: "Peacemaker", tier: "D", power: 55, image: "🪖", abilities: ["Kampfkunst", "Waffen", "Fanatismus"] },
    { name: "Bloodsport", tier: "D", power: 58, image: "🔫", abilities: ["Teleportations-Waffen", "Schütze"] },
    { name: "Savant", tier: "D", power: 52, image: "🧠", abilities: ["Eidetisches Gedächtnis", "Kampfkunst"] },
    { name: "Javelin", tier: "D", power: 48, image: "🎯", abilities: ["Speere", "Athletik"] },
    { name: "Weasel", tier: "D", power: 45, image: "🦡", abilities: ["Tier-Mutation", "Klauen", "Wildheit"] },
    { name: "TDK (The Detachable Kid)", tier: "D", power: 35, image: "🙌", abilities: ["Körperteile abtrennen", "Nutzlos"] },
    { name: "Arm-Fall-Off Boy", tier: "D", power: 30, image: "💪", abilities: ["Arme entfernen", "Schläge", "Legion-Reject"] },
    { name: "Matter-Eater Lad", tier: "D", power: 40, image: "🍽️", abilities: ["Alles essen", "Legion", "Bismoll"] },
    { name: "Bouncing Boy", tier: "D", power: 45, image: "🏀", abilities: ["Aufblasen", "Abprallen", "Legion"] },
    { name: "Triplicate Girl", tier: "D", power: 50, image: "👩‍👩‍👩", abilities: ["Drei Körper", "Carggite", "Legion"] },
    { name: "Chameleon Boy", tier: "D", power: 55, image: "🦎", abilities: ["Formwandlung", "Durlan", "Legion"] },
    { name: "Phantom Girl", tier: "D", power: 60, image: "👻", abilities: ["Phasen", "Intangibilität", "Legion"] },
    { name: "Saturn Girl", tier: "D", power: 70, image: "🪐", abilities: ["Telepathie", "Titan", "Legion-Gründerin"] },
    { name: "Lightning Lad", tier: "D", power: 68, image: "⚡", abilities: ["Blitze", "Winath", "Legion-Gründer"] },
    { name: "Cosmic Boy", tier: "D", power: 70, image: "🧲", abilities: ["Magnetismus", "Braal", "Legion-Gründer"] },
    { name: "Brainiac 5", tier: "D", power: 72, image: "🧠", abilities: ["12-Level-Intellekt", "Colu", "Legion"] },
    { name: "Ultra Boy", tier: "D", power: 78, image: "💪", abilities: ["Eine Kraft gleichzeitig", "Rimbor", "Legion"] },
    { name: "Mon-El", tier: "D", power: 85, image: "🦸", abilities: ["Daxamite-Kräfte", "Superstärke", "Legion"] },
    { name: "Wildfire", tier: "D", power: 75, image: "🔥", abilities: ["Antienergie", "Containment-Anzug", "Legion"] },
    { name: "Dawnstar", tier: "D", power: 65, image: "🌅", abilities: ["Flügel", "Tracking", "Starhaven"] },
    { name: "Timber Wolf", tier: "D", power: 68, image: "🐺", abilities: ["Wolfs-Mutation", "Superstärke", "Legion"] },
    { name: "Shadow Lass", tier: "D", power: 60, image: "🌑", abilities: ["Dunkelheit erzeugen", "Talok VIII", "Legion"] },
    { name: "Dream Girl", tier: "D", power: 55, image: "💭", abilities: ["Präkognition", "Naltor", "Legion"] },
    { name: "Sensor Girl", tier: "D", power: 65, image: "👁️", abilities: ["Sinnesverstärkung", "Illusion", "Legion"] },
    { name: "Element Lad", tier: "D", power: 75, image: "⚗️", abilities: ["Transmutation", "Trom", "Legion"] },
    { name: "Shrinking Violet", tier: "D", power: 50, image: "🔬", abilities: ["Schrumpfung", "Imsk", "Legion"] },
    { name: "Colossal Boy", tier: "D", power: 68, image: "🏔️", abilities: ["Größenwachstum", "Erde", "Legion"] },
    { name: "Invisible Kid", tier: "D", power: 55, image: "👻", abilities: ["Unsichtbarkeit", "Genius", "Legion"] },
    { name: "Star Boy", tier: "D", power: 70, image: "⭐", abilities: ["Masse erhöhen", "Xanthu", "Legion"] },
    { name: "Sun Boy", tier: "D", power: 72, image: "☀️", abilities: ["Hitze/Licht", "Erde", "Legion"] },
    { name: "Polar Boy", tier: "D", power: 60, image: "❄️", abilities: ["Kälte erzeugen", "Tharr", "Legion"] },
    { name: "Quislet", tier: "D", power: 55, image: "👽", abilities: ["Materie animieren", "Teall", "Legion"] },
    { name: "Gates", tier: "D", power: 58, image: "🌀", abilities: ["Teleportation", "Vyrga", "Legion"] },
    { name: "Tellus", tier: "D", power: 62, image: "🐙", abilities: ["Telepathie", "Hykraius", "Legion"] },
    { name: "White Witch", tier: "D", power: 70, image: "🧙", abilities: ["Magie", "Naltor", "Legion"] },
    { name: "Blok", tier: "D", power: 72, image: "🪨", abilities: ["Stein-Körper", "Dryad", "Legion"] },
    { name: "Tyroc", tier: "D", power: 68, image: "🗣️", abilities: ["Sonische Schreie", "Marzal", "Legion"] },

    // ========== ADDITIONAL DC CHARACTERS (Vertigo, More Villains, etc.) ==========
    // Vertigo Characters
    { name: "John Constantine", tier: "C", power: 68, image: "🚬", abilities: ["Okkultismus", "Magie", "Täuschung"] },
    { name: "Swamp Thing (Avatar)", tier: "A", power: 88, image: "🌿", abilities: ["The Green", "Pflanzen-Kontrolle", "Regeneration"] },
    { name: "Morpheus (Sandman)", tier: "S", power: 95, image: "💭", abilities: ["Traumkontrolle", "Realitätsmanipulation", "Unsterblichkeit"] },
    { name: "Lucien", tier: "D", power: 45, image: "📚", abilities: ["Bibliothekar", "Wissen", "Träume"] },
    { name: "Matthew the Raven", tier: "D", power: 35, image: "🦅", abilities: ["Traumwesen", "Spionage", "Flug"] },
    { name: "Cain", tier: "D", power: 50, image: "🏠", abilities: ["Erster Mörder", "Unsterblich", "Geschichten"] },
    { name: "Abel", tier: "D", power: 45, image: "🏠", abilities: ["Erstes Opfer", "Wiederkehr", "Geschichten"] },
    { name: "Corinthian", tier: "C", power: 65, image: "👁️", abilities: ["Albtraum", "Augen-Münder", "Mord"] },
    { name: "Mazikeen", tier: "B", power: 75, image: "😈", abilities: ["Dämonin", "Kampfkunst", "Lilim"] },
    { name: "Elaine Belloc", tier: "S", power: 98, image: "👼", abilities: ["Gottes Erbin", "Omnipotenz", "Schöpfung"] },
    { name: "Merv Pumpkinhead", tier: "D", power: 30, image: "🎃", abilities: ["Traumwesen", "Hausmeister", "Loyal"] },
    { name: "Fiddlers Green", tier: "C", power: 60, image: "🏞️", abilities: ["Ort als Person", "Illusion", "Flucht"] },
    { name: "Nuala", tier: "D", power: 40, image: "🧚", abilities: ["Fee", "Glamour", "Dienerin"] },
    { name: "Thessaly", tier: "C", power: 72, image: "🧙", abilities: ["Uralte Hexe", "Mondmagie", "Unsterblich"] },
    { name: "Rose Walker", tier: "D", power: 55, image: "🌹", abilities: ["Traumwirbel", "Sterbliche Macht"] },
    { name: "Hob Gadling", tier: "D", power: 40, image: "🍺", abilities: ["Unsterblich", "Erfahrung", "Freundschaft"] },
    { name: "Lady Johanna Constantine", tier: "D", power: 55, image: "🎩", abilities: ["Okkultismus", "18. Jhd", "List"] },

    // More Batman Villains
    { name: "Zsasz", tier: "D", power: 45, image: "🔪", abilities: ["Serienmörder", "Nahkampf", "Wahnsinn"] },
    { name: "Firefly", tier: "C", power: 58, image: "🔥", abilities: ["Flammenwerfer", "Jetpack", "Pyromanie"] },
    { name: "Killer Moth", tier: "D", power: 48, image: "🦋", abilities: ["Moth-Anzug", "Waffen", "Gadgets"] },
    { name: "Calendar Man", tier: "D", power: 42, image: "📅", abilities: ["Obsession", "Planung", "Symbolik"] },
    { name: "Maxie Zeus", tier: "D", power: 45, image: "⚡", abilities: ["Wahnsinn", "Zeus-Komplex", "Elektro-Waffen"] },
    { name: "Anarky", tier: "C", power: 55, image: "🅰️", abilities: ["Genius", "Gadgets", "Ideologie"] },
    { name: "Lock-Up", tier: "D", power: 50, image: "🔒", abilities: ["Gefängniswärter", "Kampfkunst", "Obsession"] },
    { name: "Film Freak", tier: "D", power: 40, image: "🎬", abilities: ["Film-Obsession", "Imitation", "Mord"] },
    { name: "Hugo Strange", tier: "C", power: 58, image: "👨‍⚕️", abilities: ["Psychologie", "Monster-Männer", "Genius"] },
    { name: "Doctor Death", tier: "C", power: 55, image: "💀", abilities: ["Chemiker", "Gifte", "Erster Feind"] },
    { name: "Cornelius Stirk", tier: "D", power: 52, image: "😱", abilities: ["Furcht-Induktion", "Kannibale", "Telepathie"] },
    { name: "Flamingo", tier: "C", power: 60, image: "🦩", abilities: ["Assassine", "Sadismus", "Kampfkunst"] },
    { name: "Prometheus", tier: "B", power: 75, image: "🔶", abilities: ["Anti-JLA", "Kampf-Absorption", "Taktik"] },
    { name: "Doctor Hurt", tier: "B", power: 70, image: "👿", abilities: ["Unsterblich", "Black Glove", "Psychologie"] },
    { name: "Simon Hurt", tier: "B", power: 68, image: "🖤", abilities: ["Okkultismus", "Manipulation", "Ressourcen"] },
    { name: "Cluemaster", tier: "D", power: 45, image: "❓", abilities: ["Rätsel", "Gadgets", "Stephis Vater"] },
    { name: "KGBeast", tier: "C", power: 65, image: "🐻", abilities: ["Assassine", "Cybernetic", "Kampfkunst"] },
    { name: "NKVDemon", tier: "C", power: 62, image: "👹", abilities: ["Assassine", "Russisch", "Kampfkunst"] },
    { name: "Lady Vic", tier: "C", power: 58, image: "🗡️", abilities: ["Söldnerin", "Waffen", "Kampfkunst"] },
    { name: "Magpie", tier: "D", power: 48, image: "🐦", abilities: ["Diebin", "Gadgets", "Obsession"] },
    { name: "Mortician", tier: "D", power: 45, image: "⚰️", abilities: ["Leichendieb", "Wahnsinn", "Kult"] },
    { name: "Nocturna", tier: "C", power: 55, image: "🌙", abilities: ["Vampir-ähnlich", "Verführung", "Diebstahl"] },
    { name: "Orca", tier: "C", power: 65, image: "🐋", abilities: ["Orca-Mutation", "Superstärke", "Wasserfähig"] },
    { name: "Onomatopoeia", tier: "C", power: 58, image: "💬", abilities: ["Assassine", "Geräusche", "Maskiert"] },
    { name: "Doctor Phosphorus", tier: "C", power: 68, image: "☢️", abilities: ["Radioaktiv", "Flammen", "Superstärke"] },
    { name: "Solomon Grundy Born", tier: "B", power: 80, image: "🧟", abilities: ["Untot", "Superstärke", "Regeneration"] },

    // More Superman Villains
    { name: "Metallo", tier: "B", power: 78, image: "🤖", abilities: ["Kryptonit-Herz", "Robot-Körper", "Superstärke"] },
    { name: "Parasite", tier: "B", power: 80, image: "💜", abilities: ["Kräfte-Absorption", "Energie-Drain", "Mutation"] },
    { name: "Livewire", tier: "B", power: 72, image: "⚡", abilities: ["Elektrokinese", "Energie-Form", "Technopathie"] },
    { name: "Silver Banshee", tier: "B", power: 75, image: "💀", abilities: ["Death Wail", "Superstärke", "Magie"] },
    { name: "Toyman", tier: "C", power: 55, image: "🤖", abilities: ["Genius", "Tödliche Spielzeuge", "Wahnsinn"] },
    { name: "Prankster", tier: "D", power: 48, image: "🃏", abilities: ["Gadgets", "Tricks", "Humor"] },
    { name: "Mister Mxyzptlk Jr", tier: "B", power: 85, image: "🎭", abilities: ["5D-Kräfte", "Streiche", "Realität"] },
    { name: "Titano", tier: "B", power: 75, image: "🦍", abilities: ["Riesen-Affe", "Kryptonit-Augen", "Superstärke"] },
    { name: "Bruno Mannheim", tier: "C", power: 60, image: "🔥", abilities: ["Intergang", "Crime Bible", "Ressourcen"] },
    { name: "Manchester Black", tier: "A", power: 85, image: "🇬🇧", abilities: ["Telepathie", "Telekinese", "Elite"] },
    { name: "The Elite", tier: "B", power: 82, image: "⭐", abilities: ["Team", "Anti-Helden", "Extreme"] },
    { name: "Conduit", tier: "C", power: 68, image: "🔌", abilities: ["Kryptonit-Strahlung", "Rüstung", "Rivale"] },
    { name: "Riot", tier: "C", power: 62, image: "👥", abilities: ["Selbst-Duplikation", "Masse", "Stärke"] },
    { name: "Bloodsport (Supes)", tier: "C", power: 65, image: "🔫", abilities: ["Teleport-Waffen", "Kryptonit-Kugeln"] },
    { name: "Kryptonite Man", tier: "C", power: 70, image: "💚", abilities: ["Kryptonit-Körper", "Strahlung", "Gift"] },
    { name: "Atomic Skull", tier: "C", power: 72, image: "💀", abilities: ["Atom-Strahlung", "Superstärke", "Flammen"] },
    { name: "Ultra-Humanite", tier: "B", power: 78, image: "🦍", abilities: ["Genius", "Gehirn-Transfer", "Albino-Gorilla"] },
    { name: "Dominus", tier: "A", power: 88, image: "🌌", abilities: ["Realitätskontrolle", "Illusion", "Kosmisch"] },
    { name: "Eradicator (Villain)", tier: "A", power: 85, image: "🔴", abilities: ["Kryptonische Technologie", "Energie", "AI"] },
    { name: "Blanque", tier: "B", power: 75, image: "⚪", abilities: ["Telepathie", "Telekinese", "Albino"] },
    { name: "Massacre", tier: "C", power: 68, image: "🗡️", abilities: ["Killer", "Enhanced", "Sadist"] },
    { name: "Rampage", tier: "C", power: 72, image: "💪", abilities: ["Superstärke", "Wut", "Orange"] },
    { name: "Hellgrammite", tier: "C", power: 65, image: "🦗", abilities: ["Insekten-Mutation", "Sprung", "Stärke"] },

    // More Wonder Woman Villains
    { name: "Doctor Psycho", tier: "B", power: 75, image: "🧠", abilities: ["Telepathie", "Illusion", "Manipulation"] },
    { name: "Giganta", tier: "B", power: 78, image: "👩‍🦰", abilities: ["Größenwachstum", "Superstärke", "Wissenschaft"] },
    { name: "Silver Swan", tier: "B", power: 72, image: "🦢", abilities: ["Schallschrei", "Flug", "Superstärke"] },
    { name: "Veronica Cale", tier: "C", power: 55, image: "👩‍💼", abilities: ["Genius", "Ressourcen", "Godwatch"] },
    { name: "First Born", tier: "A", power: 90, image: "👹", abilities: ["Göttliche Kraft", "Unsterblich", "Eroberer"] },
    { name: "Devastation", tier: "B", power: 82, image: "💥", abilities: ["Anti-Wonder Woman", "Göttliche Kraft"] },
    { name: "Dark Angel", tier: "B", power: 78, image: "😈", abilities: ["Dimensionsmagie", "Zeitmanipulation"] },
    { name: "Angle Man", tier: "D", power: 50, image: "📐", abilities: ["Angler", "Dimensionspforten", "Dieb"] },
    { name: "Doctor Poison", tier: "C", power: 58, image: "☠️", abilities: ["Giftspezialistin", "Chemie", "WWI"] },
    { name: "Blue Snowman", tier: "D", power: 48, image: "⛄", abilities: ["Frost-Technologie", "Verkleidung"] },
    { name: "Medusa (DC)", tier: "B", power: 80, image: "🐍", abilities: ["Versteinerung", "Schlangenhaar", "Mythologie"] },
    { name: "Queen Clea", tier: "C", power: 65, image: "👑", abilities: ["Atlantis-Tyrannin", "Magie", "Krieger"] },
    { name: "Genocide", tier: "A", power: 88, image: "💀", abilities: ["Konstrukt", "Anti-Wonder Woman", "Lasso"] },
    { name: "Tezcatlipoca", tier: "A", power: 85, image: "🌑", abilities: ["Aztekengott", "Dunkelheit", "Magie"] },

    // Green Lantern Corps and Enemies
    { name: "Kilowog", tier: "A", power: 84, image: "💚", abilities: ["Power Ring", "Drill-Sergeant", "Bolovax"] },
    { name: "Tomar-Re", tier: "B", power: 78, image: "💚", abilities: ["Power Ring", "Wissenschaftler", "Xudar"] },
    { name: "Arisia", tier: "B", power: 72, image: "💚", abilities: ["Power Ring", "Willenskraft", "Graxos"] },
    { name: "Sodam Yat", tier: "A", power: 92, image: "💚", abilities: ["Power Ring", "Daxamit", "Ion-Wirt"] },
    { name: "Mogo", tier: "S", power: 95, image: "🌍", abilities: ["Lebender Planet", "Power Ring", "Rekrutierung"] },
    { name: "Salaak", tier: "B", power: 70, image: "💚", abilities: ["Power Ring", "Administrator", "Vier Arme"] },
    { name: "Boodikka", tier: "B", power: 75, image: "💚", abilities: ["Power Ring", "Kriegerin", "Alpha-Lantern"] },
    { name: "Hannu", tier: "B", power: 72, image: "💚", abilities: ["Power Ring", "Kein-Ring-Nutzung", "Stärke"] },
    { name: "Graf Tansen", tier: "B", power: 70, image: "💚", abilities: ["Power Ring", "Adliger", "Tanzmeister"] },
    { name: "Iolande", tier: "B", power: 72, image: "💚", abilities: ["Power Ring", "Prinzessin", "Betrassus"] },
    { name: "Vath Sarn", tier: "B", power: 70, image: "💚", abilities: ["Power Ring", "Rannian", "Veteran"] },
    { name: "Isamot Kol", tier: "B", power: 72, image: "💚", abilities: ["Power Ring", "Lizarkon", "Regeneration"] },
    { name: "Laira", tier: "B", power: 75, image: "🔴", abilities: ["Roter Ring", "Gefallene", "Kriegerin"] },
    { name: "Hector Hammond", tier: "A", power: 82, image: "🧠", abilities: ["Telepathie", "Großer Kopf", "Psychokinese"] },
    { name: "Goldface", tier: "C", power: 62, image: "🥇", abilities: ["Gold-Haut", "Superstärke", "Kriminell"] },
    { name: "Doctor Polaris", tier: "B", power: 78, image: "🧲", abilities: ["Magnetismus", "Bipolar", "Wissenschaft"] },
    { name: "Evil Star", tier: "B", power: 80, image: "⭐", abilities: ["Star-Band", "Starlings", "Unsterblich"] },
    { name: "Sonar", tier: "C", power: 60, image: "🔊", abilities: ["Schallwaffen", "Modora", "Wissenschaft"] },
    { name: "Major Force", tier: "B", power: 82, image: "💥", abilities: ["Quantenkräfte", "Söldner", "Unsterblich"] },
    { name: "Fatality", tier: "B", power: 75, image: "💜", abilities: ["Star Sapphire", "Kriegerin", "Xanshi"] },
    { name: "Nero", tier: "A", power: 85, image: "💛", abilities: ["Gelber Ring", "Wahnsinn", "Künstler"] },
    { name: "Krona", tier: "S", power: 96, image: "🌌", abilities: ["Oan", "Kosmische Macht", "Curiosity"] },
    { name: "Nekron Lord", tier: "S", power: 98, image: "💀", abilities: ["Black Lantern", "Untote Armee", "Tod"] },
    { name: "Black Hand", tier: "A", power: 82, image: "🖐️", abilities: ["Black Ring", "Todesenergie", "Wahnsinn"] },
    { name: "Lyssa Drak", tier: "B", power: 72, image: "📖", abilities: ["Buch von Parallax", "Sinestro Corps", "Wissen"] },
    { name: "Arkillo", tier: "A", power: 85, image: "💛", abilities: ["Gelber Ring", "Superstärke", "Brutalität"] },
    { name: "Amon Sur", tier: "B", power: 70, image: "💛", abilities: ["Gelber Ring", "Abin Surs Sohn", "Rache"] },
    { name: "Anti-Green Lantern", tier: "B", power: 78, image: "🟣", abilities: ["Gegenring", "Oa-Sabotage"] },
    { name: "Controllers", tier: "A", power: 85, image: "💙", abilities: ["Orange Lanterns Macher", "Oaner", "Kontrolle"] },
    { name: "Manhunters", tier: "B", power: 75, image: "🤖", abilities: ["Roboter", "Anti-Emotion", "Erste Wächter"] },
    { name: "Cyborg Superman (GL)", tier: "A", power: 88, image: "🤖", abilities: ["Manhunter-Herr", "Warworld", "Unsterblich"] },

    // More Flash Villains
    { name: "Abra Kadabra", tier: "B", power: 78, image: "🎩", abilities: ["Zukunftstechnologie", "Pseudo-Magie", "64. Jhd"] },
    { name: "Tar Pit", tier: "C", power: 62, image: "🌑", abilities: ["Teer-Körper", "Wärme", "Unzerstörbar"] },
    { name: "Murmur", tier: "C", power: 55, image: "🤐", abilities: ["Serienmörder", "Virus", "Stumm"] },
    { name: "Double Down", tier: "C", power: 58, image: "🃏", abilities: ["Karten-Haut", "Rasiermesserscharf", "Fluch"] },
    { name: "Plunder", tier: "C", power: 55, image: "🏴‍☠️", abilities: ["Mirror-Welt", "Pirat", "Waffen"] },
    { name: "Peek-a-Boo", tier: "C", power: 65, image: "👁️", abilities: ["Teleportation", "Explosionen", "Tragisch"] },
    { name: "Fallout", tier: "C", power: 70, image: "☢️", abilities: ["Nuklear", "Strahlung", "Tragisch"] },
    { name: "Cicada (Cult)", tier: "B", power: 72, image: "🗡️", abilities: ["Unsterblich", "Blitz-Energie", "Kult"] },
    { name: "Cicada (Orlin)", tier: "B", power: 70, image: "🗡️", abilities: ["Meta-Kraft absorbieren", "Dolch"] },
    { name: "Elongated Man (Villain)", tier: "C", power: 65, image: "🟠", abilities: ["Elastizität", "Böse Version"] },
    { name: "Rainbow Raider", tier: "C", power: 58, image: "🌈", abilities: ["Emotions-Strahlen", "Farben", "Künstler"] },
    { name: "Top", tier: "C", power: 65, image: "🔄", abilities: ["Super-Spin", "Telepathie", "Schwindel"] },
    { name: "Ragdoll (Villain)", tier: "C", power: 55, image: "🎭", abilities: ["Triple-Joint", "Flexibilität", "Wahnsinn"] },
    { name: "Blacksmith", tier: "B", power: 72, image: "⚒️", abilities: ["Metall-Kontrolle", "Rogues-Vereinigung", "Network"] },
    { name: "Girder", tier: "C", power: 68, image: "🔩", abilities: ["Stahl-Körper", "Superstärke", "Rost"] },
    { name: "Magenta", tier: "C", power: 70, image: "🔮", abilities: ["Magnetismus", "Bipolar", "Wallys Ex"] },
    { name: "Fiddler", tier: "C", power: 60, image: "🎻", abilities: ["Hypnotische Musik", "JSA-Feind", "Alt"] },
    { name: "Shade (Villain)", tier: "B", power: 78, image: "🌑", abilities: ["Shadowlands", "Unsterblich", "Gentleman"] },
    { name: "Rival", tier: "B", power: 80, image: "⚡", abilities: ["Speed Force", "Jays Feind", "Velocity 9"] },

    // Aquaman Characters
    { name: "Dolphin", tier: "C", power: 60, image: "🐬", abilities: ["Unterwasser", "Biolumineszenz", "Atlantierin"] },
    { name: "Lagoon Boy", tier: "C", power: 58, image: "🐟", abilities: ["Unterwasser", "Aufblasen", "Atlantier"] },
    { name: "Murk", tier: "C", power: 62, image: "⚔️", abilities: ["Atlantische Garde", "Kriegstaucher", "Loyal"] },
    { name: "Tula", tier: "C", power: 70, image: "🌊", abilities: ["Aquagirl", "Hydrokinese", "Atlantierin"] },
    { name: "Lorena", tier: "C", power: 65, image: "🌊", abilities: ["Aquagirl II", "Unterwasser", "Sub Diego"] },
    { name: "Koryak", tier: "C", power: 70, image: "🔱", abilities: ["Arthurs Sohn", "Atlantische Kräfte", "Rebelle"] },
    { name: "Thanatos", tier: "B", power: 75, image: "💀", abilities: ["Unterwelt", "Magie", "Aquamans Doppel"] },
    { name: "Charybdis", tier: "C", power: 65, image: "🌀", abilities: ["Kräfte-Absorption", "Piranha", "Aquamans Hand"] },
    { name: "Scavenger", tier: "C", power: 58, image: "🦈", abilities: ["Technologie", "U-Boot", "Pirat"] },
    { name: "Fisherman", tier: "D", power: 50, image: "🎣", abilities: ["Angel-Waffen", "Dieb", "Technologie"] },
    { name: "Triton (DC)", tier: "B", power: 78, image: "🔱", abilities: ["Meeresgott", "Poseidons Sohn", "Atlantis"] },
    { name: "Atlan", tier: "A", power: 85, image: "👑", abilities: ["Erster König", "Trident-Schmied", "Magie"] },
    { name: "Siren", tier: "B", power: 75, image: "🧜", abilities: ["Meras Schwester", "Hypnose", "Hydrokinese"] },
    { name: "Nereus", tier: "B", power: 78, abilities: ["Xebel-König", "Krieger", "Meras Ex"] },
    { name: "Dead King", tier: "A", power: 85, image: "👑", abilities: ["Erster König", "Scepter", "Unsterblich"] },

    // Teen Titans/Young Justice Additional
    { name: "Bumblebee", tier: "C", power: 62, image: "🐝", abilities: ["Schrumpfung", "Stachel-Blaster", "Flug"] },
    { name: "Mal Duncan", tier: "D", power: 55, image: "🎺", abilities: ["Gabriel's Horn", "Vox", "Herald"] },
    { name: "Golden Eagle", tier: "C", power: 60, image: "🦅", abilities: ["Flügel", "Nth-Metal-Rüstung", "Flug"] },
    { name: "Lilith Clay", tier: "C", power: 68, image: "🔮", abilities: ["Telepathie", "Präkognition", "Titan"] },
    { name: "Gnark", tier: "C", power: 58, image: "🦴", abilities: ["Steinzeit-Stärke", "Überlebensfähig", "Loyal"] },
    { name: "Frances Kane", tier: "C", power: 70, image: "🧲", abilities: ["Magnetismus", "Bipolar", "Wallys Ex"] },
    { name: "Danny Chase", tier: "C", power: 62, image: "👻", abilities: ["Telekinese", "Illusion", "Phantasm"] },
    { name: "Pantha", tier: "C", power: 70, image: "🐆", abilities: ["Tier-Hybrid", "Superstärke", "Krallen"] },
    { name: "Wildebeest", tier: "C", power: 72, image: "🦬", abilities: ["Tier-Hybrid", "Superstärke", "Hörner"] },
    { name: "Red Star", tier: "B", power: 78, image: "⭐", abilities: ["Nuklearkräfte", "Superstärke", "Russland"] },
    { name: "Baby Wildebeest", tier: "D", power: 55, image: "🦬", abilities: ["Tier-Kind", "Stärke-Potential", "Unschuld"] },
    { name: "Mirage", tier: "C", power: 60, image: "🌫️", abilities: ["Illusion", "Zukunft", "Team Titans"] },
    { name: "Terra II", tier: "C", power: 72, image: "🪨", abilities: ["Geokinese", "Klon", "Titans"] },
    { name: "Minion", tier: "C", power: 65, image: "🤖", abilities: ["Formwandlung", "Alien-Tech", "Omni"] },
    { name: "Damage (Titan)", tier: "C", power: 75, image: "💥", abilities: ["Explosionskraft", "JSA-Erbe", "Grant"] },
    { name: "Solstice", tier: "C", power: 70, image: "☀️", abilities: ["Lichtkraft", "Energie", "Indien"] },
    { name: "Bunker", tier: "C", power: 68, image: "🧱", abilities: ["Psi-Konstrukte", "Mexiko", "New 52"] },
    { name: "Skitter", tier: "C", power: 62, image: "🕷️", abilities: ["Insekten-Form", "Spinne", "New 52"] },

    // Justice Society Additional
    { name: "Johnny Thunder", tier: "C", power: 72, image: "⚡", abilities: ["Thunderbolt", "Bahdnesia", "Zufall"] },
    { name: "Thunderbolt", tier: "A", power: 88, image: "💛", abilities: ["Wunsch-Erfüllung", "Dschinn", "Magie"] },
    { name: "Liberty Belle", tier: "C", power: 65, image: "🔔", abilities: ["Superstärke", "Speed", "WWII"] },
    { name: "Johnny Quick (JSA)", tier: "B", power: 78, image: "⚡", abilities: ["Speed-Formel", "WWII", "Jesse's Dad"] },
    { name: "Amazing Man", tier: "B", power: 75, image: "🔵", abilities: ["Material-Absorption", "All-Star Squadron"] },
    { name: "Atom (Al Pratt)", tier: "C", power: 60, image: "⚛️", abilities: ["Superstärke", "Atomkraft", "WWII"] },
    { name: "Firebrand", tier: "C", power: 62, image: "🔥", abilities: ["Feuerkontrolle", "Flug", "WWII"] },
    { name: "Commander Steel", tier: "B", power: 72, image: "🦾", abilities: ["Stahl-Körper", "Superstärke", "WWII"] },
    { name: "Citizen Steel", tier: "B", power: 75, image: "🦾", abilities: ["Stahl-Haut", "Superstärke", "JSA"] },
    { name: "Damage (JSA)", tier: "B", power: 78, image: "💥", abilities: ["Explosionskraft", "Atom-Smasher-Erbe"] },
    { name: "Jakeem Thunder", tier: "C", power: 72, image: "⚡", abilities: ["Thunderbolt", "Teenager", "Modern JSA"] },
    { name: "Starwoman", tier: "C", power: 68, image: "⭐", abilities: ["Kosmischer Stab", "Courtney's Zukunft"] },
    { name: "Green Lantern (Jade)", tier: "B", power: 74, image: "💚", abilities: ["Starheart", "Alans Tochter", "Energie"] },
    { name: "Sandman (Sanderson)", tier: "B", power: 70, image: "😴", abilities: ["Silizium-Form", "Prophetie", "Sand"] },
    { name: "Crimson Avenger II", tier: "C", power: 65, image: "🔴", abilities: ["Geister-Pistolen", "Rache", "Fluch"] },
    { name: "Wildcat (Yolanda)", tier: "C", power: 60, image: "🐱", abilities: ["Krallen", "Akrobatik", "JSA"] },
    { name: "Wildcat (Tommy)", tier: "C", power: 58, image: "🐱", abilities: ["Kampfkunst", "Boxer", "Teds Sohn"] },
    { name: "Hourman (Rick)", tier: "B", power: 72, image: "⏰", abilities: ["Miraclo", "Zeitvision", "Android-Freund"] },
    { name: "Hourman (Android)", tier: "A", power: 85, image: "⏰", abilities: ["Zeitmanipulation", "Worlogog", "Future"] },
    { name: "Cyclone (JSA)", tier: "C", power: 70, image: "🌪️", abilities: ["Wind-Kontrolle", "Maxines Enkelin", "JSA"] },
    { name: "Judomaster", tier: "C", power: 58, image: "🥋", abilities: ["Kampfkunst", "Aura", "Untreffbar"] },
    { name: "Mister America", tier: "C", power: 55, image: "🇺🇸", abilities: ["FBI", "Peitsche", "Patriot"] },
    { name: "Tornado", tier: "C", power: 68, image: "🌪️", abilities: ["Wind-Kontrolle", "Red Tornado Tochter"] },
    { name: "King Chimera", tier: "C", power: 72, image: "🦁", abilities: ["Illusion", "Zatarras Sohn", "JSA"] },
    { name: "Magog", tier: "B", power: 80, image: "🗡️", abilities: ["Staff", "Kingdom Come", "Anti-Held"] },

    // Shazam Family and Enemies
    { name: "Eugene", tier: "C", power: 75, image: "⚡", abilities: ["Shazam-Kräfte", "Technologie-Kontrolle"] },
    { name: "Pedro", tier: "C", power: 78, image: "⚡", abilities: ["Shazam-Kräfte", "Superstärke", "Schüchtern"] },
    { name: "Darla", tier: "C", power: 72, image: "⚡", abilities: ["Shazam-Kräfte", "Superspeed", "Jung"] },
    { name: "King Kull", tier: "B", power: 78, image: "👑", abilities: ["Biest-Mensch", "Stärke", "Monster Society"] },
    { name: "Mister Mind", tier: "B", power: 80, image: "🐛", abilities: ["Telepathie", "Genius", "Raupe"] },
    { name: "Doctor Sivana", tier: "C", power: 60, image: "👨‍🔬", abilities: ["Genius", "Technologie", "Shazam-Feind"] },
    { name: "Sabbac", tier: "A", power: 85, image: "😈", abilities: ["Dämonenkräfte", "Anti-Shazam", "Hölle"] },
    { name: "Ibac", tier: "B", power: 75, image: "👹", abilities: ["Dämonenkräfte", "Schwächer-Shazam", "Vier Übel"] },
    { name: "Blaze", tier: "A", power: 82, image: "🔥", abilities: ["Dämonin", "Hölle", "Shazam-Feindin"] },
    { name: "Satanus", tier: "A", power: 82, image: "😈", abilities: ["Dämon", "Hölle", "Blazes Bruder"] },
  ];

  moreDCCharacters.forEach(char => {
    additionalDC.push({
      id: 2000 + idCounter++,
      name: char.name,
      universe: 'DC',
      tier: char.tier,
      power: char.power,
      image: char.image,
      color: char.tier === 'S' ? '#FFD700' : char.tier === 'A' ? '#FF8C00' : char.tier === 'B' ? '#4169E1' : char.tier === 'C' ? '#228B22' : '#808080',
      abilities: char.abilities,
      description: getDescription(char.name, 'DC-Charakter', char.tier, char.abilities, char.power, 'DC'),
      reason: reasonTemplates[char.tier],
      stats: {
        strength: Math.round(char.power * 0.8 + Math.random() * 20),
        speed: Math.round(char.power * 0.7 + Math.random() * 25),
        durability: Math.round(char.power * 0.75 + Math.random() * 20),
        intelligence: Math.round(50 + Math.random() * 50),
        combat: Math.round(char.power * 0.6 + Math.random() * 35)
      }
    });
  });

  return additionalDC;
}

// Apply DC corrections to a hero
function applyDCCorrections(hero) {
  const correction = findCorrection(hero.name, 'DC');

  // Get manual description if available
  const manualDesc = getManualDescription(hero.name, 'DC');

  if (correction) {
    return {
      ...hero,
      tier: correction.tier,
      power: correction.power,
      reason: correction.reason,
      description: manualDesc || hero.description || getDescription(hero.name, 'DC-Charakter', correction.tier, hero.abilities, correction.power, 'DC')
    };
  }

  // Even without corrections, apply manual description if available
  if (manualDesc) {
    return {
      ...hero,
      description: manualDesc
    };
  }

  return hero;
}

// Process base DC heroes with corrections
const dcHeroes = dcHeroesBase.map((hero, idx) => {
  const corrected = applyDCCorrections(hero);
  return {
    id: 1000 + idx + 1,
    universe: 'DC',
    ...corrected
  };
});

// Generate additional DC heroes and apply corrections
const additionalDCHeroes = generateMoreDCHeroes().map(hero => applyDCCorrections(hero));

// Combine all heroes
const marvelHeroes = processMarvelHeroes();
let allHeroes = [...marvelHeroes, ...dcHeroes, ...additionalDCHeroes];

// Remove duplicates by name (keep the first occurrence)
const seenNames = new Set();
allHeroes = allHeroes.filter(hero => {
  const lowerName = hero.name.toLowerCase();
  if (seenNames.has(lowerName)) {
    return false;
  }
  seenNames.add(lowerName);
  return true;
});

// Sort by power
allHeroes.sort((a, b) => b.power - a.power);

// Reassign IDs
allHeroes.forEach((hero, idx) => {
  hero.id = idx + 1;
});

console.log('Total heroes:', allHeroes.length);
console.log('Marvel:', allHeroes.filter(h => h.universe === 'Marvel').length);
console.log('DC:', allHeroes.filter(h => h.universe === 'DC').length);
console.log('\nTier distribution:');
console.log('Cosmic:', allHeroes.filter(h => h.tier === 'Cosmic').length);
console.log('S:', allHeroes.filter(h => h.tier === 'S').length);
console.log('A:', allHeroes.filter(h => h.tier === 'A').length);
console.log('B:', allHeroes.filter(h => h.tier === 'B').length);
console.log('C:', allHeroes.filter(h => h.tier === 'C').length);
console.log('D:', allHeroes.filter(h => h.tier === 'D').length);

// Save as JSON file to avoid TypeScript TS2590 error with large inline arrays
fs.writeFileSync(path.join(__dirname, '../src/data/superheroes.json'), JSON.stringify(allHeroes, null, 2));

// Generate TypeScript wrapper that imports the JSON
const tsContent = `import type { Hero } from '../types/hero';
import heroData from './superheroes.json';

export const superheroes: Hero[] = heroData as Hero[];
`;

fs.writeFileSync(path.join(__dirname, '../src/data/superheroes.ts'), tsContent);
console.log('\nSaved to superheroes.json and superheroes.ts');
