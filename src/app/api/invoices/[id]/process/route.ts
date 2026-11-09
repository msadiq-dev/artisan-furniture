import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireRole(['owner', 'manager', 'accounts'], false);
    const { id } = await context.params;

    const n8nWebhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL?.trim();
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { skipped: true, message: 'N8N_INVOICE_WEBHOOK_URL is not configured.' },
        { status: 200 }
      );
    }

    const adminClient = createAdminClient();
    const { data: invoice, error: fetchErr } = await (adminClient as any)
      .from('purchase_invoices')
      .select('id, file_path, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }

    // Call n8n webhook with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          event: 'invoice.uploaded',
          invoice_id: invoice.id,
          storage_path: invoice.file_path,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!n8nRes.ok) {
        console.error('n8n re-process returned error:', n8nRes.status, await n8nRes.text());
        return NextResponse.json(
          { error: `n8n webhook returned status ${n8nRes.status}` },
          { status: 502 }
        );
      }

      // Mark invoice as processing
      await (adminClient as any)
        .from('purchase_invoices')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({ success: true, status: 'processing' });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.error('Error dispatching to n8n webhook:', fetchErr.message || fetchErr);
      return NextResponse.json(
        { error: 'Failed to communicate with n8n invoice service within 5s timeout.' },
        { status: 504 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/invoices/[id]/process error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
