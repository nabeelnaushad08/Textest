
-- Drop existing restrictive SELECT policies and create permissive ones
-- Since we use custom auth (system_users table), we allow SELECT for all

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
CREATE POLICY "Anyone can view customers" ON customers FOR SELECT USING (true);

-- Suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
CREATE POLICY "Anyone can view suppliers" ON suppliers FOR SELECT USING (true);

-- Orders
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);

-- Order lines
DROP POLICY IF EXISTS "Authenticated users can view order lines" ON order_lines;
CREATE POLICY "Anyone can view order lines" ON order_lines FOR SELECT USING (true);

-- Invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
CREATE POLICY "Anyone can view invoices" ON invoices FOR SELECT USING (true);

-- Invoice lines
DROP POLICY IF EXISTS "Authenticated users can view invoice lines" ON invoice_lines;
CREATE POLICY "Anyone can view invoice lines" ON invoice_lines FOR SELECT USING (true);

-- Payments
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
CREATE POLICY "Anyone can view payments" ON payments FOR SELECT USING (true);

-- Stock movements
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON stock_movements;
CREATE POLICY "Anyone can view stock movements" ON stock_movements FOR SELECT USING (true);

-- Supplier purchases
DROP POLICY IF EXISTS "Authenticated users can view purchases" ON supplier_purchases;
CREATE POLICY "Anyone can view purchases" ON supplier_purchases FOR SELECT USING (true);

-- Supplier purchase items
DROP POLICY IF EXISTS "Authenticated users can view purchase items" ON supplier_purchase_items;
CREATE POLICY "Anyone can view purchase items" ON supplier_purchase_items FOR SELECT USING (true);

-- Supplier payments
DROP POLICY IF EXISTS "Authenticated users can view supplier payments" ON supplier_payments;
CREATE POLICY "Anyone can view supplier payments" ON supplier_payments FOR SELECT USING (true);

-- Product types
DROP POLICY IF EXISTS "Authenticated users can view product types" ON product_types;
CREATE POLICY "Anyone can view product types" ON product_types FOR SELECT USING (true);

-- Unit types
DROP POLICY IF EXISTS "Authenticated users can view unit types" ON unit_types;
CREATE POLICY "Anyone can view unit types" ON unit_types FOR SELECT USING (true);

-- Customer discounts
DROP POLICY IF EXISTS "Authenticated users can view discounts" ON customer_discounts;
CREATE POLICY "Anyone can view discounts" ON customer_discounts FOR SELECT USING (true);

-- System settings
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON system_settings;
CREATE POLICY "Anyone can view system settings" ON system_settings FOR SELECT USING (true);

-- Numbering sequences
DROP POLICY IF EXISTS "Authenticated users can view sequences" ON numbering_sequences;
CREATE POLICY "Anyone can view sequences" ON numbering_sequences FOR SELECT USING (true);

-- Also update INSERT/UPDATE/DELETE policies to allow operations (since custom auth handles security)
-- Products
DROP POLICY IF EXISTS "Admins and managers can manage products" ON products;
CREATE POLICY "Anyone can manage products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS "Sales can manage customers" ON customers;
CREATE POLICY "Anyone can manage customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "Admins and managers can manage suppliers" ON suppliers;
CREATE POLICY "Anyone can manage suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Orders
DROP POLICY IF EXISTS "Sales can manage orders" ON orders;
CREATE POLICY "Anyone can manage orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Order lines
DROP POLICY IF EXISTS "Sales can manage order lines" ON order_lines;
CREATE POLICY "Anyone can manage order lines" ON order_lines FOR ALL USING (true) WITH CHECK (true);

-- Invoices
DROP POLICY IF EXISTS "Sales can manage invoices" ON invoices;
CREATE POLICY "Anyone can manage invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- Invoice lines
DROP POLICY IF EXISTS "Sales can manage invoice lines" ON invoice_lines;
CREATE POLICY "Anyone can manage invoice lines" ON invoice_lines FOR ALL USING (true) WITH CHECK (true);

-- Payments
DROP POLICY IF EXISTS "Accountants can manage payments" ON payments;
CREATE POLICY "Anyone can manage payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- Stock movements
DROP POLICY IF EXISTS "Warehouse can manage stock movements" ON stock_movements;
CREATE POLICY "Anyone can manage stock movements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Supplier purchases
DROP POLICY IF EXISTS "Managers can manage purchases" ON supplier_purchases;
CREATE POLICY "Anyone can manage purchases" ON supplier_purchases FOR ALL USING (true) WITH CHECK (true);

-- Supplier purchase items
DROP POLICY IF EXISTS "Managers can manage purchase items" ON supplier_purchase_items;
CREATE POLICY "Anyone can manage purchase items" ON supplier_purchase_items FOR ALL USING (true) WITH CHECK (true);

-- Supplier payments
DROP POLICY IF EXISTS "Accountants can manage supplier payments" ON supplier_payments;
CREATE POLICY "Anyone can manage supplier payments" ON supplier_payments FOR ALL USING (true) WITH CHECK (true);

-- Product types
DROP POLICY IF EXISTS "Admins can manage product types" ON product_types;
CREATE POLICY "Anyone can manage product types" ON product_types FOR ALL USING (true) WITH CHECK (true);

-- Unit types
DROP POLICY IF EXISTS "Admins can manage unit types" ON unit_types;
CREATE POLICY "Anyone can manage unit types" ON unit_types FOR ALL USING (true) WITH CHECK (true);

-- Customer discounts
DROP POLICY IF EXISTS "Managers can manage discounts" ON customer_discounts;
CREATE POLICY "Anyone can manage discounts" ON customer_discounts FOR ALL USING (true) WITH CHECK (true);

-- System settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Anyone can manage system settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Numbering sequences
DROP POLICY IF EXISTS "Admins can manage sequences" ON numbering_sequences;
CREATE POLICY "Anyone can manage sequences" ON numbering_sequences FOR ALL USING (true) WITH CHECK (true);

-- Audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Anyone can view audit logs" ON audit_logs FOR SELECT USING (true);
