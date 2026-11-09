import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { productCreateSchema } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = 20;

    const adminClient = createAdminClient();
    let query = adminClient
      .from('products')
      .select(
        `
        id,
        category_id,
        name,
        slug,
        description,
        sku,
        price,
        cost_price,
        stock_qty,
        reorder_level,
        color,
        material,
        width_cm,
        depth_cm,
        height_cm,
        is_featured,
        is_active,
        created_at,
        updated_at,
        category:categories(id, name, slug),
        images:product_images(id, storage_path, alt_text, sort_order)
      `,
        { count: 'exact' }
      );

    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error querying products in dashboard API:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to retrieve products' }, { status: 500 });
    }

    return NextResponse.json({
      products: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/products unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);

    const body = await request.json();
    const result = productCreateSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid product submission.';
      return NextResponse.json({ error: message, fieldErrors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const val = result.data;
    const adminClient = createAdminClient();

    // Check slug uniqueness
    const { data: existingSlug } = await adminClient
      .from('products')
      .select('id')
      .eq('slug', val.slug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'A piece with this URL slug already exists. Please choose a unique slug.' },
        { status: 409 }
      );
    }

    // Check SKU uniqueness
    const { data: existingSku } = await adminClient
      .from('products')
      .select('id')
      .eq('sku', val.sku)
      .maybeSingle();

    if (existingSku) {
      return NextResponse.json(
        { error: 'A piece with this SKU already exists. SKU must be unique across the catalog.' },
        { status: 409 }
      );
    }

    const { data: newProduct, error: insertError } = await adminClient
      .from('products')
      .insert({
        name: val.name.trim(),
        slug: val.slug.trim().toLowerCase(),
        sku: val.sku.trim().toUpperCase(),
        category_id: val.category_id || null,
        price: val.price,
        cost_price: val.cost_price ?? null,
        stock_qty: val.stock_qty ?? 0,
        reorder_level: val.reorder_level ?? 5,
        width_cm: val.width_cm ?? null,
        depth_cm: val.depth_cm ?? null,
        height_cm: val.height_cm ?? null,
        color: val.color?.trim() || null,
        material: val.material?.trim() || null,
        description: val.description?.trim() || null,
        is_featured: val.is_featured,
        is_active: val.is_active,
      } as any)
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting product in Supabase:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json({ error: 'Failed to create product. Please try again.' }, { status: 500 });
    }

    // Log activity
    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: 'product.created',
      entity_type: 'product',
      entity_id: (newProduct as any).id,
      metadata: { name: val.name, sku: val.sku, initial_stock: val.stock_qty },
    } as any);

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/dashboard/products unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
