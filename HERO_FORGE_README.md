# 🛠️ HERO FORGE - Quick Start Guide

## 📋 Überblick

Hero Forge transformiert deine bestehende Heldendatenbank (1500 Marvel/DC Helden) in ein komplett originäres Sci-Fi IP namens "Infinite Arena".

**Was es macht:**
- ✅ Erstellt neue Namen, Geschichten und Zitate via AI
- ✅ Weist Helden zu Fraktionen zu (Terraguard/Cyber-Ops/Aero-Vanguard)
- ✅ Berechnet Rarity Tiers (Common/Rare/Epic/Legendary)
- ✅ Verhindert Copyright-Verstöße durch Blacklist
- ✅ Garantiert einzigartige Geschichten durch Similarity-Check
- ✅ Skaliert Stats basierend auf Rarity

---

## 🚀 Installation

### 1. Installiere Dependencies

```bash
cd /home/user/herorank
pip install -r requirements_hero_forge.txt
```

### 2. (Optional) Installiere AI Provider

**Für OpenAI GPT-4o-mini:**
```bash
pip install openai
export OPENAI_API_KEY="sk-your-key-here"
```

**Für Google Gemini Flash:**
```bash
pip install google-generativeai
export GEMINI_API_KEY="your-key-here"
```

---

## 🎮 Nutzung

### Test Mode (EMPFOHLEN für ersten Run)

Teste das Script mit **Mock AI** (keine Kosten, keine API Keys nötig):

```bash
# Verarbeite die ersten 100 Helden mit Mock-Daten
python hero_forge.py --mode=test --limit=100
```

**Output:** `heroes_processed.json` mit 100 generierten Helden

### Production Mode - OpenAI

```bash
# Vollständige Verarbeitung aller Helden mit GPT-4o-mini
python hero_forge.py \
  --mode=prod \
  --provider=openai \
  --api-key="sk-your-key" \
  --input=heroes_raw.json \
  --output=heroes_processed.json \
  --rate-limit=10
```

**Kosten:** Ca. $0.10-0.15 für alle 1500 Helden ✨

### Production Mode - Gemini

```bash
# Vollständige Verarbeitung mit Gemini Flash (oft kostenlos!)
python hero_forge.py \
  --mode=prod \
  --provider=gemini \
  --api-key="your-gemini-key" \
  --input=heroes_raw.json \
  --output=heroes_processed.json
```

---

## 📊 Command Line Optionen

| Parameter | Default | Beschreibung |
|-----------|---------|--------------|
| `--input` | `heroes_raw.json` | Input JSON Datei mit Roh-Helden |
| `--output` | `heroes_processed.json` | Output JSON Datei |
| `--mode` | `test` | `test` (Mock AI) oder `prod` (echte AI) |
| `--provider` | `mock` | `mock`, `openai`, oder `gemini` |
| `--api-key` | - | API Key für AI Provider |
| `--limit` | - | Limitiere Anzahl Helden (für Tests) |
| `--rate-limit` | `10` | Max. gleichzeitige API Requests |
| `--similarity-threshold` | `0.60` | Bio-Ähnlichkeit (0-1, höher = strenger) |

---

## 📁 Input Format (heroes_raw.json)

Deine Input-Datei sollte so aussehen:

```json
[
  {
    "id": 1,
    "name": "Spider-Man",
    "slug": "spider-man",
    "powerstats": {
      "strength": 55,
      "speed": 67,
      "power": 74,
      "durability": 75,
      "combat": 85,
      "intelligence": 90
    },
    "appearance": {...},
    "biography": {...},
    "images": {
      "sm": "/heroes/1.jpg"
    }
  },
  ...
]
```

**Wichtig:** Die Felder `id`, `name`, `powerstats`, und `images` sind erforderlich.

---

## 📤 Output Format (heroes_processed.json)

Das generierte Output enthält:

```json
[
  {
    "id": 1,
    "originalName": "Spider-Man",
    "name": "Arachno-Striker",
    "faction": "Aero-Vanguard",
    "rarity": "Epic",
    "bio": "Former NEXUS Corp test pilot merged with experimental nanofiber suit. Fights corporate tyranny with agility and precision.",
    "quote": "They thought they could control me. They were wrong.",
    "stats": {
      "strength": 69,
      "speed": 84,
      "power": 93,
      "durability": 94,
      "combat": 106,
      "intelligence": 112
    },
    "combatScore": 88.45,
    "image": "/heroes/1.jpg",
    "needsManualReview": false,
    "retryCount": 0
  },
  ...
]
```

---

## 🔧 Erweiterte Features

### 1. Blacklist Anpassen

Öffne `hero_forge.py` und editiere die `BLACKLIST` Konstante (Zeile ~60):

```python
BLACKLIST = [
    # Füge eigene Begriffe hinzu
    'mein-begriff', 'anderer-begriff',
    # Bestehende Einträge...
]
```

### 2. Similarity Threshold Anpassen

Strenger (weniger ähnliche Bios erlaubt):
```bash
python hero_forge.py --similarity-threshold=0.70
```

Lockerer (mehr Variation erlaubt):
```bash
python hero_forge.py --similarity-threshold=0.50
```

### 3. Fraktions-Balance Anpassen

Editiere in `hero_forge.py` die `assign_faction` Methode (Zeile ~420):

```python
if current_ratio < 0.40:  # Ändere 0.40 zu 0.35 für strengere Balance
```

### 4. Rarity Distribution Ändern

Editiere `_compute_rarity_thresholds` (Zeile ~390):

```python
return {
    Rarity.LEGENDARY: np.percentile(scores, 98),  # Top 2% statt 5%
    Rarity.EPIC: np.percentile(scores, 90),       # Top 10% statt 15%
    # ...
}
```

---

## 📈 Pipeline Statistiken

Nach dem Run siehst du folgende Stats:

```
✅ PIPELINE COMPLETE
============================================================

📊 Processing Stats:
  Total Processed: 1500
  Manual Review Needed: 23 (1.5%)
  Blacklist Hits (retried): 45
  Similarity Retries: 128

🎯 Faction Distribution:
  Terraguard: 487 (32.5%)
  Cyber-Ops: 512 (34.1%)
  Aero-Vanguard: 501 (33.4%)

⭐ Rarity Distribution:
  Legendary: 75 (5.0%)
  Epic: 150 (10.0%)
  Rare: 375 (25.0%)
  Common: 900 (60.0%)
```

---

## 🐛 Troubleshooting

### Problem: "Input file not found"

**Lösung:** Stelle sicher, dass `heroes_raw.json` im gleichen Verzeichnis ist:
```bash
ls heroes_raw.json  # Sollte die Datei anzeigen
```

### Problem: "API key required"

**Lösung:** Setze den API Key:
```bash
export OPENAI_API_KEY="sk-..."
# ODER
python hero_forge.py --api-key="sk-..."
```

### Problem: Zu viele "Manual Review" Flags

**Lösung:**
1. Reduziere `similarity-threshold`: `--similarity-threshold=0.50`
2. Erhöhe Rate Limit: `--rate-limit=5` (langsamer aber stabiler)
3. Checke AI Provider - manchmal liefert Gemini bessere Variation

### Problem: Script zu langsam

**Lösung:**
```bash
# Erhöhe Parallelität (Achtung: API Rate Limits beachten!)
python hero_forge.py --rate-limit=20
```

### Problem: Fraktions-Balance schlecht

**Lösung:** Das Script balanciert automatisch. Falls eine Fraktion trotzdem > 40%:
- Stelle sicher, dass alle `powerstats` korrekt sind
- Prüfe ob viele Helden ähnliche Stats haben

---

## 🎯 Integration in HeroRank App

### 1. Verarbeite Helden

```bash
python hero_forge.py --mode=prod --provider=openai --api-key="sk-..."
```

### 2. Ersetze alte Daten

```bash
# Backup erstellen
cp src/data/all-heroes.json src/data/all-heroes.backup.json

# Neue Daten kopieren
cp heroes_processed.json src/data/all-heroes.json
```

### 3. App neu starten

```bash
npm run dev
```

### 4. Checke die Helden

- Öffne http://localhost:5173
- Gehe zu Arena Page
- Öffne Hero Selection
- Du solltest jetzt neue Namen/Bios/Fraktionen sehen!

---

## 💡 Best Practices

### Für beste Ergebnisse:

1. **Starte mit Test Mode**
   ```bash
   python hero_forge.py --mode=test --limit=50
   ```
   Prüfe die Qualität bevor du alle 1500 verarbeitest.

2. **Nutze GPT-4o-mini für Production**
   - Beste Qualität
   - Sehr günstig (~$0.10 total)
   - Zuverlässiger als Gemini

3. **Setze Rate Limit konservativ**
   - OpenAI: `--rate-limit=10`
   - Gemini: `--rate-limit=5`
   - Verhindert API Timeouts

4. **Prüfe Manual Review Helden**
   ```bash
   cat heroes_processed.json | jq '.[] | select(.needsManualReview == true)'
   ```

5. **Sichere Output regelmäßig**
   ```bash
   cp heroes_processed.json heroes_processed.backup.json
   ```

---

## 🎨 Customization Beispiele

### Dunklere Bios (Cyberpunk Noir)

Editiere `OpenAIProvider.generate_hero_content` Prompt:

```python
prompt = f"""You are a Sci-Fi hero designer for "Infinite Arena".

TONE: Dark cyberpunk noir. Dystopian. Gritty survival stories.

...
"""
```

### Humorvolle Quotes

```python
3. QUOTE: One memorable FUNNY battle quote with dark humor (max 15 words)
```

### Andere Fraktionen

Editiere `Faction` Enum und passe `assign_faction` an:

```python
class Faction(str, Enum):
    SHADOW_GUILD = "Shadow-Guild"
    NEON_LEGION = "Neon-Legion"
    VOID_STRIDERS = "Void-Striders"
```

---

## ❓ FAQ

**Q: Wie lange dauert die Verarbeitung?**
A:
- Mock Mode (Test): ~2 Minuten für 1500 Helden
- OpenAI: ~6-8 Minuten für 1500 Helden (mit rate-limit=10)
- Gemini: ~10-15 Minuten (langsamere API)

**Q: Kann ich eigene AI Models nutzen?**
A: Ja! Erstelle eine neue Klasse die von `AIProvider` erbt:

```python
class CustomAIProvider(AIProvider):
    async def generate_hero_content(self, ...):
        # Deine Implementierung
        pass
```

**Q: Was passiert bei API Fehlern?**
A: Das Script retried automatisch bis zu 3x. Bei dauerhaftem Fehler wird Hero mit `needsManualReview: true` markiert.

**Q: Kann ich die Pipeline pausieren?**
A: Ja, drücke `Ctrl+C`. Der Output wird gespeichert für alle bisher verarbeiteten Helden. Beim nächsten Run nutze `--input` mit den bereits verarbeiteten Helden.

**Q: Woher bekomme ich API Keys?**
A:
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://makersuite.google.com/app/apikey

---

## 🚀 Ready to Transform!

```bash
# Starte mit diesem Command:
python hero_forge.py --mode=test --limit=100

# Wenn zufrieden, run production:
python hero_forge.py --mode=prod --provider=openai --api-key="YOUR_KEY"
```

**Viel Erfolg mit deinem Infinite Arena IP! 🎮✨**
