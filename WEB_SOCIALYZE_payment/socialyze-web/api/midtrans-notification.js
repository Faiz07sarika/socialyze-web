// Webhook Midtrans. Daftarkan URL: https://DOMAIN-ANDA/api/midtrans-notification
// di Midtrans Dashboard > Settings > Payment > Notification URL.
// INI sumber kebenaran status bayar (bukan tombol/callback di browser).
import { validSignature, mapStatus, updateOrder } from "./_midtrans.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const n = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!validSignature(n)) {
    console.warn("Signature notifikasi tidak valid:", n.order_id);
    return res.status(403).json({ error: "Invalid signature" });
  }

  const status = mapStatus(n);
  try {
    await updateOrder(n.order_id, {
      status,
      payment_type: n.payment_type || null,
      midtrans_transaction_id: n.transaction_id || null,
      paid_at: status === "PAID" ? (n.settlement_time || n.transaction_time || new Date().toISOString()) : null,
    });
  } catch (e) {
    console.error("Gagal update order:", e.message);
    return res.status(500).json({ error: "DB error" }); // Midtrans akan retry
  }
  return res.status(200).json({ ok: true, order_id: n.order_id, status });
}
