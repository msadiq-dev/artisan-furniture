'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, ArrowUpRight, ArrowDownRight, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AdjustStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string; stock_qty: number } | null;
  onAdjusted: (productId: string, newStock: number) => void;
}

type MovementTypeOption = 'manual_adjustment' | 'damage' | 'return';

export function AdjustStockDialog({
  isOpen,
  onClose,
  product,
  onAdjusted,
}: AdjustStockDialogProps) {
  const [movementType, setMovementType] = useState<MovementTypeOption>('manual_adjustment');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState<number | string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setMovementType('manual_adjustment');
      setDirection('add');
      setQuantity('');
      setNote('');
      setErrorMsg(null);
    }
  }, [isOpen, product]);

  // Adjust default direction when type changes
  const handleTypeChange = (newType: MovementTypeOption) => {
    setMovementType(newType);
    if (newType === 'damage') {
      setDirection('remove');
    } else if (newType === 'return') {
      setDirection('add');
    }
  };

  if (!isOpen || !product) return null;

  const qtyNum = typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 0;
  const delta = direction === 'add' ? qtyNum : -qtyNum;
  const projectedStock = (product.stock_qty ?? 0) + delta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (qtyNum <= 0) {
      setErrorMsg('Please enter a quantity greater than 0.');
      return;
    }

    if (projectedStock < 0) {
      setErrorMsg(`Cannot remove ${qtyNum} units. Current stock is ${product.stock_qty}. Result would be below zero.`);
      return;
    }

    if (!note.trim() || note.trim().length < 3) {
      setErrorMsg('A specific reason or note is required (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dashboard/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          delta,
          type: movementType,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      toast.success(data.message || `Stock updated to ${data.new_stock} units.`);
      onAdjusted(product.id, data.new_stock ?? projectedStock);
      onClose();
    } catch (err: any) {
      console.error('Adjust stock failed:', err);
      setErrorMsg(err.message || 'Failed to update stock');
      toast.error(err.message || 'Stock adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#DDD6C8] overflow-hidden max-h-[90dvh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B3A]">
              Warehouse Operation
            </span>
            <h2 className="font-serif text-lg font-medium text-[#26262B]">
              Adjust Stock Quantity
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B] rounded-lg hover:bg-[#EFECE6] transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Product Banner */}
          <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#DDD6C8] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#26262B]">{product.name}</div>
              <div className="text-xs font-mono text-[#8C867D]">SKU: {product.sku}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase text-[#8C867D] font-medium">Current Stock</div>
              <div className="text-lg font-bold text-[#26262B]">{product.stock_qty} units</div>
            </div>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-xs font-medium text-[#26262B] mb-1.5">
              Adjustment Reason Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('manual_adjustment')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                  movementType === 'manual_adjustment'
                    ? 'border-[#6B6B3A] bg-[#6B6B3A]/10 text-[#6B6B3A] font-semibold'
                    : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Manual Audit
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('damage')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                  movementType === 'damage'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 font-semibold'
                    : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Damaged / Scrap
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('return')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                  movementType === 'return'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Customer Return
              </button>
            </div>
          </div>

          {/* Direction & Amount */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#26262B]">
              Adjustment Direction & Quantity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('add')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  direction === 'add'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-600'
                    : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                Add Units (+)
              </button>
              <button
                type="button"
                onClick={() => setDirection('remove')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  direction === 'remove'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 font-semibold ring-1 ring-rose-600'
                    : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
                Remove Units (−)
              </button>
            </div>

            <div className="pt-2">
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter number of units..."
                className="text-sm font-medium"
                required
              />
            </div>

            {/* Projected Stock Preview */}
            {qtyNum > 0 && (
              <div className="text-xs p-2.5 rounded-md bg-[#FAF8F5] border border-[#DDD6C8] flex items-center justify-between">
                <span className="text-[#6B665E]">Resulting Stock Preview:</span>
                <span className="font-semibold text-[#26262B]">
                  {product.stock_qty} {direction === 'add' ? '+' : '−'} {qtyNum} ={' '}
                  <span className={projectedStock < 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {projectedStock} units
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Required Note */}
          <div>
            <label className="block text-xs font-medium text-[#26262B] mb-1">
              Audit Note / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Physical inventory count verified, spotted surface blemish during packing..."
              className="w-full p-2.5 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]"
              required
            />
            <p className="text-[10px] text-[#8C867D] mt-0.5">
              Required for warehouse movement audit compliance.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#DDD6C8] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] sm:min-h-9 w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || qtyNum <= 0}
              className="min-w-[120px] min-h-[44px] sm:min-h-9 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Confirm Adjustment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
