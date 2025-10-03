import { createClient } from "@supabase/supabase-js";

// ✅ Vite exposes only variables that start with VITE_
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!url || !anon) {
  // Throw early with a clear message (appears in your RouteBoundary UI)
  throw new Error(
    "Supabase client init failed: VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY are required."
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
