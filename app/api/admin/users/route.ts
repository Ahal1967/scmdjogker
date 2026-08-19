import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// POST /api/admin/users -- bikin akun staf/admin baru dari halaman
// Pengaturan. Ini SATU-SATUNYA cara buat nambah user di sistem ini,
// karena tidak ada halaman signup publik (login/page.tsx cuma buat akun
// yang sudah ada). Wajib pakai service role key (createAdminClient) di
// sini karena "supabase.auth.admin.createUser" cuma bisa dipanggil pakai
// service role, dan wajib server-side (Route Handler ini) supaya key-nya
// tidak pernah nyampe browser -- lihat peringatan di lib/supabase/admin.ts.
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const body = await request.json().catch(() => null);
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "admin" ? "admin" : "staff";

  if (!full_name) {
    return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // akun internal, tidak perlu alur verifikasi email
    user_metadata: { full_name },
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat akun baru." },
      { status: 400 }
    );
  }

  // Trigger handle_new_user() otomatis bikin baris profiles dengan
  // role='staff' begitu auth.users ke-insert (lihat migrasi keamanan).
  // Kalau admin minta role 'admin', susulkan 1 update lewat client admin
  // ini juga -- trigger anti-self-escalation sengaja mengizinkan
  // perubahan role dari konteks service_role (lihat komentar di SQL-nya).
  if (role === "admin") {
    const { error: roleError } = await admin.from("profiles").update({ role: "admin" }).eq("id", created.user.id);
    if (roleError) {
      return NextResponse.json(
        {
          warning:
            "Akun berhasil dibuat tapi gagal disetel jadi admin (masih 'staff'): " + roleError.message,
          user: { id: created.user.id, email: created.user.email },
        },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ user: { id: created.user.id, email: created.user.email } }, { status: 201 });
}
