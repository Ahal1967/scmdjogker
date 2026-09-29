import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Jaring pengaman untuk tautan reset password: kalau Supabase mengirim
  // pengguna ke Site URL (root "/") karena redirectTo belum/tidak dikenali
  // di daftar Redirect URLs dashboard, jangan buang parameter recovery-nya
  // (code/type=recovery) dengan langsung redirect polos ke /login -- lempar
  // dulu ke halaman reset password yang benar sambil membawa parameternya.
  if (searchParams.type === "recovery") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") params.set(key, value);
    }
    redirect(`/auth/reset-password?${params.toString()}`);
  }

  redirect("/login");
}
