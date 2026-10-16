(() => {
  const openButton = document.getElementById("openReviewDialog");
  const backdrop = document.getElementById("reviewDialogBackdrop");
  const form = document.getElementById("reviewForm");
  const ratingButtons = [...document.querySelectorAll("[data-rating]")];
  const reviewList = document.getElementById("reviewList");
  const reviewCount = document.getElementById("reviewCount");
  const toast = document.getElementById("toast");
  let selectedRating = 0;
  let toastTimer;

  const setRating = (rating) => {
    selectedRating = rating;
    ratingButtons.forEach((button) => {
      const selected = Number(button.dataset.rating) <= rating;
      button.classList.toggle("selected", selected);
      button.textContent = selected ? "★" : "☆";
      button.setAttribute("aria-checked", String(Number(button.dataset.rating) === rating));
    });
  };

  const closeDialog = () => {
    backdrop.hidden = true;
    openButton.focus();
  };

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
  };

  openButton.addEventListener("click", () => {
    backdrop.hidden = false;
    document.getElementById("reviewerName").focus();
  });
  document.getElementById("cancelReview").addEventListener("click", closeDialog);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !backdrop.hidden) closeDialog();
  });

  ratingButtons.forEach((button, index) => {
    button.addEventListener("click", () => setRating(Number(button.dataset.rating)));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + offset + ratingButtons.length) % ratingButtons.length;
      ratingButtons[nextIndex].focus();
      setRating(Number(ratingButtons[nextIndex].dataset.rating));
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!selectedRating) {
      ratingButtons[0].focus();
      showToast("Choose a star rating before posting.");
      return;
    }

    const name = document.getElementById("reviewerName").value.trim();
    const rental = document.getElementById("reviewedRental").value;
    const message = document.getElementById("reviewMessage").value.trim();
    const card = document.createElement("article");
    card.className = "review-card";

    const avatar = document.createElement("div");
    avatar.className = "review-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

    const person = document.createElement("div");
    person.className = "review-person";
    person.append(document.createTextNode(name));
    const rentalLabel = document.createElement("small");
    rentalLabel.textContent = `Rented: ${rental}`;
    person.append(rentalLabel);

    const copy = document.createElement("div");
    copy.className = "review-copy";
    const quote = document.createElement("p");
    quote.textContent = `“${message}”`;
    const date = document.createElement("div");
    date.className = "review-date";
    date.textContent = "Just now";
    copy.append(quote, date);

    const stars = document.createElement("div");
    stars.className = "review-card-stars";
    stars.setAttribute("aria-label", `${selectedRating} out of 5 stars`);
    stars.textContent = "★".repeat(selectedRating);
    if (selectedRating < 5) {
      const emptyStars = document.createElement("span");
      emptyStars.className = "empty";
      emptyStars.textContent = "☆".repeat(5 - selectedRating);
      stars.append(emptyStars);
    }

    card.append(avatar, person, copy, stars);
    reviewList.prepend(card);
    reviewCount.textContent = String(Number(reviewCount.textContent) + 1);
    form.reset();
    setRating(0);
    closeDialog();
    showToast("Your review has been posted.");
  });
})();