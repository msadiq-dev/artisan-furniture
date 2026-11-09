import { NextResponse, after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrderSchema } from '@/lib/validators';
import { triggerN8nWebhook } from '@/lib/n8n';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // 1. Honeypot check
    if (rawBody.website && typeof rawBody.website === 'string' && rawBody.website.trim() !== '') {
      return NextResponse.json(
        {
          order_number: 'FRN-HP-BLOCKED',
          public_token: 'tok_hp_blocked',
          total: 0,
        },
        { status: 201 }
      );
    }

    // 2. Validate request body with Zod
    const validationResult = createOrderSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid order submission details.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { customer, delivery, payment_method, items } = validationResult.data;
    const fullName = customer.full_name.trim();
    const email = customer.email ? customer.email.trim() : null;
    const phone = customer.phone.trim();
    const address = delivery.address.trim();
    const city = delivery.city.trim();
    const notes = delivery.notes ? delivery.notes.trim() : null;

    if (!isSupabaseAdminConfigured()) {
      // Demo order creation when Supabase database is in development/unconnected mode
      const demoOrderNum = `FRN-${Math.floor(1000 + Math.random() * 9000)}`;
      const demoToken = `tok_demo_${Date.now()}`;
      const subtotal = 145000;
      const deliveryFee = 0;
      const total = subtotal + deliveryFee;

      return NextResponse.json(
        {
          order_id: `ord-demo-${Date.now()}`,
          order_number: demoOrderNum,
          public_token: demoToken,
          total,
        },
        { status: 201 }
      );
    }

    const adminClient = createAdminClient();

    // 3. Rate limiting: 5 orders per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: rawCustomer } = await adminClient
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    const customerRecord = rawCustomer as { id: string } | null;

    if (customerRecord) {
      const { count: recentOrderCount } = await adminClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerRecord.id)
        .gte('created_at', oneHourAgo);

      if ((recentOrderCount || 0) >= 5) {
        return NextResponse.json(
          { error: 'Order limit reached. A maximum of 5 orders may be placed per phone number per hour.' },
          { status: 429 }
        );
      }
    }

    // 4. Call create_order RPC using service role client
    // Note: The RPC validates stock, fetches prices securely from the database,
    // computes delivery fee, decrements stock and logs activity logs all-or-nothing.
    const { data: rpcData, error: rpcError } = await (adminClient.rpc as any)('create_order', {
      p_full_name: fullName,
      p_email: email,
      p_phone: phone,
      p_address: address,
      p_city: city,
      p_notes: notes,
      p_payment_method: payment_method,
      p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    });

    if (rpcError) {
      const errMsg = rpcError.message || '';

      if (errMsg.includes('INSUFFICIENT_STOCK')) {
        const parts = errMsg.split('INSUFFICIENT_STOCK:');
        const itemName = parts[1]?.trim() || 'an item in your cart';
        return NextResponse.json(
          { error: `Insufficient stock remaining for "${itemName}". Please decrease the quantity or choose another piece.` },
          { status: 409 }
        );
      }

      if (errMsg.includes('PRODUCT_UNAVAILABLE')) {
        return NextResponse.json(
          { error: 'One or more items in your cart is no longer active or available.' },
          { status: 409 }
        );
      }

      if (errMsg.includes('INVALID_QUANTITY')) {
        return NextResponse.json(
          { error: 'Quantity must be between 1 and 20 units per item.' },
          { status: 400 }
        );
      }

      if (errMsg.includes('EMPTY_CART')) {
        return NextResponse.json(
          { error: 'Your cart is empty. Please add pieces before checking out.' },
          { status: 400 }
        );
      }

      console.error('Database RPC create_order error:', rpcError);
      return NextResponse.json(
        { error: 'An unexpected error occurred while placing your order. Please try again.' },
        { status: 500 }
      );
    }

    const orderRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!orderRow) {
      return NextResponse.json(
        { error: 'Failed to retrieve order confirmation details.' },
        { status: 500 }
      );
    }

    const orderId = orderRow.o_id;
    const orderNumber = orderRow.o_number;
    const publicToken = orderRow.o_token;
    const total = Number(orderRow.o_total);

    // 5. Trigger n8n webhook asynchronously inside after() if URL is configured
    after(async () => {
      const webhookUrl = process.env.N8N_ORDER_WEBHOOK_URL;
      if (webhookUrl && webhookUrl.trim() !== '') {
        try {
          await triggerN8nWebhook(webhookUrl, {
            event: 'order.created',
            order_id: orderId,
            order_number: orderNumber,
            total,
            payment_method,
            customer: {
              full_name: fullName,
              email,
              phone,
            },
            delivery: {
              address,
              city,
              notes,
            },
            items,
            created_at: new Date().toISOString(),
          });
        } catch (webhookErr) {
          console.warn('n8n order webhook execution caught error:', webhookErr);
        }
      }
    });

    return NextResponse.json(
      {
        order_id: orderId,
        order_number: orderNumber,
        public_token: publicToken,
        total,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'An internal error occurred while processing your order.' },
      { status: 500 }
    );
  }
}
