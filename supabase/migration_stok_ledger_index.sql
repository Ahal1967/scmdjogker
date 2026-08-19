-- =========================================================
-- FIX: stok tidak balik saat pesanan dihapus + index database
-- Jalankan ini di Supabase SQL Editor.
-- =========================================================
--
-- MASALAH YANG DIPERBAIKI:
-- 1. Hapus pesanan yang stoknya sudah kepotong otomatis (BOM) TIDAK
--    mengembalikan stok bahan baku -- hilang permanen, tidak ada jejak.
--    decrement_stok() cuma jalan 1 arah, tidak ada lawannya.
-- 2. Kolom production.stok_dipotong (dibuat di migrasi BOM sebelumnya)
--    tidak pernah dipakai di kode manapun -- sekarang beneran dipakai.
-- 3. Tidak ada index di kolom-kolom FK yang sering di-filter/join
--    (order_id, product_id, dst) -- belum kerasa sekarang karena data
--    masih sedikit, tapi query bakal melambat seiring data bertambah.
--
-- PENDEKATAN: bukan "hitung ulang dari resep saat ini lalu balikin",
-- karena kalau resep produk berubah SETELAH pesanan dibuat, hitung ulang
-- itu bisa salah. Sebagai gantinya, dicatat PERSIS berapa banyak tiap
-- bahan yang dipotong untuk pesanan itu (order_material_usage), jadi
-- pembalikannya akurat apa pun yang terjadi ke resepnya belakangan.

-- ---------- 1. Ledger pemakaian bahan per pesanan ----------
create table if not exists order_material_usage (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  raw_material_id uuid references raw_materials(id) on delete set null,
  qty numeric not null,
  created_at timestamptz default now()
);

alter table order_material_usage enable row level security;
drop policy if exists "Authenticated read/write" on order_material_usage;
create policy "Authenticated read/write" on order_material_usage for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- 2. Fungsi kebalikan decrement_stok ----------
create or replace function increment_stok(p_raw_material_id uuid, p_qty numeric)
returns void as $$
begin
  update raw_materials
  set stok = stok + p_qty
  where id = p_raw_material_id;
end;
$$ language plpgsql;

-- ---------- 3. Index buat kolom FK yang sering di-filter/join ----------
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_product_id on order_items(product_id);
create index if not exists idx_production_order_id on production(order_id);
create index if not exists idx_quality_control_production_id on quality_control(production_id);
create index if not exists idx_packing_order_id on packing(order_id);
create index if not exists idx_shipments_order_id on shipments(order_id);
create index if not exists idx_order_tracking_order_id on order_tracking(order_id);
create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_raw_materials_supplier_id on raw_materials(supplier_id);
create index if not exists idx_product_materials_raw_material_id on product_materials(raw_material_id);
create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_order_material_usage_order_id on order_material_usage(order_id);
create index if not exists idx_order_material_usage_raw_material_id on order_material_usage(raw_material_id);

-- =========================================================
-- CATATAN: pesanan yang SUDAH ADA sebelum migrasi ini dijalankan tidak
-- akan punya baris di order_material_usage (kode aplikasi baru mulai
-- mencatat ke tabel ini sejak sekarang) -- kalau pesanan lama itu
-- dihapus nanti, sistem tidak tahu berapa yang harus dibalikin (karena
-- memang tidak ada catatannya), jadi tidak ada stok yang dibalikin
-- untuk pesanan lama. Ini cuma berlaku sekali di masa transisi, bukan
-- bug yang berulang.
-- =========================================================
