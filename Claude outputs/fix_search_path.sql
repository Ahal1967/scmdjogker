-- ============================================================
-- Perbaikan "Function Search Path Mutable" (0011) di Security
-- Advisor -- 6 fungsi.
--
-- CREATE OR REPLACE FUNCTION tidak mereset hak akses (GRANT/REVOKE)
-- yang sudah dipasang sebelumnya, jadi perbaikan search_path ini aman
-- dijalankan setelah file fix_security_function_access.sql -- tidak
-- perlu mengulang REVOKE/GRANT.
--
-- Yang diubah di tiap fungsi HANYA:
--   1. Ditambah "SET search_path = ''" -- mencegah fungsi salah baca
--      objek dari schema lain kalau ada yang bikin objek "jebakan"
--      dengan nama sama di schema lain.
--   2. Semua referensi tabel/fungsi yang sebelumnya tidak lengkap
--      (raw_materials, profiles, is_admin()) ditulis lengkap jadi
--      public.raw_materials / public.profiles / public.is_admin() --
--      WAJIB, karena begitu search_path kosong, Postgres tidak lagi
--      otomatis mencari ke schema public. auth.uid()/auth.role() TIDAK
--      perlu diubah, sudah lengkap sejak awal (schema "auth").
-- Logika/isi fungsi (perhitungan, pesan error, dst) TIDAK ada yang
-- diubah sama sekali.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.decrement_stok(p_raw_material_id uuid, p_qty numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
declare
  v_stok numeric;
begin
  select stok into v_stok from public.raw_materials where id = p_raw_material_id for update;

  if v_stok is null then
    raise exception 'Bahan baku tidak ditemukan (id: %)', p_raw_material_id;
  end if;

  if v_stok < p_qty then
    raise exception 'Stok tidak cukup untuk bahan id %: tersedia %, dibutuhkan %', p_raw_material_id, v_stok, p_qty;
  end if;

  update public.raw_materials set stok = v_stok - p_qty where id = p_raw_material_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_stok_batch(items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
    select stok into v_stok from public.raw_materials where id = item.raw_material_id for update;

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
    update public.raw_materials
    set stok = stok - item.qty
    where id = item.raw_material_id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_stok(p_raw_material_id uuid, p_qty numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
begin
  update public.raw_materials
  set stok = stok + p_qty
  where id = p_raw_material_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
begin
  if new.role is distinct from old.role and not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Hanya admin yang boleh mengubah role pengguna.';
  end if;
  return new;
end;
$function$;

COMMIT;
