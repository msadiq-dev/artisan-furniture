import Link from 'next/link';
import { ArrowLeft, User, MapPin, CreditCard, Clock, AlertCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderActions } from '@/components/dashboard/OrderActions';
import { PrintReceiptButton } from '@/components/store/PrintReceiptButton';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireRole } from '@/lib/auth';
import type { UserRole, OrderStatus, PaymentStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'sales'];

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const profile = await requireRole(ALLOWED_ROLES, true);
  const { id } = await params;

  let order: any = null;
  let fetchError: string | null = null;

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      fetchError = 'Database credentials not configured';
    } else {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('orders')
        .select(`
          *,
          customer:customers(full_name, phone, email),
          items:order_items(id, name_snapshot, sku_snapshot, quantity, unit_price, line_total)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order detail from Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        fetchError = 'Unable to query order details from database.';
      } else {
        order = data;
      }
    }
  } catch (err: unknown) {
    console.error('OrderDetailPage unexpected exception:', err);
    fetchError = 'An unexpected error occurred while retrieving order.';
  }

  // Not found or error state
  if (fetchError || !order) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-xs text-[#6B665E] hover:text-[#6B6B3A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-12 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-[#8C867D] mx-auto opacity-50" />
          <h2 className="font-serif text-xl font-medium text-[#26262B]">
            Order Not Found
          </h2>
          <p className="text-xs text-[#6B665E] leading-relaxed max-w-sm mx-auto">
            {fetchError || `We could not locate an order matching identifier "${id}".`}
          </p>
          <div className="pt-2">
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm" className="text-xs">
                Return to Orders List
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button, Print button and Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4 no-print">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-xs text-[#6B665E] hover:text-[#6B6B3A] transition-colors min-h-[44px] py-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <PrintReceiptButton />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DDD6C8] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#26262B]">
                {order.order_number}
              </h1>
              <Badge
                variant={
                  order.status === 'new'
                    ? 'blue'
                    : order.status === 'confirmed'
                    ? 'olive'
                    : order.status === 'delivered'
                    ? 'green'
                    : order.status === 'cancelled'
                    ? 'destructive'
                    : 'amber'
                }
                className="capitalize text-xs font-semibold"
              >
                {order.status.replace('_', ' ')}
              </Badge>
              <Badge
                variant={
                  order.payment_status === 'paid'
                    ? 'green'
                    : order.payment_status === 'pending_verification'
                    ? 'amber'
                    : 'outline'
                }
                className="capitalize text-xs font-semibold"
              >
                {order.payment_status.replace('_', ' ')}
              </Badge>
            </div>
            <span className="text-xs text-[#8C867D] block break-all">
              Internal UUID: <code className="font-mono text-[11px]">{order.id}</code> • Placed on {formatDate(order.created_at)}
            </span>
          </div>

          {/* Action buttons (calls update_order_status and mark_order_payment RPCs) */}
          <div className="bg-[#FAF7F0] p-4 rounded-[12px] border border-[#DDD6C8] no-print">
            <OrderActions
              orderId={order.id}
              orderNumber={order.order_number}
              currentStatus={order.status as OrderStatus}
              currentPaymentStatus={order.payment_status as PaymentStatus}
              userRole={profile.role}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 cols: Ordered Items Table & Totals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <h2 className="font-serif text-lg font-semibold text-[#26262B] flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#6B6B3A]" />
                Purchased Pieces (Snapshot)
              </h2>
              <span className="text-xs text-[#8C867D]">
                {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-[#26262B]">
                        {item.name_snapshot}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#8C867D]">
                        {item.sku_snapshot}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-[#26262B]">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-[#26262B]">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-[#DDD6C8] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B665E]">
                <span>Items Subtotal</span>
                <span className="font-medium text-[#26262B]">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#6B665E]">
                <span>Delivery Fee (Nationwide)</span>
                <span>
                  {order.delivery_fee === 0 ? (
                    <span className="font-semibold text-[#6B6B3A]">FREE</span>
                  ) : (
                    formatCurrency(order.delivery_fee)
                  )}
                </span>
              </div>
              <div className="border-t border-[#DDD6C8] pt-2 flex justify-between items-baseline">
                <span className="font-serif text-base font-semibold text-[#26262B]">
                  Order Total
                </span>
                <span className="font-serif text-xl font-bold text-[#6B6B3A]">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 col: Customer Info, Address, Notes & Payment */}
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-semibold text-[#26262B] flex items-center gap-2 border-b border-[#DDD6C8] pb-3">
              <User className="h-4 w-4 text-[#6B6B3A]" />
              Customer Details
            </h2>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-[#8C867D] block text-[11px]">Full Name</span>
                <p className="font-medium text-[#26262B] text-sm">
                  {order.customer?.full_name || 'Walk-in Customer'}
                </p>
              </div>
              <div>
                <span className="text-[#8C867D] block text-[11px]">Phone Number</span>
                <p className="font-mono text-[#26262B]">
                  {order.customer?.phone || '—'}
                </p>
              </div>
              {order.customer?.email && (
                <div>
                  <span className="text-[#8C867D] block text-[11px]">Email</span>
                  <p className="text-[#6B665E]">{order.customer.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Location & Notes */}
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-semibold text-[#26262B] flex items-center gap-2 border-b border-[#DDD6C8] pb-3">
              <MapPin className="h-4 w-4 text-[#6B6B3A]" />
              Delivery Destination
            </h2>
            <div className="text-xs space-y-2 text-[#6B665E]">
              <div>
                <span className="text-[#8C867D] block text-[11px]">Street Address</span>
                <p className="text-[#26262B] font-medium leading-relaxed">
                  {order.delivery_address}
                </p>
              </div>
              <div>
                <span className="text-[#8C867D] block text-[11px]">City</span>
                <p className="text-[#26262B] font-medium">{order.city}, Pakistan</p>
              </div>
              <div className="pt-2 border-t border-[#DDD6C8]/60">
                <span className="text-[#8C867D] block text-[11px]">Delivery Notes</span>
                <p className="text-[#6B665E] italic">
                  {order.notes || 'No special delivery instructions provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs">
            <h2 className="font-serif text-base font-semibold text-[#26262B] flex items-center gap-2 border-b border-[#DDD6C8] pb-3">
              <CreditCard className="h-4 w-4 text-[#6B6B3A]" />
              Payment Details
            </h2>
            <div className="text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#8C867D]">Method</span>
                <span className="font-medium text-[#26262B] capitalize">
                  {order.payment_method?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C867D]">Status</span>
                <Badge
                  variant={
                    order.payment_status === 'paid'
                      ? 'green'
                      : order.payment_status === 'pending_verification'
                      ? 'amber'
                      : 'outline'
                  }
                  className="text-[10px] capitalize"
                >
                  {order.payment_status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
