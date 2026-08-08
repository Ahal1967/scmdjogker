"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TambahProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "staff",
    avatar_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(result?.error ?? "Gagal menambah pengguna.");
      return;
    }

    alert("Pengguna berhasil ditambahkan!");
    router.push("/dashboard/pengaturan");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black dark:text-white">Tambah Pengguna Baru</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Akun login baru akan langsung dibuat lewat Supabase Auth.
        </p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="email@djoker.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Nama Lengkap</label>
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
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="input-field"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kosongkan jika tidak ada avatar.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => router.back()} className="btn-outline flex-1">
              Batal
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
