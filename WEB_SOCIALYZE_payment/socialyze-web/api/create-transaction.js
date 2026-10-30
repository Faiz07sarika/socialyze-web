import crypto from "node:crypto";
import { PACKAGES, METHODS } from "./_packages.js";
import {
  SNAP_API, SNAP_JS, authHeader, serverKey, clientKey, insertOrder, supabaseEnabled,
} from "./_midtrans.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!serverKey() || !clientKey()) {
    return res.status(500).json({ error: "Pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY kosong)." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const pkg = PACKAGES[body.plan];
  const method = METHODS[body.method];
  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 100);
  const phone = String(body.phone || "").replace(/[^\d+]/g, "").slice(0, 20);

  if (!pkg) return res.status(400).json({ error: "Paket tidak valid." });
  if (!method) return res.status(400).json({ error: "Metode pembayaran tidak valid." });
  if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email tidak valid." });
  if (phone.replace(/\D/g, "").length < 9) return res.status(400).json({ error: "Nomor HP/WhatsApp tidak valid." });

  const orderId = `SOC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; // < 50 karakter

  const payload = {
    transaction_details: { order_id: orderId, gross_amount: pkg.price },
    item_details: [{ id: body.plan, price: pkg.price, quantity: 1, name: pkg.name }],
    customer_details: { first_name: name, email, phone },
    enabled_payments: method.enabled,
    custom_expiry: { expiry_duration: 60, unit: "minute" },
    callbacks: { finish: `${siteOrigin(req)}/checkout.html?plan=${body.plan}` },
  };

  try {
    const r = await fetch(SNAP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) {
      console.error("Midtrans error:", r.status, data);
      return res.status(502).json({ error: "Gagal membuat transaksi di Midtrans.", detail: data.error_messages || undefined });
    }

    if (supabaseEnabled()) {
      try {
        await insertOrder({
          invoice_id: orderId, customer_name: name, customer_email: email, customer_phone: phone,
          package_name: pkg.name, package_price: pkg.price, payment_method: method.label,
          total_amount: pkg.price, status: "PENDING", snap_token: data.token,
        });
      } catch (e) { console.error("Gagal simpan order ke Supabase:", e.message); }
    }

    return res.status(200).json({ token: data.token, orderId, clientKey: clientKey(), snapJsUrl: SNAP_JS });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Terjadi kesalahan server." });
  }
}
