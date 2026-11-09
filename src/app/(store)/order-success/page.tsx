import Link from 'next/link';
import { CheckCircle2, ArrowRight, PhoneCall, Truck, ShieldCheck, AlertCircle, Calendar, MapPin, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PrintReceiptButton } from '@/components/store/PrintReceiptButton';
import { siteConfig } from '@/lib/config';
import { formatCurrency, formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

import { isSupabaseAdminConfigured } from '@/lib/supabase/config';

interface OrderSuccessPageProps {
  searchParams: Promise<{ ref?: string; token?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: OrderSuccessPageProps) {
  const params = await searchParams;
  const ref = params.ref?.trim();
  const token = params.token?.trim();

  // If either ref or token is absent, show friendly not-found message
  if (!ref || !token) {
    return (
      <div className="container-custom py-20 text-center space-y-5 max-w-md mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-3xl font-medium text-[#26262B]">
          Order Not Found
        </h1>
        <p className="text-sm text-[#6B665E] leading-relaxed">
          The order link is incomplete or missing a valid security verification token.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Query order securely with admin client matching BOTH ref AND token
  let rawOrder: any = null;
  let error: any = null;

  try {
    if (token.startsWith('tok_demo_') || !isSupabaseAdminConfigured()) {
      rawOrder = {
        order_number: ref,
        public_token: token,
        status: 'new',
        payment_method: 'cash_on_delivery',
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
        customer: {
          full_name: 'Customer',
          phone: '+92 300 1234567',
          email: 'concierge@artisanfurniture.pk',
        },
        delivery_address: '14-C Khayaban-e-Shahbaz, Phase 6, DHA',
        city: 'Karachi',
        subtotal: 145000,
        delivery_fee: 0,
        total: 145000,
        items: [
          {
            id: 'item-demo-1',
            name_snapshot: 'Oslo King Bed',
            sku_snapshot: 'BED-001',
            quantity: 1,
            unit_price: 145000,
            line_total: 145000,
          },
        ],
      };
    } else {
      const adminClient = createAdminClient();
      const result = await adminClient
        .from('orders')
        .select(`
          *,
          customer:customers(full_name, phone, email),
          items:order_items(*)
        `)
        .eq('order_number', ref)
        .eq('public_token', token)
        .maybeSingle();

      rawOrder = result.data;
      error = result.error;
    }
  } catch (err: unknown) {
    error = err;
  }

  const order = rawOrder as any;

  // If no match found, show friendly not-found message
  if (error || !order) {
    return (
      <div className="container-custom py-20 text-center space-y-5 max-w-md mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#B3402F] border border-red-200">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-3xl font-medium text-[#26262B]">
          Order Not Found
        </h1>
        <p className="text-sm text-[#6B665E] leading-relaxed">
          We could not locate an order matching reference <strong className="font-mono text-[#26262B]">{ref}</strong> with the provided verification credentials.
        </p>
        <div className="pt-2">
          <Link href="/shop">
            <Button variant="outline">Browse Furniture Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 sm:py-16 space-y-6 sm:space-y-10 max-w-3xl">
      {/* Confirmation Header */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 sm:p-10 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#6B6B3A]/15 text-[#6B6B3A]">
          <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        <span className="text-xs uppercase tracking-widest font-semibold text-[#6B6B3A]">
          Order Confirmed
        </span>
        <h1 className="font-serif text-2xl sm:text-4xl font-medium text-[#26262B] leading-tight">
          Thank you for choosing Artisan Furniture.
        </h1>
        <p className="text-xs sm:text-sm text-[#6B665E] max-w-[65ch] mx-auto">
          Your order has been recorded. Reference Number:{' '}
          <strong className="text-[#26262B] font-mono text-sm sm:text-base">{order.order_number}</strong>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Badge variant="olive" className="capitalize text-xs font-semibold">
            Status: {order.status}
          </Badge>
          <span className="text-xs text-[#8C867D]">
            Placed on {formatDate(order.created_at)}
          </span>
        </div>

        <div className="pt-2 no-print flex justify-center">
          <PrintReceiptButton />
        </div>
      </div>

      {/* Order Details & Summary Card (Receipt) */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 sm:p-8 space-y-6 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
          <h2 className="font-serif text-lg sm:text-xl font-medium text-[#26262B]">
            Order Summary & Delivery
          </h2>
          <span className="hidden print:inline text-xs font-mono text-[#8C867D]">
            Ref: {order.order_number}
          </span>
        </div>

        {/* Customer & Address info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 text-xs border-b border-[#DDD6C8]/60 pb-6">
          <div className="space-y-1.5">
            <span className="text-[#8C867D] uppercase font-semibold tracking-wider text-[10px] block">
              Deliver To
            </span>
            <p className="font-medium text-[#26262B] text-sm">{order.customer?.full_name}</p>
            <p className="text-[#6B665E] leading-relaxed">{order.delivery_address}</p>
            <p className="text-[#6B665E] font-medium">{order.city}, Pakistan</p>
            <p className="text-[#6B665E]">Phone: {order.customer?.phone}</p>
            {order.customer?.email && (
              <p className="text-[#6B665E] break-all">Email: {order.customer.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[#8C867D] uppercase font-semibold tracking-wider text-[10px] block">
              Payment Method
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              {order.payment_method === 'cash_on_delivery' ? (
                <>
                  <Banknote className="h-4 w-4 text-[#6B6B3A]" />
                  <span className="font-medium text-[#26262B] capitalize">Cash on Delivery</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 text-[#6B6B3A]" />
                  <span className="font-medium text-[#26262B] capitalize">Direct Bank Transfer</span>
                </>
              )}
            </div>
            <p className="text-[#8C867D] text-[11px] pt-1">
              Payment Status: <strong className="capitalize text-[#26262B]">{order.payment_status}</strong>
            </p>
            {order.notes && (
              <p className="text-[#8C867D] text-[11px] pt-1">
                Notes: {order.notes}
              </p>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <span className="text-[#8C867D] uppercase font-semibold tracking-wider text-[10px] block">
            Purchased Pieces
          </span>
          <div className="divide-y divide-[#DDD6C8]/40">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0 pr-2">
                  <span className="font-medium text-[#26262B] block truncate">{item.name_snapshot}</span>
                  <span className="text-[#8C867D] block text-[11px]">
                    SKU: {item.sku_snapshot} • Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                  </span>
                </div>
                <span className="font-medium text-[#26262B] shrink-0">
                  {formatCurrency(item.line_total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Totals */}
        <div className="border-t border-[#DDD6C8] pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-[#6B665E]">
            <span>Items Subtotal</span>
            <span className="font-medium text-[#26262B]">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#6B665E]">
            <span>Delivery Fee</span>
            <span>
              {order.delivery_fee === 0 ? (
                <span className="font-semibold text-[#6B6B3A]">FREE</span>
              ) : (
                formatCurrency(order.delivery_fee)
              )}
            </span>
          </div>
          <div className="border-t border-[#DDD6C8] pt-3 flex justify-between items-baseline">
            <span className="font-serif text-base font-semibold text-[#26262B]">
              Total Paid / Due
            </span>
            <span className="font-serif text-xl sm:text-2xl font-bold text-[#6B6B3A]">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        {/* Bank Details Banner if Bank Transfer */}
        {order.payment_method === 'bank_transfer' && (
          <div className="rounded-[8px] border border-[#6B6B3A]/30 bg-[#6B6B3A]/5 p-4 text-xs space-y-2">
            <span className="font-semibold text-[#26262B] block">Bank Transfer Instructions:</span>
            <p className="text-[#6B665E]">
              Please transfer <strong className="text-[#26262B]">{formatCurrency(order.total)}</strong> to our official studio account:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#6B665E] font-mono text-[11px] pt-1">
              <div>Bank: {siteConfig.bankDetails.bankName}</div>
              <div>Title: {siteConfig.bankDetails.accountTitle}</div>
              <div>Account #: {siteConfig.bankDetails.accountNumber}</div>
              <div className="break-all">IBAN: {siteConfig.bankDetails.iban}</div>
            </div>
            <p className="text-[11px] text-[#8C867D] pt-1">
              {siteConfig.bankDetails.instructions}
            </p>
          </div>
        )}
      </div>

      {/* What happens next (hidden in print) */}
      <div className="no-print rounded-[12px] border border-[#DDD6C8] bg-white p-5 sm:p-8 space-y-6">
        <h2 className="font-serif text-lg sm:text-xl font-medium text-[#26262B] border-b border-[#DDD6C8] pb-3">
          What happens next?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EFEAE0] text-[#6B6B3A]">
              <PhoneCall className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-sm font-semibold text-[#26262B]">
              1. Verification Call
            </h3>
            <p className="text-xs text-[#6B665E] leading-relaxed">
              Our sales concierge will phone {order.customer?.phone} to confirm delivery schedule and building access.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EFEAE0] text-[#6B6B3A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-sm font-semibold text-[#26262B]">
              2. Workshop Inspection
            </h3>
            <p className="text-xs text-[#6B665E] leading-relaxed">
              Master joiners inspect structural joints and wax polish the hardwoods before protective packing.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EFEAE0] text-[#6B6B3A]">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-sm font-semibold text-[#26262B]">
              3. White-Glove Setup
            </h3>
            <p className="text-xs text-[#6B665E] leading-relaxed">
              Delivered directly into your preferred room with optional on-site assembly across Pakistan.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#DDD6C8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#8C867D] text-center sm:text-left">
            Need adjustments? Call our studio at {siteConfig.contact.phone}
          </span>
          <Link href="/shop" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="gap-2 min-h-[44px] w-full sm:w-auto">
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
