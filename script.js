/**
 * ==============================================================================
 * SPLITLY & TIPWISE - INTERACTIVE TIP CALCULATOR & CURRENCY CONVERTER
 * ==============================================================================
 * Full feature parity with Splitly reference + User Template Navigation & Design:
 *  - Tab navigation (Tip Calculator, Currency Converter, DevTools Guide)
 *  - Real-time bill splitting & tip calculation with per-person breakdown
 *  - 20 Global Currencies with flag icons & formatted currency symbols
 *  - 3-Tier resilient live exchange rate fallback (Cloudflare, jsDelivr, open.er-api)
 *  - Manual rate backup accordion for offline/restricted environments
 *  - Instant currency swap with animation
 *  - 1-Click Copy-to-Clipboard with animated toast feedback
 *  - Dark / Light Theme switching with persistent localStorage
 *  - DevTools console integration with window.debugSplitly() & live output simulator
 * ==============================================================================
 */

"use strict";

/* ==============================================================================
   1. CURRENCY DATABASE (20 GLOBAL CURRENCIES)
   ============================================================================== */
const currencyNames = {
  INR: "🇮🇳 India — INR",
  USD: "🇺🇸 United States — USD",
  EUR: "🇪🇺 Euro Area — EUR",
  GBP: "🇬🇧 United Kingdom — GBP",
  AED: "🇦🇪 United Arab Emirates — AED",
  JPY: "🇯🇵 Japan — JPY",
  CAD: "🇨🇦 Canada — CAD",
  AUD: "🇦🇺 Australia — AUD",
  SGD: "🇸🇬 Singapore — SGD",
  CHF: "🇨🇭 Switzerland — CHF",
  SAR: "🇸🇦 Saudi Arabia — SAR",
  CNY: "🇨🇳 China — CNY",
  KRW: "🇰🇷 South Korea — KRW",
  NZD: "🇳🇿 New Zealand — NZD",
  MYR: "🇲🇾 Malaysia — MYR",
  THB: "🇹🇭 Thailand — THB",
  ZAR: "🇿🇦 South Africa — ZAR",
  BDT: "🇧🇩 Bangladesh — BDT",
  NPR: "🇳🇵 Nepal — NPR",
  PKR: "🇵🇰 Pakistan — PKR"
};

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  CHF: "CHF",
  SAR: "SAR",
  CNY: "¥",
  KRW: "₩",
  NZD: "NZ$",
  MYR: "RM",
  THB: "฿",
  ZAR: "R",
  BDT: "৳",
  NPR: "रू",
  PKR: "₨"
};

/* ==============================================================================
   2. DOM ELEMENT SHORTCUT & TOAST HELPER
   ============================================================================== */
const $ = (id) => document.getElementById(id);

let toastTimeout = null;
function showToast(message) {
  const toast = $("toast");
  const msgEl = $("toast-message");
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.add("show");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function copyText(text, label = "Value") {
  if (!navigator.clipboard) {
    showToast("Clipboard not supported");
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied ${label}: ${text}`);
  }).catch(() => {
    showToast("Failed to copy");
  });
}

/* ==============================================================================
   3. NAVIGATION TABS CONTROLLER (USER TEMPLATE)
   ============================================================================== */
const tabButtons = document.querySelectorAll(".nav-tabs .tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetPanelId = btn.getAttribute("aria-controls");

    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabPanels.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");

    const targetPanel = $(targetPanelId);
    if (targetPanel) {
      targetPanel.classList.add("active");
    }
  });
});

/* ==============================================================================
   4. THEME TOGGLE (DARK / LIGHT WITH PERSISTENCE)
   ============================================================================== */
const themeToggle = $("theme-toggle");
const THEME_KEY = "tipwise_theme_pref";

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    showToast(`Switched to ${nextTheme} theme`);
  });
}
initTheme();

/* ==============================================================================
   5. POPULATE SELECT MENUS (20 CURRENCIES)
   ============================================================================== */
for (const id of ["tipCurrency", "from", "to"]) {
  const selectEl = $(id);
  if (!selectEl) continue;
  selectEl.innerHTML = "";
  for (const [code, name] of Object.entries(currencyNames)) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    selectEl.appendChild(opt);
  }
}

if ($("tipCurrency")) $("tipCurrency").value = "INR";
if ($("from")) $("from").value = "INR";
if ($("to")) $("to").value = "USD";

function updateBillPrefix() {
  const c = $("tipCurrency") ? $("tipCurrency").value : "INR";
  const sym = currencySymbols[c] || c;
  if ($("billSymbol")) {
    $("billSymbol").textContent = sym;
  }
  const billInput = $("bill");
  if (billInput) {
    if (sym.length >= 3) {
      billInput.style.paddingLeft = "64px";
    } else if (sym.length === 2) {
      billInput.style.paddingLeft = "54px";
    } else {
      billInput.style.paddingLeft = "48px";
    }
  }
}
if ($("tipCurrency")) {
  $("tipCurrency").addEventListener("change", updateBillPrefix);
}
updateBillPrefix();

/* ==============================================================================
   6. FORMATTING HELPERS
   ============================================================================== */
function money(value, code) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${currencySymbols[code] || code} ${Number(value).toFixed(2)}`;
  }
}

/* ==============================================================================
   7. TIP CALCULATOR ENGINE
   ============================================================================== */
function syncChips() {
  const currentTip = Number($("tip").value);
  for (const b of document.querySelectorAll("[data-tip]")) {
    b.classList.toggle("active", Number(b.dataset.tip) === currentTip);
  }
}

function calcTip() {
  const billVal = $("bill").value.trim();
  const tipVal = $("tip").value.trim();
  const peopleVal = $("people").value.trim();

  const bill = Number(billVal);
  const tip = Number(tipVal);
  const people = Number(peopleVal);

  if (
    !billVal ||
    !tipVal ||
    !peopleVal ||
    !Number.isFinite(bill) ||
    bill < 0 ||
    !Number.isFinite(tip) ||
    tip < 0 ||
    tip > 100 ||
    !Number.isInteger(people) ||
    people < 1
  ) {
    $("tipError").textContent = "Enter a valid bill, tip (0–100%) and people (at least 1).";
    $("tipAmount").textContent = "—";
    $("total").textContent = "—";
    $("perPerson").textContent = "—";
    if ($("billPerPerson")) $("billPerPerson").textContent = "—";
    if ($("tipPerPerson")) $("tipPerPerson").textContent = "—";
    return;
  }

  $("tipError").textContent = "";
  const t = (bill * tip) / 100;
  const total = bill + t;
  const perPerson = total / people;
  const billPerP = bill / people;
  const tipPerP = t / people;
  const c = $("tipCurrency").value;

  $("tipAmount").textContent = money(t, c);
  $("total").textContent = money(total, c);
  $("perPerson").textContent = money(perPerson, c);
  if ($("billPerPerson")) $("billPerPerson").textContent = money(billPerP, c);
  if ($("tipPerPerson")) $("tipPerPerson").textContent = money(tipPerP, c);
}

// Preset chips event listeners
for (const b of document.querySelectorAll("[data-tip]")) {
  b.addEventListener("click", () => {
    $("tip").value = b.dataset.tip;
    syncChips();
    calcTip();
  });
}

// Quick presets for bill amount (+100, +500, +1000)
for (const p of document.querySelectorAll("[data-add-bill]")) {
  p.addEventListener("click", () => {
    const add = Number(p.dataset.addBill);
    const current = Number($("bill").value) || 0;
    $("bill").value = Math.max(0, current + add);
    calcTip();
  });
}

// Steppers for people count
if ($("people-minus")) {
  $("people-minus").addEventListener("click", () => {
    const cur = Number($("people").value) || 1;
    if (cur > 1) {
      $("people").value = cur - 1;
      calcTip();
    }
  });
}
if ($("people-plus")) {
  $("people-plus").addEventListener("click", () => {
    const cur = Number($("people").value) || 1;
    $("people").value = cur + 1;
    calcTip();
  });
}

// Auto recalculate on any input change
for (const id of ["bill", "tip", "people", "tipCurrency"]) {
  const el = $(id);
  if (el) {
    el.addEventListener("input", () => {
      syncChips();
      calcTip();
    });
  }
}

if ($("calculateTip")) {
  $("calculateTip").addEventListener("click", calcTip);
}

if ($("resetTip")) {
  $("resetTip").addEventListener("click", () => {
    $("tipCurrency").value = "INR";
    $("bill").value = "1200";
    $("tip").value = "10";
    $("people").value = "2";
    updateBillPrefix();
    syncChips();
    calcTip();
    showToast("Tip calculator reset to default");
  });
}

/* ==============================================================================
   8. CURRENCY CONVERTER ENGINE (3-TIER LIVE RATE API FALLBACK)
   ============================================================================== */
let rates = null;
let rateBase = "";
let rateDate = "";
let rateSource = "";
let loading = false;
let manualMode = false;

function status(message, kind = "") {
  if (!$("status")) return;
  $("status").textContent = message;
  $("status").className = "status-bar " + kind;
}

function syncManualLabels() {
  if ($("manualFrom")) $("manualFrom").textContent = $("from").value;
  if ($("manualTo")) $("manualTo").textContent = $("to").value;
  if ($("manualFromLabel")) $("manualFromLabel").textContent = $("from").value;
  if ($("manualToLabel")) $("manualToLabel").textContent = $("to").value;
}

function updateBenchmarks() {
  if (!rates) return;
  const inr = rates["inr"];
  const eur = rates["eur"];
  const gbp = rates["gbp"];
  const aed = rates["aed"];

  if ($("bench-inr") && inr) $("bench-inr").textContent = `₹${inr.toFixed(2)}`;
  if ($("bench-eur") && eur) $("bench-eur").textContent = `€${eur.toFixed(4)}`;
  if ($("bench-gbp") && gbp) $("bench-gbp").textContent = `£${gbp.toFixed(4)}`;
  if ($("bench-aed") && aed) $("bench-aed").textContent = `AED ${aed.toFixed(2)}`;
}

function convert() {
  const amountVal = $("amount").value.trim();
  const amount = Number(amountVal);
  const from = $("from").value;
  const to = $("to").value;

  if (!amountVal || !Number.isFinite(amount) || amount < 0) {
    $("converted").textContent = "Invalid amount";
    $("detail").textContent = "Enter an amount of 0 or more.";
    return;
  }

  if (from === to) {
    $("converted").textContent = money(amount, to);
    $("detail").textContent = "Same currency — no exchange rate needed.";
    return;
  }

  if (manualMode) {
    const r = Number($("manualRate").value);
    if (!Number.isFinite(r) || r <= 0) {
      $("converted").textContent = "Enter manual rate";
      $("detail").textContent = "Manual rate must be greater than zero.";
      return;
    }
    const convertedAmount = amount * r;
    $("converted").textContent = money(convertedAmount, to);
    $("detail").textContent = `MANUAL rate: 1 ${from} = ${r} ${to} (entered by user, not live)`;
    return;
  }

  if (!rates) {
    $("converted").textContent = loading ? "Loading rates…" : "Rates unavailable";
    $("detail").textContent = "Online sources not reachable. Retry, or expand the manual-rate backup.";
    return;
  }

  const a = rates[from.toLowerCase()];
  const b = rates[to.toLowerCase()];

  if (!(a > 0 && b > 0)) {
    $("converted").textContent = "Rate unavailable";
    $("detail").textContent = "This currency pair was not included in the downloaded data.";
    return;
  }

  const rate = b / a;
  const convertedAmount = amount * rate;
  $("converted").textContent = money(convertedAmount, to);
  $("detail").textContent = `1 ${from} = ${rate.toLocaleString("en-US", { maximumSignificantDigits: 9 })} ${to} · ${rateDate} · ${rateSource}`;
}

async function fetchJson(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw Error("HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function validDate(value) {
  if (!value) return false;
  const t = Date.parse(value);
  return (
    Number.isFinite(t) &&
    t <= Date.now() + 86400000 &&
    Date.now() - t < 8 * 86400000
  );
}

function validateRates(data) {
  return (
    data &&
    Object.keys(currencyNames).every(
      (code) =>
        Number.isFinite(data[code.toLowerCase()]) &&
        data[code.toLowerCase()] > 0
    )
  );
}

async function attemptSource(source) {
  let data, date, table;
  if (source === 0) {
    const x = await fetchJson(
      "https://latest.currency-api.pages.dev/v1/currencies/usd.json"
    );
    data = x.usd;
    date = x.date;
    table = data;
  } else if (source === 1) {
    const x = await fetchJson(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
    );
    data = x.usd;
    date = x.date;
    table = data;
  } else {
    const x = await fetchJson("https://open.er-api.com/v6/latest/USD");
    if (x.result !== "success" || x.base_code !== "USD")
      throw Error("Invalid API response");
    table = Object.fromEntries(
      Object.entries(x.rates).map(([k, v]) => [k.toLowerCase(), v])
    );
    date = x.time_last_update_utc;
  }

  if (!validDate(date) || !validateRates(table)) {
    throw Error("Missing or outdated rate information");
  }

  return {
    table,
    date,
    source: [
      "Currency API (Cloudflare)",
      "Currency API (jsDelivr)",
      "ExchangeRate-API",
    ][source],
  };
}

let requestId = 0;
async function loadRates() {
  const id = ++requestId;
  loading = true;
  manualMode = false;
  rates = null;
  status("Checking exchange-rate providers…");
  convert();

  const syncIcon = $("refresh-icon");
  if (syncIcon) syncIcon.style.animation = "spin 1s linear infinite";

  for (let i = 0; i < 3; i++) {
    try {
      status(`Trying rate source ${i + 1} of 3…`);
      const result = await attemptSource(i);
      if (id !== requestId) return;
      rates = result.table;
      rateDate = result.date.slice(0, 16);
      rateSource = result.source;
      loading = false;
      status("Rates loaded · " + rateDate + " · " + rateSource, "ok");
      if (syncIcon) syncIcon.style.animation = "";
      updateBenchmarks();
      convert();
      return;
    } catch (e) {
      console.warn("Rate source attempt failed:", i + 1, e.message);
    }
  }

  if (id !== requestId) return;
  loading = false;
  if (syncIcon) syncIcon.style.animation = "";
  status(
    "Online rates could not load. Check connection or use Manual Rate below.",
    "error"
  );
  convert();
}

if ($("convert")) $("convert").addEventListener("click", convert);
if ($("refresh")) {
  $("refresh").addEventListener("click", () => {
    loadRates();
    showToast("Refreshing live exchange rates…");
  });
}

if ($("swap")) {
  $("swap").addEventListener("click", () => {
    const old = $("from").value;
    $("from").value = $("to").value;
    $("to").value = old;
    manualMode = false;
    syncManualLabels();
    convert();
  });
}

for (const id of ["from", "to"]) {
  if ($(id)) {
    $(id).addEventListener("change", () => {
      manualMode = false;
      syncManualLabels();
      convert();
    });
  }
}

if ($("amount")) $("amount").addEventListener("input", convert);

// Quick amount chips (10k, 100k, 500k)
for (const btn of document.querySelectorAll("[data-set-amount]")) {
  btn.addEventListener("click", () => {
    $("amount").value = btn.dataset.setAmount;
    convert();
  });
}

if ($("manualConvert")) {
  $("manualConvert").addEventListener("click", () => {
    manualMode = true;
    status("Manual rate in use — this is not a live rate.");
    convert();
    showToast("Applied manual exchange rate");
  });
}

if ($("manualRate")) {
  $("manualRate").addEventListener("input", () => {
    if (manualMode) convert();
  });
}

// Result copy buttons listeners
if ($("copy-tip-amount")) {
  $("copy-tip-amount").addEventListener("click", () => {
    copyText($("tipAmount").textContent, "Tip amount");
  });
}
if ($("copy-total-bill")) {
  $("copy-total-bill").addEventListener("click", () => {
    copyText($("total").textContent, "Total bill");
  });
}
if ($("copy-per-person")) {
  $("copy-per-person").addEventListener("click", () => {
    copyText($("perPerson").textContent, "Per person share");
  });
}
if ($("copy-converted")) {
  $("copy-converted").addEventListener("click", () => {
    copyText($("converted").textContent, "Converted amount");
  });
}

/* ==============================================================================
   9. DEVTOOLS DEBUGGING INTEGRATION (USER TEMPLATE)
   ============================================================================== */
window.debugSplitly = function () {
  console.group("🚀 [Splitly Studio Debugger] Current State & Metrics");
  console.log("Rates loaded:", !!rates);
  console.log("Active Source:", rateSource || "None");
  console.log("Last Rate Date:", rateDate || "N/A");
  console.log("Manual Mode Active:", manualMode);

  console.table({
    "Tip Currency": $("tipCurrency").value,
    "Bill Amount": $("bill").value,
    "Tip (%)": $("tip").value,
    "People Count": $("people").value,
    "Computed Tip": $("tipAmount").textContent,
    "Computed Total": $("total").textContent,
    "Per Person": $("perPerson").textContent,
  });

  console.table({
    "Convert Amount": $("amount").value,
    "From": $("from").value,
    "To": $("to").value,
    "Converted Value": $("converted").textContent,
    "Detail Rate": $("detail").textContent,
  });
  console.groupEnd();
  return "State dumped to console.table successfully!";
};

window.debugAppState = window.debugSplitly;

if ($("btn-trigger-test-log")) {
  $("btn-trigger-test-log").addEventListener("click", () => {
    const output = [
      `[DevTools Simulator] ${new Date().toLocaleTimeString()} - Trace Log:`,
      `> Tip Currency: ${$("tipCurrency").value} | Bill: ${$("bill").value} | Tip%: ${$("tip").value}% | People: ${$("people").value}`,
      `> Computed: Tip = ${$("tipAmount").textContent} | Total = ${$("total").textContent} | Per Person = ${$("perPerson").textContent}`,
      `> FX Conversion: ${$("amount").value} ${$("from").value} -> ${$("converted").textContent}`,
      `> Rate Info: ${$("detail").textContent}`,
      `> Status: ${$("status").textContent.trim()}`
    ].join("\n");

    const screen = $("console-screen-output");
    if (screen) {
      screen.textContent = output;
    }
    window.debugSplitly();
    showToast("DevTools test log triggered in console");
  });
}

/* ==============================================================================
   10. INITIALIZATION
   ============================================================================== */
syncManualLabels();
syncChips();
calcTip();
loadRates();
