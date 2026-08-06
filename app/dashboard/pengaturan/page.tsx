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
    admin: "text-blue-600",
    staff: "text-blue-600",
    user: "text-gray-600",
  };

  function formatRoleBadge(role: string) {
    const base = "badge";
    const color = ROLE_COLORS[role] ?? "text-gray-600";
    return `${base} ${color}`;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manajemen profil pengguna dan role akses.
        </p>
      </div>

      {/* Info User Login */}
      <div className="card">
        <h2 className="mb-3 text-base font-semibold text-black md:text-lg">Profil Anda</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            {profiles?.[0]?.full_name?.[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <p className="font-medium text-black">
              {profiles?.[0]?.full_name || "Admin"}
            </p>
            <p className="text-xs text-gray-600">
              Role:{" "}
              <span className={formatRoleBadge(profiles?.[0]?.role || "admin")}>
                {profiles?.[0]?.role || "admin"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Profiles */}
      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-black md:text-lg">Daftar Pengguna</h2>
          <Link
            href="/dashboard/pengaturan/tambah"
            className="btn-primary text-sm"
          >
            + Tambah Pengguna
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Lengkap</th>
                <th>Role</th>
                <th>Dibuat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((profile: Profile) => (
                <tr key={profile.id}>
                  <td className="font-mono text-xs text-gray-500">
                    {profile.id.split("-")[0]}...
                  </td>
                  <td className="font-medium text-black">{profile.full_name || "-"}</td>
                  <td>
                    <span className={formatRoleBadge(profile.role)}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">
                    {new Date(profile.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <Link
                        href={`/dashboard/pengaturan/edit/${profile.id}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/pengaturan/hapus/${profile.id}`}
                        className="text-red-600 hover:text-red-700 hover:underline"
                      >
                        Hapus
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-6 md:py-8">
                    Belum ada data pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}