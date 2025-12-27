import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TierlistPage from './pages/TierlistPage';
import ArenaPage from './pages/ArenaPage';
import ComparePage from './pages/ComparePage';
import RankingsPage from './pages/RankingsPage';
import FavoritesPage from './pages/FavoritesPage';
import AdminPage from './pages/AdminPage';
import { useFavorites } from './hooks/useFavorites';
import { superheroes } from './data/superheroes';

function App() {
  const { favorites, toggleFavorite, clearFavorites } = useFavorites();

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Header />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <TierlistPage
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                />
              }
            />
            <Route path="/arena" element={<ArenaPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route
              path="/favorites"
              element={
                <FavoritesPage
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  clearFavorites={clearFavorites}
                />
              }
            />
            {/* Hidden Admin Route - no menu link */}
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="mt-8 py-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-xs">
            <p>
              HeroRank - {superheroes.length} Helden aus Marvel & DC
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
