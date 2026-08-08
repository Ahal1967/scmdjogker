"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase otomatis membuat sesi sementara saat link reset dibuka.
    // Kita tunggu event PASSWORD_RECOVERY sebelum menampilkan form.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Fallback: kalau sesi sudah ada duluan (link sudah pernah dibuka)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-blue-200 bg-white dark:bg-gray-800 shadow-2xl p-8 md:p-10">
        <h1 className="mb-2 text-2xl font-bold text-black dark:text-white md:text-3xl font-display">
          Atur Password Baru
        </h1>

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            Password berhasil diperbarui. Mengarahkan ke halaman login...
          </div>
        ) : !ready ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Memverifikasi tautan reset password... Kalau halaman ini tidak berubah
            dalam beberapa detik, kemungkinan tautan sudah kedaluwarsa —{" "}
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
              minta tautan baru
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Password Baru</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Konfirmasi Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
