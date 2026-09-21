-- ============================================================
-- Koreksi dari fix_security_function_access.sql sebelumnya.
--
-- Fix pertama mencabut EXECUTE dari role PUBLIC, dengan asumsi anon
-- mewarisi aksesnya dari situ -- ternyata salah. Supabase memberi
-- anon & authenticated EXECUTE secara LANGSUNG (grant terpisah) lewat
-- ALTER DEFAULT PRIVILEGES saat fungsi dibuat, bukan lewat PUBLIC.
-- Revoke dari PUBLIC jadi tidak berpengaruh ke anon sama sekali.
--
-- Perbaikan ini target anon SECARA LANGSUNG. authenticated TETAP
-- dipertahankan -- dipakai aktif oleh policy RLS "Staff *" dan
-- profiles (lihat migrasi RLS sebelumnya), mencabutnya akan
-- merusak semua itu.
-- ============================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM anon;

COMMIT;
