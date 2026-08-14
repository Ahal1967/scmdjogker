-- ============================================================
-- Migrasi: Perbaikan Row Level Security (RLS) berbasis role
-- Jalankan di Supabase SQL Editor.
--
-- MASALAH SEBELUMNYA: semua tabel operasional cuma dicek
-- "auth.role() = 'authenticated'" -- artinya SEMUA akun yang
-- login (termasuk role 'user' paling rendah) bisa baca DAN
-- ubah/hapus SEMUA data lewat API Supabase langsung.
--
-- PERBAIKAN: pisahkan baca (SELECT) vs tulis (INSERT/UPDATE/DELETE).
-- - SELECT: tetap boleh semua yang sudah login (admin/staff/user)
-- - INSERT/UPDATE/DELETE: HANYA role admin atau staff
-- ============================================================

-- 1. Fungsi helper: cek apakah user yang login role-nya admin/staff.
--    SECURITY DEFINER supaya tidak kena masalah infinite-recursion
--    saat policy query balik ke tabel profiles.
create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- 2. Terapkan ke semua tabel operasional: hapus policy lama yang
--    longgar, ganti dengan 4 policy terpisah (select/insert/update/delete).

do $$
declare
  tbl text;
  tables text[] := array[
    'suppliers', 'raw_materials', 'customers', 'orders',
    'order_items', 'production', 'quality_control',
    'packing', 'shipments', 'order_tracking'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists "Authenticated read/write" on %I', tbl);

    execute format(
      'create policy "Authenticated read" on %I for select using (auth.role() = ''authenticated'')',
      tbl
    );
    execute format(
      'create policy "Staff insert" on %I for insert with check (public.is_staff_or_admin())',
      tbl
    );
    execute format(
      'create policy "Staff update" on %I for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin())',
      tbl
    );
    execute format(
      'create policy "Staff delete" on %I for delete using (public.is_staff_or_admin())',
      tbl
    );
  end loop;
end $$;

-- ============================================================
-- Verifikasi (jalankan terpisah setelah migrasi di atas sukses):
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' order by tablename, cmd;
--
-- Harusnya tiap tabel operasional punya 4 baris (select/insert/update/delete),
-- bukan 1 baris "for all" seperti sebelumnya.
-- ============================================================
