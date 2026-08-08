"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profile) {
      setName(profile.full_name ?? "");
      setOriginalName(profile.full_name ?? "");
      setRole(profile.role ?? "admin");
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage("Gagal menyimpan: " + error.message);
      return;
    }

    setOriginalName(name);
    setMessage("Tersimpan.");
    setTimeout(() => setMessage(null), 2500);
  }

  function handleReset() {
    setName(originalName);
    setMessage(null);
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Memuat pengaturan...</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Atur preferensi dan konfigurasi sistem.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-blue-600 md:text-base"
            />
          </div>

          {message && <p className="text-sm text-blue-600">{message}</p>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              onClick={handleSave}
              disabled={saving || name === originalName}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed md:w-auto"
            >
              {saving ? "Menyimpan..." : "Save changes"}
            </button>
            <button
              onClick={handleReset}
              disabled={name === originalName}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed md:w-auto"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="text-base font-semibold text-black md:text-lg">Account</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Role</p>
              <p className="text-xs text-gray-600">Ditentukan oleh administrator sistem</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 capitalize">
              {role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
