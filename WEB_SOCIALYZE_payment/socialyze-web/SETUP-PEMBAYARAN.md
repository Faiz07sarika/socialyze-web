# Setup Pembayaran Socialyze (Midtrans Snap)

Metode yang aktif: GoPay, DANA, OVO, ShopeePay, QRIS, Transfer Bank (VA).

## 1. Akun Midtrans
1. Daftar di https://dashboard.midtrans.com, pilih environment **Sandbox** dulu.
2. Settings > Access Keys: salin **Server Key** dan **Client Key**.
3. Settings > Payment > Snap Preferences: aktifkan GoPay, ShopeePay, QRIS, Bank Transfer (DANA/OVO
   tergantung persetujuan akun Anda; kalau belum aktif, metode itu tidak akan muncul di Snap).
4. Settings > Payment > **Notification URL**: `https://DOMAIN-ANDA/api/midtrans-notification`

## 2. Deploy (Vercel)
1. Upload folder ini ke GitHub, import ke https://vercel.com (framework: Vite).
2. Isi Environment Variables sesuai `.env.example`, lalu Deploy.
3. Test lokal: `npm i -g vercel` lalu `vercel dev` (perintah `npm run dev` biasa TIDAK menjalankan folder /api).

## 3. Test (Sandbox)
Buka `/checkout.html?plan=gold`, isi data, bayar. Simulator pembayaran Midtrans:
https://simulator.sandbox.midtrans.com

## 4. Go-live
Selesaikan verifikasi bisnis di Midtrans, ganti ke Server/Client Key **Production**,
set `MIDTRANS_IS_PRODUCTION=true`, dan daftarkan Notification URL di dashboard Production.

## 5. Simpan order ke Supabase (opsional)
Jalankan `supabase-schema.sql`, lalu isi `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` di Vercel.
Service role key hanya untuk server, jangan pernah ditaruh di file frontend.

## Catatan
- Harga: server memakai `api/_packages.js`. Jika harga diubah, ubah juga di `checkout.js` & `index.html`.
- Nomor WhatsApp di `checkout.html` (`6281234567890`) masih contoh, ganti dengan nomor admin.
