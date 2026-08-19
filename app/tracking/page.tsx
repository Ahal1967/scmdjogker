import type { Metadata } from "next";
import TrackingPageClient from "./TrackingPageClient";

export const dynamic = "force-dynamic";

// Halaman lacak pesanan tidak perlu muncul di hasil pencarian Google --
// isinya cuma form pencarian, tidak ada konten yang berguna buat pencari
// umum, dan noindex ini juga mengurangi trafik bot acak yang bisa memakan
// jatah rate-limit endpoint /api/public/track.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TrackingPage() {
  return <TrackingPageClient />;
}
