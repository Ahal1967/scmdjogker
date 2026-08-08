-- Jalankan ini di Supabase SQL Editor.
-- Membuat bucket storage untuk file desain yang diupload pelanggan.

insert into storage.buckets (id, name, public)
values ('desain-kaos', 'desain-kaos', true)
on conflict (id) do nothing;

-- Tidak perlu policy storage tambahan untuk anon, karena upload dilakukan
-- lewat API route server-side (service role) yang membypass RLS storage.
-- Bucket di-set public supaya file yang sudah diupload bisa ditampilkan
-- langsung lewat URL publik (untuk preview di halaman admin/QC).
