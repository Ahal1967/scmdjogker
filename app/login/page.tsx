"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[32px] border border-blue-200 bg-white shadow-2xl">
        {/* Left - Form */}
        <div className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16">
          {/* Logo mobile */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-blue-200 bg-white shadow">
              <Image
                src="/images/logodjogker.jpeg"
                alt="Logo DJOKER"
                width={48}
                height={48}
                className="object-contain p-2"
                priority
              />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-black">DJOKER</p>
              <p className="text-[10px] tracking-widest text-gray-500">SCM SYSTEM</p>
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-black md:text-4xl">
            Selamat Datang!
          </h1>
          <p className="mb-8 text-sm text-gray-600 md:text-base">
            Silakan login untuk melanjutkan ke dashboard.
          </p>

          {errorMsg && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
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
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                />
                Ingat saya
              </label>

              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 w-full"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500">
            Belum punya akun? Hubungi Administrator
          </p>
        </div>

        {/* Right - Visual */}
        <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-white md:flex">
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-8 px-10 text-center">
            {/* Logo besar */}
            <div className="relative flex h-80 w-80 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-white shadow-2xl shadow-blue-200/50">
              <Image
                src="/images/logodjogker1.jpeg"
                alt="Logo DJOKER"
                fill
                className="object-contain p-8"
                priority
              />
            </div>

            {/* Teks */}
            <div>
              <h2 className="font-display text-3xl font-bold tracking-[0.15em] text-black">
                DJOGKER
              </h2>
              <p className="mt-3 text-sm font-medium italic text-gray-600">
                "Kualitas Terbaik untuk Hasil Sablon Maksimal"
              </p>
            </div>

            {/* Address */}
            <div className="mt-2 text-sm text-gray-500">
              <p>Jl. Wates Km 4,5 Gg. Ablar No 5</p>
              <p>Gamping Kidul RT 03/17 Ambarketawang Sleman</p>
              <p>Yogyakarta 55294</p>
            </div>

            {/* Decorative line */}
            <div className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}