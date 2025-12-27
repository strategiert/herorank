import type { Hero, HeroClass } from '../types/hero';
import { tierColors } from '../types/hero';
import { Heart, Zap } from 'lucide-react';
import { HeroClassIcon } from './HeroClassBadge';

interface HeroCardProps {
  hero: Hero;
  onClick: (hero: Hero) => void;
  isSelected?: boolean;
  compact?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (hero: Hero) => void;
  showRank?: number;
  heroClass?: HeroClass; // Optional: wenn über enrichHero berechnet
}

export default function HeroCard({
  hero,
  onClick,
  isSelected = false,
  compact = false,
  isFavorite = false,
  onToggleFavorite,
  showRank,
  heroClass,
}: HeroCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(hero);
  };

  // Tier label for display
  const tierLabel = hero.tier === 'Cosmic' ? 'Cosm' : hero.tier;

  return (
    <div
      onClick={() => onClick(hero)}
      className={`
        hero-card relative cursor-pointer rounded-xl overflow-hidden
        transition-all duration-200 hover:scale-105 hover:-translate-y-1
        ${isSelected ? 'ring-2 ring-yellow-400 scale-105' : ''}
        ${compact ? 'w-[80px]' : 'w-[100px] sm:w-[110px]'}
      `}
      style={{
        background: 'rgba(30, 30, 40, 0.8)',
        border: `2px solid ${isSelected ? '#facc15' : hero.color}44`,
        boxShadow: isSelected ? `0 0 20px ${hero.color}44` : 'none',
      }}
    >
      {/* Favorite Button - top left */}
      {onToggleFavorite && (
        <button
          onClick={handleFavoriteClick}
          className={`
            absolute top-1.5 left-1.5 z-10 p-0.5 rounded-full transition-all
            ${isFavorite ? 'text-red-500' : 'text-gray-500/50 hover:text-red-400'}
          `}
        >
          <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}

      {/* Rank Badge - top left */}
      {showRank && (
        <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
          {showRank}
        </div>
      )}

      {/* Tier Badge - top right with label */}
      <div
        className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md flex items-center justify-center text-[10px] font-bold shadow-lg"
        style={{
          background: tierColors[hero.tier].bg,
          color: tierColors[hero.tier].text,
        }}
      >
        {tierLabel}
      </div>

      {/* Hero Class Badge - bottom right */}
      {heroClass && (
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <HeroClassIcon heroClass={heroClass} size="sm" />
        </div>
      )}

      {/* Content */}
      <div className={`text-center ${compact ? 'p-2 pt-5' : 'p-3 pt-6'}`}>
        {/* Hero Emoji */}
        <div
          className={`
            ${compact ? 'text-3xl' : 'text-4xl'}
            mb-2 transition-transform
          `}
          style={{ filter: `drop-shadow(0 2px 4px ${hero.color}44)` }}
        >
          {hero.image}
        </div>

        {/* Hero Name */}
        <div className={`font-semibold text-white ${compact ? 'text-[10px]' : 'text-xs'} truncate leading-tight`}>
          {hero.name}
        </div>

        {/* Universe Badge */}
        <div className="mt-1.5">
          <span
            className={`
              inline-block text-[9px] px-1.5 py-0.5 rounded font-medium
              ${hero.universe === 'Marvel' ? 'bg-red-600/80' : 'bg-blue-600/80'}
              text-white
            `}
          >
            {hero.universe}
          </span>
        </div>

        {/* Power Display */}
        {!compact && (
          <div className="flex items-center justify-center gap-0.5 mt-1.5 text-yellow-500">
            <Zap size={10} fill="currentColor" />
            <span className="text-[10px] font-bold">{hero.power}</span>
          </div>
        )}
      </div>
    </div>
  );
}
