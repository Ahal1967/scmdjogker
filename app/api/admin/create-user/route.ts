import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // 1. Pastikan yang manggil route ini sudah login DAN role-nya admin.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh menambah pengguna." },
      { status: 403 }
    );
  }

  // 2. Validasi input.
  const body = await request.json().catch(() => null);
  const { email, password, full_name, role, avatar_url } = body ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }

  // 3. Buat user Supabase Auth lewat service role (server-only).
  const supabaseAdmin = createAdminClient();

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !newUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat user." },
      { status: 500 }
    );
  }

  // 4. Trigger di schema.sql (on_auth_user_created) otomatis bikin row
  //    profiles dengan full_name. Kita update role & avatar_url di sini.
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ role: role ?? "staff", avatar_url: avatar_url || null })
    .eq("id", newUser.user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "User dibuat, tapi gagal set role: " + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: newUser.user.id });
}
