-- Auto-assign admin role to first user and all existing users
DO $$ 
DECLARE
  user_record RECORD;
BEGIN
  -- Assign admin role to all existing profiles
  FOR user_record IN SELECT id FROM profiles
  LOOP
    INSERT INTO user_roles (user_id, role)
    VALUES (user_record.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- Update the handle_new_user function to auto-assign admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Auto-assign admin role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::app_role);
  
  RETURN NEW;
END;
$$;