import * as XLSX from "xlsx";

// Helper export Excel yang dipakai bareng di beberapa tabel dashboard
// (Laporan, Pesanan, Gudang, dst). Sengaja format .xlsx (bukan .csv)
// karena library "xlsx" ini sudah ter-install duluan tapi belum pernah
// dipakai di kode manapun -- dan .xlsx lebih enak dibuka langsung di
// Excel/Google Sheets buat laporan/pembukuan dibanding .csv (yang suka
// berantakan koma/titik ribuan kalau dibuka di Excel versi lokal ID).
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
