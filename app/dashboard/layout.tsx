"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "@headlessui/react";
import { User, Settings, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { navItems } from "@/lib/nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && isMobile) {
      setSidebarOpen(true);
    }

    if (isLeftSwipe && isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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
      className="relative flex min-h-screen bg-djoker-bg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 border-r transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--djoker-surface)",
          borderColor: "var(--djoker-border)",
        }}
      >
        <div
          className="flex h-16 items-center gap-3 border-b px-5"
          style={{ borderColor: "var(--djoker-border)" }}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border bg-white dark:bg-gray-700 shadow">
            <Image
              src="/images/logodjogker1.jpeg"
              alt="Logo DJOKER"
              width={40}
              height={40}
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="font-display text-xs font-bold tracking-wide text-black dark:text-white">
              DJOKER
            </p>
            <p className="text-[9px] tracking-widest" style={{ color: "var(--djoker-muted)" }}>
              SCM SYSTEM
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={isActive ? "sidebar-link-active" : "sidebar-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-50 flex h-16 items-center justify-between border-b bg-djoker-bg px-4 md:justify-end md:px-6"
          style={{ borderColor: "var(--djoker-border)" }}>
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

            <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-3 rounded-full border bg-djoker-panel px-2 py-1.5 shadow-sm transition hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ borderColor: "var(--djoker-border)" }}>
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-white dark:bg-gray-700">
                <Image
                  src="/images/logodjogker1.jpeg"
                  alt="Avatar DJOKER"
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

            <Menu.Items className="absolute right-0 z-50 mt-3 w-56 origin-top-right rounded-xl border bg-djoker-panel p-2 shadow-xl focus:outline-none"
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

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
