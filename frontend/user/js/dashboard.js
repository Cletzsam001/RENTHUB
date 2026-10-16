// RentHub Dashboard JavaScript

// Image / asset URLs
// Add your Cloudinary URLs here when available.
const ASSETS = {
  camera: "",
  light: "",
  avatar: "",
  logo: "",
  search: "",
  calendar: "",
  clock: "",
  check: "",
  wallet: "",
  package: "",
  tag: "",
  bell: ""
};

// ===============================
// Signed-in user details & role routing
// ===============================

function loadUserAccount() {
  try {
    const email = localStorage.getItem("renthub_session");
    const users = JSON.parse(localStorage.getItem("renthub_users") || "{}");
    const user = email && users[email];

    if (!user) return;

    if (user.role === "owner") {
      const isApproved = user.kycStatus === "verified";
      if (!isApproved) {
        alert("Your KYC is still under review or pending admin approval.");
        window.location.href = "../../onboarding/index.html";
        return;
      }
    }

    const firstName = user.firstName || "there";
    const greeting = document.getElementById("dashboardGreeting");
    const personalization = document.getElementById("dashboardPersonalization");
    const avatar = document.getElementById("dashboardAvatar");

    if (greeting) greeting.textContent = `Welcome back, ${firstName}`;
    if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
    if (personalization) {
      personalization.textContent = user.categories?.length
        ? `Your interests: ${user.categories.join(", ")}`
        : "Here's your rental activity at a glance.";
    }
  } catch (error) {
    // Keep the dashboard usable if browser storage is unavailable.
  }
}

loadUserAccount();

function renderRecommendedEquipment(items) {
  const container = document.getElementById("recommendedEquipment");
  if (!container) return;

  container.replaceChildren();

  let interests = [];
  try {
    const users = JSON.parse(localStorage.getItem("renthub_users") || "{}");
    interests = users[localStorage.getItem("renthub_session")]?.categories || [];
  } catch {}
  const recommended = [...items]
    .sort((first, second) => interests.includes(second[1]) - interests.includes(first[1]))
    .slice(0, 4);

  if (!recommended.length) {
    const message = document.createElement("p");
    message.className = "py-4 text-sm text-[#7189a1]";
    message.textContent = "No approved equipment is available for booking yet.";
    container.appendChild(message);
    return;
  }

  recommended.forEach(([name, category, location, price, , imageUrl]) => {
    const card = document.createElement("article");
    card.className = "equipment-card";

    const imageFrame = document.createElement("div");
    imageFrame.className = "equipment-image";
    const image = document.createElement("img");
    image.src = imageUrl || "";
    image.alt = name;
    image.loading = "lazy";
    const fallback = document.createElement("span");
    fallback.className = "asset-fallback";
    fallback.textContent = "📦";
    imageFrame.append(image, fallback);

    const info = document.createElement("div");
    info.className = "equipment-info";
    const title = document.createElement("h3");
    title.textContent = name;
    const categoryText = document.createElement("p");
    categoryText.textContent = category;
    const locationText = document.createElement("p");
    locationText.textContent = location;
    info.append(title, categoryText, locationText);

    const side = document.createElement("div");
    side.className = "equipment-side";
    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "heart-btn";
    favorite.dataset.favorite = name;
    favorite.setAttribute("aria-label", `Add ${name} to favorites`);
    favorite.setAttribute("aria-pressed", "false");
    favorite.textContent = "♡";
    const priceText = document.createElement("p");
    priceText.textContent = `₦${price.toLocaleString("en-NG")}/day`;
    side.append(favorite, priceText);

    card.append(imageFrame, info, side);
    container.appendChild(card);
  });
}

const recommendedContainer = document.getElementById("recommendedEquipment");
recommendedContainer?.replaceChildren();
document.querySelectorAll("[data-demo-rentals]").forEach((container) => {
  const message = document.createElement("p");
  message.className = "py-4 text-sm text-[#7189a1]";
  message.textContent = container.dataset.demoRentals === "upcoming"
    ? "No upcoming rentals yet."
    : "No recent rentals yet.";
  container.replaceChildren(message);
});
window.RentHubItemsReady.then(renderRecommendedEquipment).catch((error) => {
  if (!recommendedContainer) return;
  const message = document.createElement("p");
  message.className = "py-4 text-sm text-red-600";
  message.textContent = "Available equipment could not be loaded.";
  recommendedContainer.replaceChildren(message);
  console.error("Equipment load failed:", error);
});


// ===============================
// Toast notification
// ===============================

const toast = document.getElementById("toast");

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}


// ===============================
// Load asset URLs
// ===============================

document.querySelectorAll("[data-asset]").forEach((image) => {
  const assetName = image.dataset.asset;
  const assetURL = window.getRentHubItemImage(image.alt) || ASSETS[assetName];

  if (assetURL) {
    image.src = assetURL;
    image.style.objectFit = "contain";

    const fallback = image.parentElement.querySelector(".asset-fallback");

    if (fallback) {
      fallback.style.display = "none";
    }
  }
});


// ===============================
// Sidebar navigation
// ===============================

const navItems = document.querySelectorAll(".nav-item[data-section]");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const section = item.dataset.section;

    if (section === "Profile") {
      window.location.href = "profile.html";
      return;
    }

    if (section === "Dispute") {
      window.location.href = "disputes.html";
      return;
    }

    if (isFavoritesView) {
      const destinations = {
        Dashboard: "dashboard.html",
        "My Rentals": "my-rentals.html"
      };
      const destination = destinations[section];
      if (destination) {
        window.location.href = destination;
        return;
      }
    }

    navItems.forEach((nav) => {
      nav.classList.remove("active");
    });

    item.classList.add("active");

    if (section !== "Dashboard") {
      showToast(`${section} selected`);
    }

    if (window.innerWidth <= 900) {
      closeSidebar();
    }
  });
});


// ===============================
// Mobile sidebar
// ===============================

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuButton = document.getElementById("menuBtn");

function openSidebar() {
  if (!sidebar || !sidebarOverlay) return;

  sidebar.classList.add("open");
  sidebarOverlay.classList.remove("hidden");
}

function closeSidebar() {
  if (!sidebar || !sidebarOverlay) return;

  sidebar.classList.remove("open");
  sidebarOverlay.classList.add("hidden");
}

if (menuButton) {
  menuButton.addEventListener("click", openSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}


// ===============================
// Search
// ===============================

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (isFavoritesView) return;

    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
      showToast("Type something to search.");
      return;
    }

    showToast(`Searching for "${searchTerm}"`);
  });
}


// ===============================
// Favorites view
// ===============================

const favoritesContent = document.getElementById("favoritesContent");
const dashboardContent = document.getElementById("dashboardContent");
const paymentsContent = document.getElementById("paymentsContent");
const depositsContent = document.getElementById("depositsContent");
const paymentHistoryContent = document.getElementById("paymentHistoryContent");
const paymentHistoryTableBody = document.getElementById("paymentHistoryTableBody");
const paymentDetailsContent = document.getElementById("paymentDetailsContent");
const paymentDetailsTableBody = document.getElementById("paymentDetailsTableBody");
const depositTableBody = document.getElementById("depositTableBody");
const favoritesList = document.getElementById("favoritesList");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const favoritesCount = document.getElementById("favoritesCount");
const isFavoritesView = new URLSearchParams(window.location.search).get("view") === "favorites";
const isPaymentsView = new URLSearchParams(window.location.search).get("view") === "payments";
const isDepositsView = isPaymentsView && window.location.hash === "#depositsContent";
const isPaymentHistoryView = isPaymentsView && window.location.hash === "#paymentHistoryContent";
const isPaymentDetailsView = isPaymentsView && window.location.hash === "#paymentDetailsContent";
const paymentStatusFilter = {
  cancelled: "Cancelled"
}[new URLSearchParams(window.location.search).get("paymentStatus")];
const depositStatusFilter = {
  released: "Released",
  deducted: "Deducted"
}[new URLSearchParams(window.location.search).get("depositStatus")];

const paymentHistoryRecords = [];

function renderPaymentHistory() {
  if (!paymentHistoryTableBody) return;

  const statusStyles = {
    Completed: "bg-[#ecfdf3] text-[#14945a]",
    Pending: "bg-[#fff4ce] text-[#b77900]",
    Cancelled: "bg-[#fee4e2] text-[#c4322a]"
  };

  const visibleRecords = paymentHistoryRecords
    .map((record, index) => ({ ...record, index }))
    .filter((record) => !paymentStatusFilter || record.status === paymentStatusFilter);

  if (!visibleRecords.length) {
    paymentHistoryTableBody.innerHTML = '<tr><td colspan="4" class="px-5 py-6 text-center text-sm text-[#7189a1]">No payment history yet.</td></tr>';
    return;
  }

  paymentHistoryTableBody.innerHTML = visibleRecords.map((record) => `
    <tr class="h-[49px] hover:bg-[#f8fbfe]">
      <td class="px-5 py-2.5">${record.date}</td>
      <td class="whitespace-nowrap px-5 py-2.5 font-semibold">₦ ${record.amount.toLocaleString("en-NG")}</td>
      <td class="px-5 py-2.5"><span class="inline-flex min-w-[60px] justify-center rounded-full px-2 py-1 text-[10px] ${statusStyles[record.status]}">${record.status}</span></td>
      <td class="px-5 py-2.5"><button class="rounded-md border border-[#d2d9e0] bg-[#1f4e79] px-3 py-1 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#13314c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f4e79]" type="button" data-payment-history-index="${record.index}">View Details</button></td>
    </tr>
  `).join("");
}

renderPaymentHistory();

function renderPaymentDetails() {
  if (!paymentDetailsTableBody) return;

  const statusStyles = {
    Completed: "bg-[#ecfdf3] text-[#14945a]",
    Pending: "bg-[#fff4ce] text-[#b77900]",
    Cancelled: "bg-[#fee4e2] text-[#c4322a]"
  };

  paymentDetailsTableBody.innerHTML = paymentHistoryRecords.map((record) => `
    <tr class="min-h-[52px] hover:bg-[#f8fbfe]">
      <td class="whitespace-nowrap px-4 py-3 font-semibold">₦ ${record.amount.toLocaleString("en-NG")}</td>
      <td class="whitespace-nowrap px-4 py-3">${record.method}</td>
      <td class="whitespace-nowrap px-4 py-3 font-medium">${record.reference}</td>
      <td class="px-4 py-3"><span class="inline-flex min-w-[68px] justify-center rounded-full px-2 py-1 text-[10px] ${statusStyles[record.status]}">${record.status}</span></td>
      <td class="whitespace-nowrap px-4 py-3">${record.equipment}</td>
      <td class="whitespace-nowrap px-4 py-3">${record.owner}</td>
    </tr>
  `).join("");
}

renderPaymentDetails();

paymentHistoryTableBody?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-payment-history-index]");
  if (!button) return;

  const record = paymentHistoryRecords[Number(button.dataset.paymentHistoryIndex)];
  if (!record) return;

  document.getElementById("paymentHistoryDetailDate").textContent = record.date;
  document.getElementById("paymentHistoryDetailAmount").textContent = `₦ ${record.amount.toLocaleString("en-NG")}`;
  document.getElementById("paymentHistoryDetailStatus").textContent = record.status;
  document.getElementById("paymentHistoryDetailsDialog").showModal();
});

const depositRecords = [
  { name: "Tunde Martins", amount: 45000, status: "Released" },
  { name: "Newton Daniels", amount: 80000, status: "Released" },
  { name: "Bola Martins", amount: 105000, status: "Pending" },
  { name: "Bola Martins", amount: 95000, status: "Deducted" },
  { name: "Emeka Nwosu", amount: 200000, status: "Released" },
  { name: "Amina Yusuf", amount: 100000, status: "Released" },
  { name: "Bola Martins", amount: 65000, status: "Pending" },
  { name: "Bola Martins", amount: 250000, status: "Released" },
  { name: "Bola Martins", amount: 115000, status: "Deducted" },
  { name: "Bola Martins", amount: 165000, status: "Released" }
];

function renderDepositRecords() {
  if (!depositTableBody) return;

  const statusStyles = {
    Released: "bg-[#ecfdf3] text-[#14945a]",
    Pending: "bg-[#fff4ce] text-[#b77900]",
    Deducted: "bg-[#fee4e2] text-[#c4322a]"
  };

  const visibleRecords = depositRecords
    .map((record, index) => ({ ...record, index }))
    .filter((record) => !depositStatusFilter || record.status === depositStatusFilter);

  depositTableBody.innerHTML = visibleRecords.map((record) => `
    <tr class="h-[52px] hover:bg-[#f8fbfe]">
      <td class="px-5 py-2.5">${record.name}</td>
      <td class="whitespace-nowrap px-5 py-2.5 font-semibold">₦ ${record.amount.toLocaleString("en-NG")}</td>
      <td class="px-5 py-2.5"><span class="inline-flex min-w-[66px] justify-center rounded-full px-2.5 py-1 text-[11px] ${statusStyles[record.status]}">${record.status}</span></td>
      <td class="px-5 py-2.5"><button class="rounded-md border border-[#d2d9e0] bg-[#1f4e79] px-3 py-1 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#13314c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f4e79]" type="button" data-deposit-index="${record.index}">View Details</button></td>
    </tr>
  `).join("");
}

renderDepositRecords();

depositTableBody?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-deposit-index]");
  if (!button) return;

  const record = depositRecords[Number(button.dataset.depositIndex)];
  if (!record) return;

  document.getElementById("depositDetailName").textContent = record.name;
  document.getElementById("depositDetailAmount").textContent = `₦ ${record.amount.toLocaleString("en-NG")}`;
  document.getElementById("depositDetailStatus").textContent = record.status;
  document.getElementById("depositDetailsDialog").showModal();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  });
});

document.querySelectorAll("[data-finance-back]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "dashboard.html?view=payments";
  });
});

document.getElementById("reportDepositDispute")?.addEventListener("click", () => {
  window.location.href = "disputes.html";
});

function renderFavorites() {
  if (!favoritesList || !window.RentHubFavorites || !window.RentHubItems) return;

  const savedNames = new Set(window.RentHubFavorites.getAll());
  const items = window.RentHubItems.filter(([name]) => savedNames.has(name));

  favoritesCount.textContent = items.length
    ? `${items.length} saved item${items.length === 1 ? "" : "s"}`
    : "";
  favoritesList.innerHTML = items.map(([name, category, location, price, emoji, imageURL]) => `
    <article class="equipment-card">
      <div class="equipment-image">${imageURL
        ? `<img src="${imageURL}" alt="${name}" style="object-fit: contain">`
        : `<span class="asset-fallback">${emoji}</span>`}</div>
      <div class="equipment-info">
        <h3>${name}</h3>
        <p>${category}</p>
        <p>${location}</p>
      </div>
      <div class="equipment-side">
        <button class="heart-btn liked" data-favorite="${name}" type="button" aria-label="Remove ${name} from favorites" aria-pressed="true">♥</button>
        <p>₦${price.toLocaleString("en-NG")}<small>/day</small></p>
      </div>
    </article>
  `).join("");
  window.RentHubItemNavigation?.refresh();
  filterFavorites();
}

function filterFavorites() {
  if (!favoritesList || !favoritesEmpty) return;

  const query = searchInput?.value.trim().toLowerCase() || "";
  const cards = [...favoritesList.querySelectorAll(".equipment-card")];
  let visibleCount = 0;

  cards.forEach((card) => {
    const matches = card.textContent.toLowerCase().includes(query);
    card.style.display = matches ? "" : "none";
    visibleCount += Number(matches);
  });

  favoritesCount.textContent = query
    ? `${visibleCount} of ${cards.length} items`
    : cards.length
      ? `${cards.length} saved item${cards.length === 1 ? "" : "s"}`
      : "";

  const hasNoResults = cards.length === 0 || visibleCount === 0;
  favoritesEmpty.classList.toggle("hidden", !hasNoResults);
  favoritesEmpty.querySelector("h2").textContent = cards.length && query
    ? "No matching favorites"
    : "No favorites yet";
  favoritesEmpty.querySelector("p").textContent = cards.length && query
    ? "Try a different search term."
    : "Items you save will appear here.";
}

if (isFavoritesView) {
  favoritesContent.hidden = false;
  dashboardContent.hidden = true;
} else if (isPaymentsView) {
  dashboardContent.hidden = true;
  if (isDepositsView) {
    depositsContent.hidden = false;
    window.scrollTo(0, 0);
  } else if (isPaymentHistoryView) {
    paymentHistoryContent.hidden = false;
    window.scrollTo(0, 0);
  } else if (isPaymentDetailsView) {
    paymentDetailsContent.hidden = false;
    window.scrollTo(0, 0);
  } else {
    paymentsContent.hidden = false;
  }
}

window.addEventListener("hashchange", () => {
  if (new URLSearchParams(window.location.search).get("view") !== "payments") return;

  const showDeposits = window.location.hash === "#depositsContent";
  const showPaymentHistory = window.location.hash === "#paymentHistoryContent";
  const showPaymentDetails = window.location.hash === "#paymentDetailsContent";
  dashboardContent.hidden = true;
  paymentsContent.hidden = showDeposits || showPaymentHistory || showPaymentDetails;
  depositsContent.hidden = !showDeposits;
  paymentHistoryContent.hidden = !showPaymentHistory;
  paymentDetailsContent.hidden = !showPaymentDetails;

  if (showDeposits || showPaymentHistory || showPaymentDetails) window.scrollTo(0, 0);
});

renderFavorites();
searchInput?.addEventListener("input", () => {
  if (isFavoritesView) filterFavorites();
});
window.addEventListener("renthub:favoriteschange", renderFavorites);
window.addEventListener("storage", (event) => {
  if (event.key === "renthub-favorite-items") renderFavorites();
});

document.querySelectorAll("[data-finance-action]").forEach((action) => {
  action.addEventListener("click", () => {
    if (action.dataset.financeAction === "Payment History") {
      window.location.href = "dashboard.html?view=payments#paymentHistoryContent";
      return;
    }

    if (action.dataset.financeAction === "Payment Details") {
      window.location.href = "dashboard.html?view=payments#paymentDetailsContent";
      return;
    }

    if (action.dataset.financeAction === "Refunds") {
      window.location.href = "dashboard.html?view=payments&paymentStatus=cancelled#paymentHistoryContent";
      return;
    }

    if (action.dataset.financeAction === "Deposits Release") {
      window.location.href = "dashboard.html?view=payments&depositStatus=released#depositsContent";
      return;
    }

    if (action.dataset.financeAction === "Deposits Deduction") {
      window.location.href = "dashboard.html?view=payments&depositStatus=deducted#depositsContent";
      return;
    }

    if (action.dataset.financeAction.startsWith("Deposit")) {
      window.location.href = "dashboard.html?view=payments#depositsContent";
      return;
    }

    showToast(`${action.dataset.financeAction} details will appear here.`);
  });
});


// ===============================
// View all buttons
// ===============================

document
  .querySelectorAll('[data-action="view-all"]')
  .forEach((button) => {
    button.addEventListener("click", () => {
      showToast("Opening all rentals");
    });
  });


// ===============================
// Notifications
// ===============================

const markReadButton = document.getElementById("markRead");

if (markReadButton) {
  markReadButton.addEventListener("click", () => {
    document
      .querySelectorAll(".notification-item.unread")
      .forEach((notification) => {
        notification.classList.remove("unread");

        const badge = notification.querySelector(".new-badge");

        if (badge) {
          badge.remove();
        }
      });

    showToast("All notifications marked as read");
  });
}


// ===============================
// Profile
// ===============================

const profileButton = document.getElementById("profileButton");

if (profileButton) {
  profileButton.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}


// ===============================
// Learn more
// ===============================

const learnMoreButton = document.getElementById("learnMore");

if (learnMoreButton) {
  learnMoreButton.addEventListener("click", () => {
    showToast("Security and rental protection details");
  });
}


// ===============================
// Logout
// ===============================

const logoutButton = document.getElementById("logoutBtn");

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("renthub_session");
    window.location.href = "../../onboarding/index.html";
  });
}


// ===============================
// Window resize
// ===============================

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    closeSidebar();
  }
});