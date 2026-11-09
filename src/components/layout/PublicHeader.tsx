'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on Escape key press or route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Catalog', href: '/shop' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#DDD6C8] bg-[#FAF7F0]/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="container-custom flex h-16 md:h-20 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="group flex flex-col justify-center min-h-[44px]">
          <span className="font-serif text-xl sm:text-2xl font-semibold tracking-wide text-[#26262B] group-hover:text-[#6B6B3A] transition-colors leading-tight">
            Artisan Furniture
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-widest uppercase text-[#8C867D]">
            Contemporary Woodcraft
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-[#6B6B3A] py-2 ${
                  isActive
                    ? 'text-[#6B6B3A] border-b-2 border-[#6B6B3A] pb-1'
                    : 'text-[#26262B]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/cart"
            className="relative flex h-11 w-11 items-center justify-center text-[#26262B] hover:text-[#6B6B3A] transition-colors"
            aria-label={`Shopping bag, ${mounted ? totalItems : 0} items`}
          >
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
            {mounted && totalItems > 0 && (
              <span className="absolute 1 top-1.5 right-1.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#6B6B3A] text-[10px] sm:text-[11px] font-bold text-white shadow">
                {totalItems}
              </span>
            )}
          </Link>

          <Link href="/login" className="hidden sm:inline-flex">
            <Button variant="outline" size="sm" className="gap-2 border-[#DDD6C8] text-xs min-h-[36px]">
              <ShieldCheck className="h-4 w-4 text-[#6B6B3A]" />
              Staff Login
            </Button>
          </Link>

          {/* Mobile menu toggle with 44x44px touch target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-11 w-11 items-center justify-center text-[#26262B] hover:text-[#6B6B3A] focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DDD6C8] bg-[#FAF7F0] px-6 py-5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-2.5 px-2 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'text-[#6B6B3A] bg-[#6B6B3A]/10 font-semibold'
                    : 'text-[#26262B] hover:bg-[#EFEAE0]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-[#DDD6C8]">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 py-2.5 px-2 text-sm text-[#6B665E] hover:text-[#26262B]"
              >
                <ShieldCheck className="h-4 w-4 text-[#6B6B3A]" />
                Staff Dashboard Portal
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
