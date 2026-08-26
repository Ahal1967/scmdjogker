import { defineConfig } from "vitest/config";
import path from "path";

// Konfigurasi minimal -- cuma perlu alias "@/*" (dipakai di HAMPIR SEMUA
// import di proyek ini, lihat tsconfig.json) supaya file test bisa
// import dari lib/komponen dengan cara yang sama seperti kode aplikasinya.
// environment "node" (bukan "jsdom") karena target awal test cuma fungsi
// murni di lib/ (belum ada test untuk komponen React yang butuh DOM).
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
