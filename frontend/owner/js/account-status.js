
"use strict";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE_URL = "http://localhost:5000/api";
const USE_MOCK_DATA = true;
const MOCK_DATA_URL = "../data/account-status.json";

// Proposed backend endpoints:
// GET /owner/account-status
// GET /owner/verification

const $ = selector => document.querySelector(selector);

const state = {
  account: null,
  previousFocus: null
};

// ========================================
// HELPERS
// ========================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message) {
  const element = $("#pageMessage");
  if (!element) return;

  element.textContent = message;
  element.classList.remove("hidden");
}

function formatMoney(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// ========================================
// API REQUEST
// ========================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("ownerToken");

  const headers = {
    Accept: "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;

  return response.json();
}

// ========================================
// LOAD ACCOUNT STATUS
// ========================================

async function getAccountStatus() {
  let result;

  if (USE_MOCK_DATA) {
    const response = await fetch(MOCK_DATA_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Cannot load account-status.json (${response.status}).`);
    }

    result = await response.json();
  } else {
    result = await apiRequest("/owner/account-status");
  }

  const account = result?.accountStatus ?? result;

  if (
    !account ||
    !Array.isArray(account.verificationChecklist) ||
    !account.limits
  ) {
    throw new Error("Invalid account status data structure.");
  }

  return account;
}

// ========================================
// RENDER VERIFICATION CHECKLIST
// ========================================

function renderVerificationChecklist() {
  const container = $("#verificationList");
  if (!container || !state.account) return;

  container.innerHTML = state.account.verificationChecklist.map((item, index) => {
    const verified = item.status === "verified";

    return `
      <div class="flex min-h-[85px] items-center justify-between gap-3 px-4 py-4 ${index > 0 ? "border-t border-black" : ""}">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${verified ? "bg-black text-white" : "bg-gray-200 text-gray-600"}" aria-hidden="true">
            ${verified
              ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg>'
              : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v5"/></svg>'
            }
          </span>
          <span class="text-[19px] font-normal text-black">${escapeHTML(item.label)}</span>
        </div>
        <span class="shrink-0 text-[17px] ${verified ? "text-[#00834D]" : "text-[#B45309]"}">${verified ? "Verified" : "Pending"}</span>
      </div>
    `;
  }).join("");
}

// ========================================
// RENDER ACCOUNT LIMITS
// ========================================

function renderAccountLimits() {
  const container = $("#limitsList");
  if (!container || !state.account) return;

  const limits = state.account.limits;
  const currency = limits.currency || "USD";

  const rows = [
    {
      label: "Daily rental limit",
      value: formatMoney(limits.dailyRentalLimit, currency),
      green: false
    },
    {
      label: "Monthly Rental limit",
      value: formatMoney(limits.monthlyRentalLimit, currency),
      green: false
    },
    {
      label: "Active Rentals",
      value: `${limits.activeRentals}/${limits.maximumActiveRentals} active`,
      green: true
    }
  ];

  container.innerHTML = rows.map((row, index) => `
    <div class="flex min-h-[85px] items-center justify-between gap-3 px-4 py-4 ${index > 0 ? "border-t border-black" : ""}">
      <span class="text-[18px] ${row.green ? "text-[#00834D]" : "text-black"}">${escapeHTML(row.label)}</span>
      <span class="shrink-0 text-[17px] ${row.green ? "text-[#00834D]" : "text-black"}">${escapeHTML(row.value)}</span>
    </div>
  `).join("");
}

// ========================================
// MANAGE VERIFICATION MODAL
// ========================================

function renderVerificationModal() {
  const container = $("#verificationModalList");
  if (!container || !state.account) return;

  container.innerHTML = state.account.verificationChecklist.map(item => {
    const verified = item.status === "verified";

    return `
      <div class="flex items-center justify-between gap-3 rounded-xl bg-[#F7F9FB] px-4 py-3">
        <span class="text-sm font-medium">${escapeHTML(item.label)}</span>
        <span class="text-sm ${verified ? "text-[#00834D]" : "text-[#B45309]"}">${verified ? "Verified" : "Pending"}</span>
      </div>
    `;
  }).join("");
}

function openVerificationModal() {
  const modal = $("#verificationModal");
  if (!modal || !state.account) return;

  state.previousFocus = document.activeElement;
  renderVerificationModal();

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  $("#closeVerificationModal")?.focus();
}

function closeVerificationModal() {
  const modal = $("#verificationModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  state.previousFocus?.focus?.();
}

// ========================================
// RENDER PAGE
// ========================================

function renderAll() {
  renderVerificationChecklist();
  renderAccountLimits();

  $("#loadingState")?.classList.add("hidden");
  $("#accountContent")?.classList.remove("hidden");
}

// ========================================
// EVENT LISTENERS
// ========================================

function bindEvents() {
  $("#manageVerificationButton")?.addEventListener("click", openVerificationModal);
  $("#closeVerificationModal")?.addEventListener("click", closeVerificationModal);
  $("#doneVerificationButton")?.addEventListener("click", closeVerificationModal);

  $("#verificationModal")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) {
      closeVerificationModal();
    }
  });

  document.addEventListener("keydown", event => {
    const modal = $("#verificationModal");

    if (!modal || modal.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      closeVerificationModal();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = [
      $("#closeVerificationModal"),
      $("#doneVerificationButton")
    ].filter(Boolean);

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

// ========================================
// INITIALIZE
// ========================================

async function initialize() {
  bindEvents();

  try {
    state.account = await getAccountStatus();
    renderAll();
  } catch (error) {
    console.error("Account status loading failed:", error);
    $("#loadingState")?.classList.add("hidden");
    showMessage(error.message);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
