import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

export default async function PengaturanPage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400",
    staff: "bg-blue-500/15 text-blue-400",
    user: "bg-gray-500/15 text-gray-400",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl">Pengaturan</h1>
        <p className="text-djoker-muted text-sm">
          Manajemen profil pengguna dan role akses.
        </p>
      </div>

      {/* Info User Login */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Profil Anda</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-djoker-red flex items-center justify-center text-white font-bold">
            {profiles?.[0]?.full_name?.[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <p className="font-medium">{profiles?.[0]?.full_name || "Admin"}</p>
            <p className="text-xs text-djoker-muted">
              Role:{" "}
              <span className="badge bg-djoker-red">
                {profiles?.[0]?.role || "admin"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Profiles */}
      <div className="card overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Daftar Pengguna</h2>
          <Link
            href="/dashboard/pengaturan/tambah"
            className="btn-primary text-sm"
          >
            + Tambah Pengguna
          </Link>
        </div>

        <table className="table-djoker">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Lengkap</th>
              <th>Role</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((profile: Profile) => (
              <tr key={profile.id}>
                <td className="font-mono text-xs text-djoker-muted">
                  {profile.id.split("-")[0]}...
                </td>
                <td className="font-medium">{profile.full_name || "-"}</td>
                <td>
                  <span className={`badge ${ROLE_COLORS[profile.role] || "bg-gray-500/15 text-gray-400"}`}>
                    {profile.role}
                  </span>
                </td>
                <td className="text-djoker-muted">
                  {new Date(profile.created_at).toLocaleDateString("id-ID")}
                </td>
                <td>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/pengaturan/edit/${profile.id}`}
                      className="text-blue-400 text-xs hover:underline"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/pengaturan/hapus/${profile.id}`}
                      className="text-red-400 text-xs hover:underline"
                    >
                      Hapus
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center text-djoker-muted py-8">
                  Belum ada data pengguna.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}