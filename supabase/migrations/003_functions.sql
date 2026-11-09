create or replace function log_activity(p_action text, p_type text, p_id
uuid, p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as $$
insert into activity_logs(actor_id, action, entity_type, entity_id,
metadata)
values (auth.uid(), p_action, p_type, p_id, p_meta)
$$;

-- 1. Customer order: validates stock, prices from the database, decrements
-- stock, all-or-nothing
create or replace function create_order(
p_full_name text, p_email text, p_phone text, p_address text, p_city text,
p_notes text,
p_payment_method payment_method, p_items jsonb
) returns table (o_id uuid, o_number text, o_token text, o_total numeric)
language plpgsql security definer set search_path = public as $$
declare
v_line record; v_prod products%rowtype;
v_customer uuid; v_order uuid; v_number text; v_token text;
v_subtotal numeric(12,2) := 0; v_fee numeric(12,2);
begin
if p_items is null or jsonb_typeof(p_items) <> 'array' or
jsonb_array_length(p_items) = 0 then
raise exception 'EMPTY_CART';
end if;
for v_line in
select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int)::int
as qty
from jsonb_array_elements(p_items) x group by 1 order by 1
loop
if v_line.qty < 1 or v_line.qty > 20 then raise exception
'INVALID_QUANTITY'; end if;
select * into v_prod from products where id = v_line.pid and is_active
for update;
if not found then raise exception 'PRODUCT_UNAVAILABLE:%', v_line.pid;
end if;
if v_prod.stock_qty < v_line.qty then raise exception
'INSUFFICIENT_STOCK:%', v_prod.name; end if;
v_subtotal := v_subtotal + v_prod.price * v_line.qty;
end loop;

v_fee := case when v_subtotal >= 150000 then 0 else 2500 end;
select id into v_customer from customers where phone = p_phone order by
created_at desc limit 1;
if v_customer is null then
insert into customers(full_name, email, phone, default_address)
values (p_full_name, p_email, p_phone, p_address) returning id into
v_customer;
else
update customers set full_name = p_full_name, email = coalesce(p_email,
email), default_address = p_address
where id = v_customer;
end if;

v_number := 'FRN-' || to_char(now() at time zone 'Asia/Karachi','YYYYMMDD')
|| '-' || lpad(nextval('order_number_seq')::text, 4, '0');

insert into orders(order_number, customer_id, payment_method, subtotal,
delivery_fee, total, delivery_address, city, notes)
values (v_number, v_customer, p_payment_method, v_subtotal, v_fee,
v_subtotal + v_fee, p_address, p_city, p_notes)
returning id, public_token into v_order, v_token;

for v_line in
select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int)::int
as qty
from jsonb_array_elements(p_items) x group by 1 order by 1
loop
select * into v_prod from products where id = v_line.pid;
insert into order_items(order_id, product_id, name_snapshot,
sku_snapshot, quantity, unit_price, line_total)
values (v_order, v_prod.id, v_prod.name, v_prod.sku, v_line.qty,
v_prod.price, v_prod.price * v_line.qty);
update products set stock_qty = stock_qty - v_line.qty where id =
v_prod.id;
insert into stock_movements(product_id, movement_type, quantity_delta,
reference_type, reference_id, note)
values (v_prod.id, 'order_placed', -v_line.qty, 'order', v_order,
v_number);
end loop;

insert into activity_logs(action, entity_type, entity_id, metadata)
values ('order.created', 'order', v_order,
jsonb_build_object('order_number', v_number, 'total', v_subtotal + v_fee));
return query select v_order, v_number, v_token, v_subtotal + v_fee;
end $$;

-- 2. Order status with allowed transitions; cancelling restores stock
create or replace function update_order_status(p_order uuid, p_status
order_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype; v_item record;
begin
if not has_role(array['owner','manager','sales']::user_role[]) then raise
exception 'FORBIDDEN'; end if;
if p_status = 'cancelled' and not
has_role(array['owner','manager']::user_role[]) then raise exception
'FORBIDDEN'; end if;
select * into v_order from orders where id = p_order for update;
if not found then raise exception 'NOT_FOUND'; end if;
if not (
(v_order.status = 'new' and p_status in ('confirmed','cancelled')) or
(v_order.status = 'confirmed' and p_status in ('preparing','cancelled'))
or
(v_order.status = 'preparing' and p_status in
('ready_for_delivery','cancelled')) or
(v_order.status = 'ready_for_delivery' and p_status in
('delivered','cancelled'))
) then raise exception 'INVALID_TRANSITION:% to %', v_order.status,
p_status; end if;
if p_status = 'cancelled' then
for v_item in select product_id, quantity from order_items where order_id
= p_order and product_id is not null loop
update products set stock_qty = stock_qty + v_item.quantity where id =
v_item.product_id;
insert into stock_movements(product_id, movement_type, quantity_delta,
reference_type, reference_id, created_by)
values (v_item.product_id, 'order_cancelled', v_item.quantity, 'order',
p_order, auth.uid());
end loop;
end if;
update orders set status = p_status where id = p_order;
perform log_activity('order.status_changed', 'order', p_order,
jsonb_build_object('from', v_order.status, 'to', p_status));
end $$;

-- 3. Payment status
create or replace function mark_order_payment(p_order uuid, p_status
payment_status)
returns void language plpgsql security definer set search_path = public as $$
begin
if not has_role(array['owner','manager','sales']::user_role[]) then raise
exception 'FORBIDDEN'; end if;
update orders set payment_status = p_status where id = p_order;
if not found then raise exception 'NOT_FOUND'; end if;
perform log_activity('order.payment_changed', 'order', p_order,
jsonb_build_object('payment_status', p_status));
end $$;

-- 4. Manual stock adjustment
create or replace function adjust_stock(p_product uuid, p_delta int, p_type
movement_type, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
if not has_role(array['owner','manager','inventory']::user_role[]) then
raise exception 'FORBIDDEN'; end if;
if p_type not in ('manual_adjustment','damage','return') then raise
exception 'INVALID_TYPE'; end if;
if p_delta = 0 then raise exception 'INVALID_DELTA'; end if;
update products set stock_qty = stock_qty + p_delta where id = p_product
returning stock_qty into v_new;
if not found then raise exception 'NOT_FOUND'; end if;
insert into stock_movements(product_id, movement_type, quantity_delta,
reference_type, note, created_by)
values (p_product, p_type, p_delta, 'manual', p_note, auth.uid());
perform log_activity('stock.adjusted', 'product', p_product,
jsonb_build_object('delta', p_delta, 'type', p_type, 'note', p_note));
return v_new;
end $$;

-- 5. Accounts staff confirm extracted fields are correct
create or replace function verify_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
if not has_role(array['owner','manager','accounts']::user_role[]) then
raise exception 'FORBIDDEN'; end if;
update purchase_invoices set verified_by = auth.uid()
where id = p_invoice and status = 'needs_review';
if not found then raise exception 'INVALID_STATUS'; end if;
perform log_activity('invoice.verified', 'invoice', p_invoice);
end $$;

-- 6. Manager approves or rejects a supplier invoice (never touches stock)
create or replace function review_invoice(p_invoice uuid, p_decision text,
p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv purchase_invoices%rowtype;
begin
if not has_role(array['owner','manager']::user_role[]) then raise exception
'FORBIDDEN'; end if;
select * into v_inv from purchase_invoices where id = p_invoice for update;
if not found then raise exception 'NOT_FOUND'; end if;
if v_inv.status <> 'needs_review' then raise exception 'INVALID_STATUS:%',
v_inv.status; end if;
if p_decision = 'approve' then
if v_inv.supplier_id is null or v_inv.invoice_number is null or
v_inv.total is null then raise exception 'INCOMPLETE_INVOICE'; end if;
if v_inv.verified_by is null then raise exception 'NOT_VERIFIED'; end if;
update purchase_invoices set status = 'approved', approved_by =
auth.uid(), approved_at = now() where id = p_invoice;
elsif p_decision = 'reject' then
if coalesce(trim(p_reason), '') = '' then raise exception
'REASON_REQUIRED'; end if;
update purchase_invoices set status = 'rejected', rejection_reason =
p_reason, approved_by = auth.uid(), approved_at = now() where id = p_invoice;
else
raise exception 'INVALID_DECISION';
end if;
perform log_activity('invoice.' || p_decision, 'invoice', p_invoice,
jsonb_build_object('reason', p_reason));
end $$;

-- 7. Inventory staff confirm goods received: the ONLY place stock increases
-- from an invoice
-- p_items example: [{"invoice_item_id":"uuid","quantity":4}]
create or replace function receive_goods(p_invoice uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv purchase_invoices%rowtype; v_row record; v_item
invoice_items%rowtype; v_open int;
begin
if not has_role(array['owner','manager','inventory']::user_role[]) then
raise exception 'FORBIDDEN'; end if;
select * into v_inv from purchase_invoices where id = p_invoice for update;
if not found then raise exception 'NOT_FOUND'; end if;
if v_inv.status <> 'approved' then raise exception 'INVALID_STATUS:%',
v_inv.status; end if;
for v_row in select (x->>'invoice_item_id')::uuid as item_id, (x-
>>'quantity')::int as qty
from jsonb_array_elements(p_items) x loop
select * into v_item from invoice_items where id = v_row.item_id and
invoice_id = p_invoice for update;
if not found then raise exception 'ITEM_NOT_ON_INVOICE'; end if;
if v_item.product_id is null then raise exception
'ITEM_NOT_MAPPED_TO_PRODUCT'; end if;
if v_row.qty < 1 or v_row.qty > (v_item.quantity -
v_item.quantity_received) then raise exception 'OVER_RECEIVED'; end if;
update invoice_items set quantity_received = quantity_received +
v_row.qty where id = v_item.id;
update products set stock_qty = stock_qty + v_row.qty where id =
v_item.product_id;
insert into stock_movements(product_id, movement_type, quantity_delta,
reference_type, reference_id, created_by)
values (v_item.product_id, 'goods_received', v_row.qty, 'invoice',
p_invoice, auth.uid());
end loop;
select count(*) into v_open from invoice_items where invoice_id = p_invoice
and quantity_received < quantity;
if v_open = 0 then
update purchase_invoices set status = 'goods_received', goods_received_by
= auth.uid(), goods_received_at = now() where id = p_invoice;
end if;
perform log_activity('invoice.goods_received', 'invoice', p_invoice,
p_items);
end $$;

-- Permissions
revoke all on function
create_order(text,text,text,text,text,text,payment_method,jsonb) from public,
anon, authenticated;
grant execute on function
create_order(text,text,text,text,text,text,payment_method,jsonb) to
service_role;

revoke all on function update_order_status(uuid, order_status),
mark_order_payment(uuid, payment_status),
adjust_stock(uuid, int, movement_type, text), verify_invoice(uuid),
review_invoice(uuid, text, text),
receive_goods(uuid, jsonb), log_activity(text, text, uuid, jsonb) from
public, anon;

grant execute on function update_order_status(uuid, order_status),
mark_order_payment(uuid, payment_status),
adjust_stock(uuid, int, movement_type, text), verify_invoice(uuid),
review_invoice(uuid, text, text),
receive_goods(uuid, jsonb) to authenticated;
