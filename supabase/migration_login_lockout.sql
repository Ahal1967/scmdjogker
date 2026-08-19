-- =========================================================
-- FIX: login tidak dibatasi -- siapapun bisa coba password
-- berkali-kali tanpa batas (brute-force). Jalankan ini di
-- Supabase SQL Editor.
-- =========================================================
--
-- Login sebelumnya manggil supabase.auth.signInWithPassword()
-- LANGSUNG dari browser, jadi tidak ada tempat buat "menghitung"
-- percobaan gagal -- browser bisa direfresh/dibuka mode
-- incognito kapan saja buat reset hitungan kalau dihitung di
-- sisi client. Makanya penghitungan dipindah ke tabel ini +
-- Route Handler server (app/api/auth/login/route.ts), yang
-- diakses pakai service role key jadi tidak bisa dibaca/diubah
-- langsung dari browser.
--
-- CATATAN keterbatasan (disengaja, bukan bug): hitungan dikunci
-- per ALAMAT EMAIL, bukan per IP. Untuk app internal dengan
-- segelintir akun staff ini cukup -- tapi artinya orang iseng
-- bisa "mengunci" email staff lain dengan sengaja salah password
-- berkali-kali (denial-of-service ringan ke 1 akun, bukan ke
-- seluruh sistem). Kalau nanti jumlah user publik yang login
-- membesar, pertimbangkan tambah pembatasan per-IP juga.

create table if not exists login_attempts (
  email text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS diaktifkan TANPA satu pun policy -- sengaja, supaya tabel
-- ini benar-benar tidak bisa disentuh dari anon key / authenticated
-- key manapun (termasuk lewat browser). Cuma bisa diakses lewat
-- service role key (createAdminClient()) di Route Handler.
alter table login_attempts enable row level security;
