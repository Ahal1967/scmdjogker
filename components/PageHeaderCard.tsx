import type { LucideIcon } from "lucide-react";

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
}: {
  badge: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-hero">
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
