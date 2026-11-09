import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contactSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    // 1. Honeypot check
    if (rawBody.website && typeof rawBody.website === 'string' && rawBody.website.trim() !== '') {
      return NextResponse.json({ success: true, message: 'Message received.' }, { status: 201 });
    }

    // 2. Validate with Zod
    const validationResult = contactSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid contact form details.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { full_name, email, phone, message } = validationResult.data;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Database service is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();

    // 3. Rate limiting: 5 messages per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.trim().toLowerCase())
      .gte('created_at', oneHourAgo);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. A maximum of 5 inquiries may be sent per email per hour.' },
        { status: 429 }
      );
    }

    // 4. Save to contact_messages
    const { error: insertError } = await adminClient
      .from('contact_messages')
      .insert({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        message: message.trim(),
        status: 'new',
      } as any);

    if (insertError) {
      console.error('Error inserting into contact_messages:', insertError);
      return NextResponse.json(
        { error: 'Failed to record your inquiry. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Inquiry received' },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('POST /api/contact error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending your message.' },
      { status: 500 }
    );
  }
}
