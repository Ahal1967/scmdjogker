import { createClient } from "@/lib/supabase/server";

const STAGES = [
  { key: "supplier", label: "Supplier", desc: "Pemasok bahan baku" },
  { key: "bahan", label: "Bahan Masuk", desc: "Bahan baku diterima" },
  { key: "gudang", label: "Gudang", desc: "Penyimpanan bahan baku" },
  { key: "pesanan", label: "Pesanan", desc: "Pelanggan membuat pesanan" },
  { key: "produksi", label: "Produksi", desc: "Proses produksi sablon" },
  { key: "qc", label: "QC (Quality Control)", desc: "Pemeriksaan kualitas produk" },
  { key: "packing", label: "Packing", desc: "Pengemasan produk" },
  { key: "pengiriman", label: "Pengiriman", desc: "Produk dikirim ke konsumen" },
  { key: "konsumen", label: "Konsumen", desc: "Produk diterima pelanggan" },
] as const;

export default async function AlurPage() {
  const supabase = createClient();

  const [
    { count: supplierCount },
    { count: bahanCount },
    { data: bahanStok },
    { count: pesananCount },
    { count: produksiCount },
    { count: qcCount },
    { count: packingCount },
    { count: pengirimanCount },
    { count: konsumenCount },
  ] = await Promise.all([
    supabase.from("suppliers").select("*", { count: "exact", head: true }),
    supabase.from("raw_materials").select("*", { count: "exact", head: true }),
    supabase.from("raw_materials").select("stok"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("production").select("*", { count: "exact", head: true }).neq("status", "Selesai"),
    supabase.from("quality_control").select("*", { count: "exact", head: true }),
    supabase.from("packing").select("*", { count: "exact", head: true }),
    supabase.from("shipments").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "Selesai"),
  ]);

  const totalStok = bahanStok?.reduce((sum, b) => sum + (Number(b.stok) || 0), 0) ?? 0;

  const VALUES: Record<string, { value: number; hint: string }> = {
    supplier: { value: supplierCount ?? 0, hint: "supplier aktif" },
    bahan: { value: bahanCount ?? 0, hint: "jenis bahan" },
    gudang: { value: totalStok, hint: "total stok tersedia" },
    pesanan: { value: pesananCount ?? 0, hint: "total pesanan" },
    produksi: { value: produksiCount ?? 0, hint: "sedang diproses" },
    qc: { value: qcCount ?? 0, hint: "sudah diperiksa" },
    packing: { value: packingCount ?? 0, hint: "entri packing" },
    pengiriman: { value: pengirimanCount ?? 0, hint: "pengiriman tercatat" },
    konsumen: { value: konsumenCount ?? 0, hint: "pesanan selesai" },
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          END-TO-END TRACKING
        </span>
        <h1 className="font-display text-2xl font-bold text-black">Alur Supply Chain</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ringkasan tiap tahap dari bahan baku sampai produk diterima pelanggan.
        </p>
      </div>

      <div className="card" style={{ borderLeft: "1px solid #3b82f6" }}>
        <div className="relative">
          {STAGES.map((stage, idx) => (
            <div key={stage.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-display font-bold text-sm shadow-md ring-4 ring-blue-50">
                  {idx + 1}
                </div>
                {idx < STAGES.length - 1 && (
                  <div className="w-0.5 flex-1 bg-blue-100 min-h-[32px]" />
                )}
              </div>
              <div className="pb-6 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div>
                    <p className="text-base font-semibold text-black">{stage.label}</p>
                    <p className="text-xs text-gray-500">{stage.desc}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display text-xl font-bold text-blue-600">
                      {VALUES[stage.key].value}
                    </p>
                    <p className="text-[11px] text-gray-500">{VALUES[stage.key].hint}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
