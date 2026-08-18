import type { createClient } from "@/lib/supabase/client";

// Tanpa 0/O/1/I/L -- huruf/angka yang gampang ketuker kalau dibaca manual
// (misal pas pelanggan nyalin dari WA buat dimasukkan ke halaman lacak).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

/* Dipakai buat generate no_pesanan/no_produksi/no_qc/no_packing -- semua
   diganti dari nomor urut (DJ00001, PRO-0001, QC-0001, PK-0001) ke kode
   acak, atas permintaan user, supaya tidak bisa ditebak orang lain. Nomor
   urut lama gampang di-enumerasi (contoh: no_pesanan sempat bisa "discan"
   lewat /api/public/track, endpoint publik di belakang halaman lacak
   pesanan, yang cuma butuh no_pesanan tanpa verifikasi tambahan apa pun).
   Kode acak 6 karakter dari 32 simbol (~1 miliar kemungkinan) bikin
   tebak-tebakan itu praktis mustahil. Dicek dulu ke database sebelum
   dipakai (retry kalau kebetulan bentrok) supaya tetap dijamin unik,
   bukan cuma mengandalkan peluang kecil. Satu fungsi dipakai bareng di
   semua tabel (Pesanan, Produksi, QC, Packing) supaya logikanya cuma ada
   di 1 tempat -- sebelumnya sempat ke-duplikat manual di PesananTable.tsx
   sendiri, sekarang ditarik ke sini. */
export async function generateUniqueCode(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  prefix: string,
  length = 6
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = prefix + randomCode(length);
    const { data } = await supabase.from(table).select("id").eq(column, candidate).maybeSingle();
    if (!data) return candidate;
  }
  // Fallback super-langka: kalau 5x percobaan tetap bentrok (praktis
  // mustahil dengan keyspace segini), tambahin potongan timestamp biar
  // pasti unik daripada gagal total nyimpen data.
  return prefix + randomCode(length) + Date.now().toString(36).slice(-4).toUpperCase();
}
