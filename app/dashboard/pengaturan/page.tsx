import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Pencil, Trash2, Plus } from "lucide-react";

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
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    staff: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    user: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };

  function formatRoleBadge(role: string) {
    const base = "badge";
    const color = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
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
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-100/70 to-blue-200/50 dark:from-blue-900/20 dark:to-blue-800/10"
        style={{
          boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 12px 32px -8px rgba(37,99,235,0.18)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-200/30 dark:bg-blue-900/20 blur-3xl" />
        </div>

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
              <p className="font-display text-lg font-bold text-black dark:text-white">
                {myProfile?.full_name || "Administrator"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={formatRoleBadge(myProfile?.role || "admin")}>
              {myProfile?.role || "admin"}
            </span>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white/60 dark:bg-blue-900/20 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-white dark:hover:bg-blue-900/40 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
            >
              Edit Profil Saya
            </Link>
          </div>
        </div>

        {myProfile?.created_at && (
          <p className="relative z-10 mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-blue-100 dark:border-blue-900 pt-3">
            Bergabung sejak{" "}
            {new Date(myProfile.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="mb-0 flex items-center justify-between p-5 pb-4">
          <h2 className="text-base font-semibold text-black dark:text-white">Daftar Pengguna</h2>
          <Link
            href="/dashboard/pengaturan/tambah"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={15} />
            Tambah Pengguna
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
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
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <User size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
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
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/dashboard/pengaturan/edit/${profile.id}`}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <Link
                        href={`/dashboard/pengaturan/hapus/${profile.id}`}
                        title="Hapus"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-6 md:py-8">
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
