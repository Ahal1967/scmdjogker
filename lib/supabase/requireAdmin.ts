import { createClient } from "@/lib/supabase/server";

// Dipakai di Route Handler manajemen user (app/api/admin/users/*) supaya
// aksi sensitif (buat/ubah/hapus akun) SELALU dicek dulu di server --
// jangan pernah percaya role yang dikirim dari client, karena request ke
// endpoint ini bisa saja langsung dari luar UI (curl/Postman), bukan cuma
// lewat tombol di halaman Pengaturan.
export async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, message: "Belum login." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { ok: false as const, status: 403, message: "Profil tidak ditemukan." };
  }

  if (profile.role !== "admin") {
    return { ok: false as const, status: 403, message: "Hanya admin yang boleh melakukan aksi ini." };
  }

  return { ok: true as const, user, profile };
}
