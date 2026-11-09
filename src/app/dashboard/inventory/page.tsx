import { redirect } from 'next/navigation';
import { getCurrentProfile, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { getSeedProducts } from '@/lib/catalog-data';
import { ForbiddenError } from '@/components/ui/forbidden';
import { InventoryTable } from '@/components/dashboard/InventoryTable';
import type { UserRole } from '@/types/database';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'inventory'];

export default async function InventoryPage() {
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
          featureName="Inventory"
        />
      );
    }
    redirect('/login?redirect=/dashboard/inventory');
  }

  let items: any[] = [];
  try {
    if (!isSupabaseAdminConfigured()) {
      items = getSeedProducts().map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock_qty: p.stock_qty,
        reorder_level: p.reorder_level || 3,
        is_active: p.is_active,
        category: p.category,
      }));
    } else {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('products')
        .select(`
          id,
          name,
          sku,
          stock_qty,
          reorder_level,
          is_active,
          category:categories(id, name)
        `)
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        items = getSeedProducts().map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock_qty: p.stock_qty,
          reorder_level: p.reorder_level || 3,
          is_active: p.is_active,
          category: p.category,
        }));
      } else {
        items = data;
      }
    }
  } catch (err: unknown) {
    console.error('InventoryPage unexpected server error:', err);
  }

  return <InventoryTable initialItems={items} />;
}
