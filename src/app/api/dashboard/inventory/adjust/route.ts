import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adjustStockSchema } from '@/lib/validators';

function mapStockAdjustmentError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('FORBIDDEN')) {
    return 'You do not have permission to adjust stock (requires Owner, Manager, or Inventory role).';
  }
  if (msg.includes('INVALID_TYPE')) {
    return 'Invalid adjustment type selected. Allowed: manual adjustment, damage, or return.';
  }
  if (msg.includes('INVALID_DELTA')) {
    return 'Adjustment amount cannot be zero.';
  }
  if (msg.includes('NOT_FOUND')) {
    return 'Product was not found in the catalog.';
  }
  if (
    msg.includes('violates check constraint') ||
    msg.includes('stock_qty') ||
    msg.includes('violates check') ||
    msg.includes('below zero')
  ) {
    return 'Stock cannot be reduced below 0. Check the entered reduction amount.';
  }
  return 'Failed to record stock adjustment. Please try again.';
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole(['owner', 'manager', 'inventory'], false);

    const body = await request.json();
    const result = adjustStockSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Invalid stock adjustment input' },
        { status: 400 }
      );
    }

    const { product_id, delta, type, note } = result.data;

    // Use server supabase client with user credentials
    const supabase = await createClient();

    let rpcRes = await (supabase as any).rpc('adjust_stock', {
      p_product: product_id,
      p_delta: delta,
      p_type: type,
      p_note: note.trim(),
    });

    // If server auth context is not passed via session or RLS bypass is needed, fallback to admin client
    if (rpcRes.error && rpcRes.error.message?.includes('FORBIDDEN') && ['owner', 'manager', 'inventory'].includes(profile.role)) {
      const adminClient = createAdminClient();
      rpcRes = await (adminClient as any).rpc('adjust_stock', {
        p_product: product_id,
        p_delta: delta,
        p_type: type,
        p_note: note.trim(),
      });
    }

    if (rpcRes.error) {
      console.error('adjust_stock RPC error on server:', {
        message: rpcRes.error.message,
        code: rpcRes.error.code,
        details: rpcRes.error.details,
        hint: rpcRes.error.hint,
      });
      const userMessage = mapStockAdjustmentError(rpcRes.error);
      return NextResponse.json({ error: userMessage }, { status: 400 });
    }

    const newStock = rpcRes.data;

    return NextResponse.json({
      success: true,
      new_stock: newStock,
      message: `Stock updated successfully to ${newStock} units.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/dashboard/inventory/adjust error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
