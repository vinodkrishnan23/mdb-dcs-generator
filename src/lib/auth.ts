import { cookies, headers } from 'next/headers';

export interface User {
  email: string;
  name?: string;
}

/**
 * Decode the Kanopy-internal JWT and extract user identity.
 *
 * CorpSecure has already verified the token against Okta before forwarding it
 * on X-Kanopy-Internal-Authorization — we only need to decode the payload, not
 * re-verify the signature.  The relevant user claims are:
 *   email  — user's email address
 *   sub    — Okta username (fallback if email is absent)
 *   name / given_name — display name (optional)
 */
function parseKanopyJWT(headerValue: string): User | null {
  try {
    const token = headerValue.startsWith('Bearer ')
      ? headerValue.slice(7)
      : headerValue;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    const email: string = payload.email || payload.sub || '';
    if (!email.includes('@')) return null;

    const name: string =
      payload.name || payload.given_name || email.split('@')[0];

    return { email, name };
  } catch {
    return null;
  }
}

/**
 * Returns the currently authenticated user.
 *
 * Priority:
 *  1. X-Kanopy-Internal-Authorization header (production / Kanopy)
 *     Kanopy CorpSecure verifies the user with Okta and forwards a pre-signed
 *     JWT on this header.  External callers cannot forge it.
 *  2. 'user' session cookie (local development — set by loginWithEmail action)
 */
export async function getUser(): Promise<User | null> {
  // 1. Kanopy / production path
  const headerStore = await headers();
  const kanopyHeader = headerStore.get('x-kanopy-internal-authorization');
  if (kanopyHeader) {
    const user = parseKanopyJWT(kanopyHeader);
    if (user) return user;
  }

  // 2. Local dev cookie session
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  if (!userCookie?.value) return null;
  try {
    return JSON.parse(userCookie.value);
  } catch {
    return null;
  }
}

/**
 * Set user session (local dev only — not used in Kanopy production).
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
 * Clear user session (local dev only).
 */
export async function clearUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('user');
}

