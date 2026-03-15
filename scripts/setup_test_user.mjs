
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgahcqivuashzahdbsue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYWhjcWl2dWFzaHphaGRic3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzU0MzQsImV4cCI6MjA4NTc1MTQzNH0.43MixMmNb3Cj4eWTxpADnMIwqycH76jS2ZnmVt9AYJE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTestUser() {
  const { data: users, error: fetchError } = await supabase.from('profiles').select('id, email, role, status').eq('status', 'active');
  if (fetchError || !users.length) {
    console.error("No active users found", fetchError);
    return;
  }

  const testUser = users[0];
  console.log(`Updating user ${testUser.email} (ID: ${testUser.id}) to barangay_kagawad...`);

  const { error: updateError } = await supabase.from('profiles').update({ role: 'barangay_kagawad' }).eq('id', testUser.id);
  if (updateError) {
    console.error("Failed to update role", updateError);
    return;
  }

  console.log("Success! Test user is now barangay_kagawad.");
  console.log(`Email: ${testUser.email}`);
  console.log("Password: Use the known password for this account if you have it, otherwise resetting password in auth.users is required.");
}

updateTestUser();
