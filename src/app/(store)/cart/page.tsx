'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, AlertTriangle, Minus, Plus, Armchair, RotateCcw } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { formatCurrency } from '@/lib/format';
import { siteConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getDeliveryFee, getTotal } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-fetch current prices and stock from the server on /cart
  useEffect(() => {
    if (!mounted || items.length === 0) return;

    async function syncCartWithServer() {
      setValidating(true);
      try {
        const ids = items.map((i) => i.product_id);
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
          setValidating(false);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setValidating(false);
          return;
        }

        const data = await res.json();
        const serverProducts = data.products as Array<{
          id: string;
          name: string;
          price: number;
          stock_qty: number;
          is_active: boolean;
        }>;

        const currentWarnings: string[] = [];

        items.forEach((item) => {
          const match = serverProducts.find((p) => p.id === item.product_id);

          if (!match || !match.is_active) {
            currentWarnings.push(`"${item.name}" is no longer available in our collection.`);
          } else if (match.stock_qty <= 0) {
            currentWarnings.push(`"${item.name}" is currently out of stock.`);
          } else if (match.stock_qty < item.quantity) {
            currentWarnings.push(
              `Only ${match.stock_qty} ${match.stock_qty === 1 ? 'unit' : 'units'} of "${item.name}" remaining in stock (you requested ${item.quantity}).`
            );
          }

          if (match && match.price !== item.price) {
            currentWarnings.push(
              `Price for "${item.name}" updated from ${formatCurrency(item.price)} to ${formatCurrency(match.price)}.`
            );
          }
        });

        setWarnings(currentWarnings);
      } catch (err) {
        console.warn('Cart sync error:', err);
      } finally {
        setValidating(false);
      }
    }

    syncCartWithServer();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-md mx-auto">
          <div className="h-8 bg-[#DDD6C8]/40 rounded"></div>
          <div className="h-24 bg-[#DDD6C8]/20 rounded"></div>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const freeThreshold = siteConfig.shipping.freeDeliveryThreshold;
  const freeDiff = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="container-custom py-12 space-y-8">
      <div className="border-b border-[#DDD6C8] pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
            Order Review
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#26262B] mt-1">
            Your Shopping Bag
          </h1>
        </div>

        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearCart();
              toast.info('Bag cleared');
            }}
            className="text-xs text-[#8C867D] hover:text-[#B3402F]"
          >
            Clear Bag
          </Button>
        )}
      </div>

      {/* Warnings if server stock or price changed */}
      {warnings.length > 0 && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50/80 p-4 space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Catalog & Inventory Notice:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#DDD6C8] bg-white p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EFEAE0] text-[#8C867D]">
            <ShoppingBag className="h-8 w-8 stroke-[1.25]" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-[#26262B]">
            Your shopping bag is empty
          </h2>
          <p className="text-sm text-[#6B665E] leading-relaxed">
            Explore our curated catalog of solid Sheesham and Oak furniture pieces.
          </p>
          <div className="pt-2">
            <Link href="/shop">
              <Button className="gap-2">
                Browse Collection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 items-start">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-[12px] border border-[#DDD6C8] bg-white divide-y divide-[#DDD6C8] overflow-hidden">
              {items.map((item) => (
                <div key={item.product_id} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch md:items-center justify-between">
                  {/* Thumbnail / Info */}
                  <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-[8px] border border-[#DDD6C8] bg-[#EFEAE0]">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 80px"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8C867D]">
                          <Armchair className="h-6 w-6 sm:h-8 sm:w-8 stroke-[1.25]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-serif text-sm sm:text-base font-medium text-[#26262B] hover:text-[#6B6B3A] transition-colors line-clamp-1 break-words"
                      >
                        {item.name}
                      </Link>
                      <span className="block text-[11px] sm:text-xs text-[#8C867D]">
                        SKU: {item.sku}
                      </span>
                      <span className="block text-xs sm:text-sm font-semibold text-[#6B6B3A]">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Total & Remove */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#DDD6C8]/50">
                    <div className="flex items-center rounded-[8px] border border-[#DDD6C8] bg-[#FAF7F0] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-[4px] text-[#26262B] hover:bg-white transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 sm:w-10 text-center text-xs sm:text-sm font-semibold text-[#26262B]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-[4px] text-[#26262B] hover:bg-white transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-serif text-base sm:text-lg font-semibold text-[#26262B] min-w-20 sm:min-w-24 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-[6px] text-[#8C867D] hover:text-[#B3402F] hover:bg-red-50 transition-colors"
                        title="Remove item"
                        aria-label={`Remove ${item.name} from bag`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href="/shop" className="text-xs text-[#6B6B3A] hover:underline font-medium min-h-[44px] flex items-center">
                ← Continue Shopping
              </Link>
              {validating && (
                <span className="text-xs text-[#8C867D] animate-pulse">
                  Verifying stock and pricing...
                </span>
              )}
            </div>
          </div>

          {/* Order Summary (Sticky on Desktop) */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-6 shadow-sm">
              <h2 className="font-serif text-xl font-medium text-[#26262B] border-b border-[#DDD6C8] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#6B665E]">
                  <span>Items Subtotal</span>
                  <span className="font-medium text-[#26262B]">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-[#6B665E]">
                  <div className="flex items-center gap-1.5">
                    <span>Delivery</span>
                    <Truck className="h-3.5 w-3.5 text-[#6B6B3A]" />
                  </div>
                  <span className="text-right">
                    {deliveryFee === 0 ? (
                      <span className="font-semibold text-[#6B6B3A]">FREE</span>
                    ) : (
                      <span>Calculated at checkout ({formatCurrency(deliveryFee)})</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#8C867D] italic">
                  Note: Final delivery is confirmed at checkout. Free nationwide shipping on orders over Rs 150,000.
                </p>

                {freeDiff > 0 && (
                  <div className="rounded-[8px] bg-[#FAF7F0] border border-[#DDD6C8] p-3 text-xs text-[#6B665E]">
                    Add <span className="font-semibold text-[#6B6B3A]">{formatCurrency(freeDiff)}</span> more to qualify for <span className="font-semibold text-[#26262B]">Free Delivery</span> across Pakistan.
                  </div>
                )}

                <div className="border-t border-[#DDD6C8] pt-3 flex justify-between items-baseline">
                  <span className="font-serif text-base font-semibold text-[#26262B]">
                    Estimated Total
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#6B6B3A]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Link href="/checkout" className="block">
                <Button size="lg" className="w-full gap-2 text-base h-12">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <div className="flex items-center gap-2 text-xs text-[#8C867D] justify-center">
                <ShieldCheck className="h-4 w-4 text-[#6B6B3A]" />
                <span>Cash on Delivery & Secure Bank Transfer</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
