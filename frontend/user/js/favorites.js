(() => {
  const storageKey = "renthub-favorite-items";

  function getAll() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(stored)
        ? [...new Set(stored.filter((name) => typeof name === "string"))]
        : [];
    } catch {
      return [];
    }
  }

  function save(items) {
    const favorites = [...new Set(items.filter((name) => typeof name === "string"))];
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
      return true;
    } catch {
      return false;
    }
  }

  function toggle(name) {
    const favorites = getAll();
    const index = favorites.indexOf(name);
    if (index === -1) {
      favorites.push(name);
    } else {
      favorites.splice(index, 1);
    }
    save(favorites);
    window.dispatchEvent(new CustomEvent("renthub:favoriteschange"));
    return index === -1;
  }

  function getName(button) {
    return button.dataset.favorite ||
      button.closest(".rental-card")?.querySelector(".item-title")?.textContent.trim() ||
      button.closest(".equipment-card")?.querySelector(".equipment-info h3")?.textContent.trim();
  }

  function updateButton(button, isFavorite) {
    const name = getName(button);
    if (!name) return;
    button.classList.toggle("liked", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute(
      "aria-label",
      `${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} favorites`
    );
    if (!button.querySelector("svg")) {
      button.textContent = isFavorite ? "♥" : "♡";
    }
  }

  window.RentHubFavorites = { getAll, save, toggle };

  document.querySelectorAll(".heart-btn").forEach((button) => {
    const name = getName(button);
    if (name) updateButton(button, getAll().includes(name));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".heart-btn");
    const name = button && getName(button);
    if (!name) return;

    const isFavorite = toggle(name);
    document.querySelectorAll(".heart-btn").forEach((matchingButton) => {
      if (getName(matchingButton) === name) {
        updateButton(matchingButton, isFavorite);
      }
    });
  });

  const equipmentCardSelector = ".item-card, .equipment-card, .rental-row, .recent-row, .rental-card, .related-item, [data-rental]";
  const getEquipmentName = (card) => card.dataset.itemName ||
    card.dataset.view ||
    card.dataset.rentalImage ||
    card.querySelector(".item-title, .equipment-info h3, .rental-name h3, .recent-name h2, .rental-info h2, .related-name")?.textContent.trim() ||
    card.querySelector("h2, h3")?.textContent.trim() ||
    card.querySelector("img[alt]")?.alt.trim() ||
    "";

  const openEquipment = (name) => {
    window.location.href = `equipment-details.html?item=${encodeURIComponent(name)}`;
  };

  const refreshEquipmentCards = () => {
    document.querySelectorAll(equipmentCardSelector).forEach((card) => {
      const name = getEquipmentName(card);
      if (!name) return;
      card.style.cursor = "pointer";
      card.tabIndex = 0;
      card.setAttribute("aria-label", `View ${name} details`);
    });
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, select, textarea, [role='button']")) return;
    const card = event.target.closest(equipmentCardSelector);
    const name = card && getEquipmentName(card);
    if (name) openEquipment(name);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("a, button, input, select, textarea, [role='button']")) return;
    const card = event.target.closest(equipmentCardSelector);
    const name = card && getEquipmentName(card);
    if (!name) return;
    event.preventDefault();
    openEquipment(name);
  });

  window.RentHubItemNavigation = { refresh: refreshEquipmentCards };
  refreshEquipmentCards();

  const navigation = document.querySelector("#sidebar nav");
  const exploreLink = [...(navigation?.querySelectorAll("a") || [])]
    .find((link) => link.textContent.trim() === "Explore");
  const favoritesHref = "dashboard.html?view=favorites#favoritesContent";
  if (exploreLink) exploreLink.href = "equipment-explorer.html";

  let favoritesLink = navigation?.querySelector(`[href="${favoritesHref}"]`);
  if (navigation && exploreLink && !favoritesLink) {
    favoritesLink = document.createElement("a");
    favoritesLink.href = favoritesHref;
    favoritesLink.className = exploreLink.className;
    favoritesLink.classList.remove("active");
    favoritesLink.id = "favoritesNav";
    favoritesLink.innerHTML = '<span class="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke-linecap="round" stroke-linejoin="round" /></svg></span><span>Favorites</span>';
    exploreLink.insertAdjacentElement("afterend", favoritesLink);
  }

  if (
    favoritesLink &&
    window.location.pathname.endsWith("dashboard.html") &&
    new URLSearchParams(window.location.search).get("view") === "favorites"
  ) {
    exploreLink.classList.remove("active");
    navigation.querySelector('[data-section="Dashboard"]')?.classList.remove("active");
    favoritesLink.classList.add("active");
  }
})();
