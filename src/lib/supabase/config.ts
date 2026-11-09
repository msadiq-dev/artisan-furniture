/**
 * Supabase Connection and Configuration Helpers
 *
 * Verifies whether Supabase has been properly provisioned with live credentials
 * versus using dummy placeholders in local .env files.
 */

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;

  // Check for placeholder domains or token templates
  if (
    url.includes('your-project') ||
    url.includes('example.co') ||
    url.includes('placeholder') ||
    anonKey.includes('placeholder')
  ) {
    return false;
  }

  return true;
}

export function isSupabaseAdminConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.includes('placeholder')) {
    return false;
  }

  return true;
}
