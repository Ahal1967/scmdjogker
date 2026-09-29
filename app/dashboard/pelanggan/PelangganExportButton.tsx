"use client";

// SUDAH TIDAK DIPAKAI -- awalnya file ini dibuat sebagai wrapper Client
// Component supaya exportColumns (isinya fungsi) tidak perlu didefinisikan
// langsung di pelanggan/page.tsx (Server Component), yang sempat bikin
// error RSC "Functions cannot be passed directly to Client Components".
// Sekarang tombol Export sudah dipindah lagi ke dalam PelangganTable.tsx
// (yang MEMANG sudah "use client" dari awal, di samping kolom cari nama /
// no. telepon), jadi wrapper terpisah kayak ini sudah tidak diperlukan.
// File ini dibiarkan ada (bukan dihapus) karena keterbatasan tooling sesi
// ini tidak bisa menghapus file di komputer user -- aman dihapus manual.

import ExportButtons, { type ExportColumn } from "@/components/ExportButtons";

type PelangganExportRow = {
  nama: string;
  no_telepon: string | null;
  totalPesanan: number;
  totalBelanja: number;
};

export default function PelangganExportButton({ dataPelanggan }: { dataPelanggan: PelangganExportRow[] }) {
  const exportColumns: ExportColumn<PelangganExportRow>[] = [
    { header: "Nama Pelanggan", value: (c) => c.nama },
    { header: "No. Telepon", value: (c) => c.no_telepon || "-" },
    { header: "Total Pesanan", value: (c) => c.totalPesanan },
    { header: "Total Belanja Diterima", value: (c) => c.totalBelanja },
  ];

  return (
    <ExportButtons
      data={dataPelanggan}
      filename="daftar-pelanggan"
      sheetName="Daftar Pelanggan"
      pdfTitle="Daftar Pelanggan"
      columns={exportColumns}
    />
  );
}
