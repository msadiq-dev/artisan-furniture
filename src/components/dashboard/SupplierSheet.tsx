'use client';

import { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Supplier } from '@/types/database';

interface SupplierSheetProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null; // null = Add, object = Edit
  onSaved: (supplier: Supplier, isNew: boolean) => void;
}

export function SupplierSheet({
  isOpen,
  onClose,
  supplier,
  onSaved,
}: SupplierSheetProps) {
  const isEditing = Boolean(supplier);

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    if (supplier) {
      setBusinessName(supplier.business_name || '');
      setContactName(supplier.contact_name || '');
      setEmail(supplier.email || '');
      setPhone(supplier.phone || '');
      setAddress(supplier.address || '');
      setTaxId(supplier.tax_id || '');
      setNotes(supplier.notes || '');
      setIsActive(supplier.is_active !== false);
    } else {
      setBusinessName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setTaxId('');
      setNotes('');
      setIsActive(true);
    }
    setFieldErrors({});
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!businessName.trim() || businessName.trim().length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please resolve indicated errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        tax_id: taxId.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      const endpoint = isEditing && supplier
        ? `/api/dashboard/suppliers/${supplier.id}`
        : '/api/dashboard/suppliers';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          const flat: Record<string, string> = {};
          Object.entries(data.fieldErrors).forEach(([k, v]) => {
            if (Array.isArray(v) && v[0]) flat[k] = v[0];
          });
          setFieldErrors(flat);
        }
        throw new Error(data.error || 'Failed to save supplier');
      }

      toast.success(
        isEditing
          ? `Supplier "${payload.business_name}" updated`
          : `Supplier "${payload.business_name}" added`
      );
      onSaved(data.supplier, !isEditing);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-lg bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col border-l border-[#DDD6C8] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#DDD6C8] bg-[#FAF8F5] flex items-center justify-between safe-top">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B6B3A]">
              Vendor Directory
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-[#26262B]">
              {isEditing ? `Edit: ${supplier?.business_name}` : 'Register New Supplier'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B] rounded-lg hover:bg-[#EFECE6] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#26262B] mb-1">
              Business / Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Chenab Timbers & Joinery Ltd."
              className={fieldErrors.business_name ? 'border-red-500' : ''}
              required
            />
            {fieldErrors.business_name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fieldErrors.business_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#26262B] mb-1">
                Contact Person Name
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Contact Person"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26262B] mb-1">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#26262B] mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                className={fieldErrors.email ? 'border-red-500' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26262B] mb-1">
                NTN / Tax ID
              </label>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 1234567-8"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26262B] mb-1">
              Physical / Mill Address
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Industrial Area, City"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26262B] mb-1">
              Notes & Payment Terms
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplies kiln-dried sheesham and oak timber. 15-day credit terms..."
              className="w-full p-2.5 text-xs rounded-md border border-[#DDD6C8] bg-white text-[#26262B] focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]"
            />
          </div>

          {/* Active status */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DDD6C8]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-[#6B6B3A] focus:ring-[#6B6B3A]"
              />
              <div>
                <div className="text-xs font-semibold text-[#26262B]">Active Supplier</div>
                <div className="text-[11px] text-[#8C867D]">
                  Allow creating purchase invoices and receiving goods from this vendor
                </div>
              </div>
            </label>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-[#DDD6C8] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sticky bottom-0 bg-white py-3 safe-bottom">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] sm:min-h-9 w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="min-w-[120px] min-h-[44px] sm:min-h-9 w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Supplier'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
