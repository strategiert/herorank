# 🎮 Hero Transformation - Local Execution Guide

## Quick Start

Run the transformation script locally with your AIMLAPI key:

```bash
python transform_heroes_AI.py \
  --input=src/data/superheroes.json \
  --output=heroes_transformed.json \
  --api-key=150586f61fa3480bbd6b713af2d603e0
```

## What This Does

✅ Transforms all 1531 Marvel/DC heroes into **completely original characters**
✅ Generates NEW names, descriptions, and abilities using AI (Gemini Flash)
✅ Outputs **HeroRank-compatible schema** (universe, tier, abilities, description)
✅ Validates against blacklist (no Marvel/DC references)
✅ Ensures uniqueness (no duplicate names or similar descriptions)

## Installation

Install required dependency:
```bash
pip install openai
```

## Expected Results

With real AI (vs Mock):
- **Mock Mode**: 99.8% manual review (limited random pool)
- **AI Mode**: ~5-15% manual review (true AI-generated uniqueness)

## Processing Time

- Mock mode: ~47 seconds for 1531 heroes
- AI mode: ~10-15 minutes (API rate limits + generation time)
- Cost: ~$0.10-0.30 USD for full run

## Output Schema

Each hero will have this structure:

```json
{
  "id": 1,
  "name": "Crimson Vanguard",
  "universe": "Marvel",
  "tier": "Cosmic",
  "power": 100,
  "image": "🌟",
  "color": "#FFD700",
  "abilities": [
    "Energy Manipulation",
    "Super Strength",
    "Flight",
    "Reality Warping"
  ],
  "description": "A powerful Cosmic-tier warrior from an alternate dimension...",
  "reason": "Cosmic-tier combatant with unique reality-bending powers",
  "stats": {
    "strength": 100,
    "speed": 100,
    "durability": 100,
    "intelligence": 100,
    "combat": 100
  }
}
```

## Manual Review

Heroes flagged for review will have:
- Name: `REVIEW_{id}_{originalName}`
- Abilities: `["NEEDS REVIEW"]`
- Description: `"[MANUAL REVIEW NEEDED] Original: {name}"`

These occur when:
1. AI generation fails after 5 retries
2. Blacklist validation fails
3. Name/description similarity too high

## Next Steps

After transformation completes:

1. Review any heroes flagged with `REVIEW_` prefix
2. Replace `src/data/superheroes.json` with `heroes_transformed.json`
3. Test the app: `npm run dev`
4. Build for production: `npm run build`

## Troubleshooting

**Network errors during API calls:**
- Script auto-retries up to 5 times per hero
- Progress is saved incrementally

**High review rate:**
- Normal in Mock mode (limited random pool)
- With AI should be <15%

**Out of memory:**
- Process heroes in batches using `--limit`:
  ```bash
  python transform_heroes_AI.py --limit=500 --output=batch1.json
  ```

## Test Run

Test with 10 heroes first:
```bash
python transform_heroes_AI.py \
  --limit=10 \
  --output=test_sample.json \
  --api-key=YOUR_KEY
```

Check the output:
```bash
cat test_sample.json
```

Once satisfied, run the full transformation!
