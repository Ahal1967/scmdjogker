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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: myProfile }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const ROLE_COLORS: Record<string, string> = {
    admin: "text-blue-600",
    staff: "text-blue-600",
    user: "text-gray-600 dark:text-gray-400",
  };

  function formatRoleBadge(role: string) {
    const base = "badge";
    const color = ROLE_COLORS[role] ?? "text-gray-600 dark:text-gray-400";
    return `${base} ${color}`;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 dark:text-blue-300">MANAJEMEN AKUN</span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manajemen profil pengguna dan role akses.
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900 p-6"
        style={{
          background: "#eff6ff",
          boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 12px 32px -8px rgba(37,99,235,0.18)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60" />

        <div className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
              }}
            >
              {myProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-display text-lg font-bold text-black">
                {myProfile?.full_name || "Administrator"}
              </p>
              <p className="text-xs text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={formatRoleBadge(myProfile?.role || "admin")}>
              {myProfile?.role || "admin"}
            </span>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white/60 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
            >
              Edit Profil Saya
            </Link>
          </div>
        </div>

        {myProfile?.created_at && (
          <p className="relative z-10 mt-4 text-xs text-gray-500 border-t border-blue-100 pt-3">
            Bergabung sejak{" "}
            {new Date(myProfile.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-black dark:text-white">Daftar Pengguna</h2>
          <Link href="/dashboard/pengaturan/tambah" className="btn-primary text-sm">
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
                  <td className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {profile.id.split("-")[0]}...
                  </td>
                  <td className="font-medium text-black dark:text-white">{profile.full_name || "-"}</td>
                  <td>
                    <span className={formatRoleBadge(profile.role)}>{profile.role}</span>
                  </td>
                  <td className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(profile.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <Link
                        href={`/dashboard/pengaturan/edit/${profile.id}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/pengaturan/hapus/${profile.id}`}
                        className="text-red-600 hover:text-red-700 dark:text-red-300 hover:underline"
                      >
                        Hapus
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400 py-6 md:py-8">
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
