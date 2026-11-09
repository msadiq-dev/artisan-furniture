import { siteConfig } from './config';

export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${siteConfig.currency.symbol} 0`;
  }
  const formatted = new Intl.NumberFormat(siteConfig.currency.locale, {
    maximumFractionDigits: 0,
  }).format(Number(amount));
  return `${siteConfig.currency.symbol} ${formatted}`;
}

export const formatCurrency = formatPrice;

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: siteConfig.timezone,
    }).format(date);
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: siteConfig.timezone,
    }).format(date);
  } catch {
    return String(dateString);
  }
}
