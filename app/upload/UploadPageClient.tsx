"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Hash, UploadCloud, ImageIcon, X, CheckCircle2, Shirt, Info, MapPin } from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function UploadPageClient() {
  const [noPesanan, setNoPesanan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleRemoveFile(e: React.MouseEvent) {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetForm() {
    setSuccess(false);
    setFile(null);
    setPreview(null);
    setNoPesanan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!noPesanan.trim() || !file) {
      setError("Nomor pesanan dan file wajib diisi.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("no_pesanan", noPesanan.trim());
    formData.append("file", file);

    const res = await fetch("/api/public/upload-desain", {
      method: "POST",
      body: formData,
    });

    const result = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(result?.error ?? "Gagal upload desain.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#000000] px-4 py-8 md:py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(147,197,253,0.5) 0%, transparent 45%), radial-gradient(circle at 0% 100%, rgba(165,180,252,0.35) 0%, transparent 45%)",
        }}
      />

      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Login
          </Link>

          <div className="flex gap-0.5 rounded-full border border-gray-200 dark:border-[#262626] bg-white/70 dark:bg-[#0a0a0a]/70 p-1 shadow-sm">
            <Link
              href="/tracking"
              className="rounded-full px-3 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Lacak Pesanan
            </Link>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              Upload Desain
            </span>
          </div>
        </div>

        <div className="mb-5 text-center">
          {/* Ikon hero -- disamakan dengan halaman Lacak Pesanan (lingkaran
              putih + ikon outline biru), sesuai referensi desain yang
              dikasih user. */}
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#0a0a0a] shadow-md border border-gray-100 dark:border-[#262626]">
            <Shirt size={22} strokeWidth={1.8} className="text-blue-500 dark:text-blue-400" />
          </div>
          <span className="mb-2.5 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 text-[9.5px] font-extrabold tracking-widest text-blue-600 dark:text-blue-300">
            DJOGKER SABLON KAOS
          </span>
          <h1 className="font-display text-lg font-extrabold tracking-tight text-black dark:text-white">
            Upload <span style={{ color: "var(--djoker-blue)" }}>Desain</span> Kaos
          </h1>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-gray-500 dark:text-gray-400">
            Kirim file desain untuk pesanan kamu. Format PNG, JPG, WEBP, atau PDF (maks 10MB).
          </p>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] rounded-[16px] border border-gray-200 dark:border-[#262626] p-4 shadow-lg">
          {success ? (
            <div className="py-2 text-center">
              {/* Sebelumnya pakai style={{...}} inline dengan warna hijau
                  pucat opaque -- sama seperti bug badge status di halaman
                  Lacak Pesanan, warna itu statis dan tidak ikut dark:,
                  jadi di mode gelap tampil sebagai bulatan terang yang
                  "nempel" aneh di atas card gelap. Diganti ke class
                  Tailwind + ring supaya otomatis ikut tema. */}
              <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/60 dark:bg-green-900/30 dark:ring-green-900/20">
                <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" strokeWidth={2.2} />
              </div>
              <p className="text-[15px] font-extrabold text-black dark:text-white">Desain Berhasil Diupload!</p>
              <p className="mx-auto mt-1.5 mb-5 max-w-xs text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
                Tim kami akan meninjau desain untuk pesanan{" "}
                <b className="text-gray-800 dark:text-gray-200">{noPesanan}</b>.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/tracking"
                  className="btn-primary block rounded-[12px] py-2.5 text-center text-[13px]"
                >
                  Lacak Status Pesanan
                </Link>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-outline rounded-[12px] py-2 text-[12.5px]"
                >
                  Upload Desain Lain
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Nomor Pesanan
                </label>
                <div className="relative">
                  <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={noPesanan}
                    onChange={(e) => setNoPesanan(e.target.value)}
                    placeholder="Contoh: DJ00125"
                    className="input-field pl-9 py-2 text-[13px]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  File Desain
                </label>

                {file ? (
                  <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#0a0a0a]/60 p-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      {preview ? (
                        <div className="relative h-full w-full">
                          <Image src={preview} alt="Preview" fill className="object-cover" />
                        </div>
                      ) : (
                        <ImageIcon size={18} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-black dark:text-white">{file.name}</p>
                      <p className="mt-0.5 text-[10.5px] text-gray-400 dark:text-gray-500">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <X size={12} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                      dragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-blue-200 dark:border-[#333333] bg-gradient-to-b from-blue-50/60 to-blue-50/20 dark:from-gray-800/40 dark:to-gray-800/10 hover:border-blue-400"
                    }`}
                  >
                    <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-[#0a0a0a] shadow-md border border-gray-100 dark:border-[#262626]">
                      <UploadCloud size={20} strokeWidth={1.8} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="text-[12.5px] font-bold text-black dark:text-white">Klik atau tarik file ke sini</p>
                    <p className="mt-0.5 text-[10.5px] text-gray-400 dark:text-gray-500">Ukuran maksimal 10MB</p>
                    <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                      {["PNG", "JPG", "WEBP", "PDF"].map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 text-[9.5px] font-bold text-blue-600 dark:text-blue-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3.5 py-2.5 text-[12.5px] text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full rounded-[12px] py-2.5 text-[13px]">
                {loading ? "Mengupload..." : "Upload Desain"}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <div className="mt-3.5 flex items-start gap-2 rounded-[14px] border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/20 p-3">
            <Info size={13} className="mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
            <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
              Pastikan desain yang dikirim sudah sesuai. Tim kami akan memprosesnya secepat mungkin.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-start justify-center gap-1.5 border-t border-gray-100 dark:border-[#262626] pt-3.5 text-center text-[10px] text-gray-400 dark:text-gray-500">
          <MapPin size={11} className="mt-0.5 shrink-0" />
          <div>
            <p>Jl. Wates Km 4,5 Gg. Ablar No 5</p>
            <p>Gamping Kidul RT 03/17 Ambarketawang Sleman, Yogyakarta 55294</p>
          </div>
        </div>
      </div>
    </div>
  );
}
