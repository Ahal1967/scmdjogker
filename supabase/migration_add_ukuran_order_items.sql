-- Jalankan ini di Supabase SQL Editor.
-- Menambahkan kolom "ukuran" (S/M/L/XL/dst) sebagai kolom tersendiri pada
-- order_items -- sebelumnya ukuran cuma ditulis manual nempel di nama_produk
-- (ex: "Kaos Hitam - L"), sekarang jadi kolom terpisah supaya lebih rapi
-- dan bisa difilter/dilaporkan terpisah dari nama produk.

alter table order_items add column if not exists ukuran text;
