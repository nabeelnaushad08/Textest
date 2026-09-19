CREATE TABLE public.category_price_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  size_group text,
  colour_group text,
  unit text NOT NULL DEFAULT 'dozen',
  price numeric NOT NULL DEFAULT 0,
  is_flat_rate boolean NOT NULL DEFAULT false,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_price_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_price_rules TO anon;
GRANT ALL ON public.category_price_rules TO service_role;

ALTER TABLE public.category_price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price rules are viewable by everyone"
  ON public.category_price_rules FOR SELECT USING (true);
CREATE POLICY "Price rules can be managed by everyone"
  ON public.category_price_rules FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_category_price_rules_lookup
  ON public.category_price_rules (category, customer_id, is_active);

CREATE TRIGGER update_category_price_rules_updated_at
  BEFORE UPDATE ON public.category_price_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();