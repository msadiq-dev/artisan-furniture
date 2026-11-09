import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, Truck, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProductGallery } from '@/components/store/ProductGallery';
import { ProductDetailActions } from '@/components/store/ProductDetailActions';
import { ProductCard } from '@/components/store/ProductCard';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import type { Product, ProductImage, Category } from '@/types/database';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSeedProductBySlug, getSeedRelatedProducts } from '@/lib/catalog-data';

interface ProductWithRelations extends Product {
  images?: ProductImage[];
  category?: Category;
}

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    if (!isSupabaseConfigured()) {
      const seedProd = getSeedProductBySlug(slug);
      if (seedProd) {
        return {
          title: `${seedProd.name} | Artisan Furniture Studio`,
          description: seedProd.description || `Handcrafted solid wood ${seedProd.name} built with precision and timeless joinery.`,
        };
      }
    } else {
      const supabase = await createClient();
      const { data: rawData } = await supabase
        .from('products')
        .select('name, description')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      const data = rawData as { name?: string; description?: string } | null;
      if (data && data.name) {
        return {
          title: `${data.name} | Artisan Furniture Studio`,
          description: data.description || `Handcrafted solid wood ${data.name} built with precision and timeless joinery.`,
        };
      }
    }
  } catch {
    const seedProd = getSeedProductBySlug(slug);
    if (seedProd) {
      return {
        title: `${seedProd.name} | Artisan Furniture Studio`,
        description: seedProd.description || `Handcrafted solid wood ${seedProd.name} built with precision and timeless joinery.`,
      };
    }
  }

  return {
    title: 'Solid Wood Furniture Piece | Artisan Furniture Studio',
    description: 'Handcrafted solid wood furniture built with precision, durability, and contemporary warmth.',
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  let rawProduct: any = null;
  let relatedProducts: Product[] = [];

  try {
    if (!isSupabaseConfigured()) {
      rawProduct = getSeedProductBySlug(slug);
      if (rawProduct) {
        relatedProducts = getSeedRelatedProducts(rawProduct.category_id, rawProduct.id);
      }
    } else {
      const supabase = await createClient();

      // 1. Fetch current product
      const result = await supabase
        .from('products')
        .select(`
          id, category_id, name, slug, description, sku, price, stock_qty, color, material, width_cm, depth_cm, height_cm, is_featured, is_active,
          category:categories(id, name, slug, sort_order, is_active),
          images:product_images(id, product_id, storage_path, alt_text, sort_order)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (result.error) {
        rawProduct = getSeedProductBySlug(slug);
        if (rawProduct) {
          relatedProducts = getSeedRelatedProducts(rawProduct.category_id, rawProduct.id);
        }
      } else {
        rawProduct = result.data;
        if (!rawProduct) {
          rawProduct = getSeedProductBySlug(slug);
        }
      }

      // 2. Fetch related products from the same category
      if (rawProduct && rawProduct.category_id && relatedProducts.length === 0) {
        const { data: relData, error: relError } = await supabase
          .from('products')
          .select(`
            id, category_id, name, slug, description, sku, price, stock_qty, color, material, width_cm, depth_cm, height_cm, is_featured, is_active,
            category:categories(name, slug),
            images:product_images(id, product_id, storage_path, alt_text, sort_order)
          `)
          .eq('category_id', rawProduct.category_id)
          .eq('is_active', true)
          .neq('id', rawProduct.id)
          .limit(4);

        if (relError || !relData || relData.length === 0) {
          relatedProducts = getSeedRelatedProducts(rawProduct.category_id, rawProduct.id);
        } else {
          relatedProducts = relData as unknown as Product[];
        }
      }
    }
  } catch {
    rawProduct = getSeedProductBySlug(slug);
    if (rawProduct) {
      relatedProducts = getSeedRelatedProducts(rawProduct.category_id, rawProduct.id);
    }
  }

  // PRD Requirement: Unknown or inactive slug shows the not-found page
  if (!rawProduct) {
    notFound();
  }

  const product = rawProduct as ProductWithRelations;
  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = product.stock_qty > 0 && product.stock_qty <= LOW_STOCK_THRESHOLD;

  return (
    <div className="container-custom py-8 md:py-10 space-y-12 md:space-y-16 pb-28 md:pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#8C867D] overflow-x-auto py-1 scrollbar-none">
        <Link href="/" className="hover:text-[#6B6B3A] transition-colors shrink-0">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-[#6B6B3A] transition-colors shrink-0">
          Catalog
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-[#6B6B3A] transition-colors shrink-0"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#26262B] font-medium truncate max-w-[200px] sm:max-w-xs shrink-0">
          {product.name}
        </span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left: Product Gallery with Thumbnails & Zoom */}
        <ProductGallery
          images={product.images}
          productName={product.name}
          sku={product.sku}
        />

        {/* Right: Product Details & Actions */}
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3 border-b border-[#DDD6C8] pb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {isOutOfStock ? (
                <Badge variant="destructive" className="uppercase tracking-wider text-xs">
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                  Low stock • Only {product.stock_qty} left
                </Badge>
              ) : (
                <Badge variant="olive" className="text-xs">
                  In Stock ({product.stock_qty} available)
                </Badge>
              )}

              {product.category && (
                <Badge variant="secondary" className="text-xs">
                  {product.category.name}
                </Badge>
              )}

              <span className="text-xs text-[#8C867D] ml-auto">
                SKU: {product.sku}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium text-[#26262B] break-words">
              {product.name}
            </h1>

            <div className="pt-2 flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#6B6B3A]">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-[#8C867D]">
                (Delivery Rs 2,500 • Free from Rs 150,000)
              </span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
                About This Piece
              </h2>
              <p className="text-sm text-[#6B665E] leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Dimensions Table */}
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-xs">
            <div className="bg-[#FAF7F0] px-4 sm:px-5 py-3 border-b border-[#DDD6C8]">
              <h2 className="font-serif text-sm font-semibold text-[#26262B]">
                Dimensions & Craft Specifications
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[#DDD6C8]/60 min-w-[280px]">
              <tbody className="divide-y divide-[#DDD6C8]/40">
                <tr>
                  <th className="px-5 py-3 font-medium text-[#8C867D] w-1/3">Dimensions (W × D × H)</th>
                  <td className="px-5 py-3 font-semibold text-[#26262B]">
                    {product.width_cm && product.depth_cm && product.height_cm ? (
                      `${product.width_cm} × ${product.depth_cm} × ${product.height_cm} cm`
                    ) : (
                      [
                        product.width_cm ? `W: ${product.width_cm} cm` : null,
                        product.depth_cm ? `D: ${product.depth_cm} cm` : null,
                        product.height_cm ? `H: ${product.height_cm} cm` : null,
                      ].filter(Boolean).join(' • ') || 'Custom handcrafted sizing'
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="px-5 py-3 font-medium text-[#8C867D]">Timber / Material</th>
                  <td className="px-5 py-3 text-[#26262B]">{product.material || 'Seasoned Hardwood'}</td>
                </tr>
                <tr>
                  <th className="px-5 py-3 font-medium text-[#8C867D]">Finish & Colour</th>
                  <td className="px-5 py-3 text-[#26262B]">{product.color || 'Natural Matte Polish'}</td>
                </tr>
                <tr>
                  <th className="px-5 py-3 font-medium text-[#8C867D]">Joinery</th>
                  <td className="px-5 py-3 text-[#26262B]">Traditional mortise-and-tenon solid wood joints</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          {/* Add to Cart Actions */}
          <ProductDetailActions product={product} />

          {/* Reassurance Badges */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#DDD6C8] text-center">
            <div className="space-y-1">
              <ShieldCheck className="h-5 w-5 text-[#6B6B3A] mx-auto" />
              <span className="block text-[11px] font-medium text-[#26262B]">
                10-Year Guarantee
              </span>
              <span className="block text-[10px] text-[#8C867D]">
                Structural joints
              </span>
            </div>
            <div className="space-y-1">
              <Truck className="h-5 w-5 text-[#6B6B3A] mx-auto" />
              <span className="block text-[11px] font-medium text-[#26262B]">
                White Glove Delivery
              </span>
              <span className="block text-[10px] text-[#8C867D]">
                Room placement
              </span>
            </div>
            <div className="space-y-1">
              <Award className="h-5 w-5 text-[#6B6B3A] mx-auto" />
              <span className="block text-[11px] font-medium text-[#26262B]">
                Solid Seasoned Wood
              </span>
              <span className="block text-[10px] text-[#8C867D]">
                No toxic veneers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Row (same category) */}
      {relatedProducts.length > 0 && (
        <section className="pt-10 border-t border-[#DDD6C8] space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
                Matching Collection
              </span>
              <h2 className="font-serif text-2xl font-medium text-[#26262B] mt-1">
                More in {product.category?.name || 'this category'}
              </h2>
            </div>
            {product.category && (
              <Link
                href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
                className="text-xs font-medium text-[#6B6B3A] hover:underline"
              >
                View all in {product.category.name} →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
