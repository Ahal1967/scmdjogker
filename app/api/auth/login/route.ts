import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/login -- proses login dipindah ke sini (dari yang
// sebelumnya langsung manggil supabase.auth.signInWithPassword() di
// browser) SUPAYA percobaan gagal bisa dihitung server-side lewat
// tabel login_attempts (lihat migration_login_lockout.sql). Kalau
// dihitung di browser, orang tinggal refresh/incognito buat reset --
// jadi tidak nahan apa-apa.
//
// login_attempts cuma bisa diakses lewat service role key (createAdminClient),
// karena RLS-nya sengaja tidak punya policy sama sekali.

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("login_attempts")
    .select("failed_count, locked_until")
    .eq("email", email)
    .maybeSingle();

  // Masih dalam masa kunci -- tolak SEBELUM sempat cek password sama
  // sekali, supaya tidak nambah beban ke Supabase Auth percuma.
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    const sisaMenit = Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenit} menit.` },
      { status: 429 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const failedCount = (attempt?.failed_count ?? 0) + 1;

    if (failedCount >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
      await admin
        .from("login_attempts")
        .upsert({ email, failed_count: failedCount, locked_until: lockedUntil, updated_at: new Date().toISOString() });
      return NextResponse.json(
        { error: `Terlalu banyak percobaan gagal. Akun dikunci sementara selama ${LOCKOUT_MINUTES} menit.` },
        { status: 429 }
      );
    }

    await admin
      .from("login_attempts")
      .upsert({ email, failed_count: failedCount, locked_until: null, updated_at: new Date().toISOString() });

    const sisaPercobaan = MAX_ATTEMPTS - failedCount;
    return NextResponse.json(
      { error: `${error.message} (${sisaPercobaan} percobaan lagi sebelum dikunci sementara)` },
      { status: 401 }
    );
  }

  // Login berhasil -- hapus jejak percobaan gagal supaya lain kali
  // mulai bersih dari 0 lagi.
  if (attempt) {
    await admin.from("login_attempts").delete().eq("email", email);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
