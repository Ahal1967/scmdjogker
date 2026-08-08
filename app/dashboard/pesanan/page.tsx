import PesananTable from "./PesananTable";

export default function PesananPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">TRANSAKSI</span>
        <h1 className="font-display text-2xl font-bold text-black">Pesanan</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola daftar pesanan pelanggan.</p>
      </div>

      <PesananTable />
    </div>
  );
}
