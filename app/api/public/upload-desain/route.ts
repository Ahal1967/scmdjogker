import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, sesuai batas di mockup
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

// Ekstensi file yang dipakai buat nama penyimpanan HARUS ditarik dari sini
// (Content-Type yang sudah divalidasi di ALLOWED_TYPES di atas), BUKAN dari
// nama file asli kiriman user (file.name) -- nama file itu sepenuhnya bisa
// diatur bebas oleh pengirim request (lewat multipart form field, terpisah
// dari Content-Type-nya), jadi tidak boleh dipercaya mentah-mentah. Sempat
// kepakai "file.name.split('.').pop()" sebelumnya, yang berarti orang bisa
// kirim nama file apa saja (termasuk yang mengandung "/" buat lompat keluar
// dari pola path yang dimaksud, atau ekstensi tidak dikenal) selama
// Content-Type-nya masih lolos whitelist di atas.
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  // Batasi maksimal 5 upload per 10 menit per alamat IP, supaya tidak
  // bisa disalahgunakan buat spam file / boros storage.
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(ip, "upload", 5, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan upload. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();

  const formData = await request.formData().catch(() => null);
  const noPesanan = formData?.get("no_pesanan")?.toString().trim();
  const file = formData?.get("file") as File | null;

  if (!noPesanan || !file) {
    return NextResponse.json({ error: "Nomor pesanan dan file wajib diisi." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file harus PNG, JPG, WEBP, atau PDF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 10MB." }, { status: 400 });
  }

  // 1. Pastikan pesanan ada.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, no_pesanan")
    .ilike("no_pesanan", noPesanan)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  // 2. Upload ke Storage.
  const ext = EXT_BY_TYPE[file.type];
  const path = `${order.no_pesanan}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("desain-kaos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Gagal upload file: " + uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("desain-kaos").getPublicUrl(path);

  // 3. Simpan URL ke order.
  const { error: updateError } = await supabase
    .from("orders")
    .update({ desain_url: publicUrlData.publicUrl })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json(
      { error: "File terupload, tapi gagal menyimpan ke pesanan: " + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
}
