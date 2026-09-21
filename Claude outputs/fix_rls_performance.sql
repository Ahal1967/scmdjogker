-- ============================================================
-- Perbaikan warning "Auth RLS Initialization Plan" (auth_rls_initplan)
-- di Performance Advisor Supabase.
--
-- Prinsip perbaikan:
--   1. Policy yang cuma mengecek "apakah user sudah login"
--      (auth.role() = 'authenticated') dipindah jadi restriksi role
--      native lewat "TO authenticated" -- ini LEBIH cepat daripada
--      dibungkus (select ...), karena Postgres cek keanggotaan role
--      sekali di awal, bukan manggil fungsi sama sekali per baris.
--   2. Policy yang manggil auth.uid() atau fungsi custom
--      (is_staff_or_admin(), is_admin()) dibungkus (select ...)
--      supaya Postgres meng-cache hasilnya sekali per query
--      (initPlan), bukan mengevaluasi ulang di setiap baris.
--
-- PENTING: ALTER POLICY di bawah TIDAK mengubah siapa-boleh-akses-apa
-- -- cuma mengubah CARA Postgres mengevaluasinya. Hasil akhir izin
-- akses tetap sama persis dengan sebelumnya. Tetap disarankan jalankan
-- di jam yang tidak sibuk dan tes ulang aplikasi setelahnya.
--
-- Tabel "rate_limits" TIDAK disentuh -- qual-nya "false" (bukan
-- pemanggilan fungsi), tabel itu memang sengaja cuma bisa diakses
-- service_role yang bypass RLS, jadi tidak termasuk kategori warning
-- ini.
--
-- Dibungkus BEGIN/COMMIT di bawah supaya seluruh script ini jalan
-- sebagai SATU transaksi -- kalau ada satu baris saja yang gagal
-- (misal salah ketik nama policy), SEMUA perubahan di atasnya ikut
-- di-rollback otomatis, tidak ada tabel yang "setengah diperbaiki"
-- tanpa Anda sadari. ALTER POLICY aman dijalankan di dalam transaksi
-- (beda dengan CREATE INDEX CONCURRENTLY dll yang tidak boleh).
-- ============================================================

BEGIN;

-- customers
ALTER POLICY "Authenticated read" ON public.customers TO authenticated USING (true);
ALTER POLICY "Staff delete" ON public.customers USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.customers USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.customers WITH CHECK ((select is_staff_or_admin()));

-- order_items
ALTER POLICY "Authenticated read" ON public.order_items TO authenticated USING (true);
ALTER POLICY "Staff delete" ON public.order_items USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.order_items USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.order_items WITH CHECK ((select is_staff_or_admin()));

-- order_material_usage
ALTER POLICY "Authenticated read/write" ON public.order_material_usage TO authenticated USING (true) WITH CHECK (true);

-- order_tracking
ALTER POLICY "Authenticated read" ON public.order_tracking TO authenticated USING (true);
ALTER POLICY "Staff update" ON public.order_tracking USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.order_tracking WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff delete" ON public.order_tracking USING ((select is_staff_or_admin()));

-- orders
ALTER POLICY "Authenticated read" ON public.orders TO authenticated USING (true);
ALTER POLICY "Staff insert" ON public.orders WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff delete" ON public.orders USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.orders USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));

-- packing
ALTER POLICY "Authenticated read" ON public.packing TO authenticated USING (true);
ALTER POLICY "Staff update" ON public.packing USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.packing WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff delete" ON public.packing USING ((select is_staff_or_admin()));

-- payments
ALTER POLICY "Authenticated read/write" ON public.payments TO authenticated USING (true) WITH CHECK (true);

-- product_materials
ALTER POLICY "Authenticated read/write" ON public.product_materials TO authenticated USING (true) WITH CHECK (true);

-- production
ALTER POLICY "Authenticated read" ON public.production TO authenticated USING (true);
ALTER POLICY "Staff insert" ON public.production WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.production USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff delete" ON public.production USING ((select is_staff_or_admin()));

-- products
ALTER POLICY "Authenticated read/write" ON public.products TO authenticated USING (true) WITH CHECK (true);

-- profiles
ALTER POLICY "Users manage own profile or admin manages all" ON public.profiles
  USING (((select auth.uid()) = id) OR (select is_admin()))
  WITH CHECK (((select auth.uid()) = id) OR (select is_admin()));
ALTER POLICY "Ubah profile sendiri" ON public.profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
ALTER POLICY "Lihat profile sendiri" ON public.profiles
  USING ((select auth.uid()) = id);
ALTER POLICY "Admin kelola semua profile" ON public.profiles
  USING ((select is_admin()))
  WITH CHECK ((select is_admin()));

-- quality_control
ALTER POLICY "Authenticated read" ON public.quality_control TO authenticated USING (true);
ALTER POLICY "Staff delete" ON public.quality_control USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.quality_control USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.quality_control WITH CHECK ((select is_staff_or_admin()));

-- raw_materials
ALTER POLICY "Authenticated read" ON public.raw_materials TO authenticated USING (true);
ALTER POLICY "Staff insert" ON public.raw_materials WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff delete" ON public.raw_materials USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.raw_materials USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));

-- returns
ALTER POLICY "Authenticated read/write" ON public.returns TO authenticated USING (true) WITH CHECK (true);

-- shipments
ALTER POLICY "Authenticated read" ON public.shipments TO authenticated USING (true);
ALTER POLICY "Staff delete" ON public.shipments USING ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.shipments USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.shipments WITH CHECK ((select is_staff_or_admin()));

-- suppliers
ALTER POLICY "Authenticated read" ON public.suppliers TO authenticated USING (true);
ALTER POLICY "Staff delete" ON public.suppliers USING ((select is_staff_or_admin()));
ALTER POLICY "Staff insert" ON public.suppliers WITH CHECK ((select is_staff_or_admin()));
ALTER POLICY "Staff update" ON public.suppliers USING ((select is_staff_or_admin())) WITH CHECK ((select is_staff_or_admin()));

COMMIT;
