import { createClient } from "@/lib/supabase/server";
import { Shirt } from "lucide-react";
import ProdukTable from "./ProdukTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function ProdukPage() {
  const supabase = createClient();

  const [
    { data: products, error: productsError },
    { data: rawMaterials, error: rawMaterialsError },
  ] = await Promise.all([
    supabase.from("products").select("*").order("nama_produk", { ascending: true }),
    supabase.from("raw_materials").select("id, nama_bahan, satuan").order("nama_bahan", { ascending: true }),
  ]);

  if (productsError) console.error("Produk products fetch error:", productsError.message);
  if (rawMaterialsError) console.error("Produk rawMaterials fetch error:", rawMaterialsError.message);
  const fetchErrorMsg = [productsError?.message, rawMaterialsError?.message].filter(Boolean).join("; ") || null;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Katalog"
        icon={Shirt}
        title="Produk"
        subtitle="Kelola daftar produk & resep bahan baku, supaya stok gudang otomatis terpotong saat pesanan dibuat."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

      <ProdukTable initialProducts={products ?? []} rawMaterials={rawMaterials ?? []} />
    </div>
  );
}
