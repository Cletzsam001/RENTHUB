// ==========================================
// RentHub Profile Page JavaScript
// ==========================================


// ==========================================
// Helper
// ==========================================

const $ = (id) => document.getElementById(id);

const toast = $("toast");
const SESSION_KEY = "renthub_session";
const USERS_KEY = "renthub_users";

function getActiveUser() {
  try {
    const email = localStorage.getItem(SESSION_KEY);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    return email && users[email] && users[email].role === "renter"
      ? { email, users, user: users[email] }
      : null;
  } catch (error) {
    return null;
  }
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.rentHubToastTimer);

  window.rentHubToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}


// ==========================================
// Profile fields
// ==========================================

const fields = [
  $("name"),
  $("email"),
  $("phone"),
  $("location"),
  $("address")
];

let originalValues = {};


// ==========================================
// Edit profile
// ==========================================

$("edit").addEventListener("click", () => {
  originalValues = {};

  fields.forEach((field) => {
    originalValues[field.id] = field.value;
    field.disabled = false;
  });

  $("edit").classList.add("hidden");

  $("actions").classList.remove("hidden");
  $("actions").classList.add("flex");

  fields[0].focus();
});


// ==========================================
// Cancel profile editing
// ==========================================

$("cancel").addEventListener("click", () => {
  fields.forEach((field) => {
    field.value = originalValues[field.id];
    field.disabled = true;
  });

  $("edit").classList.remove("hidden");

  $("actions").classList.add("hidden");
  $("actions").classList.remove("flex");
});


// ==========================================
// Save profile
// ==========================================

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("name").value.trim();
  const email = $("email").value.trim().toLowerCase();

  if (!name) {
    showToast("Please enter your name.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showToast("Please enter a valid email address.");
    return;
  }

  const active = getActiveUser();

  if (!active) {
    window.location.href = "../../onboarding/index.html";
    return;
  }

  if (email !== active.email && active.users[email]) {
    showToast("An account with this email already exists.");
    return;
  }

  const nameParts = name.split(/\s+/);
  const updatedUser = {
    ...active.user,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" "),
    email,
    phone: $("phone").value.trim(),
    location: $("location").value.trim(),
    address: $("address").value.trim()
  };

  if (email !== active.email) delete active.users[active.email];
  active.users[email] = updatedUser;

  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(active.users));
    localStorage.setItem(SESSION_KEY, email);
  } catch (error) {
    showToast("Profile could not be saved. Please allow browser storage and try again.");
    return;
  }

  fields.forEach((field) => {
    field.disabled = true;
  });

  // Update displayed name
  $("heading").textContent = name;
  $("initial").textContent = name.charAt(0).toUpperCase();

  // Update header avatar
  $("topAvatar").textContent =
    name.charAt(0).toUpperCase();

  // Update verification details
  $("emailText").textContent =
    $("email").value;

  $("phoneText").textContent =
    $("phone").value;

  $("edit").classList.remove("hidden");

  $("actions").classList.add("hidden");
  $("actions").classList.remove("flex");

  showToast("Profile updated successfully.");
});


// ==========================================
// Restore the signed-in renter's account information
// ==========================================

const activeAccount = getActiveUser();

if (!activeAccount) {
  window.location.href = "../../onboarding/index.html";
} else {
  const activeUser = activeAccount.user;
  $("name").value = [activeUser.firstName, activeUser.lastName]
    .filter(Boolean)
    .join(" ");
  $("email").value = activeUser.email || activeAccount.email;
  $("phone").value = activeUser.phone || "";
  $("location").value = activeUser.location || "";
  $("address").value = activeUser.address || "";
}


// Update name after loading saved information
if ($("name").value) {
  $("heading").textContent =
    $("name").value;
  $("initial").textContent =
    $("name").value.charAt(0).toUpperCase();

  $("topAvatar").textContent =
    $("name").value
      .charAt(0)
      .toUpperCase();
}


// Update verification information
$("emailText").textContent =
  $("email").value;

$("phoneText").textContent =
  $("phone").value;


// ==========================================
// Profile picture upload
// ==========================================

$("photoInput").addEventListener("change", () => {

  const file = $("photoInput").files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {

    const imageURL =
      event.target.result;

    // Main profile picture
    $("photo").src = imageURL;

    $("photo").classList.remove("hidden");

    // Hide initial
    $("initial").classList.add("hidden");

    // Show remove button
    $("removePhoto").classList.remove("hidden");

    // Update header avatar
    $("topAvatar").innerHTML = `
      <img
        src="${imageURL}"
        alt="Profile picture"
        class="h-full w-full object-cover"
      >
    `;

    // Save locally
    localStorage.setItem(
      "rh_photo",
      imageURL
    );

    showToast("Profile picture updated.");
  };

  reader.readAsDataURL(file);
});


// ==========================================
// Restore saved profile picture
// ==========================================

const savedPhoto =
  localStorage.getItem("rh_photo");

if (savedPhoto) {

  $("photo").src = savedPhoto;

  $("photo").classList.remove("hidden");

  $("initial").classList.add("hidden");

  $("removePhoto").classList.remove("hidden");

  $("topAvatar").innerHTML = `
    <img
      src="${savedPhoto}"
      alt="Profile picture"
      class="h-full w-full object-cover"
    >
  `;
}


// ==========================================
// Remove profile picture
// ==========================================

$("removePhoto").addEventListener("click", () => {

  localStorage.removeItem("rh_photo");

  $("photo").removeAttribute("src");

  $("photo").classList.add("hidden");

  $("initial").classList.remove("hidden");

  $("removePhoto").classList.add("hidden");

  const name =
    $("name").value.trim() || "T";

  $("topAvatar").textContent =
    name.charAt(0).toUpperCase();

  showToast("Profile picture removed.");
});


// ==========================================
// Change password
// ==========================================

$("change").addEventListener("click", () => {

  $("passwordForm").classList.remove("hidden");

  $("current").focus();
});


// ==========================================
// Cancel password change
// ==========================================

$("cancelPass").addEventListener("click", () => {

  $("passwordForm").reset();

  $("passwordForm").classList.add("hidden");
});


// ==========================================
// Update password
// ==========================================

$("passwordForm").addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    const currentPassword =
      $("current").value;

    const newPassword =
      $("newPass").value;

    const confirmPassword =
      $("confirm").value;


    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      showToast(
        "Please complete all password fields."
      );

      return;
    }


    if (newPassword.length < 8) {

      showToast(
        "Password must be at least 8 characters."
      );

      return;
    }


    if (newPassword !== confirmPassword) {

      showToast(
        "Passwords do not match."
      );

      return;
    }


    $("passwordForm").reset();

    $("passwordForm").classList.add("hidden");

    showToast(
      "Password updated successfully."
    );
  }
);


// ==========================================
// Mobile sidebar
// ==========================================

document.querySelectorAll(".nav[data-section]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${button.dataset.section} selected.`);
  });
});

$("menu").addEventListener("click", () => {

  $("sidebar").classList.remove(
    "-translate-x-full"
  );

  $("overlay").classList.remove(
    "hidden"
  );
  $("menu").setAttribute("aria-expanded", "true");
});


$("overlay").addEventListener("click", () => {

  $("sidebar").classList.add(
    "-translate-x-full"
  );

  $("overlay").classList.add(
    "hidden"
  );
  $("menu").setAttribute("aria-expanded", "false");
});


// ==========================================
// Keep sidebar state correct on resize
// ==========================================

window.addEventListener("resize", () => {

  if (window.innerWidth >= 1024) {

    $("sidebar").classList.remove(
      "-translate-x-full"
    );

    $("overlay").classList.add(
      "hidden"
    );
    $("menu").setAttribute("aria-expanded", "false");

  } else {

    $("sidebar").classList.add(
      "-translate-x-full"
    );
  }
});


// ==========================================
// Logout
// ==========================================

$("logout").addEventListener("click", () => {
  localStorage.removeItem("renthub_session");
  window.location.href = "../../onboarding/index.html";
});