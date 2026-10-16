/* =========================================================
  RentHUB onboarding flow (single file, no common.js needed)
  Works with the single-page index.html.
   Data is kept in localStorage (demo only).
   ========================================================= */

/* ---------- 1. SMALL HELPERS ---------- */
function byId(id) {
  return document.getElementById(id);
}

function makeSafe(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function naira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function showError(fieldId, message) {
  var p = byId(fieldId + "Error");
  if (p) p.textContent = message;

  var box = byId(fieldId);
  if (box) {
    box.classList.toggle("border-red-500", message !== "");
    box.classList.toggle("border-slate-300", message === "");
  }

  return message === "";
}

var toastTimer;

function showToast(text) {
  var t = byId("toast");
  t.textContent = text;
  t.classList.remove("opacity-0");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    t.classList.add("opacity-0");
  }, 2200);
}

/* ---------- 2. STORAGE ---------- */
var USERS_KEY = "renthub_users";
var LISTINGS_KEY = "renthub_listings";
var SESSION_KEY = "renthub_session";
var currentEmail = "";


const CLOUDINARY_CLOUD_NAME = "tio8ftqg";
const CLOUDINARY_UPLOAD_PRESET = "jgerpbpi";

async function uploadKycFile(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "rentit/kyc");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error("Image upload failed. Please try again.");
  }

  return result.secure_url;
}


const RENTIT_API = "https://rentit-auth-kyc.onrender.com/api";
const AUTH_TOKEN_KEY = "renthub_token";

async function rentitRequest(endpoint, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${RENTIT_API}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}


async function fetchMyKyc() {
  try {
    const result = await rentitRequest("/kyc/me");
    return result.kyc || null;
  } catch (error) {
    // A new user may not have submitted KYC yet.
    if (error.message === "KYC record not found") {
      return null;
    }

    // Don't hide genuine network or authentication errors.
    throw error;
  }
}


let ownerKycPollTimer = null;
let ownerKycCheckInProgress = false;

function startOwnerKycPolling() {
  // Prevent multiple polling timers from running at once.
  if (ownerKycPollTimer) {
    clearInterval(ownerKycPollTimer);
  }

  // Check immediately, then every 15 seconds.
  checkOwnerKycApproval();
  ownerKycPollTimer = setInterval(checkOwnerKycApproval, 15000);
}

async function checkOwnerKycApproval() {
  if (ownerKycCheckInProgress || !currentEmail) return;

  ownerKycCheckInProgress = true;

  try {
    const kyc = await fetchMyKyc();

    if (!kyc) return;

    const status = String(kyc.status || "").toLowerCase();

    updateCurrentUser({
      kycSubmitted: true,
      kycStatus: status,
      kycVerified: status === "verified",
      kycRejectionReason: kyc.rejectionReason || ""
    });

    const statusElement = byId("kycStatus");

    if (status === "verified") {
      clearInterval(ownerKycPollTimer);
      ownerKycPollTimer = null;

      const users = getUsers();
      const email = currentEmail.toLowerCase();
      const owner = users[email] || users[currentEmail];

      if (!owner) {
        console.error("Approved KYC, but the owner profile was not found:", email);
        return;
      }
      if (owner && owner.role === "owner") {
        owner.kycStatus = "verified";
        owner.kycVerified = true;

        if (statusElement) {
          statusElement.textContent =
            "Your KYC has been approved! Opening your dashboard...";
        }

        goToDashboard(owner);
      }

      return;
    }

    if (status === "rejected") {
      clearInterval(ownerKycPollTimer);
      ownerKycPollTimer = null;

      if (statusElement) {
        statusElement.textContent =
          "Your KYC was rejected. Please contact support for guidance.";
      }

      return;
    }

    if (statusElement) {
      statusElement.textContent =
        "Your KYC is under review. Your dashboard will open automatically once approved.";
    }
  } catch (error) {
    console.warn("Unable to refresh KYC status:", error);
  } finally {
    ownerKycCheckInProgress = false;
  }
}


function saveBackendUser(user, token) {
  const email = user.email.toLowerCase();

  // Keep the profile information the existing screens use.
  // Never save the user's password in localStorage.
  const users = getUsers();

  users[email] = {
    ...(users[email] || {}),
    id: user.id || user._id,
    role: user.role,
    firstName: (user.name || "").split(" ")[0] || "",
    lastName: (user.name || "").split(" ").slice(1).join(" "),
    email: user.email,
    kycSubmitted: false,
    kycVerified: false,
    finishedSetup: false
  };

  saveUsers(users);

  currentEmail = email;
  setSession(email);

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (user.role === "owner") {
    localStorage.setItem("ownerToken", token);
  } else {
    localStorage.removeItem("ownerToken");
  }
  }
}


function readJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function getUsers() {
  return readJSON(USERS_KEY, {});
}

function saveUsers(u) {
  return writeJSON(USERS_KEY, u);
}

function getListings() {
  return readJSON(LISTINGS_KEY, []);
}

function saveListings(l) {
  return writeJSON(LISTINGS_KEY, l);
}

function getCurrentUser() {
  return currentEmail ? getUsers()[currentEmail] || null : null;
}

function updateCurrentUser(changes) {
  var users = getUsers();

  if (!users[currentEmail]) return;

  for (var k in changes) {
    users[currentEmail][k] = changes[k];
  }

  saveUsers(users);
}

function setSession(email) {
  try {
    localStorage.setItem(SESSION_KEY, email);
  } catch (e) {}
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

function getSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || "";
  } catch (e) {
    return "";
  }
}

// Demo admin account: admin@renthub.com / Admin123
function ensureAdmin() {
  var users = getUsers();

  if (!users["admin@renthub.com"]) {
    users["admin@renthub.com"] = {
      role: "admin",
      firstName: "Admin",
      lastName: "RentHUB",
      email: "admin@renthub.com",
      password: "Admin123",
      finishedSetup: true
    };

    saveUsers(users);
  }
}

/* ---------- 3. VALIDATION ---------- */
function checkName(v, label) {
  v = v.trim();

  if (v === "") return "Enter your " + label + ".";
  if (v.length < 2) return "Your " + label + " is too short.";

  if (!/^[A-Za-z][A-Za-z '\-]*$/.test(v)) {
    return "Use letters only for your " + label + ".";
  }

  return "";
}

function checkEmail(v) {
  v = v.trim();

  if (v === "") return "Enter your email address.";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return "Enter a valid email address.";
  }

  return "";
}

function checkPhone(v) {
  v = v.trim();

  if (v === "") return "Enter your phone number.";

  var digits = v.replace(/[\s\-()]/g, "");

  if (!/^\+?\d{10,15}$/.test(digits)) {
    return "Enter a valid phone number, e.g. +234 901 2345678.";
  }

  return "";
}

function checkAccountType(v) {
  return v === "" ? "Select an account type." : "";
}

function checkNewPassword(v) {
  if (v === "") return "Create a password.";
  if (v.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(v)) return "Add a capital letter.";
  if (!/[a-z]/.test(v)) return "Add a small letter.";
  if (!/\d/.test(v)) return "Add a number.";

  return "";
}

function checkConfirmPassword(v, original) {
  if (v === "") return "Re-enter your password.";
  if (v !== original) return "Passwords do not match.";

  return "";
}

function checkAddress(v) {
  v = v.trim();

  if (v === "") return "";
  if (v.length < 8) {
    return "Enter your full address (house number, street, city).";
  }

  return "";
}

function checkFile(file, allowPdf) {
  var max = 5 * 1024 * 1024;

  var okType =
    file.type.indexOf("image/") === 0 ||
    (allowPdf && file.type === "application/pdf");

  if (!okType) {
    return allowPdf
      ? "Upload an image or a PDF."
      : "Upload an image file.";
  }

  if (file.size > max) {
    return "File is too large. Maximum size is 5MB.";
  }

  return "";
}

/* ---------- 4. SCREENS ---------- */
function showScreen(id) {
  if (id === "homeScreen") {
    var renter = getCurrentUser();

    if (renter && renter.role === "renter") {
      window.location.href = "../user/pages/dashboard.html";
      return;
    }
  }

  var screens = document.querySelectorAll(".screen");

  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.add("hidden");
  }

  byId(id).classList.remove("hidden");
  window.scrollTo(0, 0);

  if (id === "categoriesScreen") prepareCategoriesScreen();
  if (id === "reviewScreen") fillReviewScreen();

  if (id === "doneScreen") {
    byId("welcomeMessage").textContent =
      "Welcome to RentHUB, " +
      (getCurrentUser() ? getCurrentUser().firstName : "");
  }

  if (id === "homeScreen") fillHome();
  if (id === "ownerDashboardScreen") fillOwnerDashboard();
  if (id === "adminDashboardScreen") fillAdminDashboard();
}


function goToDashboard(user) {
  if (user.role === "admin") {
    showScreen("adminDashboardScreen");
    return;
  }

if (user.role === "owner") {
  const isAdminApproved = user.kycStatus === "verified";

  if (!isAdminApproved) {
    if (user.kycStatus === "rejected") {
      alert("Your KYC was rejected. Please contact support for guidance.");
    } else {
      alert(
        "Your KYC is still under review. " +
        "Your dashboard will open automatically once approved."
      );
    }

    startOwnerKycPolling();
    return;
  }

  if (ownerKycPollTimer) {
    clearInterval(ownerKycPollTimer);
    ownerKycPollTimer = null;
  }

  window.location.href = "../owner/pages/dashboard.html";
  return;
}

  showScreen("homeScreen");
}

function logout() {
  clearSession();
  currentEmail = "";
  showScreen("welcomeScreen");
}

document.addEventListener("click", function (e) {
  var goBtn = e.target.closest("[data-goto]");

  if (goBtn) {
    showScreen(goBtn.getAttribute("data-goto"));
    return;
  }

  if (e.target.closest(".coming-soon")) {
    showToast("Coming soon!");
    return;
  }

  if (e.target.closest(".logout")) {
    logout();
    return;
  }

  var eye = e.target.closest(".show-hide");

  if (eye) {
    var box = byId(eye.getAttribute("data-target"));

    if (box.type === "password") {
      box.type = "text";
      eye.textContent = "Hide";
    } else {
      box.type = "password";
      eye.textContent = "Show";
    }
  }
});

/* ---------- 5. RENTER SIGN UP ---------- */
var selectedCategories = [];
var idFileName = "";
var selfieFileName = "";
var addressText = "";

var signupFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "accountType",
  "password",
  "confirmPassword"
];

function validateSignupField(id) {
  var m = "";

  if (id === "firstName") {
    m = checkName(byId(id).value, "first name");
  } else if (id === "lastName") {
    m = checkName(byId(id).value, "last name");
  } else if (id === "email") {
    m = checkEmail(byId(id).value);
  } else if (id === "phone") {
    m = checkPhone(byId(id).value);
  } else if (id === "accountType") {
    m = checkAccountType(byId(id).value);
  } else if (id === "password") {
    m = checkNewPassword(byId(id).value);
  } else if (id === "confirmPassword") {
    m = checkConfirmPassword(
      byId(id).value,
      byId("password").value
    );
  }

  return showError(id, m);
}

signupFields.forEach(function (id) {
  var box = byId(id);

  box.addEventListener("blur", function () {
    if (box.value !== "") validateSignupField(id);
  });

  function recheck() {
    if (box.classList.contains("border-red-500")) {
      validateSignupField(id);
    }

    if (
      id === "password" &&
      byId("confirmPassword").value !== ""
    ) {
      validateSignupField("confirmPassword");
    }

    byId("signupFormError").textContent = "";
  }

  box.addEventListener("input", recheck);
  box.addEventListener("change", recheck);
});


byId("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  var firstBad = "";

  signupFields.forEach(function (id) {
    if (!validateSignupField(id) && firstBad === "") {
      firstBad = id;
    }
  });

  if (firstBad) {
    byId(firstBad).focus();
    return;
  }

  var email = byId("email").value.trim().toLowerCase();
  var name =
    byId("firstName").value.trim() + " " +
    byId("lastName").value.trim();

  var errorBox = byId("signupFormError");
  var submitButton = this.querySelector('[type="submit"]');

  errorBox.textContent = "";
  submitButton.disabled = true;

  try {
    await rentitRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        email: email,
        password: byId("password").value,
        role: "renter"
      })
    });

    const loginResult = await rentitRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email,
        password: byId("password").value
      })
    });

    if (!loginResult.token || !loginResult.user) {
      throw new Error("Account created, but login failed. Please log in.");
    }

    saveBackendUser(loginResult.user, loginResult.token);

    var users = getUsers();
    users[email] = {
      ...users[email],
      phone: byId("phone").value.trim(),
      accountType: byId("accountType").value,
      categories: [],
      idFileName: "",
      selfieFileName: "",
      address: "",
      kycSubmitted: false,
      kycVerified: false,
      finishedSetup: false
    };
    saveUsers(users);

    selectedCategories = [];
    idFileName = "";
    selfieFileName = "";
    addressText = "";

    this.reset();
    openIdentityScreen("renter");

  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------- 6. LOGIN (RENTER, OWNER, ADMIN) ---------- */


byId("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  var email = byId("loginEmail").value.trim().toLowerCase();
  var password = byId("loginPassword").value;
  var errorBox = byId("loginFormError");
  var submitButton = this.querySelector('[type="submit"]');

  errorBox.textContent = "";

  if (!showError("loginEmail", checkEmail(email))) {
    byId("loginEmail").focus();
    return;
  }

  if (!showError(
    "loginPassword",
    password === "" ? "Enter your password." : ""
  )) {
    byId("loginPassword").focus();
    return;
  }

  submitButton.disabled = true;

  try {
    const result = await rentitRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!result.token || !result.user) {
      throw new Error("The server did not return a valid login session.");
    }

    saveBackendUser(result.user, result.token);

    const kyc = await fetchMyKyc();

    if (kyc) {
      updateCurrentUser({
        kycSubmitted: true,
        kycStatus: kyc.status,
        kycVerified: kyc.status === "verified",
        kycRejectionReason: kyc.rejectionReason || ""
      });
    }

    this.reset();

    var user = getCurrentUser();

    if (resumeSetup(user)) return;

    goToDashboard(user);

  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------- 7. IDENTITY DOCUMENT SUBMISSION ---------- */
var idFileObj = null;
var selfieFileObj = null;
var kycRole = "renter";
var kycBusy = false;

function needsKyc(user) {
  return (
    (user.role === "renter" || user.role === "owner") &&
    !user.kycSubmitted
  );
}

function resumeSetup(user) {
  selectedCategories = user.categories || [];
  idFileName = user.idFileName || "";
  selfieFileName = user.selfieFileName || "";
  addressText = user.address || "";

  if (needsKyc(user)) {
    openIdentityScreen(user.role);
    return true;
  }

  if (user.role === "renter" && !user.finishedSetup) {
    showScreen("categoriesScreen");
    return true;
  }

  return false;
}

function openIdentityScreen(role) {
  kycRole = role;
  resetIdentityScreen();

  byId("identityStepperRenter").classList.toggle(
    "hidden",
    role !== "renter"
  );

  byId("identityStepperOwner").classList.toggle(
    "hidden",
    role !== "owner"
  );

  showScreen("identityScreen");
}

function setOptionLook(buttonId, statusId, look, text) {
  var b = byId(buttonId);
  var s = byId(statusId);

  b.classList.remove(
    "border-slate-300",
    "border-green-600",
    "border-red-500"
  );

  s.classList.remove("text-slate-400", "text-green-600");

  if (look === "done") {
    b.classList.add("border-green-600");
    s.classList.add("text-green-600");
  } else if (look === "problem") {
    b.classList.add("border-red-500");
    s.classList.add("text-slate-400");
  } else {
    b.classList.add("border-slate-300");
    s.classList.add("text-slate-400");
  }

  s.textContent = text;
}

function hookFileOption(btnId, fileId, statusId, errId, onFile) {
  byId(btnId).addEventListener("click", function () {
    byId(fileId).click();
  });

  byId(fileId).addEventListener("change", function () {
    var file = this.files[0];

    byId("identityError").textContent = "";
    byId("kycStatus").textContent = "";

    if (!file) return;

    var m = checkFile(file, false);
    byId(errId).textContent = m;

    if (m !== "") {
      this.value = "";
      onFile(null);
      setOptionLook(btnId, statusId, "problem", "Upload");
      return;
    }

    onFile(file);
    setOptionLook(btnId, statusId, "done", "✓ Added");
  });
}

hookFileOption(
  "idButton",
  "idFile",
  "idStatus",
  "idFileError",
  function (f) {
    idFileObj = f;
    idFileName = f ? f.name : "";
  }
);

hookFileOption(
  "selfieButton",
  "selfieFile",
  "selfieStatus",
  "selfieFileError",
  function (f) {
    selfieFileObj = f;
    selfieFileName = f ? f.name : "";
  }
);

byId("addressButton").addEventListener("click", function () {
  byId("addressBox").classList.toggle("hidden");
  byId("address").focus();
});

byId("address").addEventListener("input", function () {
  var m = checkAddress(this.value);

  showError("address", m);
  byId("identityError").textContent = "";

  if (m === "" && this.value.trim() !== "") {
    addressText = this.value.trim();
    setOptionLook("addressButton", "addressStatus", "done", "✓ Added");
  } else {
    addressText = "";
    setOptionLook("addressButton", "addressStatus", "", "Add");
  }
});

function resetIdentityScreen() {
  idFileObj = null;
  selfieFileObj = null;
  idFileName = "";
  selfieFileName = "";
  addressText = "";
  kycBusy = false;

  byId("idFile").value = "";
  byId("selfieFile").value = "";
  byId("address").value = "";

  byId("idFileError").textContent = "";
  byId("selfieFileError").textContent = "";

  showError("address", "");

  byId("identityError").textContent = "";
  byId("kycStatus").textContent = "";
  byId("addressBox").classList.add("hidden");

  byId("identityContinue").disabled = false;
  byId("identityContinue").textContent = "Continue";

  setOptionLook("idButton", "idStatus", "", "Upload");
  setOptionLook("selfieButton", "selfieStatus", "", "Upload");
  setOptionLook("addressButton", "addressStatus", "", "Add");
}


async function finishIdentity() {
  if (kycBusy) return;

  var saved = getUsers()[currentEmail];
  var button = byId("identityContinue");

  if (!saved) {
    byId("identityError").textContent =
      "Your account could not be found. Please log in again.";
    return;
  }

  var documentType = byId("documentType").value;
  var documentNumber = byId("documentNumber").value.trim();

  if (!documentNumber) {
    byId("identityError").textContent =
      "Please enter your document number.";
    byId("documentNumber").focus();
    return;
  }

  if (!idFileObj || !selfieFileObj) {
    byId("identityError").textContent =
      "Please upload both your government ID and selfie.";
    return;
  }

  kycBusy = true;
  button.disabled = true;
  byId("identityError").textContent = "";
  byId("kycStatus").textContent = "Uploading your documents...";

  try {
    var documentUrl = await uploadKycFile(idFileObj);
    var selfieUrl = await uploadKycFile(selfieFileObj);

    byId("kycStatus").textContent =
      "Uploads complete. Submitting your application...";

    var result = await rentitRequest("/kyc", {
      method: "POST",
      body: JSON.stringify({
        documentType: documentType,
        documentNumber: documentNumber,
        documentUrl: documentUrl,
        selfieUrl: selfieUrl,
        address: byId("address").value.trim()
      })
    });

    updateCurrentUser({
      idFileName: idFileName,
      selfieFileName: selfieFileName,
      idDocumentUrl: documentUrl,
      selfieUrl: selfieUrl,
      documentType: documentType,
      address: byId("address").value.trim(),
      kycSubmitted: true,
      kycSubmittedAt: new Date().toISOString(),
      kycVerified: false,
      kycStatus: result.kyc?.status || "under_review"
    });

    byId("kycStatus").textContent =
      "Your KYC application has been submitted for review.";

if (kycRole === "owner") {
  updateCurrentUser({
    finishedSetup: true,
    kycSubmitted: true,
    kycVerified: false,
    kycStatus: "under_review"
  });

  byId("kycStatus").textContent =
    "Your KYC is under review. Your owner dashboard will open automatically once approved.";

  startOwnerKycPolling();
} else {
  showScreen("categoriesScreen");
}

  } catch (error) {
    byId("identityError").textContent =
      error.message || "KYC submission failed. Please try again.";

    byId("kycStatus").textContent = "";
  } finally {
    kycBusy = false;
    button.disabled = false;
  }
}

byId("identityContinue").addEventListener("click", function () {
  var addressMessage = checkAddress(byId("address").value);

  if (addressMessage !== "") {
    byId("addressBox").classList.remove("hidden");
    showError("address", addressMessage);
    byId("address").focus();
    return;
  }

  finishIdentity();
});

/* ---------- 8. RENTER: CATEGORIES ---------- */
var categoryButtons = document.querySelectorAll(".category");

function prepareCategoriesScreen() {
  byId("categoryError").textContent = "";

  categoryButtons.forEach(function (b) {
    var on =
      selectedCategories.indexOf(b.getAttribute("data-name")) !== -1;

    b.classList.toggle("border-blue-600", on);
    b.classList.toggle("bg-blue-50", on);
    b.classList.toggle("border-slate-200", !on);
    b.classList.toggle("bg-white", !on);
  });
}

categoryButtons.forEach(function (b) {
  b.addEventListener("click", function () {
    var name = b.getAttribute("data-name");
    var pos = selectedCategories.indexOf(name);

    if (pos !== -1) {
      selectedCategories.splice(pos, 1);
    } else if (selectedCategories.length >= 2) {
      byId("categoryError").textContent =
        "You can pick up to two categories. Un-select one to choose another.";
      return;
    } else {
      selectedCategories.push(name);
    }

    prepareCategoriesScreen();
  });
});

byId("categoryContinue").addEventListener("click", function () {
  if (selectedCategories.length === 0) {
    byId("categoryError").textContent =
      "Select at least one category to continue, or tap Skip for now.";
    return;
  }

  updateCurrentUser({ categories: selectedCategories.slice() });
  showScreen("reviewScreen");
});

byId("categorySkip").addEventListener("click", function () {
  showScreen("reviewScreen");
});

/* ---------- 9. RENTER: REVIEW + DONE ---------- */
function reviewRow(label, value) {
  return (
    '<div class="py-3 border-b border-slate-200 last:border-b-0">' +
    '<small class="block text-xs text-slate-500 mb-1">' +
    label +
    "</small>" +
    '<strong class="text-sm">' +
    value +
    "</strong></div>"
  );
}

function fillReviewScreen() {
  var u = getCurrentUser();

  if (!u) {
    showScreen("welcomeScreen");
    return;
  }

  byId("reviewBox").innerHTML =
    reviewRow("First Name", makeSafe(u.firstName)) +
    reviewRow("Last Name", makeSafe(u.lastName)) +
    reviewRow("Email Address", makeSafe(u.email)) +
    reviewRow("Phone Number", makeSafe(u.phone)) +
    reviewRow(
      "Identity Documents",
      (u.kycSubmitted ? "Documents submitted" : "Documents pending") +
      " · " +
      (u.kycVerified ? "Verified" : "Not verified")
    ) +
    reviewRow(
      "Interests",
      makeSafe(
        selectedCategories.length
          ? selectedCategories.join(", ")
          : "None selected"
      )
    );
}

function finishSetup() {
  updateCurrentUser({ finishedSetup: true });
  setSession(currentEmail);
  showScreen("doneScreen");
}

byId("reviewComplete").addEventListener("click", finishSetup);
byId("reviewSkip").addEventListener("click", finishSetup);

/* ---------- 10. OWNER SIGN UP ---------- */
var ownerFields = [
  "oFirstName",
  "oLastName",
  "oEmail",
  "oPhone",
  "oPassword",
  "oConfirmPassword"
];

function validateOwnerField(id) {
  var m = "";

  if (id === "oFirstName") {
    m = checkName(byId(id).value, "first name");
  } else if (id === "oLastName") {
    m = checkName(byId(id).value, "last name");
  } else if (id === "oEmail") {
    m = checkEmail(byId(id).value);
  } else if (id === "oPhone") {
    m = checkPhone(byId(id).value);
  } else if (id === "oPassword") {
    m = checkNewPassword(byId(id).value);
  } else if (id === "oConfirmPassword") {
    m = checkConfirmPassword(
      byId(id).value,
      byId("oPassword").value
    );
  }

  return showError(id, m);
}

ownerFields.forEach(function (id) {
  var box = byId(id);

  box.addEventListener("blur", function () {
    if (box.value !== "") validateOwnerField(id);
  });

  box.addEventListener("input", function () {
    if (box.classList.contains("border-red-500")) {
      validateOwnerField(id);
    }

    if (
      id === "oPassword" &&
      byId("oConfirmPassword").value !== ""
    ) {
      validateOwnerField("oConfirmPassword");
    }

    byId("ownerSignupFormError").textContent = "";
  });
});


byId("ownerSignupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  var firstBad = "";

  ownerFields.forEach(function (id) {
    if (!validateOwnerField(id) && firstBad === "") {
      firstBad = id;
    }
  });

  if (firstBad) {
    byId(firstBad).focus();
    return;
  }

  var email = byId("oEmail").value.trim().toLowerCase();
  var name =
    byId("oFirstName").value.trim() + " " +
    byId("oLastName").value.trim();

  var errorBox = byId("ownerSignupFormError");
  var submitButton = this.querySelector('[type="submit"]');

  errorBox.textContent = "";
  submitButton.disabled = true;

  try {
    await rentitRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        email: email,
        password: byId("oPassword").value,
        role: "owner"
      })
    });

    const loginResult = await rentitRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email,
        password: byId("oPassword").value
      })
    });

    if (!loginResult.token || !loginResult.user) {
      throw new Error("Account created, but login failed. Please log in.");
    }

    saveBackendUser(loginResult.user, loginResult.token);

    var users = getUsers();
    users[email] = {
      ...users[email],
      businessName: byId("oBusiness").value.trim(),
      phone: byId("oPhone").value.trim(),
      kycSubmitted: false,
      kycVerified: false,
      finishedSetup: false
    };
    saveUsers(users);

    this.reset();
    openIdentityScreen("owner");

  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------- 11. OWNER: ADD EQUIPMENT ---------- */
var firstTimeSetup = false;
var eqImageData = "";

function openEquipmentScreen(isFirstTime) {
  firstTimeSetup = isFirstTime;

  byId("equipmentForm").reset();
  eqImageData = "";

  byId("eqImagePreview").classList.add("hidden");
  byId("eqImagePreview").removeAttribute("src");
  byId("eqImagePlaceholder").classList.remove("hidden");
  byId("eqFormError").textContent = "";

  [
    "eqImage",
    "eqName",
    "eqCategory",
    "eqCondition",
    "eqPrice",
    "eqLocation",
    "eqSpecs"
  ].forEach(function (id) {
    showError(id, "");
  });

  byId("equipmentStepper").classList.toggle(
    "hidden",
    !isFirstTime
  );

  showScreen("equipmentScreen");
}

byId("ownerAddButton").addEventListener("click", function () {
  openEquipmentScreen(false);
});

byId("equipmentSkip").addEventListener("click", function () {
  showScreen("ownerDashboardScreen");
});

byId("eqImageButton").addEventListener("click", function () {
  byId("eqImageFile").click();
});

byId("eqImageFile").addEventListener("change", function () {
  var file = this.files[0];

  if (!file) return;

  var m = checkFile(file, false);
  byId("eqImageError").textContent = m;

  if (m !== "") {
    this.value = "";
    return;
  }

  var reader = new FileReader();

  reader.onload = function () {
    var img = new Image();

    img.onload = function () {
      var max = 640;
      var scale = Math.min(
        1,
        max / Math.max(img.width, img.height)
      );

      var canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      canvas
        .getContext("2d")
        .drawImage(img, 0, 0, canvas.width, canvas.height);

      eqImageData = canvas.toDataURL("image/jpeg", 0.7);

      byId("eqImagePreview").src = eqImageData;
      byId("eqImagePreview").classList.remove("hidden");
      byId("eqImagePlaceholder").classList.add("hidden");
    };

    img.onerror = function () {
      byId("eqImageError").textContent =
        "That image could not be read.";
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
});

byId("equipmentForm").addEventListener("submit", function (e) {
  e.preventDefault();

  var name = byId("eqName").value.trim();
  var category = byId("eqCategory").value;
  var condition = byId("eqCondition").value;
  var price = Number(byId("eqPrice").value);
  var location = byId("eqLocation").value.trim();

  var specs = byId("eqSpecs").value
    .split("\n")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);

  var results = [
    showError("eqName", name.length < 3 ? "Enter the equipment name." : ""),
    showError("eqCategory", category === "" ? "Select a category." : ""),
    showError("eqCondition", condition === "" ? "Select the condition." : ""),
    showError("eqPrice", !(price > 0) ? "Enter a price greater than 0." : ""),
    showError("eqLocation", location === "" ? "Enter a location." : ""),
    showError("eqSpecs", specs.length === 0 ? "Add at least one specification." : "")
  ];

  if (results.indexOf(false) !== -1) return;

  var listings = getListings();

  listings.push({
    id: "l" + Date.now(),
    ownerEmail: currentEmail,
    name: name,
    category: category,
    condition: condition,
    price: price,
    location: location,
    specs: specs,
    description: byId("eqDescription").value.trim(),
    image: eqImageData,
    status: "pending" // New listings start as pending admin review
  });

  if (!saveListings(listings)) {
    byId("eqFormError").textContent =
      "Could not save. The photo may be too large; try a smaller one.";
    return;
  }

  showScreen("ownerDashboardScreen");
  showToast("Equipment submitted for admin review");
});

/* ---------- 12. LISTING CARDS ---------- */
function listingCard(l, deleteLabel) {
  var thumb = l.image
    ? '<img src="' +
      l.image +
      '" alt="" class="h-16 w-16 shrink-0 rounded-lg object-cover">'
    : '<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">📦</div>';

  var statusBadge = l.status === "approved" || l.status === "verified"
    ? '<span class="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">Approved</span>'
    : '<span class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Under Review</span>';

  return (
    '<article class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 mb-2.5">' +
    thumb +
    '<div class="min-w-0 flex-1">' +
    '<div class="flex items-center gap-2 mb-1"><h3 class="truncate text-sm font-semibold">' +
    makeSafe(l.name) +
    "</h3>" + statusBadge + "</div>" +
    '<p class="truncate text-xs text-slate-500">' +
    makeSafe(l.category) +
    " · " +
    makeSafe(l.condition) +
    " · " +
    makeSafe(l.location) +
    "</p>" +
    '<p class="text-sm font-bold text-[#1f4e79]">' +
    naira(l.price) +
    " / day</p>" +
    "</div>" +
    (deleteLabel
      ? '<button type="button" class="delete-listing text-xs font-bold text-red-600 hover:underline" data-id="' +
        makeSafe(l.id) +
        '">' +
        deleteLabel +
        "</button>"
      : "") +
    "</article>"
  );
}

function approveListing(id) {
  var listings = getListings();
  listings = listings.map(function(l) {
    if (l.id === id) {
      l.status = "approved";
    }
    return l;
  });
  saveListings(listings);
  fillAdminDashboard();
  showToast("Listing approved successfully");
}

document.addEventListener("click", function (e) {
  var appBtn = e.target.closest(".approve-listing");
  if (appBtn) {
    approveListing(appBtn.getAttribute("data-id"));
    return;
  }

  var del = e.target.closest(".delete-listing");

  if (del) {
    var id = del.getAttribute("data-id");

    saveListings(
      getListings().filter(function (l) {
        return l.id !== id;
      })
    );

    if (getCurrentUser() && getCurrentUser().role === "admin") {
      fillAdminDashboard();
    } else {
      fillOwnerDashboard();
    }

    return;
  }

  var delUser = e.target.closest(".delete-user");

  if (delUser) {
    var email = delUser.getAttribute("data-email");
    var users = getUsers();

    delete users[email];
    saveUsers(users);

    saveListings(
      getListings().filter(function (l) {
        return l.ownerEmail !== email;
      })
    );

    fillAdminDashboard();
  }
});

/* ---------- 13. OWNER DASHBOARD ---------- */
function fillOwnerDashboard() {
  var u = getCurrentUser();

  if (!u) {
    showScreen("welcomeScreen");
    return;
  }

  var mine = getListings().filter(function (l) {
    return l.ownerEmail === u.email;
  });

  var total = mine.reduce(function (sum, l) {
    return sum + l.price;
  }, 0);

  byId("ownerGreeting").textContent = "Hi, " + u.firstName;
  byId("ownerListingCount").textContent = mine.length;
  byId("ownerDailyValue").textContent = naira(total);

  byId("ownerListings").innerHTML = mine.length
    ? mine.map(function (l) {
        return listingCard(l, "Delete");
      }).join("")
    : '<p class="text-sm text-slate-500">You have no listings yet. Tap "Add equipment" to create one.</p>';
}

/* ---------- 14. ADMIN DASHBOARD ---------- */
function fillAdminDashboard() {
  var u = getCurrentUser();

  if (!u) {
    showScreen("welcomeScreen");
    return;
  }

  var users = getUsers();
  var list = Object.keys(users).map(function (k) {
    return users[k];
  });

  var listings = getListings();

  byId("adminGreeting").textContent = "Signed in as " + u.email;

  byId("adminRenterCount").textContent = list.filter(function (x) {
    return x.role === "renter";
  }).length;

  byId("adminOwnerCount").textContent = list.filter(function (x) {
    return x.role === "owner";
  }).length;

  byId("adminListingCount").textContent = listings.length;

  byId("adminUsers").innerHTML = list.map(function (x) {
    return (
      '<div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 mb-2">' +
      '<div><strong class="text-sm">' +
      makeSafe(x.firstName + " " + x.lastName) +
      "</strong>" +
      '<p class="text-xs text-slate-500">' +
      makeSafe(x.email) +
      " · " +
      makeSafe(x.role) +
      "</p></div>" +
      (x.role === "admin"
        ? ""
        : '<button type="button" class="delete-user text-xs font-bold text-red-600 hover:underline" data-email="' +
          makeSafe(x.email) +
          '">Remove</button>') +
      "</div>"
    );
  }).join("");

  byId("adminListings").innerHTML = listings.length
    ? listings.map(function (l) {
        var isPending = l.status !== "approved" && l.status !== "verified";
        var approveButton = isPending
          ? '<button type="button" class="approve-listing text-xs font-bold text-green-600 hover:underline mr-3" data-id="' + makeSafe(l.id) + '">Approve</button>'
          : '';
        return (
          '<article class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 mb-2.5">' +
          '<div class="min-w-0 flex-1">' +
          '<h3 class="truncate text-sm font-semibold">' + makeSafe(l.name) + '</h3>' +
          '<p class="text-xs text-slate-500">Status: ' + (isPending ? 'Pending' : 'Approved') + '</p>' +
          '</div>' +
          approveButton +
          '<button type="button" class="delete-listing text-xs font-bold text-red-600 hover:underline" data-id="' + makeSafe(l.id) + '">Delete</button>' +
          '</article>'
        );
      }).join("")
    : '<p class="text-sm text-slate-500">No listings yet.</p>';
}

/* ---------- 15. RENTER HOME ---------- */
function fillHome() {
  var u = getCurrentUser();

  if (!u) {
    showScreen("welcomeScreen");
    return;
  }

  var hour = new Date().getHours();

  var part =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  byId("homeGreeting").textContent =
    part + ", " + u.firstName + " 👋";

  byId("dashAvatar").textContent =
    u.firstName.charAt(0).toUpperCase();

  byId("homeInterests").textContent =
    u.categories && u.categories.length
      ? "Your interests: " + u.categories.join(", ")
      : "Here's your rental activity at a glance.";

  renderHomeListings();
}

function renderHomeListings() {
  var u = getCurrentUser();
  var q = byId("searchInput").value.trim().toLowerCase();
  var interests = (u && u.categories) || [];

  // Renters only see approved listings
  var items = getListings().filter(function (l) {
    var isApproved = l.status === "approved" || l.status === "verified";
    var matchesSearch = (
      q === "" ||
      (l.name + " " + l.category + " " + l.location)
        .toLowerCase()
        .indexOf(q) !== -1
    );
    return isApproved && matchesSearch;
  });

  items.sort(function (a, b) {
    return (
      (interests.indexOf(b.category) !== -1) -
      (interests.indexOf(a.category) !== -1)
    );
  });

  byId("homeListings").innerHTML = items.length
    ? items.map(function (l) {
        return listingCard(l, "");
      }).join("")
    : '<p class="text-sm text-slate-500">' +
      (q
        ? "No approved equipment matches your search."
        : "No approved equipment available yet.") +
      "</p>";
}

byId("searchInput").addEventListener("input", renderHomeListings);

/* ---------- 16. HOME: SIDEBAR AND SMALL BUTTONS ---------- */
function openSidebar() {
  byId("sidebar").classList.remove("-translate-x-full");
  byId("sidebarOverlay").classList.remove("hidden");
}

function closeSidebar() {
  byId("sidebar").classList.add("-translate-x-full");
  byId("sidebarOverlay").classList.add("hidden");
}

byId("menuBtn").addEventListener("click", openSidebar);
byId("sidebarOverlay").addEventListener("click", closeSidebar);

document.querySelectorAll("[data-section]").forEach(function (b) {
  b.addEventListener("click", function () {
    var section = b.getAttribute("data-section");

    closeSidebar();

    if (section === "Dispute") {
      window.location.href = "../user/pages/disputes.html";
      return;
    }

    if (section !== "Dashboard") {
      showToast(section + " is coming soon");
    }
  });
});

document.querySelectorAll(".view-all").forEach(function (b) {
  b.addEventListener("click", function () {
    showToast("Coming soon!");
  });
});

byId("profileButton").addEventListener("click", function () {
  showToast("Profile is coming soon");
});

byId("learnMore").addEventListener("click", function () {
  showToast("Verified owners, secure payments and deposit safety.");
});

byId("markRead").addEventListener("click", function () {
  document.querySelectorAll(".unread").forEach(function (n) {
    n.classList.remove("unread", "bg-[#eef5fb]");

    var badge = n.querySelector(".new-badge");
    if (badge) badge.remove();
  });
});

/* ---------- 17. START ---------- */
(function startApp() {
  ensureAdmin();

  var email = getSession();
  var user = email ? getUsers()[email] : null;

  if (user && user.finishedSetup && !needsKyc(user)) {
    currentEmail = email;
    goToDashboard(user);
    return;
  }

  showScreen("welcomeScreen");
})();