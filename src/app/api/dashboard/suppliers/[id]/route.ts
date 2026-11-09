import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { supplierSchema } from '@/lib/validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireRole(['owner', 'manager', 'accounts'], false);
    const { id } = await context.params;

    const adminClient = createAdminClient();
    const { data: supplier, error } = await adminClient
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching supplier by ID:', error);
      return NextResponse.json({ error: 'Failed to retrieve supplier' }, { status: 500 });
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/suppliers/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager', 'accounts'], false);
    const { id } = await context.params;

    const body = await request.json();
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Invalid supplier input', fieldErrors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const val = result.data;
    const adminClient = createAdminClient();

    const { data: updated, error } = await (adminClient as any)
      .from('suppliers')
      .update({
        business_name: val.business_name.trim(),
        contact_name: val.contact_name?.trim() || null,
        email: val.email?.trim() || null,
        phone: val.phone?.trim() || null,
        address: val.address?.trim() || null,
        tax_id: val.tax_id?.trim() || null,
        notes: val.notes?.trim() || null,
        is_active: val.is_active,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating supplier in Supabase:', error);
      return NextResponse.json({ error: 'Failed to update supplier details' }, { status: 500 });
    }

    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: 'supplier.updated',
      entity_type: 'supplier',
      entity_id: id,
      metadata: { business_name: val.business_name },
    } as any);

    return NextResponse.json({ supplier: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/dashboard/suppliers/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
