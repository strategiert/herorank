import { X, Sparkles, Trophy, Zap, Gauge, Swords } from 'lucide-react';
import type { Hero } from '../types/hero';
import { tierColors, tierDescriptions } from '../types/hero';
import StatBar from './StatBar';

interface HeroDetailProps {
  hero: Hero;
  onClose: () => void;
}

export default function HeroDetail({ hero, onClose }: HeroDetailProps) {
  const totalStats = Object.values(hero.stats).reduce((a, b) => a + b, 0);
  const avgStats = Math.round(totalStats / 5);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-dark rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ border: `3px solid ${hero.color}` }}
      >
        {/* Header */}
        <div
          className="relative p-6 pb-4"
          style={{
            background: `linear-gradient(180deg, ${hero.color}33 0%, transparent 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 transition-all"
          >
            <X size={24} />
          </button>

          <div className="flex items-start gap-6">
            <div
              className="text-7xl p-4 rounded-2xl"
              style={{
                background: `linear-gradient(145deg, ${hero.color}44, ${hero.color}11)`,
                boxShadow: `0 0 30px ${hero.color}44`,
              }}
            >
              {hero.image}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white mb-2">{hero.name}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    hero.universe === 'Marvel' ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                >
                  {hero.universe}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: tierColors[hero.tier].bg,
                    color: tierColors[hero.tier].text,
                  }}
                >
                  Tier {hero.tier} - {tierDescriptions[hero.tier]}
                </span>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-1">
                  <Zap size={16} className="text-yellow-500" />
                  <span className="text-white font-bold">{hero.power}</span>
                  <span className="text-xs">Power</span>
                </div>
                <div className="flex items-center gap-1">
                  <Gauge size={16} className="text-green-500" />
                  <span className="text-white font-bold">{avgStats}</span>
                  <span className="text-xs">Avg Stats</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-300 leading-relaxed">{hero.description}</p>
          </div>

          {/* Abilities */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" />
              Fähigkeiten
            </h3>
            <div className="flex flex-wrap gap-2">
              {hero.abilities.map((ability, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${hero.color}22`,
                    color: hero.color,
                    border: `1px solid ${hero.color}44`,
                  }}
                >
                  {ability}
                </span>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${hero.color}11, transparent)`,
              border: `1px solid ${hero.color}33`,
            }}
          >
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" />
              Warum Tier {hero.tier}?
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{hero.reason}</p>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Swords size={20} className="text-red-400" />
              Statistiken
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <StatBar label="Stärke" value={hero.stats.strength} color="#EF4444" />
              <StatBar label="Geschwindigkeit" value={hero.stats.speed} color="#3B82F6" />
              <StatBar label="Widerstand" value={hero.stats.durability} color="#22C55E" />
              <StatBar label="Intelligenz" value={hero.stats.intelligence} color="#A855F7" />
              <StatBar label="Kampfkunst" value={hero.stats.combat} color="#F59E0B" />
            </div>

            {/* Stat Summary */}
            <div className="mt-4 p-3 rounded-lg bg-white/5 flex items-center justify-between">
              <span className="text-gray-400 text-sm">Gesamtwertung</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${avgStats}%` }}
                  />
                </div>
                <span className="text-white font-bold">{avgStats}/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
