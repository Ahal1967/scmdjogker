-- ============================================================
-- Migrasi: Bersihkan otomatis tabel rate_limits setiap hari
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- 1. Aktifkan ekstensi pg_cron (kalau belum aktif).
--    Supabase project baru biasanya sudah tersedia, cuma perlu diaktifkan.
create extension if not exists pg_cron with schema extensions;

-- 2. Jadwalkan: tiap hari jam 03:00 (UTC), hapus baris rate_limits
--    yang lebih tua dari 1 hari.
select cron.schedule(
  'cleanup-rate-limits',           -- nama job (unik)
  '0 3 * * *',                     -- jadwal: tiap hari jam 03:00 UTC
  $$ delete from rate_limits where created_at < now() - interval '1 day'; $$
);

-- ============================================================
-- Verifikasi job sudah terjadwal:
-- select * from cron.job;
--
-- Kalau mau hapus/matikan job ini di kemudian hari:
-- select cron.unschedule('cleanup-rate-limits');
-- ============================================================
