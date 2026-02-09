import { cookies } from 'next/headers';

export interface User {
  email: string;
  name?: string;
}

/**
 * Get the currently logged-in user from session
 * Returns null if no user is logged in
 */
export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie?.value) {
    return null;
  }

  try {
    const user = JSON.parse(userCookie.value);
    return user;
  } catch {
    return null;
  }
}

/**
 * Set user session
 */
export async function setUser(user: User): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('user', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear user session
 */
export async function clearUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('user');
}
