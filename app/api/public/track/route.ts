import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const noPesanan = searchParams.get("no_pesanan")?.trim();

  if (!noPesanan) {
    return NextResponse.json({ error: "Nomor pesanan wajib diisi." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, no_pesanan, tanggal, status, total, alamat_pengiriman, desain_url, customers(nama), order_items(nama_produk, jumlah, harga)"
    )
    .ilike("no_pesanan", noPesanan)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const { data: tracking } = await supabase
    .from("order_tracking")
    .select("tahap, waktu, selesai")
    .eq("order_id", order.id)
    .order("waktu", { ascending: true });

  return NextResponse.json({
    order: {
      no_pesanan: order.no_pesanan,
      tanggal: order.tanggal,
      status: order.status,
      total: order.total,
      alamat_pengiriman: order.alamat_pengiriman,
      desain_url: order.desain_url,
      pelanggan: (order.customers as any)?.nama ?? null,
      items: order.order_items ?? [],
    },
    tracking: tracking ?? [],
  });
}
