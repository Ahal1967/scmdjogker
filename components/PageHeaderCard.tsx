import type { LucideIcon } from "lucide-react";
import { Calendar, ChevronDown } from "lucide-react";

/* Card header halaman -- dipakai di semua 12 halaman dashboard supaya
   desainnya cuma dibangun sekali di sini dan otomatis konsisten di
   mana-mana. Tiap halaman cuma perlu kasih badge/ikon/judul/subjudul sendiri.
   Watermark ikon besar di pojok kanan sudah dihapus atas permintaan user
   biar tampilan lebih elegan/minimal -- konten sekarang bebas selebar
   card (tidak lagi dibatasi max-width buat kasih ruang watermark). */
export default function PageHeaderCard({
  badge,
  icon: Icon,
  title,
  subtitle,
  showDate,
}: {
  badge: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  // Opsional -- badge tanggal hari ini di pojok kanan atas, sejauh ini
  // cuma dipakai di Dashboard (lihat app/dashboard/page.tsx). SENGAJA
  // murni dekoratif (bukan tombol/dropdown beneran) atas permintaan user
  // -- ikon chevron di sampingnya cuma buat kesan visual "kalender" sesuai
  // referensi yang dikasih, tidak diberi onClick/dropdown, tidak
  // mengubah data apapun di halaman.
  showDate?: boolean;
}) {
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page-hero">
      {showDate && (
        <div className="page-hero-date">
          <Calendar size={13} className="page-hero-date-icon" />
          {today}
          <ChevronDown size={13} className="page-hero-date-icon" />
        </div>
      )}
      <div className="page-hero-content">
        <span className="page-hero-badge">
          <span className="page-hero-badge-icon">
            <Icon size={12} />
          </span>
          {badge}
        </span>
        <h1 className="page-hero-title font-display">{title}</h1>
        <p className="page-hero-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
