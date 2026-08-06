# DJOKER Sablon Kaos — Supply Chain Management System

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

## Yang sudah jadi (fungsional, bukan mockup statis)
- Login/logout pakai Supabase Auth
- Proteksi route dashboard via middleware (redirect otomatis kalau belum login)
- Dashboard admin: stat cards, grafik produksi, donut status pesanan — semua narik data live dari Supabase
- Modul **Supplier**: CRUD lengkap (tambah/edit/hapus/cari) — jadikan ini contoh pola untuk modul lain
- Modul lain (Gudang, Pesanan, Produksi, QC, Packing, Pengiriman, Laporan, Pengaturan): sudah terhubung ke tabel Supabase masing-masing dan menampilkan data, tapi form CRUD-nya belum — tinggal copy pola dari `app/dashboard/supplier/`
- Skema database lengkap untuk SEMUA modul di `supabase/schema.sql`, termasuk RLS (Row Level Security)

## Langkah setup

### 1. Buat project Supabase
1. Buka https://supabase.com → New Project
2. Buka **SQL Editor** → paste seluruh isi file `supabase/schema.sql` → Run
3. Buka **Authentication → Providers** → pastikan Email aktif
4. Buat 1 user admin lewat **Authentication → Users → Add user** (email + password), supaya bisa login pertama kali
5. Ambil `Project URL` dan `anon public key` dari **Project Settings → API**

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

## Cara menambahkan modul CRUD baru (misal: Gudang)
Pola CRUD Supplier di `app/dashboard/supplier/SupplierTable.tsx` sudah mencakup:
tabel, search, tambah, edit, hapus, modal form — semuanya connect langsung ke Supabase lewat `createClient()` dari `lib/supabase/client.ts`.

Untuk modul lain: duplikasi file itu, ganti nama tabel (`suppliers` → `raw_materials`, dst) dan field form-nya sesuai kolom di `supabase/schema.sql`.

## Struktur folder penting
```
app/
  login/page.tsx              -> halaman login
  dashboard/layout.tsx        -> sidebar + topbar (semua modul pakai ini)
  dashboard/page.tsx          -> dashboard admin
  dashboard/supplier/         -> contoh modul CRUD lengkap
  dashboard/gudang|pesanan|.. -> modul lain (read-only, siap dikembangkan)
lib/supabase/client.ts        -> koneksi Supabase sisi browser
lib/supabase/server.ts        -> koneksi Supabase sisi server
middleware.ts                 -> proteksi route dashboard
supabase/schema.sql           -> skema database lengkap
```

## Yang belum dibuat (butuh iterasi lanjutan)
- Halaman 03 (Alur Supply Chain visual/infografis), 07 (drag progress produksi), 11 (tracking pelanggan publik), 14 (upload desain ke Supabase Storage)
- Ini semua bisa dibangun menyusul — beri tahu saya modul mana yang paling prioritas, saya lanjutkan.
