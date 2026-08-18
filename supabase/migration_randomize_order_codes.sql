-- Jalankan ini di Supabase SQL Editor.
--
-- Migrasi SATU KALI: ganti no_pesanan, no_produksi, no_qc, & no_packing yang
-- masih format nomor urut lama (DJ00001, PRO-0001, QC-0001, PK-0001) jadi
-- kode acak, biar tidak bisa ditebak. no_pesanan sempat kepake lewat
-- /api/public/track (endpoint di belakang halaman "Lacak Pesanan" publik)
-- tanpa verifikasi tambahan apa pun -- nomor urut pendek gampang "discan"
-- satu-satu walau endpoint-nya sudah dibatasi rate limit. no_qc/no_packing
-- ikut dibereskan sekalian atas permintaan user walau belum ketahuan
-- ke-expose lewat endpoint publik manapun -- pola nomor urutnya sama
-- persis, jadi disamakan sebelum jadi masalah beneran. Semua record BARU
-- yang dibuat lewat halaman Pesanan/QC sudah otomatis pakai kode acak
-- (lihat generateUniqueCode di lib/generateCode.ts) -- migrasi ini cuma
-- buat beresin data LAMA yang sudah kadung ada di database.
--
-- PENTING, baca dulu sebelum run:
-- 1. Nomor-nomor LAMA yang mungkin sudah dikirim ke pelanggan (misal lewat
--    chat WA konfirmasi pesanan) akan JADI TIDAK VALID lagi setelah
--    migrasi ini -- pelanggan yang masih pegang nomor lama tidak akan
--    ketemu pesanannya lagi kalau cek di /tracking pakai nomor lama.
--    Kalau itu masalah buat kamu, JANGAN jalankan dulu.
-- 2. Cuma nomor yang MASIH format lama yang disentuh (dicek lewat pola
--    regex di WHERE-nya) -- record yang sudah dibuat lewat kode baru
--    tidak ikut ke-random ulang kalau script ini kebetulan dijalankan
--    lebih dari sekali.
-- 3. Kolom no_pesanan/no_produksi/no_qc/no_packing cuma dipakai lewat
--    order_id/production_id (uuid) di semua tabel lain -- bukan dipakai
--    sebagai kunci relasi -- jadi aman diganti tanpa merusak hubungan
--    antar tabel (order_items, order_tracking, production,
--    quality_control, packing, shipments semua tetap nyambung normal).
-- 4. Disarankan backup dulu (Supabase Dashboard -> Database -> Backups,
--    atau export tabel-tabel terkait ke CSV) sebelum run, jaga-jaga.

do $$
declare
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- tanpa 0/O/1/I/L biar tidak ketuker
  r record;
  new_code text;
  attempt int;
begin
  -- ORDERS: cuma yang masih persis format lama "DJ" + 5 digit angka
  for r in select id from orders where no_pesanan ~ '^DJ[0-9]{5}$' loop
    attempt := 0;
    loop
      new_code := 'DJ';
      for i in 1..6 loop
        new_code := new_code || substr(charset, floor(random() * length(charset))::int + 1, 1);
      end loop;
      attempt := attempt + 1;
      exit when (not exists (select 1 from orders where no_pesanan = new_code)) or attempt > 20;
    end loop;
    update orders set no_pesanan = new_code where id = r.id;
  end loop;

  -- PRODUCTION: cuma yang masih persis format lama "PRO-" + 4 digit angka
  for r in select id from production where no_produksi ~ '^PRO-[0-9]{4}$' loop
    attempt := 0;
    loop
      new_code := 'PRO-';
      for i in 1..6 loop
        new_code := new_code || substr(charset, floor(random() * length(charset))::int + 1, 1);
      end loop;
      attempt := attempt + 1;
      exit when (not exists (select 1 from production where no_produksi = new_code)) or attempt > 20;
    end loop;
    update production set no_produksi = new_code where id = r.id;
  end loop;

  -- QUALITY_CONTROL: cuma yang masih persis format lama "QC-" + 4 digit angka
  for r in select id from quality_control where no_qc ~ '^QC-[0-9]{4}$' loop
    attempt := 0;
    loop
      new_code := 'QC-';
      for i in 1..6 loop
        new_code := new_code || substr(charset, floor(random() * length(charset))::int + 1, 1);
      end loop;
      attempt := attempt + 1;
      exit when (not exists (select 1 from quality_control where no_qc = new_code)) or attempt > 20;
    end loop;
    update quality_control set no_qc = new_code where id = r.id;
  end loop;

  -- PACKING: cuma yang masih persis format lama "PK-" + 4 digit angka
  for r in select id from packing where no_packing ~ '^PK-[0-9]{4}$' loop
    attempt := 0;
    loop
      new_code := 'PK-';
      for i in 1..6 loop
        new_code := new_code || substr(charset, floor(random() * length(charset))::int + 1, 1);
      end loop;
      attempt := attempt + 1;
      exit when (not exists (select 1 from packing where no_packing = new_code)) or attempt > 20;
    end loop;
    update packing set no_packing = new_code where id = r.id;
  end loop;
end $$;

-- Cek hasil (opsional, jalankan terpisah setelah migrasi di atas selesai):
-- select no_pesanan from orders order by created_at desc limit 20;
-- select no_produksi from production order by created_at desc limit 20;
-- select no_qc from quality_control order by created_at desc limit 20;
-- select no_packing from packing order by created_at desc limit 20;
