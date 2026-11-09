'use client';

import { useState, useEffect, useTransition } from 'react';
import { Search, Plus, Edit3, Image as ImageIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
import { ProductSheet } from '@/components/dashboard/ProductSheet';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import type { Product, Category } from '@/types/database';

interface ProductsTableProps {
  initialProducts: Product[];
  initialTotal: number;
  initialPage: number;
  categories: Category[];
}

export function ProductsTable({
  initialProducts,
  initialTotal,
  initialPage,
  categories,
}: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active status toggle loading tracking
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products when page or debounced query changes
  const fetchProducts = async (p = page, q = debouncedQuery) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.set('page', p.toString());
      if (q.trim()) params.set('q', q.trim());

      const res = await fetch(`/api/dashboard/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve products');
      }

      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setErrorMsg(err.message || 'Unable to query product catalog. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page, debouncedQuery);
  }, [page, debouncedQuery]);

  // Handle active status toggle
  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.is_active;
    setTogglingId(product.id);

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/dashboard/products/${product.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success(
        newStatus
          ? `"${product.name}" is now active in storefront`
          : `"${product.name}" deactivated from storefront`
      );
    } catch (err: any) {
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !newStatus } : p))
      );
      toast.error(err.message || 'Could not update product status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = async (product: Product) => {
    // Optionally fetch full product data with all images
    try {
      const res = await fetch(`/api/dashboard/products/${product.id}`);
      const data = await res.json();
      if (res.ok && data.product) {
        setSelectedProduct(data.product);
      } else {
        setSelectedProduct(product);
      }
    } catch {
      setSelectedProduct(product);
    }
    setIsSheetOpen(true);
  };

  const handleSaved = (savedProduct: Product, isNew: boolean) => {
    if (isNew) {
      fetchProducts(1, debouncedQuery);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === savedProduct.id ? { ...p, ...savedProduct } : p))
      );
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
            Catalog Management
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-0.5">
            Products Catalog
          </h1>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-2 min-h-[44px] sm:min-h-9 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or SKU..."
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
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-xs text-[#8C867D]">
            Total: <strong className="text-[#26262B]">{total}</strong> pieces
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchProducts(page, debouncedQuery)}
            disabled={isLoading}
            className="h-8 px-2 text-xs"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts(page, debouncedQuery)}
            className="bg-white border-red-200 text-red-700 hover:bg-red-100 h-7 text-xs"
          >
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
              Loading products...
            </div>
          </div>
        )}

        {products.length === 0 && !isLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8C867D] border border-[#DDD6C8]">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-base font-medium text-[#26262B]">
              No products found
            </h3>
            <p className="text-xs text-[#8C867D] max-w-sm mx-auto">
              {debouncedQuery
                ? `No products matched "${debouncedQuery}". Try refining your search query.`
                : 'Your furniture catalog is empty. Click "Add Product" to create your first piece.'}
            </p>
            {debouncedQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs"
              >
                Clear Search Filter
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Stacked Product Cards (< md) */}
            <div className="md:hidden divide-y divide-[#DDD6C8]/60">
              {products.map((product) => {
                const firstImg = product.images?.[0]?.storage_path;
                const imgUrl = firstImg
                  ? `${supabaseUrl}/storage/v1/object/public/product-images/${firstImg}`
                  : null;
                const isLowStock = product.stock_qty <= (product.reorder_level ?? 5);

                return (
                  <div key={product.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-14 rounded-md bg-[#FAF8F5] border border-[#DDD6C8] overflow-hidden flex items-center justify-center shrink-0">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[#8C867D]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-[#26262B] line-clamp-1">
                            {product.name}
                          </h4>
                          {product.is_featured && (
                            <Badge variant="olive" className="text-[9px] py-0 px-1.5 shrink-0">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-[#8C867D]">{product.sku}</p>
                        <p className="text-xs text-[#6B665E]">{product.category?.name || 'Unassigned'}</p>
                        <p className="text-sm font-semibold text-[#26262B] mt-1">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C8]/40">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block font-semibold text-xs px-2 py-0.5 rounded ${
                            product.stock_qty === 0
                              ? 'bg-rose-50 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          Stock: {product.stock_qty}
                        </span>

                        <div className="flex items-center gap-1.5 pl-2 border-l border-[#DDD6C8]/60">
                          <span className="text-[11px] text-[#8C867D]">Active:</span>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            disabled={togglingId === product.id}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              product.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                            } ${togglingId === product.id ? 'opacity-50 cursor-wait' : ''}`}
                            aria-label={`Toggle active status for ${product.name}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                product.is_active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(product)}
                        className="min-h-[40px] px-3 gap-1 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#6B665E]" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF8F5] hover:bg-[#FAF8F5]">
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Piece & Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const firstImg = product.images?.[0]?.storage_path;
                    const imgUrl = firstImg
                      ? `${supabaseUrl}/storage/v1/object/public/product-images/${firstImg}`
                      : null;
                    const isLowStock = product.stock_qty <= (product.reorder_level ?? 5);

                    return (
                      <TableRow key={product.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        {/* Thumbnail */}
                        <TableCell>
                          <div className="h-12 w-10 rounded-sm bg-[#FAF8F5] border border-[#DDD6C8] overflow-hidden flex items-center justify-center shrink-0">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-[#8C867D]" />
                            )}
                          </div>
                        </TableCell>

                        {/* Name & Featured Badge */}
                        <TableCell className="font-medium text-[#26262B]">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[220px]" title={product.name}>
                              {product.name}
                            </span>
                            {product.is_featured && (
                              <Badge variant="olive" className="text-[9px] py-0 px-1.5 shrink-0">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="font-mono text-xs text-[#8C867D]">{product.sku}</TableCell>

                        {/* Category */}
                        <TableCell className="text-xs text-[#6B665E]">
                          {product.category?.name || 'Unassigned'}
                        </TableCell>

                        {/* Price */}
                        <TableCell className="text-right font-medium text-xs text-[#26262B]">
                          {formatCurrency(product.price)}
                        </TableCell>

                        {/* Stock */}
                        <TableCell className="text-center">
                          <span
                            className={`inline-block font-semibold text-xs px-2 py-0.5 rounded ${
                              product.stock_qty === 0
                                ? 'bg-rose-50 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700'
                                : 'text-[#26262B]'
                            }`}
                            title={isLowStock ? `Low stock alert (<= ${product.reorder_level ?? 5})` : 'In stock'}
                          >
                            {product.stock_qty}
                          </span>
                        </TableCell>

                        {/* Active Toggle Switch */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            disabled={togglingId === product.id}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              product.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                            } ${togglingId === product.id ? 'opacity-50 cursor-wait' : ''}`}
                            title={product.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                product.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(product)}
                            className="h-8 w-8 p-0 hover:bg-[#EFECE6]"
                            title="Edit product"
                          >
                            <Edit3 className="h-4 w-4 text-[#6B665E]" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                disabled={page <= 1 || isLoading}
                className="min-h-[44px] sm:min-h-8 px-3 text-xs bg-white flex-1 sm:flex-initial"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isLoading}
                className="min-h-[44px] sm:min-h-8 px-3 text-xs bg-white flex-1 sm:flex-initial"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Side Sheet Drawer for Add & Edit */}
      <ProductSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        product={selectedProduct}
        categories={categories}
        onSaved={handleSaved}
      />
    </div>
  );
}
