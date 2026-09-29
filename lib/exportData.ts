import * as XLSX from "xlsx";

// SUDAH TIDAK DIPAKAI DI KODE MANAPUN -- dulu ini helper export Excel-only
// yang dipakai Pesanan & Gudang, tapi keduanya (plus 8 modul lain yang
// belum punya export sama sekali) sekarang sudah pindah ke komponen
// components/ExportButtons.tsx yang generik (Excel + PDF sekaligus, 1
// definisi kolom buat dua format) atas permintaan user supaya semua
// modul punya pilihan format yang sama. File ini dibiarkan ada (bukan
// dihapus) karena keterbatasan tooling sesi ini tidak bisa menghapus
// file di komputer user -- kalau mau dibersihkan, file ini aman dihapus
// manual kapan saja.
//
// "rows" harus array of plain object -- key jadi nama kolom di file
// Excel-nya, jadi panggil ini dengan object yang key-nya sudah diberi
// label manusiawi (misal "No. Pesanan" bukan "no_pesanan"), BUKAN
// nge-dump row mentah dari Supabase (yang bisa ada nested object/ID
// teknis yang tidak enak dibaca).
export function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const tanggal = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}-${tanggal}.xlsx`);
}
