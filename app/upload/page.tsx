import type { Metadata } from "next";
import UploadPageClient from "./UploadPageClient";

export const dynamic = "force-dynamic";

// Sama seperti halaman login/tracking -- form upload publik ini tidak
// perlu terindeks Google, dan noindex mengurangi trafik bot acak yang
// bisa memakan jatah rate-limit endpoint /api/public/upload-desain.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function UploadPage() {
  return <UploadPageClient />;
}
