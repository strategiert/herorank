import { Link, useLocation } from 'react-router-dom';
import { Shield, Swords, BarChart3, Trophy, Heart } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Tierlist', icon: Shield },
    { path: '/arena', label: 'Arena', icon: Swords },
    { path: '/compare', label: 'Vergleich', icon: BarChart3 },
    { path: '/rankings', label: 'Rankings', icon: Trophy },
    { path: '/favorites', label: 'Favoriten', icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d15]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="text-2xl sm:text-3xl">⚡</div>
            <div>
              <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                HeroRank
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:block">
                Marvel vs DC Superhelden Tierlist
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                    text-xs sm:text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon size={16} className={isActive ? 'text-yellow-400' : ''} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
