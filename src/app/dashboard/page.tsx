import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  Clock,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireRole } from '@/lib/auth';
import type { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'sales', 'inventory', 'accounts'];

export default async function DashboardHomePage() {
  const profile = await requireRole(ALLOWED_ROLES, true);

  // Compute start of today in Asia/Karachi (UTC+5)
  const now = new Date();
  const karachiDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const startOfKarachiDayIso = new Date(`${karachiDateStr}T00:00:00+05:00`).toISOString();

  const role = profile.role;
  const canSeeOrders = ['owner', 'manager', 'sales', 'accounts'].includes(role);
  const canSeeRevenue = ['owner', 'manager', 'accounts', 'sales'].includes(role);
  const canSeeInventory = ['owner', 'manager', 'inventory'].includes(role);

  let ordersTodayCount = 0;
  let revenueToday = 0;
  let ordersNewCount = 0;
  let recentOrders: any[] = [];
  let lowStockCount = 0;
  let lowStockList: any[] = [];
  let fetchError: string | null = null;

  try {
    if (!isSupabaseAdminConfigured()) {
      // Database not connected yet; display empty state cleanly
    } else {
      const adminClient = createAdminClient();

      // 1. Orders data
      if (canSeeOrders) {
        // Orders created today (Asia/Karachi day)
        const { data: todayOrders, error: todayErr } = await adminClient
          .from('orders')
          .select('id, total, status, created_at')
          .gte('created_at', startOfKarachiDayIso);

        if (todayErr) {
          fetchError = 'Unable to load real-time order statistics.';
        } else if (todayOrders) {
          ordersTodayCount = todayOrders.length;
          if (canSeeRevenue) {
            revenueToday = (todayOrders as any[])
              .filter((o) => o.status !== 'cancelled')
              .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          }
        }

        // New orders awaiting confirmation
        const { count: newCount, error: newErr } = await adminClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new');

        if (newErr) {
          console.error('Error fetching new orders count:', newErr);
        } else {
          ordersNewCount = newCount || 0;
        }

        // Recent 10 orders table
        const { data: recOrders, error: recErr } = await adminClient
          .from('orders')
          .select(`
            id,
            order_number,
            total,
            payment_method,
            payment_status,
            status,
            created_at,
            customer:customers(full_name, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recErr) {
          console.error('Error fetching recent 10 orders for dashboard:', recErr);
        } else if (recOrders) {
          recentOrders = recOrders;
        }
      }

      // 2. Inventory data
      if (canSeeInventory) {
        const { data: products, error: prodErr } = await adminClient
          .from('products')
          .select(`
            id,
            name,
            sku,
            price,
            stock_qty,
            reorder_level,
            category:categories(name)
          `)
          .eq('is_active', true)
          .order('stock_qty', { ascending: true });

        if (prodErr) {
          console.error('Error fetching inventory for dashboard:', prodErr);
          if (!fetchError) fetchError = 'Unable to load inventory levels.';
        } else if (products) {
          const filtered = (products as any[]).filter(
            (p) => p.stock_qty <= (p.reorder_level ?? 3)
          );
          lowStockCount = filtered.length;
          lowStockList = filtered.slice(0, 10);
        }
      }
    }
  } catch (err: unknown) {
    console.error('DashboardHomePage unexpected error:', err);
    fetchError = 'A unexpected error occurred while querying operations data.';
  }

  const roleLabels: Record<UserRole, { label: string; variant: 'olive' | 'bronze' | 'blue' | 'amber' }> = {
    owner: { label: 'Owner & Director', variant: 'olive' },
    manager: { label: 'Store Manager', variant: 'olive' },
    sales: { label: 'Sales Concierge', variant: 'blue' },
    inventory: { label: 'Warehouse & Stock', variant: 'amber' },
    accounts: { label: 'Accounts & Finance', variant: 'bronze' },
  };

  const currentRoleInfo = roleLabels[role] || { label: role, variant: 'olive' };

  return (
    <div className="space-y-8">
      {/* Header with Role Scoping Badge */}
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
              Operations Center
            </span>
            <span className="text-[#8C867D]">•</span>
            <Badge variant={currentRoleInfo.variant} className="capitalize text-[11px]">
              {currentRoleInfo.label}
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-1">
            Studio Dashboard
          </h1>
          <p className="text-xs text-[#6B665E] mt-0.5">
            Real-time catalog, sales, and warehouse tracking for {karachiDateStr} (PKT).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSeeOrders && (
            <Link href="/dashboard/orders" className="w-full sm:w-auto">
              <Button size="sm" variant="outline" className="text-xs min-h-[44px] sm:min-h-9 w-full sm:w-auto">
                Manage Orders
              </Button>
            </Link>
          )}
          {canSeeInventory && (
            <Link href="/dashboard/inventory" className="w-full sm:w-auto">
              <Button size="sm" className="text-xs min-h-[44px] sm:min-h-9 w-full sm:w-auto">
                View Inventory
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {fetchError && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <span className="font-semibold block">Notice:</span>
            <span>{fetchError} Showing available cached values.</span>
          </div>
        </div>
      )}

      {/* KPI Metric Cards (Scoped to Role Permissions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeOrders && (
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6B665E]">Orders Today</span>
              <div className="p-2 rounded-full bg-[#6B6B3A]/10 text-[#6B6B3A]">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26262B] font-mono">
              {ordersTodayCount}
            </div>
            <span className="text-[11px] text-[#6B6B3A] flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" /> Since midnight PKT
            </span>
          </div>
        )}

        {canSeeRevenue && (
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6B665E]">Revenue Today</span>
              <div className="p-2 rounded-full bg-[#9C7A4B]/10 text-[#9C7A4B]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26262B] font-serif">
              {formatCurrency(revenueToday)}
            </div>
            <span className="text-[11px] text-[#8C867D]">
              Across active orders placed today
            </span>
          </div>
        )}

        {canSeeOrders && (
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6B665E]">New Orders</span>
              <div className="p-2 rounded-full bg-blue-50 text-blue-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26262B] font-mono">
              {ordersNewCount}
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Awaiting confirmation
            </span>
          </div>
        )}

        {canSeeInventory && (
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6B665E]">Low Stock Count</span>
              <div className="p-2 rounded-full bg-amber-50 text-amber-700">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26262B] font-mono">
              {lowStockCount}
            </div>
            <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3 w-3" /> stock_qty ≤ reorder_level
            </span>
          </div>
        )}
      </div>

      {/* Main Content Grid: Recent 10 Orders & Low-Stock List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recent 10 Orders Table (2 columns on desktop) */}
        {canSeeOrders && (
          <div className="lg:col-span-2 rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#26262B]">
                  Recent Orders
                </h2>
                <span className="text-xs text-[#8C867D]">
                  Latest 10 orders recorded in the system
                </span>
              </div>
              <Link
                href="/dashboard/orders"
                className="text-xs font-medium text-[#6B6B3A] hover:underline flex items-center gap-1"
              >
                View all orders
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8C867D] space-y-2">
                <PackageCheck className="h-8 w-8 text-[#8C867D] mx-auto opacity-50" />
                <p>No customer orders placed yet.</p>
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards (< md) */}
                <div className="md:hidden space-y-3">
                  {recentOrders.map((ord: any) => (
                    <Link
                      key={ord.id}
                      href={`/dashboard/orders/${ord.id}`}
                      className="block p-4 rounded-[10px] border border-[#DDD6C8] bg-[#FAF7F0]/60 hover:bg-[#FAF7F0] transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-[#26262B]">
                          {ord.order_number}
                        </span>
                        <span className="font-semibold text-sm text-[#26262B]">
                          {formatCurrency(ord.total)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#6B665E]">
                        <span>{ord.customer?.full_name || 'Walk-in Customer'}</span>
                        <span className="text-[11px] text-[#8C867D]">{formatDate(ord.created_at)}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#DDD6C8]/60">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              ord.status === 'new'
                                ? 'blue'
                                : ord.status === 'confirmed'
                                ? 'olive'
                                : ord.status === 'delivered'
                                ? 'green'
                                : ord.status === 'cancelled'
                                ? 'destructive'
                                : 'amber'
                            }
                            className="text-[10px] capitalize"
                          >
                            {(ord.status || 'new').replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={
                              ord.payment_status === 'paid'
                                ? 'green'
                                : ord.payment_status === 'pending_verification'
                                ? 'amber'
                                : 'outline'
                            }
                            className="text-[10px] capitalize"
                          >
                            {(ord.payment_status || 'unpaid').replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-[#6B6B3A] font-medium flex items-center">
                          View details →
                        </span>
                      </div>
                    </Link>
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
                        <TableHead className="text-center">Payment</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((ord: any) => (
                        <TableRow key={ord.id} className="hover:bg-[#FAF7F0] transition-colors">
                          <TableCell className="font-mono font-semibold text-[#26262B]">
                            <Link
                              href={`/dashboard/orders/${ord.id}`}
                              className="hover:text-[#6B6B3A] underline-offset-2 hover:underline"
                            >
                              {ord.order_number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[#26262B] text-xs">
                              {ord.customer?.full_name || 'Walk-in Customer'}
                            </div>
                            <div className="text-[11px] text-[#8C867D]">
                              {ord.customer?.phone || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {formatCurrency(ord.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                ord.payment_status === 'paid'
                                  ? 'green'
                                  : ord.payment_status === 'pending_verification'
                                  ? 'amber'
                                  : 'outline'
                              }
                              className="text-[10px] capitalize"
                            >
                              {(ord.payment_status || 'unpaid').replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                ord.status === 'new'
                                  ? 'blue'
                                  : ord.status === 'confirmed'
                                  ? 'olive'
                                  : ord.status === 'delivered'
                                  ? 'green'
                                  : ord.status === 'cancelled'
                                  ? 'destructive'
                                  : 'amber'
                              }
                              className="text-[10px] capitalize"
                            >
                              {(ord.status || 'new').replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[11px] text-[#8C867D]">
                            {formatDate(ord.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Right: Low-Stock List (1 column on desktop) */}
        {canSeeInventory && (
          <div className={`rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4 shadow-xs ${!canSeeOrders ? 'lg:col-span-3' : ''}`}>
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#26262B] flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Low-Stock Items
                </h2>
                <span className="text-xs text-[#8C867D]">
                  stock_qty ≤ reorder_level
                </span>
              </div>
              <Link
                href="/dashboard/inventory"
                className="text-xs font-medium text-[#6B6B3A] hover:underline"
              >
                Inventory →
              </Link>
            </div>

            {lowStockList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8C867D] space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-medium text-[#26262B]">All Stock Levels Healthy</p>
                <p className="text-[11px]">No products currently below their reorder threshold.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockList.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-[8px] border border-[#DDD6C8]/70 bg-[#FAF7F0] text-xs"
                  >
                    <div className="space-y-0.5 flex-1 pr-3">
                      <div className="font-medium text-[#26262B] line-clamp-1">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-[#8C867D] font-mono">
                        SKU: {prod.sku} • {prod.category?.name || 'Furniture'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#26262B]">
                        {prod.stock_qty <= 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            0 left
                          </Badge>
                        ) : (
                          <Badge variant="amber" className="text-[10px]">
                            {prod.stock_qty} left (min {prod.reorder_level ?? 3})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
