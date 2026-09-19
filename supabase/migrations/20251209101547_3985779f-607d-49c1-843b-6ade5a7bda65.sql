-- Change quantity columns from integer to numeric to support decimal values (0.5, 0.25, etc.)

-- order_lines table
ALTER TABLE public.order_lines ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- invoice_lines table  
ALTER TABLE public.invoice_lines ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- supplier_purchase_items table
ALTER TABLE public.supplier_purchase_items ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

-- stock_movements table
ALTER TABLE public.stock_movements ALTER COLUMN quantity TYPE numeric USING quantity::numeric;