import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

function timingSafeCheck(headerSecret: string | null, expectedSecret: string): boolean {
  if (!headerSecret || !expectedSecret) return false;
  const a = Buffer.from(headerSecret);
  const b = Buffer.from(expectedSecret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const ALLOWED_INVOICE_STATUSES = ['uploaded', 'processing', 'needs_review'];

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET?.trim();
    const incomingSecret = request.headers.get('x-webhook-secret')?.trim() || null;

    // Timing-safe check of header x-webhook-secret; fail closed if N8N_WEBHOOK_SECRET is empty
    if (!expectedSecret || !timingSafeCheck(incomingSecret, expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized webhook access' }, { status: 401 });
    }

    const body = await request.json();
    const event = body.event;

    if (!event) {
      return NextResponse.json({ error: 'Missing event property' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. EVENT: invoice.extracted
    if (event === 'invoice.extracted') {
      const invoiceId = body.invoice_id;
      if (!invoiceId) {
        return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
      }

      // Check current invoice status
      const { data: invoice, error: fetchErr } = await (adminClient as any)
        .from('purchase_invoices')
        .select('id, status')
        .eq('id', invoiceId)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error querying invoice in n8n webhook:', fetchErr);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Applied only when status is uploaded, processing or needs_review; otherwise return 200 { ignored: true }
      if (!ALLOWED_INVOICE_STATUSES.includes(invoice.status)) {
        return NextResponse.json({ ignored: true, reason: `Invoice status is ${invoice.status}` }, { status: 200 });
      }

      const extraction = body.extraction || {};

      // Match supplier if supplier_name provided and supplier_id is missing
      let supplierId = extraction.supplier_id || null;
      if (!supplierId && extraction.supplier_name) {
        const { data: matchedSupplier } = await (adminClient as any)
          .from('suppliers')
          .select('id')
          .ilike('business_name', `%${extraction.supplier_name.trim()}%`)
          .maybeSingle();

        if (matchedSupplier) {
          supplierId = matchedSupplier.id;
        }
      }

      const updatePayload: any = {
        status: 'needs_review',
        extraction_json: extraction,
        review_flags: body.review_flags || extraction.review_flags || [],
        updated_at: new Date().toISOString(),
      };

      if (supplierId) updatePayload.supplier_id = supplierId;
      if (extraction.invoice_number) updatePayload.invoice_number = extraction.invoice_number;
      if (extraction.invoice_date) updatePayload.invoice_date = extraction.invoice_date;
      if (extraction.due_date) updatePayload.due_date = extraction.due_date;
      if (extraction.currency) updatePayload.currency = extraction.currency;
      if (extraction.subtotal !== undefined) updatePayload.subtotal = extraction.subtotal;
      if (extraction.tax !== undefined) updatePayload.tax = extraction.tax;
      if (extraction.total !== undefined) updatePayload.total = extraction.total;

      await (adminClient as any)
        .from('purchase_invoices')
        .update(updatePayload)
        .eq('id', invoiceId);

      // Idempotently replace line items if present
      if (Array.isArray(extraction.items) && extraction.items.length > 0) {
        await (adminClient as any)
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        const itemsToInsert = extraction.items.map((it: any) => ({
          invoice_id: invoiceId,
          description: it.description || 'Extracted item',
          quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
          unit_cost: Math.max(0, parseFloat(it.unit_cost) || 0),
          line_total:
            it.line_total !== undefined
              ? parseFloat(it.line_total)
              : Math.max(1, parseInt(it.quantity, 10) || 1) * Math.max(0, parseFloat(it.unit_cost) || 0),
          product_id: it.product_id || null,
        }));

        await (adminClient as any).from('invoice_items').insert(itemsToInsert);
      }

      return NextResponse.json({ received: true, status: 'needs_review' }, { status: 200 });
    }

    // 2. EVENT: invoice.failed
    if (event === 'invoice.failed') {
      const invoiceId = body.invoice_id;
      if (!invoiceId) {
        return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
      }

      const { data: invoice, error: fetchErr } = await (adminClient as any)
        .from('purchase_invoices')
        .select('id, status')
        .eq('id', invoiceId)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error querying invoice in n8n webhook:', fetchErr);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Applied only when status is uploaded, processing or needs_review; otherwise return 200 { ignored: true }
      if (!ALLOWED_INVOICE_STATUSES.includes(invoice.status)) {
        return NextResponse.json({ ignored: true, reason: `Invoice status is ${invoice.status}` }, { status: 200 });
      }

      await (adminClient as any)
        .from('purchase_invoices')
        .update({
          status: 'needs_review',
          workflow_error: body.error || 'Automated AI extraction failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      return NextResponse.json({ received: true, status: 'needs_review' }, { status: 200 });
    }

    // 3. EVENT: notification.result
    if (event === 'notification.result') {
      const orderId = body.order_id;
      if (!orderId) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
      }

      // Sets orders.notification_status only to sent or failed
      const notifStatus = body.status === 'sent' ? 'sent' : 'failed';

      await (adminClient as any)
        .from('orders')
        .update({
          notification_status: notifStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return NextResponse.json({ received: true, notification_status: notifStatus }, { status: 200 });
    }

    return NextResponse.json({ received: true, unhandled_event: event }, { status: 200 });
  } catch (err: unknown) {
    console.error('POST /api/webhooks/n8n unexpected server error:', err);
    return NextResponse.json({ error: 'Server error processing webhook' }, { status: 500 });
  }
}
