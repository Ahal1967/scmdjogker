import { createClient } from "@/lib/supabase/server";
import PengirimanTable from "./PengirimanTable";

export default async function PengirimanPage() {
  const supabase = createClient();

  const { data: shipments } = await supabase
    .from("shipments")
    .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Pengiriman</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pantau dan kelola pesanan yang sedang dikirim ke pelanggan.
        </p>
      </div>

      <PengirimanTable initialShipments={shipments ?? []} />
    </div>
  );
}
