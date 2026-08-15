/* Comparator generik buat sort kolom tabel -- angka dibandingkan sebagai
   angka, selain itu dibandingkan sebagai teks (case-insensitive), null/
   undefined dianggap string kosong supaya tidak error dan selalu jatuh
   ke urutan paling awal. Dipakai bareng-bareng oleh semua tabel supaya
   perilaku "urutkan naik/turun" konsisten di seluruh halaman. */
export function compareValues(a: unknown, b: unknown, dir: "asc" | "desc"): number {
  const mul = dir === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * mul;
  }

  const as = (a ?? "").toString().toLowerCase();
  const bs = (b ?? "").toString().toLowerCase();
  return as.localeCompare(bs) * mul;
}

export type SortDir = "asc" | "desc";
