
import { createClient } from '@supabase/supabase-js';

// Configuration
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Persist session in localStorage
    autoRefreshToken: true, // Auto refresh token
    detectSessionInUrl: true // Detect OAuth redirects
  }
});
