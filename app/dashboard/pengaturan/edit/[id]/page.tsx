"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
};

export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Profile>({
    id: "",
    full_name: "",
    role: "staff",
    avatar_url: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setFetching(false);
        return;
      }

      setFormData(data);
      setFetching(false);
    }

    fetchProfile();
  }, [params.id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        role: formData.role,
        avatar_url: formData.avatar_url || null,
      })
      .eq("id", params.id);

    if (error) {
      setErrorMsg("Gagal update profil: " + error.message);
      setLoading(false);
    } else {
      router.push("/dashboard/pengaturan");
    }
  }

  if (fetching) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</div>;
  }

  if (notFound) {
    return (
      <div className="card max-w-md mx-auto text-center py-8" style={{ border: "none" }}>
        <p className="text-gray-600 dark:text-gray-400">Data pengguna tidak ditemukan.</p>
        <button onClick={() => router.push("/dashboard/pengaturan")} className="btn-outline mt-4">
          Kembali ke Pengaturan
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black dark:text-white">Edit Profil</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Update data pengguna {formData.id.split("-")[0]}...
        </p>
      </div>

      <div className="card max-w-2xl" style={{ border: "none" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">ID User</label>
            <input
              type="text"
              value={formData.id}
              disabled
              className="input-field bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID tidak dapat diubah.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Nama Lengkap</label>
            <input
              type="text"
              value={formData.full_name ?? ""}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input-field"
              placeholder="Nama lengkap"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field"
            >
              <option value="admin">Admin (Full Access)</option>
              <option value="staff">Staff (Limited Access)</option>
              <option value="user">User (Basic Access)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Avatar URL (Opsional)</label>
            <input
              type="url"
              value={formData.avatar_url ?? ""}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="input-field"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => router.back()} className="btn-outline flex-1">
              Batal
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Menyimpan..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
