import { Search, Filter } from 'lucide-react';

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  universeFilter: 'all' | 'Marvel' | 'DC';
  setUniverseFilter: (filter: 'all' | 'Marvel' | 'DC') => void;
  heroCount: number;
}

export default function SearchFilter({
  searchTerm,
  setSearchTerm,
  universeFilter,
  setUniverseFilter,
  heroCount,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 sm:mb-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Held suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#1a1a24] text-white text-sm border border-white/10 focus:border-yellow-500/50 focus:outline-none transition-all placeholder-gray-500"
        />
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Universe Filter */}
        <div className="flex rounded-lg overflow-hidden bg-[#1a1a24] border border-white/10">
          {(['all', 'Marvel', 'DC'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setUniverseFilter(filter)}
              className={`
                px-3 py-1.5 text-xs sm:text-sm font-medium transition-all
                ${universeFilter === filter
                  ? filter === 'Marvel'
                    ? 'bg-red-600 text-white'
                    : filter === 'DC'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-r from-red-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {filter === 'all' ? 'Alle' : filter}
            </button>
          ))}
        </div>

        {/* Hero Count */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a24] border border-white/10 text-gray-400">
          <Filter size={14} />
          <span className="text-xs sm:text-sm">
            <span className="text-yellow-500 font-bold">{heroCount}</span>
            <span className="hidden sm:inline"> Helden</span>
          </span>
        </div>
      </div>
    </div>
  );
}
