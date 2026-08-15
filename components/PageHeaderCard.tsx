import type { LucideIcon } from "lucide-react";

/* Card header halaman -- dipakai di semua 12 halaman dashboard supaya
   desainnya cuma dibangun sekali di sini dan otomatis konsisten di
   mana-mana. Tiap halaman cuma perlu kasih badge/ikon/judul/subjudul sendiri.
   Dekorasi kanan (.page-hero-deco) berupa watermark ikon halaman itu sendiri
   (bukan lagi cincin+blob+titik) -- dipilih user karena lebih tematik: tiap
   halaman otomatis dapat watermark ikon yang beda sesuai `icon` prop yang
   sudah dikirim buat badge, jadi tidak perlu prop tambahan. Ditandai
   aria-hidden karena murni visual. */
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
      <div className="page-hero-deco" aria-hidden="true">
        <Icon className="page-hero-watermark" strokeWidth={1.5} />
      </div>
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
