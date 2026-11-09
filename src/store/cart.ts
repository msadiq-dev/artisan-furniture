import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { siteConfig } from '@/lib/config';

export interface CartItem {
  product_id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  image_url?: string;
  quantity: number;
  stock_qty: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    image_url?: string;
    stock_qty: number;
  }, quantity?: number) => boolean;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const currentItems = get().items;
        const existing = currentItems.find((i) => i.product_id === product.id);
        const currentQty = existing ? existing.quantity : 0;
        const newQty = Math.min(
          currentQty + quantity,
          product.stock_qty,
          siteConfig.shipping.maxPerItemQuantity
        );

        if (newQty <= currentQty && product.stock_qty <= currentQty) {
          return false;
        }

        if (existing) {
          set({
            items: currentItems.map((item) =>
              item.product_id === product.id ? { ...item, quantity: newQty, stock_qty: product.stock_qty, price: product.price } : item
            ),
          });
        } else {
          set({
            items: [
              ...currentItems,
              {
                product_id: product.id,
                name: product.name,
                slug: product.slug,
                sku: product.sku,
                price: product.price,
                image_url: product.image_url,
                quantity: Math.max(1, newQty),
                stock_qty: product.stock_qty,
              },
            ],
          });
        }
        return true;
      },
      removeItem: (product_id) => {
        set({
          items: get().items.filter((item) => item.product_id !== product_id),
        });
      },
      updateQuantity: (product_id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(product_id);
          return;
        }
        set({
          items: get().items.map((item) => {
            if (item.product_id === product_id) {
              const bounded = Math.min(
                quantity,
                item.stock_qty,
                siteConfig.shipping.maxPerItemQuantity
              );
              return { ...item, quantity: bounded };
            }
            return item;
          }),
        });
      },
      clearCart: () => {
        set({ items: [] });
      },
      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
      getDeliveryFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        return subtotal >= siteConfig.shipping.freeDeliveryThreshold ? 0 : siteConfig.shipping.deliveryFee;
      },
      getTotal: () => {
        return get().getSubtotal() + get().getDeliveryFee();
      },
      getTotalItems: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'artisan-furniture-cart',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);
