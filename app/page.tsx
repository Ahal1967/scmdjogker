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
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-xl">
        <div className="flex w-full flex-col justify-center px-6 py-10 md:w-1/2 md:px-12 lg:px-16">
          <h1 className="mb-3 text-3xl font-bold text-black md:text-4xl">
            Selamat Datang!
          </h1>
          <p className="mb-8 text-sm text-gray-600 md:text-base">
            Silakan login untuk melanjutkan ke dashboard.
          </p>

          {errorMsg && (
            <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-gray-700">Email</label>
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
              <label className="mb-2 block text-sm text-gray-700">Password</label>
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
                  className="accent-red-600"
                />
                Ingat saya
              </label>

              <Link href="/auth/forgot-password" className="text-red-600 hover:underline">
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

          <p className="mt-6 text-center text-xs text-gray-500">
            Belum punya akun? Hubungi Administrator
          </p>
        </div>

        <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-red-50 via-white to-white md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08),transparent_55%)]" />

          <div className="relative z-10 flex flex-col items-center gap-6 px-10 text-center">
            <div className="relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border border-red-200 bg-white shadow-lg">
              <Image
                src="/images/logodjogker.jpeg"
                alt="Logo DJOKER"
                fill
                className="object-contain p-5"
                priority
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-[0.2em] text-black">
                DJOGKER
              </h2>
              <p className="mt-2 text-sm italic text-gray-600">
                “Kualitas Terbaik untuk Hasil Sablon Maksimal”
              </p>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>Jl. Wates Km 4,5 Gg. Ablar No 5</p>
              <p>Gamping Kidul RT 03/17 Ambarketawang Sleman</p>
              <p>Yogyakarta 55294</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}