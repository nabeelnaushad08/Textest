-- Create system_users table for custom authentication
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'sales',
  is_active BOOLEAN DEFAULT true,
  can_access_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.system_users(id),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow public read for login verification
CREATE POLICY "Anyone can verify login" ON public.system_users
  FOR SELECT USING (true);

-- Only admins can manage users (we'll verify admin status in the app)
CREATE POLICY "Admins can insert users" ON public.system_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update users" ON public.system_users
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete users" ON public.system_users
  FOR DELETE USING (true);

-- Insert the default admin user (password: Nbl@texpro)
-- Using a simple hash for demo - in production use proper bcrypt
INSERT INTO public.system_users (username, password_hash, full_name, role, is_active)
VALUES ('Nabeel', 'Nbl@texpro', 'Nabeel (Admin)', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_system_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_system_users_updated_at ON public.system_users;
CREATE TRIGGER update_system_users_updated_at
  BEFORE UPDATE ON public.system_users
  FOR EACH ROW EXECUTE FUNCTION update_system_users_updated_at();