
"use strict";

const API_BASE_URL = "http://localhost:5000/api";
const USE_MOCK_DATA = true;
const MOCK_DATA_URL = "../data/profile.json";
const PROFILE_STORAGE_KEY = "renthub_owner_profile";
const LOGIN_PAGE = "../../onboarding/index.html";

const $ = selector => document.querySelector(selector);

const state = {
  profile: null,
  search: "",
  editSection: "personal",
  previousFocus: null
};

const EDIT_FIELDS = {
  personal: [
    { key: "fullName", label: "Full Name", type: "text", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
    { key: "phone", label: "Phone number", type: "tel", required: true }
  ],
  business: [
    { key: "name", label: "Business name", type: "text", required: true },
    { key: "type", label: "Business type", type: "text", required: true },
    { key: "address", label: "Business address", type: "text", required: true },
    { key: "registrationNumber", label: "Registration number", type: "text" },
    { key: "yearsInBusiness", label: "Years in business", type: "number" },
    { key: "documents", label: "Documents", type: "text" }
  ]
};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? "—";
}

function showNotice(message, isError = false) {
  ["#notice", "#mobileNotice"].forEach(selector => {
    const element = $(selector);
    if (!element) return;

    element.textContent = message;
    element.className = `mt-4 rounded-lg px-4 py-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-blue-50 text-[#224F78]"}`;
  });
}

function clearNotice() {
  ["#notice", "#mobileNotice"].forEach(selector => {
    const element = $(selector);
    if (!element) return;
    element.textContent = "";
    element.classList.add("hidden");
  });
}

// Resolve relative image paths from the JSON file's location.
// Absolute URLs and uploaded data URLs are preserved.
function resolveImagePath(path) {
  if (typeof path !== "string" || !path.trim()) return "";

  const value = path.trim();

  if (/^(data:image\/|blob:)/i.test(value)) return value;

  try {
    return new URL(value, new URL(MOCK_DATA_URL, document.baseURI)).href;
  } catch (error) {
    console.error("Invalid image path:", value, error);
    return "";
  }
}

function setImage(selector, source, alt) {
  const element = $(selector);
  if (!element) return;

  element.alt = alt || "Image";

  const url = resolveImagePath(source);

  if (!url) {
    element.removeAttribute("src");
    return;
  }

  if (element.src !== url) element.src = url;
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("ownerToken");

  const headers = {
    Accept: "application/json",
    ...options.headers
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;

  return response.json();
}

async function getProfile() {
  let result;

  if (USE_MOCK_DATA) {
    const response = await fetch(MOCK_DATA_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Cannot load profile.json (${response.status}).`);
    }

    result = await response.json();
  } else {
    // Proposed backend endpoint: GET /owner/profile
    result = await apiRequest("/owner/profile");
  }

  const profile = result?.profile ?? result;

  if (!profile?.personal || !profile?.business || !profile?.stats || !Array.isArray(profile.equipment)) {
    throw new Error("Invalid profile data structure.");
  }

  if (USE_MOCK_DATA) {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        const savedProfile = savedData?.profile ?? savedData;

        EDIT_FIELDS.personal.forEach(field => {
          if (savedProfile?.personal?.[field.key] !== undefined) {
            profile.personal[field.key] = savedProfile.personal[field.key];
          }
        });

        EDIT_FIELDS.business.forEach(field => {
          if (savedProfile?.business?.[field.key] !== undefined) {
            profile.business[field.key] = savedProfile.business[field.key];
          }
        });

        if (typeof savedProfile?.personal?.avatar === "string" && savedProfile.personal.avatar.startsWith("data:image/")) {
          profile.personal.avatar = savedProfile.personal.avatar;
        }
      } catch (error) {
        console.warn("Invalid locally saved profile:", error);
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }
  }

  return profile;
}

function saveMockProfile() {
  const personal = {};
  const business = {};

  EDIT_FIELDS.personal.forEach(field => {
    personal[field.key] = state.profile.personal[field.key];
  });

  EDIT_FIELDS.business.forEach(field => {
    business[field.key] = state.profile.business[field.key];
  });

  if (state.profile.personal.avatar?.startsWith("data:image/")) {
    personal.avatar = state.profile.personal.avatar;
  }

  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({ profile: { personal, business } })
  );
}

function renderProfile() {
  if (!state.profile) return;

  const { personal, business, stats } = state.profile;

  setText("#desktopName", personal.fullName);
  setText("#mobileName", personal.fullName);
  setText("#desktopRole", personal.role);
  setText("#mobileRole", personal.role);

  setText("#infoName", personal.fullName);
  setText("#infoEmail", personal.email);
  setText("#infoPhone", personal.phone);

  setText("#businessName", business.name);
  setText("#businessType", business.type);
  setText("#businessAddress", business.address);
  setText("#registrationNumber", business.registrationNumber || "N/A");
  setText("#yearsInBusiness", `${business.yearsInBusiness ?? 0} years`);
  setText("#businessDocuments", business.documents || "N/A");
  setText("#mobileBusinessName", business.name || "Enter your business name");

  setText("#desktopEquipmentCount", stats.equipments);
  setText("#desktopListingCount", stats.listings);
  setText("#desktopBookingCount", stats.totalBookings);
  setText("#mobileEquipmentCount", stats.equipments);
  setText("#mobileListingCount", stats.listings);
  setText("#mobileBookingCount", stats.totalBookings);

  setImage("#coverImage", personal.coverImage, "Office buildings");
  setImage("#desktopAvatar", personal.avatar, personal.fullName);
  setImage("#mobileAvatar", personal.avatar, personal.fullName);
  setImage("#topbarAvatar", personal.avatar, personal.fullName);
}

function renderEquipment() {
  const container = $("#equipmentList");
  if (!container || !state.profile) return;

  const items = state.profile.equipment.filter(item =>
    [item.name, item.category, item.location].some(value =>
      String(value ?? "").toLowerCase().includes(state.search)
    )
  );

  if (!items.length) {
    container.innerHTML = '<p class="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">No equipment found.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="flex items-center gap-3 rounded-xl border border-[#E6DCCF] bg-white p-3">
      <img src="${escapeHTML(resolveImagePath(item.image))}" alt="${escapeHTML(item.name)}" loading="lazy" class="h-16 w-16 shrink-0 rounded-lg bg-[#F7F9FC] object-contain">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-medium">${escapeHTML(item.name)}</h3>
        <p class="mt-1 text-xs text-[#777]">${escapeHTML(item.category)}</p>
        <p class="mt-1 truncate text-xs text-[#777]">⌖ ${escapeHTML(item.location)}</p>
        <p class="mt-1 text-xs text-[#555]"><span class="text-orange-500">★</span> ${escapeHTML(item.rating)} (${escapeHTML(item.reviews)})</p>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderProfile();
  renderEquipment();
}

function openEditModal(section) {
  if (!state.profile || !EDIT_FIELDS[section]) return;

  const modal = $("#editModal");
  const container = $("#editFields");
  if (!modal || !container) return;

  state.editSection = section;
  state.previousFocus = document.activeElement;

  const data = state.profile[section];
  const isBusiness = section === "business";

  setText("#editModalTitle", isBusiness ? "Edit Business Information" : "Edit Your Information");

  container.replaceChildren();

  EDIT_FIELDS[section].forEach(field => {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    const input = document.createElement("input");

    label.htmlFor = `edit-${field.key}`;
    label.className = "mb-2 block text-sm font-medium";
    label.textContent = field.label;

    input.id = `edit-${field.key}`;
    input.name = field.key;
    input.type = field.type;
    input.required = Boolean(field.required);
    input.value = String(data[field.key] ?? "");
    input.className = "w-full rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm outline-none focus:border-[#224F78]";

    if (field.type === "number") {
      input.min = "0";
      input.step = "1";
    }

    wrapper.append(label, input);
    container.appendChild(wrapper);
  });

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  container.querySelector("input")?.focus();
}

function closeEditModal() {
  const modal = $("#editModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  state.previousFocus?.focus?.();
}

async function submitEdit(event) {
  event.preventDefault();
  if (!state.profile) return;

  const section = state.editSection;
  const formData = new FormData(event.currentTarget);
  const changes = {};

  EDIT_FIELDS[section].forEach(field => {
    const value = String(formData.get(field.key) ?? "").trim();
    changes[field.key] = field.type === "number" ? Number(value || 0) : value;
  });

  const button = $("#saveEditButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    if (USE_MOCK_DATA) {
      state.profile[section] = { ...state.profile[section], ...changes };

      if (section === "business" && changes.name) {
        state.profile.personal.role = `CEO, ${changes.name}`;
      }

      saveMockProfile();
    } else {
      // Proposed backend endpoint: PATCH /owner/profile/personal
      // or PATCH /owner/profile/business
      const result = await apiRequest(`/owner/profile/${section}`, {
        method: "PATCH",
        body: JSON.stringify(changes)
      });

      const updated = result?.profile ?? result;

      if (updated?.personal && updated?.business) {
        state.profile = { ...state.profile, ...updated };
      } else {
        state.profile[section] = { ...state.profile[section], ...changes };
      }
    }

    renderAll();
    closeEditModal();
    showNotice("Profile updated successfully.");
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Changes";
    }
  }
}

async function changePhoto(file) {
  if (!file || !state.profile) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showNotice("Choose a JPG, PNG or WebP image.", true);
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    showNotice("The image must be smaller than 3 MB.", true);
    return;
  }

  try {
    if (USE_MOCK_DATA) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Unable to read image."));
        reader.readAsDataURL(file);
      });

      state.profile.personal.avatar = dataUrl;

      try {
        saveMockProfile();
      } catch (error) {
        console.warn("Unable to store photo locally:", error);
        showNotice("Photo preview updated, but browser storage is full.", true);
        renderProfile();
        return;
      }
    } else {
      // Proposed backend endpoint: POST /owner/profile/avatar
      const body = new FormData();
      body.append("avatar", file);

      const result = await apiRequest("/owner/profile/avatar", {
        method: "POST",
        body
      });

      if (!result?.avatarUrl) {
        throw new Error("Backend did not return an avatar URL.");
      }

      state.profile.personal.avatar = result.avatarUrl;
    }

    renderProfile();
    showNotice("Profile photo updated successfully.");
  } catch (error) {
    showNotice(error.message, true);
  }
}

function handleImageError(event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;

  console.error("Image could not load:", image.src);

  if (image.id === "coverImage") {
    image.classList.add("bg-[#D3E7F8]");
  } else if (["desktopAvatar", "mobileAvatar", "topbarAvatar"].includes(image.id)) {
    image.classList.add("bg-[#C7C1C1]");
  } else if (image.closest("#equipmentList")) {
    image.classList.add("bg-[#F2F7FB]");
  }
}

function logout() {
  localStorage.removeItem("ownerToken");
  window.location.href = LOGIN_PAGE;
}

function bindEvents() {
  $("#desktopSearch")?.addEventListener("input", event => {
    state.search = event.target.value.trim().toLowerCase();
    renderEquipment();
  });

  $("#editProfileButton")?.addEventListener("click", () => openEditModal("personal"));

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => openEditModal(button.dataset.edit));
  });

  $("#closeEditModal")?.addEventListener("click", closeEditModal);
  $("#editForm")?.addEventListener("submit", submitEdit);

  $("#editModal")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeEditModal();
  });

  document.addEventListener("keydown", event => {
    const modal = $("#editModal");
    if (!modal || modal.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      closeEditModal();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = [
      $("#closeEditModal"),
      ...document.querySelectorAll("#editFields input"),
      $("#saveEditButton")
    ].filter(element => element && !element.disabled);

    if (!controls.length) return;

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

  $("#changePhotoButton")?.addEventListener("click", () => {
    $("#photoInput")?.click();
  });

  $("#photoInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) changePhoto(file);
    event.target.value = "";
  });

  $("#desktopLogout")?.addEventListener("click", logout);
  $("#mobileLogout")?.addEventListener("click", logout);

  document.addEventListener("error", handleImageError, true);
}

async function initialize() {
  bindEvents();
  clearNotice();

  try {
    state.profile = await getProfile();
    renderAll();
    console.log("RentHub owner profile loaded successfully.");
  } catch (error) {
    console.error("Profile loading failed:", error);
    showNotice(error.message, true);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
