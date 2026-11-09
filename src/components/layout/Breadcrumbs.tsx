'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    products: 'Products',
    inventory: 'Inventory',
    suppliers: 'Suppliers',
    invoices: 'Invoices',
    shop: 'Shop',
    cart: 'Cart',
    checkout: 'Checkout',
    contact: 'Contact',
    'order-success': 'Order Confirmation',
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-[#6B665E] overflow-x-auto scrollbar-none py-1" aria-label="Breadcrumb">
      <Link href="/dashboard" className="hover:text-[#6B6B3A] transition-colors flex items-center gap-1 shrink-0">
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const displayName = titleMap[segment] || segment;

        return (
          <div key={href} className="flex items-center space-x-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#DDD6C8]" />
            {isLast ? (
              <span className="font-semibold text-[#26262B] truncate max-w-[150px] sm:max-w-none">
                {displayName}
              </span>
            ) : (
              <Link href={href} className="hover:text-[#6B6B3A] transition-colors capitalize">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
