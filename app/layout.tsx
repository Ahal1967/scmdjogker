import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

/* Font judul terpisah dari font body (atas permintaan user, biar kesan
   lebih premium/elegan) -- Plus Jakarta Sans (grotesk halus, Opsi C dari
   mockup) dipakai LEWAT ".font-display"/h1-h6 di globals.css, DAN juga
   di sidebar-link + header tabel (col-label) supaya konsisten di seluruh
   web -- bukan cuma judul halaman. Inter di atas tetap dipakai penuh
   buat body text/paragraf. */
const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "DJOGKER Sablon Kaos — Supply Chain Management",
  description: "Sistem terintegrasi untuk mengelola seluruh alur supply chain DJOGKER Sablon Kaos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${displayFont.variable}`} suppressHydrationWarning>
      <body className="bg-djoker-bg text-djoker-text font-body antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
