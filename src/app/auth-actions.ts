'use server';

import { redirect } from 'next/navigation';
import { setUser, clearUser } from '@/lib/auth';

/**
 * Login with email (simplified authentication for development)
 * In production, this should integrate with a proper auth provider
 */
export async function loginWithEmail(email: string) {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  await setUser({
    email,
    name: email.split('@')[0], // Use email prefix as name
  });

  redirect('/');
}

/**
 * Logout the current user
 */
export async function logout() {
  await clearUser();
  redirect('/login');
}
