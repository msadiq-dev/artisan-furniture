'use client';

import { useState, useEffect } from 'react';
import { X, History, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { MovementType } from '@/types/database';

interface StockMovementsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string; stock_qty: number } | null;
}

interface MovementItem {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_delta: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
  actor?: { id: string; full_name: string; role: string } | null;
}

export function StockMovementsDrawer({
  isOpen,
  onClose,
  product,
}: StockMovementsDrawerProps) {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMovements = async (productId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/inventory/${productId}/movements`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch movements');
      }
      setMovements(data.movements || []);
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
      setErrorMsg(err.message || 'Unable to retrieve movement history');
    } finally {
      setIsLoading(false);
    }
  };

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
    if (isOpen && product) {
      fetchMovements(product.id);
    } else {
      setMovements([]);
      setErrorMsg(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const renderTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'goods_received':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Goods Received
          </span>
        );
      case 'order_placed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Order Placed
          </span>
        );
      case 'order_cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Order Cancelled
          </span>
        );
      case 'manual_adjustment':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Manual Audit
          </span>
        );
      case 'damage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Damage / Scrap
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            Customer Return
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-xl bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col border-l border-[#DDD6C8] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between safe-top">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#6B6B3A] shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B3A]">
                Stock Audit Trail
              </span>
              <h2 className="font-serif text-lg font-medium text-[#26262B]">
                Movement History
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B] rounded-lg hover:bg-[#EFECE6] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Summary Strip */}
        <div className="px-6 py-3 bg-[#FAF8F5]/60 border-b border-[#DDD6C8] flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-[#26262B]">{product.name}</div>
            <div className="font-mono text-[11px] text-[#8C867D]">SKU: {product.sku}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-[#8C867D] uppercase font-semibold">Current Stock</div>
              <div className="font-bold text-[#26262B] text-sm">{product.stock_qty} units</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchMovements(product.id)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title="Refresh movements"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && movements.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8C867D] flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#6B6B3A]" />
              <span>Loading stock audit trail...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMovements(product.id)}
                className="text-xs bg-white h-7"
              >
                Retry
              </Button>
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="h-8 w-8 mx-auto text-[#8C867D]" />
              <div className="text-sm font-medium text-[#26262B]">No movement records</div>
              <p className="text-xs text-[#8C867D]">
                No stock movements or adjustments have been recorded for this piece yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((m) => {
                const isPositive = m.quantity_delta > 0;
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-lg border border-[#DDD6C8] bg-white hover:bg-[#FAF8F5]/50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderTypeBadge(m.movement_type)}
                        {m.reference_type && (
                          <span className="text-[10px] font-mono text-[#8C867D]">
                            ref: {m.reference_type}
                          </span>
                        )}
                      </div>

                      {/* Delta Badge */}
                      <div
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        <span>
                          {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                        </span>
                      </div>
                    </div>

                    {/* Note */}
                    {m.note && (
                      <p className="text-xs text-[#26262B] bg-[#FAF8F5] p-2 rounded border border-[#EFECE6]">
                        {m.note}
                      </p>
                    )}

                    {/* Footer: Date & Actor */}
                    <div className="flex items-center justify-between text-[11px] text-[#8C867D] pt-1 border-t border-[#FAF8F5]">
                      <span>{formatDate(m.created_at)}</span>
                      <span>
                        {m.actor?.full_name ? `${m.actor.full_name} (${m.actor.role})` : 'System'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DDD6C8] bg-[#FAF8F5] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Audit Trail
          </Button>
        </div>
      </div>
    </div>
  );
}
