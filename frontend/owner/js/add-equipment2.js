
"use strict";

// ==========================================
// RENTHUB - ADD EQUIPMENT STEP 2
// ==========================================

// API CONFIGURATION
const API_BASE_URL = "https://rentit-5zbv.onrender.com";
const USE_MOCK_DATA = false;

// STORAGE KEYS
const STEP1_KEY = "renthub_add_equipment_draft";
const STEP2_KEY = "renthub_add_equipment_step2";
const DRAFT_ID_KEY = "renthub_equipment_draft_id";

// SELECTOR HELPER
const $ = (selector) => document.querySelector(selector);

// ==========================================
// DEFAULT LOCATIONS
// Used when locations.json is unavailable.
// ==========================================

const DEFAULT_LOCATIONS = [
  "Lagos, Nigeria",
  "Abuja, FCT",
  "Ibadan, Oyo State",
  "Ogbomoso, Oyo State",
  "Osogbo, Osun State",
  "Ilorin, Kwara State",
  "Abeokuta, Ogun State",
  "Akure, Ondo State",
  "Port Harcourt, Rivers State",
  "Benin City, Edo State",
  "Enugu, Enugu State",
  "Kano, Kano State",
  "Kaduna, Kaduna State",
  "Uyo, Akwa Ibom State",
  "Owerri, Imo State"
];

// ==========================================
// BACKEND API REQUEST
// ==========================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("ownerToken");

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
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
    const error = await response
      .json()
      .catch(() => ({}));

    throw new Error(
      error.message || `API error: ${response.status}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  return contentType.includes("application/json")
    ? response.json()
    : null;
}

// ==========================================
// NORMALIZE LOCATION DATA
// Supports strings and objects.
// ==========================================

function normalizeLocations(data) {
  const locations = Array.isArray(data)
    ? data
    : data?.locations;

  if (!Array.isArray(locations)) {
    throw new Error(
      "Invalid location data. Expected a locations array."
    );
  }

  const names = locations
    .map((location) => {
      if (typeof location === "string") {
        return location.trim();
      }

      if (
        location &&
        typeof location === "object"
      ) {
        return String(
          location.name ||
          location.label ||
          location.address ||
          ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean);

  return [...new Set(names)];
}

// ==========================================
// GET LOCATIONS
// ==========================================

async function getLocations() {
  // The current Equipment API has no locations endpoint; use the supplied location list.
  try {
    const response = await fetch(
      "./locations.json",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `locations.json returned ${response.status}`
      );
    }

    const result = await response.json();

    const locations = normalizeLocations(result);

    if (locations.length === 0) {
      throw new Error(
        "locations.json contains no valid locations."
      );
    }

    return locations;

  } catch (error) {
    console.warn(
      "Could not load locations.json. Using default locations.",
      error
    );

    return DEFAULT_LOCATIONS;
  }
}

// ==========================================
// LOAD LOCATIONS INTO SELECT
// ==========================================

async function loadLocations() {
  const select = $("#equipmentLocation");

  if (!select) return;

  select.disabled = true;

  select.innerHTML =
    '<option value="">Loading locations...</option>';

  try {
    const locations = await getLocations();

    select.innerHTML =
      '<option value="">Enter your address</option>';

    locations.forEach((location) => {
      const option = document.createElement("option");

      option.value = location;
      option.textContent = location;

      select.appendChild(option);
    });

    select.disabled = false;

    restoreStepTwo();

  } catch (error) {
    console.error(
      "Location loading failed:",
      error
    );

    select.innerHTML =
      '<option value="">Unable to load locations</option>';

    select.disabled = true;

    showMessage(error.message, true);
  }
}

// ==========================================
// SAVE STEP TWO
// ==========================================

async function saveStepTwo(payload) {
  // Keep step-two details locally until the user submits the completed listing.
  sessionStorage.setItem(STEP2_KEY, JSON.stringify(payload));
  return { success: true, data: payload };
}

// ==========================================
// LOGOUT
// ==========================================

async function logout() {
  // The current JWT backend has no logout endpoint.
  localStorage.removeItem("ownerToken");

  window.location.href = "../../onboarding/index.html";
}

// ==========================================
// FORM FEEDBACK
// ==========================================

function showMessage(text, isError = false) {
  const element = $("#formMessage");

  if (!element) return;

  element.textContent = text;

  element.className = isError
    ? "block text-sm text-red-600"
    : "block text-sm text-green-700";
}

function clearMessage() {
  const element = $("#formMessage");

  if (!element) return;

  element.textContent = "";
  element.className = "hidden text-sm";
}

// ==========================================
// READ FORM VALUES
// ==========================================

function getFormValues() {
  const handover = document.querySelector(
    'input[name="handoverMethod"]:checked'
  );

  return {
    location:
      $("#equipmentLocation").value,

    availableStart:
      $("#availableStart").value,

    availableEnd:
      $("#availableEnd").value,

    unavailableStart:
      $("#unavailableStart").value,

    unavailableEnd:
      $("#unavailableEnd").value,

    rentalPrice:
      $("#rentalPrice").value.trim(),

    rentalDeposit:
      $("#rentalDeposit").value.trim(),

    rentalRules:
      $("#rentalRules").value.trim(),

    handoverMethod:
      handover ? handover.value : ""
  };
}

// ==========================================
// FORM VALIDATION
// ==========================================

function validateForm(data) {
  if (!data.location) {
    return "Please select your equipment location.";
  }

  if (
    !data.availableStart ||
    !data.availableEnd
  ) {
    return "Please select both available dates.";
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  if (data.availableStart < todayString) {
    return "The available start date cannot be in the past.";
  }

  if (
    data.availableEnd < data.availableStart
  ) {
    return "The available end date cannot be before the start date.";
  }

  if (
    data.unavailableStart ||
    data.unavailableEnd
  ) {
    if (
      !data.unavailableStart ||
      !data.unavailableEnd
    ) {
      return "Select both unavailable dates or leave both empty.";
    }

    if (
      data.unavailableEnd <
      data.unavailableStart
    ) {
      return "The unavailable end date cannot be before its start date.";
    }

    if (
      data.unavailableStart <
        data.availableStart ||
      data.unavailableEnd >
        data.availableEnd
    ) {
      return "Unavailable dates must be within the available date range.";
    }

    if (
      data.unavailableStart ===
        data.availableStart &&
      data.unavailableEnd ===
        data.availableEnd
    ) {
      return "The entire available date range cannot be unavailable.";
    }
  }

  const price = Number(data.rentalPrice);

  if (
    data.rentalPrice === "" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return "Enter a valid rental price greater than zero.";
  }

  const deposit =
    Number(data.rentalDeposit);

  if (
    data.rentalDeposit === "" ||
    !Number.isFinite(deposit) ||
    deposit < 0
  ) {
    return "Enter a valid rental deposit of zero or more.";
  }

  if (!data.rentalRules) {
    return "Please enter your rental rules.";
  }

  if (
    !["Pickup", "Delivery"].includes(
      data.handoverMethod
    )
  ) {
    return "Select Pickup or Delivery.";
  }

  return "";
}

// ==========================================
// SAVE LOCAL DRAFT
// ==========================================

function saveLocalDraft() {
  try {
    sessionStorage.setItem(
      STEP2_KEY,
      JSON.stringify(getFormValues())
    );
  } catch (error) {
    console.warn(
      "Unable to save local draft:",
      error
    );
  }
}

// ==========================================
// RESTORE STEP TWO
// ==========================================

function restoreStepTwo() {
  const raw =
    sessionStorage.getItem(STEP2_KEY);

  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    const locationSelect =
      $("#equipmentLocation");

    if (data.location) {
      const exists = Array.from(
        locationSelect.options
      ).some(
        (option) =>
          option.value === data.location
      );

      if (!exists) {
        const option =
          document.createElement("option");

        option.value = data.location;
        option.textContent = data.location;

        locationSelect.appendChild(option);
      }
    }

    locationSelect.value =
      data.location || "";

    $("#availableStart").value =
      data.availableStart || "";

    $("#availableEnd").value =
      data.availableEnd || "";

    $("#unavailableStart").value =
      data.unavailableStart || "";

    $("#unavailableEnd").value =
      data.unavailableEnd || "";

    $("#rentalPrice").value =
      data.rentalPrice ?? "";

    $("#rentalDeposit").value =
      data.rentalDeposit ?? "";

    $("#rentalRules").value =
      data.rentalRules || "";

    document.querySelectorAll(
      'input[name="handoverMethod"]'
    ).forEach((input) => {
      input.checked =
        input.value ===
        data.handoverMethod;
    });

  } catch (error) {
    console.warn(
      "Unable to restore Step 2:",
      error
    );
  }
}

// ==========================================
// READ STEP ONE
// ==========================================

function getStepOne() {
  try {
    const data = JSON.parse(
      sessionStorage.getItem(STEP1_KEY) ||
      "null"
    );

    return (
      data &&
      typeof data === "object" &&
      !Array.isArray(data)
    )
      ? data
      : null;

  } catch (error) {
    console.warn(
      "Unable to read Step 1 draft:",
      error
    );

    return null;
  }
}

// ==========================================
// FORMAT MONEY
// ==========================================

function money(value) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }
  ).format(Number(value) || 0);
}

// ==========================================
// BUILD PREVIEW ROW
// ==========================================

function previewRow(label, value) {
  const row =
    document.createElement("div");

  row.className =
    "border-b border-gray-100 py-2";

  const title =
    document.createElement("p");

  title.className =
    "text-xs font-semibold text-gray-500";

  title.textContent = label;

  const content =
    document.createElement("p");

  content.className =
    "mt-1 break-words text-sm text-gray-900";

  content.textContent =
    String(value ?? "Not provided");

  row.append(title, content);

  return row;
}

// ==========================================
// SHOW EQUIPMENT PREVIEW
// ==========================================

function showPreview(step1, step2) {
  const previous =
    $("#previewOverlay");

  if (previous) {
    previous.remove();
  }

  const overlay =
    document.createElement("div");

  overlay.id = "previewOverlay";

  overlay.className =
    "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4";

  const panel =
    document.createElement("section");

  panel.className =
    "max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7";

  panel.setAttribute(
    "role",
    "dialog"
  );

  panel.setAttribute(
    "aria-modal",
    "true"
  );

  panel.setAttribute(
    "aria-labelledby",
    "previewTitle"
  );

  const heading =
    document.createElement("div");

  heading.className =
    "mb-4 flex items-center justify-between gap-4";

  const title =
    document.createElement("h2");

  title.id = "previewTitle";
  title.textContent = "Equipment Preview";

  title.className =
    "text-xl font-semibold text-[#224F78]";

  const close =
    document.createElement("button");

  close.type = "button";
  close.textContent = "×";

  close.className =
    "flex h-9 w-9 items-center justify-center rounded-lg text-2xl text-gray-700 hover:bg-gray-100";

  close.setAttribute(
    "aria-label",
    "Close preview"
  );

  heading.append(title, close);

  const details =
    document.createElement("div");

  const rows = [
    [
      "Equipment Name",
      step1?.name || "Not provided"
    ],
    [
      "Category",
      step1?.category || "Not provided"
    ],
    [
      "Brand",
      step1?.brand || "Not provided"
    ],
    [
      "Model",
      step1?.model || "Not provided"
    ],
    [
      "Condition",
      step1?.condition || "Not provided"
    ],
    [
      "Description",
      step1?.description || "Not provided"
    ],
    [
      "Additional Information",
      step1?.additionalInformation ||
      "Not provided"
    ],
    [
      "Location",
      step2.location
    ],
    [
      "Available Dates",
      `${step2.availableStart} to ${step2.availableEnd}`
    ],
    [
      "Unavailable Dates",
      step2.unavailableStart
        ? `${step2.unavailableStart} to ${step2.unavailableEnd}`
        : "None"
    ],
    [
      "Rental Price",
      money(step2.rentalPrice)
    ],
    [
      "Rental Deposit",
      money(step2.rentalDeposit)
    ],
    [
      "Rental Rules",
      step2.rentalRules
    ],
    [
      "Handover Method",
      step2.handoverMethod
    ]
  ];

  rows.forEach(([label, value]) => {
    details.appendChild(
      previewRow(label, value)
    );
  });

  const note =
    document.createElement("p");

  note.className =
    "mt-4 text-xs text-gray-500";

  note.textContent =
    "Preview only. This does not publish the equipment or upload any new files.";

  const done =
    document.createElement("button");

  done.type = "button";
  done.textContent = "Close Preview";

  
const continueButton = document.createElement("button");

continueButton.type = "button";
continueButton.textContent = "Continue to Submission";

continueButton.className =
  "mt-3 w-full rounded-xl bg-[#2557e5] py-3 font-semibold text-white hover:bg-blue-700";

continueButton.addEventListener("click", () => {
  window.location.href = "./listing-preview.html";
});


  done.className =
    "mt-5 w-full rounded-xl bg-[#224F78] py-3 font-semibold text-white hover:bg-[#173D60]";

  const previousFocus =
    document.activeElement;

  function dismiss() {
    document.removeEventListener(
      "keydown",
      onKeyDown
    );

    overlay.remove();

    if (
      previousFocus &&
      typeof previousFocus.focus === "function"
    ) {
      previousFocus.focus();
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      dismiss();
    }

    if (event.key === "Tab") {
      const focusable = [
        close,
        continueButton,
        done
      ];

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  close.addEventListener(
    "click",
    dismiss
  );

  done.addEventListener(
    "click",
    dismiss
  );

  overlay.addEventListener(
    "click",
    (event) => {
      if (event.target === overlay) {
        dismiss();
      }
    }
  );

  document.addEventListener(
    "keydown",
    onKeyDown
  );

  panel.append(
    heading,
    details,
    note,
    continueButton,
    done
  );

  overlay.appendChild(panel);

  document.body.appendChild(
    overlay
  );

  close.focus();
}

// ==========================================
// HANDLE PREVIEW
// ==========================================

async function handlePreview(event) {
  event.preventDefault();

  clearMessage();

  const data = getFormValues();

  const error = validateForm(data);

  if (error) {
    showMessage(error, true);
    return;
  }

  const button = $("#previewButton");

  button.disabled = true;
  button.textContent = "Saving...";

  try {
    await saveStepTwo(data);

    const step1 = getStepOne();

    showMessage(
      step1
        ? "Step 2 saved successfully."
        : "Step 2 saved. Step 1 details are not available in this session."
    );

    showPreview(step1, data);

  } catch (error) {
    console.error(
      "Unable to save Step 2:",
      error
    );

    showMessage(
      error.message,
      true
    );

  } finally {
    button.disabled = false;
    button.textContent = "Preview";
  }
}

// ==========================================
// INITIALIZE PAGE
// ==========================================

function initialize() {
  const form = $("#stepTwoForm");

  if (!form) {
    console.error(
      "Step 2 form was not found."
    );
    return;
  }

  // Restore non-location fields immediately.
  restoreStepTwo();

  form.addEventListener(
    "submit",
    handlePreview
  );

  form.addEventListener(
    "input",
    () => {
      saveLocalDraft();
      clearMessage();
    }
  );

  form.addEventListener(
    "change",
    () => {
      saveLocalDraft();
      clearMessage();
    }
  );

  const logoutButton =
    $("#logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      () => {
        logout().catch(
          (error) => {
            showMessage(
              error.message,
              true
            );
          }
        );
      }
    );
  }

  loadLocations();
}

document.addEventListener(
  "DOMContentLoaded",
  initialize
);
