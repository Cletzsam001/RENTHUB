window.RentHubItemsReady.then((items) => {
  const params = new URLSearchParams(window.location.search);
  const requestedName = params.get("item");
  const item = requestedName ? items.find(([name]) => name === requestedName) : items[0];
  if (!item) return;

  const [name, category, location, price, , itemImage, listedDeposit] = item;
  const deposit = listedDeposit || 20000;
  const image = document.getElementById("itemImage");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const toast = document.getElementById("toast");
  let toastTimer;

  const formatMoney = (amount) => `₦${amount.toLocaleString("en-NG")}`;
  const toDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const addDays = (value, days) => {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateInput(date);
  };
  const rentalDays = () => {
    if (!startInput.value || !endInput.value) return 1;
    const [startYear, startMonth, startDay] = startInput.value.split("-").map(Number);
    const [endYear, endMonth, endDay] = endInput.value.split("-").map(Number);
    const start = Date.UTC(startYear, startMonth - 1, startDay);
    const end = Date.UTC(endYear, endMonth - 1, endDay);
    return Math.max(1, Math.round((end - start) / 86400000));
  };
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  };

  document.title = `RentHub - Checkout - ${name}`;
  document.getElementById("backButton").href = `equipment-details.html?item=${encodeURIComponent(name)}`;
  document.getElementById("itemName").textContent = name;
  document.getElementById("dailyPrice").textContent = `${formatMoney(price)} / day`;
  image.src = window.getRentHubItemImage(name) || itemImage;
  image.alt = name;

  const today = toDateInput(new Date());
  startInput.min = today;
  startInput.value = addDays(today, 1);
  endInput.min = addDays(startInput.value, 1);
  endInput.value = addDays(startInput.value, 3);

  const updateBreakdown = () => {
    if (endInput.value <= startInput.value) {
      endInput.value = addDays(startInput.value, 1);
    }
    endInput.min = addDays(startInput.value, 1);
    const days = rentalDays();
    const rentalCost = price * days;
    document.getElementById("dailyBreakdown").textContent = `${formatMoney(price)} × ${days}`;
    document.getElementById("rentalTotal").textContent = formatMoney(rentalCost);
    document.getElementById("securityDeposit").textContent = formatMoney(deposit);
    document.getElementById("grandTotal").textContent = formatMoney(rentalCost + deposit);
  };
  startInput.addEventListener("change", updateBreakdown);
  endInput.addEventListener("change", updateBreakdown);
  updateBreakdown();

  const relatedItems = items.filter((relatedItem) => relatedItem[0] !== name).slice(0, 3);
  const relatedList = document.getElementById("relatedList");
  relatedList.innerHTML = relatedItems.map(([relatedName, relatedCategory, relatedLocation, relatedPrice, , relatedImage]) => `
    <article class="related-item" data-item-name="${relatedName}" tabindex="0" role="link" aria-label="View ${relatedName}">
      <img src="${window.getRentHubItemImage(relatedName) || relatedImage}" alt="${relatedName}">
      <div class="related-info">
        <div class="related-name">${relatedName}</div>
        <div class="related-category">${relatedCategory}</div>
        <div class="related-location">⌖ ${relatedLocation}</div>
        <div class="related-rating"><span>★</span> 4.7 (14)</div>
      </div>
      <div class="related-side">
        <button class="heart-btn" type="button" data-favorite="${relatedName}" aria-label="Add ${relatedName} to favorites"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.8 8.9c0 5.1-8.8 10.2-8.8 10.2S3.2 14 3.2 8.9A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.5Z"/></svg></button>
        <div class="related-price">${formatMoney(relatedPrice)}/day</div>
      </div>
    </article>`).join("");
  relatedList.querySelectorAll(".heart-btn").forEach((button) => {
    const isFavorite = window.RentHubFavorites?.getAll().includes(button.dataset.favorite) || false;
    button.classList.toggle("liked", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${button.dataset.favorite} ${isFavorite ? "from" : "to"} favorites`);
  });
  const openRelatedItem = (card) => {
    window.location.href = `equipment-details.html?item=${encodeURIComponent(card.dataset.itemName)}`;
  };
  relatedList.addEventListener("click", (event) => {
    const card = event.target.closest(".related-item");
    if (card && !event.target.closest(".heart-btn")) openRelatedItem(card);
  });
  relatedList.addEventListener("keydown", (event) => {
    const card = event.target.closest(".related-item");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openRelatedItem(card);
    }
  });

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuButton = document.getElementById("menuBtn");
  const setSidebarOpen = (isOpen) => {
    sidebar.classList.toggle("open", isOpen);
    overlay.classList.toggle("open", isOpen);
    overlay.classList.toggle("hidden", !isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
    menuButton.setAttribute("aria-expanded", String(isOpen));
  };
  menuButton.addEventListener("click", () => setSidebarOpen(true));
  overlay.addEventListener("click", () => setSidebarOpen(false));
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("renthub_session");
    window.location.href = "../../onboarding/index.html";
  });
  document.querySelectorAll("#sidebar nav button[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#sidebar .nav-item").forEach((navItem) => navItem.classList.remove("active"));
      button.classList.add("active");
      showToast(`${button.dataset.section} selected`);
      setSidebarOpen(false);
    });
  });
  const successOverlay = document.getElementById("successOverlay");
  const successIcon = document.getElementById("successIcon");
  const failureIcon = document.getElementById("failureIcon");
  const successTitle = document.getElementById("successTitle");
  const successCopy = document.getElementById("successCopy");
  const viewEquipment = document.getElementById("viewEquipment");
  const retryPayment = document.getElementById("retryPayment");
  let previouslyFocusedElement;
  const showRentalResult = (failed) => {
    successIcon.classList.toggle("result-icon-hidden", failed);
    failureIcon.classList.toggle("result-icon-hidden", !failed);
    successTitle.textContent = failed ? "Rental Failed!" : "Equipment Rented!";
    successCopy.textContent = failed
      ? "Equipment rental failed, due to wrong payment details."
      : "Your successfully Rented an equipment and it will be ready by the Owner.";
    viewEquipment.hidden = failed;
    retryPayment.hidden = !failed;
    successOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    (failed ? retryPayment : viewEquipment).focus();
  };
  const closeSuccessDialog = () => {
    successOverlay.hidden = true;
    document.body.style.overflow = "";
    previouslyFocusedElement?.focus();
  };
  document.getElementById("paymentButton").addEventListener("click", () => {
    previouslyFocusedElement = document.activeElement;
    const rentalDetails = new URLSearchParams({
      success: "1",
      item: name,
      start: startInput.value,
      end: endInput.value,
      daily: String(price),
      deposit: String(deposit)
    });
    viewEquipment.href = `my-rentals.html?${rentalDetails.toString()}`;
    const failed = new URLSearchParams(window.location.search).get("payment") === "failed";
    showRentalResult(failed);
  });
  retryPayment.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    window.history.replaceState({}, "", url);
    showRentalResult(false);
  });
  successOverlay.addEventListener("click", (event) => {
    if (event.target === successOverlay) closeSuccessDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !successOverlay.hidden) closeSuccessDialog();
  });
}).catch((error) => {
  const name = document.getElementById("itemName");
  if (name) name.textContent = error.message;
});
