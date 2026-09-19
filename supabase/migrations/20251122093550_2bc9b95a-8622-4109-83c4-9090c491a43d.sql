-- Add product type management and sequential numbering

-- Create product_types table for managed categories
CREATE TABLE IF NOT EXISTS public.product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on product_types
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product types"
ON public.product_types FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage product types"
ON public.product_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add index on products.category for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Create sequences table for managing order and invoice numbers
CREATE TABLE IF NOT EXISTS public.numbering_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type TEXT NOT NULL UNIQUE, -- 'order' or 'invoice'
  current_year INTEGER NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT '',
  pattern TEXT NOT NULL DEFAULT 'PREFIX-YYYY-NNNNN',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on numbering_sequences
ALTER TABLE public.numbering_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sequences"
ON public.numbering_sequences FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sequences"
ON public.numbering_sequences FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Initialize sequences for orders and invoices
INSERT INTO public.numbering_sequences (sequence_type, current_year, current_number, prefix, pattern)
VALUES 
  ('order', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0, 'ORD', 'ORD-YYYY-NNNNN'),
  ('invoice', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0, 'INV', 'INV-YYYY-NNNNN')
ON CONFLICT (sequence_type) DO NOTHING;

-- Function to generate next sequential number
CREATE OR REPLACE FUNCTION public.get_next_sequence_number(seq_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_yr INTEGER;
  next_num INTEGER;
  seq_prefix TEXT;
  seq_pattern TEXT;
  result_number TEXT;
BEGIN
  current_yr := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Lock the row for update
  SELECT current_year, current_number, prefix, pattern
  INTO current_yr, next_num, seq_prefix, seq_pattern
  FROM public.numbering_sequences
  WHERE sequence_type = seq_type
  FOR UPDATE;
  
  -- If year changed, reset counter
  IF current_yr != EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER THEN
    current_yr := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    next_num := 1;
  ELSE
    next_num := next_num + 1;
  END IF;
  
  -- Update the sequence
  UPDATE public.numbering_sequences
  SET current_number = next_num,
      current_year = current_yr,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE sequence_type = seq_type;
  
  -- Format the number according to pattern
  result_number := seq_prefix || '-' || current_yr || '-' || LPAD(next_num::TEXT, 5, '0');
  
  RETURN result_number;
END;
$$;

-- Add metadata column to invoices for alternate header
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Add historical_type tracking to audit_logs (already has old_value/new_value as JSONB)
-- Add print_settings to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS print_settings JSONB DEFAULT '{"show_status": false, "show_discounts": true, "show_converted_units": false}'::JSONB;

-- Add print_settings to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_settings JSONB DEFAULT '{"show_converted_units": true}'::JSONB;

-- Create trigger for updated_at on product_types
CREATE TRIGGER update_product_types_updated_at
BEFORE UPDATE ON public.product_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default product types (can be customized)
INSERT INTO public.product_types (name, display_order) VALUES
  ('Socks', 1),
  ('Shirts', 2),
  ('Trousers', 3),
  ('Uniforms', 4),
  ('Accessories', 5)
ON CONFLICT (name) DO NOTHING;

-- Backfill product category from existing data
UPDATE public.products
SET category = 'Uncategorized'
WHERE category IS NULL OR category = '';