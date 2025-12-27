-- HeroRank Supabase Schema
-- Führe dieses SQL in deinem Supabase SQL Editor aus

-- Favoriten Tabelle
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  hero_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, hero_id)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- Battle History Tabelle
CREATE TABLE IF NOT EXISTS battle_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  winner_id INTEGER NOT NULL,
  loser_id INTEGER NOT NULL,
  winner_name TEXT NOT NULL,
  loser_name TEXT NOT NULL,
  rounds INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_battle_history_user_id ON battle_history(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_history_created_at ON battle_history(created_at DESC);

-- Row Level Security (RLS) aktivieren
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_history ENABLE ROW LEVEL SECURITY;

-- Policies: Jeder kann seine eigenen Daten lesen/schreiben
CREATE POLICY "Users can read own favorites" ON favorites
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (true);

CREATE POLICY "Users can read own battles" ON battle_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own battles" ON battle_history
  FOR INSERT WITH CHECK (true);

-- Leaderboard View (optional)
CREATE OR REPLACE VIEW hero_leaderboard AS
SELECT
  winner_id as hero_id,
  winner_name as hero_name,
  COUNT(*) as total_wins,
  COUNT(DISTINCT user_id) as unique_players
FROM battle_history
GROUP BY winner_id, winner_name
ORDER BY total_wins DESC
LIMIT 50;
