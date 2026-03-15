
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgahcqivuashzahdbsue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYWhjcWl2dWFzaHphaGRic3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzU0MzQsImV4cCI6MjA4NTc1MTQzNH0.43MixMmNb3Cj4eWTxpADnMIwqycH76jS2ZnmVt9AYJE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createVerifiedKagawad() {
  const email = `kagawad_test_${Date.now()}@example.com`;
  const password = 'Password123!';
  const username = `kagawad_${Date.now()}`;
  const fullName = 'Test Kagawad Verification';

  console.log(`Creating user ${email}...`);
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      }
    }
  });

  if (signUpError) {
    console.error("Sign up failed", signUpError);
    return;
  }

  const userId = data.user.id;
  console.log(`User created. ID: ${userId}. Updating profile...`);

  // Wait a bit for the trigger to create the profile
  await new Promise(r => setTimeout(r, 2000));

  const { error: updateError } = await supabase.from('profiles').update({
    role: 'barangay_kagawad',
    status: 'active'
  }).eq('id', userId);

  if (updateError) {
    console.error("Failed to update profile", updateError);
    return;
  }

  console.log("Success! Account ready for verification.");
  console.log(`Login: ${email}`);
  console.log(`Password: ${password}`);
}

createVerifiedKagawad();
