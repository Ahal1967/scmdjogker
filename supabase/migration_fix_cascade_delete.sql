-- ============================================================
-- Migrasi: Perbaikan ON DELETE CASCADE yang kelewat di schema awal
-- Jalankan di Supabase SQL Editor.
--
-- MASALAH: Tabel production, quality_control, packing, shipments
-- referensi ke orders(id) / production(id) TANPA "on delete cascade",
-- jadi pesanan lama tidak bisa dihapus selama masih ada data produksi,
-- QC, packing, atau pengiriman yang nempel ke pesanan itu.
--
-- PERBAIKAN: drop constraint lama, buat ulang dengan "on delete cascade".
-- Setelah ini, hapus 1 pesanan otomatis ikut menghapus SEMUA data terkait
-- (produksi, QC, packing, pengiriman, item, riwayat tracking).
-- ============================================================

-- production.order_id -> orders(id)
alter table production drop constraint if exists production_order_id_fkey;
alter table production
  add constraint production_order_id_fkey
  foreign key (order_id) references orders(id) on delete cascade;

-- quality_control.production_id -> production(id)
alter table quality_control drop constraint if exists quality_control_production_id_fkey;
alter table quality_control
  add constraint quality_control_production_id_fkey
  foreign key (production_id) references production(id) on delete cascade;

-- packing.order_id -> orders(id)
alter table packing drop constraint if exists packing_order_id_fkey;
alter table packing
  add constraint packing_order_id_fkey
  foreign key (order_id) references orders(id) on delete cascade;

-- shipments.order_id -> orders(id)
alter table shipments drop constraint if exists shipments_order_id_fkey;
alter table shipments
  add constraint shipments_order_id_fkey
  foreign key (order_id) references orders(id) on delete cascade;

-- ============================================================
-- Verifikasi (jalankan terpisah setelah migrasi di atas sukses):
-- select conname, confdeltype from pg_constraint
-- where conname in (
--   'production_order_id_fkey', 'quality_control_production_id_fkey',
--   'packing_order_id_fkey', 'shipments_order_id_fkey'
-- );
--
-- confdeltype harusnya 'c' (cascade) untuk semua baris di atas,
-- bukan 'a' (no action / default lama).
-- ============================================================
