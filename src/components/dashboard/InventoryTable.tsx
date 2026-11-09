'use client';

import { useState, useMemo } from 'react';
import { Search, AlertCircle, History, SlidersHorizontal, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
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
import { AdjustStockDialog } from '@/components/dashboard/AdjustStockDialog';
import { StockMovementsDrawer } from '@/components/dashboard/StockMovementsDrawer';
import type { Product } from '@/types/database';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock_qty: number;
  reorder_level: number;
  is_active: boolean;
  category?: { id: string; name: string } | null;
}

interface InventoryTableProps {
  initialItems: InventoryItem[];
}

export function InventoryTable({ initialItems }: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / Drawer state
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null);
  const [inspectingProduct, setInspectingProduct] = useState<InventoryItem | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/dashboard/inventory');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refresh inventory');
      setItems(data.items || []);
    } catch (err: any) {
      console.error('Refresh inventory error:', err);
      setErrorMsg(err.message || 'Unable to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockAdjusted = (productId: string, newStock: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, stock_qty: newStock } : item))
    );
  };

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);

      const threshold = item.reorder_level ?? 5;
      const isLowStock = (item.stock_qty ?? 0) <= threshold;

      if (lowStockOnly && !isLowStock) return false;
      return matchesSearch;
    });
  }, [items, searchQuery, lowStockOnly]);

  const totalLowStockCount = useMemo(() => {
    return items.filter((i) => (i.stock_qty ?? 0) <= (i.reorder_level ?? 5)).length;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#6B6B3A]">
            Warehouse & Levels
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#26262B] mt-0.5">
            Inventory & Stock Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C867D]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock by SKU, piece name..."
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

        {/* Low Stock Toggle Button */}
        <button
          type="button"
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors w-full sm:w-auto justify-center ${
            lowStockOnly
              ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold ring-1 ring-amber-500'
              : 'border-[#DDD6C8] bg-white text-[#6B665E] hover:bg-[#FAF8F5]'
          }`}
        >
          <AlertCircle className={`h-4 w-4 ${lowStockOnly ? 'text-amber-600' : 'text-[#8C867D]'}`} />
          <span>Low Stock Filter</span>
          {totalLowStockCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                lowStockOnly ? 'bg-amber-200 text-amber-900' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {totalLowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchItems} className="bg-white text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Inventory Table Container */}
      <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-sm relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-[#6B6B3A] bg-white px-4 py-2 rounded-full shadow-md border border-[#DDD6C8]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inventory levels...
            </div>
          </div>
        )}

        {filteredItems.length === 0 && !isLoading ? (
          <div className="p-16 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-[#8C867D]" />
            <h3 className="font-serif text-base font-medium text-[#26262B]">
              No inventory records found
            </h3>
            <p className="text-xs text-[#8C867D] max-w-sm mx-auto">
              {lowStockOnly
                ? 'All pieces are currently at healthy stock levels.'
                : searchQuery
                ? `No piece matches "${searchQuery}".`
                : 'No catalog products available to display.'}
            </p>
            {lowStockOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLowStockOnly(false)}
                className="mt-2 text-xs"
              >
                Clear Low Stock Filter
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (< md) */}
            <div className="md:hidden divide-y divide-[#DDD6C8]/60">
              {filteredItems.map((item) => {
                const threshold = item.reorder_level ?? 5;
                const isOutOfStock = (item.stock_qty ?? 0) <= 0;
                const isLowStock = !isOutOfStock && (item.stock_qty ?? 0) <= threshold;

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm text-[#26262B]">
                          {item.name}
                        </h4>
                        <p className="text-xs font-mono text-[#8C867D]">{item.sku}</p>
                        <p className="text-xs text-[#6B665E]">{item.category?.name || 'Unassigned'}</p>
                      </div>

                      <div className="text-right shrink-0">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] py-0 px-2">
                            Out of Stock
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="amber" className="text-[10px] py-0 px-2">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="green" className="text-[10px] py-0 px-2">
                            Healthy
                          </Badge>
                        )}
                        <div className="text-xs text-[#8C867D] mt-1">
                          Threshold: {threshold}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C8]/40">
                      <div className="text-xs">
                        <span className="text-[#8C867D]">Current Stock: </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-800'
                              : 'text-[#26262B]'
                          }`}
                        >
                          {item.stock_qty ?? 0} units
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectingProduct(item)}
                          className="min-h-[40px] px-2.5 text-xs gap-1 text-[#6B665E] hover:text-[#26262B]"
                          title="View stock movement history"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>History</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustingProduct(item)}
                          className="min-h-[40px] px-3 text-xs bg-white"
                        >
                          Adjust
                        </Button>
                      </div>
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
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Reorder Threshold</TableHead>
                    <TableHead className="text-center">Stock Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const threshold = item.reorder_level ?? 5;
                    const isOutOfStock = (item.stock_qty ?? 0) <= 0;
                    const isLowStock = !isOutOfStock && (item.stock_qty ?? 0) <= threshold;

                    return (
                      <TableRow key={item.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        {/* Name */}
                        <TableCell className="font-medium text-[#26262B]">
                          {item.name}
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="font-mono text-xs text-[#8C867D]">{item.sku}</TableCell>

                        {/* Category */}
                        <TableCell className="text-xs text-[#6B665E]">
                          {item.category?.name || 'Unassigned'}
                        </TableCell>

                        {/* Current Stock */}
                        <TableCell className="text-center font-bold text-sm text-[#26262B]">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-800'
                                : 'text-[#26262B]'
                            }`}
                          >
                            {item.stock_qty ?? 0}
                          </span>
                        </TableCell>

                        {/* Reorder Threshold */}
                        <TableCell className="text-center text-xs text-[#8C867D]">
                          {threshold}
                        </TableCell>

                        {/* Stock Health */}
                        <TableCell className="text-center">
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-2">
                              Out of Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge variant="amber" className="text-[10px] py-0 px-2">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="green" className="text-[10px] py-0 px-2">
                              Healthy
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectingProduct(item)}
                            className="text-xs h-8 gap-1 text-[#6B665E] hover:text-[#26262B]"
                            title="View stock movement history"
                          >
                            <History className="h-3.5 w-3.5" />
                            Movements
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjustingProduct(item)}
                            className="text-xs h-8 bg-white"
                          >
                            Adjust Stock
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
      </div>

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        onAdjusted={handleStockAdjusted}
      />

      {/* Stock Movement Audit Drawer */}
      <StockMovementsDrawer
        isOpen={Boolean(inspectingProduct)}
        onClose={() => setInspectingProduct(null)}
        product={inspectingProduct}
      />
    </div>
  );
}
