'use client';

import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Product, ProductImage } from '@/types/database';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function ProductGrid({
  products,
  loading = false,
  error = null,
  emptyMessage = 'No furniture pieces found matching your criteria.',
  onRetry,
}: ProductGridProps) {
  // 1. Loading State
  if (loading) {
    return (
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden p-0 space-y-4"
          >
            <Skeleton className="aspect-[4/5] w-full" />
            <div className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="pt-3 border-t border-[#DDD6C8]/60 flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Error State
  if (error) {
    const isUnconnected =
      error === 'UNCONNECTED_DB' ||
      error.includes('NEXT_PUBLIC_SUPABASE_URL') ||
      error.includes('not connected') ||
      error.includes('configured');

    return (
      <div className="rounded-[12px] border border-[#DDD6C8] bg-[#FAF7F0] p-8 text-center max-w-lg mx-auto my-8 space-y-3">
        <AlertCircle className="h-8 w-8 text-[#8C867D] mx-auto" />
        <h3 className="font-serif text-lg font-medium text-[#26262B]">
          {isUnconnected ? 'The store is not connected to its database yet.' : 'Unable to load products'}
        </h3>
        {isUnconnected ? (
          <p className="text-[11px] font-mono text-[#8C867D]">
            NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
          </p>
        ) : (
          <p className="text-xs text-[#6B665E] leading-relaxed">{error}</p>
        )}
        {onRetry && (
          <div className="pt-2">
            <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (products.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-[#DDD6C8] bg-white p-12 text-center max-w-md mx-auto my-8 space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EFEAE0] text-[#8C867D]">
          <Armchair className="h-8 w-8 stroke-[1.25]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-xl font-medium text-[#26262B]">
            No pieces found
          </h3>
          <p className="text-sm text-[#6B665E] leading-relaxed">
            {emptyMessage}
          </p>
        </div>
        <div className="pt-2">
          <Link href="/shop">
            <Button variant="outline" size="sm">
              Reset Filters
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Success State
  return (
    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
