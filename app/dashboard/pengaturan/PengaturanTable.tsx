"use client";

import { useState } from "react";
import {
  User,
  Pencil,
  Trash2,
  Fingerprint,
  IdCard,
  ShieldCheck,
  Calendar,
  MoreHorizontal,
  Plus,
  Loader2,
} from "lucide-react";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  staff: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  user: "bg-gray-100 text-gray-600 dark:bg-[#171717] dark:text-gray-400",
};

function formatRoleBadge(role: string) {
  const color = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:bg-[#171717] dark:text-gray-400";
  return `badge ${color}`;
}

/* Ditarik keluar jadi client component terpisah dari page.tsx (yang server
   component, fetch data langsung lewat await) karena header sortable +
   modal tambah/edit/hapus perlu state + onClick di browser -- server
   component tidak bisa punya useState.

   Tambah/Edit/Hapus di sini SENGAJA lewat Route Handler
   (app/api/admin/users) bukan langsung panggil Supabase client seperti
   tabel lain (Produk/Gudang/dll) -- bikin & hapus akun user perlu
   Supabase Admin API (service role key), yang cuma boleh jalan di
   server, tidak boleh di browser. Edit nama/role tetap bisa lewat RLS
   biasa (lihat Route Handler-nya), tapi disatukan lewat API yang sama
   di sini biar pengecekan "apakah yang minta ini beneran admin" cuma
   ada di 1 tempat (server), bukan diulang-ulang di tiap tombol. */
export default function PengaturanTable({
  initialProfiles,
  currentUserId,
  isAdmin,
}: {
  initialProfiles: Profile[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();

  type SortField = "id" | "full_name" | "role" | "created_at";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = sortField
    ? [...profiles].sort((a, b) => compareValues(a[sortField] ?? "", b[sortField] ?? "", sortDir))
    : profiles;

  // ---------- Tambah Pengguna ----------
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", email: "", password: "", role: "staff" });
  const [savingAdd, setSavingAdd] = useState(false);

  function openAdd() {
    setAddForm({ full_name: "", email: "", password: "", role: "staff" });
    setShowAddModal(true);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingAdd(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast("Gagal menambah pengguna: " + (result?.error ?? "tidak diketahui"));
      setSavingAdd(false);
      return;
    }
    if (result?.warning) {
      showToast(result.warning);
    } else {
      showToast(`Akun "${addForm.full_name}" berhasil dibuat.`);
    }

    setProfiles((prev) => [
      {
        id: result.user.id,
        full_name: addForm.full_name,
        role: result?.warning ? "staff" : addForm.role,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowAddModal(false);
    setSavingAdd(false);
  }

  // ---------- Edit Pengguna ----------
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "staff" });
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(profile: Profile) {
    setEditingProfile(profile);
    setEditForm({ full_name: profile.full_name ?? "", role: profile.role });
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProfile) return;
    setSavingEdit(true);

    const isSelf = editingProfile.id === currentUserId;
    const payload: Record<string, string> = { full_name: editForm.full_name };
    // Role cuma dikirim kalau admin lagi edit AKUN ORANG LAIN -- edit
    // role diri sendiri sengaja diblok di server juga (lihat Route
    // Handler), ini cuma jaga supaya request-nya bersih.
    if (isAdmin && !isSelf) payload.role = editForm.role;

    const res = await fetch(`/api/admin/users/${editingProfile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast("Gagal menyimpan perubahan: " + (result?.error ?? "tidak diketahui"));
      setSavingEdit(false);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === editingProfile.id
          ? { ...p, full_name: payload.full_name, role: (payload.role as string) ?? p.role }
          : p
      )
    );
    showToast("Perubahan disimpan.");
    setEditingProfile(null);
    setSavingEdit(false);
  }

  // ---------- Hapus Pengguna ----------
  async function handleDelete(profile: Profile) {
    const ok = await confirm({
      message: `Akun "${profile.full_name ?? profile.id}" akan dihapus permanen beserta akses loginnya. Tidak bisa dibatalkan.`,
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/admin/users/${profile.id}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast("Gagal menghapus akun: " + (result?.error ?? "tidak diketahui"));
      return;
    }

    setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    showToast("Akun berhasil dihapus.");
  }

  return (
    <div>
      <div className="flex flex-col gap-3 p-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-black dark:text-white">Daftar Pengguna</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={15} />
            Tambah Pengguna
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table-djoker w-full">
          <thead>
            <tr>
              <TableIconCell icon={User} />
              <SortableTh label="ID" icon={Fingerprint} active={sortField === "id"} direction={sortDir} onClick={() => toggleSort("id")} center />
              <SortableTh label="Nama Lengkap" icon={IdCard} active={sortField === "full_name"} direction={sortDir} onClick={() => toggleSort("full_name")} center />
              <SortableTh label="Role" icon={ShieldCheck} active={sortField === "role"} direction={sortDir} onClick={() => toggleSort("role")} center />
              <SortableTh label="Dibuat" icon={Calendar} active={sortField === "created_at"} direction={sortDir} onClick={() => toggleSort("created_at")} center />
              <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
            </tr>
          </thead>
          <tbody>
            {sorted.map((profile, idx) => (
              <tr key={profile.id}>
                <td>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#171717]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {idx + 1}
                  </span>
                </td>
                <td className="font-mono text-xs text-gray-500 dark:text-gray-400 text-center">
                  {profile.id.split("-")[0]}...
                </td>
                <td className="font-medium text-black dark:text-white text-center">
                  {profile.full_name || "-"}
                  {profile.id === currentUserId && (
                    <span className="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-gray-500">(kamu)</span>
                  )}
                </td>
                <td className="text-center">
                  <span className={formatRoleBadge(profile.role)}>{profile.role}</span>
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {new Date(profile.created_at).toLocaleDateString("id-ID")}
                </td>
                <td className="td-center">
                  <div className="flex justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(profile)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {isAdmin && profile.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleDelete(profile)}
                        title="Hapus"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-6 md:py-8">
                  Belum ada data pengguna.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto" style={{ border: "none" }}>
            <h2 className="font-display text-base font-semibold text-black dark:text-white">Tambah Pengguna</h2>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Akun langsung aktif & bisa login begitu disimpan (tidak perlu verifikasi email). Kasih tahu email &
              password ini ke orangnya langsung.
            </p>
            <form onSubmit={handleAdd} className="mt-4 space-y-3">
              <input
                required
                autoFocus
                placeholder="Nama Lengkap"
                value={addForm.full_name}
                onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                className="input-field w-full"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                className="input-field w-full"
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="Password awal (minimal 6 karakter)"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                className="input-field w-full"
              />
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                className="input-field w-full"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {savingAdd && <Loader2 size={15} className="animate-spin" />}
                  {savingAdd ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto" style={{ border: "none" }}>
            <h2 className="font-display text-base font-semibold text-black dark:text-white">
              {editingProfile.id === currentUserId ? "Edit Profil Saya" : "Edit Pengguna"}
            </h2>
            <form onSubmit={handleEdit} className="mt-4 space-y-3">
              <input
                required
                autoFocus
                placeholder="Nama Lengkap"
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                className="input-field w-full"
              />
              {isAdmin && editingProfile.id !== currentUserId ? (
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Role: <span className={formatRoleBadge(editingProfile.role)}>{editingProfile.role}</span> -- role
                  akun sendiri tidak bisa diubah dari sini, minta admin lain kalau perlu.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProfile(null)} className="btn-outline flex-1">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {savingEdit && <Loader2 size={15} className="animate-spin" />}
                  {savingEdit ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
