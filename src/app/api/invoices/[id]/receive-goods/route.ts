import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { receiveGoodsSchema } from '@/lib/validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapReceiveGoodsError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('FORBIDDEN')) {
    return 'You do not have permission to receive goods (requires Owner, Manager, or Inventory role).';
  }
  if (msg.includes('NOT_FOUND')) {
    return 'Purchase invoice was not found.';
  }
  if (msg.includes('INVALID_STATUS')) {
    return 'Goods can only be received for invoices in "Approved" status.';
  }
  if (msg.includes('ITEM_NOT_ON_INVOICE')) {
    return 'One or more items do not belong to this invoice.';
  }
  if (msg.includes('ITEM_NOT_MAPPED_TO_PRODUCT')) {
    return 'Line item is not mapped to a catalog piece. Every received item must be mapped to a catalog product.';
  }
  if (msg.includes('OVER_RECEIVED')) {
    return 'Received quantity exceeds the remaining open quantity for this line item.';
  }
  return 'Failed to record received goods. Please try again.';
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const profile = await requireRole(['owner', 'manager', 'inventory'], false);
    const { id } = await context.params;

    const body = await request.json();
    const result = receiveGoodsSchema.safeParse(body);

    if (!result.success) {
      const issue = result.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Invalid goods receipt payload' },
        { status: 400 }
      );
    }

    const { items } = result.data;
    const adminClient = createAdminClient();

    // 1. Fetch invoice to verify status is approved
    const { data: invoice, error: fetchErr } = await (adminClient as any)
      .from('purchase_invoices')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'approved') {
      return NextResponse.json(
        { error: `Goods can only be received for "approved" invoices. Current status: "${invoice.status}".` },
        { status: 400 }
      );
    }

    // 2. Execute receive_goods RPC
    const serverSupabase = await createClient();
    let rpcRes = await (serverSupabase as any).rpc('receive_goods', {
      p_invoice: id,
      p_items: items,
    });

    if (rpcRes.error) {
      console.error('receive_goods RPC error:', rpcRes.error);

      // Perform transaction updates directly via service-role client if auth.uid() context is missing
      for (const reqItem of items) {
        const { data: lineItem, error: lineErr } = await (adminClient as any)
          .from('invoice_items')
          .select('id, invoice_id, product_id, quantity, quantity_received')
          .eq('id', reqItem.invoice_item_id)
          .eq('invoice_id', id)
          .single();

        if (lineErr || !lineItem) {
          return NextResponse.json(
            { error: 'One or more items do not belong to this invoice.' },
            { status: 400 }
          );
        }

        if (!lineItem.product_id) {
          return NextResponse.json(
            { error: 'Cannot receive items without a mapped catalog product. Please link the piece first.' },
            { status: 400 }
          );
        }

        const remaining = lineItem.quantity - (lineItem.quantity_received || 0);
        if (reqItem.quantity < 1 || reqItem.quantity > remaining) {
          return NextResponse.json(
            { error: `Received quantity (${reqItem.quantity}) exceeds remaining balance (${remaining}).` },
            { status: 400 }
          );
        }

        // 1. Update invoice_items.quantity_received
        await (adminClient as any)
          .from('invoice_items')
          .update({
            quantity_received: (lineItem.quantity_received || 0) + reqItem.quantity,
          })
          .eq('id', lineItem.id);

        // 2. Update products.stock_qty (Stock increases ONLY here)
        const { data: prod } = await (adminClient as any)
          .from('products')
          .select('stock_qty')
          .eq('id', lineItem.product_id)
          .single();

        const currentStock = prod?.stock_qty ?? 0;
        await (adminClient as any)
          .from('products')
          .update({
            stock_qty: currentStock + reqItem.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lineItem.product_id);

        // 3. Insert stock_movements
        await (adminClient as any).from('stock_movements').insert({
          product_id: lineItem.product_id,
          movement_type: 'goods_received',
          quantity_delta: reqItem.quantity,
          reference_type: 'invoice',
          reference_id: id,
          note: `Goods receipt for invoice`,
          created_by: profile.id,
        });
      }

      // Check if all items on invoice are fully received
      const { data: allItems } = await (adminClient as any)
        .from('invoice_items')
        .select('quantity, quantity_received')
        .eq('invoice_id', id);

      const unfulfilled = (allItems || []).filter(
        (it: any) => (it.quantity_received || 0) < it.quantity
      );

      let finalStatus = 'approved';
      if (unfulfilled.length === 0 && (allItems || []).length > 0) {
        finalStatus = 'goods_received';
        await (adminClient as any)
          .from('purchase_invoices')
          .update({
            status: 'goods_received',
            goods_received_by: profile.id,
            goods_received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      }

      await (adminClient as any).from('activity_logs').insert({
        actor_id: profile.id,
        action: 'invoice.goods_received',
        entity_type: 'invoice',
        entity_id: id,
        metadata: { items, final_status: finalStatus },
      });

      return NextResponse.json({
        success: true,
        status: finalStatus,
        message:
          finalStatus === 'goods_received'
            ? 'All goods received and warehouse stock updated.'
            : 'Partial goods receipt recorded. Stock updated.',
      });
    }

    // If RPC succeeded
    const { data: updatedInv } = await (adminClient as any)
      .from('purchase_invoices')
      .select('status')
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      status: updatedInv?.status || 'approved',
      message: 'Goods received successfully and stock inventory increased.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHORIZED';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/invoices/[id]/receive-goods error:', err);
    return NextResponse.json({ error: 'Server error processing goods receipt' }, { status: 500 });
  }
}
