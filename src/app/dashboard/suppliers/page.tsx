import { redirect } from 'next/navigation';
import { getCurrentProfile, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { ForbiddenError } from '@/components/ui/forbidden';
import { SuppliersTable } from '@/components/dashboard/SuppliersTable';
import type { UserRole, Supplier } from '@/types/database';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'accounts'];

export default async function SuppliersPage() {
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
          featureName="Suppliers"
        />
      );
    }
    redirect('/login?redirect=/dashboard/suppliers');
  }

  let suppliers: Supplier[] = [];
  try {
    if (isSupabaseAdminConfigured()) {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('suppliers')
        .select('*')
        .order('business_name', { ascending: true });

      if (!error && data) {
        suppliers = data as Supplier[];
      }
    }
  } catch {
    // clean fallback
  }

  return <SuppliersTable initialSuppliers={suppliers} />;
}
