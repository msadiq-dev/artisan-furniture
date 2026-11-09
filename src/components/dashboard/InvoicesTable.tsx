'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceDrawer } from '@/components/dashboard/InvoiceDrawer';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import type { PurchaseInvoice, Supplier, Product } from '@/types/database';

interface InvoicesTableProps {
  initialInvoices: PurchaseInvoice[];
  suppliers: Supplier[];
  products: Product[];
  userRole?: string;
}

export function InvoicesTable({
  initialInvoices,
  suppliers,
  products,
  userRole,
}: InvoicesTableProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(initialInvoices);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawer state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Re-fetch using a client query or reload
      const res = await fetch('/api/dashboard/invoices-list');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      } else {
        // Fallback: window.location.reload() or soft refresh
        window.location.reload();
      }
    } catch {
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  };

  // Upload handler
  const handleUploadFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF invoice documents are permitted.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10 MB maximum limit.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading "${file.name}" to secure vault...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload invoice');
      }

      toast.success('Invoice uploaded successfully!', { id: toastId });
      if (data.invoice) {
        setInvoices((prev) => [data.invoice, ...prev]);
        // Automatically open the drawer for this newly uploaded invoice to review details
        setSelectedInvoiceId(data.invoice.id);
      }
    } catch (err: any) {
      console.error('Invoice upload error:', err);
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleInvoiceUpdated = (updated: PurchaseInvoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv))
    );
  };

  // Filtered and paginated list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const numMatch = inv.invoice_number?.toLowerCase().includes(q);
      const suppMatch = inv.supplier?.business_name?.toLowerCase().includes(q);
      return Boolean(numMatch || suppMatch);
    });
  }, [invoices, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
            Accounts & Inventory
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-0.5">
            Purchase Invoices
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Safety Notice Policy Banner */}
      <div className="rounded-[10px] bg-[#EFEAE0] border border-[#DDD6C8] p-4 text-xs text-[#6B665E] flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-[#6B6B3A] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#26262B] font-medium block">
            Automated Extraction & Inventory Policy
          </strong>
          AI extraction is only a draft and approval never pays or changes stock. Stock increases only when warehouse inventory staff physically inspect and confirm goods receipt.
        </div>
      </div>

      {/* Drag & Drop Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-[12px] border-2 border-dashed p-8 text-center transition-all cursor-pointer relative ${
          isDragging
            ? 'border-[#6B6B3A] bg-[#6B6B3A]/10 scale-[1.005]'
            : 'border-[#DDD6C8] bg-white hover:border-[#6B6B3A] hover:bg-[#FAF8F5]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUploadFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#6B6B3A]" />
            <div className="text-xs font-semibold text-[#26262B]">
              Encrypting & Uploading PDF to Private Vault...
            </div>
            <div className="text-[11px] text-[#8C867D]">
              Verifying document headers & dispatching extraction event
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F0] text-[#6B6B3A] mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-base font-semibold text-[#26262B]">
              Upload Supplier Invoice (PDF)
            </h3>
            <p className="text-xs text-[#8C867D] mt-1 max-w-sm mx-auto">
              Drag and drop an invoice PDF here, or click to browse. Max size 10 MB.
            </p>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by invoice # or supplier..."
            className="pl-9 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-[#8C867D] hover:text-[#26262B]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:ring-2 focus:ring-[#6B6B3A]"
          >
            <option value="all">All Statuses ({invoices.length})</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="goods_received">Goods Received</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-between text-xs">
          <span>{errorMsg}</span>
          <Button variant="outline" size="sm" onClick={fetchInvoices} className="h-7 text-xs bg-white">
            Retry
          </Button>
        </div>
      )}

      {/* Invoices Table Container */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-sm relative">
        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-[#8C867D]" />
            <h3 className="font-serif text-base font-medium text-[#26262B]">
              No supplier invoices found
            </h3>
            <p className="text-xs text-[#8C867D] max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No invoices match your selected status or search filter.'
                : 'No purchase invoices uploaded yet. Drop a PDF above to begin review.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (< md) */}
            <div className="md:hidden divide-y divide-[#DDD6C8]/60">
              {paginatedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="p-4 space-y-3 cursor-pointer hover:bg-[#FAF8F5]/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#8C867D] shrink-0" />
                      <span className="font-mono font-bold text-sm text-[#26262B]">
                        {inv.invoice_number || 'Unnumbered (Draft)'}
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-[#26262B]">
                      {inv.total !== null && inv.total !== undefined
                        ? formatCurrency(inv.total)
                        : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6B665E]">
                    <span>{inv.supplier?.business_name || 'Unassigned Vendor'}</span>
                    <span className="text-[11px] text-[#8C867D]">
                      {inv.invoice_date || (inv.created_at ? formatDate(inv.created_at) : '—')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C8]/40">
                    <Badge
                      variant={
                        inv.status === 'needs_review'
                          ? 'amber'
                          : inv.status === 'approved'
                          ? 'green'
                          : inv.status === 'goods_received'
                          ? 'olive'
                          : inv.status === 'processing'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-[10px] py-0 px-2"
                    >
                      {(inv.status || 'uploaded').replace('_', ' ')}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoiceId(inv.id);
                      }}
                      className="min-h-[40px] px-3 text-xs gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Review</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF8F5] hover:bg-[#FAF8F5]">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className="cursor-pointer hover:bg-[#FAF8F5]/60 transition-colors"
                    >
                      {/* Invoice # */}
                      <TableCell className="font-mono font-medium text-[#26262B]">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#8C867D] shrink-0" />
                          <span>{inv.invoice_number || 'Unnumbered (Draft)'}</span>
                        </div>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell className="text-xs text-[#6B665E]">
                        {inv.supplier?.business_name || '—'}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-[#8C867D]">
                        {inv.invoice_date || (inv.created_at ? formatDate(inv.created_at) : '—')}
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-right font-medium text-xs text-[#26262B]">
                        {inv.total !== null && inv.total !== undefined
                          ? formatCurrency(inv.total)
                          : '—'}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            inv.status === 'needs_review'
                              ? 'amber'
                              : inv.status === 'approved'
                              ? 'green'
                              : inv.status === 'goods_received'
                              ? 'olive'
                              : inv.status === 'processing'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[10px] py-0 px-2"
                        >
                          {(inv.status || 'uploaded').replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoiceId(inv.id);
                          }}
                          className="h-8 px-2 text-xs text-[#6B665E] hover:text-[#26262B] gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* 20 per page Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#DDD6C8] bg-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C867D]">
            <span>
              Page <strong className="text-[#26262B]">{page}</strong> of{' '}
              <strong className="text-[#26262B]">{totalPages}</strong> (20 per page)
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="min-h-[44px] sm:min-h-8 px-3 text-xs bg-white flex-1 sm:flex-initial"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="min-h-[44px] sm:min-h-8 px-3 text-xs bg-white flex-1 sm:flex-initial"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details & PDF Drawer */}
      <InvoiceDrawer
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
        suppliers={suppliers}
        products={products}
        onInvoiceUpdated={handleInvoiceUpdated}
        userRole={userRole}
      />
    </div>
  );
}
