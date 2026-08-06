-- =========================================================
-- DJOKER SABLON KAOS — Supply Chain Management System
-- Jalankan file ini di Supabase SQL Editor
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- PROFILES (terhubung ke auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'admin' check (role in ('admin','staff')),
  avatar_url text,
  created_at timestamptz default now()
);

-- ---------- SUPPLIER ----------
create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  nama_supplier text not null,
  kontak text,
  no_telepon text,
  alamat text,
  status text default 'Aktif' check (status in ('Aktif','Nonaktif')),
  created_at timestamptz default now()
);

-- ---------- GUDANG / STOK BAHAN ----------
create table if not exists raw_materials (
  id uuid primary key default uuid_generate_v4(),
  nama_bahan text not null,
  kategori text, -- Kain, Tinta, Alat, dst
  satuan text,   -- Roll, Kg, Pcs
  stok numeric default 0,
  stok_minimum numeric default 0,
  supplier_id uuid references suppliers(id),
  status text generated always as (
    case when stok <= stok_minimum then 'Kritis' else 'Aman' end
  ) stored,
  created_at timestamptz default now()
);

-- ---------- PELANGGAN ----------
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  no_telepon text,
  alamat text,
  created_at timestamptz default now()
);

-- ---------- PESANAN ----------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  no_pesanan text unique not null, -- ex: DJ00125
  customer_id uuid references customers(id),
  tanggal date default current_date,
  total numeric default 0,
  dp numeric default 0,
  sisa_pembayaran numeric default 0,
  status text default 'Pesanan' check (
    status in ('Pesanan','Produksi','QC','Packing','Dikirim','Selesai')
  ),
  alamat_pengiriman text,
  desain_url text, -- link file desain yang diupload
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  nama_produk text not null, -- ex: Kaos Hitam - L
  jumlah integer not null default 1,
  harga numeric not null default 0,
  subtotal numeric generated always as (jumlah * harga) stored
);

-- ---------- PRODUKSI ----------
create table if not exists production (
  id uuid primary key default uuid_generate_v4(),
  no_produksi text unique not null, -- ex: PRO-0025
  order_id uuid references orders(id),
  desain_url text,
  status text default 'Produksi' check (
    status in ('Produksi','Sablon','QC','Packing','Selesai')
  ),
  progress integer default 0 check (progress between 0 and 100),
  created_at timestamptz default now()
);

-- ---------- QUALITY CONTROL ----------
create table if not exists quality_control (
  id uuid primary key default uuid_generate_v4(),
  no_qc text unique not null,
  production_id uuid references production(id),
  tanggal date default current_date,
  hasil text check (hasil in ('Lolos','Perbaikan','Gagal')),
  catatan text,
  created_at timestamptz default now()
);

-- ---------- PACKING ----------
create table if not exists packing (
  id uuid primary key default uuid_generate_v4(),
  no_packing text unique not null,
  order_id uuid references orders(id),
  tanggal date default current_date,
  jumlah integer,
  status text default 'Diproses' check (status in ('Diproses','Siap Kirim')),
  created_at timestamptz default now()
);

-- ---------- PENGIRIMAN ----------
create table if not exists shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id),
  no_resi text,
  kurir text,
  tanggal_kirim date,
  status text default 'Diproses' check (
    status in ('Diproses','Dalam Proses','Dikirim','Diterima')
  ),
  created_at timestamptz default now()
);

-- ---------- TRACKING TIMELINE (untuk pelanggan) ----------
create table if not exists order_tracking (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  tahap text not null, -- Pesanan Diterima, Desain Disetujui, Produksi, QC, Packing, Pengiriman, Diterima
  waktu timestamptz default now(),
  selesai boolean default false
);

-- =========================================================
-- ROW LEVEL SECURITY
-- Sederhana: user yang sudah login (admin/staff) boleh akses semua data.
-- Sesuaikan lagi kalau kamu butuh pemisahan hak akses per role.
-- =========================================================
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table raw_materials enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table production enable row level security;
alter table quality_control enable row level security;
alter table packing enable row level security;
alter table shipments enable row level security;
alter table order_tracking enable row level security;

create policy "Authenticated read/write" on suppliers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on raw_materials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on customers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on production for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on quality_control for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on packing for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on shipments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated read/write" on order_tracking for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Users manage own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- Trigger: auto-create profile saat user daftar ----------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- Contoh data (opsional, hapus kalau tidak perlu) ----------
insert into suppliers (nama_supplier, kontak, no_telepon, alamat, status) values
('CV. Maju Jaya', 'Budi Santoso', '0812-3456-7890', 'Bandung', 'Aktif'),
('PT. Sinar Textile', 'Andi Wijaya', '0813-2233-1122', 'Jakarta', 'Aktif');
