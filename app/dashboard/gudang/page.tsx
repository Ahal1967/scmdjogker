import { createClient } from "@/lib/supabase/server";

export default async function GudangPage() {
  const supabase = createClient();

  const { data: bahan } = await supabase
    .from("raw_materials")
    .select("*")
    .order("nama_bahan", { ascending: true });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Gudang</h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola stok bahan baku produksi.
        </p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Jenis Bahan
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {bahan?.length ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Stok
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {bahan?.reduce((sum, b) => sum + (Number(b.stok) || 0), 0) ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Stok Terendah
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {Math.min(...(bahan?.map((b) => Number(b.stok) || 0) ?? [0]))}
          </p>
        </div>
      </div>

      {/* Tabel Bahan */}
      <div className="card overflow-x-auto">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="text-base font-semibold text-black md:text-lg">Daftar Bahan Baku</h2>
          {/* Kalau nanti ada tombol tambah, bisa ditaruh di sini */}
        </div>

        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th>Nama Bahan</th>
                <th>Stok</th>
                <th>Satuan</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {bahan?.map((b: any) => (
                <tr key={b.id}>
                  <td className="font-semibold text-black">{b.nama_bahan || "-"}</td>
                  <td className="text-sm text-gray-700">{Number(b.stok) || 0}</td>
                  <td className="text-sm text-gray-600">{b.satuan || "-"}</td>
                  <td className="max-w-[10rem] truncate text-sm text-gray-600 md:max-w-xs">
                    {b.keterangan || "-"}
                  </td>
                </tr>
              ))}
              {(!bahan || bahan.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-6 md:py-8">
                    Belum ada data bahan baku.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}