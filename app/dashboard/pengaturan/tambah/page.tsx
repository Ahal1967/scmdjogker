"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TambahProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    role: "staff",
    avatar_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Generate UUID baru untuk user
    const newId = crypto.randomUUID();

    const { error } = await supabase.from("profiles").insert({
      id: newId,
      full_name: formData.full_name,
      role: formData.role,
      avatar_url: formData.avatar_url || null,
    });

    if (error) {
      alert("Gagal menambah pengguna: " + error.message);
    } else {
      alert("Pengguna berhasil ditambahkan!");
      router.push("/dashboard/pengaturan");
    }

    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl">Tambah Pengguna Baru</h1>
        <p className="text-djoker-muted text-sm">
          Isi form di bawah untuk menambah pengguna baru.
        </p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Nama Lengkap</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input-field"
              placeholder="Nama lengkap pengguna"
              required
            />
          </div>

          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Role</label>
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
            <label className="text-xs text-djoker-muted mb-1.5 block">Avatar URL (Opsional)</label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="input-field"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-djoker-muted mt-1">
              Kosongkan jika tidak ada avatar.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline flex-1"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}