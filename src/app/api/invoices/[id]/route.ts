import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireRole(['owner', 'manager', 'accounts', 'inventory'], false);
    const { id } = await context.params;

    const adminClient = createAdminClient();

    // Fetch invoice details with supplier
    const { data: invoice, error: invErr } = await (adminClient as any)
      .from('purchase_invoices')
      .select(`
        *,
        supplier:suppliers(id, business_name, contact_name, phone, email, address, tax_id)
      `)
      .eq('id', id)
      .maybeSingle();

    if (invErr) {
      console.error('Error fetching purchase invoice:', invErr);
      return NextResponse.json({ error: 'Failed to retrieve invoice details' }, { status: 500 });
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }

    // Fetch line items with associated product info
    const { data: items, error: itemsErr } = await (adminClient as any)
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        product_id,
        description,
        quantity,
        unit_cost,
        line_total,
        quantity_received,
        product:products(id, name, sku)
      `)
      .eq('invoice_id', id)
      .order('id', { ascending: true });

    if (itemsErr) {
      console.error('Error fetching invoice items:', itemsErr);
    }

    // Create a 60-second signed URL for the PDF preview
    let signedUrl: string | null = null;
    if (invoice.file_path) {
      const { data: signedData, error: signErr } = await adminClient.storage
        .from('invoices')
        .createSignedUrl(invoice.file_path, 60);

      if (signErr) {
        console.error('Error creating 60-second signed URL for invoice PDF:', signErr);
      } else if (signedData?.signedUrl) {
        signedUrl = signedData.signedUrl;
      }
    }

    return NextResponse.json({
      invoice,
      items: items || [],
      signedUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/invoices/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
