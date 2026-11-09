'use client';

import { useState } from 'react';
import { ShoppingBag, Minus, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import type { Product, ProductImage } from '@/types/database';

import { formatCurrency } from '@/lib/format';

interface ProductDetailActionsProps {
  product: Product & { images?: ProductImage[] };
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const isOutOfStock = product.stock_qty <= 0;
  const maxAllowed = Math.min(product.stock_qty, 20);

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    let imageUrl: string | undefined;
    const firstImg = product.images?.[0]?.storage_path;
    if (firstImg) {
      if (firstImg.startsWith('http')) {
        imageUrl = firstImg;
      } else {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        imageUrl = `${base}/storage/v1/object/public/product-images/${firstImg}`;
      }
    }

    const success = addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        image_url: imageUrl,
        stock_qty: product.stock_qty,
      },
      qty
    );

    if (success) {
      toast.success(`Added ${qty} × "${product.name}" to cart`);
    } else {
      toast.warning(`Cannot add more "${product.name}". Max stock reached.`);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Quantity & Add to Cart row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {!isOutOfStock && (
          <div className="flex items-center rounded-[8px] border border-[#DDD6C8] bg-white p-1 self-start sm:self-auto">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((prev) => Math.max(1, prev - 1))}
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-[6px] text-[#26262B] hover:bg-[#FAF7F0] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-semibold text-[#26262B]">
              {qty}
            </span>
            <button
              type="button"
              disabled={qty >= maxAllowed}
              onClick={() => setQty((prev) => Math.min(maxAllowed, prev + 1))}
              className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-[6px] text-[#26262B] hover:bg-[#FAF7F0] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <Button
          size="lg"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className={`flex-1 gap-2 text-sm sm:text-base min-h-[48px] shadow-sm ${
            isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          {isOutOfStock ? 'Currently Out of Stock' : `Add ${qty > 1 ? `(${qty}) ` : ''}to Shopping Bag`}
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#8C867D]">
        <span className="flex items-center gap-1 text-[#6B6B3A]">
          <Check className="h-3.5 w-3.5" />
          White-glove assembly available
        </span>
        <span>•</span>
        <span>Cash on Delivery & Bank Transfer</span>
      </div>

      {/* Sticky Mobile Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[#DDD6C8] bg-white/95 backdrop-blur-md px-4 py-3 safe-bottom-bar shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] text-[#8C867D]">Total Price</span>
          <span className="font-serif text-lg font-semibold text-[#6B6B3A] block truncate">
            {formatCurrency(product.price * qty)}
          </span>
        </div>
        <Button
          size="sm"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className="min-h-[44px] px-5 gap-2 text-xs shrink-0"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{isOutOfStock ? 'Out of stock' : `Add ${qty > 1 ? `(${qty})` : ''} to Bag`}</span>
        </Button>
      </div>
    </div>
  );
}
