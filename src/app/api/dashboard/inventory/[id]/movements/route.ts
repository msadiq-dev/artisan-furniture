import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireRole(['owner', 'manager', 'inventory'], false);
    const { id } = await context.params;

    const adminClient = createAdminClient();

    // Fetch movements newest first with actor profile info
    const { data: movements, error } = await (adminClient as any)
      .from('stock_movements')
      .select(`
        id,
        product_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        note,
        created_by,
        created_at,
        actor:profiles(id, full_name, role)
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock movements:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to retrieve stock movement history' }, { status: 500 });
    }

    return NextResponse.json({ movements: movements || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/inventory/[id]/movements error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
