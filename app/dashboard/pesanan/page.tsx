import PesananTable from "./PesananTable";

export default function PesananPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Pesanan</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola daftar pesanan pelanggan.</p>
      </div>

      <PesananTable />
    </div>
  );
}
