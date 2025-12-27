import type { HeroClass } from '../types/hero';
import { heroClassInfo } from '../types/hero';

interface HeroClassBadgeProps {
  heroClass: HeroClass;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function HeroClassBadge({ heroClass, size = 'sm', showLabel = false }: HeroClassBadgeProps) {
  const info = heroClassInfo[heroClass];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${info.color}20`,
        color: info.color,
        border: `1px solid ${info.color}40`
      }}
      title={`${info.label}: ${info.description}`}
    >
      <span className={iconSizes[size]}>{info.icon}</span>
      {showLabel && <span>{info.label}</span>}
    </div>
  );
}

// Kompakte Version nur mit Icon für Cards
export function HeroClassIcon({ heroClass, size = 'sm' }: { heroClass: HeroClass; size?: 'sm' | 'md' }) {
  const info = heroClassInfo[heroClass];

  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm'
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${info.color}30`,
        color: info.color,
        boxShadow: `0 0 8px ${info.color}40`
      }}
      title={`${info.label}: ${info.description}`}
    >
      {info.icon}
    </div>
  );
}
