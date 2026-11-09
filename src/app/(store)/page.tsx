import Link from 'next/link';
import { ArrowRight, Compass, Shield, Clock, Armchair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { HeroSection } from '@/components/store/HeroSection';
import { CategoryTile } from '@/components/store/CategoryTile';
import { ProductGrid } from '@/components/store/ProductGrid';
import { siteConfig } from '@/lib/config';
import type { Category, Product, ProductImage } from '@/types/database';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSeedCategories, getSeedFeaturedProducts } from '@/lib/catalog-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let categories: Category[] = [];
  let featuredProducts: Product[] = [];
  let fetchError: string | null = null;

  try {
    if (!isSupabaseConfigured()) {
      // Gracefully supply solid wood collection seed data when Supabase is unconfigured/placeholder
      categories = getSeedCategories();
      featuredProducts = getSeedFeaturedProducts();
    } else {
      const supabase = await createClient();

      // 1. Fetch active categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catError) {
        categories = getSeedCategories();
      } else {
        categories = (catData as Category[]) || [];
        if (categories.length === 0) {
          categories = getSeedCategories();
        }
      }

      // 2. Fetch featured products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          id, category_id, name, slug, description, sku, price, stock_qty, color, material, width_cm, depth_cm, height_cm, is_featured, is_active,
          category:categories(name, slug),
          images:product_images(id, product_id, storage_path, alt_text, sort_order)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (prodError) {
        featuredProducts = getSeedFeaturedProducts();
      } else {
        featuredProducts = (prodData as unknown as Product[]) || [];
        if (featuredProducts.length === 0) {
          featuredProducts = getSeedFeaturedProducts();
        }
      }
    }
  } catch {
    categories = getSeedCategories();
    featuredProducts = getSeedFeaturedProducts();
  }

  return (
    <div className="space-y-20 pb-16">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Explore by Category */}
      <section className="container-custom">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 sm:mb-8 border-b border-[#DDD6C8] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
              Curated Spaces
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-medium text-[#26262B] mt-1">
              Explore by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs sm:text-sm font-medium text-[#6B6B3A] hover:underline"
          >
            View All Categories →
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {categories.map((cat) => (
              <CategoryTile key={cat.id} category={cat} />
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[#DDD6C8] bg-white/60 p-8 text-center text-xs text-[#8C867D]">
            No active categories found in database.
          </div>
        )}
      </section>

      {/* 3. Featured Collection (up to 8) */}
      <section className="container-custom">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 sm:mb-8 border-b border-[#DDD6C8] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
              Masterpieces
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-medium text-[#26262B] mt-1">
              Featured Wooden Furniture
            </h2>
          </div>
          <Link href="/shop" className="text-xs sm:text-sm font-medium text-[#6B6B3A] hover:underline">
            Browse Entire Collection ({featuredProducts.length} featured) →
          </Link>
        </div>

        <ProductGrid
          products={featuredProducts}
          error={fetchError}
          emptyMessage="No featured pieces currently showcased. Explore our complete catalog below."
        />

        <div className="mt-12 text-center">
          <Link href="/shop">
            <Button size="lg" variant="outline" className="gap-2">
              Explore Full Collection
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Brand-Story Band */}
      <section className="bg-[#EFEAE0] py-16 border-y border-[#DDD6C8]">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6B3A]">
              The Artisan Ethos
            </span>
            <h2 className="font-serif text-3xl font-medium text-[#26262B]">
              True Joinery. Honest Materials.
            </h2>
            <p className="text-sm text-[#6B665E] leading-relaxed pt-2">
              Every table, chair, bed, and wardrobe in our studio is designed around the natural grain and tension of genuine Sheesham and solid Ash. Hand-finished with organic wax oils that breathe and age with dignity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-[12px] bg-[#FAF7F0] p-8 border border-[#DDD6C8] space-y-3">
              <Compass className="h-8 w-8 text-[#6B6B3A]" />
              <h3 className="font-serif text-lg font-semibold text-[#26262B]">
                Pure Solid Wood
              </h3>
              <p className="text-sm text-[#6B665E] leading-relaxed">
                100% seasoned Sheesham and solid Ash. No toxic binders, engineered fillers, or artificial plastic veneers.
              </p>
            </div>

            <div className="rounded-[12px] bg-[#FAF7F0] p-8 border border-[#DDD6C8] space-y-3">
              <Shield className="h-8 w-8 text-[#6B6B3A]" />
              <h3 className="font-serif text-lg font-semibold text-[#26262B]">
                10-Year Craft Guarantee
              </h3>
              <p className="text-sm text-[#6B665E] leading-relaxed">
                Traditional mortise-and-tenon joints engineered to expand and contract naturally through changing climates.
              </p>
            </div>

            <div className="rounded-[12px] bg-[#FAF7F0] p-8 border border-[#DDD6C8] space-y-3">
              <Clock className="h-8 w-8 text-[#6B6B3A]" />
              <h3 className="font-serif text-lg font-semibold text-[#26262B]">
                White Glove Delivery
              </h3>
              <p className="text-sm text-[#6B665E] leading-relaxed">
                Delivered and placed inside your room with assembly across Karachi, Lahore, Islamabad, and nationwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Delivery and Payment Info Strip */}
      <section className="container-custom">
        <div className="rounded-[16px] border border-[#DDD6C8] bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-[#DDD6C8]/60">
            <div className="pt-4 sm:pt-0 sm:px-4 first:pl-0 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
                Nationwide Delivery
              </span>
              <h4 className="font-serif text-base font-semibold text-[#26262B]">
                Free Over Rs 150,000
              </h4>
              <p className="text-xs text-[#6B665E] leading-relaxed">
                Flat Rs 2,500 shipping on smaller pieces. Dedicated delivery trucks handle every item with protective blankets.
              </p>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
                Payment Choices
              </span>
              <h4 className="font-serif text-base font-semibold text-[#26262B]">
                Cash on Delivery & Bank
              </h4>
              <p className="text-xs text-[#6B665E] leading-relaxed">
                Pay on arrival at your doorstep, or transfer directly via {siteConfig.bankDetails.bankName} with order reference verification.
              </p>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
                Room Placement
              </span>
              <h4 className="font-serif text-base font-semibold text-[#26262B]">
                White-Glove Setup
              </h4>
              <p className="text-xs text-[#6B665E] leading-relaxed">
                Our logistics crew carries furniture to your exact room and performs full on-site leveling and assembly.
              </p>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
                Artisan Support
              </span>
              <h4 className="font-serif text-base font-semibold text-[#26262B]">
                Direct Concierge
              </h4>
              <p className="text-xs text-[#6B665E] leading-relaxed">
                Speak directly with master joiners for custom timber sizing, fabric swatches, or order tracking queries.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
