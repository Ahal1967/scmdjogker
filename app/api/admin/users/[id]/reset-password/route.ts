import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// POST /api/admin/users/[id]/reset-password -- admin set password baru
// langsung buat user lain, TANPA lewat email sama sekali.
//
// Ini pengganti fitur "Lupa Password?" mandiri (self-service lewat email)
// yang dicabut dari halaman login -- reset lewat email butuh custom SMTP
// yang belum di-setup (Supabase mengunci template email selama masih
// pakai layanan email bawaan mereka). Untuk app internal begini (user-nya
// staf/admin sendiri, bukan pelanggan publik), admin reset manual lebih
// simpel dan tidak bergantung konfigurasi pihak ketiga.
//
// Perlu service role key (createAdminClient) karena updateUserById cuma
// ada di Supabase Admin API -- tidak bisa lewat RLS/client biasa seperti
// edit nama/role di PATCH route.ts sebelah.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(params.id, { password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
