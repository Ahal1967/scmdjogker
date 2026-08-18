"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, FileSearch, UploadCloud, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-10">
      {/* Dekorasi wave/blob besar di pojok -- diganti dari blob bulat kecil
          buram jadi bentuk wave lebih besar & lebih "berani" (atas
          permintaan user, biar sesuai referensi desain yang dikasih),
          masih pakai warna biru brand yang sama, cuma bentuk & skalanya
          beda. pointer-events-none + z-0 supaya tetap di belakang card. */}
      <div className="pointer-events-none absolute -bottom-40 -left-20 z-0 h-[36rem] w-[36rem] rounded-full bg-gradient-to-tr from-blue-300 to-blue-100 opacity-60 dark:from-blue-900/30 dark:to-blue-900/10 blur-[2px] md:blur-none" style={{ borderRadius: "45% 55% 60% 40% / 50% 45% 55% 50%" }} />
      <div className="pointer-events-none absolute -right-32 -top-32 z-0 h-[26rem] w-[26rem] rounded-full bg-gradient-to-bl from-blue-200 to-blue-50 opacity-70 dark:from-blue-900/20 dark:to-transparent blur-[2px] md:blur-none" style={{ borderRadius: "60% 40% 45% 55% / 55% 60% 40% 45%" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-16 z-0 h-72 w-72 rounded-full bg-blue-100/70 dark:bg-blue-900/10 blur-2xl" />

      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 md:p-8"
        style={{ boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 24px 48px -12px rgba(37,99,235,0.25)" }}
      >
        {/* Logo, nama, badge */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-md"
            style={{ backgroundColor: "#ffffff" }}
          >
            <Image
              src="/images/logodjogker1.jpeg"
              alt="Logo DJOGKER"
              width={80}
              height={80}
              className="h-full w-full object-contain p-1"
              priority
            />
          </div>

          <h2 className="font-display text-xl font-bold tracking-[0.1em] text-black dark:text-white">DJOGKER</h2>

          <p className="mt-3 text-xs italic text-gray-500 dark:text-gray-400">
            &ldquo;Proud Of Local Product&rdquo;
          </p>
        </div>

        <div className="mb-6 border-t border-gray-100 dark:border-gray-700 pt-6 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white font-display">
            Selamat <span style={{ color: "var(--djoker-blue)" }}>Datang!</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Silakan login untuk melanjutkan ke dashboard.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@email.com"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" />
              Ingat saya
            </label>

            <Link href="/auth/forgot-password" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
              Lupa password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 flex w-full items-center justify-center gap-2"
          >
            <LogIn size={16} />
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Belum punya akun? Hubungi Administrator
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            href="/tracking"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
          >
            <FileSearch size={13} />
            Lacak Pesanan
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
          >
            <UploadCloud size={13} />
            Upload Desain
          </Link>
        </div>

        <div className="mt-6 flex items-start justify-center gap-1.5 border-t border-gray-100 dark:border-gray-700 pt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          <div>
            <p>Jl. Wates Km 4,5 Gg. Ablar No 5</p>
            <p>Gamping Kidul RT 03/17 Ambarketawang Sleman, Yogyakarta 55294</p>
          </div>
        </div>
      </div>
    </div>
  );
}
