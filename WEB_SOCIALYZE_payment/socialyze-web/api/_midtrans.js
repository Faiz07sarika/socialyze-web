import crypto from "node:crypto";

const env = (k) => (process.env[k] || "").trim();

export const IS_PRODUCTION = env("MIDTRANS_IS_PRODUCTION") === "true";
export const SNAP_API   = IS_PRODUCTION ? "https://app.midtrans.com/snap/v1/transactions"
                                        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
export const SNAP_JS    = IS_PRODUCTION ? "https://app.midtrans.com/snap/snap.js"
                                        : "https://app.sandbox.midtrans.com/snap/snap.js";
export const CORE_API   = IS_PRODUCTION ? "https://api.midtrans.com"
                                        : "https://api.sandbox.midtrans.com";

export const serverKey = () => env("MIDTRANS_SERVER_KEY");
export const clientKey = () => env("MIDTRANS_CLIENT_KEY");

export function authHeader() {
  return "Basic " + Buffer.from(serverKey() + ":").toString("base64");
}

/** Validasi signature notifikasi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey) */
export function validSignature(n) {
  if (!n || !n.signature_key) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey()}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(n.signature_key));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Terjemahkan status Midtrans -> PAID | PENDING | FAILED | EXPIRED */
export function mapStatus(tx) {
  const s = tx.transaction_status;
  if (s === "settlement") return "PAID";
  if (s === "capture") return tx.fraud_status === "challenge" ? "PENDING" : "PAID";
  if (s === "pending" || s === "authorize") return "PENDING";
  if (s === "expire") return "EXPIRED";
  return "FAILED"; // deny, cancel, failure, refund, dst.
}

/* ---------- Supabase (opsional, hanya dari server, pakai service role key) ---------- */
const sbUrl = () => env("SUPABASE_URL").replace(/\/$/, "");
const sbKey = () => env("SUPABASE_SERVICE_ROLE_KEY");
export const supabaseEnabled = () => !!(sbUrl() && sbKey());

async function sb(path, method, body, extraHeaders = {}) {
  const r = await fetch(`${sbUrl()}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: sbKey(),
      Authorization: `Bearer ${sbKey()}`,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

export const insertOrder = (row) =>
  supabaseEnabled() ? sb("orders", "POST", row, { Prefer: "return=minimal" }) : Promise.resolve();

export const updateOrder = (invoiceId, patch) =>
  supabaseEnabled()
    ? sb(`orders?invoice_id=eq.${encodeURIComponent(invoiceId)}`, "PATCH",
         { ...patch, updated_at: new Date().toISOString() }, { Prefer: "return=minimal" })
    : Promise.resolve();
