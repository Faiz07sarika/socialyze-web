/**
 * Socialyze Agency - In-Website Checkout & E-Wallet Integration
 * ==============================================================
 */

import { saveOrder } from "./supabase.js";

// Package Dataset
const packageData = {
    starter: {
        id: "starter",
        name: "Paket Starter",
        subtitle: "Branding Lite & Visual Identity",
        rawPrice: 700000,
        formattedPrice: "Rp 700.000",
        renewal: "Perpanjangan Rp 300rb/tahun",
        description: "Cocok untuk Anda yang baru memulai bisnis dan membutuhkan logo & identitas visual sederhana yang praktis.",
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
        formattedPrice: "Rp 1.600.000",
        renewal: "Perpanjangan Rp 500rb/tahun",
        description: "Paket ini ideal untuk Anda yang membutuhkan kelola media sosial dengan fitur konten rutin & kreatif.",
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
        formattedPrice: "Rp 2.500.000",
        renewal: "Perpanjangan Rp 750rb/tahun",
        description: "Paket ideal untuk Anda yang membutuhkan strategi bisnis profil lengkap & iklan digital untuk akselerasi.",
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
        formattedPrice: "Rp 4.000.000",
        renewal: "Perpanjangan Rp 1.2Juta/tahun",
        description: "Paket ini ideal untuk Anda yang membutuhkan website, konten kompleks, dan desain unik serta menarik.",
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

// Payment Methods Config
const paymentMethods = {
    gopay: { name: "GoPay", type: "E-Wallet", logo: "🟢 GoPay", feePercent: 0 },
    dana: { name: "DANA", type: "E-Wallet", logo: "🔵 DANA", feePercent: 0 },
    ovo: { name: "OVO", type: "E-Wallet", logo: "🟣 OVO", feePercent: 0 },
    qris: { name: "QRIS", type: "Instant Scan", logo: "📲 QRIS", feePercent: 0 },
    shopeepay: { name: "ShopeePay", type: "E-Wallet", logo: "🟠 ShopeePay", feePercent: 0 },
    kartu: { name: "Kartu Kredit/Debit", type: "Bank Card", logo: "💳 Kartu", feePercent: 0 }
};

// Global State
let selectedPackageKey = "silver";
let selectedPaymentMethod = "gopay";
let paymentTimerInterval = null;
let currentActiveOrder = null;

// Expose handlers to window immediately
window.openCheckoutModal = openCheckoutModal;
window.selectPaymentMethod = selectPaymentMethod;
window.processPaymentCheckout = processPaymentCheckout;
window.processPaymentWithMethod = processPaymentWithMethod;
window.completePaymentSimulation = completePaymentSimulation;
window.closeAllModals = closeAllModals;

document.addEventListener("DOMContentLoaded", () => {
    initCheckoutFlow();
    initWhatsAppPopup();
    initSmoothScroll();
});

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElem = document.querySelector(targetId);
                if (targetElem) {
                    e.preventDefault();
                    targetElem.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

/* ==========================================================================
   CHECKOUT FLOW & PAYMENT SYSTEM
   ========================================================================== */
function initCheckoutFlow() {
    // Backdrop click listeners (only close if clicking backdrop background directly)
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                closeAllModals();
            }
        });
    });

    // Close Modal Button Listeners
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            closeAllModals();
        });
    });

    // Payment Method Option Cards Clickers
    document.querySelectorAll(".payment-opt-card").forEach(card => {
        card.addEventListener("click", () => {
            const methodKey = card.getAttribute("data-method");
            if (methodKey) selectPaymentMethod(methodKey);
        });
    });

    // Submit Checkout Form
    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            processPaymentCheckout();
        });
    }

    // Simulate Pay Success Button Click
    const simulatePayBtn = document.getElementById("simulatePaySuccessBtn");
    if (simulatePayBtn) {
        simulatePayBtn.addEventListener("click", (e) => {
            e.preventDefault();
            completePaymentSimulation();
        });
    }

    // Close Modals on ESC key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAllModals();
    });
}

export function openCheckoutModal(packageKey) {
    const pkg = packageData[packageKey] || packageData.silver;
    selectedPackageKey = pkg.id;

    // Fill Summary Card (Right Side matching ChatGPT UI screenshot 2)
    const titleElem = document.getElementById("chkPkgTitle");
    const subtitleElem = document.getElementById("chkPkgSubtitle");
    const basePriceElem = document.getElementById("chkBasePrice");
    const vatElem = document.getElementById("chkVatAmount");
    const totalElem = document.getElementById("chkTotalAmount");

    if (titleElem) titleElem.textContent = pkg.name;
    if (subtitleElem) subtitleElem.textContent = pkg.subtitle;
    if (basePriceElem) basePriceElem.textContent = formatRupiah(pkg.rawPrice);
    
    // VAT 11%
    const vatAmount = Math.round(pkg.rawPrice * 0.11);
    const totalAmount = pkg.rawPrice + vatAmount;
    
    if (vatElem) vatElem.textContent = formatRupiah(vatAmount);
    if (totalElem) totalElem.textContent = formatRupiah(totalAmount);

    // Fill Feature Items
    const featureContainer = document.getElementById("chkFeatureList");
    if (featureContainer) {
        featureContainer.innerHTML = "";
        pkg.features.forEach(feat => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span class="chk-feat-icon">✨</span>
                <span>${feat}</span>
            `;
            featureContainer.appendChild(li);
        });
    }

    // Reset default payment method selector
    selectPaymentMethod("gopay");

    // Open Modal
    const checkoutModal = document.getElementById("checkoutModal");
    if (checkoutModal) {
        checkoutModal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

export function selectPaymentMethod(methodKey) {
    if (!paymentMethods[methodKey]) return;
    selectedPaymentMethod = methodKey;

    document.querySelectorAll(".payment-opt-card").forEach(card => {
        if (card.getAttribute("data-method") === methodKey) {
            card.classList.add("selected");
        } else {
            card.classList.remove("selected");
        }
    });

    const methodDetailBox = document.getElementById("paymentMethodInstruction");
    if (methodDetailBox) {
        methodDetailBox.innerHTML = `
            <p><strong>Metode terpilih:</strong> ${paymentMethods[methodKey].name} (${paymentMethods[methodKey].type})</p>
            <small>Setelah penyerahan, Anda akan dialihkan untuk menyelesaikan langkah pembayaran secara instan & aman.</small>
        `;
    }
}

export function processPaymentWithMethod(methodKey) {
    selectPaymentMethod(methodKey);
    processPaymentCheckout();
}

export function processPaymentCheckout() {
    const nameInput = document.getElementById("customerNameInput");
    const emailInput = document.getElementById("customerEmailInput");
    const phoneInput = document.getElementById("customerPhoneInput");

    let customerName = nameInput ? nameInput.value.trim() : "";
    let customerEmail = emailInput ? emailInput.value.trim() : "";
    let customerPhone = phoneInput ? phoneInput.value.trim() : "";

    if (!customerName) customerName = "MUHAMMAD CHAIDIR ALI";
    if (!customerEmail) customerEmail = "chaidir@socialyze.com";
    if (!customerPhone) customerPhone = "081234567890";

    const pkg = packageData[selectedPackageKey] || packageData.silver;
    const vatAmount = Math.round(pkg.rawPrice * 0.11);
    const totalAmount = pkg.rawPrice + vatAmount;
    const invoiceId = "INV-2026-" + Math.floor(100000 + Math.random() * 900000);

    currentActiveOrder = {
        invoiceId,
        packageName: pkg.name,
        packageSubtitle: pkg.subtitle,
        packagePrice: pkg.rawPrice,
        vatAmount,
        totalAmount,
        paymentMethod: paymentMethods[selectedPaymentMethod] ? paymentMethods[selectedPaymentMethod].name : "GoPay",
        paymentType: paymentMethods[selectedPaymentMethod] ? paymentMethods[selectedPaymentMethod].type : "E-Wallet",
        customerName,
        customerEmail,
        customerPhone
    };

    // Close Checkout Modal
    const checkoutModal = document.getElementById("checkoutModal");
    if (checkoutModal) checkoutModal.classList.remove("active");

    // Open Payment Gateway Simulator Modal
    openPaymentGatewaySimulator(currentActiveOrder);
}

function openPaymentGatewaySimulator(order) {
    const paymentModal = document.getElementById("paymentModal");
    if (!paymentModal) return;

    const invElem = document.getElementById("payModalInvoiceId");
    const totalElem = document.getElementById("payModalTotal");
    const methodElem = document.getElementById("payModalMethodName");

    if (invElem) invElem.textContent = order.invoiceId;
    if (totalElem) totalElem.textContent = formatRupiah(order.totalAmount);
    if (methodElem) methodElem.textContent = order.paymentMethod;

    // QRIS QR Code Generator Display
    const qrImageContainer = document.getElementById("qrisQrImage");
    if (qrImageContainer) {
        const qrSvg = `
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="white"/>
                <!-- QR Code Corners -->
                <rect x="15" y="15" width="50" height="50" fill="#000"/>
                <rect x="25" y="25" width="30" height="30" fill="#fff"/>
                <rect x="33" y="33" width="14" height="14" fill="#000"/>
                <rect x="135" y="15" width="50" height="50" fill="#000"/>
                <rect x="145" y="25" width="30" height="30" fill="#fff"/>
                <rect x="153" y="33" width="14" height="14" fill="#000"/>
                <rect x="15" y="135" width="50" height="50" fill="#000"/>
                <rect x="25" y="145" width="30" height="30" fill="#fff"/>
                <rect x="33" y="153" width="14" height="14" fill="#000"/>
                <!-- Random QR Grid Patterns -->
                <rect x="80" y="20" width="15" height="15" fill="#000"/>
                <rect x="100" y="35" width="20" height="15" fill="#000"/>
                <rect x="20" y="80" width="15" height="25" fill="#000"/>
                <rect x="45" y="90" width="25" height="15" fill="#000"/>
                <rect x="85" y="85" width="30" height="30" fill="#6b0b0d"/>
                <circle cx="100" cy="100" r="8" fill="#d5de85"/>
                <rect x="130" y="80" width="20" height="20" fill="#000"/>
                <rect x="160" y="90" width="25" height="15" fill="#000"/>
                <rect x="80" y="135" width="25" height="15" fill="#000"/>
                <rect x="120" y="150" width="25" height="25" fill="#000"/>
                <rect x="155" y="140" width="25" height="25" fill="#000"/>
            </svg>
        `;
        qrImageContainer.innerHTML = qrSvg;
    }

    // Start 15 minute countdown
    startTimer(15 * 60, document.getElementById("payTimerCount"));

    paymentModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function startTimer(durationSeconds, displayElem) {
    if (paymentTimerInterval) clearInterval(paymentTimerInterval);
    let timer = durationSeconds;

    const updateDisplay = () => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        if (displayElem) {
            displayElem.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
        if (--timer < 0) {
            clearInterval(paymentTimerInterval);
            if (displayElem) displayElem.textContent = "WAKTU HABIS";
        }
    };

    updateDisplay();
    paymentTimerInterval = setInterval(updateDisplay, 1000);
}

export async function completePaymentSimulation() {
    if (!currentActiveOrder) {
        console.warn("No current active order found!");
        return;
    }
    if (paymentTimerInterval) clearInterval(paymentTimerInterval);

    let saveResult = { success: true, mode: "local" };
    try {
        saveResult = await saveOrder(currentActiveOrder);
    } catch (err) {
        console.error("Save order error:", err);
    }

    // Close Payment Modal
    const paymentModal = document.getElementById("paymentModal");
    if (paymentModal) paymentModal.classList.remove("active");

    // Open Success Invoice Modal
    openInvoiceModal(currentActiveOrder, saveResult ? saveResult.mode : "local");
}

function openInvoiceModal(order, saveMode) {
    const invoiceModal = document.getElementById("invoiceModal");
    if (!invoiceModal) return;

    const invNum = document.getElementById("invNumber");
    const invDate = document.getElementById("invDate");
    const invName = document.getElementById("invCustomerName");
    const invEmail = document.getElementById("invCustomerEmail");
    const invPkg = document.getElementById("invPkgName");
    const invPay = document.getElementById("invPaymentMethod");
    const invBase = document.getElementById("invBasePrice");
    const invVat = document.getElementById("invVatPrice");
    const invTotal = document.getElementById("invTotalPrice");
    const dbStatusElem = document.getElementById("invDbStatus");

    if (invNum) invNum.textContent = order.invoiceId;
    if (invDate) invDate.textContent = new Date().toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
    if (invName) invName.textContent = order.customerName;
    if (invEmail) invEmail.textContent = order.customerEmail;
    if (invPkg) invPkg.textContent = `${order.packageName} (${order.packageSubtitle})`;
    if (invPay) invPay.textContent = `${order.paymentMethod} (${order.paymentType})`;
    if (invBase) invBase.textContent = formatRupiah(order.packagePrice);
    if (invVat) invVat.textContent = formatRupiah(order.vatAmount);
    if (invTotal) invTotal.textContent = formatRupiah(order.totalAmount);
    
    if (dbStatusElem) {
        dbStatusElem.textContent = saveMode === "supabase" 
            ? "⚡ Tersimpan di Supabase Cloud Database" 
            : "📦 Transaksi Sukses & Tersimpan di Storage";
    }

    invoiceModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

export function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    document.body.style.overflow = "";
    if (paymentTimerInterval) clearInterval(paymentTimerInterval);
}

function formatRupiah(num) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}

/* ==========================================================================
   FLOATING WHATSAPP POPUP CONSULTATION LOGIC
   ========================================================================== */
function initWhatsAppPopup() {
    const trigger = document.getElementById("waPopupTrigger");
    const popup = document.getElementById("waPopupBox");
    const closeBtn = document.getElementById("waPopupClose");
    const badge = document.getElementById("waBadge");
    const sendBtn = document.getElementById("waSendBtn");
    const inputField = document.getElementById("waInputField");
    const presetBtns = document.querySelectorAll(".wa-preset-btn");

    if (!trigger || !popup) return;

    trigger.addEventListener("click", () => {
        popup.classList.toggle("active");
        if (badge) badge.style.display = "none";
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", () => popup.classList.remove("active"));
    }

    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const msg = btn.getAttribute("data-msg") || btn.textContent.trim();
            window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(msg)}`, "_blank");
        });
    });

    if (sendBtn && inputField) {
        const sendAction = () => {
            const val = inputField.value.trim();
            if (val.length > 0) {
                window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(val)}`, "_blank");
                inputField.value = "";
            }
        };
        sendBtn.addEventListener("click", sendAction);
        inputField.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendAction();
            }
        });
    }
}
