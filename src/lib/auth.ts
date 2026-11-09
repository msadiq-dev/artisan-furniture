import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';
import type { UserRole, Profile } from '@/types/database';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

/**
 * Retrieves the currently authenticated user's profile from the database.
 * If user is not authenticated, returns null.
 * If user has no profile or profile is deactivated (is_active === false),
 * signs out the session and returns null.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: rawProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return null;
    }

    const profile = rawProfile as Profile | null;

    // If profile is missing or inactive, sign out immediately
    if (profileError || !profile || !profile.is_active) {
      try {
        await supabase.auth.signOut();
      } catch {
        // silent fail on signOut
      }
      return null;
    }

    return profile as Profile;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string'
    ) {
      throw err;
    }
    return null;
  }
}

/**
 * Retrieves both user and verified profile.
 */
export async function getCurrentUser(): Promise<{ user: User | null; profile: Profile | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return { user: null, profile: null };
    }

    return { user, profile };
  } catch {
    return { user: null, profile: null };
  }
}

/**
 * Server guard that ensures the caller has one of the allowed roles.
 * - Missing or inactive profile -> redirects to /login (or throws UNAUTHORIZED)
 * - Wrong role -> throws FORBIDDEN (or redirects to /dashboard)
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectToLogin = true
): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    if (redirectToLogin) {
      redirect('/login');
    }
    throw new Error('UNAUTHORIZED');
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error('FORBIDDEN');
  }

  return profile;
}
