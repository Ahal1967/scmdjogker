import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

// Halaman login internal tidak perlu & tidak seharusnya muncul di hasil
// pencarian Google -- selain tidak relevan buat pelanggan umum, ini juga
// mengurangi trafik bot acak ke form login publik.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
