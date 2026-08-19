-- Jalankan ini di Supabase SQL Editor.
-- Menambahkan katalog produk + resep (BOM) supaya stok bahan baku otomatis
-- berkurang saat pesanan dibuat, dan menambahkan riwayat pembayaran (dulu
-- cuma ada 1 angka "sisa_pembayaran" yang ditimpa terus, tidak ada jejak
-- per transaksi).

-- ---------- KATALOG PRODUK ----------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  nama_produk text not null unique,
  kategori text,
  harga_default numeric default 0,
  created_at timestamptz default now()
);

-- ---------- RESEP / BOM (Bill of Materials) ----------
-- Berapa banyak tiap bahan baku dipakai untuk 1 unit produk.
create table if not exists product_materials (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  raw_material_id uuid references raw_materials(id) on delete cascade,
  qty_per_unit numeric not null default 0,
  unique (product_id, raw_material_id)
);

-- Tautkan order_items ke produk katalog (nullable -- pesanan lama yang
-- masih pakai nama produk teks bebas tetap aman, kolom ini cuma dipakai
-- untuk pesanan baru yang produknya dipilih dari katalog).
alter table order_items add column if not exists product_id uuid references products(id);

-- Penanda supaya stok tidak kepotong dobel kalau baris production
-- ke-update lagi nanti.
alter table production add column if not exists stok_dipotong boolean default false;

-- Fungsi database buat kurangi stok secara atomik (hindari race condition
-- dibanding baca-lalu-tulis dari sisi aplikasi).
create or replace function decrement_stok(p_raw_material_id uuid, p_qty numeric)
returns void as $$
begin
  update raw_materials
  set stok = greatest(0, stok - p_qty)
  where id = p_raw_material_id;
end;
$$ language plpgsql;

-- ---------- RIWAYAT PEMBAYARAN ----------
-- Sebelumnya "Catat Pembayaran" cuma menimpa kolom sisa_pembayaran di
-- orders, tidak ada jejak kapan & berapa tiap transaksi. Tabel ini jadi
-- log historisnya, orders.sisa_pembayaran tetap dipakai apa adanya
-- sebagai angka sisa saat ini (tidak dihapus, cuma ditambah pelengkap).
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  jumlah numeric not null,
  catatan text,
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table products enable row level security;
alter table product_materials enable row level security;
alter table payments enable row level security;

create policy "Authenticated read/write" on products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on product_materials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
