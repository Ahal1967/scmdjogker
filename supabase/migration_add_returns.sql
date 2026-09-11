-- Jalankan ini di Supabase SQL Editor.
-- Menambahkan modul Retur (MVP, sesuai permintaan user) -- pencatatan
-- pengajuan retur produk oleh admin/staf atas nama pelanggan (telepon/WA/
-- datang langsung -- BUKAN form publik yang bisa diisi pelanggan sendiri,
-- beda dari halaman /tracking yang memang publik), terkait ke satu
-- Pesanan dan OPSIONAL ke satu baris item tertentu di dalamnya (null =
-- retur untuk seluruh pesanan, terisi = cuma 1 baris produk/ukuran
-- tertentu yang bermasalah). TIDAK ada proses refund otomatis maupun
-- alur approval berjenjang -- cuma pencatatan + ubah status, sesuai
-- cakupan MVP yang diminta.

-- ---------- RETUR ----------
create table if not exists returns (
  id uuid primary key default uuid_generate_v4(),
  no_retur text unique not null, -- ex: RTN-A3F9K2 -- pola sama seperti no_pesanan/no_produksi/no_qc/no_packing, lihat generateUniqueCode di lib/generateCode.ts
  order_id uuid references orders(id) on delete cascade not null,
  -- on delete set null (bukan cascade) -- kalau baris item aslinya kehapus
  -- (mis. pesanan diedit ulang), catatan returnya TETAP ADA demi jejak
  -- audit, cuma tautan ke item spesifiknya yang lepas (jadi otomatis
  -- terbaca sebagai "retur seluruh pesanan").
  order_item_id uuid references order_items(id) on delete set null,
  -- Kategori sederhana (bukan teks bebas polos) supaya bisa direkap/
  -- difilter nanti, senada pola quality_control.hasil (kategori) +
  -- quality_control.catatan (teks bebas pelengkap) di bawah.
  alasan text not null check (
    alasan in ('Produk Cacat','Ukuran Tidak Sesuai','Salah Kirim','Warna/Desain Tidak Sesuai','Lainnya')
  ),
  catatan text, -- detail bebas dari pelanggan/admin, melengkapi kategori alasan di atas
  jumlah integer, -- opsional -- jumlah unit yang diretur, nullable karena tidak wajib diisi kalau retur untuk seluruh pesanan
  tanggal date default current_date,
  -- Konvensi nama status MENGIKUTI pola status 1-kata yang sudah dipakai
  -- di modul lain (Diproses sudah dipakai persis sama di shipments &
  -- packing, Selesai di orders/production) -- BUKAN pola pipeline
  -- multi-tahap seperti orders.status, karena retur bukan proses
  -- bertahap, cuma "masuk -> lagi ditangani -> beres/ditolak". Ditolak
  -- dipisah dari Selesai (bukan digabung "Selesai/Ditolak") supaya tetap
  -- konsisten dengan pola constraint 1-nilai-1-status di semua tabel lain
  -- di schema ini.
  status text default 'Diajukan' check (
    status in ('Diajukan','Diproses','Selesai','Ditolak')
  ),
  created_at timestamptz default now()
);

alter table returns enable row level security;

create policy "Authenticated read/write" on returns for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
