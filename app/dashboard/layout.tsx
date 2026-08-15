"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "@headlessui/react";
import {
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Share2,
  Users2,
  Warehouse,
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

      <aside
        /* flex + flex-col ditambahkan di sini -- sebelumnya <nav> di bawah
           sudah punya "flex-1 overflow-y-auto" tapi TIDAK PERNAH jalan
           karena parent-nya (<aside> ini) bukan flex container, jadi
           "flex-1" itu tidak berarti apa-apa. Akibatnya di layar pendek
           (HP), daftar menu yang kepanjangan cuma overflow diam-diam tanpa
           bisa di-scroll, jadi menu paling bawah (Pengaturan) kepotong dan
           tidak kelihatan/tidak bisa diklik. */
        className={`sidebar-glass fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          borderColor: "var(--djoker-border)",
        }}
      >
        <div
          className="flex h-16 shrink-0 items-center gap-3 border-b px-4"
          style={{ borderColor: "var(--djoker-border)" }}
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm">
            <Image
              src="/images/logodjogker1.jpeg"
              alt="Logo DJOGKER"
              width={36}
              height={36}
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-extrabold tracking-wide bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-white dark:to-blue-100">
              DJOGKER
            </p>
            <span
              className="mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold tracking-widest text-blue-600 dark:text-white"
              style={{ background: "rgba(59,130,246,0.12)" }}
            >
              SCM SYSTEM
            </span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wide text-gray-400 dark:text-gray-500">
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
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={`group relative flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm transition duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
                            : "text-gray-700 dark:text-gray-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:translate-x-0.5"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                        )}
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60"
                            }`}
                          >
                            <Icon
                              size={15}
                              strokeWidth={2.2}
                              className={isActive ? "text-white" : "text-blue-600 dark:text-blue-400"}
                            />
                          </span>
                          {item.label}
                        </span>
                        <ChevronRight
                          size={14}
                          strokeWidth={2.5}
                          className={
                            isActive
                              ? "text-white/70"
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
             ikut berubah karena ini scoped ke header saja. */
          className={`sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 transition-colors duration-300 md:justify-end md:px-6 ${
            headerScrolled
              ? "bg-white/90 dark:bg-gray-900/90 shadow-sm"
              : "bg-transparent"
          }`}
          style={{ borderColor: "var(--djoker-border)" }}
        >
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
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
              className="flex items-center gap-3 rounded-full border bg-white/50 px-2 py-1.5 shadow-sm backdrop-blur-md transition hover:bg-white/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
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

            <Menu.Items className="absolute right-0 z-50 mt-3 w-56 origin-top-right rounded-xl border bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-2 shadow-xl focus:outline-none"
              style={{ borderColor: "var(--djoker-border)" }}>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/dashboard/profile"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                      active ? "bg-blue-50 text-blue-600" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <User size={16} strokeWidth={2} />
                    Profile
                  </Link>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/dashboard/settings"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                      active ? "bg-blue-50 text-blue-600" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Settings size={16} strokeWidth={2} />
                    Settings
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

        {/* overscroll-y-contain -- background halaman ini datang dari
            body::before/::after yang position:fixed di globals.css, BUKAN
            dari <main> ini sendiri. Di HP, pas scroll sampai mentok bawah
            di halaman yang isinya panjang (tabel), gesture rubber-band/
            bounce bawaan browser mobile bisa "mengintip" ke belakang <main>
            sekilas dan yang kelihatan sesaat itu putih polos (bukan
            gradient dark/light yang seharusnya), baru balik normal begitu
            bounce-nya selesai -- ini bug overscroll klasik di scroll
            container bersarang. overscroll-y-contain mengunci efek
            bounce-nya supaya berhenti di batas <main>, tidak "bocor" ke
            belakangnya. */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-y-contain p-6">{children}</main>
      </div>
    </div>
  );
}
