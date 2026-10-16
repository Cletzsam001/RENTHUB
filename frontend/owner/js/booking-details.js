
"use strict";

// ======================================================
// CONFIGURATION
// ======================================================

const API_BASE_URL = "http://localhost:5000/api";
const USE_MOCK_DATA = true;
const JSON_URL = "../data/booking-details.json";
const STORAGE_KEY = "renthub_booking_records_v5";

const EQUIPMENT_LIST_URL = "equipment.html";

// Replace this with your real equipment details page
// when that page has been created.
const EQUIPMENT_DETAILS_URL = "equipment.html";

const LOGIN_URL = "../../onboarding/index.html";
const REPORT_ISSUE_URL = "";

const $ = selector => document.querySelector(selector);

const state = {
  booking: null,
  pendingAction: null,
  failedAction: null,
  activeModal: null,
  previousFocus: null,
  busy: false,
  previewMode: null,
  deferredRender: false,
  forceNextFailure: false
};

// ======================================================
// BOOKING STATUS CONFIGURATION
// ======================================================

const STATUS_CONFIG = {
  Pending: {
    message: "This renter has requested to book your equipment.",
    badge: "bg-[#FFF0C6] text-[#EF8700]"
  },
  Declined: {
    message: "The rental request was declined.",
    badge: "bg-[#D3D3D3] text-[#666666]"
  },
  Upcoming: {
    message: "This booking has been confirmed and is awaiting handover.",
    badge: "bg-[#E4E0EB] text-[#60586D]"
  },
  Active: {
    message: "This equipment is currently with the renter.",
    badge: "bg-[#CFF7E1] text-[#00B76A]"
  },
  Completed: {
    message: "This rental has been completed.",
    badge: "bg-[#D3E6F8] text-[#24527D]"
  },
  Overdue: {
    message: "This equipment has not been returned by the due date.",
    badge: "bg-[#FFE0DF] text-[#FF453A]"
  }
};

const TRANSITIONS = {
  accept: {
    allowedFrom: ["Pending"],
    nextStatus: "Upcoming"
  },
  decline: {
    allowedFrom: ["Pending"],
    nextStatus: "Declined"
  },
  handover: {
    allowedFrom: ["Upcoming"],
    nextStatus: "Active"
  },
  return: {
    allowedFrom: ["Active", "Overdue"],
    nextStatus: "Completed"
  }
};

// ======================================================
// DOM HELPERS
// ======================================================

function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = String(value ?? "");
  }
}

function setVisible(selector, visible) {
  const element = $(selector);

  if (element) {
    element.classList.toggle("hidden", !visible);
  }
}

function setFlexVisible(selector, visible) {
  const element = $(selector);

  if (!element) return;

  element.classList.toggle("hidden", !visible);
  element.classList.toggle("flex", visible);
}

function setImage(selector, source, alt) {
  const image = $(selector);

  if (!image) return;

  image.src = source || "";
  image.alt = alt || "";
}

function showPageMessage(message, isError = false) {
  const element = $("#pageMessage");

  if (!element) return;

  element.textContent = message;

  element.className = isError
    ? "mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
    : "mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700";
}

function hidePageMessage() {
  const element = $("#pageMessage");

  if (!element) return;

  element.textContent = "";
  element.className = "hidden";
}

// ======================================================
// FORMATTING
// ======================================================

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error("Invalid amount in booking data.");
  }

  return `₦${number.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

function parseDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(`Invalid date format: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid booking date: ${value}`);
  }

  return date;
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateRange(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    const month = start.toLocaleDateString("en-US", {
      month: "short"
    });

    return `${month} ${start.getDate()} – ${month} ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${formatDate(startValue)} – ${formatDate(endValue)}`;
}

function currentTimestamp() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date());
}

function getBookingId() {
  const params = new URLSearchParams(window.location.search);

  return params.get("id") || "booking-001";
}

// ======================================================
// VALIDATION
// ======================================================

function validateBooking(booking) {
  if (!booking || typeof booking !== "object") {
    throw new Error("Booking data is missing.");
  }

  if (!booking.id) {
    throw new Error("Booking ID is missing.");
  }

  if (!STATUS_CONFIG[booking.status]) {
    throw new Error(`Unknown booking status: ${booking.status}`);
  }

  if (
    !booking.equipment ||
    !booking.renter ||
    !booking.rentalPeriod ||
    !booking.payment
  ) {
    throw new Error("Booking data is incomplete.");
  }

  if (
    !booking.equipment.name ||
    !booking.renter.name ||
    !booking.rentalPeriod.location
  ) {
    throw new Error("Required booking details are missing.");
  }

  const duration = Number(booking.rentalPeriod.durationDays);
  const rate = Number(booking.equipment.dailyRate);
  const deposit = Number(booking.payment.refundableDeposit);

  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isFinite(deposit) ||
    deposit < 0
  ) {
    throw new Error("Invalid rental duration or payment values.");
  }

  const pickup = parseDate(booking.rentalPeriod.pickup);
  const returnDate = parseDate(booking.rentalPeriod.return);

  if (returnDate < pickup) {
    throw new Error("Return date cannot be earlier than pickup date.");
  }

  return booking;
}

// ======================================================
// LOCAL STORAGE
// ======================================================

function getSavedBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const data = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return {};
    }

    return data;

  } catch (error) {
    console.warn("Could not read saved bookings:", error);
    return {};
  }
}

function saveBooking(booking) {
  const records = getSavedBookings();

  records[booking.id] = {
    status: booking.status,
    handoverAt: booking.handoverAt ?? null,
    returnedAt: booking.returnedAt ?? null,
    daysOverdue: booking.daysOverdue ?? 0
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ======================================================
// API
// ======================================================

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
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.message ||
      `Booking request failed (${response.status}).`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

// ======================================================
// FETCH BOOKING DETAILS
// ======================================================

async function getBookingDetails(id) {
  let result;

  if (USE_MOCK_DATA) {
    const response = await fetch(JSON_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Cannot load booking-details.json (${response.status}).`
      );
    }

    result = await response.json();

  } else {
    result = await apiRequest(
      `/owner/bookings/${encodeURIComponent(id)}`
    );
  }

  let booking;

  if (Array.isArray(result?.bookings)) {
    booking = result.bookings.find(
      item => String(item.id) === String(id)
    );
  } else {
    booking = result?.booking ?? result;
  }

  if (!booking || String(booking.id) !== String(id)) {
    throw new Error(`Booking ${id} was not found.`);
  }

  validateBooking(booking);

  if (USE_MOCK_DATA) {
    const saved = getSavedBookings()[booking.id];

    if (saved && STATUS_CONFIG[saved.status]) {
      booking = {
        ...booking,
        ...saved
      };
    }
  }

  return validateBooking(booking);
}

// ======================================================
// BOOKING STATUS PANEL
// ======================================================

function createStatusStep(label, detail, type) {
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-3";

  const left = document.createElement("div");
  left.className = "flex min-w-0 items-center gap-3";

  const icon = document.createElement("span");

  const styles = {
    success: {
      className: "bg-[#10B981]",
      symbol: "✓"
    },
    pending: {
      className: "bg-[#FF9400]",
      symbol: "•••"
    },
    overdue: {
      className: "bg-[#F83E36]",
      symbol: "!"
    }
  };

  const style = styles[type] || styles.pending;

  icon.className =
    `flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${style.className}`;

  icon.textContent = style.symbol;

  const title = document.createElement("span");
  title.className = "text-[14px] text-[#454545]";
  title.textContent = label;

  left.append(icon, title);
  row.appendChild(left);

  if (detail) {
    const value = document.createElement("span");

    value.className =
      "shrink-0 text-right text-[13px] text-[#303030]";

    value.textContent = detail;

    row.appendChild(value);
  }

  return row;
}

function renderStatusPanel() {
  const booking = state.booking;
  const container = $("#bookingStatusSteps");

  if (!booking || !container) return;

  const status = booking.status;

  const visible = [
    "Upcoming",
    "Active",
    "Completed",
    "Overdue"
  ].includes(status);

  setVisible("#bookingStatusPanel", visible);

  container.replaceChildren();

  if (!visible) return;

  if (status === "Upcoming") {
    container.append(
      createStatusStep("Handover Pending", "", "pending")
    );
    return;
  }

  container.append(
    createStatusStep(
      "Handover Completed",
      booking.handoverAt || "Completed",
      "success"
    )
  );

  if (status === "Active") {
    container.append(
      createStatusStep("Return Pending", "", "pending")
    );
  }

  if (status === "Completed") {
    container.append(
      createStatusStep(
        "Return Completed",
        booking.returnedAt || "Completed",
        "success"
      )
    );
  }

  if (status === "Overdue") {
    const days = Number(booking.daysOverdue) || 0;

    const detail = days > 0
      ? `${days} ${days === 1 ? "day" : "days"} overdue`
      : "Overdue";

    container.append(
      createStatusStep("Return Overdue", detail, "overdue")
    );
  }
}

// ======================================================
// RENDER BOOKING STATUS
// ======================================================

function renderBookingStatus() {
  const booking = state.booking;

  if (!booking) return;

  const config = STATUS_CONFIG[booking.status];

  setText("#requestMessage", config.message);

  const badge = $("#bookingStatus");

  if (badge) {
    badge.textContent = booking.status;

    badge.className =
      `shrink-0 rounded-xl px-3 py-1.5 text-[15px] font-medium ${config.badge}`;
  }

  const paidStatuses = [
    "Upcoming",
    "Active",
    "Completed",
    "Overdue"
  ];

  setText(
    "#totalLabel",
    paidStatuses.includes(booking.status) ? "Total Paid" : "Total"
  );

  // Accept and Decline appear only for Pending.
  setVisible(
    "#bookingActions",
    booking.status === "Pending"
  );

  const lifecycleLabels = {
    Upcoming: "Mark as handed over",
    Active: "Mark as returned",
    Overdue: "Mark as returned"
  };

  const lifecycleLabel = lifecycleLabels[booking.status];

  setText("#lifecycleButton", lifecycleLabel || "");

  setVisible(
    "#lifecycleButton",
    Boolean(lifecycleLabel)
  );

  const showIssue = [
    "Active",
    "Completed",
    "Overdue"
  ].includes(booking.status);

  setFlexVisible("#reportIssueButton", showIssue);

  setText(
    "#issueDescription",
    booking.status === "Completed"
      ? "Found any damage? You can file a claim."
      : "Having a problem with this rental? You can file a claim."
  );

  renderStatusPanel();
}

// ======================================================
// RENDER FULL BOOKING
// ======================================================

function renderBooking() {
  const booking = state.booking;

  if (!booking) return;

  validateBooking(booking);

  const equipment = booking.equipment;
  const renter = booking.renter;
  const period = booking.rentalPeriod;
  const payment = booking.payment;

  const days = Number(period.durationDays);
  const rate = Number(equipment.dailyRate);
  const deposit = Number(payment.refundableDeposit);

  const rentalFee = days * rate;
  const total = rentalFee + deposit;

  setImage(
    "#equipmentImage",
    equipment.image,
    equipment.name
  );

  setImage(
    "#renterAvatar",
    renter.avatar,
    renter.name
  );

  if (booking.owner?.avatar) {
    setImage(
      "#ownerAvatar",
      booking.owner.avatar,
      "Owner profile"
    );
  }

  setText("#equipmentName", equipment.name);

  setText(
    "#equipmentDates",
    formatDateRange(period.pickup, period.return)
  );

  setText(
    "#equipmentPrice",
    formatMoney(rate)
  );

  setText("#renterName", renter.name);
  setText("#renterPhone", renter.phone);

  setVisible(
    "#renterVerified",
    Boolean(renter.verified)
  );

  setText(
    "#pickupDate",
    formatDate(period.pickup)
  );

  setText(
    "#returnDate",
    formatDate(period.return)
  );

  setText(
    "#rentalDuration",
    `${days} ${days === 1 ? "day" : "days"}`
  );

  setText(
    "#rentalLocation",
    period.location
  );

  setText(
    "#rentalFeeLabel",
    `Rental fee (${days} ${days === 1 ? "day" : "days"} × ${formatMoney(rate)})`
  );

  setText(
    "#rentalFeeAmount",
    formatMoney(rentalFee)
  );

  setText(
    "#depositAmount",
    formatMoney(deposit)
  );

  setText(
    "#totalAmount",
    formatMoney(total)
  );

  renderBookingStatus();
}

// ======================================================
// MODAL MANAGEMENT
// ======================================================

function openModal(selector) {
  const modal = $(selector);

  if (!modal) return;

  // Save focus only when opening the first modal.
  if (!state.activeModal) {
    state.previousFocus = document.activeElement;
  } else {
    const oldModal = $(state.activeModal);

    oldModal?.classList.add("hidden");
    oldModal?.classList.remove("flex");
  }

  state.activeModal = selector;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  document.body.classList.add("overflow-hidden");

  modal.querySelector("button:not(:disabled)")?.focus();
}

function closeModal() {
  if (!state.activeModal) return;

  const modal = $(state.activeModal);

  modal?.classList.add("hidden");
  modal?.classList.remove("flex");

  state.activeModal = null;

  document.body.classList.remove("overflow-hidden");

  // Only now update the Pending background to Declined.
  if (state.deferredRender) {
    state.deferredRender = false;
    renderBooking();
  }

  const focusTarget = state.previousFocus;
  state.previousFocus = null;

  if (
    focusTarget?.isConnected &&
    typeof focusTarget.focus === "function" &&
    !focusTarget.closest(".hidden")
  ) {
    focusTarget.focus();
  }
}

function dismissModal() {
  if (state.busy) return;

  closeModal();

  state.pendingAction = null;
  state.failedAction = null;
}

// ======================================================
// CONFIRMATION MODAL
// ======================================================

function openConfirmation(action) {
  if (state.busy) return;

  if (!state.booking || state.booking.status !== "Pending") {
    return;
  }

  if (!["accept", "decline"].includes(action)) {
    return;
  }

  state.pendingAction = action;

  const isDecline = action === "decline";

  setText(
    "#confirmationTitle",
    isDecline
      ? "Reject booking confirmation"
      : "Accept booking confirmation"
  );

  setText(
    "#confirmationText",
    isDecline
      ? "Are you sure you want to reject this booking?"
      : "Are you sure you want to accept this booking?"
  );

  openModal("#confirmationModal");
}

// ======================================================
// FAILURE MODAL
// ======================================================

function showFailure(action, error) {
  console.error("Booking action failed:", error);

  state.failedAction = action;

  setText(
    "#failureDescription",
    "Your equipment booking failed. Check your network connection and try again."
  );

  openModal("#failureModal");
}

// ======================================================
// BUTTON LOADING STATE
// ======================================================

function setBusy(busy) {
  state.busy = busy;

  [
    "#acceptButton",
    "#declineButton",
    "#confirmActionButton",
    "#cancelActionButton",
    "#retryButton",
    "#failureBackButton",
    "#lifecycleButton"
  ].forEach(selector => {
    const button = $(selector);

    if (button) {
      button.disabled = busy;
    }
  });

  setText(
    "#confirmActionButton",
    busy ? "Processing..." : "Yes"
  );

  setText(
    "#retryButton",
    busy ? "Processing..." : "Try Again"
  );
}

// ======================================================
// EXECUTE BOOKING ACTION
// ======================================================

async function performBookingAction(action) {
  const booking = state.booking;
  const transition = TRANSITIONS[action];

  if (!booking || !transition) {
    throw new Error("Invalid booking action.");
  }

  if (!transition.allowedFrom.includes(booking.status)) {
    throw new Error(
      `Cannot ${action} a booking with status ${booking.status}.`
    );
  }

  // MOCK MODE
  if (USE_MOCK_DATA) {

    if (state.forceNextFailure) {
      state.forceNextFailure = false;

      throw new Error("Simulated network failure.");
    }

    const updatedBooking = {
      ...booking,
      status: transition.nextStatus
    };

    if (action === "handover") {
      updatedBooking.handoverAt = currentTimestamp();
    }

    if (action === "return") {
      updatedBooking.returnedAt = currentTimestamp();
      updatedBooking.daysOverdue = 0;
    }

    // Preview mode must not modify saved booking data.
    if (!state.previewMode) {
      saveBooking(updatedBooking);
    }

    return updatedBooking;
  }

  // BACKEND MODE
  // Implement these routes on your backend:
  //
  // PATCH /api/owner/bookings/:id/accept
  // PATCH /api/owner/bookings/:id/decline
  // PATCH /api/owner/bookings/:id/handover
  // PATCH /api/owner/bookings/:id/return

  const result = await apiRequest(
    `/owner/bookings/${encodeURIComponent(booking.id)}/${action}`,
    {
      method: "PATCH"
    }
  );

  if (!result?.booking) {
    throw new Error(
      "Server did not return the updated booking."
    );
  }

  const updatedBooking = validateBooking(result.booking);

  if (String(updatedBooking.id) !== String(booking.id)) {
    throw new Error(
      "Server returned a different booking."
    );
  }

  if (updatedBooking.status !== transition.nextStatus) {
    throw new Error(
      "Server returned an unexpected booking status."
    );
  }

  return updatedBooking;
}

// ======================================================
// SUBMIT BOOKING ACTION
// ======================================================

async function submitBookingAction(action) {
  if (state.busy) return;

  const transition = TRANSITIONS[action];

  if (
    !transition ||
    !state.booking ||
    !transition.allowedFrom.includes(state.booking.status)
  ) {
    showPageMessage(
      "This action is not available for the current booking.",
      true
    );
    return;
  }

  setBusy(true);

  try {
    const updatedBooking = await performBookingAction(action);

    // Only update state after successful execution.
    state.booking = updatedBooking;

    state.pendingAction = null;
    state.failedAction = null;

    hidePageMessage();
    setBusy(false);

    if (action === "decline") {
      // Keep the Pending Booking Details background
      // until Booking Cancelled popup is dismissed.
      state.deferredRender = true;

      openModal("#cancelledModal");
      return;
    }

    renderBooking();
    closeModal();

  } catch (error) {
    setBusy(false);

    // Status stays unchanged after a failed action.
    showFailure(action, error);
  }
}

// ======================================================
// RETRY FAILED ACTION
// ======================================================

function retryFailedAction() {
  if (state.busy || !state.failedAction) {
    return;
  }

  submitBookingAction(state.failedAction);
}

// ======================================================
// HANDOVER / RETURN
// ======================================================

function handleLifecycleAction() {
  const status = state.booking?.status;

  if (status === "Upcoming") {
    submitBookingAction("handover");
    return;
  }

  if (status === "Active" || status === "Overdue") {
    submitBookingAction("return");
  }
}

// ======================================================
// NAVIGATION
// ======================================================

function viewEquipmentDetails() {
  if (!state.booking) return;

  const equipmentId = state.booking.equipment.id;

  const separator = EQUIPMENT_DETAILS_URL.includes("?")
    ? "&"
    : "?";

  window.location.href =
    `${EQUIPMENT_DETAILS_URL}${separator}id=${encodeURIComponent(equipmentId)}`;
}

function backToEquipment() {
  window.location.href = EQUIPMENT_LIST_URL;
}

function reportIssue() {
  if (!state.booking) return;

  if (!REPORT_ISSUE_URL) {
    showPageMessage(
      "The dispute page has not been connected yet.",
      true
    );
    return;
  }

  const separator = REPORT_ISSUE_URL.includes("?")
    ? "&"
    : "?";

  window.location.href =
    `${REPORT_ISSUE_URL}${separator}bookingId=${encodeURIComponent(state.booking.id)}`;
}

// ======================================================
// DEMO PREVIEW
// ======================================================

function applyPreviewMode() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get("demo");

  const modes = {
    pending: "Pending",
    declined: "Declined",
    upcoming: "Upcoming",
    active: "Active",
    completed: "Completed",
    overdue: "Overdue",
    confirm: "Pending",
    cancelled: "Pending",
    failed: "Pending"
  };

  if (!demo || !modes[demo]) return;

  state.previewMode = demo;

  state.booking = {
    ...state.booking,
    status: modes[demo],
    handoverAt: null,
    returnedAt: null,
    daysOverdue: 0
  };

  if (["active", "completed", "overdue"].includes(demo)) {
    state.booking.handoverAt = "Apr 26, 2025 | 10:00AM";
  }

  if (demo === "completed") {
    state.booking.returnedAt = "Apr 28, 2025 | 06:00PM";
  }

  if (demo === "overdue") {
    state.booking.daysOverdue = 3;
  }

  if (demo === "failed") {
    state.failedAction = "decline";
  }
}

// ======================================================
// KEYBOARD ACCESSIBILITY
// ======================================================

function handleModalKeyboard(event) {
  if (!state.activeModal) return;

  if (event.key === "Escape") {
    if (!state.busy) {
      dismissModal();
    }
    return;
  }

  if (event.key !== "Tab") return;

  const modal = $(state.activeModal);

  if (!modal) return;

  const buttons = Array.from(
    modal.querySelectorAll("button:not(:disabled)")
  );

  if (!buttons.length) {
    event.preventDefault();
    return;
  }

  const first = buttons[0];
  const last = buttons[buttons.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// ======================================================
// EVENT LISTENERS
// ======================================================

function bindEvents() {

  $("#declineButton")?.addEventListener("click", () => {
    openConfirmation("decline");
  });

  $("#acceptButton")?.addEventListener("click", () => {
    openConfirmation("accept");
  });

  $("#confirmActionButton")?.addEventListener("click", () => {
    if (state.pendingAction) {
      submitBookingAction(state.pendingAction);
    }
  });

  $("#cancelActionButton")?.addEventListener(
    "click",
    dismissModal
  );

  $("#viewEquipmentButton")?.addEventListener(
    "click",
    viewEquipmentDetails
  );

  $("#backToEquipmentButton")?.addEventListener(
    "click",
    backToEquipment
  );

  $("#retryButton")?.addEventListener(
    "click",
    retryFailedAction
  );

  $("#failureBackButton")?.addEventListener(
    "click",
    dismissModal
  );

  $("#lifecycleButton")?.addEventListener(
    "click",
    handleLifecycleAction
  );

  $("#reportIssueButton")?.addEventListener(
    "click",
    reportIssue
  );

  $("#logoutButton")?.addEventListener("click", () => {
    localStorage.removeItem("ownerToken");
    window.location.href = LOGIN_URL;
  });

  [
    "#confirmationModal",
    "#cancelledModal",
    "#failureModal"
  ].forEach(selector => {
    $(selector)?.addEventListener("click", event => {
      if (state.busy) return;

      if (event.target === event.currentTarget) {
        dismissModal();
      }
    });
  });

  document.addEventListener(
    "keydown",
    handleModalKeyboard
  );

  ["#equipmentImage", "#renterAvatar", "#ownerAvatar"].forEach(selector => {
    $(selector)?.addEventListener("error", event => {
      const image = event.currentTarget;

      console.warn(
        "Image could not be loaded:",
        image.getAttribute("src")
      );

      image.removeAttribute("src");
      image.classList.add("bg-gray-100");
    });
  });
}

// ======================================================
// INITIALIZE PAGE
// ======================================================

async function initialize() {
  bindEvents();
  hidePageMessage();

  try {
    state.booking = await getBookingDetails(getBookingId());

    applyPreviewMode();

    renderBooking();

    setVisible("#loadingMessage", false);
    setVisible("#bookingContent", true);

    if (state.previewMode === "confirm") {
      openConfirmation("decline");
    }

    if (state.previewMode === "cancelled") {
      // Show the Pending background first.
      // Store Declined as the next state to render.
      state.booking = {
        ...state.booking,
        status: "Declined"
      };

      state.deferredRender = true;

      openModal("#cancelledModal");
    }

    if (state.previewMode === "failed") {
      showFailure(
        "decline",
        new Error("Failure preview")
      );
    }

  } catch (error) {
    console.error(
      "Booking details failed to load:",
      error
    );

    setVisible("#loadingMessage", false);

    showPageMessage(
      error.message || "Unable to load booking details.",
      true
    );
  }
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
