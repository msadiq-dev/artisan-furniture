import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string; imageId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager'], false);
    const { id, imageId } = await context.params;

    const adminClient = createAdminClient();

    // 1. Fetch image row to get storage_path
    const { data: imageRow, error: fetchErr } = await (adminClient as any)
      .from('product_images')
      .select('id, storage_path, product_id')
      .eq('id', imageId)
      .eq('product_id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching product image for deletion:', fetchErr);
      return NextResponse.json({ error: 'Failed to find image' }, { status: 500 });
    }

    if (!imageRow) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const row = imageRow as any;

    // 2. Remove file from storage bucket 'product-images'
    if (row.storage_path) {
      const { error: storageErr } = await adminClient.storage
        .from('product-images')
        .remove([row.storage_path]);

      if (storageErr) {
        console.error('Error removing image file from storage bucket:', storageErr);
        // Continue to delete db row even if storage file was already missing
      }
    }

    // 3. Delete database row
    const { error: deleteErr } = await adminClient
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', id);

    if (deleteErr) {
      console.error('Error deleting product_images row:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete image record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('DELETE /api/dashboard/products/[id]/images/[imageId] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
