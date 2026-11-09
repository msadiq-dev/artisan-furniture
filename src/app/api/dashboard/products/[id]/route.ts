import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { productUpdateSchema } from '@/lib/validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id } = await context.params;

    const adminClient = createAdminClient();
    const { data: product, error } = await adminClient
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(id, storage_path, alt_text, sort_order)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product by ID:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: 'Failed to retrieve product' }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const prod = product as any;

    // Sort images by sort_order
    if (prod.images && Array.isArray(prod.images)) {
      prod.images.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }

    return NextResponse.json({ product: prod });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/dashboard/products/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id } = await context.params;

    const body = await request.json();
    const result = productUpdateSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid product submission.';
      return NextResponse.json({ error: message, fieldErrors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const val = result.data;
    const adminClient = createAdminClient();

    // Check slug uniqueness against other products
    const { data: existingSlug } = await adminClient
      .from('products')
      .select('id')
      .eq('slug', val.slug)
      .neq('id', id)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'A piece with this URL slug already exists. Please choose a unique slug.' },
        { status: 409 }
      );
    }

    // Check SKU uniqueness against other products
    const { data: existingSku } = await adminClient
      .from('products')
      .select('id')
      .eq('sku', val.sku)
      .neq('id', id)
      .maybeSingle();

    if (existingSku) {
      return NextResponse.json(
        { error: 'A piece with this SKU already exists. SKU must be unique across the catalog.' },
        { status: 409 }
      );
    }

    // Update product fields - Note: stock_qty is explicitly preserved and not updated here
    const { data: updatedProduct, error: updateError } = await (adminClient as any)
      .from('products')
      .update({
        name: val.name.trim(),
        slug: val.slug.trim().toLowerCase(),
        sku: val.sku.trim().toUpperCase(),
        category_id: val.category_id || null,
        price: val.price,
        cost_price: val.cost_price ?? null,
        reorder_level: val.reorder_level ?? 5,
        width_cm: val.width_cm ?? null,
        depth_cm: val.depth_cm ?? null,
        height_cm: val.height_cm ?? null,
        color: val.color?.trim() || null,
        material: val.material?.trim() || null,
        description: val.description?.trim() || null,
        is_featured: val.is_featured,
        is_active: val.is_active,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .single();

    if (updateError) {
      console.error('Error updating product in Supabase:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      return NextResponse.json({ error: 'Failed to update product details.' }, { status: 500 });
    }

    // Log activity
    await adminClient.from('activity_logs').insert({
      actor_id: profile.id,
      action: 'product.updated',
      entity_type: 'product',
      entity_id: id,
      metadata: { name: val.name, sku: val.sku },
    } as any);

    return NextResponse.json({ product: updatedProduct });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/dashboard/products/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
