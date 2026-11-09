import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireRole(['owner', 'manager', 'inventory'], false);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const adminClient = createAdminClient();
    let query = adminClient
      .from('products')
      .select(`
        id,
        name,
        slug,
        sku,
        stock_qty,
        reorder_level,
        is_active,
        category:categories(id, name),
        images:product_images(id, storage_path, sort_order)
      `)
      .order('name', { ascending: true });

    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory items:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to retrieve inventory records' }, { status: 500 });
    }

    let items = (data || []) as any[];

    if (lowStockOnly) {
      items = items.filter((item) => (item.stock_qty ?? 0) <= (item.reorder_level ?? 5));
    }

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/inventory error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
