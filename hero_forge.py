#!/usr/bin/env python3
"""
🛠️ HERO FORGE: AI-Powered Hero Transformation Pipeline
Transforms 1500 licensed heroes into original Sci-Fi IP characters.
"""

import asyncio
import json
import random
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Literal
from enum import Enum

import numpy as np
from pydantic import BaseModel, Field, validator
from tqdm.asyncio import tqdm


# ============================================================================
# DATA MODELS
# ============================================================================

class Faction(str, Enum):
    TERRAGUARD = "Terraguard"
    CYBER_OPS = "Cyber-Ops"
    AERO_VANGUARD = "Aero-Vanguard"


class Rarity(str, Enum):
    COMMON = "Common"
    RARE = "Rare"
    EPIC = "Epic"
    LEGENDARY = "Legendary"


class HeroStats(BaseModel):
    strength: int = Field(ge=0, le=100)
    speed: int = Field(ge=0, le=100)
    power: int = Field(ge=0, le=100)
    durability: int = Field(ge=0, le=100)
    combat: int = Field(ge=0, le=100)
    intelligence: int = Field(ge=0, le=100)

    def compute_combat_score(self) -> float:
        """Compute weighted combat score."""
        return (
            self.strength * 0.2 +
            self.speed * 0.15 +
            self.power * 0.25 +
            self.durability * 0.2 +
            self.combat * 0.15 +
            self.intelligence * 0.05
        )


class RawHero(BaseModel):
    id: int
    name: str
    universe: str
    tier: str
    power: int
    image: str = "⚡"  # Default emoji if missing
    stats: Dict[str, Optional[int]]
    abilities: Optional[List[str]] = None
    description: Optional[str] = None

    def to_stats(self) -> HeroStats:
        """Extract stats from stats dict, handling None values."""
        s = self.stats
        return HeroStats(
            strength=s.get('strength') or 50,
            speed=s.get('speed') or 50,
            power=s.get('power') or self.power or 50,
            durability=s.get('durability') or 50,
            combat=s.get('combat') or 50,
            intelligence=s.get('intelligence') or 50
        )


class AIGeneratedContent(BaseModel):
    name: str = Field(min_length=3, max_length=50)
    bio: str = Field(min_length=20, max_length=200)
    quote: str = Field(min_length=5, max_length=100)


class ProcessedHero(BaseModel):
    id: int
    originalName: str
    name: str
    faction: Faction
    rarity: Rarity
    bio: str
    quote: str
    stats: HeroStats
    combatScore: float
    image: str
    needsManualReview: bool = False
    retryCount: int = 0


# ============================================================================
# BLACKLIST & VALIDATION
# ============================================================================

BLACKLIST = [
    # Marvel
    'stark', 'tony', 'rogers', 'steve', 'banner', 'bruce',
    'parker', 'peter', 'thor', 'odinson', 'barton', 'clint',
    'romanoff', 'natasha', 'marvel', 'avenger', 'mutant',
    'xavier', 'charles', 'magneto', 'eric', 'lehnsherr', 'weapon-x',
    'wolverine', 'logan', 'jean', 'grey', 'cyclops', 'summers',
    'storm', 'munroe', 'rogue', 'gambit', 'beast', 'hank',

    # DC
    'wayne', 'bruce', 'kent', 'clark', 'diana', 'prince',
    'allen', 'barry', 'jordan', 'hal', 'gotham', 'metropolis',
    'batman', 'superman', 'wonder', 'flash', 'lantern',
    'krypton', 'kryptonian', 'amazon', 'themyscira',
    'aquaman', 'arthur', 'curry', 'cyborg', 'victor', 'stone',

    # Generic Protected
    'spider', 'iron', 'captain', 'america', 'incredible',
    'amazing', 'fantastic', 'justice', 'league', 'squadron',
    'wakanda', 'asgard', 'bifrost', 'mjolnir', 'vibranium'
]


def check_blacklist(text: str) -> bool:
    """Check if text contains any blacklisted terms."""
    text_lower = text.lower()
    for term in BLACKLIST:
        if term in text_lower:
            return False
    return True


# ============================================================================
# LORE GUARDIAN - UNIQUENESS VALIDATOR
# ============================================================================

class LoreGuardian:
    """Ensures all generated bios are unique."""

    def __init__(self, similarity_threshold: float = 0.60):
        self.existing_bios: List[str] = []
        self.existing_names: List[str] = []
        self.similarity_threshold = similarity_threshold

    def check_name_uniqueness(self, name: str) -> bool:
        """Check if name is unique."""
        name_lower = name.lower()
        for existing in self.existing_names:
            if name_lower == existing.lower():
                return False
            # Check very high similarity
            if self._calculate_similarity(name_lower, existing.lower()) > 0.85:
                return False
        return True

    def check_bio_uniqueness(self, bio: str) -> Tuple[bool, float, Optional[str]]:
        """
        Check if bio is sufficiently unique.
        Returns: (is_unique, similarity_score, conflicting_bio)
        """
        for existing in self.existing_bios:
            similarity = self._calculate_similarity(bio, existing)
            if similarity > self.similarity_threshold:
                return False, similarity, existing
        return True, 0.0, None

    def add_content(self, name: str, bio: str):
        """Register name and bio as used."""
        self.existing_names.append(name)
        self.existing_bios.append(bio)

    @staticmethod
    def _calculate_similarity(text1: str, text2: str) -> float:
        """Calculate similarity ratio between two texts."""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


# ============================================================================
# AI PROVIDER INTERFACE
# ============================================================================

class AIProvider:
    """Base class for AI content generation."""

    async def generate_hero_content(
        self,
        stats: HeroStats,
        faction: Faction,
        rarity: Rarity,
        retry_context: Optional[str] = None
    ) -> AIGeneratedContent:
        raise NotImplementedError


class MockAIProvider(AIProvider):
    """Mock provider for testing without API costs."""

    PREFIXES = ['Vortex', 'Quantum', 'Neon', 'Cyber', 'Titanium', 'Plasma',
                'Volt', 'Nexus', 'Hyper', 'Omega', 'Delta', 'Echo', 'Phantom']
    SUFFIXES = ['Striker', 'Warden', 'Reaper', 'Sentinel', 'Vanguard',
                'Ronin', 'Shade', 'Fist', 'Blade', 'Storm', 'Core', 'Prime']

    async def generate_hero_content(
        self,
        stats: HeroStats,
        faction: Faction,
        rarity: Rarity,
        retry_context: Optional[str] = None
    ) -> AIGeneratedContent:
        """Generate mock content."""
        await asyncio.sleep(0.1)  # Simulate API delay

        name = f"{random.choice(self.PREFIXES)} {random.choice(self.SUFFIXES)}"

        bios = [
            f"Elite operative from Sector {random.randint(1, 99)}. Specializes in {faction.value} combat tactics.",
            f"Former {faction.value} commander turned mercenary. Known for ruthless efficiency in battle.",
            f"Genetically enhanced soldier. Survived the {faction.value} Enhancement Program with unprecedented results.",
            f"Last survivor of the {faction.value} Initiative. Fights to prevent the same fate for others.",
        ]

        quotes = [
            "Victory is the only acceptable outcome.",
            "They trained me to be a weapon. I chose to be a warrior.",
            "In the arena, there are no second chances.",
            "Power means nothing without purpose.",
        ]

        return AIGeneratedContent(
            name=name,
            bio=random.choice(bios),
            quote=random.choice(quotes)
        )


class OpenAIProvider(AIProvider):
    """OpenAI GPT-4o-mini provider."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            import openai
            self.client = openai.AsyncOpenAI(api_key=api_key)
        except ImportError:
            raise ImportError("Install openai: pip install openai")

    async def generate_hero_content(
        self,
        stats: HeroStats,
        faction: Faction,
        rarity: Rarity,
        retry_context: Optional[str] = None
    ) -> AIGeneratedContent:
        """Generate content using OpenAI."""

        faction_descriptions = {
            Faction.TERRAGUARD: "ground-based tank with high defense and strength",
            Faction.CYBER_OPS: "tech specialist with high damage and intelligence",
            Faction.AERO_VANGUARD: "high-speed aerial combatant with evasion"
        }

        prompt = f"""You are a Sci-Fi hero designer for "Infinite Arena", a futuristic battle game.

CONSTRAINTS:
- NO Marvel/DC references (no Wayne, Stark, Parker, Rogers, etc.)
- NO real-world locations or brands
- Military/cyberpunk tone
- Must fit faction: {faction.value} ({faction_descriptions[faction]})
- Rarity: {rarity.value}

HERO PROFILE:
Combat Score: {stats.compute_combat_score():.1f}
Faction: {faction.value}
Rarity: {rarity.value}
Dominant Stats: Power={stats.power}, Speed={stats.speed}, Durability={stats.durability}

{retry_context or ''}

Generate a unique hero:
1. NAME: Military-style callsign (2-3 words, e.g., "Vortex Striker", "Iron Sentinel")
2. BIO: 2-sentence backstory (30-50 words, focus on origin and motivation)
3. QUOTE: One battle quote (max 15 words)

Respond ONLY with valid JSON:
{{"name": "...", "bio": "...", "quote": "..."}}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a creative sci-fi hero designer. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,
                max_tokens=250
            )

            content = response.choices[0].message.content.strip()

            # Extract JSON if wrapped in markdown
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()

            data = json.loads(content)
            return AIGeneratedContent(**data)

        except Exception as e:
            raise Exception(f"OpenAI generation failed: {e}")


class AIMLAPIProvider(AIProvider):
    """AIMLAPI Gemini 3 Flash provider (OpenAI-compatible API)."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            import openai
            self.client = openai.AsyncOpenAI(
                base_url="https://api.aimlapi.com/v1",
                api_key=api_key
            )
        except ImportError:
            raise ImportError("Install openai: pip install openai")

    async def generate_hero_content(
        self,
        stats: HeroStats,
        faction: Faction,
        rarity: Rarity,
        retry_context: Optional[str] = None
    ) -> AIGeneratedContent:
        """Generate content using AIMLAPI Gemini 3 Flash."""

        faction_descriptions = {
            Faction.TERRAGUARD: "ground-based tank with high defense and strength",
            Faction.CYBER_OPS: "tech specialist with high damage and intelligence",
            Faction.AERO_VANGUARD: "high-speed aerial combatant with evasion"
        }

        prompt = f"""You are a Sci-Fi hero designer for "Infinite Arena", a futuristic battle game.

CONSTRAINTS:
- NO Marvel/DC references (no Wayne, Stark, Parker, Rogers, etc.)
- NO real-world locations or brands
- Military/cyberpunk tone
- Must fit faction: {faction.value} ({faction_descriptions[faction]})
- Rarity: {rarity.value}

HERO PROFILE:
Combat Score: {stats.compute_combat_score():.1f}
Faction: {faction.value}
Rarity: {rarity.value}
Dominant Stats: Power={stats.power}, Speed={stats.speed}, Durability={stats.durability}

{retry_context or ''}

Generate a unique hero:
1. NAME: Military-style callsign (2-3 words, e.g., "Vortex Striker", "Iron Sentinel")
2. BIO: 2-sentence backstory (30-50 words, focus on origin and motivation)
3. QUOTE: One battle quote (max 15 words)

Respond ONLY with valid JSON:
{{"name": "...", "bio": "...", "quote": "..."}}"""

        try:
            response = await self.client.chat.completions.create(
                model="google/gemini-3-flash-preview",
                messages=[
                    {"role": "system", "content": "You are a creative sci-fi hero designer. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,
                max_tokens=250
            )

            content = response.choices[0].message.content.strip()

            # Extract JSON if wrapped in markdown
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()

            data = json.loads(content)
            return AIGeneratedContent(**data)

        except Exception as e:
            raise Exception(f"AIMLAPI generation failed: {e}")


class GeminiProvider(AIProvider):
    """Google Gemini Flash provider."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except ImportError:
            raise ImportError("Install google-generativeai: pip install google-generativeai")

    async def generate_hero_content(
        self,
        stats: HeroStats,
        faction: Faction,
        rarity: Rarity,
        retry_context: Optional[str] = None
    ) -> AIGeneratedContent:
        """Generate content using Gemini."""

        prompt = f"""Create a unique sci-fi hero for a battle arena game.

Faction: {faction.value}
Rarity: {rarity.value}
Combat Score: {stats.compute_combat_score():.1f}

{retry_context or ''}

Rules:
- NO Marvel/DC references
- Military/cyberpunk style
- Respond with JSON only: {{"name": "...", "bio": "...", "quote": "..."}}

Generate unique name (2-3 words), short bio (30-50 words), and battle quote (max 15 words)."""

        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            content = response.text.strip()

            # Extract JSON
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()

            data = json.loads(content)
            return AIGeneratedContent(**data)

        except Exception as e:
            raise Exception(f"Gemini generation failed: {e}")


# ============================================================================
# STAT PROCESSING & FACTION ASSIGNMENT
# ============================================================================

class StatProcessor:
    """Handles stat normalization, rarity assignment, and faction balancing."""

    def __init__(self, heroes: List[RawHero]):
        self.heroes = heroes
        self.combat_scores = self._compute_all_scores()
        self.rarity_thresholds = self._compute_rarity_thresholds()
        self.faction_counts = {f: 0 for f in Faction}

    def _compute_all_scores(self) -> List[float]:
        """Compute combat scores for all heroes."""
        return [hero.to_stats().compute_combat_score() for hero in self.heroes]

    def _compute_rarity_thresholds(self) -> Dict[Rarity, float]:
        """Compute percentile thresholds for rarity tiers."""
        scores = np.array(self.combat_scores)
        return {
            Rarity.LEGENDARY: np.percentile(scores, 95),
            Rarity.EPIC: np.percentile(scores, 85),
            Rarity.RARE: np.percentile(scores, 60),
            Rarity.COMMON: 0
        }

    def assign_rarity(self, combat_score: float) -> Rarity:
        """Assign rarity based on combat score percentile."""
        if combat_score >= self.rarity_thresholds[Rarity.LEGENDARY]:
            return Rarity.LEGENDARY
        elif combat_score >= self.rarity_thresholds[Rarity.EPIC]:
            return Rarity.EPIC
        elif combat_score >= self.rarity_thresholds[Rarity.RARE]:
            return Rarity.RARE
        else:
            return Rarity.COMMON

    def assign_faction(self, stats: HeroStats) -> Faction:
        """
        Assign faction based on dominant stats with balancing.
        Ensures no faction exceeds 40% of total heroes.
        """
        # Calculate faction scores
        tank_score = (stats.durability * 2 + stats.strength * 1.5) / 3.5
        tech_score = (stats.power * 2 + stats.intelligence * 1.5) / 3.5
        speed_score = (stats.speed * 2 + stats.combat * 1.5) / 3.5

        scores = {
            Faction.TERRAGUARD: tank_score,
            Faction.CYBER_OPS: tech_score,
            Faction.AERO_VANGUARD: speed_score
        }

        # Sort by score
        sorted_factions = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        # Check balancing
        total_assigned = sum(self.faction_counts.values())

        for faction, score in sorted_factions:
            if total_assigned == 0:
                # First assignment
                self.faction_counts[faction] += 1
                return faction

            current_ratio = self.faction_counts[faction] / total_assigned
            if current_ratio < 0.40:  # Allow up to 40%
                self.faction_counts[faction] += 1
                return faction

        # Fallback: assign to least populated faction
        min_faction = min(self.faction_counts, key=self.faction_counts.get)
        self.faction_counts[min_faction] += 1
        return min_faction

    def scale_stats_by_rarity(self, stats: HeroStats, rarity: Rarity) -> HeroStats:
        """Apply rarity multipliers to stats."""
        multipliers = {
            Rarity.LEGENDARY: 1.5,
            Rarity.EPIC: 1.25,
            Rarity.RARE: 1.0,
            Rarity.COMMON: 0.8
        }

        mult = multipliers[rarity]

        return HeroStats(
            strength=min(100, int(stats.strength * mult)),
            speed=min(100, int(stats.speed * mult)),
            power=min(100, int(stats.power * mult)),
            durability=min(100, int(stats.durability * mult)),
            combat=min(100, int(stats.combat * mult)),
            intelligence=min(100, int(stats.intelligence * mult))
        )


# ============================================================================
# MAIN PIPELINE
# ============================================================================

class HeroForge:
    """Main pipeline orchestrator."""

    def __init__(
        self,
        ai_provider: AIProvider,
        max_retries: int = 3,
        rate_limit: int = 10,
        similarity_threshold: float = 0.60
    ):
        self.ai_provider = ai_provider
        self.max_retries = max_retries
        self.rate_limit = rate_limit
        self.semaphore = asyncio.Semaphore(rate_limit)
        self.lore_guardian = LoreGuardian(similarity_threshold)

        self.stats_total = {
            'processed': 0,
            'manual_review': 0,
            'blacklist_hits': 0,
            'similarity_retries': 0
        }

    async def process_hero(
        self,
        raw_hero: RawHero,
        processor: StatProcessor
    ) -> ProcessedHero:
        """Process a single hero through the complete pipeline."""

        async with self.semaphore:  # Rate limiting
            stats = raw_hero.to_stats()
            combat_score = stats.compute_combat_score()
            rarity = processor.assign_rarity(combat_score)
            faction = processor.assign_faction(stats)
            scaled_stats = processor.scale_stats_by_rarity(stats, rarity)

            # AI Content Generation with validation loop
            content = None
            retry_count = 0
            needs_review = False

            for attempt in range(self.max_retries):
                try:
                    # Generate content
                    retry_context = None
                    if attempt > 0:
                        retry_context = "PREVIOUS ATTEMPT FAILED VALIDATION. Generate completely different content."

                    content = await self.ai_provider.generate_hero_content(
                        scaled_stats, faction, rarity, retry_context
                    )

                    # Validation 1: Blacklist check
                    if not check_blacklist(content.name):
                        self.stats_total['blacklist_hits'] += 1
                        retry_count += 1
                        continue

                    if not check_blacklist(content.bio):
                        self.stats_total['blacklist_hits'] += 1
                        retry_count += 1
                        continue

                    # Validation 2: Name uniqueness
                    if not self.lore_guardian.check_name_uniqueness(content.name):
                        retry_count += 1
                        continue

                    # Validation 3: Bio uniqueness
                    is_unique, similarity, conflict = self.lore_guardian.check_bio_uniqueness(content.bio)
                    if not is_unique:
                        self.stats_total['similarity_retries'] += 1
                        retry_count += 1
                        # Add context for next retry
                        retry_context = f"Bio was too similar ({similarity:.0%}) to: '{conflict[:100]}...'. Create completely different story."
                        continue

                    # All validations passed!
                    self.lore_guardian.add_content(content.name, content.bio)
                    break

                except Exception as e:
                    retry_count += 1
                    if attempt == self.max_retries - 1:
                        # Last attempt failed
                        needs_review = True
                        content = AIGeneratedContent(
                            name=f"REVIEW_{raw_hero.id}_{raw_hero.name[:20]}",
                            bio=f"[MANUAL REVIEW NEEDED] Original: {raw_hero.name}",
                            quote="NEEDS REVIEW"
                        )

            if content is None or needs_review:
                needs_review = True
                self.stats_total['manual_review'] += 1
                if content is None:
                    content = AIGeneratedContent(
                        name=f"REVIEW_{raw_hero.id}",
                        bio="[MANUAL REVIEW NEEDED]",
                        quote="NEEDS REVIEW"
                    )

            self.stats_total['processed'] += 1

            return ProcessedHero(
                id=raw_hero.id,
                originalName=raw_hero.name,
                name=content.name,
                faction=faction,
                rarity=rarity,
                bio=content.bio,
                quote=content.quote,
                stats=scaled_stats,
                combatScore=round(combat_score, 2),
                image=raw_hero.image,
                needsManualReview=needs_review,
                retryCount=retry_count
            )

    async def process_all(
        self,
        raw_heroes: List[RawHero],
        output_path: Path
    ) -> List[ProcessedHero]:
        """Process all heroes with progress bar."""

        processor = StatProcessor(raw_heroes)

        print(f"\n[*] Starting Hero Forge Pipeline")
        print(f"[i] Processing {len(raw_heroes)} heroes")
        print(f"[>] Rate limit: {self.rate_limit} concurrent requests")
        print(f"[~] AI Provider: {self.ai_provider.__class__.__name__}\n")

        tasks = [
            self.process_hero(hero, processor)
            for hero in raw_heroes
        ]

        processed = []
        for coro in tqdm.as_completed(tasks, total=len(tasks), desc="Processing Heroes"):
            hero = await coro
            processed.append(hero)

        # Sort by original ID
        processed.sort(key=lambda h: h.id)

        # Save to file
        output_path.write_text(
            json.dumps([h.dict() for h in processed], indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        # Print statistics
        self._print_stats(processed, processor)

        return processed

    def _print_stats(self, processed: List[ProcessedHero], processor: StatProcessor):
        """Print pipeline statistics."""

        print(f"\n{'='*60}")
        print(f"[OK] PIPELINE COMPLETE")
        print(f"{'='*60}\n")

        print(f"[i] Processing Stats:")
        print(f"  Total Processed: {self.stats_total['processed']}")
        print(f"  Manual Review Needed: {self.stats_total['manual_review']} ({self.stats_total['manual_review']/len(processed)*100:.1f}%)")
        print(f"  Blacklist Hits (retried): {self.stats_total['blacklist_hits']}")
        print(f"  Similarity Retries: {self.stats_total['similarity_retries']}")

        print(f"\n[>] Faction Distribution:")
        for faction in Faction:
            count = sum(1 for h in processed if h.faction == faction)
            print(f"  {faction.value}: {count} ({count/len(processed)*100:.1f}%)")

        print(f"\n[*] Rarity Distribution:")
        for rarity in Rarity:
            count = sum(1 for h in processed if h.rarity == rarity)
            print(f"  {rarity.value}: {count} ({count/len(processed)*100:.1f}%)")

        print(f"\n[~] Sample Heroes:")
        for rarity in [Rarity.LEGENDARY, Rarity.EPIC]:
            heroes = [h for h in processed if h.rarity == rarity and not h.needsManualReview]
            if heroes:
                sample = random.choice(heroes)
                print(f"\n  [{rarity.value}] {sample.name}")
                print(f"    Faction: {sample.faction.value}")
                print(f"    Bio: {sample.bio}")
                print(f"    Quote: \"{sample.quote}\"")


# ============================================================================
# CLI INTERFACE
# ============================================================================

async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Hero Forge - AI Hero Transformation Pipeline")
    parser.add_argument('--input', type=str, default='heroes_raw.json', help='Input JSON file')
    parser.add_argument('--output', type=str, default='heroes_processed.json', help='Output JSON file')
    parser.add_argument('--mode', choices=['test', 'prod'], default='test', help='Mode: test (mock AI) or prod (real AI)')
    parser.add_argument('--provider', choices=['openai', 'gemini', 'aimlapi', 'mock'], default='mock', help='AI provider')
    parser.add_argument('--api-key', type=str, help='API key for AI provider')
    parser.add_argument('--limit', type=int, help='Limit number of heroes (for testing)')
    parser.add_argument('--rate-limit', type=int, default=10, help='Max concurrent API requests')
    parser.add_argument('--similarity-threshold', type=float, default=0.60, help='Bio similarity threshold (0-1)')

    args = parser.parse_args()

    # Load input data
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"[ERROR] Input file '{args.input}' not found!")
        print(f"        Please provide a JSON file with hero data.")
        return

    raw_data = json.loads(input_path.read_text(encoding='utf-8'))
    raw_heroes = [RawHero(**hero) for hero in raw_data]

    if args.limit:
        raw_heroes = raw_heroes[:args.limit]
        print(f"[i] Test mode: Processing first {args.limit} heroes")

    # Initialize AI provider
    if args.mode == 'test' or args.provider == 'mock':
        ai_provider = MockAIProvider()
    elif args.provider == 'openai':
        if not args.api_key:
            print("[ERROR] --api-key required for OpenAI provider")
            return
        ai_provider = OpenAIProvider(args.api_key)
    elif args.provider == 'gemini':
        if not args.api_key:
            print("[ERROR] --api-key required for Gemini provider")
            return
        ai_provider = GeminiProvider(args.api_key)
    elif args.provider == 'aimlapi':
        if not args.api_key:
            print("[ERROR] --api-key required for AIMLAPI provider")
            return
        ai_provider = AIMLAPIProvider(args.api_key)
    else:
        ai_provider = MockAIProvider()

    # Run pipeline
    forge = HeroForge(
        ai_provider=ai_provider,
        rate_limit=args.rate_limit,
        similarity_threshold=args.similarity_threshold
    )

    await forge.process_all(raw_heroes, Path(args.output))

    print(f"\n[OK] Saved to: {args.output}")
    print(f"[*] Ready to import into HeroRank!\n")


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n[!] Pipeline interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Fatal error: {e}")
        raise
