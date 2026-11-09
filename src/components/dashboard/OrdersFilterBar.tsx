'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';

interface OrdersFilterBarProps {
  initialSearch?: string;
  initialStatus?: string;
  initialPaymentStatus?: string;
}

export function OrdersFilterBar({
  initialSearch = '',
  initialStatus = '',
  initialPaymentStatus = '',
}: OrdersFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);

  const applyFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v && v.trim() !== '') {
        params.set(k, v.trim());
      } else {
        params.delete(k);
      }
    });
    params.set('page', '1');
    startTransition(() => {
      router.push(`/dashboard/orders?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: search });
  };

  const handleReset = () => {
    setSearch('');
    startTransition(() => {
      router.push('/dashboard/orders');
    });
  };

  const currentStatus = searchParams.get('status') || '';
  const currentPaymentStatus = searchParams.get('payment_status') || '';
  const hasFilters = Boolean(currentStatus || currentPaymentStatus || searchParams.get('q'));

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search by order number or customer phone */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <Search className="absolute left-3 top-3.5 sm:top-2.5 h-4 w-4 text-[#8C867D]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number (FRN-...) or phone..."
          className="pl-9 bg-white min-h-[44px] sm:min-h-10"
        />
      </form>

      {/* Filters row for mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2">
        {/* Status filter dropdown */}
        <select
          value={currentStatus}
          onChange={(e) => applyFilters({ status: e.target.value })}
          className="min-h-[44px] sm:h-10 rounded-[8px] border border-[#DDD6C8] bg-white px-3 text-sm sm:text-xs text-[#26262B] focus:border-[#6B6B3A] focus:outline-none"
        >
          <option value="">All Order Statuses</option>
          <option value="new">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready_for_delivery">Ready for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Payment status filter dropdown */}
        <select
          value={currentPaymentStatus}
          onChange={(e) => applyFilters({ payment_status: e.target.value })}
          className="min-h-[44px] sm:h-10 rounded-[8px] border border-[#DDD6C8] bg-white px-3 text-sm sm:text-xs text-[#26262B] focus:border-[#6B6B3A] focus:outline-none"
        >
          <option value="">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs text-[#8C867D] hover:text-[#B3402F] gap-1 min-h-[44px] sm:h-10 px-3 w-full sm:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
