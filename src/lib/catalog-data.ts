import type { Category, Product } from '@/types/database';

const SEED_DATE = '2026-01-01T00:00:00.000Z';

const RAW_CATEGORIES: Omit<Category, 'created_at'>[] = [
  { id: 'cat-beds-01', name: 'Beds', slug: 'beds', sort_order: 1, is_active: true },
  { id: 'cat-sofas-02', name: 'Sofas', slug: 'sofas', sort_order: 2, is_active: true },
  { id: 'cat-chairs-03', name: 'Chairs', slug: 'chairs', sort_order: 3, is_active: true },
  { id: 'cat-tables-04', name: 'Tables', slug: 'tables', sort_order: 4, is_active: true },
  { id: 'cat-storage-05', name: 'Storage', slug: 'storage', sort_order: 5, is_active: true },
];

export const SEED_CATEGORIES: Category[] = RAW_CATEGORIES.map((c) => ({
  ...c,
  created_at: SEED_DATE,
}));

const RAW_PRODUCTS: Omit<Product, 'created_at' | 'updated_at'>[] = [
  {
    id: 'prod-001',
    category_id: 'cat-beds-01',
    name: 'Oslo King Bed',
    slug: 'oslo-king-bed',
    description: 'Solid sheesham frame with an upholstered headboard, designed for enduring comfort and architectural elegance.',
    sku: 'BED-001',
    price: 145000,
    cost_price: 98000,
    stock_qty: 6,
    reorder_level: 2,
    color: 'Walnut',
    material: 'Sheesham wood',
    width_cm: 200,
    depth_cm: 215,
    height_cm: 110,
    is_featured: true,
    is_active: true,
    category: { id: 'cat-beds-01', name: 'Beds', slug: 'beds' },
    images: [],
  },
  {
    id: 'prod-002',
    category_id: 'cat-beds-01',
    name: 'Lahore Queen Bed',
    slug: 'lahore-queen-bed',
    description: 'Classic queen bed with hand-carved detail and traditional mortise-and-tenon structural joints.',
    sku: 'BED-002',
    price: 98000,
    cost_price: 65000,
    stock_qty: 8,
    reorder_level: 2,
    color: 'Natural',
    material: 'Sheesham wood',
    width_cm: 170,
    depth_cm: 210,
    height_cm: 105,
    is_featured: false,
    is_active: true,
    category: { id: 'cat-beds-01', name: 'Beds', slug: 'beds' },
    images: [],
  },
  {
    id: 'prod-003',
    category_id: 'cat-sofas-02',
    name: 'Milan 3-Seater Sofa',
    slug: 'milan-3-seater-sofa',
    description: 'Deep seat, high-resilience foam, linen blend upholstery supported by a seasoned hardwood internal structure.',
    sku: 'SOF-001',
    price: 129000,
    cost_price: 86000,
    stock_qty: 5,
    reorder_level: 2,
    color: 'Olive',
    material: 'Linen blend',
    width_cm: 220,
    depth_cm: 95,
    height_cm: 85,
    is_featured: true,
    is_active: true,
    category: { id: 'cat-sofas-02', name: 'Sofas', slug: 'sofas' },
    images: [],
  },
  {
    id: 'prod-004',
    category_id: 'cat-sofas-02',
    name: 'Aria L-Shape Sofa',
    slug: 'aria-l-shape-sofa',
    description: 'Reversible chaise with removable covers, engineered for spacious family living and exceptional lounge comfort.',
    sku: 'SOF-002',
    price: 189000,
    cost_price: 125000,
    stock_qty: 3,
    reorder_level: 1,
    color: 'Ivory',
    material: 'Cotton blend',
    width_cm: 280,
    depth_cm: 170,
    height_cm: 85,
    is_featured: true,
    is_active: true,
    category: { id: 'cat-sofas-02', name: 'Sofas', slug: 'sofas' },
    images: [],
  },
  {
    id: 'prod-005',
    category_id: 'cat-chairs-03',
    name: 'Nordic Dining Chair',
    slug: 'nordic-dining-chair',
    description: 'Curved back, solid legs, sculpted from natural Ash wood with a protective matte wax finish.',
    sku: 'CHR-001',
    price: 16500,
    cost_price: 9800,
    stock_qty: 24,
    reorder_level: 8,
    color: 'Oak',
    material: 'Ash wood',
    width_cm: 48,
    depth_cm: 52,
    height_cm: 82,
    is_featured: false,
    is_active: true,
    category: { id: 'cat-chairs-03', name: 'Chairs', slug: 'chairs' },
    images: [],
  },
  {
    id: 'prod-006',
    category_id: 'cat-chairs-03',
    name: 'Haven Lounge Chair',
    slug: 'haven-lounge-chair',
    description: 'Wide armchair for reading corners, featuring generous ergonomic proportions and plush bronze velvet touch.',
    sku: 'CHR-002',
    price: 58000,
    cost_price: 37000,
    stock_qty: 7,
    reorder_level: 3,
    color: 'Bronze',
    material: 'Velvet',
    width_cm: 78,
    depth_cm: 82,
    height_cm: 76,
    is_featured: true,
    is_active: true,
    category: { id: 'cat-chairs-03', name: 'Chairs', slug: 'chairs' },
    images: [],
  },
  {
    id: 'prod-007',
    category_id: 'cat-tables-04',
    name: 'Atlas Dining Table 6-Seater',
    slug: 'atlas-dining-table-6',
    description: 'Solid timber top with a matte wax finish, showcasing the natural grain and live character of seasoned Sheesham.',
    sku: 'TBL-001',
    price: 89000,
    cost_price: 58000,
    stock_qty: 4,
    reorder_level: 2,
    color: 'Walnut',
    material: 'Sheesham wood',
    width_cm: 180,
    depth_cm: 90,
    height_cm: 76,
    is_featured: false,
    is_active: true,
    category: { id: 'cat-tables-04', name: 'Tables', slug: 'tables' },
    images: [],
  },
  {
    id: 'prod-008',
    category_id: 'cat-storage-05',
    name: 'Sahara Wardrobe 3-Door',
    slug: 'sahara-wardrobe-3-door',
    description: 'Soft-close doors with internal drawers and hanging rails, engineered for quiet elegance and organized storage.',
    sku: 'STO-001',
    price: 134000,
    cost_price: 90000,
    stock_qty: 2,
    reorder_level: 2,
    color: 'Ivory',
    material: 'Engineered wood',
    width_cm: 150,
    depth_cm: 60,
    height_cm: 210,
    is_featured: false,
    is_active: true,
    category: { id: 'cat-storage-05', name: 'Storage', slug: 'storage' },
    images: [],
  },
];

export const SEED_PRODUCTS: Product[] = RAW_PRODUCTS.map(
  (p) => ({ ...p, created_at: SEED_DATE, updated_at: SEED_DATE }) as Product
);

export function getSeedCategories(): Category[] {
  return SEED_CATEGORIES;
}

export function getSeedProducts(): Product[] {
  return SEED_PRODUCTS;
}

export function getSeedFeaturedProducts(): Product[] {
  return SEED_PRODUCTS.filter((p) => p.is_featured);
}

export function getSeedProductBySlug(slug: string): Product | null {
  return SEED_PRODUCTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase()) || null;
}

export function getSeedRelatedProducts(categoryId: string, excludeId: string): Product[] {
  return SEED_PRODUCTS.filter((p) => p.category_id === categoryId && p.id !== excludeId).slice(0, 4);
}