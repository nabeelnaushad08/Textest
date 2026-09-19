// Supabase client for the TEXPRO Inventory Suite.
//
// Configuration comes from .env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
// when present, and otherwise falls back to the project's own values below.
//
// Why a fallback: Vite inlines these at build time, so the URL and publishable
// key end up in the compiled JavaScript either way — they are public by design
// and are not secrets. Hardcoding the fallback means a build still succeeds if
// .env is missing (a CI checkout, a web upload that skipped dotfiles), instead
// of producing a bundle that throws at runtime.
//
// To point the app at a different Supabase project, set the env vars — they
// always win over these defaults. Never put the service_role key here; it is a
// real secret and belongs only on a server.
//
// Import like this:
//   import { supabase } from "@/integrations/supabase/client";

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const DEFAULT_SUPABASE_URL = 'https://lfxjrzsmhtgmhgjbhpxo.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oBFRH5aJu2ql5Exl-oOWuQ_KzJEJb2x';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // This app uses its own login (public.system_users + sessionStorage, see
    // src/lib/auth.tsx) rather than Supabase Auth, so plain localStorage is all
    // the client needs here.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
