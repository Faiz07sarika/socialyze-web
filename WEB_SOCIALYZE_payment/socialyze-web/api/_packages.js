// Sumber harga yang DIPERCAYA (server-side). Harga dari browser tidak pernah dipakai.
// Jika mengubah harga, ubah juga di checkout.js (hanya untuk tampilan) dan index.html.
export const PACKAGES = {
  starter:  { name: "Paket Starter",  price: 700000 },
  silver:   { name: "Paket Silver",   price: 1600000 },
  gold:     { name: "Paket Gold",     price: 2500000 },
  platinum: { name: "Paket Platinum", price: 4000000 },
};

// Metode di halaman checkout -> kode `enabled_payments` Midtrans Snap
export const METHODS = {
  gopay:     { label: "GoPay",         enabled: ["gopay"] },
  dana:      { label: "DANA",          enabled: ["dana"] },
  ovo:       { label: "OVO",           enabled: ["ovo"] },
  shopeepay: { label: "ShopeePay",     enabled: ["shopeepay"] },
  qris:      { label: "QRIS",          enabled: ["other_qris"] },
  kartu:     { label: "Transfer Bank", enabled: ["bank_transfer"] },
};
