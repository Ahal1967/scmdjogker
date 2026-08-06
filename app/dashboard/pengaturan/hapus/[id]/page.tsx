"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

export default function HapusProfilePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", params.id)
        .single();

      setProfile(data);
    }

    fetchProfile();
  }, [params.id, supabase]);

  async function handleDelete() {
    if (!confirm(`Yakin ingin menghapus pengguna ${profile?.full_name || profile?.id}?`)) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", params.id);

    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      alert("Pengguna berhasil dihapus!");
      router.push("/dashboard/pengaturan");
    }

    setLoading(false);
  }

  if (!profile) {
    return <div className="text-center py-8 text-djoker-muted">Memuat data...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl">Hapus Pengguna</h1>
        <p className="text-djoker-muted text-sm">
          Konfirmasi penghapusan pengguna.
        </p>
      </div>

      <div className="card max-w-md">
        <div className="mb-6">
          <p className="text-djoker-muted text-sm mb-2">Apakah Anda yakin ingin menghapus:</p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="font-medium text-lg">{profile.full_name || "User"}</p>
            <p className="text-sm text-djoker-muted">Role: {profile.role}</p>
            <p className="text-xs text-djoker-muted mt-1 font-mono">{profile.id}</p>
          </div>
          <p className="text-xs text-red-400 mt-3">
            ⚠️ Data yang dihapus tidak dapat dikembalikan!
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline flex-1"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}