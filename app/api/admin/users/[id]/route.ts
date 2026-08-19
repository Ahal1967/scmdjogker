import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// PATCH /api/admin/users/[id] -- ubah nama/role user lain. Sengaja pakai
// client server BIASA (bukan admin/service-role) -- policy RLS "Admin
// kelola semua profile" + trigger anti-self-escalation (yang izinin admin
// asli ubah role user lain) sudah cukup buat aksi ini, jadi tidak perlu
// service role key sama sekali di sini (prinsip least privilege).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const body = await request.json().catch(() => null);
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : undefined;
  const role = body?.role === "admin" || body?.role === "staff" ? body.role : undefined;

  // Cegah admin tidak sengaja menurunkan role akun sendiri yang lagi
  // dipakai -- kalau salah klik, bisa kekunci dari fitur admin di sesi
  // yang sama sampai ada admin lain yang naikin lagi.
  if (params.id === check.user.id && role && role !== check.profile.role) {
    return NextResponse.json(
      { error: "Tidak bisa mengubah role akun sendiri yang sedang dipakai. Minta admin lain untuk ini." },
      { status: 400 }
    );
  }

  const updates: Record<string, string> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users/[id] -- hapus akun staf/admin. Perlu service
// role key karena harus hapus baris di auth.users (bukan cuma
// profiles) -- profiles.id punya "on delete cascade" ke auth.users,
// jadi hapus lewat auth.admin.deleteUser otomatis ikut bersihkan
// profilenya juga, sekali jalan dan konsisten.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  if (params.id === check.user.id) {
    return NextResponse.json(
      { error: "Tidak bisa hapus akun sendiri yang sedang dipakai." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
