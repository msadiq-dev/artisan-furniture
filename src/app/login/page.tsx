'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { toast } from 'sonner';
import type { Profile } from '@/types/database';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if staff member is already signed in
  useEffect(() => {
    async function checkSession() {
      try {
        if (!isSupabaseConfigured()) return;
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace(redirectPath);
        }
      } catch {
        // Continue to show login form
      }
    }
    checkSession();
  }, [router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your staff email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured()) {
        setError('Supabase credentials are not connected yet. Please update NEXT_PUBLIC_SUPABASE_URL and keys in .env.local to log in with real staff credentials.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentication failed. No user found.');
        setLoading(false);
        return;
      }

      // Verify profile is active
      const { data: rawProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      const profile = rawProfile as Profile | null;

      if (profileError || !profile || !profile.is_active) {
        await supabase.auth.signOut();
        setError('Your staff profile is not active. Ask the owner.');
        setLoading(false);
        return;
      }

      toast.success(`Signed in as ${profile.full_name} (${profile.role})`);
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-block group">
          <span className="font-serif text-3xl font-semibold tracking-wide text-[#26262B] group-hover:text-[#6B6B3A] transition-colors">
            Artisan Furniture
          </span>
        </Link>
        <div className="flex items-center justify-center gap-2 pt-2">
          <ShieldCheck className="h-5 w-5 text-[#6B6B3A]" />
          <h1 className="text-sm font-semibold tracking-wider uppercase text-[#6B665E]">
            Staff Operations Portal
          </h1>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-8 shadow-sm space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#26262B]">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#26262B]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {error && (
            <div className="rounded-[8px] bg-red-50 border border-red-200 p-3.5 text-xs text-[#B3402F] leading-relaxed">
              {error}
            </div>
          )}

          <div className="pt-2 border-t border-[#DDD6C8] text-center">
            <Link
              href="/"
              className="text-xs text-[#6B665E] hover:text-[#6B6B3A] transition-colors"
            >
              Return to Public Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center text-sm text-[#8C867D]">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
