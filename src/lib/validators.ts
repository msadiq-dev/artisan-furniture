import { z } from 'zod';

export const orderCustomerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
});

export const orderDeliverySchema = z.object({
  address: z.string().min(5, 'Delivery address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  notes: z.string().optional().default(''),
});

export const orderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Max 20 units per item'),
});

export const createOrderSchema = z.object({
  customer: orderCustomerSchema,
  delivery: orderDeliverySchema,
  payment_method: z.enum(['cash_on_delivery', 'bank_transfer']),
  items: z.array(orderItemSchema).min(1, 'Cart cannot be empty'),
  website: z.string().optional().default(''), // Honeypot
});

export const contactSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().default(''),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  website: z.string().optional().default(''), // Honeypot
});

export const adjustStockSchema = z.object({
  product_id: z.string().uuid(),
  delta: z.number().int().refine((val) => val !== 0, 'Adjustment delta cannot be 0'),
  type: z.enum(['manual_adjustment', 'damage', 'return']),
  note: z.string().min(3, 'A clear note is required for stock adjustments'),
});

export const reviewInvoiceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save_fields'),
    supplier_id: z.string().uuid().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    invoice_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    currency: z.string().default('PKR'),
    subtotal: z.number().nullable().optional(),
    tax: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    items: z.array(
      z.object({
        product_id: z.string().uuid().nullable().optional(),
        description: z.string(),
        quantity: z.number().positive(),
        unit_cost: z.number().nonnegative(),
        line_total: z.number().nonnegative(),
      })
    ).optional(),
  }),
  z.object({
    action: z.literal('verify'),
  }),
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().min(3, 'Rejection reason is required'),
  }),
]);

export const receiveGoodsSchema = z.object({
  items: z.array(
    z.object({
      invoice_item_id: z.string().uuid(),
      quantity: z.number().int().positive('Quantity must be greater than 0'),
    })
  ).min(1, 'At least one item must be received'),
});

export const productCreateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. oslo-king-bed)'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  category_id: z.string().uuid('Please select a category').nullable().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost price must be 0 or greater').nullable().optional(),
  stock_qty: z.coerce.number().int().min(0, 'Initial stock must be 0 or greater').default(0),
  reorder_level: z.coerce.number().int().min(0, 'Reorder level must be 0 or greater').default(5),
  width_cm: z.coerce.number().positive('Width must be positive').nullable().optional(),
  depth_cm: z.coerce.number().positive('Depth must be positive').nullable().optional(),
  height_cm: z.coerce.number().positive('Height must be positive').nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const productUpdateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  category_id: z.string().uuid('Please select a category').nullable().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost price must be 0 or greater').nullable().optional(),
  reorder_level: z.coerce.number().int().min(0, 'Reorder level must be 0 or greater').default(5),
  width_cm: z.coerce.number().positive('Width must be positive').nullable().optional(),
  depth_cm: z.coerce.number().positive('Depth must be positive').nullable().optional(),
  height_cm: z.coerce.number().positive('Height must be positive').nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const supplierSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  contact_name: z.string().nullable().optional(),
  email: z.string().email('Invalid email address').nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

