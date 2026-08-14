-- ============================================================
-- Migrasi: Tabel rate limit untuk endpoint publik (/tracking, /upload)
-- Jalankan di Supabase SQL Editor.
-- ============================================================

create table if not exists rate_limits (
  id uuid primary key default uuid_generate_v4(),
  identifier text not null, -- IP address pemanggil
  endpoint text not null,   -- nama endpoint, mis. 'track' atau 'upload'
  created_at timestamptz default now()
);

create index if not exists idx_rate_limits_lookup on rate_limits (identifier, endpoint, created_at);

alter table rate_limits enable row level security;

-- Cuma boleh diakses lewat service role (dari API route pakai admin client),
-- tidak lewat anon key sama sekali.
create policy "Service role only" on rate_limits for all using (false) with check (false);

-- Bersihkan otomatis data lama (lebih dari 1 hari) supaya tabel ini
-- tidak numpuk terus. Jalankan manual sesekali, atau atur sebagai
-- scheduled function di Supabase kalau mau otomatis:
-- delete from rate_limits where created_at < now() - interval '1 day';
