import { redirect } from 'next/navigation';
import { getCurrentProfile, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { getSeedCategories, getSeedProducts } from '@/lib/catalog-data';
import { ForbiddenError } from '@/components/ui/forbidden';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import type { UserRole, Product, Category } from '@/types/database';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager'];

export default async function ProductsPage() {
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
          featureName="Products"
        />
      );
    }
    redirect('/login?redirect=/dashboard/products');
  }

  let products: Product[] = [];
  let total = 0;
  let categories: Category[] = [];

  try {
    if (!isSupabaseAdminConfigured()) {
      categories = getSeedCategories();
      products = getSeedProducts();
      total = products.length;
    } else {
      const adminClient = createAdminClient();

      // Fetch active categories
      const { data: catData, error: catErr } = await adminClient
        .from('categories')
        .select('id, name, slug, sort_order, is_active, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catErr) {
        categories = getSeedCategories();
      } else if (catData) {
        categories = catData as Category[];
      }

      // Fetch first page of products (20 per page)
      const { data: prodData, error: prodErr, count } = await adminClient
        .from('products')
        .select(
          `
          id,
          category_id,
          name,
          slug,
          description,
          sku,
          price,
          cost_price,
          stock_qty,
          reorder_level,
          color,
          material,
          width_cm,
          depth_cm,
          height_cm,
          is_featured,
          is_active,
          created_at,
          updated_at,
          category:categories(id, name, slug),
          images:product_images(id, storage_path, alt_text, sort_order)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(0, 19);

      if (prodErr) {
        console.error('Error fetching products in ProductsPage:', {
          message: prodErr.message,
          code: prodErr.code,
          details: prodErr.details,
          hint: prodErr.hint,
        });
      } else if (prodData) {
        products = prodData as Product[];
        total = count ?? products.length;
      }
    }
  } catch (err: unknown) {
    console.error('ProductsPage unexpected server error:', err);
  }

  return (
    <ProductsTable
      initialProducts={products}
      initialTotal={total}
      initialPage={1}
      categories={categories}
    />
  );
}
