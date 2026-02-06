
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://vgahcqivuashzahdbsue.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYWhjcWl2dWFzaHphaGRic3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzU0MzQsImV4cCI6MjA4NTc1MTQzNH0.43MixMmNb3Cj4eWTxpADnMIwqycH76jS2ZnmVt9AYJE';

export const supabase = createClient(supabaseUrl, supabaseKey);
