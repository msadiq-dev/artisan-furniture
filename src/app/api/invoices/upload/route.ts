import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const profile = await requireRole(['owner', 'manager', 'accounts', 'inventory'], false);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No invoice PDF file was provided' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds the 10 MB limit. Please upload a smaller PDF.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify first bytes are %PDF
    const magicBytes = buffer.subarray(0, 4).toString('ascii');
    if (magicBytes !== '%PDF') {
      return NextResponse.json(
        { error: 'Invalid file format. The uploaded file is not a valid PDF document.' },
        { status: 400 }
      );
    }

    // Path pattern: YYYY/<uuid>.pdf
    const year = new Date().getFullYear().toString();
    const fileUuid = crypto.randomUUID();
    const storagePath = `${year}/${fileUuid}.pdf`;

    const adminClient = createAdminClient();

    // 1. Upload to private "invoices" bucket
    const { error: uploadError } = await adminClient.storage
      .from('invoices')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading invoice to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to securely store invoice PDF. Please try again.' },
        { status: 500 }
      );
    }

    // 2. Insert purchase_invoices row
    const { data: newInvoice, error: dbError } = await (adminClient as any)
      .from('purchase_invoices')
      .insert({
        file_path: storagePath,
        status: 'uploaded',
        uploaded_by: profile.id,
        currency: 'PKR',
      })
      .select('*')
      .single();

    if (dbError || !newInvoice) {
      console.error('Error recording purchase invoice in database:', dbError);
      return NextResponse.json(
        { error: 'Failed to record invoice document in database.' },
        { status: 500 }
      );
    }

    // 3. Log activity
    await (adminClient as any).from('activity_logs').insert({
      actor_id: profile.id,
      action: 'invoice.uploaded',
      entity_type: 'purchase_invoice',
      entity_id: newInvoice.id,
      metadata: { file_path: storagePath, file_name: file.name },
    });

    // 4. n8n Automation Webhook (optional with 5s timeout)
    const n8nWebhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL?.trim();
    if (n8nWebhookUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const n8nRes = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
          },
          body: JSON.stringify({
            event: 'invoice.uploaded',
            invoice_id: newInvoice.id,
            storage_path: storagePath,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (n8nRes.ok) {
          // If n8n triggered successfully, update invoice status to 'processing'
          await (adminClient as any)
            .from('purchase_invoices')
            .update({ status: 'processing' })
            .eq('id', newInvoice.id);

          newInvoice.status = 'processing';
        } else {
          console.error('n8n invoice webhook returned non-200:', n8nRes.status, await n8nRes.text());
        }
      } catch (webhookErr: any) {
        // Never fail the upload if n8n fails
        console.error('n8n invoice webhook delivery failed:', webhookErr.message || webhookErr);
      }
    }

    return NextResponse.json({ invoice: newInvoice }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/invoices/upload unexpected error:', err);
    return NextResponse.json({ error: 'Server error processing invoice upload' }, { status: 500 });
  }
}
