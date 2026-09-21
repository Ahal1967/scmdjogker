"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  FileSearch,
  UploadCloud,
  Warehouse,
  Factory,
  Truck,
  Headset,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Kartu kedua ini isinya buat PELANGGAN (bukan tim internal) -- makanya
// tiap poin ditulis dari sudut pandang "apa yang pelanggan dapat", bukan
// "apa yang bisa dikelola tim". Gradasi tiap chip ikon sengaja dari
// keluarga warna yang sama dengan .dash-kpi-icon di dashboard (cyan/
// oranye/biru/violet), supaya bahasa warnanya nyambung walau halaman
// login ini di luar layout dashboard.
const FEATURES = [
  { label: "Bahan Baku Berkualitas", desc: "Kami pastikan bahan baku yang dipakai selalu terjaga kualitasnya.", icon: Warehouse, gradient: ["#22d3ee", "#0891b2"] },
  { label: "Produksi & Quality Control", desc: "Setiap pesanan melewati proses sablon dan pemeriksaan kualitas sebelum dikirim.", icon: Factory, gradient: ["#fb923c", "#ea580c"] },
  { label: "Lacak Status Pesanan", desc: "Pantau progres pesanan Anda secara real-time, dari diproses sampai dikirim.", icon: Truck, gradient: ["#3b82f6", "#2563eb"] },
  { label: "Bantuan Kapan Saja", desc: "Ada kendala? Tim admin kami siap membantu lewat WhatsApp.", icon: Headset, gradient: ["#a78bfa", "#7c3aed"] },
] as const;

export default function LoginPageClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carousel geser (cuma aktif di mobile/tablet -- di lg ke atas ini balik
  // ke grid 2 kolom biasa, lihat className carouselRef di bawah). activeCard
  // dipakai buat nge-highlight dot yang lagi aktif, dihitung dari posisi
  // scroll horizontal, BUKAN dari state terpisah yang bisa nggak sinkron
  // kalau user geser manual dengan jari alih-alih klik dot.
  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (el.clientWidth || 1));
    setActiveCard(idx);
  }

  function scrollToCard(idx: number) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }

  // Login diproses lewat Route Handler (/api/auth/login), BUKAN
  // manggil supabase.auth.signInWithPassword() langsung dari sini,
  // supaya percobaan gagal bisa dihitung & dikunci sementara di
  // server (lihat komentar di route.ts) -- kalau dihitung di browser,
  // gampang dilewati cuma dengan refresh/incognito.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(result?.error || "Gagal login. Coba lagi.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMsg("Tidak bisa terhubung ke server. Cek koneksi internet Anda.");
      setLoading(false);
    }
  }

  return (
    // Background sengaja TIDAK dikasih gradasi/blob sendiri lagi di sini --
    // sebelumnya halaman ini punya 3 blob wave biru besar sendiri (gaya
    // "marketing"), beda sendiri dari body::before di globals.css yang
    // dipakai di seluruh dashboard (glow tipis cuma di 2 pojok, tengah
    // tetap putih bersih). Dengan wrapper transparan begini, halaman ini
    // otomatis ikut background global yang sama -- jadi serasi dengan
    // dashboard tanpa perlu bikin gradasi baru.
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-10">
      {/* Carousel geser 1 kartu per layar, berlaku di semua ukuran layar.
          Dibungkus wrapper "relative" terpisah supaya tombol panah kiri/
          kanan bisa absolute-positioned MENGAMBANG di atas carousel, bukan
          ikut ke-scroll bareng kartu -- di mobile/tablet bisa digeser
          dengan jari ATAU diklik tombolnya, di desktop (tidak ada gesture
          sentuh) praktis cuma lewat tombol ini. */}
      <div className="relative z-10 mx-auto w-full max-w-md">
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex w-full gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
      <div
        className="w-full shrink-0 snap-center rounded-3xl border border-blue-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] p-6 md:p-8"
        style={{ boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 24px 48px -12px rgba(37,99,235,0.25)" }}
      >
        {/* Logo, nama, badge */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 dark:border-[#3d444d] shadow-md"
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

        <div className="mb-6 border-t border-gray-100 dark:border-[#30363d] pt-6 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white font-display">
            Selamat Datang!
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
      </div>

      {/* Kartu kedua -- highlight fitur sistem + jalur khusus pelanggan
          (Lacak Pesanan/Upload Desain, dipindah dari kartu login supaya
          tidak terselip jadi 2 pill kecil yang gampang terlewat oleh
          pelanggan yang sebenarnya tidak perlu akun sama sekali). */}
      <div
        className="flex w-full shrink-0 snap-center flex-col rounded-3xl border border-blue-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] p-6 md:p-8"
        style={{ boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 24px 48px -12px rgba(37,99,235,0.25)" }}
      >
        <div>
          <h3 className="font-display text-lg font-bold text-black dark:text-white">
            Menu Informasi untuk Pesanan Anda
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            DJOGKER mencatat setiap tahap produksi pesanan Anda - Mulai dari pesanan masuk sampai diterima di tangan pelanggan, semua bisa dilacak.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: `linear-gradient(135deg, ${f.gradient[0]}, ${f.gradient[1]})` }}
              >
                <f.icon size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold text-black dark:text-white">{f.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="my-6 border-t border-gray-100 dark:border-[#30363d]" />

        <div className="mt-auto">
          <h4 className="text-sm font-semibold text-black dark:text-white">Anda pelanggan?</h4>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tidak perlu akun -- lacak status pesanan atau upload desain custom Anda langsung di sini.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/tracking"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-transparent px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
            >
              <FileSearch size={13} />
              Lacak Pesanan
            </Link>
            <Link
              href="/upload"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-transparent px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
            >
              <UploadCloud size={13} />
              Upload Desain
            </Link>
          </div>
        </div>
      </div>
      </div>

      {activeCard > 0 && (
        <button
          type="button"
          onClick={() => scrollToCard(activeCard - 1)}
          aria-label="Kartu sebelumnya"
          className="absolute left-0 top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] text-blue-600 dark:text-blue-400 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
        >
          <ChevronLeft size={17} />
        </button>
      )}
      {activeCard < 1 && (
        <button
          type="button"
          onClick={() => scrollToCard(activeCard + 1)}
          aria-label="Kartu selanjutnya"
          className="absolute right-0 top-1/2 z-20 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] text-blue-600 dark:text-blue-400 shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
        >
          <ChevronRight size={17} />
        </button>
      )}
      </div>

      {/* Dot indikator + hint geser -- tampil di semua ukuran layar sekarang,
          menyertai carousel yang juga berlaku di semua ukuran. Dot bisa
          diklik buat lompat langsung ke kartu itu, bukan cuma penanda pasif. */}
      <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToCard(i)}
              aria-label={`Ke halaman ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                activeCard === i ? "w-5 bg-blue-600" : "w-1.5 bg-blue-200 dark:bg-blue-900/50"
              }`}
            />
          ))}
        </div>
        <p className="inline-flex items-center gap-1 text-[11px] text-blue-500 dark:text-blue-400">
          <ChevronLeft size={12} />
          Geser untuk melihat halaman lainnya
        </p>
      </div>
    </div>
  );
}
