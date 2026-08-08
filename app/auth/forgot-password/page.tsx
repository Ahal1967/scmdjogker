"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-blue-200 bg-white shadow-2xl p-8 md:p-10">
        <h1 className="mb-2 text-2xl font-bold text-black md:text-3xl font-display">
          Lupa Password?
        </h1>
        <p className="mb-8 text-sm text-gray-600">
          Masukkan email akun kamu, kami akan kirimkan tautan untuk reset password.
        </p>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            Tautan reset password sudah dikirim ke <strong>{email}</strong>. Cek inbox
            (atau folder spam) lalu ikuti instruksinya.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@email.com"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Mengirim..." : "Kirim Tautan Reset"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline">
            &larr; Kembali ke Login
          </Link>
        </p>
      </div>
    </div>
  );
}
