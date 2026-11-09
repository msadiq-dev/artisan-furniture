import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id } = await context.params;

    const body = await request.json();
    const isActive = Boolean(body.is_active);

    const adminClient = createAdminClient();
    const { data, error } = await (adminClient as any)
      .from('products')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, is_active')
      .single();

    if (error) {
      console.error('Error toggling product active status:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to update product status.' }, { status: 500 });
    }

    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: isActive ? 'product.activated' : 'product.deactivated',
      entity_type: 'product',
      entity_id: id,
      metadata: { is_active: isActive },
    } as any);

    return NextResponse.json({ success: true, product: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/dashboard/products/[id]/status unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
