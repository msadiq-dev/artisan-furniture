export async function triggerN8nWebhook(
  url: string | undefined,
  payload: Record<string, unknown>
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  if (!url || url.trim() === '') {
    return { success: true, skipped: true };
  }

  const secret = process.env.N8N_WEBHOOK_SECRET || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`n8n webhook returned status ${response.status}`);
      return { success: false, error: `Status ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('n8n webhook failed or timed out:', err?.message || err);
    return { success: false, error: err?.message || 'Webhook failed' };
  }
}
