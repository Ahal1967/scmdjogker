-- Jalankan ini di Supabase SQL Editor.
-- Mengizinkan role 'admin' mengelola SEMUA profil, sementara user lain tetap
-- hanya bisa mengelola profilnya sendiri.

-- Fungsi helper (SECURITY DEFINER supaya tidak infinite-recursion saat
-- policy profiles query ke tabel profiles itu sendiri).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Users manage own profile" on profiles;

create policy "Users manage own profile or admin manages all" on profiles
  for all
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());
