# 🛠️ THE HERO FORGE: PIPELINE ARCHITECTURE

## 🎯 Projektziel
Transformation einer Datenbank mit 1500 lizenzierten Helden (Marvel/DC) in ein originäres Sci-Fi IP ("Infinite Arena") mittels AI-Generation.

---

## 📐 Core Mechanics: The Triangle (RPS)
Wir adaptieren das bewährte "Last War" Prinzip (Tank > Missile > Air).
Jeder Held wird fest einer von 3 Fraktionen zugeordnet.

### 1. 🛡️ **Terraguard (Boden/Tank)**
* **Rolle:** Hohe HP, Defense.
* **Schlägt:** Cyber-Ops (25% Bonus Damage).
* **Verliert gegen:** Aero-Vanguard (25% Weniger Damage).
* **Stat-Bias:** Hohe Constitution/Durability/Strength.
* **Gameplay:** Frontline Tanks, absorbieren Schaden, schützen Team.
* **Beispiel-Archetyp:** Gepanzerter Mech-Pilot, Steingolem, Kraftkoloss.

### 2. 🎯 **Cyber-Ops (Tech/Missile)**
* **Rolle:** Hoher Schaden, Range, Crits.
* **Schlägt:** Aero-Vanguard (25% Bonus Damage).
* **Verliert gegen:** Terraguard (25% Weniger Damage).
* **Stat-Bias:** Hohe Intelligence/Power/Energy.
* **Gameplay:** Burst Damage Dealer, Technologie-basiert, Hack-Abilities.
* **Beispiel-Archetyp:** Sniper, Hacker, Energy-Beam Specialist.

### 3. 🚁 **Aero-Vanguard (Luft/Speed)**
* **Rolle:** Ausweichen, Speed, Multi-Hit.
* **Schlägt:** Terraguard (25% Bonus Damage).
* **Verliert gegen:** Cyber-Ops (25% Weniger Damage).
* **Stat-Bias:** Hoher Speed/Agility/Combat.
* **Gameplay:** Hit-and-Run, Evasion-basiert, Combo-Attacks.
* **Beispiel-Archetyp:** Jetpack-Krieger, Blade-Dancer, Windmanipulator.

---

## ⚙️ Die Pipeline (Python Script)

### **Stufe 1: Daten-Import & Analyse**
```
Input: heroes_raw.json (1500 Helden mit Original-Stats)
├── Validierung der Datenstruktur
├── Extraktion relevanter Stats (strength, speed, power, durability, combat, intelligence)
└── Initial Logging: "Loaded X heroes"
```

### **Stufe 2: Stat-Normalisierung & Combat Score**
```python
Combat Score Formel:
CS = (strength * 0.2) + (speed * 0.15) + (power * 0.25) +
     (durability * 0.2) + (combat * 0.15) + (intelligence * 0.05)

# Gewichtung erklärt:
# Power (25%) = Hauptschadensfaktor
# Strength/Durability (20% each) = Körperliche Dominanz
# Speed/Combat (15% each) = Kampfeffektivität
# Intelligence (5%) = Strategischer Bonus
```

### **Stufe 3: Rarity Tier Assignment**
```
Berechne Perzentile basierend auf Combat Score:
├── Legendary (Top 5%)    → Combat Score >= 95th Percentile
├── Epic (Next 10%)       → Combat Score >= 85th Percentile
├── Rare (Next 25%)       → Combat Score >= 60th Percentile
└── Common (Remaining 60%) → Alle anderen

Stat Multipliers pro Rarity:
├── Legendary: 1.5x Base Stats
├── Epic: 1.25x Base Stats
├── Rare: 1.0x Base Stats
└── Common: 0.8x Base Stats
```

### **Stufe 4: Fraktions-Zuweisung (Algorithmus)**
```python
def assign_faction(hero_stats):
    # Berechne dominante Stat-Kategorie
    tank_score = (durability * 2 + strength * 1.5) / 3.5
    tech_score = (power * 2 + intelligence * 1.5) / 3.5
    speed_score = (speed * 2 + combat * 1.5) / 3.5

    # Finde Maximum
    scores = {
        'Terraguard': tank_score,
        'Cyber-Ops': tech_score,
        'Aero-Vanguard': speed_score
    }

    # Balancierung: Wenn eine Fraktion > 35%, benutze 2nd-highest
    if faction_distribution[winner] > 0.35:
        return second_highest_faction

    return max(scores, key=scores.get)
```

### **Stufe 5: AI-Content-Generation (The Creative Engine)**

#### **5.1 System Prompt Template**
```
You are a Sci-Fi hero designer for "Infinite Arena", a futuristic battle game.

CONSTRAINTS:
- NO Marvel/DC references (no Wayne, Stark, Parker, Rogers, etc.)
- NO real-world locations or brands
- Must fit faction theme: {faction}
- Rarity level: {rarity}
- Tone: Gritty, cyberpunk, with military sci-fi elements

HERO PROFILE:
Stats: {stats_summary}
Faction: {faction_description}
Rarity: {rarity}

Generate:
1. NAME: Single unique callsign (2-3 words max, sounds like military codename)
2. BIO: 2-sentence backstory (30-50 words). Focus on origin and motivation.
3. QUOTE: One memorable line that hero would say in battle (max 15 words)

Output as JSON:
{
  "name": "...",
  "bio": "...",
  "quote": "..."
}
```

#### **5.2 API Integration**
```
Provider Options:
1. OpenAI GPT-4o-mini (Primär)
2. Google Gemini Flash (Fallback)
3. MockAI (Testing)

Rate Limits:
├── Max 10 requests/second
├── Retry logic with exponential backoff
└── Total timeout: 30s per hero
```

### **Stufe 6: Quality Assurance - The Gatekeeper**

#### **6.1 Blacklist Check (Phase 1)**
```python
BLACKLIST = [
    # Marvel
    'stark', 'tony', 'rogers', 'steve', 'banner', 'bruce',
    'parker', 'peter', 'thor', 'odinson', 'barton', 'clint',
    'romanoff', 'natasha', 'marvel', 'avenger', 'mutant',
    'xavier', 'charles', 'magneto', 'eric', 'weapon-x',

    # DC
    'wayne', 'bruce', 'kent', 'clark', 'diana', 'prince',
    'allen', 'barry', 'jordan', 'hal', 'gotham', 'metropolis',
    'batman', 'superman', 'wonder', 'flash', 'lantern',
    'krypton', 'kryptonian', 'amazon', 'themyscira',

    # Generic Protected
    'spider', 'iron', 'captain', 'america', 'incredible',
    'amazing', 'fantastic', 'justice', 'league', 'squadron'
]

def check_blacklist(name):
    name_lower = name.lower()
    for term in BLACKLIST:
        if term in name_lower:
            return False  # REJECT
    return True  # PASS
```

#### **6.2 Lore Uniqueness Check (Phase 2)**
```python
class LoreGuardian:
    def __init__(self):
        self.existing_bios = []
        self.similarity_threshold = 0.60  # 60% similarity = too similar

    def check_uniqueness(self, new_bio):
        for existing in self.existing_bios:
            similarity = self._calculate_similarity(new_bio, existing)
            if similarity > self.similarity_threshold:
                return False, similarity, existing
        return True, 0.0, None

    def _calculate_similarity(self, text1, text2):
        # Method 1: SequenceMatcher (fast, simple)
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1, text2).ratio()

        # Method 2: TF-IDF + Cosine (advanced, optional)
        # Use sklearn if needed for better semantic matching
```

#### **6.3 Rewrite Loop**
```
If Bio fails uniqueness:
1. Extract key conflict points
2. Generate new prompt:
   "Previous bio was too similar to: '{conflicting_bio}'.
    Rewrite completely. Change the setting, motivation, and tone.
    Make it [darker/lighter/more tech-focused/more human]."
3. Retry (max 3 attempts)
4. If still fails after 3 tries: Mark hero as "MANUAL_REVIEW"
```

### **Stufe 7: JSON Export Schema**
```json
{
  "id": 1,
  "originalName": "Spider-Man",
  "name": "Arachno-Striker",
  "faction": "Aero-Vanguard",
  "rarity": "Epic",
  "bio": "Former NEXUS Corp test pilot who merged with experimental nanofiber suit. Now fights corporate tyranny.",
  "quote": "They thought they could control me. They were wrong.",
  "stats": {
    "strength": 72,
    "speed": 95,
    "power": 68,
    "durability": 65,
    "combat": 88,
    "intelligence": 75
  },
  "combatScore": 76.85,
  "image": "/heroes/1.jpg"
}
```

---

## 🎮 Game Balance Considerations

### Faction Distribution Target
```
Ideal: 33% / 33% / 33%
Acceptable: 30% / 35% / 35%
Critical: Nie über 40% für eine Fraktion
```

### Rarity Distribution (Expected)
```
Common: ~900 heroes (60%)
Rare: ~375 heroes (25%)
Epic: ~150 heroes (10%)
Legendary: ~75 heroes (5%)
```

### Stat Scaling Table
| Rarity    | HP Range | Attack Range | Speed Range |
|-----------|----------|--------------|-------------|
| Common    | 80-120   | 40-60        | 30-50       |
| Rare      | 120-160  | 60-85        | 50-70       |
| Epic      | 160-210  | 85-115       | 70-90       |
| Legendary | 210-280  | 115-150      | 90-110      |

---

## 🚀 Implementation Phases

### Phase 1: Core Pipeline (MVP)
- [x] Data loading & validation
- [x] Stat normalization
- [x] Rarity assignment
- [x] Faction assignment
- [x] Basic AI integration
- [x] JSON export

### Phase 2: Quality Assurance
- [x] Blacklist checking
- [x] Lore uniqueness validation
- [x] Rewrite loop
- [x] Manual review flagging

### Phase 3: Advanced Features
- [ ] Web UI for manual review
- [ ] Bulk editing tools
- [ ] A/B testing different prompts
- [ ] Cost tracking & optimization
- [ ] Image generation integration

---

## 💡 AI Prompt Engineering Tips

### Good Prompt Structure
```
1. Context (1 line): "You are designing for a cyberpunk battle arena"
2. Constraints (3-5 bullets): "No Marvel/DC, military tone, max 50 words"
3. Input Data (formatted): Stats + Faction + Rarity
4. Output Format (explicit): "JSON with keys: name, bio, quote"
5. Examples (optional but powerful): Show 2-3 ideal outputs
```

### Prompt Variations by Rarity
```python
rarity_tones = {
    'Common': 'Ordinary soldier or street-level fighter',
    'Rare': 'Veteran with notable achievements',
    'Epic': 'Legendary warrior with game-changing abilities',
    'Legendary': 'Mythic figure whose name alone commands respect'
}
```

---

## 📊 Expected Runtime & Costs

### Processing Time
```
1500 heroes × 2 seconds/hero = 50 minutes (serial)
1500 heroes ÷ 10 concurrent = 5 minutes (parallel with rate limiting)

With retries (avg 1.2x):
Estimated Total: 6-8 minutes
```

### API Costs (GPT-4o-mini)
```
Input: ~300 tokens/request
Output: ~150 tokens/request
Total: 450 tokens × $0.00015/1k = $0.0000675 per hero

1500 heroes × $0.0000675 = $0.10 total
With retries (20%): ~$0.12 total

SEHR GÜNSTIG! 🎉
```

---

## 🔧 Technical Stack

```
Core:
├── Python 3.11+
├── asyncio (concurrency)
├── aiohttp (async HTTP)
└── pydantic (data validation)

AI Providers:
├── openai (GPT-4o-mini)
├── google-generativeai (Gemini Flash)
└── custom MockAI (testing)

Utilities:
├── difflib (similarity checking)
├── numpy (percentile calculation)
└── tqdm (progress bars)

Optional:
├── sklearn (advanced similarity)
└── sentence-transformers (semantic embeddings)
```

---

## ✅ Success Criteria

1. **100% Coverage:** Alle 1500 Helden verarbeitet
2. **Zero Duplicates:** Keine identischen Namen/Bios
3. **Balanced Factions:** 30-40% pro Fraktion
4. **Legal Safety:** 0 Blacklist-Hits im Final Output
5. **Quality Bar:** < 5% "MANUAL_REVIEW" Flags
6. **Performance:** < 10 Minuten Gesamtlaufzeit

---

## 🎯 Next Steps

1. Run `hero_forge.py --mode=test` (100 heroes mit MockAI)
2. Review output quality
3. Run `hero_forge.py --mode=prod` (Full 1500 mit echter AI)
4. Manual review flagged heroes
5. Import `heroes_processed.json` in HeroRank App
6. Test in-game balance

---

**Status:** Ready for Implementation 🚀
**Estimated Completion:** 1-2 hours (development) + 10 minutes (execution)
