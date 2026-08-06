import { createClient } from "@/lib/supabase/server";

export default async function PackingPage() {
  const supabase = createClient();

  const { data: produksis } = await supabase
    .from("production")
    .select("*, orders(no_pesanan)")
    .eq("status", "Packing")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Packing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Packing – siapkan pesanan untuk dikirim ke pelanggan.
        </p>
      </div>

      {!produksis || produksis.length === 0 ? (
        <div className="card flex min-h-[16rem] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <p className="text-base font-medium text-black">
              Tidak ada produksi yang menunggu Packing saat ini
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Semua pesanan sudah dipacking atau belum ada produksi.
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th>No. Produksi</th>
                <th>No. Pesanan</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Terakhir Update</th>
              </tr>
            </thead>
            <tbody>
              {produksis.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-semibold text-black">{p.no_produksi || "-"}</td>
                  <td className="text-sm text-gray-700">
                    {(p.orders as any)?.no_pesanan || "-"}
                  </td>
                  <td>
                    <span className="badge text-blue-600">{p.status}</span>
                  </td>
                  <td className="text-sm text-gray-700">{p.progress ?? 0}%</td>
                  <td className="text-sm text-gray-600">
                    {p.updated_at
                      ? new Date(p.updated_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}