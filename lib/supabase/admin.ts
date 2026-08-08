import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// PERINGATAN: file ini HANYA boleh diimport di kode server (Route Handler,
// Server Component, Server Action). JANGAN PERNAH import ini di file
// "use client" — service role key akan bocor ke browser kalau itu terjadi.
//
// Service role key membypass semua RLS. Simpan di environment variable
// SUPABASE_SERVICE_ROLE_KEY (TANPA prefix NEXT_PUBLIC_) di .env.local dan
// di Vercel/Netlify project settings.

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
