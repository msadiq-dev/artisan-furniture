create or replace function public.has_role(roles user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
select coalesce((select role = any(roles) from profiles where id =
auth.uid() and is_active), false)
$$;

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table suppliers enable row level security;
alter table purchase_invoices enable row level security;
alter table invoice_items enable row level security;
alter table stock_movements enable row level security;
alter table activity_logs enable row level security;
alter table contact_messages enable row level security;
alter table workflow_runs enable row level security;

-- Hide cost data from the public
revoke select on products from anon;
grant select (id, category_id, name, slug, description, sku, price,
stock_qty, color, material,
width_cm, depth_cm, height_cm, is_featured, is_active, created_at,
updated_at) on products to anon;

-- Public catalogue
create policy cat_public_read on categories for select using (is_active);
create policy prod_public_read on products for select using (is_active);
create policy img_public_read on product_images for select using (true);

-- Staff reads
create policy cat_staff_all on categories for all to authenticated
using (has_role(array['owner','manager']::user_role[])) with check
(has_role(array['owner','manager']::user_role[]));
create policy prod_staff_read on products for select to authenticated
using (has_role(array['owner','manager','inventory']::user_role[]));
create policy prod_staff_write on products for all to authenticated
using (has_role(array['owner','manager']::user_role[])) with check
(has_role(array['owner','manager']::user_role[]));
create policy img_staff_write on product_images for all to authenticated
using (has_role(array['owner','manager']::user_role[])) with check
(has_role(array['owner','manager']::user_role[]));

create policy orders_staff_read on orders for select to authenticated
using (has_role(array['owner','manager','sales']::user_role[]));
create policy order_items_staff_read on order_items for select to
authenticated
using (has_role(array['owner','manager','sales']::user_role[]));
create policy customers_staff_read on customers for select to authenticated
using (has_role(array['owner','manager','sales']::user_role[]));

create policy suppliers_staff_all on suppliers for all to authenticated
using (has_role(array['owner','manager','accounts']::user_role[])) with
check (has_role(array['owner','manager','accounts']::user_role[]));
create policy suppliers_inventory_read on suppliers for select to
authenticated
using (has_role(array['inventory']::user_role[]));

create policy invoices_staff_read on purchase_invoices for select to
authenticated
using
(has_role(array['owner','manager','accounts','inventory']::user_role[]));
create policy invoice_items_staff_read on invoice_items for select to
authenticated
using
(has_role(array['owner','manager','accounts','inventory']::user_role[]));
create policy stock_staff_read on stock_movements for select to authenticated
using (has_role(array['owner','manager','inventory']::user_role[]));

create policy activity_read on activity_logs for select to authenticated
using (has_role(array['owner','manager']::user_role[]));
create policy workflow_read on workflow_runs for select to authenticated
using (has_role(array['owner','manager']::user_role[]));
create policy contact_read on contact_messages for select to authenticated
using (has_role(array['owner','manager','sales']::user_role[]));

create policy profiles_self on profiles for select to authenticated using (id
= auth.uid());
create policy profiles_owner_read on profiles for select to authenticated
using (has_role(array['owner']::user_role[]));

-- Storage
insert into storage.buckets (id, name, public) values
('product-images','product-images', true),
('invoices','invoices', false)
on conflict (id) do nothing;

create policy product_images_read on storage.objects for select using
(bucket_id = 'product-images');
create policy product_images_write on storage.objects for all to
authenticated
using (bucket_id = 'product-images' and
has_role(array['owner','manager']::user_role[]))
with check (bucket_id = 'product-images' and
has_role(array['owner','manager']::user_role[]));

-- No policies on the 'invoices' bucket: only the server (service role) reads
-- and writes it,
-- and staff open files through short-lived signed URLs (60 seconds).
