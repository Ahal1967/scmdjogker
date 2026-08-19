import { createClient } from "@/lib/supabase/server";
import { Shirt } from "lucide-react";
import ProdukTable from "./ProdukTable";
import PageHeaderCard from "@/components/PageHeaderCard";

export default async function ProdukPage() {
  const supabase = createClient();

  const [{ data: products }, { data: rawMaterials }] = await Promise.all([
    supabase.from("products").select("*").order("nama_produk", { ascending: true }),
    supabase.from("raw_materials").select("id, nama_bahan, satuan").order("nama_bahan", { ascending: true }),
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="KATALOG"
        icon={Shirt}
        title="Produk"
        subtitle="Kelola daftar produk & resep bahan baku, supaya stok gudang otomatis terpotong saat pesanan dibuat."
      />

      <ProdukTable initialProducts={products ?? []} rawMaterials={rawMaterials ?? []} />
    </div>
  );
}
