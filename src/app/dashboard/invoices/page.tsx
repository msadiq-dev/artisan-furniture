import { redirect } from 'next/navigation';
import { getCurrentProfile, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { ForbiddenError } from '@/components/ui/forbidden';
import { InvoicesTable } from '@/components/dashboard/InvoicesTable';
import type { UserRole, PurchaseInvoice, Supplier, Product } from '@/types/database';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'accounts', 'inventory'];

export default async function InvoicesPage() {
  let profile: any;
  try {
    profile = await requireRole(ALLOWED_ROLES, false);
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      const current = await getCurrentProfile();
      return (
        <ForbiddenError
          allowedRoles={ALLOWED_ROLES}
          userRole={current?.role || 'sales'}
          featureName="Invoices"
        />
      );
    }
    redirect('/login?redirect=/dashboard/invoices');
  }

  let invoices: PurchaseInvoice[] = [];
  let suppliers: Supplier[] = [];
  let products: Product[] = [];

  try {
    if (isSupabaseAdminConfigured()) {
      const adminClient = createAdminClient();

      // 1. Fetch purchase_invoices
      const { data: invData, error: invError } = await (adminClient as any)
        .from('purchase_invoices')
        .select(`
          id,
          supplier_id,
          invoice_number,
          invoice_date,
          due_date,
          currency,
          subtotal,
          tax,
          total,
          file_path,
          status,
          created_at,
          supplier:suppliers(id, business_name)
        `)
        .order('created_at', { ascending: false });

      if (invError) {
        console.error('Error fetching purchase invoices:', {
          message: invError.message,
          code: invError.code,
          details: invError.details,
          hint: invError.hint,
        });
      } else if (invData) {
        invoices = invData as PurchaseInvoice[];
      }

      // 2. Fetch suppliers
      const { data: suppData, error: suppError } = await (adminClient as any)
        .from('suppliers')
        .select('id, business_name, contact_name, phone, email, is_active')
        .order('business_name', { ascending: true });

      if (suppError) {
        console.error('Error fetching suppliers for invoices:', suppError);
      } else if (suppData) {
        suppliers = suppData as Supplier[];
      }

      // 3. Fetch products for line items mapping
      const { data: prodData, error: prodError } = await adminClient
        .from('products')
        .select('id, name, sku, price')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (prodError) {
        console.error('Error fetching products for invoices:', prodError);
      } else if (prodData) {
        products = prodData as Product[];
      }
    }
  } catch (err: unknown) {
    console.error('InvoicesPage unexpected server error:', err);
  }

  return (
    <InvoicesTable
      initialInvoices={invoices}
      suppliers={suppliers}
      products={products}
      userRole={profile.role}
    />
  );
}
