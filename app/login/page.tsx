"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Paksa halaman ini selalu di-generate ulang di server tiap request,
// bukan disimpan sebagai file statis tetap.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg md:p-8">
        {/* Logo, nama, badge, semua nyatu di dalam 1 card */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 px-3 py-1 text-xs font-semibold tracking-wide text-black dark:text-white">
            SUPPLY CHAIN MANAGEMENT
          </span>

          <div
            className="mb-3 h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-md"
            style={{ backgroundColor: "#ffffff" }}
          >
            <Image
              src="/images/logodjogker1.jpeg"
              alt="Logo DJOKER"
              width={80}
              height={80}
              className="h-full w-full object-contain p-1"
              priority
            />
          </div>

          <h2 className="font-display text-xl font-bold tracking-[0.1em] text-black dark:text-white">DJOGKER</h2>
          <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
            &ldquo;Kualitas Terbaik untuk Hasil Sablon Maksimal&rdquo;
          </p>
        </div>

        <div className="mb-6 border-t border-gray-100 pt-6 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white font-display">Selamat Datang!</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Silakan login untuk melanjutkan ke dashboard.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" />
              Ingat saya
            </label>

            <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 hover:underline">
              Lupa password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Belum punya akun? Hubungi Administrator
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            href="/tracking"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Lacak Pesanan
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Upload Desain
          </Link>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-[11px] text-gray-400">
          <p>Jl. Wates Km 4,5 Gg. Ablar No 5</p>
          <p>Gamping Kidul RT 03/17 Ambarketawang Sleman, Yogyakarta 55294</p>
        </div>
      </div>
    </div>
  );
}
