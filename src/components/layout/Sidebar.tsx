'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';
import { useEffect } from 'react';
import type { UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole = 'owner', userName = 'Staff Member', isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    try {
      const { isSupabaseConfigured } = await import('@/lib/supabase/config');
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      // Continue to redirect
    }
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'manager', 'sales', 'inventory', 'accounts'] as UserRole[],
    },
    {
      title: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingCart,
      roles: ['owner', 'manager', 'sales'] as UserRole[],
    },
    {
      title: 'Products',
      href: '/dashboard/products',
      icon: Package,
      roles: ['owner', 'manager'] as UserRole[],
    },
    {
      title: 'Inventory',
      href: '/dashboard/inventory',
      icon: Boxes,
      roles: ['owner', 'manager', 'inventory'] as UserRole[],
    },
    {
      title: 'Suppliers',
      href: '/dashboard/suppliers',
      icon: Truck,
      roles: ['owner', 'manager', 'accounts'] as UserRole[],
    },
    {
      title: 'Invoices',
      href: '/dashboard/invoices',
      icon: Receipt,
      roles: ['owner', 'manager', 'accounts', 'inventory'] as UserRole[],
    },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#DDD6C8] bg-[#FAF7F0] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#DDD6C8] px-5 sm:px-6">
          <Link href="/dashboard" className="flex flex-col py-1">
            <span className="font-serif text-lg font-semibold tracking-wide text-[#26262B]">
              Artisan Furniture
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#8C867D]">
              Business Operations
            </span>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[#6B665E] hover:text-[#26262B] hover:bg-[#EFEAE0] lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="border-b border-[#DDD6C8] p-4 bg-[#EFEAE0]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6B6B3A] text-xs font-semibold text-white">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-[#26262B]">
                {userName}
              </span>
              <span className="text-xs uppercase tracking-wider text-[#6B6B3A] font-medium">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex min-h-[44px] items-center gap-3 rounded-[8px] px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#6B6B3A] text-white shadow-sm'
                      : 'text-[#6B665E] hover:bg-[#EFEAE0] hover:text-[#26262B]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="border-t border-[#DDD6C8] p-3 space-y-1 safe-bottom pb-4">
          <Link
            href="/"
            target="_blank"
            className="flex min-h-[44px] items-center gap-3 rounded-[8px] px-3 py-2 text-xs font-medium text-[#6B665E] hover:bg-[#EFEAE0] transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>View Public Storefront</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-[8px] px-3 py-2 text-xs font-medium text-[#B3402F] hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
