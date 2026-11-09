import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSeedProducts } from '@/lib/catalog-data';

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ products: [] });
    }

    if (!isSupabaseConfigured()) {
      const allSeeds = getSeedProducts();
      const matched = allSeeds.filter((p) => ids.includes(p.id));
      return NextResponse.json({ products: matched });
    }

    const supabase = await createClient();
    const { data: products, error } = await supabase
      .from('products')
      .select('id, category_id, name, slug, description, sku, price, stock_qty, color, material, width_cm, depth_cm, height_cm, is_featured, is_active')
      .in('id', ids);

    if (error) {
      const allSeeds = getSeedProducts();
      const matched = allSeeds.filter((p) => ids.includes(p.id));
      return NextResponse.json({ products: matched });
    }

    return NextResponse.json({ products: products || [] });
  } catch {
    return NextResponse.json({ products: [] });
  }
}

