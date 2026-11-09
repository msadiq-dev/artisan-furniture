import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';

export async function GET() {
  try {
    // 1. Guard with requireRole (all authenticated staff roles allowed)
    let profile;
    try {
      profile = await requireRole(['owner', 'manager', 'sales', 'inventory', 'accounts'], false);
    } catch (authErr: unknown) {
      const msg = authErr instanceof Error ? authErr.message : 'UNAUTHORIZED';
      if (msg === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (msg === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw authErr;
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({
        role: profile.role,
        user_name: profile.full_name,
        orders_today: 0,
        revenue_today: 0,
        orders_new: 0,
        low_stock_count: 0,
        recent_orders: [],
        low_stock: [],
        karachi_date: new Date().toISOString().split('T')[0],
      });
    }

    const adminClient = createAdminClient();

    // 2. Compute start of today in Asia/Karachi (UTC+5)
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

    let ordersTodayCount: number | null = null;
    let revenueToday: number | null = null;
    let ordersNewCount: number | null = null;
    let recentOrders: any[] = [];
    let lowStockCount: number | null = null;
    let lowStockList: any[] = [];

    // 3. Query Orders data if role permits
    if (canSeeOrders) {
      // Orders today (Asia/Karachi day)
      const { data: todayOrders, error: todayErr } = await adminClient
        .from('orders')
        .select('id, total, status, created_at')
        .gte('created_at', startOfKarachiDayIso);

      if (todayErr) {
        console.error('Error fetching today orders for summary:', {
          message: todayErr.message,
          code: todayErr.code,
          details: todayErr.details,
          hint: todayErr.hint,
        });
      } else if (todayOrders) {
        ordersTodayCount = todayOrders.length;
        if (canSeeRevenue) {
          revenueToday = (todayOrders as any[])
            .filter((o: any) => o.status !== 'cancelled')
            .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        }
      }

      // New orders awaiting action
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
        console.error('Error fetching recent 10 orders:', recErr);
      } else if (recOrders) {
        recentOrders = recOrders;
      }
    }

    // 4. Query Inventory data if role permits
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
        console.error('Error fetching inventory for summary:', prodErr);
      } else if (products) {
        const filtered = products.filter(
          (p: any) => p.stock_qty <= (p.reorder_level ?? 3)
        );
        lowStockCount = filtered.length;
        lowStockList = filtered.slice(0, 10);
      }
    }

    return NextResponse.json({
      role,
      user_name: profile.full_name,
      orders_today: ordersTodayCount,
      revenue_today: revenueToday,
      orders_new: ordersNewCount,
      low_stock_count: lowStockCount,
      recent_orders: recentOrders,
      low_stock: lowStockList,
      karachi_date: karachiDateStr,
    });
  } catch (err: unknown) {
    console.error('GET /api/dashboard/summary exception:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading dashboard summary.' },
      { status: 500 }
    );
  }
}
