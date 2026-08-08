-- Jalankan ini di Supabase SQL Editor.
-- Menambahkan "Sablon" ke daftar status valid pada tabel orders.

alter table orders drop constraint if exists orders_status_check;

alter table orders add constraint orders_status_check
  check (status in ('Pesanan','Produksi','Sablon','QC','Packing','Dikirim','Selesai'));
