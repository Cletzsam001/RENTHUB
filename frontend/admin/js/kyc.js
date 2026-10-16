const RENTIT_ADMIN_API = "https://rentit-auth-kyc.onrender.com/api";
const kycTableBody = document.querySelector(".kyc-page .data-table tbody");
const kycSearch = document.querySelector("[data-table-search]");
const kycStatusMessage = document.getElementById("kycLoadStatus");
let kycRecords = [];
let activeKycFilter = "all";

async function kycRequest(endpoint, options = {}) {
  const token = localStorage.getItem("renthub_token");
  const response = await fetch(`${RENTIT_ADMIN_API}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

function displayKycStatus(status) {
  const normalized = String(status || "under_review").toLowerCase();
  if (normalized === "verified" || normalized === "approved") return "Verified";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "resubmit") return "Resubmit";
  return "Under Review";
}

function statusClass(status) {
  if (status === "Verified") return "green";
  if (status === "Rejected") return "red";
  if (status === "Resubmit") return "resubmission";
  return "yellow";
}

function createAction(label, className, dataAttribute, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.setAttribute(dataAttribute, value);
  return button;
}

function createKycRow(record) {
  const row = document.createElement("tr");
  const name = String(record.name || "User");
  const status = displayKycStatus(record.status);
  const submittedAt = record.submittedAt ? new Date(record.submittedAt) : null;

  row.dataset.row = "";
  row.dataset.userId = String(record.id || record._id || "");
  row.dataset.role = String(record.role || "");
  row.dataset.email = String(record.email || "");
  row.dataset.phone = String(record.phone || "");
  row.dataset.location = String(record.address || "");
  row.dataset.documentName = `${record.documentType || "Identity"} document`;
  row.dataset.documentUrl = String(record.documentUrl || "");
  row.dataset.avatarUrl = String(record.avatarUrl || "");
  row.dataset.joined = submittedAt && !Number.isNaN(submittedAt.getTime())
    ? submittedAt.toLocaleDateString()
    : "Not provided";

  const userCell = document.createElement("td");
  const user = document.createElement("div");
  user.className = "user-cell";
  const initials = document.createElement("span");
  initials.className = "initial";
  initials.textContent = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const userName = document.createElement("span");
  userName.textContent = name;
  user.append(initials, userName);
  userCell.appendChild(user);

  const documentType = document.createElement("td");
  documentType.textContent = String(record.documentType || "Not provided");
  const submissionDate = document.createElement("td");
  submissionDate.textContent = row.dataset.joined;
  const statusCell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${statusClass(status)}`;
  badge.textContent = status;
  statusCell.appendChild(badge);

  const actionsCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap items-center gap-2";
  actions.appendChild(createAction("View document", "text-xs font-semibold text-[#1f4e79] hover:underline", "data-row-action", "View document"));

  if (status !== "Verified") {
    actions.appendChild(createAction("Approve", "text-xs font-semibold text-green-700 hover:underline", "data-kyc-action", "verified"));
  }
  if (status !== "Rejected") {
    actions.appendChild(createAction("Reject", "text-xs font-semibold text-red-600 hover:underline", "data-kyc-action", "rejected"));
  }

  actionsCell.appendChild(actions);
  row.append(userCell, documentType, submissionDate, statusCell, actionsCell);
  return row;
}

function renderKycRows() {
  if (!kycTableBody) return;
  kycTableBody.replaceChildren(...kycRecords.map(createKycRow));
  applyKycFilters();
}

function applyKycFilters() {
  if (!kycTableBody) return;
  const query = String(kycSearch?.value || "").trim().toLowerCase();
  const rows = [...kycTableBody.querySelectorAll("tr[data-row]")];

  rows.forEach((row) => {
    const status = row.cells[3]?.textContent.trim().toLowerCase() || "";
    const matchesFilter = activeKycFilter === "all" || status.includes(activeKycFilter);
    row.hidden = !matchesFilter || !row.textContent.toLowerCase().includes(query);
  });

  document.querySelectorAll("[data-tab-group] .tab[data-table-filter]").forEach((tab) => {
    const filter = tab.dataset.tableFilter;
    const count = filter === "all"
      ? rows.length
      : rows.filter((row) => row.cells[3]?.textContent.trim().toLowerCase().includes(filter)).length;
    const countElement = tab.querySelector("[data-filter-count]");
    if (countElement) countElement.textContent = count.toLocaleString();
  });
}

function setKycFeedback(message, isError = false) {
  if (!kycStatusMessage) return;
  kycStatusMessage.textContent = message;
  kycStatusMessage.classList.toggle("text-red-600", isError);
  kycStatusMessage.classList.toggle("text-slate-600", !isError);
}

async function changeKycStatus(button, status) {
  const row = button.closest("tr[data-row]");
  if (!row?.dataset.userId) return;

  let rejectionReason = "";
  if (status === "rejected") {
    rejectionReason = window.prompt("Reason for rejecting this KYC submission:") || "";
    if (!rejectionReason.trim()) return;
  }

  button.disabled = true;
  try {
    await kycRequest(`/admin/verify-user/${encodeURIComponent(row.dataset.userId)}`, {
      method: "PUT",
      body: JSON.stringify({ status, rejectionReason })
    });

    const record = kycRecords.find((item) => String(item.id || item._id) === row.dataset.userId);
    if (record) {
      record.status = status;
      record.rejectionReason = rejectionReason;
    }
    setKycFeedback(`KYC ${status === "verified" ? "approved" : "rejected"} and saved.`);
    renderKycRows();
  } catch (error) {
    button.disabled = false;
    setKycFeedback(error.message, true);
  }
}

async function loadKycSubmissions() {
  if (!kycTableBody) return;
  try {
    const result = await kycRequest("/admin/kyc");
    kycRecords = Array.isArray(result.kyc) ? result.kyc : [];
    renderKycRows();
    setKycFeedback(kycRecords.length ? `${kycRecords.length} KYC submissions loaded.` : "No KYC submissions yet.");
  } catch (error) {
    setKycFeedback(error.message, true);
  }
}

kycSearch?.addEventListener("input", applyKycFilters);
document.querySelectorAll("[data-tab-group] .tab[data-table-filter]").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeKycFilter = tab.dataset.tableFilter || "all";
    applyKycFilters();
  });
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-kyc-action]");
  if (button) changeKycStatus(button, button.dataset.kycAction);
});

document.addEventListener("DOMContentLoaded", loadKycSubmissions);