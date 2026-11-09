insert into categories (name, slug, sort_order) values
('Beds','beds',1), ('Sofas','sofas',2), ('Chairs','chairs',3),
('Tables','tables',4), ('Storage','storage',5);

insert into products (category_id, name, slug, description, sku, price,
cost_price, stock_qty, reorder_level, color, material, width_cm, depth_cm,
height_cm, is_featured)
select c.id, v.name, v.slug, v.descr, v.sku, v.price, v.cost, v.stock,
v.reorder, v.color, v.material, v.w, v.d, v.h, v.feat
from (values
('beds','Oslo King Bed','oslo-king-bed','Solid sheesham frame with an upholstered headboard.','BED-001',145000,98000,6,2,'Walnut','Sheesham wood',200,215,110,true),
('beds','Lahore Queen Bed','lahore-queen-bed','Classic queen bed with hand-carved detail.','BED-002',98000,65000,8,2,'Natural','Sheesham wood',170,210,105,false),
('sofas','Milan 3-Seater Sofa','milan-3-seater-sofa','Deep seat, high-resilience foam, linen blend.','SOF-001',129000,86000,5,2,'Olive','Linen blend',220,95,85,true),
('sofas','Aria L-Shape Sofa','aria-l-shape-sofa','Reversible chaise with removable covers.','SOF-002',189000,125000,3,1,'Ivory','Cotton blend',280,170,85,true),
('chairs','Nordic Dining Chair','nordic-dining-chair','Curved back, solid legs, set of one.','CHR-001',16500,9800,24,8,'Oak','Ash wood',48,52,82,false),
('chairs','Haven Lounge Chair','haven-lounge-chair','Wide armchair for reading corners.','CHR-002',58000,37000,7,3,'Bronze','Velvet',78,82,76,true),
('tables','Atlas Dining Table 6-Seater','atlas-dining-table-6','Solid top with a matte finish.','TBL-001',89000,58000,4,2,'Walnut','Sheesham wood',180,90,76,false),
('storage','Sahara Wardrobe 3-Door','sahara-wardrobe-3-door','Soft-close doors with internal drawers.','STO-001',134000,90000,2,2,'Ivory','Engineered wood',150,60,210,false)
) as v(cat, name, slug, descr, sku, price, cost, stock, reorder, color,
material, w, d, h, feat)
join categories c on c.slug = v.cat;
