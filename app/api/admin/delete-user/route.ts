import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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
      { error: "Hanya admin yang boleh menghapus pengguna." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const targetId = body?.id;

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  if (targetId === user.id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // Hapus dari Supabase Auth. Trigger/FK cascade di schema.sql (profiles.id
  // references auth.users(id) on delete cascade) otomatis ikut hapus row
  // profiles-nya, jadi tidak perlu delete manual dari profiles lagi.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
