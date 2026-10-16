(() => {
  document.querySelectorAll("[data-history-back]").forEach((backLink) => {
    backLink.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        window.history.length <= 1
      ) return;

      event.preventDefault();
      window.history.back();
    });
  });

  const destinations = {
    Dashboard: "dashboard.html",
    Explore: "equipment-explorer.html",
    Favorites: "dashboard.html?view=favorites#favoritesContent",
    "My Rentals": "my-rentals.html",
    Finance: "dashboard.html?view=payments",
    Deposit: "dashboard.html?view=payments#depositsContent",
    Dispute: "disputes.html",
    Review: "review-center.html",
    Profile: "profile.html"
  };

  const navigation = document.querySelector("#sidebar nav");
  if (!navigation) return;

  const routeForPage = {
    "dashboard.html": (() => {
      const view = new URLSearchParams(window.location.search).get("view");
      if (view === "favorites") return "Favorites";
      if (view === "payments") return window.location.hash === "#depositsContent" ? "Deposit" : "Finance";
      return window.location.hash === "#financeSummary" ? "Finance" : "Dashboard";
    })(),
    "equipment-explorer.html": "Explore",
    "rental-history.html": "My Rentals",
    "my-rentals.html": new URLSearchParams(window.location.search).get("rental") === "0"
      ? "Deposit"
      : "My Rentals",
    "equipment-details.html": "Dashboard",
    "rental-checkout.html": "Dashboard",
    "profile.html": "Profile",
    "disputes.html": "Dispute",
    "recommended-equipment.html": "Dashboard",
    "review-center.html": "Review"
  };
  const pageName = window.location.pathname.split("/").pop() || "dashboard.html";
  const currentPage = routeForPage[pageName];

  const getLabel = (item) => item.querySelector("span:last-child")?.textContent.trim() ||
    item.textContent.trim().replace(/\s+/g, " ");

  const depositIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 14.94V11.5H15.5V15.56L17.72 17.78L18.78 16.72L17 14.94Z" fill="#F3F8FC"/><path d="M5.05 3.3C4.006 3.774 3 4.584 3 5.75V17.75C3 18.915 4.004 19.725 5.05 20.2C6.163 20.706 7.648 21 9.25 21C10.307 21 11.31 20.873 12.19 20.642C13.0703 21.3047 14.0994 21.7418 15.1875 21.9151C16.2755 22.0885 17.3895 21.9929 18.4322 21.6367C19.4748 21.2804 20.4144 20.6743 21.1688 19.8714C21.9233 19.0684 22.4698 18.0929 22.7605 17.0302C23.0512 15.9674 23.0773 14.8496 22.8365 13.7744C22.5958 12.6992 22.0955 11.6993 21.3794 10.862C20.6632 10.0246 19.753 9.37532 18.7282 8.97075C17.7033 8.56618 16.595 8.41863 15.5 8.541V5.75C15.5 4.585 14.495 3.775 13.45 3.3C12.336 2.793 10.85 2.5 9.25 2.5C7.65 2.5 6.164 2.793 5.05 3.3ZM4.5 5.75C4.5 5.535 4.726 5.095 5.671 4.665C6.55 4.266 7.813 4 9.25 4C10.687 4 11.951 4.266 12.829 4.665C13.774 5.095 14 5.535 14 5.75C14 5.965 13.774 6.405 12.829 6.835C11.951 7.234 10.687 7.5 9.25 7.5C7.813 7.5 6.549 7.234 5.671 6.835C4.726 6.405 4.5 5.965 4.5 5.75ZM5.67 9.835C4.726 9.405 4.5 8.965 4.5 8.75V7.914C4.68 8.02067 4.86333 8.11633 5.05 8.201C6.164 8.707 7.65 9 9.25 9C10.85 9 12.336 8.707 13.45 8.2C13.6367 8.11533 13.82 8.02 14 7.914V8.884C13.1805 9.17553 12.4245 9.62159 11.773 10.198C10.9477 10.4024 10.1002 10.5039 9.25 10.5C7.812 10.5 6.547 10.234 5.67 9.835ZM4.5 11.75V10.914C4.67867 11.0207 4.862 11.116 5.05 11.2C6.163 11.706 7.648 12 9.25 12C9.63 12 10 11.9837 10.36 11.951C10.0887 12.4323 9.87933 12.945 9.732 13.489C9.572 13.4957 9.41133 13.4993 9.25 13.5C7.812 13.5 6.547 13.234 5.67 12.835C4.726 12.405 4.5 11.965 4.5 11.75ZM4.5 14.75V13.914C4.67867 14.0207 4.862 14.116 5.05 14.2C6.163 14.706 7.648 15 9.25 15L9.505 14.997C9.48791 15.4985 9.52478 16.0004 9.615 16.494C9.49367 16.498 9.372 16.5 9.25 16.5C7.812 16.5 6.547 16.234 5.67 15.835C4.726 15.405 4.5 14.965 4.5 14.75ZM4.5 17.75V16.914C4.67867 17.02 4.862 17.1153 5.05 17.2C6.163 17.706 7.648 18 9.25 18C9.52733 18 9.80133 17.9913 10.072 17.974C10.294 18.477 10.576 18.947 10.908 19.376C10.392 19.456 9.834 19.5 9.25 19.5C7.812 19.5 6.547 19.234 5.67 18.835C4.726 18.405 4.5 17.965 4.5 17.75ZM11 15.25C11 13.8576 11.5531 12.5223 12.5377 11.5377C13.5223 10.5531 14.8576 10 16.25 10C17.6424 10 18.9777 10.5531 19.9623 11.5377C20.9469 12.5223 21.5 13.8576 21.5 15.25C21.5 16.6424 20.9469 17.9777 19.9623 18.9623C18.9777 19.9469 17.6424 20.5 16.25 20.5C14.8576 20.5 13.5223 19.9469 12.5377 18.9623C11.5531 17.9777 11 16.6424 11 15.25Z" fill-rule="evenodd" clip-rule="evenodd" fill="#F3F8FC"/></svg>';

  navigation.querySelectorAll("a, button").forEach((item) => {
    if (getLabel(item) !== "Security Fee") return;
    const label = item.querySelector("span:last-child");
    if (label) label.textContent = "Deposit";
    else {
      const textNode = [...item.childNodes].find((node) => node.nodeType === 3 && node.textContent.includes("Security Fee"));
      if (textNode) textNode.textContent = textNode.textContent.replace("Security Fee", "Deposit");
    }
    const icon = item.querySelector(".nav-icon svg, :scope > svg");
    if (!icon) return;
    const iconClass = icon.getAttribute("class");
    icon.outerHTML = depositIcon.replace("<svg ", `<svg${iconClass ? ` class="${iconClass}"` : ""} `);
  });

  navigation.querySelectorAll("a, button").forEach((item) => {
    const label = getLabel(item);
    const destination = destinations[label];
    if (!destination) return;

    let link = item;
    if (item.tagName === "BUTTON") {
      link = document.createElement("a");
      link.className = item.className;
      link.innerHTML = item.innerHTML;
      if (item.getAttribute("aria-label")) link.setAttribute("aria-label", item.getAttribute("aria-label"));
      item.replaceWith(link);
    }

    link.href = destination;
  });

  document.querySelectorAll('#sidebar a[href="#"]').forEach((anchor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = anchor.className;
    button.innerHTML = anchor.innerHTML;
    if (anchor.getAttribute("aria-label")) button.setAttribute("aria-label", anchor.getAttribute("aria-label"));
    anchor.replaceWith(button);
  });

  const updateActivePage = (activePage) => {
    navigation.querySelectorAll("a, button").forEach((item) => {
      const label = getLabel(item);
      if (!destinations[label]) return;
      item.classList.toggle("active", label === activePage);
      if (label === activePage) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  };

  updateActivePage(currentPage);
  window.addEventListener("hashchange", () => {
    if (pageName !== "dashboard.html") return;
    const view = new URLSearchParams(window.location.search).get("view");
    updateActivePage(view === "favorites" ? "Favorites" : view === "payments" ? window.location.hash === "#depositsContent" ? "Deposit" : "Finance" : window.location.hash === "#financeSummary" ? "Finance" : "Dashboard");
  });

  let feedbackToast;
  let feedbackTimer;
  const showFeedback = (message) => {
    if (!feedbackToast) {
      feedbackToast = document.createElement("div");
      feedbackToast.id = "sidebarFeedbackToast";
      feedbackToast.setAttribute("role", "status");
      feedbackToast.setAttribute("aria-live", "polite");
      Object.assign(feedbackToast.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: "200",
        maxWidth: "min(360px, calc(100vw - 32px))",
        padding: "12px 16px",
        borderRadius: "8px",
        background: "#13314c",
        color: "#fff",
        fontSize: "14px",
        boxShadow: "0 12px 30px rgba(0,0,0,.15)"
      });
      document.body.append(feedbackToast);
    }
    feedbackToast.textContent = message;
    feedbackToast.hidden = false;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedbackToast.hidden = true;
    }, 2600);
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth > 900) return;
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
    ["sidebarOverlay", "mobileOverlay", "overlay"].forEach((id) => {
      const overlay = document.getElementById(id);
      overlay?.classList.remove("open");
      overlay?.classList.add("hidden");
    });
    document.body.classList.remove("overflow-hidden");
    document.body.style.overflow = "";
    ["menuBtn", "menu", "openSidebar"].forEach((id) => {
      document.getElementById(id)?.setAttribute("aria-expanded", "false");
    });
  };

  document.addEventListener("click", (event) => {
    const item = event.target.closest("#sidebar a, #sidebar button");
    if (!item) return;
    const label = getLabel(item);
    if (!item.closest("nav") && label !== "Log out") return;
    if (label === "Log out") {
      localStorage.removeItem("renthub_session");
      window.location.href = "../../onboarding/index.html";
      return;
    }
    const hasDestination = Boolean(destinations[label]);
    if (hasDestination) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const messages = {
      Dispute: "Dispute support is not available yet.",
      "Help & Support": "Help & Support is not available yet.",
    };
    showFeedback(messages[label] || `${label} is not available yet.`);
    closeMobileSidebar();
  }, true);
})();
