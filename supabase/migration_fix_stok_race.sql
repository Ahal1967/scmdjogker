-- Perbaikan untuk 2 masalah pada pemotongan stok otomatis (BOM) yang
-- ditemukan lewat audit kode langsung:
--
--   1. decrement_stok() lama pakai `greatest(0, stok - qty)` yang DIAM-DIAM
--      meng-clamp ke 0 kalau stok kurang, bukan menolak. Akibatnya RPC ini
--      selalu "berhasil" walau stok sebenarnya tidak cukup -- pesanan tetap
--      tersimpan dengan data stok yang sudah salah, tanpa ada error yang
--      bisa ditangkap PesananTable.tsx.
--   2. Tiap bahan baku dipotong lewat panggilan RPC TERPISAH (Promise.all
--      di client, satu panggilan per bahan) -- bukan satu transaksi. Kalau
--      salah satu bahan gagal di tengah jalan, bahan-bahan sebelumnya yang
--      sudah sukses dipotong TIDAK ikut di-rollback: order bisa berakhir
--      dengan sebagian bahan terpotong, sebagian tidak.
--
-- Jalankan file ini SETELAH semua migration_*.sql sebelumnya. Aman
-- dijalankan berkali-kali (semua create or replace function).

-- ---------- decrement_stok_batch: dipakai alur pemotongan otomatis ----------
-- Menerima SEMUA bahan yang perlu dipotong untuk satu pesanan sekaligus
-- (bukan satu-per-satu), lalu:
--   a. mengunci (for update) baris SETIAP bahan lebih dulu, diurutkan
--      berdasarkan id supaya kalau ada pesanan lain yang kebetulan
--      memotong bahan yang sama secara bersamaan, urutan pengambilan lock
--      selalu konsisten (mencegah deadlock antar transaksi).
--   b. memvalidasi SEMUA bahan cukup dulu sebelum memotong satu pun.
--   c. kalau ada satu saja yang tidak cukup, raise exception -- Postgres
--      otomatis me-rollback SELURUH perubahan di panggilan fungsi ini,
--      jadi tidak ada potongan stok parsial.
create or replace function decrement_stok_batch(items jsonb)
returns void as $$
declare
  item record;
  v_stok numeric;
begin
  for item in
    select
      (elem->>'raw_material_id')::uuid as raw_material_id,
      (elem->>'qty')::numeric as qty
    from jsonb_array_elements(items) as elem
    order by (elem->>'raw_material_id')::uuid
  loop
    select stok into v_stok from raw_materials where id = item.raw_material_id for update;

    if v_stok is null then
      raise exception 'Bahan baku tidak ditemukan (id: %)', item.raw_material_id;
    end if;

    if v_stok < item.qty then
      raise exception 'Stok tidak cukup untuk bahan id %: tersedia %, dibutuhkan %', item.raw_material_id, v_stok, item.qty;
    end if;
  end loop;

  for item in
    select
      (elem->>'raw_material_id')::uuid as raw_material_id,
      (elem->>'qty')::numeric as qty
    from jsonb_array_elements(items) as elem
  loop
    update raw_materials
    set stok = stok - item.qty
    where id = item.raw_material_id;
  end loop;
end;
$$ language plpgsql;

-- ---------- decrement_stok (versi 1 bahan): diperbaiki juga ----------
-- Masih dipertahankan untuk kompatibilitas kalau ada pemanggil lain, tapi
-- sekarang perilakunya konsisten dengan versi batch: menolak (raise
-- exception) kalau stok tidak cukup, tidak lagi clamp diam-diam ke 0.
create or replace function decrement_stok(p_raw_material_id uuid, p_qty numeric)
returns void as $$
declare
  v_stok numeric;
begin
  select stok into v_stok from raw_materials where id = p_raw_material_id for update;

  if v_stok is null then
    raise exception 'Bahan baku tidak ditemukan (id: %)', p_raw_material_id;
  end if;

  if v_stok < p_qty then
    raise exception 'Stok tidak cukup untuk bahan id %: tersedia %, dibutuhkan %', p_raw_material_id, v_stok, p_qty;
  end if;

  update raw_materials set stok = v_stok - p_qty where id = p_raw_material_id;
end;
$$ language plpgsql;

-- ---------- increment_stok: tidak ada bug clamp (menambah, bukan
-- mengurangi, jadi tidak bisa "kurang dari cukup"), tapi definisi ulang di
-- sini sekadar dokumentasi bahwa fungsi ini SUDAH aman dari race condition
-- secara bawaan -- satu statement UPDATE tunggal sudah atomik per baris di
-- Postgres, tidak perlu SELECT ... FOR UPDATE terpisah seperti dua fungsi
-- di atas (yang butuh baca nilainya dulu untuk validasi sebelum menulis).
create or replace function increment_stok(p_raw_material_id uuid, p_qty numeric)
returns void as $$
begin
  update raw_materials
  set stok = stok + p_qty
  where id = p_raw_material_id;
end;
$$ language plpgsql;
