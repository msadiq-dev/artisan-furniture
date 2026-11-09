'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Truck, ShoppingBag, AlertTriangle, Armchair, ChevronDown, ChevronUp } from 'lucide-react';
import { OrderForm } from '@/components/store/OrderForm';
import { useCartStore } from '@/store/cart';
import { formatCurrency } from '@/lib/format';
import { siteConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const { items, getSubtotal, getDeliveryFee, getTotal } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-fetch current prices and stock from the server on /checkout
  useEffect(() => {
    if (!mounted || items.length === 0) return;

    async function syncCheckoutWithServer() {
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
            currentWarnings.push(`"${item.name}" is no longer available.`);
          } else if (match.stock_qty <= 0) {
            currentWarnings.push(`"${item.name}" is currently out of stock.`);
          } else if (match.stock_qty < item.quantity) {
            currentWarnings.push(
              `Only ${match.stock_qty} ${match.stock_qty === 1 ? 'unit' : 'units'} of "${item.name}" remaining in stock.`
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
        console.warn('Checkout sync error:', err);
      } finally {
        setValidating(false);
      }
    }

    syncCheckoutWithServer();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-md mx-auto">
          <div className="h-8 bg-[#DDD6C8]/40 rounded"></div>
          <div className="h-32 bg-[#DDD6C8]/20 rounded"></div>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center space-y-4 max-w-md mx-auto">
        <ShoppingBag className="h-12 w-12 text-[#8C867D] mx-auto" />
        <h1 className="font-serif text-2xl font-medium text-[#26262B]">
          Your bag is empty
        </h1>
        <p className="text-sm text-[#6B665E]">
          Add pieces from our handcrafted catalog before proceeding to checkout.
        </p>
        <div className="pt-2">
          <Link href="/shop">
            <Button>Explore Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-10 space-y-8">
      <div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#6B665E] hover:text-[#6B6B3A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shopping Bag
        </Link>
      </div>

      <div className="border-b border-[#DDD6C8] pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
          Direct Checkout
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#26262B] mt-1">
          Delivery & Payment Details
        </h1>
      </div>

      {/* Warnings if server stock or price changed */}
      {warnings.length > 0 && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50/80 p-4 space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Inventory Alert:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile/Tablet Portrait Collapsible Order Summary Banner (<lg) */}
      <div className="lg:hidden rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          className="w-full flex items-center justify-between p-4 bg-[#FAF7F0] text-xs font-medium text-[#26262B] min-h-[48px]"
          aria-expanded={mobileSummaryOpen}
        >
          <div className="flex items-center gap-2 text-[#6B6B3A]">
            <ShoppingBag className="h-4 w-4" />
            <span>{mobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
            {mobileSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <span className="font-serif text-base font-semibold text-[#26262B]">
            {formatCurrency(total)}
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="p-4 sm:p-5 border-t border-[#DDD6C8] space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-[#DDD6C8]/60">
              {items.map((item) => (
                <div key={item.product_id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-[#26262B] line-clamp-1">{item.name}</span>
                    <span className="text-[#8C867D] block text-[11px]">
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="font-medium text-[#26262B] shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#DDD6C8] pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B665E]">
                <span>Items Subtotal</span>
                <span className="font-medium text-[#26262B]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#6B665E]">
                <span>Delivery (Pakistan)</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="font-semibold text-[#6B6B3A]">FREE</span>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>
              <div className="border-t border-[#DDD6C8] pt-2 flex justify-between items-baseline">
                <span className="font-serif text-sm font-semibold text-[#26262B]">Total</span>
                <span className="font-serif text-lg font-bold text-[#6B6B3A]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 items-start">
        {/* Left: Main Order & Address Form */}
        <div className="lg:col-span-2 rounded-[12px] border border-[#DDD6C8] bg-white p-5 sm:p-8 shadow-sm">
          <OrderForm />
        </div>

        {/* Right: Order Summary Sidebar (Desktop only) */}
        <div className="hidden lg:block lg:sticky lg:top-24 space-y-6">
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-5 shadow-sm">
            <h2 className="font-serif text-lg font-medium text-[#26262B] border-b border-[#DDD6C8] pb-3">
              Order Items ({items.length})
            </h2>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 divide-y divide-[#DDD6C8]/60">
              {items.map((item) => (
                <div key={item.product_id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-[#26262B] line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-[#8C867D] block">
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="font-medium text-[#26262B] shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#DDD6C8] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#6B665E]">
                <span>Items Subtotal</span>
                <span className="font-medium text-[#26262B]">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-[#6B665E]">
                <span>Delivery (Pakistan)</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="font-semibold text-[#6B6B3A]">FREE</span>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>

              <div className="border-t border-[#DDD6C8] pt-3 flex justify-between items-baseline">
                <span className="font-serif text-base font-semibold text-[#26262B]">
                  Total
                </span>
                <span className="font-serif text-xl font-bold text-[#6B6B3A]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="rounded-[8px] bg-[#FAF7F0] p-3 text-[11px] text-[#6B665E] space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-[#26262B]">
                <Truck className="h-3.5 w-3.5 text-[#6B6B3A]" />
                <span>White Glove Delivery</span>
              </div>
              <p>Free delivery on orders over Rs 150,000. Standard delivery fee is Rs 2,500.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
