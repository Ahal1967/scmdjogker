/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // Cuma target halaman-halaman utama, BUKAN /_next/static (JS/CSS/gambar
        // ter-hash) yang memang harus tetap di-cache lama demi performa.
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        // Sebelumnya no-store total -- setiap klik menu wajib fetch ulang
        // dari nol walau halaman itu baru saja dibuka, bikin navigasi
        // kerasa berat. Sekarang dikasih jendela cache pendek (5 detik,
        // private ke browser masing-masing user, bukan shared/CDN cache)
        // supaya klik bolak-balik antar menu terasa instan, sambil tetap
        // otomatis nge-refresh diam-diam di background (stale-while-
        // revalidate) begitu jendela itu lewat. Halaman-halaman ini juga
        // sudah dynamic (pakai cookies()), jadi tetap selalu fetch data
        // asli dari Supabase begitu cache-nya expired -- bukan di-cache
        // permanen.
        source: "/dashboard/:path*",
        headers: [{ key: "Cache-Control", value: "private, max-age=5, stale-while-revalidate=30" }],
      },
      {
        source: "/tracking",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/upload",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

module.exports = nextConfig;
