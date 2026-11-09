'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, RotateCcw, X, Check, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types/database';

interface FilterBarProps {
  categories: Category[];
  totalResults: number;
}

export function FilterBar({ categories, totalResults }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const currentCategory = searchParams.get('category') || '';
  const currentMin = searchParams.get('min') || '';
  const currentMax = searchParams.get('max') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentQ = searchParams.get('q') || '';

  const selectedCategorySlugs = currentCategory
    ? currentCategory.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1');
    router.push(`/shop?${params.toString()}`);
  };

  const handleCategoryToggle = (slug: string) => {
    const lower = slug.toLowerCase();
    let newCategories: string[];
    if (selectedCategorySlugs.includes(lower)) {
      newCategories = selectedCategorySlugs.filter((s) => s !== lower);
    } else {
      newCategories = [...selectedCategorySlugs, lower];
    }
    updateParams({ category: newCategories.length > 0 ? newCategories.join(',') : null });
  };

  const handlePricePreset = (min: string | null, max: string | null) => {
    updateParams({ min, max });
  };

  const handleReset = () => {
    router.push('/shop');
    setMobileSheetOpen(false);
  };

  const pricePresets = [
    { label: 'All Prices', min: null, max: null },
    { label: 'Under Rs 50k', min: null, max: '50000' },
    { label: 'Rs 50k – 100k', min: '50000', max: '100000' },
    { label: 'Rs 100k – 150k', min: '100000', max: '150000' },
    { label: 'Above Rs 150k', min: '150000', max: null },
  ];

  const sortOptions = [
    { label: 'Newest Additions', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
  ];

  const activeFilterCount =
    selectedCategorySlugs.length +
    (currentMin || currentMax ? 1 : 0) +
    (currentSort && currentSort !== 'newest' ? 1 : 0) +
    (currentQ ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <>
      {/* Mobile/Tablet Portrait Filter & Sort Button (visible below lg) */}
      <div className="flex lg:hidden items-center justify-between gap-3 rounded-[12px] border border-[#DDD6C8] bg-white p-3.5 shadow-xs">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileSheetOpen(true)}
          className="flex-1 gap-2 text-xs border-[#DDD6C8] min-h-[44px]"
          aria-expanded={mobileSheetOpen}
          aria-label="Open filter and sorting options"
        >
          <SlidersHorizontal className="h-4 w-4 text-[#6B6B3A]" />
          <span>Filters & Sort</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6B6B3A] text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-[#8C867D] hover:text-[#B3402F] min-h-[44px] px-3"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Desktop Filter Bar (visible from lg upward) */}
      <div className="hidden lg:block space-y-4 rounded-[12px] border border-[#DDD6C8] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4 border-b border-[#DDD6C8]/60 pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#6B6B3A]" />
            <span className="font-serif text-base font-medium text-[#26262B]">
              Refine Catalog
            </span>
            <span className="text-xs text-[#8C867D]">
              ({totalResults} {totalResults === 1 ? 'piece' : 'pieces'})
            </span>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select-desktop" className="text-xs font-medium text-[#6B665E]">
              Sort by:
            </label>
            <select
              id="sort-select-desktop"
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="rounded-[8px] border border-[#DDD6C8] bg-[#FAF7F0] px-3 py-1.5 text-xs text-[#26262B] focus:border-[#6B6B3A] focus:outline-none min-h-[36px]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-[#8C867D] hover:text-[#B3402F] gap-1 h-8 px-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filter Row: Category Checkboxes */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8C867D]">
            Categories
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {categories.map((cat) => {
              const isChecked = selectedCategorySlugs.includes(cat.slug.toLowerCase());
              return (
                <label
                  key={cat.id}
                  className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-[#6B6B3A] bg-[#6B6B3A]/10 text-[#6B6B3A]'
                      : 'border-[#DDD6C8] bg-[#FAF7F0] text-[#6B665E] hover:bg-[#EFEAE0]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCategoryToggle(cat.slug)}
                    className="h-4 w-4 rounded border-[#DDD6C8] text-[#6B6B3A] focus:ring-[#6B6B3A]"
                  />
                  <span>{cat.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Filter Row: Price Range */}
        <div className="space-y-2 pt-2 border-t border-[#DDD6C8]/40">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8C867D]">
            Price Range
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {pricePresets.map((preset) => {
              const isSelected =
                (preset.min === null && preset.max === null && !currentMin && !currentMax) ||
                (preset.min === currentMin && preset.max === currentMax);

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePricePreset(preset.min, preset.max)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#26262B] text-white shadow-xs'
                      : 'bg-[#FAF7F0] text-[#6B665E] hover:bg-[#EFEAE0]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Portrait Bottom Sheet Modal */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSheetOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative w-full max-h-[85dvh] overflow-y-auto rounded-t-[20px] border-t border-[#DDD6C8] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 space-y-6">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#6B6B3A]" />
                <h3 className="font-serif text-lg font-medium text-[#26262B]">
                  Filter & Sort Pieces
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-[#8C867D] hover:text-[#26262B]"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
                Sort By
              </span>
              <div className="grid grid-cols-1 gap-2">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateParams({ sort: opt.value })}
                    className={`flex items-center justify-between rounded-[8px] border p-3 text-xs text-left min-h-[44px] transition-colors ${
                      currentSort === opt.value
                        ? 'border-[#6B6B3A] bg-[#6B6B3A]/10 text-[#6B6B3A] font-semibold'
                        : 'border-[#DDD6C8] text-[#26262B]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {currentSort === opt.value && <Check className="h-4 w-4 text-[#6B6B3A]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2 border-t border-[#DDD6C8]/60 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
                Categories
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isChecked = selectedCategorySlugs.includes(cat.slug.toLowerCase());
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-3 rounded-[8px] border p-3 text-xs cursor-pointer min-h-[44px] ${
                        isChecked
                          ? 'border-[#6B6B3A] bg-[#6B6B3A]/10 text-[#6B6B3A] font-medium'
                          : 'border-[#DDD6C8] text-[#6B665E]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(cat.slug)}
                        className="h-4 w-4 rounded border-[#DDD6C8] text-[#6B6B3A] focus:ring-[#6B6B3A]"
                      />
                      <span>{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2 border-t border-[#DDD6C8]/60 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
                Price Range
              </span>
              <div className="flex flex-wrap gap-2">
                {pricePresets.map((preset) => {
                  const isSelected =
                    (preset.min === null && preset.max === null && !currentMin && !currentMax) ||
                    (preset.min === currentMin && preset.max === currentMax);

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePricePreset(preset.min, preset.max)}
                      className={`rounded-full px-3.5 py-2 text-xs font-medium min-h-[44px] flex items-center ${
                        isSelected
                          ? 'bg-[#26262B] text-white'
                          : 'bg-[#FAF7F0] text-[#6B665E] border border-[#DDD6C8]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Action Footer in Bottom Sheet */}
            <div className="sticky bottom-0 -mx-6 -mb-6 bg-white px-6 py-4 border-t border-[#DDD6C8] flex items-center gap-3 safe-bottom-bar shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1 text-xs min-h-[44px]"
              >
                Clear All
              </Button>
              <Button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="flex-1 text-xs min-h-[44px]"
              >
                Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
