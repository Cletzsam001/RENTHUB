
"use strict";

// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = "https://rentit-5zbv.onrender.com";
const USE_MOCK_DATA = false;

const MOCK_DATA_URL = "../data/add-equipment.json";
const DRAFT_KEY = "renthub_add_equipment_draft";
const DRAFT_ID_KEY = "renthub_equipment_draft_id";
const FILES_KEY = "renthub_add_equipment_files";


const MAX_FILES = 5;
const MAX_SIZE = 3 * 1024 * 1024;
const MAX_LOCAL_FILE_SIZE = 3 * 1024 * 1024;
const MAX_FILE_SIZE = 3 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png"
];

const NEXT_PAGE = "./add-equipment2.html";
const LOGIN_PAGE = "../../onboarding/index.html";

const $ = selector => document.querySelector(selector);

const state = {
  files: [],
  previewUrls: [],
  categories: []
};

const FALLBACK_CATEGORIES = [
  { id: "cameras", name: "Cameras" },
  { id: "lighting", name: "Lighting" },
  { id: "audio", name: "Audio Equipment" },
  { id: "video", name: "Video Equipment" },
  { id: "tools", name: "Tools" },
  { id: "construction", name: "Construction Equipment" },
  { id: "electronics", name: "Electronics" },
  { id: "other", name: "Other" }
];

// =====================================================
// API REQUEST
// =====================================================

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

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.message || `Request failed (${response.status})`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

// =====================================================
// DISPLAY MESSAGES
// =====================================================

function showMessage(message, isError = false) {
  const element = $("#formMessage");

  if (!element) return;

  element.textContent = message;

  element.className = isError
    ? "block text-sm text-red-600"
    : "block text-sm text-green-700";
}

function clearMessage() {
  const element = $("#formMessage");

  if (!element) return;

  element.textContent = "";
  element.classList.add("hidden");
}

function showUploadError(message) {
  const element = $("#uploadError");

  if (!element) return;

  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

// =====================================================
// LOAD CATEGORIES
// =====================================================

async function getCategories() {
  if (!USE_MOCK_DATA) {
    // Existing backend endpoint: GET /category/getall
    const result = await apiRequest("/category/getall");

    const categories = Array.isArray(result)
      ? result
      : result?.categories;

    if (!Array.isArray(categories)) {
      throw new Error(
        "Invalid categories returned by the API."
      );
    }

    return categories;
  }

  try {
    const response = await fetch(
      MOCK_DATA_URL,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Cannot load ${MOCK_DATA_URL} (${response.status}).`
      );
    }

    const result = await response.json();

    const categories = Array.isArray(result)
      ? result
      : result?.categories;

    if (!Array.isArray(categories)) {
      throw new Error(
        "The JSON file must contain a categories array."
      );
    }

    return categories;
  } catch (error) {
    console.warn(
      "Using fallback equipment categories:",
      error.message
    );

    return FALLBACK_CATEGORIES;
  }
}

async function loadCategories() {
  const select = $("#equipmentCategory");

  if (!select) {
    console.error(
      "Missing category dropdown: #equipmentCategory"
    );
    return;
  }

  select.disabled = true;

  try {
    const categories = await getCategories();

    state.categories = categories;

    select.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select equipment category";
    placeholder.disabled = true;

    select.appendChild(placeholder);

    categories.forEach(category => {
      const option = document.createElement("option");

      if (typeof category === "string") {
        option.value = category;
        option.textContent = category;
      } else {
        option.value = String(
          category._id ||
          category.id ||
          category.slug ||
          category.name ||
          ""
        );

        option.textContent = String(
          category.name ||
          category.label ||
          category.id ||
          "Unnamed category"
        );
      }

      if (option.value) {
        select.appendChild(option);
      }
    });

    select.disabled = false;

    restoreDraft();

    console.log(
      "Equipment categories loaded:",
      categories.length
    );
  } catch (error) {
    console.error(
      "Category loading failed:",
      error
    );

    select.disabled = false;

    showMessage(error.message, true);
  }
}

// =====================================================
// FILE VALIDATION
// =====================================================

function validateFiles(files) {
  if (files.length > MAX_FILES) {
    return "You can upload a maximum of 5 images.";
  }

  const invalidFile = files.find(
    file => !ALLOWED_TYPES.includes(file.type)
  );

  if (invalidFile) {
    return `Unsupported file: ${invalidFile.name}. Use JPG or PNG images only.`;
  }

  const oversized = files.find(file => file.size > MAX_FILE_SIZE);
  if (oversized) return `${oversized.name} exceeds the 3 MB per-image limit.`;

  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > MAX_SIZE) return "The combined image size must not exceed 3 MB for this browser-based upload flow.";

  return "";
}

// =====================================================
// PHOTO PREVIEWS
// =====================================================

function clearPreviewUrls() {
  state.previewUrls.forEach(url => {
    URL.revokeObjectURL(url);
  });

  state.previewUrls = [];
}

function renderPreviews() {
  const container = $("#photoPreview");

  if (!container) return;

  clearPreviewUrls();
  container.replaceChildren();

  state.files.forEach((file, index) => {
    const card = document.createElement("div");

    card.className = "relative flex min-h-[105px] flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-[#F7F9FB] p-2";

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);

      state.previewUrls.push(url);

      const image = document.createElement("img");

      image.src = url;
      image.alt = file.name;
      image.className = "h-[85px] w-full rounded-lg object-cover";

      card.appendChild(image);
    } else {
      const label = document.createElement("span");

      label.textContent = "PDF";
      label.className = "text-lg font-bold text-[#214F79]";

      card.appendChild(label);
    }

    const filename = document.createElement("p");

    filename.className = "mt-1 w-full truncate text-center text-xs text-gray-600";
    filename.textContent = file.name;
    filename.title = file.name;

    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.textContent = "×";

    removeButton.setAttribute(
      "aria-label",
      `Remove ${file.name}`
    );

    removeButton.className = "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-lg text-white";

    removeButton.addEventListener("click", () => {
      state.files.splice(index, 1);

      showUploadError("");
      renderPreviews();
    });

    card.append(filename, removeButton);
    container.appendChild(card);
  });
}

// =====================================================
// HANDLE FILE UPLOAD
// =====================================================

function handleFiles(event) {
  const selected = Array.from(
    event.target.files || []
  );

  if (!selected.length) return;

  const combined = [
    ...state.files,
    ...selected
  ];

  const error = validateFiles(combined);

  if (error) {
    showUploadError(error);
    event.target.value = "";
    return;
  }

  state.files = combined;

  showUploadError("");
  clearMessage();

  renderPreviews();

  event.target.value = "";
}

// =====================================================
// GET FORM VALUES
// =====================================================

function getFormValues() {
  const condition = document.querySelector(
    'input[name="condition"]:checked'
  );

  return {
    name: $("#equipmentName")?.value.trim() || "",
    category: $("#equipmentCategory")?.value || "",
    categoryName: $("#equipmentCategory")?.selectedOptions?.[0]?.textContent || "",
    brand: $("#equipmentBrand")?.value.trim() || "",
    model: $("#equipmentModel")?.value.trim() || "",
    description: $("#equipmentDescription")?.value.trim() || "",
    condition: condition?.value || "",
    additionalInformation:
      $("#additionalInformation")?.value.trim() || ""
  };
}

// =====================================================
// VALIDATE FORM
// =====================================================

function validateForm(data) {
  if (!data.name) {
    return "Enter the equipment name.";
  }

  if (!data.category) {
    return "Select an equipment category.";
  }

  if (!data.brand) {
    return "Enter the brand name.";
  }

  if (!data.model) {
    return "Enter the equipment model.";
  }

  if (!state.files.length) {
    return "Upload at least one photo or document.";
  }

  if (!data.description) {
    return "Enter the equipment description.";
  }

  if (!data.condition) {
    return "Select the equipment condition.";
  }

  return validateFiles(state.files);
}

// =====================================================
// SAVE LOCAL DRAFT
// =====================================================

function saveLocalDraft() {
  const data = getFormValues();

  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.warn(
      "Unable to save equipment draft:",
      error
    );
  }
}

// =====================================================
// RESTORE DRAFT
// =====================================================

function restoreDraft() {
  const raw = sessionStorage.getItem(DRAFT_KEY);

  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    const fields = {
      equipmentName: data.name,
      equipmentCategory: data.category,
      equipmentBrand: data.brand,
      equipmentModel: data.model,
      equipmentDescription: data.description,
      additionalInformation: data.additionalInformation
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);

      if (element) {
        element.value = value || "";
      }
    });

    document.querySelectorAll(
      'input[name="condition"]'
    ).forEach(input => {
      input.checked =
        input.value === data.condition;
    });
  } catch (error) {
    console.warn(
      "Unable to restore equipment draft:",
      error
    );
  }
}

// =====================================================
// TEMPORARY FILE STORAGE
// =====================================================

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => {
      reject(
        new Error(`Unable to read ${file.name}.`)
      );
    };

    reader.readAsDataURL(file);
  });
}

async function saveFilesForNextPage() {
  const totalSize = state.files.reduce(
    (total, file) => total + file.size,
    0
  );

  if (totalSize > MAX_LOCAL_FILE_SIZE) {
    throw new Error(
      "The selected images must total 3 MB or less to continue to the preview."
    );
  }

  const files = await Promise.all(
    state.files.map(async file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: await fileToDataURL(file)
    }))
  );

  try {
    sessionStorage.setItem(
      FILES_KEY,
      JSON.stringify(files)
    );
  } catch (error) {
    throw new Error(
      "Browser storage is full. Try smaller images or connect backend file uploads."
    );
  }
}

// =====================================================
// SAVE EQUIPMENT DRAFT
// =====================================================

async function saveEquipmentDraft(payload, files) {
  // The supplied backend has no draft endpoint. Keep wizard data in sessionStorage;
  // the real equipment record is created on the final preview/submit step.
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  await saveFilesForNextPage();
  return { success: true, draft: payload };
}

// =====================================================
// NEXT BUTTON
// =====================================================

async function handleNext(event) {
  event.preventDefault();

  clearMessage();

  const data = getFormValues();
  const error = validateForm(data);

  if (error) {
    showMessage(error, true);
    return;
  }

  const button = $("#nextButton");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    const result = await saveEquipmentDraft(
      data,
      state.files
    );

    window.location.href = NEXT_PAGE;
  } catch (error) {
    console.error(
      "Unable to save equipment:",
      error
    );

    showMessage(error.message, true);

    if (button) {
      button.disabled = false;
      button.textContent = "Next";
    }
  }
}

// =====================================================
// LOGOUT
// =====================================================

async function logout() {
  // The current JWT backend has no logout endpoint.
  localStorage.removeItem("ownerToken");

  window.location.href = LOGIN_PAGE;
}

// =====================================================
// INITIALIZE
// =====================================================

async function initialize() {
  const form = $("#addEquipmentForm");
  const photos = $("#equipmentPhotos");
  const nextButton = $("#nextButton");
  const logoutButton = $("#logoutButton");

  if (!form) {
    console.error(
      "Missing form: #addEquipmentForm"
    );
  }

  if (photos) {
    photos.addEventListener(
      "change",
      handleFiles
    );
  }

  if (form) {
    form.addEventListener(
      "submit",
      handleNext
    );

    form.addEventListener(
      "input",
      saveLocalDraft
    );

    form.addEventListener(
      "change",
      event => {
        if (event.target.id !== "equipmentPhotos") {
          saveLocalDraft();
        }
      }
    );
  }

  if (nextButton && !form?.contains(nextButton)) {
    nextButton.addEventListener(
      "click",
      handleNext
    );
  }

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      () => {
        logout().catch(error => {
          showMessage(error.message, true);
        });
      }
    );
  }

  window.addEventListener(
    "pagehide",
    clearPreviewUrls
  );

  restoreDraft();

  await loadCategories();

  console.log(
    "RentHub Add Equipment page initialized."
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    { once: true }
  );
} else {
  initialize();
}
