'use client';

import { Menu, LogOut } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface TopbarProps {
  onMenuClick: () => void;
  userRole?: UserRole;
  userName?: string;
}

export function Topbar({ onMenuClick, userRole = 'owner', userName }: TopbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#DDD6C8] bg-[#FAF7F0]/95 px-3 sm:px-6 backdrop-blur-md safe-top">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[#26262B] hover:text-[#6B6B3A] hover:bg-[#EFEAE0] lg:hidden shrink-0"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="truncate">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userName && (
          <span className="text-xs sm:text-sm font-medium text-[#26262B] hidden md:inline truncate max-w-[140px]">
            {userName}
          </span>
        )}
        <Badge variant="olive" className="capitalize text-[11px] sm:text-xs font-semibold">
          {userRole}
        </Badge>
        <button
          onClick={handleSignOut}
          title="Sign out of operations portal"
          className="flex h-11 sm:h-9 items-center justify-center gap-1.5 text-xs text-[#B3402F] hover:text-[#942f20] px-2.5 py-1.5 rounded-[6px] hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
