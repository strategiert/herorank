import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Edit2, Save, X, RefreshCw, Download } from 'lucide-react';
import type { Hero, TierType } from '../types/hero';
import { tierColors, tierOrder } from '../types/hero';
import { useAdminAPI } from '../hooks/useAdminAPI';

const ITEMS_PER_PAGE = 50;

type SortField = 'name' | 'power' | 'tier' | 'universe';
type SortDirection = 'asc' | 'desc';

export default function AdminPage() {
  const { heroes, loading, error, updateHero, refreshHeroes, exportHeroes } = useAdminAPI();
  const [searchTerm, setSearchTerm] = useState('');
  const [universeFilter, setUniverseFilter] = useState<'all' | 'Marvel' | 'DC'>('all');
  const [tierFilter, setTierFilter] = useState<TierType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('power');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingHero, setEditingHero] = useState<Hero | null>(null);
  const [editForm, setEditForm] = useState<Partial<Hero>>({});
  const [saving, setSaving] = useState(false);

  // Filter and sort heroes
  const filteredHeroes = useMemo(() => {
    let filtered = heroes.filter((hero) => {
      const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUniverse = universeFilter === 'all' || hero.universe === universeFilter;
      const matchesTier = tierFilter === 'all' || hero.tier === tierFilter;
      return matchesSearch && matchesUniverse && matchesTier;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'power':
          comparison = a.power - b.power;
          break;
        case 'tier':
          comparison = tierOrder[a.tier] - tierOrder[b.tier];
          break;
        case 'universe':
          comparison = a.universe.localeCompare(b.universe);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [heroes, searchTerm, universeFilter, tierFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredHeroes.length / ITEMS_PER_PAGE);
  const paginatedHeroes = filteredHeroes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, universeFilter, tierFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleEdit = (hero: Hero) => {
    setEditingHero(hero);
    setEditForm({
      tier: hero.tier,
      power: hero.power,
      description: hero.description,
      reason: hero.reason,
      stats: { ...hero.stats },
    });
  };

  const handleCancelEdit = () => {
    setEditingHero(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingHero) return;

    setSaving(true);
    try {
      await updateHero(editingHero.id, editForm);
      setEditingHero(null);
      setEditForm({});
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportHeroes();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'superheroes-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (loading && heroes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <RefreshCw size={48} className="mx-auto text-gray-600 mb-4 animate-spin" />
          <p className="text-gray-400">Lade Helden-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Helden-Daten verwalten und bearbeiten
        </p>
        {error && (
          <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="glass-dark rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Held suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          {/* Universe Filter */}
          <select
            value={universeFilter}
            onChange={(e) => setUniverseFilter(e.target.value as typeof universeFilter)}
            className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
          >
            <option value="all">Alle Universen</option>
            <option value="Marvel">Marvel</option>
            <option value="DC">DC</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
            className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
          >
            <option value="all">Alle Tiers</option>
            <option value="Cosmic">Cosmic</option>
            <option value="S">S-Tier</option>
            <option value="A">A-Tier</option>
            <option value="B">B-Tier</option>
            <option value="C">C-Tier</option>
            <option value="D">D-Tier</option>
          </select>

          {/* Actions */}
          <button
            onClick={refreshHeroes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-all"
          >
            <Download size={18} />
            Export
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-400">
          {filteredHeroes.length} von {heroes.length} Helden | Seite {currentPage} von {totalPages}
        </div>
      </div>

      {/* Heroes Table */}
      <div className="glass-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">ID</th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('universe')}
                >
                  <div className="flex items-center gap-1">
                    Universum <SortIcon field="universe" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('tier')}
                >
                  <div className="flex items-center gap-1">
                    Tier <SortIcon field="tier" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('power')}
                >
                  <div className="flex items-center gap-1">
                    Power <SortIcon field="power" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHeroes.map((hero) => (
                <tr key={hero.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-500 text-sm">{hero.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{hero.image}</span>
                      <span className="text-white font-medium">{hero.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      hero.universe === 'Marvel' ? 'bg-red-600/30 text-red-400' : 'bg-blue-600/30 text-blue-400'
                    }`}>
                      {hero.universe}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{
                        background: tierColors[hero.tier].bg,
                        color: tierColors[hero.tier].text
                      }}
                    >
                      {hero.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-500 font-bold">{hero.power}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(hero)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-white/10">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &laquo;
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lsaquo;
            </button>

            <span className="px-4 text-gray-400">
              Seite {currentPage} von {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &raquo;
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingHero && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{editingHero.image}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingHero.name}</h2>
                  <p className="text-sm text-gray-400">{editingHero.universe}</p>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tier and Power */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Tier</label>
                  <select
                    value={editForm.tier || editingHero.tier}
                    onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as TierType })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
                  >
                    <option value="Cosmic">Cosmic</option>
                    <option value="S">S-Tier</option>
                    <option value="A">A-Tier</option>
                    <option value="B">B-Tier</option>
                    <option value="C">C-Tier</option>
                    <option value="D">D-Tier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Power (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.power ?? editingHero.power}
                    onChange={(e) => setEditForm({ ...editForm, power: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>

              {/* Stats */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Stats</label>
                <div className="grid grid-cols-5 gap-3">
                  {(['strength', 'speed', 'durability', 'intelligence', 'combat'] as const).map((stat) => (
                    <div key={stat}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{stat}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.stats?.[stat] ?? editingHero.stats[stat]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          stats: {
                            ...(editForm.stats || editingHero.stats),
                            [stat]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Beschreibung</label>
                <textarea
                  value={editForm.description ?? editingHero.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50 resize-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Begründung</label>
                <textarea
                  value={editForm.reason ?? editingHero.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
