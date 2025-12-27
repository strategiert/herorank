import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase nicht konfiguriert - Nutzerdaten werden lokal gespeichert');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Typen für die Datenbank
export interface UserFavorite {
  id: string;
  user_id: string;
  hero_id: number;
  created_at: string;
}

export interface BattleHistory {
  id: string;
  user_id: string;
  winner_id: number;
  loser_id: number;
  winner_name: string;
  loser_name: string;
  rounds: number;
  created_at: string;
}

// Helper für anonyme User-ID (im localStorage)
export function getAnonymousUserId(): string {
  let userId = localStorage.getItem('herorank_user_id');
  if (!userId) {
    userId = 'anon_' + crypto.randomUUID();
    localStorage.setItem('herorank_user_id', userId);
  }
  return userId;
}
