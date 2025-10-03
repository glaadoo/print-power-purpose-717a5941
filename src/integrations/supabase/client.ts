import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !anon) {
  throw new Error(
    "Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required (Lovable injects these automatically)."
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
