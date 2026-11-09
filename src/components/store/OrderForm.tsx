'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressForm, type AddressFormData } from './AddressForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { siteConfig } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { useCartStore } from '@/store/cart';
import { CreditCard, Banknote, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function OrderForm() {
  const router = useRouter();
  const { items, clearCart, getSubtotal, getDeliveryFee, getTotal } = useCartStore();

  const [addressData, setAddressData] = useState<AddressFormData>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Karachi',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer'>('cash_on_delivery');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  const handleFieldChange = (field: keyof AddressFormData, value: string) => {
    setAddressData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!addressData.full_name.trim() || addressData.full_name.trim().length < 2) {
      errors.full_name = 'Please provide your full name (minimum 2 characters).';
    }

    const cleanPhone = addressData.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      errors.phone = 'Please provide a valid phone number (e.g. 03000000000).';
    }

    if (!addressData.address.trim() || addressData.address.trim().length < 5) {
      errors.address = 'Please provide a complete delivery street address.';
    }

    if (!addressData.city.trim() || addressData.city.trim().length < 2) {
      errors.city = 'Please specify your delivery city.';
    }

    setFieldErrors(errors);
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      setTimeout(() => {
        const el = document.getElementById(firstField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 50);
    }
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add items before checking out.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customer: {
          full_name: addressData.full_name.trim(),
          email: addressData.email.trim() || undefined,
          phone: addressData.phone.trim(),
        },
        delivery: {
          address: addressData.address.trim(),
          city: addressData.city.trim(),
          notes: addressData.notes.trim() || undefined,
        },
        payment_method: paymentMethod,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        website: honeypot, // Honeypot
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let result: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await res.json();
      }

      if (!res.ok) {
        const errorMsg = result?.error || 'Failed to place order. Please review your details and try again.';
        setSubmitError(errorMsg);
        setLoading(false);
        setTimeout(() => {
          const errEl = document.getElementById('checkout-error-banner');
          if (errEl) {
            errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
        return;
      }

      // Order created successfully!
      clearCart();
      toast.success('Your order has been placed successfully!');
      router.push(`/order-success?ref=${result.order_number}&token=${result.public_token}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error placing order';
      setSubmitError(msg);
      setLoading(false);
      setTimeout(() => {
        const errEl = document.getElementById('checkout-error-banner');
        if (errEl) {
          errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Honeypot field (hidden from real users) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-hp">Leave this empty</label>
        <input
          id="website-hp"
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {submitError && (
        <div id="checkout-error-banner" className="rounded-[10px] border border-red-300 bg-red-50 p-4 text-xs text-[#B3402F] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#B3402F]" />
          <div className="space-y-1">
            <span className="font-semibold">Unable to complete checkout:</span>
            <p className="leading-relaxed">{submitError}</p>
          </div>
        </div>
      )}

      {/* Customer & Address Form */}
      <AddressForm
        data={addressData}
        onChange={handleFieldChange}
        errors={fieldErrors}
        disabled={loading}
      />

      {/* Payment Method Selector */}
      <div className="space-y-4 pt-2">
        <h3 className="font-serif text-lg font-medium text-[#26262B] border-b border-[#DDD6C8] pb-2">
          3. Payment Method
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            className={`relative flex flex-col rounded-[12px] border p-4 sm:p-5 cursor-pointer transition-all ${
              paymentMethod === 'cash_on_delivery'
                ? 'border-[#6B6B3A] bg-[#6B6B3A]/5 ring-1 ring-[#6B6B3A]'
                : 'border-[#DDD6C8] bg-white hover:border-[#8C867D]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-[#6B6B3A]" />
                <span className="font-medium text-sm text-[#26262B]">Cash on Delivery</span>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cash_on_delivery'}
                onChange={() => setPaymentMethod('cash_on_delivery')}
                className="text-[#6B6B3A] focus:ring-[#6B6B3A] h-4 w-4"
              />
            </div>
            <p className="text-xs text-[#6B665E] mt-2">
              Pay upon home delivery and white-glove inspection across Pakistan.
            </p>
          </label>

          <label
            className={`relative flex flex-col rounded-[12px] border p-4 sm:p-5 cursor-pointer transition-all ${
              paymentMethod === 'bank_transfer'
                ? 'border-[#6B6B3A] bg-[#6B6B3A]/5 ring-1 ring-[#6B6B3A]'
                : 'border-[#DDD6C8] bg-white hover:border-[#8C867D]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-[#6B6B3A]" />
                <span className="font-medium text-sm text-[#26262B]">Direct Bank Transfer</span>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
                className="text-[#6B6B3A] focus:ring-[#6B6B3A] h-4 w-4"
              />
            </div>
            <p className="text-xs text-[#6B665E] mt-2">
              Instant IBFT to {siteConfig.bankDetails.bankName}. Verified by our accounts team within 2 business hours.
            </p>
          </label>
        </div>

        {paymentMethod === 'bank_transfer' && (
          <div className="rounded-[10px] border border-[#DDD6C8] bg-[#FAF7F0] p-4 text-xs space-y-2">
            <span className="font-semibold text-[#26262B] block">Bank Account Details:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#6B665E]">
              <div>Bank: <span className="text-[#26262B] font-medium">{siteConfig.bankDetails.bankName}</span></div>
              <div>Title: <span className="text-[#26262B] font-medium">{siteConfig.bankDetails.accountTitle}</span></div>
              <div>Account #: <span className="text-[#26262B] font-mono font-medium">{siteConfig.bankDetails.accountNumber}</span></div>
              <div className="break-all">IBAN: <span className="text-[#26262B] font-mono font-medium">{siteConfig.bankDetails.iban}</span></div>
            </div>
            <p className="text-[11px] text-[#8C867D] pt-1">
              {siteConfig.bankDetails.instructions}
            </p>
          </div>
        )}
      </div>

      {/* Place Order CTA */}
      <div className="pt-4 border-t border-[#DDD6C8]">
        <Button
          type="submit"
          size="lg"
          disabled={loading || items.length === 0}
          className="w-full gap-2 text-base h-12 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Securing Order & Inventory...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Confirm & Place Order ({formatCurrency(total)})
            </>
          )}
        </Button>
        <p className="text-center text-xs text-[#8C867D] mt-3">
          By placing your order, you agree to our 10-Year Solid Hardwood Guarantee and White-Glove delivery terms.
        </p>
      </div>
    </form>
  );
}
