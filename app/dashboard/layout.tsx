"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "@headlessui/react";
import {
  Settings,
  LogOut,
  LayoutDashboard,
  Share2,
  Users2,
  Warehouse,
  Shirt,
  FileText,
  Factory,
  ShieldCheck,
  PackageCheck,
  Truck,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { navItems } from "@/lib/nav";

const NAV_ICONS: Record<string, any> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/alur": Share2,
  "/dashboard/supplier": Users2,
  "/dashboard/gudang": Warehouse,
  "/dashboard/produk": Shirt,
  "/dashboard/pesanan": FileText,
  "/dashboard/pelanggan": Users2,
  "/dashboard/produksi": Factory,
  "/dashboard/qc": ShieldCheck,
  "/dashboard/packing": PackageCheck,
  "/dashboard/pengiriman": Truck,
  "/dashboard/laporan": BarChart3,
  "/dashboard/pengaturan": Settings,
};

const NAV_SECTIONS = [
  { title: "Utama", hrefs: ["/dashboard", "/dashboard/alur"] },
  {
    title: "Operasional",
    hrefs: [
      "/dashboard/supplier",
      "/dashboard/gudang",
      "/dashboard/produk",
      "/dashboard/pesanan",
      "/dashboard/pelanggan",
      "/dashboard/produksi",
      "/dashboard/qc",
      "/dashboard/packing",
      "/dashboard/pengiriman",
    ],
  },
  { title: "Lainnya", hrefs: ["/dashboard/laporan", "/dashboard/pengaturan"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  function handleTouchStart(e: React.TouchEvent) {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.targetTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;

    // Swipe kanan (buka sidebar) sengaja dihapus atas permintaan user --
    // di mobile, sidebar sekarang cuma bisa dibuka lewat tombol hamburger.
    // Swipe kiri buat NUTUP sidebar yang sudah kebuka tetap dipertahankan.
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe && isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    function handleScroll() {
      setHeaderScrolled(el!.scrollTop > 8);
    }
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen, isMobile]);

  return (
    <div
      className="relative flex min-h-screen bg-transparent"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="md:w-64 md:shrink-0" style={{ background: "var(--djoker-bg-2)" }}>
        {/* Div pembungkus ini cuma "gutter" tempat kartu sidebar mengambang
            di desktop -- warnanya var(--djoker-bg-2), beda tipis dari latar
            halaman utama (var(--djoker-bg)), jadi kartu kelihatan terpisah
            tanpa shadow yang berat. Di mobile lebarnya collapse ke 0 (tidak
            di-set md:w-64 di situ) karena <aside> di dalamnya "fixed" --
            tidak butuh ruang dari parent-nya sama sekali, jadi wrapper ini
            aman walau 0px, tidak boleh "hidden" (kalau di-hidden, elemen
            fixed di dalamnya ikut hilang total). */}
        <aside
          /* flex + flex-col ditambahkan di sini -- sebelumnya <nav> di bawah
             sudah punya "flex-1 overflow-y-auto" tapi TIDAK PERNAH jalan
             karena parent-nya (<aside> ini) bukan flex container, jadi
             "flex-1" itu tidak berarti apa-apa. Akibatnya di layar pendek
             (HP), daftar menu yang kepanjangan cuma overflow diam-diam tanpa
             bisa di-scroll, jadi menu paling bawah (Pengaturan) kepotong dan
             tidak kelihatan/tidak bisa diklik.
             Opsi A "Kartu Mengambang" -- awalnya cuma di desktop, TAPI user
             minta konsisten di HP juga. Jadi sekarang base class (tanpa
             prefix md:) sudah langsung "mengambang": posisi fixed dengan
             top-3.5/left-3.5/bottom-3.5 (bukan top-0/left-0/h-full lagi) --
             trik CSS lama, kalau top DAN bottom sama-sama di-set pada
             elemen fixed, tingginya otomatis ngisi sisa ruang di antara
             keduanya, jadi tidak perlu hitung height manual. Rounded+shadow
             juga sudah base (bukan md: lagi). Overlay hitam (bg-black/40)
             yang sudah ada dari dulu otomatis kelihatan di sekeliling kartu
             ini sebagai "gutter"-nya versi mobile -- tidak perlu wrapper
             separuh kayak di desktop.
             Animasi buka/tutup: dulu pakai "-translate-x-full" (=-100% dari
             lebar sendiri), sekarang diganti "-translate-x-[120vw]" --
             soalnya kartunya sekarang punya offset left-3.5, kalau masih
             pakai -100% sisi kanannya cuma geser sampai x=14px, MASIH
             sedikit kelihatan nongol di layar. 120vw jamin bener-bener
             hilang dari layar berapa pun lebar HP-nya.
             Di desktop (md:): posisi balik ke "static" (bukan fixed lagi,
             top/left/bottom jadi tidak berlaku otomatis), margin dari
             my-3.5/ml-3.5, tinggi eksplisit calc(100vh-28px) (karena static
             tidak bisa pakai trik top+bottom), lebar diperkecil ke 228px
             (muat di gutter 256px punya <div> pembungkus). "border-r"
             diganti "border" (4 sisi) dari awal supaya kartunya (mobile
             maupun desktop) punya garis tepi utuh, bukan cuma kanan. */
          className={`sidebar-glass fixed left-3.5 top-3.5 bottom-3.5 z-50 flex w-64 flex-col rounded-[20px] border shadow-lg transition-transform duration-300 ease-in-out md:static md:my-3.5 md:ml-3.5 md:h-[calc(100vh-28px)] md:w-[228px] md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-[120vw]"
          }`}
          style={{
            borderColor: "var(--djoker-border)",
          }}
        >
        {/* Revisi ke-3 dari mockup "Sidebar Header Redesign" (approved) --
            diadaptasi dari referensi gambar user: gradasi biru-ke-biru-muda
            yang halus (ganti dari navy-hitam di revisi sebelumnya),
            wordmark lebih besar/tebal, subtitle jadi teks polos berspasi
            (bukan pil lagi), + 2 lingkaran glow lembut di latar buat kesan
            premium (murni dekoratif, tidak merepresentasikan data apa
            pun -- sengaja TIDAK ikut panel ikon & garis progress dari
            referensi karena keduanya juga tidak punya makna nyata di
            sini).
            Bentuk kartu balik ke "Kartu Membulat + Jarak" (bukan lagi
            full-bleed) -- kartu ini sengaja dibuat LEBIH SEMPIT dari
            sidebar (margin 16px kiri/kanan/atas), supaya sudut
            membulatnya punya "ruang napas" (percobaan rounded-corner
            full-bleed sebelumnya kelihatan kepotong somplak karena tidak
            ada margin). Warna kartu tetap fixed sama di light & dark mode
            (keputusan sadar user) -- yang beda cuma sekelilingnya, latar
            sidebar & warna menu ikut var(--djoker-*)/dark: seperti biasa. */}
        {/* Header sidebar -- kotak gradasi biru + chip putih sudah dihapus
            (lihat riwayat sebelumnya). Logo wordmark, teks "DJOGKER"
            terpisah sudah dihapus (redundan sama tulisan di dalam logo).
            Revisi ini: (1) tulisan "djogja t-shirt maker" di dalam file
            logo dihapus manual (mask per-komponen pakai scipy.ndimage
            biar goresan "r" yang nyambung ke situ tidak ikut kehapus --
            versi pertama pakai deteksi warna biru doang masih nyisain
            "hantu" tipis karena noise kompresi JPEG di alpha rendah),
            (2) tulisan "proud of local product" yang tadinya biru
            direcolor abu-abu (gray-500 light / gray-400 dark, senada
            sama caption di bawahnya, bukan biru lagi), (3) ukuran
            tampilnya diperkecil dari 172px ke 130px sesuai permintaan
            user. Dua file logo-djogker-light/dark.png sudah di-generate
            ulang dari master, tetap tajam di ukuran baru ini. */}
        <div className="shrink-0 border-b border-gray-200 px-5 pb-4 pt-[18px] dark:border-[#30363d]">
          <div className="flex flex-col items-center justify-center gap-2">
            <Image
              src="/images/logo-djogker-light.png"
              alt="Logo DJOGKER"
              width={130}
              height={56}
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/images/logo-djogker-dark.png"
              alt="Logo DJOGKER"
              width={130}
              height={56}
              className="hidden object-contain dark:block"
              priority
            />
            <p className="text-[9px] font-bold tracking-[0.16em] text-gray-500 dark:text-gray-400">
              SUPPLY CHAIN SYSTEM
            </p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wide text-gray-500 dark:text-gray-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {navItems
                  .filter((item) => section.hrefs.includes(item.href))
                  .map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname?.startsWith(item.href);
                    const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;

                    return (
                      /* Active state "Soft Tinted" (Opsi B dari mockup, dipilih user) --
                         ganti dari pill gradasi biru solid ke latar biru tipis
                         transparan + garis aksen di kiri (span di bawah), senada
                         sama arah desain card/tabel lain yang sudah di-flat-in.
                         font-display DITAMBAHKAN di sini (bukan cuma di
                         .sidebar-link/.sidebar-link-active di globals.css --
                         dua class itu TERNYATA TIDAK dipakai sama sekali di
                         komponen ini, jadi perubahan font sebelumnya tidak
                         pernah kepakai di sidebar asli sampai baris ini). */
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={`group relative flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-display transition duration-200 ${
                          isActive
                            ? "bg-blue-500/10 text-blue-700 font-bold ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20"
                            : "text-gray-700 dark:text-gray-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:translate-x-0.5"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                        )}
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "bg-blue-500/15 dark:bg-blue-500/25" : "bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60"
                            }`}
                          >
                            <Icon
                              size={15}
                              strokeWidth={2.2}
                              className={isActive ? "text-blue-600 dark:text-blue-300" : "text-blue-600 dark:text-blue-400"}
                            />
                          </span>
                          {item.label}
                        </span>
                        <ChevronRight
                          size={14}
                          strokeWidth={2.5}
                          className={
                            isActive
                              ? "text-blue-500/70 dark:text-blue-300/70"
                              : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          }
                        />
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          /* Header ini "sticky" (nempel pas discroll) -- SENGAJA tidak pakai
             backdrop-blur lagi di state scrolled walau kelihatan "kaca" di
             card lain. Kombinasi sticky + backdrop-filter itu pola yang
             terkenal bikin scroll patah-patah, karena browser wajib hitung
             ulang blur dari konten yang lewat di baliknya di SETIAP frame
             scroll (bukan sekali render). Efek "elevated saat discroll"
             sekarang cuma dari background lebih solid + shadow, bukan blur
             -- scroll jadi mulus, card/tabel lain di halaman lain TIDAK
             ikut berubah karena ini scoped ke header saja.
             "border-b" dulu SELALU aktif (tidak ikut kondisi headerScrolled
             kayak background/shadow-nya) -- akibatnya di posisi paling atas
             halaman (belum discroll, background transparan), yang muncul
             cuma garis horizontal sendirian tanpa alasan visual yang jelas
             (background-nya nyatu sama halaman, tapi garisnya tetap ada).
             User merasa garis ini mengganggu di dark mode (kontrasnya
             tinggi, var(--djoker-border) dark #30363d di atas dasar nyaris
             hitam #0d1117). Diperbaiki dengan masukin border-b ke kondisi
             yang sama kayak background+shadow -- jadi garis itu cuma
             muncul BARENGAN elevasi pas discroll (background solid+shadow),
             bukan berdiri sendiri di posisi diam. */
          className={`sticky top-0 z-40 flex h-16 items-center justify-between px-4 transition-colors duration-300 md:justify-end md:px-6 ${
            headerScrolled
              ? "border-b bg-white/90 dark:bg-[#0d1117]/90 shadow-sm"
              : "border-b border-transparent bg-transparent"
          }`}
          style={headerScrolled ? { borderColor: "var(--djoker-border)" } : undefined}
        >
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] md:hidden"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />

            <Menu as="div" className="relative">
            <Menu.Button
              className="flex items-center gap-3 rounded-full border bg-white/50 px-2 py-1.5 shadow-sm backdrop-blur-md transition hover:bg-white/70 dark:bg-[#161b22]/50 dark:hover:bg-[#21262d]/70"
              style={{ borderColor: "var(--djoker-border)" }}
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-white">
                <Image
                  src="/images/logodjogker1.jpeg"
                  alt="Avatar DJOGKER"
                  width={32}
                  height={32}
                  className="object-contain p-1"
                />
              </div>

              <div className="hidden leading-tight text-left sm:block">
                <p className="text-sm font-medium text-black dark:text-white">Administrator</p>
                <p className="text-[11px]" style={{ color: "var(--djoker-muted)" }}>Admin</p>
              </div>

              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                style={{ color: "var(--djoker-muted)" }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Menu.Button>

            <Menu.Items className="absolute right-0 z-50 mt-3 w-56 origin-top-right rounded-xl border bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-md p-2 shadow-xl focus:outline-none"
              style={{ borderColor: "var(--djoker-border)" }}>
              {/* Sebelumnya 2 item terpisah ("Profile" -> /dashboard/profile,
                  "Settings" -> /dashboard/settings) yang masing-masing
                  py sendiri, isinya sebagian besar duplikat dari halaman
                  Pengaturan (edit nama, lihat role, email, logout) tapi
                  TIDAK ikut sistem desain yang sama (warna Tailwind acak,
                  ada garis biru aneh ketauan user lewat screenshot) --
                  digabung jadi 1 item ke /dashboard/pengaturan supaya
                  cuma ada SATU tempat buat data profil/akun, tidak ada
                  lagi 2 sumber kebenaran yang bisa beda sendiri-sendiri.
                  Folder app/dashboard/profile/ dan app/dashboard/settings/
                  dihapus manual oleh user (device bridge di sesi ini
                  tidak bisa hapus file). */}
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/dashboard/pengaturan"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                      active ? "bg-blue-50 text-blue-600" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#21262d]"
                    }`}
                  >
                    <Settings size={16} strokeWidth={2} />
                    Pengaturan
                  </Link>
                )}
              </Menu.Item>

              <div className="my-2 border-t" style={{ borderColor: "var(--djoker-border)" }} />

              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      active ? "bg-red-50 text-red-600" : "text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <LogOut size={16} strokeWidth={2} />
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
          </div>
        </header>

        {/* overscroll-y-contain SEMPAT dicoba di sini buat benerin kilatan
            putih pas bounce-scroll di HP, tapi DIBATALKAN -- di sebagian
            browser mobile (terutama WebKit/iOS versi tertentu),
            overscroll-behavior ternyata bisa bentrok sama gesture
            touch-scroll bawaan dan malah mematikan scroll sama sekali,
            bukan cuma "mengunci" efek bounce-nya seperti yang diharapkan.
            Scroll normal jauh lebih penting daripada kilatan putih kosmetik,
            jadi properti ini dilepas lagi. Kalau mau coba lagi nanti,
            pertimbangkan -webkit-overflow-scrolling:touch dulu atau test
            manual di device asli sebelum ship. */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
