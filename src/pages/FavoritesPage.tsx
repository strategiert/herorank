import { useState, useMemo } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import type { Hero } from '../types/hero';
import { tierColors } from '../types/hero';
import { superheroes } from '../data/superheroes';
import HeroCard from '../components/HeroCard';
import HeroDetail from '../components/HeroDetail';

interface FavoritesPageProps {
  favorites: number[];
  toggleFavorite: (hero: Hero) => void;
  clearFavorites: () => void;
}

export default function FavoritesPage({
  favorites,
  toggleFavorite,
  clearFavorites,
}: FavoritesPageProps) {
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);

  const favoriteHeroes = useMemo(() => {
    return superheroes
      .filter((hero) => favorites.includes(hero.id))
      .sort((a, b) => b.power - a.power);
  }, [favorites]);

  const stats = useMemo(() => {
    if (favoriteHeroes.length === 0) return null;

    const marvelCount = favoriteHeroes.filter((h) => h.universe === 'Marvel').length;
    const dcCount = favoriteHeroes.filter((h) => h.universe === 'DC').length;

    const tierCounts: Record<string, number> = { Cosmic: 0, S: 0, A: 0, B: 0, C: 0, D: 0 };
    favoriteHeroes.forEach((h) => {
      if (tierCounts[h.tier] !== undefined) tierCounts[h.tier]++;
    });

    const avgPower = Math.round(
      favoriteHeroes.reduce((sum, h) => sum + h.power, 0) / favoriteHeroes.length
    );

    const strongest = favoriteHeroes[0];

    return { marvelCount, dcCount, tierCounts, avgPower, strongest };
  }, [favoriteHeroes]);

  if (favorites.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <Heart size={64} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Keine Favoriten</h2>
          <p className="text-gray-400 mb-6">
            Du hast noch keine Helden zu deinen Favoriten hinzugefügt.
          </p>
          <p className="text-gray-500 text-sm">
            Klicke auf das Herz-Symbol bei einem Helden in der Tierlist, um ihn hinzuzufügen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Heart className="text-red-500" fill="currentColor" />
            Meine Favoriten
          </h1>
          <p className="text-gray-400 mt-1">{favorites.length} Helden in deiner Sammlung</p>
        </div>
        <button
          onClick={clearFavorites}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
        >
          <Trash2 size={18} />
          Alle entfernen
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Universe Distribution */}
          <div className="glass-dark rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Universum</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-600 h-full"
                    style={{
                      width: `${(stats.marvelCount / favoriteHeroes.length) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-blue-600 h-full"
                    style={{
                      width: `${(stats.dcCount / favoriteHeroes.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-red-400">Marvel: {stats.marvelCount}</span>
              <span className="text-blue-400">DC: {stats.dcCount}</span>
            </div>
          </div>

          {/* Average Power */}
          <div className="glass-dark rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Durchschnittliche Power</h3>
            <div className="text-3xl font-bold text-yellow-500">{stats.avgPower}</div>
          </div>

          {/* Strongest */}
          <div className="glass-dark rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Stärkster Favorit</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{stats.strongest.image}</span>
              <div>
                <div className="text-white font-bold">{stats.strongest.name}</div>
                <div className="text-xs text-gray-500">Power: {stats.strongest.power}</div>
              </div>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="glass-dark rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-2">Tier-Verteilung</h3>
            <div className="flex gap-1">
              {(['Cosmic', 'S', 'A', 'B', 'C', 'D'] as const).map((tier) => (
                <div
                  key={tier}
                  className="flex-1 text-center py-1 rounded text-xs font-bold"
                  style={{
                    background: stats.tierCounts[tier] > 0 ? tierColors[tier].bg : '#374151',
                    color: stats.tierCounts[tier] > 0 ? tierColors[tier].text : '#9CA3AF',
                    opacity: stats.tierCounts[tier] > 0 ? 1 : 0.5,
                  }}
                >
                  {tier}: {stats.tierCounts[tier]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      <div className="glass-dark rounded-xl p-6">
        <div className="flex flex-wrap gap-4">
          {favoriteHeroes.map((hero, index) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              onClick={setSelectedHero}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
              showRank={index + 1}
            />
          ))}
        </div>
      </div>

      {/* Hero Detail Modal */}
      {selectedHero && (
        <HeroDetail hero={selectedHero} onClose={() => setSelectedHero(null)} />
      )}
    </div>
  );
}
