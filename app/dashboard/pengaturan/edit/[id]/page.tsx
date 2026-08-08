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
        alert("Data tidak ditemukan");
        router.push("/dashboard/pengaturan");
        return;
      }

      setFormData(data);
      setFetching(false);
    }

    fetchProfile();
  }, [params.id, router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      alert("Gagal update profil: " + error.message);
    } else {
      alert("Profil berhasil diupdate!");
      router.push("/dashboard/pengaturan");
    }

    setLoading(false);
  }

  if (fetching) {
    return <div className="text-center py-8 text-gray-500">Memuat data...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-black">Edit Profil</h1>
        <p className="text-gray-600 text-sm">
          Update data pengguna {formData.id.split("-")[0]}...
        </p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">ID User</label>
            <input
              type="text"
              value={formData.id}
              disabled
              className="input-field bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">ID tidak dapat diubah.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nama Lengkap</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Role</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Avatar URL (Opsional)</label>
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
