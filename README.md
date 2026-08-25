# DJOKER Sablon Kaos — Supply Chain Management System

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

## Yang sudah jadi (fungsional, bukan mockup statis)
- Login/logout pakai Supabase Auth, dengan pembatasan percobaan login (5x gagal = lockout 15 menit) lewat Route Handler `/api/auth/login`
- Proteksi route dashboard via middleware (redirect otomatis kalau belum login)
- Dashboard admin: stat cards, grafik produksi, donut status pesanan, notifikasi (pesanan baru, pembayaran belum lunas, QC bermasalah, stok kritis) — semua narik data live dari Supabase
- CRUD lengkap di SEMUA modul (Supplier, Gudang, Produk, Pesanan, Produksi, QC, Packing, Pengiriman, Laporan, Pengaturan) — bukan cuma Supplier lagi
- Resep Bahan (BOM) per produk: mendefinisikan bahan baku + kuantitas per unit produk, dengan pemotongan stok otomatis saat pesanan dibuat dan pengembalian stok otomatis saat pesanan dihapus
- Status pesanan/produksi bisa diklik-ubah langsung dari tabel lewat dropdown custom (bukan `<select>` native)
- Halaman Produksi: toggle tampilan Tabel / Papan — Papan berupa board drag-and-drop (kolom Produksi/QC/Packing/Selesai), geser kartu antar kolom untuk ubah status, efeknya identik dengan ubah lewat dropdown di tabel (progress ikut ter-update, status pesanan induk tersinkron, tercatat di riwayat)
- Export data ke Excel (Laporan, Pesanan, Gudang) dan PDF (Laporan)
- Halaman publik: tracking pesanan pelanggan (`/tracking`) dan upload desain kaos ke Supabase Storage (`/upload`)
- Dark mode (true black), loading skeleton per halaman, tabel dengan sorting/pencarian/pagination
- Skema database lengkap untuk SEMUA modul di `supabase/schema.sql` + migrasi tambahan di `supabase/migration_*.sql`, termasuk RLS (Row Level Security) aktif di semua tabel
- Halaman Alur Supply Chain (03): 9 tahap ditampilkan sebagai diagram berkelok (snake) dengan panah penghubung antar tahap di layar besar (desktop), otomatis berubah jadi daftar vertikal dengan panah ke bawah di layar sempit (mobile/tablet) supaya tetap gampang dibaca

## Langkah setup

### 1. Buat project Supabase
1. Buka https://supabase.com → New Project
2. Buka **SQL Editor** → paste seluruh isi file `supabase/schema.sql` → Run
3. Jalankan juga SEMUA file `supabase/migration_*.sql` satu per satu (urutan sesuai tanggal file, lihat properti file) — ini bukan opsional, beberapa fitur (login lockout, resep bahan/BOM, pembatasan role) tidak akan jalan tanpa migrasi ini
4. Buka **Authentication → Providers** → pastikan Email aktif
5. Buat 1 user admin lewat **Authentication → Users → Add user** (email + password), supaya bisa login pertama kali
6. Ambil `Project URL` dan `anon public key` dari **Project Settings → API**

### 2. Setup project di VS Code
```bash
# masuk ke folder project
cd djoker-scm

# install dependencies
npm install

# copy env file lalu isi dengan URL & key dari Supabase
cp .env.local.example .env.local
```

Isi `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### 3. Jalankan
```bash
npm run dev
```
Buka http://localhost:3000 → otomatis redirect ke `/login`.

## Cara menambahkan modul CRUD baru
Semua modul sekarang sudah punya CRUD lengkap dengan pola yang konsisten — lihat contoh mana pun di `app/dashboard/<modul>/<Modul>Table.tsx` (tabel, search, sort, pagination, tambah/edit/hapus, modal form, semuanya connect langsung ke Supabase lewat `createClient()` dari `lib/supabase/client.ts`). Untuk modul baru: duplikasi file yang paling mirip kebutuhannya, ganti nama tabel dan field form-nya sesuai kolom di `supabase/schema.sql`.

## Struktur folder penting
```
app/
  login/page.tsx              -> halaman login
  dashboard/layout.tsx        -> sidebar + topbar (semua modul pakai ini)
  dashboard/page.tsx          -> dashboard admin
  dashboard/supplier|gudang|produk|pesanan|produksi|qc|packing|pengiriman|laporan|pengaturan/
                               -> semua modul, masing-masing CRUD lengkap
lib/supabase/client.ts        -> koneksi Supabase sisi browser
lib/supabase/server.ts        -> koneksi Supabase sisi server
middleware.ts                 -> proteksi route dashboard
supabase/schema.sql           -> skema database lengkap
```

## Yang belum dibuat (butuh iterasi lanjutan)
Tidak ada lagi item yang tersisa dari daftar sebelumnya — semua sudah dikerjakan (drag-and-drop Produksi dan diagram berkelok Alur Supply Chain). Kalau nanti ada kebutuhan baru, catat di sini.

## Dependency baru yang perlu di-install
- `@dnd-kit/core` (drag-and-drop Papan Produksi) — jalankan `npm install` setelah pull perubahan ini, jangan cuma `npm run dev` langsung kalau `package.json` berubah.
