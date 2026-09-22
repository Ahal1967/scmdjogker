import { createClient } from "@/lib/supabase/server";
import { Settings, Users2, ShieldCheck, User } from "lucide-react";
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

  // Ringkasan role -- modul ini sebelumnya satu-satunya halaman daftar/tabel
  // yang tidak punya baris kartu statistik sama sekali (Gudang/Produksi/
  // Retur/Pelanggan/Pesanan/QC/Supplier/Pengiriman/Produk semua sudah
  // punya). Dihitung dari "profiles" yang sudah di-fetch di atas, tidak
  // nambah query baru.
  const allProfiles = profiles ?? [];
  const totalPengguna = allProfiles.length;
  const adminCount = allProfiles.filter((p) => p.role === "admin").length;
  const staffCount = allProfiles.filter((p) => p.role === "staff").length;

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    staff: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    user: "bg-gray-100 text-gray-600 dark:bg-[#21262d] dark:text-gray-400",
  };

  function formatRoleBadge(role: string) {
    // "capitalize" ditambahkan atas permintaan user -- badge role di kartu
    // profil atas ini (halaman "Manajemen Akun") sebelumnya nampilin
    // "admin"/"staff" apa adanya (huruf kecil semua) karena nilainya di
    // database memang lowercase. Cuma text-transform CSS, jadi nilai role
    // yang dikirim ke isAdmin={myProfile?.role === "admin"} di bawah tetap
    // lowercase, tidak ikut berubah.
    const base = "badge capitalize";
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#94a3b8,#64748b)" }}>
            <Users2 size={15} />
          </div>
          <p className="dash-kpi-label">Total Pengguna</p>
          <p className="dash-kpi-value">{totalPengguna}</p>
          <p className="dash-kpi-hint">Akun terdaftar</p>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
            <ShieldCheck size={15} />
          </div>
          <p className="dash-kpi-label">Admin</p>
          <p className="dash-kpi-value">{adminCount}</p>
          <p className="dash-kpi-hint">Akses penuh</p>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
            <User size={15} />
          </div>
          <p className="dash-kpi-label">Staff</p>
          <p className="dash-kpi-value">{staffCount}</p>
          <p className="dash-kpi-hint">Akses terbatas</p>
        </div>
      </div>

      {/* Sebelumnya kartu "kaca" custom (backdrop-blur-xl + blob dekoratif
          blur-3xl di pojok) -- efek itu ditulis manual terpisah dari class
          ".card" yang sudah dipakai di seluruh app, dan blob-nya murni
          hiasan tanpa fungsi. Diganti flat atas permintaan user, senada
          sama 3 kartu KPI di atas (border tipis + shadow ringan, bukan
          blur). Ukuran juga dipadatkan (p-6->p-4, avatar 56px->44px) atas
          permintaan user supaya kartunya tidak kelihatan besar. Semua
          konten (nama, email, badge role, hint ganti nama, tanggal
          bergabung) TIDAK berubah sama sekali. */}
      <div
        className="rounded-2xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] p-4"
        style={{ boxShadow: "0 2px 10px -6px rgba(30,58,138,0.12)" }}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            >
              {myProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="font-display text-sm font-bold text-black dark:text-white">
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

        <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
          Mau ganti nama sendiri? Klik ikon pensil di baris nama kamu pada daftar di bawah.
        </p>

        {myProfile?.created_at && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-[#30363d] pt-2.5">
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
