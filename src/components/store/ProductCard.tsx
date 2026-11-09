'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Eye, Armchair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { useCartStore } from '@/store/cart';
import type { Product, ProductImage } from '@/types/database';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = product.stock_qty > 0 && product.stock_qty <= LOW_STOCK_THRESHOLD;

  const firstImage = product.images?.[0];
  let imageUrl: string | null = null;

  if (firstImage?.storage_path) {
    if (firstImage.storage_path.startsWith('http')) {
      imageUrl = firstImage.storage_path;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${firstImage.storage_path}`;
      }
    }
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    const added = addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        image_url: imageUrl || undefined,
        stock_qty: product.stock_qty,
      },
      1
    );

    if (added) {
      toast.success(`Added "${product.name}" to cart`);
    } else {
      toast.warning(`Cannot add more "${product.name}". Max stock reached.`);
    }
  };

  return (
    <div className="group flex flex-col rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden transition-all duration-200 hover:border-[#6B6B3A] hover:shadow-md">
      {/* Product Image or Neutral Placeholder */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-[#EFEAE0]"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={firstImage?.alt_text || product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-[#8C867D] bg-gradient-to-br from-[#FAF7F0] to-[#EFEAE0]">
            <Armchair className="h-10 w-10 stroke-[1.25] text-[#8C867D]/60 mb-2" />
            <span className="font-serif text-xs italic text-[#8C867D]">
              Artisan Solid Wood
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#8C867D]/70 mt-0.5">
              {product.sku}
            </span>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-col gap-1.5">
          {isOutOfStock ? (
            <Badge variant="destructive" className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
              Out of stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] sm:text-[11px] font-medium">
              Low stock
            </Badge>
          ) : null}

          {product.is_featured && !isOutOfStock && (
            <Badge variant="olive" className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">
              Featured
            </Badge>
          )}
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#8C867D]">
            <span className="truncate pr-1">{product.category?.name || 'Solid Wood'}</span>
            {product.material && <span className="truncate text-right">{product.material}</span>}
          </div>

          <Link href={`/products/${product.slug}`} className="block group-hover:text-[#6B6B3A] transition-colors">
            <h3 className="font-serif text-base sm:text-lg font-medium text-[#26262B] line-clamp-1 break-words">
              {product.name}
            </h3>
          </Link>

          {product.description && (
            <p className="text-[11px] sm:text-xs text-[#6B665E] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2.5 sm:pt-3 border-t border-[#DDD6C8]/60 flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] sm:text-xs text-[#8C867D]">Price</span>
            <span className="font-serif text-base sm:text-lg font-semibold text-[#26262B] truncate block">
              {formatCurrency(product.price)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link href={`/products/${product.slug}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 sm:h-9 sm:w-9 p-0"
                title="View product details"
                aria-label={`View details of ${product.name}`}
              >
                <Eye className="h-4 w-4 text-[#6B665E]" />
              </Button>
            </Link>

            <Button
              size="sm"
              disabled={isOutOfStock}
              onClick={handleQuickAdd}
              className={`min-h-[40px] sm:min-h-[36px] px-3 gap-1.5 text-xs ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>{isOutOfStock ? 'Out of stock' : 'Add'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
