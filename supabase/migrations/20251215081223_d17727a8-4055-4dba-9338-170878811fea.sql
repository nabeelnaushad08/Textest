-- Create unit_types table
CREATE TABLE public.unit_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  symbol text NOT NULL,
  conversion_to_pcs numeric NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view unit types"
ON public.unit_types FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage unit types"
ON public.unit_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default unit types
INSERT INTO public.unit_types (name, symbol, conversion_to_pcs, display_order) VALUES
('Pieces', 'pcs', 1, 0),
('Dozen', 'dozen', 12, 1),
('Half Dozen', 'half-dozen', 6, 2);

-- Create system_settings table for configurable settings
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  setting_type text DEFAULT 'string',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
('invoice_footer_text', 'Developed and Powered by ZENTHOZ', 'string', 'Footer text displayed on printed invoices'),
('invoice_validity_text', 'Invoice was created on the system and is valid without the signature and seal', 'string', 'Validity text on invoices'),
('company_name', 'TEXPRO Marketing', 'string', 'Company name for documents'),
('company_contact', 'Contact 0779484650 Naushad Zakeriya', 'string', 'Company contact information');

-- Create pending_users table for users awaiting admin approval
CREATE TABLE public.pending_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

-- Enable RLS
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view pending users"
ON public.pending_users FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage pending users"
ON public.pending_users FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow system to insert pending users
CREATE POLICY "System can insert pending users"
ON public.pending_users FOR INSERT
WITH CHECK (true);

-- Create user_page_access table for granular access control
CREATE TABLE public.user_page_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_path)
);

-- Enable RLS
ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage page access"
ON public.user_page_access FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own access"
ON public.user_page_access FOR SELECT
USING (auth.uid() = user_id);