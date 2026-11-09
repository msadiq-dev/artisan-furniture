export type UserRole = 'owner' | 'manager' | 'sales' | 'inventory' | 'accounts';
export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'bank_transfer';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'refunded';
export type InvoiceStatus = 'uploaded' | 'processing' | 'needs_review' | 'approved' | 'rejected' | 'goods_received';
export type MovementType = 'order_placed' | 'order_cancelled' | 'goods_received' | 'manual_adjustment' | 'damage' | 'return';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  cost_price?: number | null;
  stock_qty: number;
  reorder_level: number;
  color: string | null;
  material: string | null;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  category?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  default_address: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  public_token: string;
  customer_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  city: string;
  notes: string | null;
  notification_status: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Supplier {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  open_invoices_count?: number;
}

export interface PurchaseInvoice {
  id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  file_path: string;
  status: InvoiceStatus;
  extraction_json: Record<string, unknown> | null;
  review_flags: string[];
  rejection_reason: string | null;
  uploaded_by: string | null;
  verified_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  goods_received_by: string | null;
  goods_received_at: string | null;
  workflow_error: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  quantity_received: number;
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_delta: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow: string;
  event: string;
  entity_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

export interface GoodsReceiptInput {
  item_id: string;
  product_id: string;
  quantity_received: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      product_images: { Row: ProductImage; Insert: Partial<ProductImage>; Update: Partial<ProductImage> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> };
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> };
      purchase_invoices: { Row: PurchaseInvoice; Insert: Partial<PurchaseInvoice>; Update: Partial<PurchaseInvoice> };
      invoice_items: { Row: InvoiceItem; Insert: Partial<InvoiceItem>; Update: Partial<InvoiceItem> };
      stock_movements: { Row: StockMovement; Insert: Partial<StockMovement>; Update: Partial<StockMovement> };
      activity_logs: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> };
      contact_messages: { Row: ContactMessage; Insert: Partial<ContactMessage>; Update: Partial<ContactMessage> };
      workflow_runs: { Row: WorkflowRun; Insert: Partial<WorkflowRun>; Update: Partial<WorkflowRun> };
    };
    Functions: {
      create_order: {
        Args: {
          p_customer_name: string;
          p_customer_email?: string | null;
          p_customer_phone: string;
          p_delivery_address: string;
          p_city: string;
          p_notes?: string | null;
          p_payment_method: PaymentMethod;
          p_items: OrderItemInput[];
        };
        Returns: {
          order_id: string;
          order_number: string;
          public_token: string;
          total: number;
        };
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: OrderStatus;
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          new_status: OrderStatus;
        };
      };
      mark_order_payment: {
        Args: {
          p_order_id: string;
          p_payment_status: PaymentStatus;
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          new_payment_status: PaymentStatus;
        };
      };
      adjust_stock: {
        Args: {
          p_product_id: string;
          p_delta: number;
          p_movement_type: MovementType;
          p_note: string;
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          new_stock: number;
        };
      };
      verify_invoice: {
        Args: {
          p_invoice_id: string;
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          status: InvoiceStatus;
        };
      };
      review_invoice: {
        Args: {
          p_invoice_id: string;
          p_decision: 'approved' | 'rejected';
          p_reason?: string | null;
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          status: InvoiceStatus;
        };
      };
      receive_goods: {
        Args: {
          p_invoice_id: string;
          p_receipts: GoodsReceiptInput[];
          p_actor_id?: string | null;
        };
        Returns: {
          success: boolean;
          status: InvoiceStatus;
        };
      };
      log_activity: {
        Args: {
          p_actor_id?: string | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      invoice_status: InvoiceStatus;
      movement_type: MovementType;
    };
  };
};
