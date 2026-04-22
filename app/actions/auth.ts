'use server';

import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

/**
 * Register a new Resident
 * Strict Business Rule: Defaults to 'pending' status. No email verification.
 */
export async function registerUser(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const address = formData.get('address') as string;
  const contactNumber = formData.get('contactNumber') as string;
  const password = formData.get('password') as string;
  const idFile = formData.get('validId') as File;

  if (!firstName || !lastName || !contactNumber || !password || !idFile) {
    return { error: 'All fields are required.' };
  }

  try {
    // 1. Check for duplicate contact number
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('contact_number', contactNumber)
      .single();

    if (existingUser) {
      return { error: 'Contact number is already registered.' };
    }

    // 2. Hash Password (bcrypt)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Upload Valid ID to PRIVATE Storage
    const fileExt = idFile.name.split('.').pop();
    const fileName = `${contactNumber}_${Date.now()}.${fileExt}`;
    const filePath = `ids/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('identity-docs')
      .upload(filePath, idFile);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 4. Insert Record into 'users' table
    // We store the storage path (filePath), NOT a public URL, because the bucket is private.
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          address: address,
          contact_number: contactNumber,
          password_hash: passwordHash,
          valid_id_url: filePath,
          status: 'pending'
        }
      ]);

    if (insertError) throw insertError;

    revalidatePath('/admin/registrations');
    return { success: true, message: 'Registration submitted successfully. Please wait for Admin approval.' };

  } catch (error: any) {
    console.error('Registration Error:', error.message);
    return { error: error.message || 'Something went wrong during registration.' };
  }
}

/**
 * Generate a Signed URL for Admin to view sensitive ID photos
 * Valid for 2 minutes only.
 */
export async function getSignedIdUrl(filePath: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('identity-docs')
      .createSignedUrl(filePath, 120); // 120 seconds

    if (error) throw error;
    return { signedUrl: data.signedUrl };
  } catch (error: any) {
    console.error('Signed URL Error:', error.message);
    return { error: 'Could not generate access link.' };
  }
}

/**
 * Authenticate User (Resident/Admin)
 */
export async function loginUser(formData: FormData) {
  const contactNumber = formData.get('contactNumber') as string;
  const password = formData.get('password') as string;

  if (!contactNumber || !password) {
    return { error: 'Contact number and password are required.' };
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('contact_number', contactNumber)
      .single();

    if (error || !user) {
      return { error: 'Invalid credentials.' };
    }

    if (user.status === 'pending') {
      return { error: 'Your account is still pending approval by the Barangay Admin.' };
    }
    if (user.status === 'rejected') {
      return { error: 'Your registration request was rejected.' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return { error: 'Invalid credentials.' };
    }

    return { 
      success: true, 
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: 'resident'
      } 
    };

  } catch (error: any) {
    console.error('Login Error:', error.message);
    return { error: 'Authentication failed.' };
  }
}
