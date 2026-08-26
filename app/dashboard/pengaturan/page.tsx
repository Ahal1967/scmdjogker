import { createClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";
import PengaturanTable from "./PengaturanTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function PengaturanPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profiles, error: profilesError },
    { data: myProfile, error: myProfileError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profilesError) console.error("Pengaturan profiles fetch error:", profilesError.message);
  if (myProfileError) console.error("Pengaturan myProfile fetch error:", myProfileError.message);
  const fetchErrorMsg = [profilesError?.message, myProfileError?.message].filter(Boolean).join("; ") || null;

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    staff: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    user: "bg-gray-100 text-gray-600 dark:bg-[#21262d] dark:text-gray-400",
  };

  function formatRoleBadge(role: string) {
    const base = "badge";
    const color = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:bg-[#21262d] dark:text-gray-400";
    return `${base} ${color}`;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Manajemen Akun"
        icon={Settings}
        title="Pengaturan"
        subtitle="Manajemen profil pengguna dan role akses."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

      <div
        className="relative overflow-hidden rounded-2xl p-6 bg-white/55 dark:bg-[#161b22]/55 backdrop-blur-xl"
        style={{ boxShadow: "0 4px 16px rgba(30,58,138,0.1)" }}
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
          </div>
        </div>

        <p className="relative z-10 mt-3 text-xs text-gray-500 dark:text-gray-400">
          Mau ganti nama sendiri? Klik ikon pensil di baris nama kamu pada daftar di bawah.
        </p>

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
        <PengaturanTable
          initialProfiles={profiles ?? []}
          currentUserId={user?.id ?? ""}
          isAdmin={myProfile?.role === "admin"}
        />
      </div>
    </div>
  );
}
