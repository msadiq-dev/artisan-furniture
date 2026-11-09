import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager', 'accounts'], false);
    const { id } = await context.params;

    const body = await request.json();
    const isActive = Boolean(body.is_active);

    const adminClient = createAdminClient();
    const { data, error } = await (adminClient as any)
      .from('suppliers')
      .update({
        is_active: isActive,
      })
      .eq('id', id)
      .select('id, business_name, is_active')
      .single();

    if (error) {
      console.error('Error toggling supplier status:', error);
      return NextResponse.json({ error: 'Failed to update supplier status' }, { status: 500 });
    }

    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: isActive ? 'supplier.activated' : 'supplier.deactivated',
      entity_type: 'supplier',
      entity_id: id,
      metadata: { is_active: isActive },
    } as any);

    return NextResponse.json({ success: true, supplier: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/dashboard/suppliers/[id]/status error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
