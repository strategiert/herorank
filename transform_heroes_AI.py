#!/usr/bin/env python3
"""
🎮 HERO TRANSFORMATION - AI-Powered
Transforms Marvel/DC heroes into original characters with AI-generated content
Outputs HeroRank-compatible schema
"""

import asyncio
import json
import random
from pathlib import Path
from typing import List, Dict, Optional, Set
from difflib import SequenceMatcher

# Tier colors
TIER_COLORS = {
    'Cosmic': '#FFD700',
    'S': '#FF6B6B',
    'A': '#4ECDC4',
    'B': '#95E1D3',
    'C': '#A8E6CF',
    'D': '#DCEDC1'
}

# Blacklist
BLACKLIST = [
    'stark', 'tony', 'rogers', 'steve', 'banner', 'bruce',
    'parker', 'peter', 'wayne', 'bruce', 'kent', 'clark',
    'marvel', 'dc', 'avenger', 'justice', 'league'
]

def check_blacklist(text: str) -> bool:
    """Check if text contains blacklisted terms"""
    text_lower = text.lower()
    return not any(term in text_lower for term in BLACKLIST)

def check_similarity(text1: str, text2: str) -> float:
    """Calculate similarity between two texts"""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

async def generate_with_ai(hero_id: int, universe: str, tier: str, stats: Dict, api_key: str = None):
    """Generate hero content with AI (OpenAI/AIMLAPI)"""

    # For now, use Mock (you can add OpenAI/AIMLAPI here)
    if not api_key:
        # MOCK MODE
        prefixes = ['Void', 'Storm', 'Crimson', 'Shadow', 'Nova', 'Quantum', 'Eclipse', 'Titan', 'Nebula', 'Vortex']
        suffixes = ['Walker', 'Bringer', 'Guard', 'Sentinel', 'Prime', 'Vanguard', 'Striker', 'Reaper', 'Blade']

        name = f"{random.choice(prefixes)} {random.choice(suffixes)}"

        descriptions = [
            f"A powerful {tier}-tier warrior from the {universe} universe. Commands reality-bending abilities and strategic combat mastery.",
            f"Elite {tier}-level champion with extraordinary powers. Dedicated to protecting cosmic balance and defending the innocent.",
            f"Legendary figure whose abilities place them at {tier}-tier. Combines devastating power with tactical brilliance."
        ]

        abilities_pool = [
            "Energy Manipulation", "Super Strength", "Enhanced Speed", "Flight",
            "Durability Enhancement", "Combat Mastery", "Tactical Genius", "Rapid Regeneration",
            "Force Field Generation", "Telepathic Powers", "Reality Warping", "Time Manipulation",
            "Dimensional Travel", "Cosmic Awareness", "Energy Projection", "Teleportation"
        ]

        abilities = random.sample(abilities_pool, random.randint(4, 6))

        reason = f"{tier}-tier combatant with unique {random.choice(['reality', 'cosmic', 'dimensional', 'temporal'])} powers"

        return {
            'name': name,
            'description': random.choice(descriptions),
            'abilities': abilities,
            'reason': reason
        }

    else:
        # AI MODE - Add your OpenAI/AIMLAPI code here
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            base_url="https://api.aimlapi.com/v1",
            api_key=api_key
        )

        prompt = f"""Create an original sci-fi hero (NO Marvel/DC references!):

Tier: {tier}
Universe: {universe}
Stats: {json.dumps(stats)}

Generate JSON:
{{
  "name": "2-3 word creative name",
  "description": "2-3 sentences about origin and powers (40-80 words)",
  "abilities": ["ability1", "ability2", "ability3", "ability4"],
  "reason": "Why they are {tier}-tier (15-30 words)"
}}"""

        response = await client.chat.completions.create(
            model="google/gemini-3-flash-preview",
            messages=[
                {"role": "system", "content": "You are a creative hero designer. Respond with JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.9,
            max_tokens=300
        )

        content = response.choices[0].message.content.strip()

        # Extract JSON
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()

        return json.loads(content)

async def transform_hero(hero: Dict, used_names: Set, used_descriptions: Set, api_key: str = None) -> Dict:
    """Transform a single hero"""

    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            # Generate content
            content = await generate_with_ai(
                hero['id'],
                hero.get('universe', 'Marvel'),
                hero.get('tier', 'B'),
                hero.get('stats', {}),
                api_key
            )

            # Validate
            if not check_blacklist(content['name']):
                continue

            if content['name'] in used_names:
                continue

            # Check description similarity
            is_unique = True
            for existing_desc in used_descriptions:
                if check_similarity(content['description'], existing_desc) > 0.6:
                    is_unique = False
                    break

            if not is_unique:
                continue

            # Success!
            used_names.add(content['name'])
            used_descriptions.add(content['description'])

            return {
                'id': hero['id'],
                'name': content['name'],
                'universe': hero.get('universe', 'Marvel'),
                'tier': hero.get('tier', 'B'),
                'power': hero.get('power', 50),
                'image': hero.get('image', '⚡'),
                'color': hero.get('color', TIER_COLORS.get(hero.get('tier', 'B'), '#95E1D3')),
                'abilities': content['abilities'],
                'description': content['description'],
                'reason': content['reason'],
                'stats': hero.get('stats', {
                    'strength': 50,
                    'speed': 50,
                    'durability': 50,
                    'intelligence': 50,
                    'combat': 50
                })
            }

        except Exception as e:
            if attempt == max_attempts - 1:
                # Fallback on exception
                return {
                    'id': hero['id'],
                    'name': f"REVIEW_{hero['id']}_{hero.get('name', 'Unknown')[:20]}",
                    'universe': hero.get('universe', 'Marvel'),
                    'tier': hero.get('tier', 'B'),
                    'power': hero.get('power', 50),
                    'image': hero.get('image', '⚡'),
                    'color': hero.get('color', TIER_COLORS.get(hero.get('tier', 'B'), '#95E1D3')),
                    'abilities': ['NEEDS REVIEW'],
                    'description': f"[MANUAL REVIEW NEEDED] Original: {hero.get('name', 'Unknown')}",
                    'reason': "NEEDS REVIEW",
                    'stats': hero.get('stats', {'strength': 50, 'speed': 50, 'durability': 50, 'intelligence': 50, 'combat': 50})
                }
            continue

    # Fallback if all attempts exhausted (validation failures)
    return {
        'id': hero['id'],
        'name': f"REVIEW_{hero['id']}_{hero.get('name', 'Unknown')[:20]}",
        'universe': hero.get('universe', 'Marvel'),
        'tier': hero.get('tier', 'B'),
        'power': hero.get('power', 50),
        'image': hero.get('image', '⚡'),
        'color': hero.get('color', TIER_COLORS.get(hero.get('tier', 'B'), '#95E1D3')),
        'abilities': ['NEEDS REVIEW'],
        'description': f"[MANUAL REVIEW NEEDED] Original: {hero.get('name', 'Unknown')}",
        'reason': "NEEDS REVIEW",
        'stats': hero.get('stats', {'strength': 50, 'speed': 50, 'durability': 50, 'intelligence': 50, 'combat': 50})
    }

async def main():
    import argparse

    parser = argparse.ArgumentParser(description='Transform heroes with AI')
    parser.add_argument('--input', default='src/data/superheroes.json')
    parser.add_argument('--output', default='heroes_transformed.json')
    parser.add_argument('--api-key', help='AIMLAPI/OpenAI API key (optional, uses mock if not provided)')
    parser.add_argument('--limit', type=int, help='Limit number of heroes')
    args = parser.parse_args()

    # Load
    input_path = Path(args.input)
    heroes = json.loads(input_path.read_text())

    if args.limit:
        heroes = heroes[:args.limit]
        print(f"[i] Processing first {args.limit} heroes")

    print(f"[*] Loading {len(heroes)} heroes...")
    print(f"[*] Mode: {'AI' if args.api_key else 'MOCK'}")

    # Transform
    used_names = set()
    used_descriptions = set()
    transformed = []

    print(f"[*] Transforming...")
    for i, hero in enumerate(heroes):
        if i % 100 == 0:
            print(f"[i] Progress: {i}/{len(heroes)}")

        new_hero = await transform_hero(hero, used_names, used_descriptions, args.api_key)
        if new_hero:  # Only add if not None
            transformed.append(new_hero)

    # Save
    output_path = Path(args.output)
    output_path.write_text(
        json.dumps(transformed, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )

    print(f"\n[OK] Transformed {len(transformed)} heroes!")
    print(f"[OK] Saved to: {output_path}")

    if transformed:
        # Stats
        review_needed = sum(1 for h in transformed if 'REVIEW' in h['name'])
        print(f"\n[i] Manual review needed: {review_needed} ({review_needed/len(transformed)*100:.1f}%)")

        # Sample
        valid_heroes = [h for h in transformed if 'REVIEW' not in h['name']]
        if valid_heroes:
            sample = random.choice(valid_heroes)
            print(f"\n[~] Sample:")
            print(f"  Name: {sample['name']}")
            print(f"  Tier: {sample['tier']} | Universe: {sample['universe']}")
            print(f"  Description: {sample['description']}")
            print(f"  Abilities: {', '.join(sample['abilities'][:3])}")

if __name__ == '__main__':
    asyncio.run(main())
