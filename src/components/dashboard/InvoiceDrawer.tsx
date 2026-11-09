'use client';

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Check,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import type { PurchaseInvoice, Supplier, Product } from '@/types/database';

interface EditableLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  quantity_received?: number;
  product_id?: string | null;
  product?: { id: string; name: string; sku: string } | null;
}

interface InvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  suppliers: Supplier[];
  products: Product[];
  onInvoiceUpdated: (updatedInvoice: any) => void;
  userRole?: string;
}

export function InvoiceDrawer({
  isOpen,
  onClose,
  invoiceId,
  suppliers,
  products,
  onInvoiceUpdated,
  userRole,
}: InvoiceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'preview' | 'review' | 'goods_receipt'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Invoice full state
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isRefreshingPdf, setIsRefreshingPdf] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [subtotal, setSubtotal] = useState<string | number>('');
  const [tax, setTax] = useState<string | number>('');
  const [total, setTotal] = useState<string | number>('');
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);

  // Review states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingN8n, setIsProcessingN8n] = useState(false);

  // Goods receipt states
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [isReceivingGoods, setIsReceivingGoods] = useState(false);

  // Fetch invoice details & signed URL
  const fetchInvoiceData = async (id: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch invoice');

      const inv: PurchaseInvoice = data.invoice;
      setInvoice(inv);
      setSignedUrl(data.signedUrl || null);

      // Populate headers
      setSupplierId(inv.supplier_id || '');
      setInvoiceNumber(inv.invoice_number || '');
      setInvoiceDate(inv.invoice_date || '');
      setDueDate(inv.due_date || '');
      setCurrency(inv.currency || 'PKR');
      setSubtotal(inv.subtotal ?? '');
      setTax(inv.tax ?? '');
      setTotal(inv.total ?? '');

      // Populate items
      if (data.items && Array.isArray(data.items)) {
        setLineItems(
          data.items.map((it: any) => ({
            id: it.id,
            description: it.description || '',
            quantity: it.quantity || 1,
            unit_cost: it.unit_cost || 0,
            line_total: it.line_total || (it.quantity || 1) * (it.unit_cost || 0),
            quantity_received: it.quantity_received || 0,
            product_id: it.product_id || null,
            product: it.product || null,
          }))
        );

        // Populate receipt quantities with remaining balance
        const defaultReceiptMap: Record<string, number> = {};
        data.items.forEach((it: any) => {
          const remaining = (it.quantity || 1) - (it.quantity_received || 0);
          if (it.id && remaining > 0) {
            defaultReceiptMap[it.id] = remaining;
          }
        });
        setReceiptQuantities(defaultReceiptMap);
      } else {
        setLineItems([]);
        setReceiptQuantities({});
      }
    } catch (err: any) {
      console.error('Invoice fetch error:', err);
      setErrorMsg(err.message || 'Unable to load invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPdf = async () => {
    if (!invoiceId) return;
    setIsRefreshingPdf(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (res.ok && data.signedUrl) {
        setSignedUrl(data.signedUrl);
        toast.success('PDF preview token refreshed');
      }
    } catch (err) {
      console.error('Refresh PDF error:', err);
    } finally {
      setIsRefreshingPdf(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceData(invoiceId);
      setActiveTab('details');
      setShowRejectModal(false);
      setRejectReason('');
    } else {
      setInvoice(null);
      setSignedUrl(null);
      setLineItems([]);
      setErrorMsg(null);
      setShowRejectModal(false);
    }
  }, [isOpen, invoiceId]);

  if (!isOpen || !invoiceId) return null;

  const canEdit =
    ['owner', 'manager', 'accounts'].includes(userRole || '') &&
    ['uploaded', 'processing', 'needs_review'].includes(invoice?.status || '');

  const isApproved = invoice?.status === 'approved' || invoice?.status === 'goods_received';
  const isOwnerOrManager = ['owner', 'manager'].includes(userRole || '');
  const canVerify = ['owner', 'manager', 'accounts'].includes(userRole || '') && invoice?.status === 'needs_review';
  const canApproveOrReject = isOwnerOrManager && invoice?.status === 'needs_review';
  const canReceiveGoods = ['owner', 'manager', 'inventory'].includes(userRole || '') && invoice?.status === 'approved';

  // Add line item
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit_cost: 0,
        line_total: 0,
        product_id: null,
      },
    ]);
  };

  // Update line item
  const handleUpdateLineItem = (index: number, field: keyof EditableLineItem, val: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      if (field === 'quantity' || field === 'unit_cost') {
        const q = field === 'quantity' ? Number(val) || 0 : item.quantity;
        const c = field === 'unit_cost' ? Number(val) || 0 : item.unit_cost;
        item.line_total = q * c;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const itemsSum = lineItems.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0);

  const handleApplyItemsSumToTotal = () => {
    setSubtotal(itemsSum);
    const taxVal = Number(tax) || 0;
    setTotal(itemsSum + taxVal);
    toast.info('Applied line items total to invoice header amount');
  };

  // Save changes
  const handleSaveFields = async () => {
    if (!invoiceId) return;
    setIsSaving(true);
    try {
      const payload = {
        action: 'save_fields',
        supplier_id: supplierId || null,
        invoice_number: invoiceNumber.trim() || null,
        invoice_date: invoiceDate || null,
        due_date: dueDate || null,
        currency: currency || 'PKR',
        subtotal: subtotal !== '' ? Number(subtotal) : null,
        tax: tax !== '' ? Number(tax) : null,
        total: total !== '' ? Number(total) : null,
        items: lineItems.map((it) => ({
          description: it.description.trim() || 'Supplied item',
          quantity: Math.max(1, Number(it.quantity) || 1),
          unit_cost: Math.max(0, Number(it.unit_cost) || 0),
          line_total: Math.max(0, Number(it.line_total) || 0),
          product_id: it.product_id || null,
        })),
      };

      const res = await fetch(`/api/invoices/${invoiceId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invoice changes');

      toast.success('Invoice details & line items saved (Status: Needs Review)');
      if (data.invoice) {
        setInvoice(data.invoice);
        onInvoiceUpdated(data.invoice);
      }
    } catch (err: any) {
      console.error('Save invoice review failed:', err);
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Re-process n8n
  const handleReprocessN8n = async () => {
    if (!invoiceId) return;
    setIsProcessingN8n(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger n8n processing');

      if (data.skipped) {
        toast.info(data.message || 'n8n is not configured.');
      } else {
        toast.success('Dispatched to n8n AI extraction service (Status: Processing)');
        setInvoice((prev) => (prev ? { ...prev, status: 'processing' } : prev));
        onInvoiceUpdated({ ...invoice, status: 'processing' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reprocess with n8n');
    } finally {
      setIsProcessingN8n(false);
    }
  };

  // Action: Verify
  const handleVerifyInvoice = async () => {
    if (!invoiceId) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      toast.success('Invoice verified by accounts staff. Ready for manager approval.');
      fetchInvoiceData(invoiceId);
      if (data.invoice) onInvoiceUpdated(data.invoice);
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify invoice');
    } finally {
      setIsVerifying(false);
    }
  };

  // Action: Approve
  const handleApproveInvoice = async () => {
    if (!invoiceId) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast.success('Invoice approved. Authorized for warehouse goods receipt.');
      fetchInvoiceData(invoiceId);
      if (data.invoice) onInvoiceUpdated(data.invoice);
      setActiveTab('goods_receipt');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve invoice');
    } finally {
      setIsApproving(false);
    }
  };

  // Action: Reject
  const handleRejectInvoice = async () => {
    if (!invoiceId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      toast.error('A rejection reason of at least 3 characters is required.');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      toast.success('Invoice rejected.');
      setShowRejectModal(false);
      fetchInvoiceData(invoiceId);
      if (data.invoice) onInvoiceUpdated(data.invoice);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject invoice');
    } finally {
      setIsRejecting(false);
    }
  };

  // Action: Confirm Goods Receipt
  const handleConfirmGoodsReceipt = async () => {
    if (!invoiceId) return;

    // Filter valid lines with mapped product and positive quantity
    const itemsToReceive: Array<{ invoice_item_id: string; quantity: number }> = [];
    for (const item of lineItems) {
      if (!item.id) continue;
      const qty = receiptQuantities[item.id] || 0;
      if (qty > 0) {
        if (!item.product_id) {
          toast.error(`"${item.description}" has no mapped catalog piece. Link it in Details first.`);
          return;
        }
        itemsToReceive.push({
          invoice_item_id: item.id,
          quantity: qty,
        });
      }
    }

    if (itemsToReceive.length === 0) {
      toast.warning('Please enter a quantity greater than 0 for at least one line item.');
      return;
    }

    setIsReceivingGoods(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/receive-goods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToReceive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Goods receipt failed');

      toast.success(data.message || 'Goods received and catalog inventory increased!');
      fetchInvoiceData(invoiceId);
      if (data.status) {
        onInvoiceUpdated({ ...invoice, status: data.status });
      }
    } catch (err: any) {
      console.error('Goods receipt error:', err);
      toast.error(err.message || 'Failed to receive goods');
    } finally {
      setIsReceivingGoods(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-2xl lg:max-w-3xl bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col border-l border-[#DDD6C8] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between safe-top">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-white border border-[#DDD6C8] flex items-center justify-center text-[#6B6B3A] shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-base sm:text-lg font-medium text-[#26262B] truncate">
                  {invoice?.invoice_number ? `Invoice #${invoice.invoice_number}` : 'Purchase Invoice'}
                </h2>
                {invoice && (
                  <Badge
                    variant={
                      invoice.status === 'needs_review'
                        ? 'amber'
                        : invoice.status === 'approved'
                        ? 'green'
                        : invoice.status === 'goods_received'
                        ? 'olive'
                        : invoice.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-[10px] py-0 px-2"
                  >
                    {invoice.status.replace('_', ' ')}
                  </Badge>
                )}
                {invoice?.verified_by && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-blue-700 border-blue-200 bg-blue-50">
                    Verified
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-[#8C867D] block">
                Uploaded on {invoice?.created_at ? formatDate(invoice.created_at) : '—'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B] rounded-lg hover:bg-[#EFECE6] transition-colors shrink-0"
            aria-label="Close invoice drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mandatory Policy Banner */}
        <div className="bg-[#EFEAE0] border-b border-[#DDD6C8] px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-[#6B665E]">
          <AlertTriangle className="h-4 w-4 text-[#6B6B3A] shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <strong className="text-[#26262B]">Policy:</strong> AI extraction is only a draft and approval never pays or changes stock. Stock increases ONLY during physical goods receipt.
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 border-b border-[#DDD6C8] bg-white flex items-center gap-2 sm:gap-4 text-xs font-medium overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`min-h-[44px] px-2 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center ${
              activeTab === 'details'
                ? 'border-[#6B6B3A] text-[#26262B] font-semibold'
                : 'border-transparent text-[#8C867D] hover:text-[#26262B]'
            }`}
          >
            Header Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`min-h-[44px] px-2 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'border-[#6B6B3A] text-[#26262B] font-semibold'
                : 'border-transparent text-[#8C867D] hover:text-[#26262B]'
            }`}
          >
            Line Items
            <span className="bg-[#FAF8F5] border border-[#DDD6C8] px-1.5 py-0.2 rounded-full text-[10px]">
              {lineItems.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-[#6B6B3A] text-[#26262B] font-semibold'
                : 'border-transparent text-[#8C867D] hover:text-[#26262B]'
            }`}
          >
            PDF Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-[#6B6B3A] text-[#26262B] font-semibold'
                : 'border-transparent text-[#8C867D] hover:text-[#26262B]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Review & Approval
          </button>
          {isApproved && (
            <button
              type="button"
              onClick={() => setActiveTab('goods_receipt')}
              className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'goods_receipt'
                  ? 'border-emerald-600 text-emerald-800 font-semibold'
                  : 'border-transparent text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
              Goods Receipt
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[#8C867D] flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#6B6B3A]" />
              <span>Loading invoice data and secure preview token...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs">
              {errorMsg}
            </div>
          ) : (
            <>
              {/* TAB 1: Details */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Supplier / Vendor
                      </label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        disabled={!canEdit}
                        className="w-full h-10 px-3 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:ring-2 focus:ring-[#6B6B3A]"
                      >
                        <option value="">Select recognized supplier...</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.business_name} {s.contact_name ? `(${s.contact_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Supplier Invoice #
                      </label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="e.g. INV-2026-089"
                        disabled={!canEdit}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Invoice Date
                      </label>
                      <Input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Payment Due Date
                      </label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Billing Currency
                      </label>
                      <Input
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        placeholder="PKR"
                        disabled={!canEdit}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Subtotal Amount
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={subtotal}
                        onChange={(e) => setSubtotal(e.target.value)}
                        placeholder="0"
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1">
                        Tax / Sales Tax
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        placeholder="0"
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26262B] mb-1 font-semibold">
                        Grand Total Amount ({currency})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="0"
                        disabled={!canEdit}
                        className="text-xs font-bold text-[#26262B]"
                      />
                    </div>
                  </div>

                  {lineItems.length > 0 && itemsSum > 0 && (
                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD6C8] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6B665E]">Sum of {lineItems.length} line items: </span>
                        <strong className="text-[#26262B]">{formatCurrency(itemsSum)}</strong>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplyItemsSumToTotal}
                          className="text-xs h-7 bg-white"
                        >
                          Sync Header with Items Sum
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Line Items */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B665E]">
                        Invoice Line Items ({lineItems.length})
                      </h3>
                      <p className="text-[11px] text-[#8C867D]">
                        Map each item to a catalog piece to enable warehouse goods receipt.
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddLineItem}
                        className="text-xs gap-1 h-7"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Line
                      </Button>
                    )}
                  </div>

                  {lineItems.length === 0 ? (
                    <div className="p-12 text-center rounded-xl border border-dashed border-[#DDD6C8] bg-[#FAF8F5]">
                      <Layers className="h-8 w-8 mx-auto text-[#8C867D] mb-2" />
                      <div className="text-xs font-medium text-[#26262B]">No line items entered yet</div>
                      <p className="text-[11px] text-[#8C867D] mt-1 max-w-sm mx-auto">
                        Add the individual materials, timber planks, or catalog furniture items specified on the invoice.
                      </p>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddLineItem}
                          className="mt-3 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add First Line Item
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-[#DDD6C8] bg-white space-y-2 hover:border-[#6B6B3A] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-[#8C867D]">Line #{idx + 1}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-rose-600 hover:text-rose-800 p-1"
                                title="Delete row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#8C867D] mb-0.5">
                                Item Description
                              </label>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  handleUpdateLineItem(idx, 'description', e.target.value)
                                }
                                placeholder="e.g. 2-inch Seasoned Oak Planks"
                                disabled={!canEdit}
                                className="text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-[#8C867D] mb-0.5">
                                Catalog Product Match
                              </label>
                              <select
                                value={item.product_id || ''}
                                onChange={(e) =>
                                  handleUpdateLineItem(idx, 'product_id', e.target.value || null)
                                }
                                disabled={!canEdit}
                                className="w-full h-9 px-2 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:ring-1 focus:ring-[#6B6B3A]"
                              >
                                <option value="">(Unlinked raw material / supply)</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.sku}: {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#FAF8F5]">
                            <div>
                              <label className="block text-[10px] text-[#8C867D] mb-0.5">Quantity</label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLineItem(
                                    idx,
                                    'quantity',
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  )
                                }
                                disabled={!canEdit}
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#8C867D] mb-0.5">Unit Cost (PKR)</label>
                              <Input
                                type="number"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  handleUpdateLineItem(
                                    idx,
                                    'unit_cost',
                                    Math.max(0, parseFloat(e.target.value) || 0)
                                  )
                                }
                                disabled={!canEdit}
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#8C867D] mb-0.5">Line Total</label>
                              <div className="h-9 px-2.5 rounded-md bg-[#FAF8F5] border border-[#DDD6C8] flex items-center text-xs font-semibold text-[#26262B]">
                                {formatCurrency(item.line_total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PDF Preview */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD6C8]">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#26262B]">Secure Storage Document:</span>
                      <span className="font-mono text-[#8C867D] text-[11px] truncate max-w-[280px]">
                        {invoice?.file_path}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshPdf}
                        disabled={isRefreshingPdf}
                        className="text-xs h-7 gap-1 bg-white"
                        title="Generate a fresh 60-second signed URL"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isRefreshingPdf ? 'animate-spin' : ''}`}
                        />
                        Refresh Token
                      </Button>
                      {signedUrl && (
                        <a
                          href={signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#6B6B3A] hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open Tab
                        </a>
                      )}
                    </div>
                  </div>

                  {signedUrl ? (
                    <div className="rounded-xl border border-[#DDD6C8] overflow-hidden bg-[#525659] h-[550px]">
                      <iframe
                        src={signedUrl}
                        title="Invoice PDF Viewer"
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="p-16 text-center rounded-xl border border-[#DDD6C8] bg-[#FAF8F5] text-xs text-[#8C867D]">
                      Could not generate signed access URL for this invoice document. Click &quot;Refresh Token&quot; above.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Review & Approval */}
              {activeTab === 'review' && (
                <div className="space-y-6">
                  {/* Status Card */}
                  <div className="p-4 rounded-xl border border-[#DDD6C8] bg-[#FAF8F5] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#6B665E]">Current Lifecycle Status</div>
                      <Badge
                        variant={
                          invoice?.status === 'needs_review'
                            ? 'amber'
                            : invoice?.status === 'approved'
                            ? 'green'
                            : invoice?.status === 'goods_received'
                            ? 'olive'
                            : invoice?.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs py-0.5 px-2.5 font-semibold"
                      >
                        {invoice?.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {invoice?.status === 'rejected' && invoice.rejection_reason && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <strong>Rejection Reason:</strong> {invoice.rejection_reason}
                      </div>
                    )}

                    {invoice?.verified_by ? (
                      <div className="flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 p-2.5 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>Verified by accounts staff. Ready for manager sign-off.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Pending accounts verification before manager approval can be granted.</span>
                      </div>
                    )}
                  </div>

                  {/* n8n Automation Re-trigger */}
                  <div className="p-4 rounded-xl border border-[#DDD6C8] bg-white flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#26262B]">n8n AI Extraction Workflow</div>
                      <div className="text-[11px] text-[#8C867D]">
                        Re-dispatch document to n8n if extraction failed or timed out.
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReprocessN8n}
                      disabled={isProcessingN8n}
                      className="text-xs gap-1.5 h-8 bg-white"
                    >
                      {isProcessingN8n ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-[#6B6B3A]" />
                      )}
                      Re-process
                    </Button>
                  </div>

                  {/* Review Actions Panel */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B665E]">
                      Role Actions
                    </h4>

                    {/* 1. Verify (Accounts, Manager, Owner) */}
                    <div className="p-4 rounded-xl border border-[#DDD6C8] bg-white flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-[#26262B]">
                          1. Verify Fields (Accounts Staff)
                        </div>
                        <div className="text-[11px] text-[#8C867D]">
                          Confirm vendor, dates, and amounts match the uploaded invoice PDF.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={invoice?.verified_by ? 'outline' : 'default'}
                        onClick={handleVerifyInvoice}
                        disabled={!canVerify || Boolean(invoice?.verified_by) || isVerifying}
                        className="text-xs h-8 min-w-[100px]"
                      >
                        {isVerifying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : invoice?.verified_by ? (
                          'Verified ✓'
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </div>

                    {/* 2. Approve (Manager & Owner Only) */}
                    <div className="p-4 rounded-xl border border-[#DDD6C8] bg-white flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-[#26262B]">
                          2. Manager Approval (Owner & Manager)
                        </div>
                        <div className="text-[11px] text-[#8C867D]">
                          Authorize invoice for warehouse goods receipt. Approval never moves money or touches stock.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleApproveInvoice}
                        disabled={!canApproveOrReject || !invoice?.verified_by || isApproving}
                        className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white min-w-[100px]"
                      >
                        {isApproving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Approve'
                        )}
                      </Button>
                    </div>

                    {/* 3. Reject (Manager & Owner Only) */}
                    <div className="p-4 rounded-xl border border-[#DDD6C8] bg-white flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-[#26262B]">
                          3. Reject Invoice
                        </div>
                        <div className="text-[11px] text-[#8C867D]">
                          Flag as rejected with a mandatory explanation for accounting audit.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRejectModal(true)}
                        disabled={!canApproveOrReject || isRejecting}
                        className="text-xs h-8 text-rose-700 hover:bg-rose-50 border-rose-200 min-w-[100px]"
                      >
                        Reject...
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Goods Receipt (Shown after approval) */}
              {activeTab === 'goods_receipt' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                    <PackageCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-950 font-semibold mb-0.5">
                        Stock Receiving Floor
                      </strong>
                      Physical warehouse inspection. Confirming received quantities here will increment inventory stock counts and create audited stock movements.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((item, idx) => {
                      const received = item.quantity_received || 0;
                      const remaining = Math.max(0, item.quantity - received);
                      const isFullyReceived = remaining === 0;
                      const hasProduct = Boolean(item.product_id);

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-4 rounded-xl border transition-colors ${
                            isFullyReceived
                              ? 'border-gray-200 bg-gray-50/60'
                              : !hasProduct
                              ? 'border-amber-200 bg-amber-50/40'
                              : 'border-[#DDD6C8] bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div>
                              <div className="text-xs font-semibold text-[#26262B]">
                                {item.description}
                              </div>
                              <div className="text-[11px] text-[#8C867D]">
                                {hasProduct ? (
                                  <span className="text-emerald-700 font-medium">
                                    Linked piece: {item.product?.name || 'Catalog piece'} ({item.product?.sku})
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    No catalog product linked (cannot receive stock until linked)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-[#8C867D]">
                                Invoiced: <strong>{item.quantity}</strong>
                              </span>
                              <span className="text-[#8C867D]">
                                Received: <strong className="text-emerald-700">{received}</strong>
                              </span>
                              <span className="text-[#8C867D]">
                                Open: <strong className={remaining > 0 ? 'text-amber-800' : 'text-gray-500'}>{remaining}</strong>
                              </span>
                            </div>
                          </div>

                          {!isFullyReceived && hasProduct && canReceiveGoods && (
                            <div className="pt-2 border-t border-[#FAF8F5] flex items-center justify-between gap-4">
                              <label className="text-xs text-[#6B665E]">
                                Quantity received in this shipment:
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max={remaining}
                                  value={receiptQuantities[item.id || ''] || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 0;
                                    setReceiptQuantities((prev) => ({
                                      ...prev,
                                      [item.id || '']: Math.min(remaining, Math.max(0, val)),
                                    }));
                                  }}
                                  className="w-24 h-8 text-xs font-bold text-center"
                                />
                                <span className="text-[11px] text-[#8C867D]">of {remaining} max</span>
                              </div>
                            </div>
                          )}

                          {isFullyReceived && (
                            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> All units fulfilled & added to stock
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {canReceiveGoods && invoice?.status === 'approved' && (
                    <div className="pt-4 border-t border-[#DDD6C8] flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleConfirmGoodsReceipt}
                        disabled={isReceivingGoods}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 h-9"
                      >
                        {isReceivingGoods ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating Inventory Stock...
                          </>
                        ) : (
                          <>
                            <PackageCheck className="h-4 w-4" />
                            Confirm Goods Receipt & Increase Stock
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between">
          <span className="text-[11px] text-[#8C867D]">
            {canEdit ? 'Header details can be saved in Draft/Needs Review' : 'Viewing purchase invoice records'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Close
            </Button>
            {activeTab === 'details' && canEdit && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveFields}
                disabled={isSaving || isLoading}
                className="gap-1 min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Reject Reason Dialog Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-[#DDD6C8] max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold text-[#26262B]">
                  Reject Supplier Invoice
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-[#8C867D] hover:text-[#26262B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[#6B665E]">
                Please enter a mandatory audit reason for rejecting this supplier invoice. The status will update to &quot;Rejected&quot;.
              </p>

              <div>
                <label className="block text-xs font-medium text-[#26262B] mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Unit pricing differs from PO agreement, tax calculation error..."
                  className="w-full p-2.5 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD6C8]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRejectInvoice}
                  disabled={isRejecting || rejectReason.trim().length < 3}
                  className="bg-rose-700 hover:bg-rose-800 text-white text-xs"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
