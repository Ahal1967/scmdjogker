import Image from "next/image";

/* Kolom paling kiri tiap tabel dulu cuma <th className="w-10"></th> kosong
   (spacer buat ikon baris di bawahnya) -- user minta diisi logo DJOGKER
   biar nggak keliatan kosong. Ditarik jadi 1 komponen kecil dipakai ulang
   di 10 tabel, biar konsisten dan kalau logonya mau diganti nanti cukup
   diubah di 1 tempat ini saja. */
export default function TableLogoCell() {
  return (
    <th className="w-10">
      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
        <Image
          src="/images/logodjogker1.jpeg"
          alt="DJOGKER"
          width={16}
          height={16}
          className="object-contain"
        />
      </span>
    </th>
  );
}
