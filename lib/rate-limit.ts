import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cek dan catat percobaan akses ke endpoint publik, batasi berapa kali
 * boleh dicoba dalam rentang waktu tertentu per alamat IP.
 *
 * @param identifier alamat IP pemanggil
 * @param endpoint nama endpoint, mis. "track" atau "upload"
 * @param maxAttempts maksimal percobaan yang diizinkan
 * @param windowMinutes rentang waktu (menit) untuk hitungan di atas
 * @returns true kalau MASIH boleh lanjut, false kalau sudah kena limit
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if ((count ?? 0) >= maxAttempts) {
    return false;
  }

  await supabase.from("rate_limits").insert({ identifier, endpoint });
  return true;
}

/** Ambil alamat IP pemanggil dari header request (aman dipakai di Vercel). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
