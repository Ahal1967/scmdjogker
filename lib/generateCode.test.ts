import { describe, expect, test } from "vitest";
import { generateUniqueCode } from "./generateCode";

// generateUniqueCode dipakai buat no_pesanan/no_produksi/no_qc/no_packing --
// bagian keamanan yang sengaja ditulis ulang (lihat migration_randomize_order_codes.sql)
// supaya kode tidak bisa ditebak lewat endpoint publik /api/public/track.
// Test di sini fokus ke 2 hal yang paling penting kalau sampai rusak:
// (1) karakter yang dipakai memang cuma dari alfabet yang dimaksud (tanpa
// 0/O/1/I/L yang gampang ketuker), dan (2) logika retry-kalau-bentrok +
// fallback-nya benar-benar jalan, bukan cuma "kelihatannya" jalan.

// Alfabet yang SEHARUSNYA dipakai (disalin dari CODE_CHARS di generateCode.ts,
// yang tidak di-export -- sengaja ditulis ulang di sini supaya test ini
// benar-benar memverifikasi OUTPUT-nya sesuai kontrak yang didokumentasikan,
// bukan cuma "sama dengan constant yang sama" kalau di-import langsung).
const EXPECTED_CHARSET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;

function makeSupabaseMock(collideForFirstNCalls: number) {
  let calls = 0;
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  calls++;
                  return { data: calls <= collideForFirstNCalls ? { id: "existing-row" } : null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase: supabase as any, getCalls: () => calls };
}

describe("generateUniqueCode", () => {
  test("selalu diawali prefix yang diberikan", async () => {
    const { supabase } = makeSupabaseMock(0);
    const code = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");
    expect(code.startsWith("DJ")).toBe(true);
  });

  test("bagian acak (setelah prefix) cuma pakai karakter dari alfabet yang dimaksud", async () => {
    const { supabase } = makeSupabaseMock(0);
    const code = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");
    const randomPart = code.slice(2); // setelah "DJ"
    expect(randomPart).toMatch(EXPECTED_CHARSET);
    // 0/O/1/I/L eksplisit tidak boleh muncul -- ini yang paling gampang
    // lolos tanpa disadari kalau constant charset-nya sampai ke-edit ulang.
    expect(randomPart).not.toMatch(/[0O1IL]/);
  });

  test("panjang kode = panjang prefix + panjang default (6)", async () => {
    const { supabase } = makeSupabaseMock(0);
    const code = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");
    expect(code.length).toBe(2 + 6);
  });

  test("menghormati parameter length custom", async () => {
    const { supabase } = makeSupabaseMock(0);
    const code = await generateUniqueCode(supabase, "orders", "no_produksi", "PRO-", 8);
    expect(code.length).toBe(4 + 8);
  });

  test("retry ke database kalau kandidat pertama bentrok, sampai dapat yang kosong", async () => {
    const { supabase, getCalls } = makeSupabaseMock(2); // 2x bentrok, ke-3 baru kosong
    const code = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");
    expect(code.startsWith("DJ")).toBe(true);
    expect(code.length).toBe(2 + 6); // bukan fallback, jadi panjangnya tetap normal
    expect(getCalls()).toBe(3);
  });

  test("fallback pakai timestamp kalau 5x percobaan tetap bentrok terus", async () => {
    const { supabase, getCalls } = makeSupabaseMock(999); // selalu bentrok
    const code = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");
    expect(code.startsWith("DJ")).toBe(true);
    // Fallback = prefix + randomCode(6) + 4 char timestamp -> lebih panjang
    // dari jalur normal (prefix + 6), jadi ini bukti fallback-nya kepakai.
    expect(code.length).toBeGreaterThan(2 + 6);
    expect(getCalls()).toBe(5); // cuma nyoba ke DB 5x, tidak lebih
  });
});
