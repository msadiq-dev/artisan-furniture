import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { supplierSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    await requireRole(['owner', 'manager', 'accounts'], false);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const adminClient = createAdminClient();
    let query = adminClient
      .from('suppliers')
      .select(`
        id,
        business_name,
        contact_name,
        email,
        phone,
        address,
        tax_id,
        notes,
        is_active,
        created_at
      `)
      .order('business_name', { ascending: true });

    if (q) {
      query = query.or(
        `business_name.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,tax_id.ilike.%${q}%`
      );
    }

    const { data: suppliers, error } = await query;

    if (error) {
      console.error('Error fetching suppliers:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to retrieve suppliers' }, { status: 500 });
    }

    return NextResponse.json({ suppliers: suppliers || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/suppliers unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole(['owner', 'manager', 'accounts'], false);

    const body = await request.json();
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Invalid supplier submission', fieldErrors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const val = result.data;
    const adminClient = createAdminClient();

    const { data: newSupplier, error: insertError } = await (adminClient as any)
      .from('suppliers')
      .insert({
        business_name: val.business_name.trim(),
        contact_name: val.contact_name?.trim() || null,
        email: val.email?.trim() || null,
        phone: val.phone?.trim() || null,
        address: val.address?.trim() || null,
        tax_id: val.tax_id?.trim() || null,
        notes: val.notes?.trim() || null,
        is_active: val.is_active,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating supplier in Supabase:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json({ error: 'Failed to register supplier. Please try again.' }, { status: 500 });
    }

    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: 'supplier.created',
      entity_type: 'supplier',
      entity_id: newSupplier.id,
      metadata: { business_name: val.business_name },
    } as any);

    return NextResponse.json({ supplier: newSupplier }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/dashboard/suppliers error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
