-- Jalankan ini di Supabase SQL Editor.
-- Menambahkan "Terkirim" ke daftar status valid pada tabel shipments.

alter table shipments drop constraint if exists shipments_status_check;

alter table shipments add constraint shipments_status_check
  check (status in ('Diproses','Dalam Proses','Dikirim','Terkirim','Diterima'));
