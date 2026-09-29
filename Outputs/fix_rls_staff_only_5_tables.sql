-- ============================================================
-- Perbaikan "RLS Policy Always True" (0024) di Security Advisor.
-- Sesuai keputusan Anda: 5 tabel ini dibatasi hanya boleh diakses
-- (baca & tulis) oleh staff/admin, sama seperti pola tabel lain di
-- schema ini -- bukan lagi "siapa saja yang login boleh apa saja".
--
-- Catatan: handle_new_user() memberi role default 'staff' ke SETIAP
-- user baru yang daftar, jadi kemungkinan besar semua akun yang ada
-- sekarang memang sudah staff/admin -- perubahan ini kemungkinan
-- besar tidak mengubah apa pun untuk user yang sudah ada, lebih ke
-- menutup celah untuk role lain di masa depan.
-- ============================================================

BEGIN;

ALTER POLICY "Authenticated read/write" ON public.order_material_usage
  TO authenticated
  USING ((select is_staff_or_admin()))
  WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Authenticated read/write" ON public.order_material_usage
  RENAME TO "Staff read/write";

ALTER POLICY "Authenticated read/write" ON public.payments
  TO authenticated
  USING ((select is_staff_or_admin()))
  WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Authenticated read/write" ON public.payments
  RENAME TO "Staff read/write";

ALTER POLICY "Authenticated read/write" ON public.product_materials
  TO authenticated
  USING ((select is_staff_or_admin()))
  WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Authenticated read/write" ON public.product_materials
  RENAME TO "Staff read/write";

ALTER POLICY "Authenticated read/write" ON public.products
  TO authenticated
  USING ((select is_staff_or_admin()))
  WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Authenticated read/write" ON public.products
  RENAME TO "Staff read/write";

ALTER POLICY "Authenticated read/write" ON public.returns
  TO authenticated
  USING ((select is_staff_or_admin()))
  WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Authenticated read/write" ON public.returns
  RENAME TO "Staff read/write";

COMMIT;
