// Cek status order langsung ke Midtrans (dipakai halaman checkout setelah popup ditutup / redirect balik).
import { CORE_API, authHeader, serverKey, mapStatus } from "./_midtrans.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const orderId = String(req.query.order_id || "");
  if (!/^[A-Za-z0-9_-]{5,50}$/.test(orderId)) return res.status(400).json({ error: "order_id tidak valid" });
  if (!serverKey()) return res.status(500).json({ error: "Server key belum diatur" });

  try {
    const r = await fetch(`${CORE_API}/v2/${orderId}/status`, {
      headers: { Accept: "application/json", Authorization: authHeader() },
    });
    const tx = await r.json().catch(() => ({}));
    if (tx.status_code === "404") return res.status(404).json({ error: "Order tidak ditemukan" });
    return res.status(200).json({
      orderId, status: mapStatus(tx), paymentType: tx.payment_type || null, amount: tx.gross_amount || null,
    });
  } catch (e) {
    return res.status(502).json({ error: "Gagal cek status" });
  }
}
