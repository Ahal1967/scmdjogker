-- ============================================================
-- Perbaikan "Public Can Execute SECURITY DEFINER Function" (0028)
-- dan "Signed-In Users Can Execute SECURITY DEFINER Function" (0029)
-- di Security Advisor Supabase.
--
-- Supabase secara default memberi EXECUTE ke role PUBLIC (yang
-- otomatis diwarisi anon, authenticated, dst) untuk setiap fungsi
-- baru -- termasuk fungsi yang sebenarnya cuma dimaksudkan dipanggil
-- dari dalam (lewat trigger atau lewat policy RLS), bukan dipanggil
-- langsung dari luar via /rest/v1/rpc/<nama_fungsi>.
--
-- is_admin() dan is_staff_or_admin() TETAP harus bisa dipanggil oleh
-- role "authenticated" -- karena keduanya dipakai LANGSUNG di dalam
-- policy RLS untuk role itu (lihat migrasi RLS sebelumnya). Kalau
-- EXECUTE dicabut total dari authenticated, SEMUA policy "Staff *"
-- dan profiles yang bergantung ke fungsi ini akan gagal dengan error
-- "permission denied for function" untuk user biasa. Yang dicabut di
-- sini cuma akses publik (anon/belum login) via RPC langsung.
--
-- handle_new_user() dan rls_auto_enable() TIDAK dipakai di policy RLS
-- manapun. handle_new_user() cuma dipanggil otomatis lewat trigger
-- saat user baru daftar -- sudah saya cek ke dokumentasi Postgres:
-- eksekusi trigger jalan dengan privilege PEMILIK fungsi, BUKAN
-- privilege role yang memicu trigger-nya, jadi mencabut EXECUTE dari
-- anon/authenticated TIDAK akan merusak alur pendaftaran user baru.
-- rls_auto_enable() kedengarannya fungsi maintenance/admin yang tidak
-- perlu dipanggil siapa pun dari luar.
-- ============================================================

BEGIN;

-- is_admin() & is_staff_or_admin(): cabut dari PUBLIC (supaya anon dan
-- role manapun di masa depan tidak otomatis dapat akses), lalu
-- kembalikan eksplisit ke "authenticated" saja (dibutuhkan oleh RLS).
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

-- handle_new_user() & rls_auto_enable(): cabut total dari PUBLIC, anon,
-- dan authenticated -- tidak dibutuhkan role manapun untuk dipanggil
-- langsung dari luar.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

COMMIT;
