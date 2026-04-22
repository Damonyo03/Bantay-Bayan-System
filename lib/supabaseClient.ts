import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

// Custom storage adapter for Capacitor
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

// Configuration
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE CONFIG MISSING: Check your .env.local file and ensure variables are prefixed with VITE_");
}

// Create Client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: capacitorStorage, // Use Capacitor Preferences for reliable mobile persistence
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
