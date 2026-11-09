create extension if not exists pgcrypto;

-- Enums (same values used by the UI and n8n)
create type user_role as enum
('owner','manager','sales','inventory','accounts');
create type order_status as enum
('new','confirmed','preparing','ready_for_delivery','delivered','cancelled');
create type payment_method as enum ('cash_on_delivery','bank_transfer');
create type payment_status as enum
('unpaid','pending_verification','paid','refunded');
create type invoice_status as enum
('uploaded','processing','needs_review','approved','rejected','goods_received');
create type movement_type as enum
('order_placed','order_cancelled','goods_received','manual_adjustment','damage','return');

create or replace function set_updated_at() returns trigger language plpgsql
as $$
begin new.updated_at = now(); return new; end $$;

create table profiles (
id uuid primary key references auth.users(id) on delete cascade,
full_name text not null,
role user_role not null default 'sales',
is_active boolean not null default true,
created_at timestamptz not null default now()
);

create table categories (
id uuid primary key default gen_random_uuid(),
name text not null,
slug text not null unique,
sort_order int not null default 0,
is_active boolean not null default true,
created_at timestamptz not null default now()
);

create table products (
id uuid primary key default gen_random_uuid(),
category_id uuid references categories(id) on delete set null,
name text not null,
slug text not null unique,
description text,
sku text not null unique,
price numeric(12,2) not null check (price >= 0),
cost_price numeric(12,2) check (cost_price >= 0),
stock_qty int not null default 0 check (stock_qty >= 0),
reorder_level int not null default 5 check (reorder_level >= 0),
color text, material text,
width_cm numeric(6,1), depth_cm numeric(6,1), height_cm numeric(6,1),
is_featured boolean not null default false,
is_active boolean not null default true,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create trigger products_updated before update on products for each row
execute function set_updated_at();
create index products_category_idx on products(category_id);
create index products_active_idx on products(is_active, is_featured);

create table product_images (
id uuid primary key default gen_random_uuid(),
product_id uuid not null references products(id) on delete cascade,
storage_path text not null,
alt_text text not null default '',
sort_order int not null default 0
);
create index product_images_product_idx on product_images(product_id, sort_order);

create table customers (
id uuid primary key default gen_random_uuid(),
full_name text not null,
email text,
phone text not null,
default_address text,
created_at timestamptz not null default now()
);
create index customers_phone_idx on customers(phone);

create sequence order_number_seq;

create table orders (
id uuid primary key default gen_random_uuid(),
order_number text not null unique,
public_token text not null unique default encode(gen_random_bytes(16),'hex'),
customer_id uuid not null references customers(id),
status order_status not null default 'new',
payment_method payment_method not null,
payment_status payment_status not null default 'unpaid',
subtotal numeric(12,2) not null,
delivery_fee numeric(12,2) not null default 0,
total numeric(12,2) not null,
delivery_address text not null,
city text not null,
notes text,
notification_status text not null default 'pending',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);
create trigger orders_updated before update on orders for each row execute function set_updated_at();
create index orders_status_idx on orders(status, created_at desc);
create index orders_customer_idx on orders(customer_id);

create table order_items (
id uuid primary key default gen_random_uuid(),
order_id uuid not null references orders(id) on delete cascade,
product_id uuid references products(id) on delete set null,
name_snapshot text not null,
sku_snapshot text not null,
quantity int not null check (quantity > 0),
unit_price numeric(12,2) not null,
line_total numeric(12,2) not null
);
create index order_items_order_idx on order_items(order_id);

create table suppliers (
id uuid primary key default gen_random_uuid(),
business_name text not null,
contact_name text, email text, phone text, address text, tax_id text, notes text,
is_active boolean not null default true,
created_at timestamptz not null default now()
);

create table purchase_invoices (
id uuid primary key default gen_random_uuid(),
supplier_id uuid references suppliers(id),
invoice_number text,
invoice_date date, due_date date,
currency text not null default 'PKR',
subtotal numeric(12,2), tax numeric(12,2), total numeric(12,2),
file_path text not null,
status invoice_status not null default 'uploaded',
extraction_json jsonb,
review_flags text[] not null default '{}',
rejection_reason text,
uploaded_by uuid references profiles(id),
verified_by uuid references profiles(id),
approved_by uuid references profiles(id), approved_at timestamptz,
goods_received_by uuid references profiles(id), goods_received_at timestamptz,
workflow_error text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);
create trigger invoices_updated before update on purchase_invoices for each row execute function set_updated_at();
create index invoices_status_idx on purchase_invoices(status, created_at desc);
create index invoices_dup_idx on purchase_invoices(supplier_id, invoice_number);

create table invoice_items (
id uuid primary key default gen_random_uuid(),
invoice_id uuid not null references purchase_invoices(id) on delete cascade,
product_id uuid references products(id),
description text not null,
quantity numeric(12,2) not null check (quantity > 0),
unit_cost numeric(12,2) not null,
line_total numeric(12,2) not null,
quantity_received int not null default 0
);
create index invoice_items_invoice_idx on invoice_items(invoice_id);

create table stock_movements (
id uuid primary key default gen_random_uuid(),
product_id uuid not null references products(id),
movement_type movement_type not null,
quantity_delta int not null check (quantity_delta <> 0),
reference_type text, reference_id uuid, note text,
created_by uuid references profiles(id),
created_at timestamptz not null default now()
);
create index stock_movements_product_idx on stock_movements(product_id, created_at desc);

create table activity_logs (
id uuid primary key default gen_random_uuid(),
actor_id uuid references profiles(id),
action text not null,
entity_type text not null,
entity_id uuid,
metadata jsonb not null default '{}',
created_at timestamptz not null default now()
);
create index activity_entity_idx on activity_logs(entity_type, entity_id);

create table contact_messages (
id uuid primary key default gen_random_uuid(),
full_name text not null, email text not null, phone text,
message text not null,
status text not null default 'new',
created_at timestamptz not null default now()
);

create table workflow_runs (
id uuid primary key default gen_random_uuid(),
workflow text not null,
event text not null,
entity_id uuid,
status text not null default 'started',
error text,
created_at timestamptz not null default now(),
unique (workflow, event, entity_id)
);
