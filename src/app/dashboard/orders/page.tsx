import Link from 'next/link';
import { ChevronRight, ChevronLeft, AlertCircle, ShoppingBag } from 'lucide-react';
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
import { OrdersFilterBar } from '@/components/dashboard/OrdersFilterBar';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireRole } from '@/lib/auth';
import type { UserRole, OrderStatus, PaymentStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'sales'];
const PAGE_SIZE = 20;

interface OrdersListPageProps {
  searchParams: Promise<{
    status?: string;
    payment_status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function OrdersListPage({ searchParams }: OrdersListPageProps) {
  const profile = await requireRole(ALLOWED_ROLES, true);
  const params = await searchParams;

  const statusFilter = params.status?.trim() || '';
  const paymentStatusFilter = params.payment_status?.trim() || '';
  const searchFilter = params.q?.trim() || '';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);

  let orders: any[] = [];
  let totalCount = 0;
  let fetchError: string | null = null;

  try {
    if (!isSupabaseAdminConfigured()) {
      // Database not connected yet
    } else {
      const adminClient = createAdminClient();

      let query = adminClient
        .from('orders')
        .select(
          `
          id,
          order_number,
          total,
          payment_method,
          payment_status,
          status,
          created_at,
          customer:customers(full_name, phone)
        `,
          { count: 'exact' }
        );

      // Status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      // Payment status filter
      if (paymentStatusFilter) {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      // Search by order number or customer phone
      if (searchFilter) {
        // If it starts with 'FRN' or has hyphens, match order_number, otherwise match customer phone or order_number
        query = query.or(
          `order_number.ilike.%${searchFilter}%,customer.phone.ilike.%${searchFilter}%,customer.full_name.ilike.%${searchFilter}%`
        );
      }

      // Sort newest first
      query = query.order('created_at', { ascending: false });

      // Pagination: 20 per page
      const offset = (currentPage - 1) * PAGE_SIZE;
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching dashboard orders list from Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        fetchError = 'Unable to load customer orders from database.';
      } else {
        orders = data || [];
        totalCount = count || 0;
      }
    }
  } catch (err: unknown) {
    console.error('OrdersListPage unexpected exception:', err);
    fetchError = 'An unexpected error occurred while loading orders.';
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildPaginationUrl = (pageNumber: number) => {
    const sp = new URLSearchParams();
    if (statusFilter) sp.set('status', statusFilter);
    if (paymentStatusFilter) sp.set('payment_status', paymentStatusFilter);
    if (searchFilter) sp.set('q', searchFilter);
    sp.set('page', pageNumber.toString());
    return `/dashboard/orders?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
            Fulfillment
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-0.5">
            Customer Orders
          </h1>
          <p className="text-xs text-[#6B665E] mt-0.5">
            Manage order verification, production dispatch, and payment reconciliation.
          </p>
        </div>
      </div>

      {/* Error State Banner */}
      {fetchError && (
        <div className="rounded-[10px] border border-red-300 bg-red-50 p-4 text-xs text-[#B3402F] flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#B3402F] mt-0.5" />
          <div>
            <span className="font-semibold block">Failed to load orders:</span>
            <span>{fetchError}</span>
          </div>
        </div>
      )}

      {/* Interactive Filters Bar */}
      <OrdersFilterBar
        initialSearch={searchFilter}
        initialStatus={statusFilter}
        initialPaymentStatus={paymentStatusFilter}
      />

      {/* Orders Table */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-xs">
        {orders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 text-[#8C867D] mx-auto opacity-40" />
            <h3 className="font-serif text-lg font-medium text-[#26262B]">
              No orders found
            </h3>
            <p className="text-xs text-[#6B665E] max-w-sm mx-auto">
              {searchFilter || statusFilter || paymentStatusFilter
                ? 'No customer orders match the applied filters. Try adjusting or clearing search parameters.'
                : 'No customer orders have been recorded in the database yet.'}
            </p>
            {(searchFilter || statusFilter || paymentStatusFilter) && (
              <div className="pt-2">
                <Link href="/dashboard/orders">
                  <Button variant="outline" size="sm" className="text-xs">
                    Clear Filters
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Stacked Orders (< md) */}
            <div className="md:hidden divide-y divide-[#DDD6C8]/60">
              {orders.map((order) => (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono font-bold text-sm text-[#26262B] hover:text-[#6B6B3A]"
                    >
                      {order.order_number}
                    </Link>
                    <span className="font-semibold text-sm text-[#26262B]">
                      {formatCurrency(order.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6B665E]">
                    <div>
                      <span className="font-medium text-[#26262B]">{order.customer?.full_name || 'Walk-in Customer'}</span>
                      <span className="block text-[11px] text-[#8C867D]">{order.customer?.phone || '—'}</span>
                    </div>
                    <span className="text-[11px] text-[#8C867D]">{formatDate(order.created_at)}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DDD6C8]/40">
                    <div className="flex items-center gap-1.5">
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
                        className="text-[10px] capitalize"
                      >
                        {(order.status || 'new').replace('_', ' ')}
                      </Badge>
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
                        {(order.payment_status || 'unpaid').replace('_', ' ')}
                      </Badge>
                    </div>

                    <Link href={`/dashboard/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="min-h-[40px] text-xs gap-1">
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#8C867D]" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                    <TableHead className="text-center">Order Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-[#FAF7F0] transition-colors">
                      <TableCell className="font-mono font-semibold text-[#26262B]">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="hover:text-[#6B6B3A] underline-offset-2 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-[#26262B] text-xs">
                          {order.customer?.full_name || 'Walk-in Customer'}
                        </div>
                        <div className="text-[11px] text-[#8C867D]">
                          {order.customer?.phone || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            order.payment_status === 'paid'
                              ? 'green'
                              : order.payment_status === 'pending_verification'
                              ? 'amber'
                              : 'outline'
                          }
                          className="text-[11px] capitalize"
                        >
                          {(order.payment_status || 'unpaid').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
                          className="text-[11px] capitalize"
                        >
                          {(order.status || 'new').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#8C867D]">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                            <span>Details</span>
                            <ChevronRight className="h-3.5 w-3.5 text-[#8C867D]" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Pagination Controls (20 per page) */}
      {totalPages > 1 && (
        <div className="border-t border-[#DDD6C8] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#8C867D]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} orders
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <Link
              href={buildPaginationUrl(currentPage - 1)}
              className={`${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''} flex-1 sm:flex-initial`}
            >
              <Button variant="outline" size="sm" disabled={currentPage <= 1} className="gap-1 text-xs min-h-[44px] sm:min-h-9 w-full sm:w-auto">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>

            <span className="text-xs font-medium text-[#26262B] px-3 shrink-0">
              Page {currentPage} of {totalPages}
            </span>

            <Link
              href={buildPaginationUrl(currentPage + 1)}
              className={`${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''} flex-1 sm:flex-initial`}
            >
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="gap-1 text-xs min-h-[44px] sm:min-h-9 w-full sm:w-auto">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
