/**
 * Socialyze Agency - Dedicated Checkout Page Logic (`checkout.js`)
 * ===============================================================
 * Pembayaran asli via Midtrans Snap. Harga & status dikontrol server (folder /api).
 * Harga di file ini HANYA untuk tampilan; server memakai harga sendiri.
 */

// Package Dataset
const packageData = {
    starter: {
        id: "starter",
        name: "Paket Starter",
        subtitle: "Branding Lite & Visual Identity",
        rawPrice: 700000,
        features: [
            "2 Konsep Logo Profesional & Modern",
            "File Master Vector Complete (PNG, SVG, JPG)",
            "Panduan Warna (Color Palette) & Tipografi Brand",
            "Mockup Kartu Nama / Label Visual Produk",
            "1x Revisi Mayor & 2x Revisi Minor"
        ]
    },
    silver: {
        id: "silver",
        name: "Paket Silver",
        subtitle: "Social Media & Content Growth",
        rawPrice: 1600000,
        features: [
            "12 Konten Feed Kreatif Instagram & TikTok",
            "4 Short Video Reels / TikTok HD Editing",
            "Copywriting & Riset Hashtag Target Market",
            "Desain Template Feed Khas Brand Kamu",
            "Content Calendar & Scheduling Post",
            "2x Revisi Konten per Bulan"
        ]
    },
    gold: {
        id: "gold",
        name: "Paket Gold",
        subtitle: "Full Creative & Digital Marketing Growth",
        rawPrice: 2500000,
        features: [
            "Full Branding & Visual Identity Master Kit",
            "20 Konten Feed (Carousel & Graphics)",
            "8 Editing Short Video Reels / TikTok Creative",
            "Setup & Direct Management Meta/TikTok Ads",
            "Dedicated Creative Account Manager",
            "Laporan Analytics & Evaluasi Performa"
        ]
    },
    platinum: {
        id: "platinum",
        name: "Paket Platinum",
        subtitle: "Custom Digital Agency Solutions",
        rawPrice: 4000000,
        features: [
            "Solusi Agency Full-Service Custom",
            "Full Rebranding & Logo Master Kit",
            "30 Konten Medsos Complete (Feed + Reels + Story)",
            "Website Landing Page High Conversion",
            "Setup & Optimization Campaign Ads Complete",
            "Laporan Analytics & Strategy Meeting Mingguan"
        ]
    }
};

const paymentMethods = {
    gopay: { name: "GoPay" },
    dana: { name: "DANA" },
    ovo: { name: "OVO" },
    shopeepay: { name: "ShopeePay" },
    qris: { name: "QRIS" },
    kartu: { name: "Transfer Bank" }
};

let activePackageKey = "gold";
let activePaymentMethod = "gopay";
let isPaying = false;

window.selectPaymentMethod = selectPaymentMethod;
window.processCheckoutPayment = processCheckoutPayment;
window.closeAllModals = closeAllModals;

document.addEventListener("DOMContentLoaded", () => {
    parseUrlPackage();
    initPaymentSelectors();
    selectPaymentMethod(activePaymentMethod);
    document.querySelectorAll(".modal-backdrop").forEach(b =>
        b.addEventListener("click", e => { if (e.target === b) closeAllModals(); }));
    checkReturnFromPayment();
});

function parseUrlPackage() {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan") || "gold";
    activePackageKey = packageData[planParam] ? planParam : "gold";
    renderPackageSummary(activePackageKey);
}

function renderPackageSummary(pkgKey) {
    const pkg = packageData[pkgKey];
    if (!pkg) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("summaryTitle", pkg.name);
    set("summarySubtitle", pkg.subtitle);
    set("summaryTotal", formatRupiah(pkg.rawPrice));

    const featuresElem = document.getElementById("summaryFeatures");
    if (featuresElem) {
        featuresElem.innerHTML = "";
        pkg.features.forEach(feat => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="chk-feat-icon">✨</span> <span>${feat}</span>`;
            featuresElem.appendChild(li);
        });
    }
}

function initPaymentSelectors() {
    document.querySelectorAll(".payment-opt-card").forEach(card => {
        card.addEventListener("click", () => {
            const key = card.getAttribute("data-method");
            if (key) selectPaymentMethod(key);
        });
    });
}

function selectPaymentMethod(methodKey) {
    if (!paymentMethods[methodKey]) return;
    activePaymentMethod = methodKey;
    document.querySelectorAll(".payment-opt-card").forEach(card => {
        card.classList.toggle("selected", card.getAttribute("data-method") === methodKey);
    });
    const box = document.getElementById("paymentMethodInstruction");
    if (box) {
        box.innerHTML = `<p>Setelah mengeklik tombol Bayar Sekarang, jendela pembayaran aman Midtrans akan terbuka untuk membayar via <strong>${paymentMethods[methodKey].name}</strong>.</p>`;
    }
}

/* ---------- Pembayaran ---------- */

async function processCheckoutPayment() {
    if (isPaying) return;

    const form = document.getElementById("checkoutPageForm");
    if (form && !form.reportValidity()) return;

    const payload = {
        plan: activePackageKey,
        method: activePaymentMethod,
        name: document.getElementById("custName").value.trim(),
        email: document.getElementById("custEmail").value.trim(),
        phone: document.getElementById("custPhone").value.trim()
    };

    setLoading(true);
    try {
        const res = await fetch("/api/create-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran.");

        await loadSnap(data.snapJsUrl, data.clientKey);

        window.snap.pay(data.token, {
            onSuccess: () => showStatusFromServer(data.orderId),
            onPending: () => showStatusFromServer(data.orderId),
            onError: () => showStatus("failed", data.orderId),
            onClose: () => setLoading(false)
        });
    } catch (err) {
        console.error(err);
        alert(err.message || "Terjadi kesalahan. Coba lagi.");
        setLoading(false);
    }
}

let snapLoading = null;
function loadSnap(url, clientKey) {
    if (window.snap) return Promise.resolve();
    if (snapLoading) return snapLoading;
    snapLoading = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.setAttribute("data-client-key", clientKey);
        s.onload = resolve;
        s.onerror = () => { snapLoading = null; reject(new Error("Gagal memuat sistem pembayaran Midtrans.")); };
        document.head.appendChild(s);
    });
    return snapLoading;
}

function setLoading(on) {
    isPaying = on;
    document.querySelectorAll(".btn-checkout-submit").forEach(btn => {
        if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
        btn.disabled = on;
        btn.textContent = on ? "Memproses..." : btn.dataset.label;
    });
}

/* ---------- Status pembayaran ---------- */

// Status resmi ditanyakan ke server (yang bertanya ke Midtrans), bukan dipercaya dari browser.
async function showStatusFromServer(orderId) {
    try {
        const res = await fetch(`/api/order-status?order_id=${encodeURIComponent(orderId)}`);
        const data = await res.json();
        showStatus(res.ok ? data.status.toLowerCase() : "pending", orderId);
    } catch {
        showStatus("pending", orderId);
    }
}

// Jika dialihkan balik dari e-wallet/bank, URL berisi order_id
function checkReturnFromPayment() {
    const orderId = new URLSearchParams(window.location.search).get("order_id");
    if (orderId) showStatusFromServer(orderId);
}

const STATUS_VIEW = {
    paid:    { icon: "🎉", title: "Pembayaran Berhasil!", color: "#16a34a", label: "✓ LUNAS (Paid)",
               msg: "Terima kasih! Pembayaran Anda telah diterima. Tim kami akan segera menghubungi WhatsApp Anda." },
    pending: { icon: "⏳", title: "Menunggu Pembayaran", color: "#d97706", label: "⏳ MENUNGGU",
               msg: "Pesanan Anda sudah dibuat. Selesaikan pembayaran sesuai instruksi; status akan diperbarui otomatis setelah dana kami terima." },
    failed:  { icon: "⚠️", title: "Pembayaran Gagal", color: "#dc2626", label: "✕ GAGAL",
               msg: "Pembayaran tidak berhasil. Silakan coba lagi atau pilih metode pembayaran lain." },
    expired: { icon: "⌛", title: "Pembayaran Kedaluwarsa", color: "#dc2626", label: "✕ KEDALUWARSA",
               msg: "Batas waktu pembayaran sudah lewat. Silakan buat pesanan baru." }
};

function showStatus(kind, orderId) {
    const v = STATUS_VIEW[kind] || STATUS_VIEW.pending;
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set("statusIcon", v.icon);
    set("statusTitle", v.title);
    set("statusMessage", v.msg);
    set("statusOrderId", orderId);
    const badge = document.getElementById("statusBadge");
    if (badge) { badge.textContent = v.label; badge.style.color = v.color; }

    const wa = document.getElementById("statusWaLink");
    if (wa) wa.style.display = (kind === "paid" || kind === "pending") ? "block" : "none";

    setLoading(false);
    const modal = document.getElementById("statusModal");
    if (modal) modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    document.body.style.overflow = "";
    // bersihkan ?order_id dari URL agar refresh tidak memunculkan modal lagi
    const url = new URL(window.location.href);
    if (url.searchParams.has("order_id")) {
        ["order_id", "status_code", "transaction_status"].forEach(k => url.searchParams.delete(k));
        history.replaceState({}, "", url);
    }
}

function formatRupiah(num) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}
