import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductGrid } from '@/components/store/ProductGrid';
import { FilterBar } from '@/components/store/FilterBar';
import { SearchInput } from '@/components/store/SearchInput';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import type { Category, Product, ProductImage } from '@/types/database';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSeedCategories, getSeedProducts } from '@/lib/catalog-data';

interface ShopPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    min?: string;
    max?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || '';
  const categoryParam = params.category?.trim() || '';
  const minParam = params.min?.trim() || '';
  const maxParam = params.max?.trim() || '';
  const sort = params.sort?.trim() || 'newest';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const pageSize = siteConfig.pagination.shopPageSize || 12;

  let categories: Category[] = [];
  let products: Product[] = [];
  let totalCount = 0;
  let fetchError: string | null = null;

  try {
    if (!isSupabaseConfigured()) {
      categories = getSeedCategories();
      let list = [...getSeedProducts()];

      if (categoryParam) {
        const categorySlugs = categoryParam.split(',').map((s) => s.trim().toLowerCase());
        list = list.filter((p) => p.category?.slug && categorySlugs.includes(p.category.slug.toLowerCase()));
      }
      if (q) {
        const lowerQ = q.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQ) ||
            (p.description && p.description.toLowerCase().includes(lowerQ)) ||
            (p.material && p.material.toLowerCase().includes(lowerQ)) ||
            p.sku.toLowerCase().includes(lowerQ)
        );
      }
      if (minParam) {
        const minVal = parseInt(minParam, 10);
        if (!isNaN(minVal)) list = list.filter((p) => p.price >= minVal);
      }
      if (maxParam) {
        const maxVal = parseInt(maxParam, 10);
        if (!isNaN(maxVal)) list = list.filter((p) => p.price <= maxVal);
      }
      if (sort === 'price_asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (sort === 'price_desc') {
        list.sort((a, b) => b.price - a.price);
      }

      totalCount = list.length;
      const offset = (currentPage - 1) * pageSize;
      products = list.slice(offset, offset + pageSize);
    } else {
      const supabase = await createClient();

      // 1. Fetch all active categories for the filter bar
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catError) {
        categories = getSeedCategories();
      } else if (catData && catData.length > 0) {
        categories = catData as Category[];
      } else {
        categories = getSeedCategories();
      }

      // 2. Build product query
      let query = supabase
        .from('products')
        .select(
          `
          id, category_id, name, slug, description, sku, price, stock_qty, color, material, width_cm, depth_cm, height_cm, is_featured, is_active,
          category:categories(name, slug),
          images:product_images(id, product_id, storage_path, alt_text, sort_order)
        `,
          { count: 'exact' }
        )
        .eq('is_active', true);

      // Category filter (supports single or comma-separated category slugs)
      if (categoryParam) {
        const categorySlugs = categoryParam.split(',').map((s) => s.trim().toLowerCase());
        const matchingCategories = categories.filter((c) => categorySlugs.includes(c.slug.toLowerCase()));
        if (matchingCategories.length > 0) {
          const catIds = matchingCategories.map((c) => c.id);
          query = query.in('category_id', catIds);
        }
      }

      // Text search filter
      if (q) {
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,material.ilike.%${q}%,sku.ilike.%${q}%`);
      }

      // Price range filters (?min=, ?max=)
      if (minParam) {
        const minVal = parseInt(minParam, 10);
        if (!isNaN(minVal)) {
          query = query.gte('price', minVal);
        }
      }
      if (maxParam) {
        const maxVal = parseInt(maxParam, 10);
        if (!isNaN(maxVal)) {
          query = query.lte('price', maxVal);
        }
      }

      // Sorting
      if (sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const offset = (currentPage - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data: prodData, error: prodError, count } = await query;

      if (prodError) {
        // Fallback to seed catalog
        let list = [...getSeedProducts()];
        totalCount = list.length;
        products = list.slice(offset, offset + pageSize);
      } else {
        products = (prodData as unknown as Product[]) || [];
        totalCount = count || 0;
        if (products.length === 0 && !q && !categoryParam && !minParam && !maxParam) {
          let list = [...getSeedProducts()];
          totalCount = list.length;
          products = list.slice(offset, offset + pageSize);
        }
      }
    }
  } catch {
    categories = getSeedCategories();
    let list = [...getSeedProducts()];
    totalCount = list.length;
    const offset = (currentPage - 1) * pageSize;
    products = list.slice(offset, offset + pageSize);
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  const buildPaginationUrl = (pageNumber: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (categoryParam) sp.set('category', categoryParam);
    if (minParam) sp.set('min', minParam);
    if (maxParam) sp.set('max', maxParam);
    if (sort && sort !== 'newest') sp.set('sort', sort);
    sp.set('page', pageNumber.toString());
    return `/shop?${sp.toString()}`;
  };

  return (
    <div className="container-custom py-10 space-y-8">
      {/* Header and Search */}
      <div className="border-b border-[#DDD6C8] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6B3A]">
            Catalog
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#26262B]">
            Solid Wood Furniture Collection
          </h1>
          <p className="text-xs sm:text-sm text-[#6B665E]">
            Handcrafted Sheesham, Oak, and Walnut pieces built for lifetime sanctuaries.
          </p>
        </div>

        {/* Search Input Component */}
        <div className="w-full md:w-80">
          <SearchInput placeholder="Search catalog..." />
        </div>
      </div>

      {/* Filter and Sorting Bar */}
      <FilterBar categories={categories} totalResults={totalCount} />

      {/* Product Results Grid */}
      <ProductGrid
        products={products}
        error={fetchError}
        emptyMessage={
          q || categoryParam || minParam || maxParam
            ? 'No furniture pieces found matching your filter criteria. Try adjusting or clearing filters.'
            : 'No active pieces found in the catalog.'
        }
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-8 border-t border-[#DDD6C8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#8C867D]">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} pieces
          </span>

          <div className="flex items-center gap-2">
            <Link
              href={buildPaginationUrl(currentPage - 1)}
              className={currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}
            >
              <Button variant="outline" size="sm" disabled={currentPage <= 1} className="gap-1 text-xs min-h-[44px] px-3">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>

            <span className="text-xs font-medium text-[#26262B] px-3">
              Page {currentPage} of {totalPages}
            </span>

            <Link
              href={buildPaginationUrl(currentPage + 1)}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}
            >
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="gap-1 text-xs min-h-[44px] px-3">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
