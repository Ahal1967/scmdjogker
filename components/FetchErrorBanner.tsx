/* Banner kecil buat ditaruh di halaman-halaman dashboard (Server Component)
   kalau query awal ke Supabase gagal. Sebelumnya kegagalan ini nggak pernah
   dicek sama sekali di 10 dari 11 halaman dashboard -- query gagal cuma
   berujung tabel kosong tanpa indikasi apa pun ke user bahwa itu KEGAGALAN,
   bukan memang datanya kosong. Dipakai bareng console.error di sisi server
   supaya juga kelacak di log deployment (Vercel dsb), bukan cuma di layar. */
export default function FetchErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      Gagal memuat sebagian data: {message}. Coba muat ulang halaman; kalau masih gagal, cek koneksi ke Supabase.
    </div>
  );
}
