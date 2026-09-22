"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

// Wrapper animasi transisi halaman -- dipasang SEKALI di
// app/dashboard/layout.tsx, membungkus {children} di dalam <main>.
// AnimatePresence + key={pathname} bikin framer-motion nganggep tiap
// rute (misal /dashboard -> /dashboard/gudang) sebagai elemen BARU,
// jadi animasi exit (halaman lama) & enter (halaman baru) otomatis
// jalan tiap kali link diklik -- tanpa perlu ubah apa pun di
// masing-masing page.tsx (server maupun client component sama-sama
// tetap bisa, karena yang di-animasi cuma <div> pembungkusnya, bukan
// konten di dalamnya).
//
// Gaya: SLIDE (dipilih user lewat contoh perbandingan Fade/Slide/
// Scale) -- geser halus 14px + fade, arah selalu dari kanan ke kiri
// (bukan mengikuti arah navigasi asli/back-forward) karena App Router
// tidak expose informasi itu ke komponen client secara langsung.
//
// useReducedMotion: kalau user set "reduce motion" di OS-nya, animasi
// slide dilewati (langsung fade tipis) -- bukan estetika semata, ini
// preferensi aksesibilitas yang beneran dipakai orang dengan vestibular
// disorder/motion sensitivity, jadi dihormati, bukan cuma dekorasi.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
