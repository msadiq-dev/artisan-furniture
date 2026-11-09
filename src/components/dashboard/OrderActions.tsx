'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, XCircle, Loader2, AlertTriangle, CreditCard, Banknote, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { OrderStatus, PaymentStatus, UserRole } from '@/types/database';

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: PaymentStatus;
  userRole: UserRole;
}

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'confirmed', label: 'Confirm Order' },
  confirmed: { next: 'preparing', label: 'Mark Preparing' },
  preparing: { next: 'ready_for_delivery', label: 'Ready for Delivery' },
  ready_for_delivery: { next: 'delivered', label: 'Mark Delivered' },
};

export function OrderActions({
  orderId,
  orderNumber,
  currentStatus,
  currentPaymentStatus,
  userRole,
}: OrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentDropdown, setPaymentDropdown] = useState(currentPaymentStatus);

  const canCancel = ['owner', 'manager'].includes(userRole);
  const nextStep = NEXT_STATUS_MAP[currentStatus];
  const isTerminal = currentStatus === 'delivered' || currentStatus === 'cancelled';

  const mapErrorMessage = (err: any): string => {
    const rawMsg = err?.message || String(err || '');
    if (rawMsg.includes('FORBIDDEN')) {
      return 'You do not have permission to perform this action.';
    }
    if (rawMsg.includes('INVALID_TRANSITION')) {
      return 'This status change is not allowed from the current state.';
    }
    if (rawMsg.includes('NOT_FOUND')) {
      return 'The order could not be found.';
    }
    return rawMsg || 'An error occurred while updating the order.';
  };

  const handleUpdateStatus = async (targetStatus: OrderStatus) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc('update_order_status', {
        p_order: orderId,
        p_status: targetStatus,
      });

      if (error) {
        console.error('update_order_status RPC failed:', error);
        toast.error(mapErrorMessage(error));
        setLoading(false);
        return;
      }

      toast.success(
        targetStatus === 'cancelled'
          ? `Order ${orderNumber} has been cancelled and inventory restored.`
          : `Order status advanced to ${targetStatus.replace('_', ' ')}.`
      );
      setCancelModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      console.error('handleUpdateStatus exception:', err);
      toast.error(mapErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (newPaymentStatus: PaymentStatus) => {
    if (newPaymentStatus === currentPaymentStatus) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc('mark_order_payment', {
        p_order: orderId,
        p_status: newPaymentStatus,
      });

      if (error) {
        console.error('mark_order_payment RPC failed:', error);
        toast.error(mapErrorMessage(error));
        setLoading(false);
        return;
      }

      toast.success(`Payment status updated to ${newPaymentStatus.replace('_', ' ')}.`);
      setPaymentDropdown(newPaymentStatus);
      router.refresh();
    } catch (err: unknown) {
      console.error('handleUpdatePayment exception:', err);
      toast.error(mapErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Transition Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {nextStep && !isTerminal && (
          <Button
            size="sm"
            disabled={loading}
            onClick={() => handleUpdateStatus(nextStep.next)}
            className="gap-1.5 text-xs bg-[#6B6B3A] hover:bg-[#58582F] text-white shadow-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {nextStep.label}
          </Button>
        )}

        {/* Cancel Button (Only for Owner and Manager, with Confirm Dialog) */}
        {!isTerminal && canCancel && (
          <Button
            size="sm"
            variant="destructive"
            disabled={loading}
            onClick={() => setCancelModalOpen(true)}
            className="gap-1.5 text-xs shadow-xs"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel Order
          </Button>
        )}

        {isTerminal && (
          <span className="text-xs text-[#8C867D] italic">
            This order is in a final state ({currentStatus}).
          </span>
        )}
      </div>

      {/* Payment Status Dropdown Selector */}
      <div className="pt-2 border-t border-[#DDD6C8]/60 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="payment-select" className="text-xs font-medium text-[#6B665E] flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-[#6B6B3A]" />
          Update Payment:
        </label>
        <div className="flex items-center gap-2">
          <select
            id="payment-select"
            value={paymentDropdown}
            onChange={(e) => {
              const val = e.target.value as PaymentStatus;
              setPaymentDropdown(val);
              handleUpdatePayment(val);
            }}
            disabled={loading}
            className="h-8 rounded-[6px] border border-[#DDD6C8] bg-white px-2.5 text-xs text-[#26262B] focus:border-[#6B6B3A] focus:outline-none"
          >
            <option value="unpaid">Unpaid</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>

          {currentPaymentStatus !== 'paid' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => handleUpdatePayment('paid')}
              className="h-8 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
            >
              Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Cancellation Modal Dialog */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-[16px] border border-[#DDD6C8] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-100 text-[#B3402F] shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-[#26262B]">
                  Cancel Order {orderNumber}?
                </h3>
                <p className="text-xs text-[#6B665E] leading-relaxed">
                  Cancelling will stop production fulfillment and <strong>automatically restore stock</strong> back into the warehouse inventory. This action cannot be reversed.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DDD6C8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setCancelModalOpen(false)}
                className="text-xs"
              >
                Keep Order
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={() => handleUpdateStatus('cancelled')}
                className="gap-2 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
