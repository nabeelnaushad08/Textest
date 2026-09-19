-- Update handle_new_user function to NOT auto-assign admin role
-- Users must be approved by admin first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile only, no role assignment
  -- Admin will approve and assign role later
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Insert into pending_users for admin approval
  INSERT INTO public.pending_users (user_id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Add unique constraint on user_id in pending_users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pending_users_user_id_key'
  ) THEN
    ALTER TABLE public.pending_users ADD CONSTRAINT pending_users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Insert default unit types if not exist
INSERT INTO public.unit_types (name, symbol, conversion_to_pcs, display_order, is_active)
VALUES 
  ('Pieces', 'pcs', 1, 0, true),
  ('Dozen', 'dozen', 12, 1, true),
  ('Half Dozen', 'half-dozen', 6, 2, true),
  ('Pack of 24', '24-pack', 24, 3, true)
ON CONFLICT DO NOTHING;

-- Insert default system settings if not exist
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('invoice_footer', 'Developed and Powered by ZENTHOZ', 'string', 'Footer text displayed on printed invoices'),
  ('company_name', 'TEXPRO Marketing', 'string', 'Company name displayed on documents'),
  ('company_contact', '0779484650 Naushad Zakeriya', 'string', 'Contact information on invoices')
ON CONFLICT DO NOTHING;