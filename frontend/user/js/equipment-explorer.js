let rentalItems = [];

const grid = document.getElementById("itemsGrid");
const empty = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");
const title = document.getElementById("itemsTitle");
const subtitle = document.getElementById("itemsSubtitle");
const clear = document.getElementById("clearCategory");
const itemsSection = document.getElementById("itemsSection");
const categorySection = document.getElementById("categorySection");
const search = document.getElementById("searchInput");

const buttons = document.querySelectorAll(".category-button");
const favoritesStorageKey = "renthub-favorite-items";

let selectedCategory = null;
let searchTerm = "";

function loadFavorites() {
  try {
    const storedFavorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
    return new Set(Array.isArray(storedFavorites) ? storedFavorites.filter((name) => typeof name === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify([...favoriteItems]));
  } catch {
    return;
  }
}

const favoriteItems = loadFavorites();

window.RentHubItemsReady.then((items) => {
  rentalItems = items;
  if (selectedCategory || searchTerm) renderItems();
}).catch((error) => {
  emptyTitle.textContent = "Equipment unavailable";
  emptyMessage.textContent = error.message;
});


// ===============================
// Format Nigerian currency
// ===============================

const naira = (amount) => {
  return `₦${amount.toLocaleString("en-NG")}`;
};


// ===============================
// Render rental items
// ===============================

function renderItems() {

  const showItems = Boolean(selectedCategory || searchTerm);
  const results = showItems ? rentalItems.filter(
    ([name, category, location]) => {

      const categoryMatches =
        !selectedCategory ||
        selectedCategory === "All" ||
        category === selectedCategory;

      const searchableText =
        `${name} ${category} ${location}`.toLowerCase();

      const searchMatches =
        searchableText.includes(searchTerm.toLowerCase());

      return categoryMatches && searchMatches;
    }
  ) : [];


  // Clear current cards
  grid.innerHTML = "";


  // Create cards
  results.forEach(
    ([name, category, location, price, emoji, imageUrl]) => {

      const card = document.createElement("article");

      card.className =
        "item-card rounded-2xl p-3 overflow-hidden";


      card.innerHTML = `
        <div
          class="item-image relative h-40 overflow-hidden rounded-xl"
        >
          <div class="flex h-full flex-col">
            <div class="h-12 shrink-0"></div>
            <div class="flex min-h-0 flex-1 items-center justify-center text-5xl">
              ${imageUrl
                ? `<img src="${imageUrl}" alt="${name}" class="h-full w-full object-contain">`
                : `<span>${emoji}</span>`}
            </div>
          </div>
          <button
            class="bookmark absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[#dce7f1] bg-white/95 text-lg ${favoriteItems.has(name) ? "active" : ""}"
            data-bookmark="${name}"
            aria-label="${favoriteItems.has(name) ? `Remove ${name} from favorites` : `Add ${name} to favorites`}"
            aria-pressed="${favoriteItems.has(name)}"
            type="button"
          >
            ${favoriteItems.has(name) ? "♥" : "♡"}
          </button>
        </div>


        <div class="pt-3 px-1">

          <div class="flex items-center gap-2">
            <h3 class="min-w-0 flex-1 font-semibold text-[15px] text-[#173b61] truncate">
              ${name}
            </h3>
          </div>


          <p
            class="mt-1 text-xs text-[#6b86a2]"
          >
            ⌑ ${category}
          </p>


          <p class="item-location mt-1 text-xs text-[#6b86a2]">
            <svg class="inline-block mr-1 align-[-3px]" width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M9 9.75C10.2426 9.75 11.25 8.74264 11.25 7.5C11.25 6.25736 10.2426 5.25 9 5.25C7.75736 5.25 6.75 6.25736 6.75 7.5C6.75 8.74264 7.75736 9.75 9 9.75Z" stroke="#8C8C8C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.75736 3.25736C5.88258 2.13214 7.4087 1.5 9 1.5C10.5913 1.5 12.1174 2.13214 13.2426 3.25736C14.3679 4.38258 15 5.9087 15 7.5C15 8.919 14.6985 9.8475 13.875 10.875L9 16.5L4.125 10.875C3.3015 9.8475 3 8.919 3 7.5C3 5.9087 3.63214 4.38258 4.75736 3.25736Z" stroke="#8C8C8C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${location}
          </p>


          <div
            class="mt-4 flex items-end
            justify-between gap-2"
          >

            <div>

              <span
                class="text-[17px]
                font-bold"
              >
                ${naira(price)}
              </span>

              <span
                class="text-xs text-[#6b86a2]"
              >
                /day
              </span>

            </div>


            <button
              class="text-xs font-semibold
              text-[#1677e8]
              hover:underline"
              data-view="${name}"
            >
              View
            </button>

          </div>

        </div>
      `;


      grid.appendChild(card);
    }
  );


  // ===============================
  // Empty state
  // ===============================

  empty.classList.toggle("hidden", !showItems || results.length !== 0);

  if (results.length === 0) {
    emptyTitle.textContent = "No matching rentals";
    emptyMessage.textContent = "Try another category or search term.";
  }

  grid.classList.toggle(
    "hidden",
    results.length === 0
  );


  // ===============================
  // Update heading
  // ===============================

  if (selectedCategory === "All") {
    title.textContent = "All equipment";
    subtitle.textContent = "Showing all available equipment.";
  } else if (selectedCategory) {
    title.textContent = `${selectedCategory} rentals`;
    subtitle.textContent = `Showing rentals in ${selectedCategory}.`;
  } else if (searchTerm) {
    title.textContent = "Search results";
    subtitle.textContent = `Matches for "${searchTerm}".`;
  }

  itemsSection.hidden = !showItems;
  categorySection.hidden = showItems;
  clear.classList.toggle("hidden", !showItems);


  // Activate card buttons
  setupItemButtons();
  window.RentHubItemNavigation?.refresh();
}



// ===============================
// Item buttons
// ===============================

function setupItemButtons() {

  // Bookmark buttons
  document
    .querySelectorAll("[data-bookmark]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const itemName = button.dataset.bookmark;

          if (favoriteItems.has(itemName)) {
            favoriteItems.delete(itemName);
          } else {
            favoriteItems.add(itemName);
          }

          saveFavorites();

          if (selectedCategory === "Favorites") {
            renderItems();
            return;
          }

          const isFavorite = favoriteItems.has(itemName);
          button.classList.toggle("active", isFavorite);
          button.setAttribute("aria-pressed", String(isFavorite));
          button.setAttribute(
            "aria-label",
            isFavorite
              ? `Remove ${itemName} from favorites`
              : `Add ${itemName} to favorites`
          );
          button.textContent = isFavorite ? "♥" : "♡";
        }
      );

    });


  // View buttons
  document
    .querySelectorAll("[data-view]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const itemName =
            button.dataset.view;

          window.location.href = `equipment-details.html?item=${encodeURIComponent(itemName)}`;

        }
      );

    });
}



// ===============================
// Category buttons
// ===============================

buttons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      const category =
        button.dataset.category;

      selectedCategory = category;
      searchTerm = "";
      search.value = "";


      // Highlight selected category
      buttons.forEach((categoryButton) => {

        categoryButton.classList.toggle(
          "selected",
          categoryButton.dataset.category ===
            selectedCategory
        );
        categoryButton.setAttribute(
          "aria-pressed",
          String(categoryButton.dataset.category === selectedCategory)
        );

      });


      renderItems();


      (selectedCategory ? itemsSection : categorySection).scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }
  );

});



// ===============================
// Show all / clear category
// ===============================

clear.addEventListener(
  "click",
  () => {

    selectedCategory = null;
    searchTerm = "";
    search.value = "";


    buttons.forEach((button) => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    });


    renderItems();
    categorySection.scrollIntoView({ behavior: "smooth", block: "start" });

  }
);



// ===============================
// Search
// ===============================

search.addEventListener(
  "input",
  (event) => {

    searchTerm =
      event.target.value.trim();

    renderItems();

  }
);



// ===============================
// Mobile sidebar
// ===============================

const sidebar =
  document.getElementById("sidebar");

const overlay =
  document.getElementById("sidebarOverlay");

const openMenu =
  document.getElementById("menuBtn");

// Open sidebar
openMenu?.addEventListener(
  "click",
  () => {

    sidebar.classList.add("open");

    overlay.classList.add("open");
    overlay.classList.remove("hidden");
    openMenu.setAttribute("aria-expanded", "true");

  }
);


// Close sidebar
function closeSidebar() {

  sidebar.classList.remove("open");

  overlay.classList.remove("open");
  overlay.classList.add("hidden");
  openMenu?.setAttribute("aria-expanded", "false");

}


// Close when overlay is clicked
overlay?.addEventListener(
  "click",
  closeSidebar
);


// Close sidebar when returning to desktop
window.addEventListener(
  "resize",
  () => {

    if (window.innerWidth > 900) {

      closeSidebar();

    }

  }
);



// ===============================
// Initial render
// ===============================

renderItems();