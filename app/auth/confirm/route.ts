import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Route ini TUJUAN BARU tautan email Supabase (lupa password, dll), gaya
// PKCE berbasis token_hash -- bukan app/auth/reset-password langsung.
//
// Kenapa perlu route server terpisah, bukan cukup andalkan browser client
// di app/auth/reset-password/page.tsx (seperti sebelumnya): pendekatan lama
// itu (exchangeCodeForSession lewat "?code=..." otomatis) MENGHARUSKAN
// tautan dibuka di device/browser yang SAMA dengan yang minta reset --
// PKCE menyimpan "code_verifier" rahasia di penyimpanan lokal browser saat
// resetPasswordForEmail() dipanggil, dan kalau linknya dibuka di device
// lain (kasus umum: minta reset dari laptop pas testing, buka link dari
// HP), code_verifier itu tidak ada sama sekali di HP -> verifikasi selalu
// gagal diam-diam, form ganti password tidak akan pernah muncul.
//
// verifyOtp({ token_hash, type }) di sini TIDAK punya keterbatasan itu --
// token_hash diverifikasi ke server Supabase, tidak terikat device/browser
// mana pun. Sesi hasil verifikasi disimpan lewat cookie (lihat
// lib/supabase/server.ts), jadi begitu redirect ke `next`, browser client
// di halaman reset-password langsung menemukan sesinya lewat getSession().
//
// SYARAT SUPAYA ROUTE INI KEPAKAI: template email "Reset Password" di
// Supabase dashboard (Authentication > Email Templates) harus diubah link
// nya jadi persis:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password
// Selama template masih format lama ({{ .ConfirmationURL }}), Supabase
// tetap kirim link versi lama dan route ini tidak pernah kesentuh.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/reset-password";

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  // token_hash tidak ada / type tidak dikenal / sudah kedaluwarsa -- lempar
  // balik ke halaman minta tautan baru, bukan ke reset-password kosong.
  redirect("/auth/forgot-password?error=link_invalid");
}
