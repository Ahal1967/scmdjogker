-- =========================================================
-- FIX KEAMANAN: role pengguna & self-escalation
-- Jalankan ini di Supabase SQL Editor.
-- =========================================================
--
-- MASALAH YANG DIPERBAIKI:
-- 1. Kolom profiles.role defaultnya 'admin', dan trigger yang bikin
--    profile otomatis saat ada orang daftar akun TIDAK PERNAH nyetel
--    role-nya -- artinya SETIAP akun baru yang daftar ke web ini
--    otomatis jadi admin penuh, bukan staff biasa.
-- 2. RLS di tabel profiles ("auth.uid() = id") sebenarnya sudah benar
--    membatasi 1 user cuma bisa baca/ubah baris miliknya sendiri --
--    TAPI itu juga berarti admin tidak bisa lihat/kelola akun staf
--    lain (halaman Pengaturan > Daftar Pengguna sebenarnya cuma
--    nampilin akun kamu sendiri, cuma keliatan "benar" kalau baru ada
--    1 akun). Dan karena tidak ada pembatasan KOLOM, user mana pun
--    bisa jalanin "update profiles set role='admin' where id=<id
--    sendiri>" dari console browser dan naikin dirinya sendiri jadi
--    admin kapan saja.
--
-- YANG TIDAK diubah migrasi ini (sengaja): RLS tabel bisnis lain
-- (supplier, gudang, pesanan, produksi, dst) TETAP "siapa saja yang
-- login boleh baca/tulis" seperti sebelumnya -- karena staf memang
-- perlu akses operasional harian ke situ, dan menentukan tabel/aksi
-- mana yang sebaiknya admin-only itu keputusan bisnis (siapa boleh
-- hapus supplier, siapa boleh hapus pesanan, dll) yang belum
-- dibicarakan. Migrasi ini fokus nutup 1 celah yang paling jelas
-- salah: siapa pun bisa jadi admin dan tidak ada yang bisa kelola
-- akun user lain.

-- ---------- 1. Signup baru default jadi "staff", bukan "admin" ----------
alter table profiles alter column role set default 'staff';

-- Defense in depth: jangan cuma andalkan default kolom, insert-nya
-- juga eksplisit set role='staff' supaya jelas & tidak gampang
-- kelewat kalau kolomnya berubah lagi di masa depan.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  return new;
end;
$$ language plpgsql security definer;

-- ---------- 2. Helper "is_admin()" -- dipakai di beberapa policy di bawah ----------
-- security definer supaya query di dalamnya BYPASS RLS (kalau tidak,
-- bisa muter/gagal karena RLS tabel profiles ikut berlaku ke query
-- pengecekan ini sendiri). Ini pola standar Supabase buat helper
-- role-check, aman dipakai berulang di banyak policy.
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------- 3. Cegah user non-admin ubah role-nya sendiri (atau siapa pun) ----------
-- "auth.role() = 'service_role'" DIIZINKAN LOLOS di sini -- itu konteks
-- Route Handler /api/admin/users (pakai service role key, lihat
-- lib/supabase/admin.ts) yang SUDAH memverifikasi sendiri bahwa
-- pemanggilnya beneran admin sebelum sampai ke query ini. Tanpa izin
-- ini, fitur "Tambah Pengguna" gagal total waktu nyoba nyetel role
-- 'admin' buat akun baru, karena auth.uid() bernilai NULL di konteks
-- service role (bukan sesi user biasa) sehingga is_admin() selalu
-- false di situ.
create or replace function prevent_self_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role and not is_admin() and auth.role() <> 'service_role' then
    raise exception 'Hanya admin yang boleh mengubah role pengguna.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_self_role_escalation on profiles;
create trigger trg_prevent_self_role_escalation
  before update on profiles
  for each row execute procedure prevent_self_role_escalation();

-- ---------- 4. Admin bisa kelola SEMUA profile, user biasa cuma punya sendiri ----------
-- "drop policy if exists" buat SEMUA policy di bawah (bukan cuma yang
-- lama) -- supaya file ini aman dijalankan ulang berkali-kali tanpa
-- error "already exists" kalau sebelumnya sempat kejalanin sebagian.
drop policy if exists "Users manage own profile" on profiles;
drop policy if exists "Lihat profile sendiri" on profiles;
drop policy if exists "Ubah profile sendiri" on profiles;
drop policy if exists "Admin kelola semua profile" on profiles;

create policy "Lihat profile sendiri" on profiles
  for select using (auth.uid() = id);

create policy "Ubah profile sendiri" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Admin kelola semua profile" on profiles
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- LANGKAH MANUAL SETELAH MENJALANKAN INI (WAJIB, bukan opsional):
-- Migrasi ini TIDAK mengubah role akun yang SUDAH ADA -- cuma
-- mencegah perubahan role di masa depan tanpa izin admin. Karena bug
-- sebelumnya bikin SEMUA akun yang pernah daftar otomatis jadi admin,
-- kamu perlu cek manual satu-satu di Supabase Table Editor > profiles:
-- akun mana yang harusnya cuma "staff" (misal akun karyawan biasa),
-- ubah kolom role-nya jadi 'staff' langsung di situ. Akun kamu sendiri
-- (pemilik) boleh dibiarkan 'admin'.
-- =========================================================
