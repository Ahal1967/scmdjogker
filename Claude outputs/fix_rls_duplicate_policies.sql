-- ============================================================
-- Perbaikan warning "Multiple Permissive Policies" (0006) di
-- Performance Advisor Supabase -- 20 warning tersisa, semuanya di
-- tabel public.profiles.
--
-- Sebab: policy "Users manage own profile or admin manages all" (ALL,
-- kondisi: auth.uid() = id OR is_admin()) SUDAH mencakup persis apa
-- yang dilakukan 3 policy di bawah ini untuk semua aksi (SELECT/
-- INSERT/UPDATE/DELETE):
--   - "Ubah profile sendiri"      (UPDATE, auth.uid() = id)
--   - "Lihat profile sendiri"     (SELECT, auth.uid() = id)
--   - "Admin kelola semua profile" (ALL, is_admin())
-- Postgres tetap mengevaluasi SEMUA policy yang tumpang tindih lalu
-- meng-OR hasilnya -- walau hasil akhirnya selalu sama saja dengan
-- cuma 1 policy. Menghapus 3 policy redundan ini TIDAK mengurangi
-- akses siapa pun, karena "Users manage own profile or admin manages
-- all" sudah mencakup semuanya.
-- ============================================================

BEGIN;

DROP POLICY "Ubah profile sendiri" ON public.profiles;
DROP POLICY "Lihat profile sendiri" ON public.profiles;
DROP POLICY "Admin kelola semua profile" ON public.profiles;

COMMIT;
