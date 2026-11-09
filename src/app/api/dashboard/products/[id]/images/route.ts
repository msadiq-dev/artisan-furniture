import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getExtension(filename: string, mimeType: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase();
    if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
    if (ext === 'png') return 'png';
    if (ext === 'webp') return 'webp';
  }
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id } = await context.params;

    const adminClient = createAdminClient();

    // Fetch product to get slug and name
    const { data: product, error: prodErr } = await adminClient
      .from('products')
      .select('id, name, slug')
      .eq('id', id)
      .maybeSingle();

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const prod = product as any;

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No image files provided' }, { status: 400 });
    }

    // Fetch existing images to compute sort_order and naming index
    const { data: existingImages } = await (adminClient as any)
      .from('product_images')
      .select('id, storage_path, sort_order')
      .eq('product_id', id)
      .order('sort_order', { ascending: true });

    let currentCount = existingImages?.length || 0;
    let nextSortOrder = currentCount > 0
      ? Math.max(...(existingImages || []).map((img: any) => img.sort_order ?? 0)) + 1
      : 0;

    const insertedRows: any[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" is not supported. Only JPEG, PNG, and WebP images are allowed.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 5 MB maximum size limit.` },
          { status: 400 }
        );
      }

      const ext = getExtension(file.name, file.type);
      // Requirement 3: Name files <slug>.<ext> for the first and <slug>_2.<ext>, <slug>_3.<ext> for others
      let fileName: string;
      if (currentCount === 0) {
        fileName = `${prod.slug}.${ext}`;
      } else {
        fileName = `${prod.slug}_${currentCount + 1}.${ext}`;
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to public "product-images" bucket
      const { error: uploadError } = await adminClient.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error in product images API:', uploadError);
        return NextResponse.json(
          { error: `Failed to upload image "${file.name}". Please try again.` },
          { status: 500 }
        );
      }

      // Insert product_images row
      const { data: imgRow, error: imgError } = await (adminClient as any)
        .from('product_images')
        .insert({
          product_id: id,
          storage_path: fileName,
          alt_text: prod.name,
          sort_order: nextSortOrder,
        })
        .select('*')
        .single();

      if (imgError) {
        console.error('Error inserting product_images row:', imgError);
        return NextResponse.json({ error: 'Failed to record product image.' }, { status: 500 });
      }

      insertedRows.push(imgRow);
      currentCount++;
      nextSortOrder++;
    }

    return NextResponse.json({ images: insertedRows }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/dashboard/products/[id]/images unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id } = await context.params;

    const body = await request.json();
    const items = body.items as Array<{ id: string; alt_text?: string; sort_order: number }>;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items array' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    for (const item of items) {
      if (!item.id) continue;
      const updates: any = {};
      if (item.sort_order !== undefined) updates.sort_order = item.sort_order;
      if (item.alt_text !== undefined) updates.alt_text = item.alt_text;

      const { error } = await (adminClient as any)
        .from('product_images')
        .update(updates)
        .eq('id', item.id)
        .eq('product_id', id);

      if (error) {
        console.error('Error updating product image metadata:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/dashboard/products/[id]/images unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
