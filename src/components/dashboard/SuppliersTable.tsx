'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Building2, Phone, Mail, Edit3, Loader2, AlertCircle, RefreshCw, Power } from 'lucide-react';
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
import { SupplierSheet } from '@/components/dashboard/SupplierSheet';
import { toast } from 'sonner';
import type { Supplier } from '@/types/database';

interface SuppliersTableProps {
  initialSuppliers: Supplier[];
}

export function SuppliersTable({ initialSuppliers }: SuppliersTableProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/dashboard/suppliers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve suppliers');
      setSuppliers(data.suppliers || []);
    } catch (err: any) {
      console.error('Fetch suppliers failed:', err);
      setErrorMsg(err.message || 'Unable to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = !supplier.is_active;
    setTogglingId(supplier.id);

    // Optimistic update
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplier.id ? { ...s, is_active: newStatus } : s))
    );

    try {
      const res = await fetch(`/api/dashboard/suppliers/${supplier.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update supplier status');

      toast.success(
        newStatus
          ? `Supplier "${supplier.business_name}" activated`
          : `Supplier "${supplier.business_name}" deactivated`
      );
    } catch (err: any) {
      // Revert optimistic update
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? { ...s, is_active: !newStatus } : s))
      );
      toast.error(err.message || 'Failed to change supplier status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenAdd = () => {
    setSelectedSupplier(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsSheetOpen(true);
  };

  const handleSaved = (savedSupplier: Supplier, isNew: boolean) => {
    if (isNew) {
      setSuppliers((prev) => [savedSupplier, ...prev]);
    } else {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === savedSupplier.id ? savedSupplier : s))
      );
    }
  };

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      return (
        s.business_name.toLowerCase().includes(q) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.tax_id && s.tax_id.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
            Procurement
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-0.5">
            Suppliers & Vendors
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuppliers}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs h-8">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search supplier by name, contact, phone, email, or tax ID..."
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

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSuppliers} className="bg-white text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-sm relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-[#6B6B3A] bg-white px-4 py-2 rounded-full shadow-md border border-[#DDD6C8]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading suppliers...
            </div>
          </div>
        )}

        {filteredSuppliers.length === 0 && !isLoading ? (
          <div className="p-16 text-center space-y-2">
            <Building2 className="h-8 w-8 mx-auto text-[#8C867D]" />
            <h3 className="font-serif text-base font-medium text-[#26262B]">
              No suppliers found
            </h3>
            <p className="text-xs text-[#8C867D] max-w-sm mx-auto">
              {searchQuery
                ? `No supplier matched "${searchQuery}".`
                : 'No supplier accounts registered yet. Click "Add Supplier" to onboard a timber mill or hardware vendor.'}
            </p>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs"
              >
                Clear Search Filter
              </Button>
            ) : (
              <Button size="sm" onClick={handleOpenAdd} className="mt-2 text-xs">
                <Plus className="h-4 w-4 mr-1" /> Add First Supplier
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (< md) */}
            <div className="md:hidden divide-y divide-[#DDD6C8]/60">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-[#FAF8F5] border border-[#DDD6C8] flex items-center justify-center text-[#6B6B3A] shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#26262B]">
                          {supplier.business_name}
                        </h4>
                        {supplier.contact_name && (
                          <p className="text-xs text-[#6B665E]">Contact: {supplier.contact_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-[#8C867D]">Active:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(supplier)}
                        disabled={togglingId === supplier.id}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          supplier.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                        } ${togglingId === supplier.id ? 'opacity-50 cursor-wait' : ''}`}
                        aria-label={`Toggle active status for ${supplier.business_name}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            supplier.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-[#6B665E] pl-10">
                    {supplier.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#8C867D]" />
                        <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#8C867D]" />
                        <a href={`mailto:${supplier.email}`} className="break-all hover:underline">{supplier.email}</a>
                      </div>
                    )}
                    {supplier.address && (
                      <p className="text-[#8C867D] text-[11px] line-clamp-1">{supplier.address}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C8]/40 pl-10">
                    <span className="text-[11px] font-mono text-[#8C867D]">
                      NTN: {supplier.tax_id || '—'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(supplier)}
                      className="min-h-[40px] px-3 text-xs gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1 text-[#6B665E]" />
                      Edit
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
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Tax NTN</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      {/* Supplier Business Name */}
                      <TableCell className="font-medium text-[#26262B]">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded bg-[#FAF8F5] border border-[#DDD6C8] flex items-center justify-center text-[#6B6B3A] shrink-0">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-[#26262B]">{supplier.business_name}</div>
                            {supplier.address && (
                              <div className="text-[10px] text-[#8C867D] truncate max-w-[200px]" title={supplier.address}>
                                {supplier.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Person */}
                      <TableCell className="text-xs text-[#6B665E]">
                        {supplier.contact_name || '—'}
                      </TableCell>

                      {/* Contact Details */}
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {supplier.phone && (
                            <div className="flex items-center gap-1.5 text-[#6B665E]">
                              <Phone className="h-3 w-3 text-[#8C867D]" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1.5 text-[#8C867D]">
                              <Mail className="h-3 w-3 text-[#8C867D]" />
                              <span>{supplier.email}</span>
                            </div>
                          )}
                          {!supplier.phone && !supplier.email && <span className="text-[#8C867D]">—</span>}
                        </div>
                      </TableCell>

                      {/* Tax NTN */}
                      <TableCell className="font-mono text-xs text-[#8C867D]">
                        {supplier.tax_id || '—'}
                      </TableCell>

                      {/* Active Status Toggle */}
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(supplier)}
                          disabled={togglingId === supplier.id}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            supplier.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                          } ${togglingId === supplier.id ? 'opacity-50 cursor-wait' : ''}`}
                          title={supplier.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              supplier.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(supplier)}
                          className="h-8 px-2 text-xs text-[#6B665E] hover:text-[#26262B]"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Supplier Sheet for Add / Edit */}
      <SupplierSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        supplier={selectedSupplier}
        onSaved={handleSaved}
      />
    </div>
  );
}
