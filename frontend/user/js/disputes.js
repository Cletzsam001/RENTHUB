/* =========================================================
  RentHUB - renter dispute flow

   Flow:  form -> "Review Your Damage Report" -> submitted
   Disputes are saved in localStorage under "renthub_disputes"
   (demo only; a real app would send them to a backend).
   Only file NAMES and COUNTS are saved, not the files.
   ========================================================= */

(function () {

  /* ---------- 1. SIGNED-IN RENTER ---------- */
  var email = "";
  var users = {};
  try {
    email = localStorage.getItem("renthub_session") || "";
    users = JSON.parse(localStorage.getItem("renthub_users") || "{}");
    if (!users[email] || users[email].role !== "renter") email = "";
  } catch (e) {
    email = "";
  }

  if (!email) {
    window.location.replace("../../onboarding/index.html");
    return;
  }

  var avatar = document.querySelector(".avatar-placeholder");
  if (avatar) {
    var currentUser = users[email];
    avatar.textContent = (currentUser.firstName || email).charAt(0).toUpperCase();
  }

  var sidebar = byId("sidebar");
  var sidebarOverlay = byId("sidebarOverlay");
  var menuButton = byId("menuBtn");

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.add("hidden");
    menuButton.setAttribute("aria-expanded", "false");
  }

  menuButton.addEventListener("click", function () {
    sidebar.classList.add("open");
    sidebarOverlay.classList.remove("hidden");
    menuButton.setAttribute("aria-expanded", "true");
  });

  sidebarOverlay.addEventListener("click", closeSidebar);
  sidebar.querySelectorAll("nav a").forEach(function (link) {
    link.addEventListener("click", closeSidebar);
  });


  /* ---------- 2. HELPERS ---------- */
  function byId(id) { return document.getElementById(id); }

  function makeSafe(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) { screens[i].classList.add("hidden"); }
    byId(id).classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function getChoice(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  // Sets or clears an error message. Returns true when there is no error.
  function setError(errorId, message, boxId) {
    byId(errorId).textContent = message;
    if (boxId) {
      byId(boxId).classList.toggle("border-red-500", message !== "");
      byId(boxId).classList.toggle("border-slate-300", message === "");
    }
    return message === "";
  }

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }


  /* ---------- 3. THE CHOICES ---------- */
  // What each answer means on the review screen
  var ISSUES = {
    already_damaged:   { label: "Equipment was already damaged when received",   condition: "Damage was already present",             request: "Not responsible for the damage" },
    not_working:       { label: "Equipment was not working properly when received", condition: "Equipment was not working properly",  request: "Refund or replacement" },
    not_as_advertised: { label: "Equipment was different from what was advertised", condition: "Item did not match the listing",      request: "Refund or replacement" },
    missing_parts:     { label: "Equipment was missing parts or accessories",    condition: "Parts or accessories were missing",      request: "Missing items provided, or a partial refund" },
    late_delivery:     { label: "Equipment was delivered late",                  condition: "Delivered late",                         request: "Partial refund for the delay" },
    false_accusation:  { label: "Owner is accusing me of damage I did not cause", condition: "I did not cause any damage",            request: "Not responsible for the damage" },
    others:            { label: "",                                              condition: "See my description",                     request: "Review of my case" }
  };

  var NOTICED = {
    before_using:   "Before using the equipment",
    when_received:  "When I received it",
    after_using:    "After I started using it",
    when_returning: "When I was returning it"
  };


  /* ---------- 4. FILE UPLOADERS ---------- */
  // Keeps a list of chosen files, shows them, lets the person remove one.
  function createUploader(buttonId, inputId, listId, errorId, maxFiles, maxMB, allowVideo) {
    var files = [];
    var input = byId(inputId);
    var list = byId(listId);

    function check(file) {
      var isImage = file.type.indexOf("image/") === 0;
      var isVideo = file.type.indexOf("video/") === 0;
      if (!isImage && !(allowVideo && isVideo)) {
        return allowVideo ? "Only photos and videos can be added." : "Only images can be added.";
      }
      if (file.size > maxMB * 1024 * 1024) {
        return "\"" + file.name + "\" is too large. Maximum size is " + maxMB + "MB.";
      }
      return "";
    }

    function render() {
      list.innerHTML = "";
      files.forEach(function (file, index) {
        var row = document.createElement("div");
        row.className = "flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs";

        var name = document.createElement("span");
        name.className = "truncate";
        name.textContent = (file.type.indexOf("video/") === 0 ? "🎥 " : "🖼️ ") + file.name;

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "shrink-0 font-bold text-red-600 hover:underline";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          files.splice(index, 1);
          render();
        });

        row.appendChild(name);
        row.appendChild(remove);
        list.appendChild(row);
      });
    }

    byId(buttonId).addEventListener("click", function () { input.click(); });

    input.addEventListener("change", function () {
      var message = "";
      for (var i = 0; i < input.files.length; i++) {
        var file = input.files[i];
        var problem = check(file);
        if (problem !== "") { message = problem; continue; }
        if (files.length >= maxFiles) { message = "You can add up to " + maxFiles + " files."; break; }
        files.push(file);
      }
      byId(errorId).textContent = message;
      input.value = "";            // so the same file can be picked again later
      render();
    });

    return {
      get: function () { return files; },
      clear: function () { files = []; render(); byId(errorId).textContent = ""; }
    };
  }

  var evidenceUploader   = createUploader("evidenceButton",   "evidenceInput",   "evidenceList",   "evidenceFilesError",   8, 25, true);
  var screenshotUploader = createUploader("screenshotButton", "screenshotInput", "screenshotList", "screenshotFilesError", 4, 10, false);


  /* ---------- 5. SHOW / HIDE THE EXTRA BOXES ---------- */
  document.addEventListener("change", function (event) {
    var name = event.target.name;

    if (name === "issue") {
      byId("otherBox").classList.toggle("hidden", event.target.value !== "others");
      setError("issueError", "");
    }
    if (name === "noticed") { setError("noticedError", ""); }
    if (name === "evidence") {
      byId("evidenceBox").classList.toggle("hidden", event.target.value !== "yes");
      setError("evidenceError", "");
    }
    if (name === "notified") {
      byId("notifyBox").classList.toggle("hidden", event.target.value !== "yes");
      setError("notifiedError", "");
    }
  });

  byId("issueOther").addEventListener("input", function () { setError("issueError", "", "issueOther"); });
  byId("ownerResponse").addEventListener("change", function () { setError("ownerResponseError", "", "ownerResponse"); });


  /* ---------- 6. CHECK THE FORM ---------- */
  function validateForm() {
    var firstBad = null;
    function fail(elementId) { if (!firstBad) { firstBad = byId(elementId); } }

    byId("disputeFormError").textContent = "";

    var issue = getChoice("issue");
    if (issue === "") {
      setError("issueError", "Choose what went wrong."); fail("issueError");
    } else if (issue === "others" && byId("issueOther").value.trim().length < 5) {
      setError("issueError", "Please describe the problem (at least a few words).", "issueOther"); fail("issueOther");
    }

    if (getChoice("noticed") === "") {
      setError("noticedError", "Choose when you noticed the problem."); fail("noticedError");
    }

    var evidence = getChoice("evidence");
    if (evidence === "") {
      setError("evidenceError", "Tell us if you have evidence."); fail("evidenceError");
    } else if (evidence === "yes" && evidenceUploader.get().length === 0) {
      byId("evidenceFilesError").textContent = "Add at least one photo or video, or choose No.";
      fail("evidenceFilesError");
    }

    var notified = getChoice("notified");
    if (notified === "") {
      setError("notifiedError", "Tell us if you notified the owner."); fail("notifiedError");
    } else if (notified === "yes" && byId("ownerResponse").value === "") {
      setError("ownerResponseError", "Choose how the owner responded.", "ownerResponse"); fail("ownerResponse");
    }

    if (firstBad) {
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      byId("disputeFormError").textContent = "Please fix the items marked above.";
      return false;
    }
    return true;
  }


  /* ---------- 7. BUILD THE REPORT ---------- */
  function countFiles(files) {
    var photos = 0, videos = 0;
    files.forEach(function (f) {
      if (f.type.indexOf("video/") === 0) { videos++; } else { photos++; }
    });
    return { photos: photos, videos: videos };
  }

  function evidenceText(counts) {
    var parts = [];
    if (counts.photos > 0) { parts.push(plural(counts.photos, "photo")); }
    if (counts.videos > 0) { parts.push(plural(counts.videos, "video")); }
    return parts.length ? parts.join(" and ") : "None";
  }

  function buildReport() {
    var issueKey = getChoice("issue");
    var info = ISSUES[issueKey];
    var counts = countFiles(evidenceUploader.get());
    var notified = getChoice("notified") === "yes";
    var otherText = byId("issueOther").value.trim();

    return {
      issueKey: issueKey,
      issue: issueKey === "others" ? otherText : info.label,
      condition: info.condition,
      noticed: NOTICED[getChoice("noticed")],
      evidence: getChoice("evidence") === "yes" ? evidenceText(counts) : "None",
      photos: getChoice("evidence") === "yes" ? counts.photos : 0,
      videos: getChoice("evidence") === "yes" ? counts.videos : 0,
      fileNames: getChoice("evidence") === "yes" ? evidenceUploader.get().map(function (f) { return f.name; }) : [],
      notified: notified ? "Yes" : "No",
      ownerResponse: notified ? byId("ownerResponse").value : "Not applicable",
      screenshots: notified ? screenshotUploader.get().length : 0,
      request: info.request
    };
  }

  var report = null;

  function row(label, value) {
    return '<div class="py-3 border-b border-slate-200 last:border-b-0">' +
             '<small class="block text-xs font-semibold tracking-wide text-slate-500 mb-1">' + label + "</small>" +
             '<strong class="text-sm">' + makeSafe(value) + "</strong>" +
           "</div>";
  }

  function fillReview() {
    byId("disputeReviewBox").innerHTML =
      row("ISSUE", report.issue) +
      row("CONDITION WHEN RECEIVED", report.condition) +
      row("WHEN NOTICED", report.noticed) +
      row("EVIDENCE", report.evidence) +
      row("OWNER NOTIFIED", report.notified) +
      row("OWNER'S RESPONSE", report.ownerResponse) +
      row("REQUEST", report.request);
  }


  /* ---------- 8. THE BUTTONS ---------- */
  byId("disputeForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateForm()) { return; }
    report = buildReport();
    fillReview();
    byId("disputeSaveError").textContent = "";
    showScreen("disputeReviewScreen");
  });

  byId("reviewBack").addEventListener("click", function () {
    showScreen("disputeFormScreen");
  });

  byId("reviewSubmit").addEventListener("click", function () {
    var reference = "DSP-" + Date.now().toString(36).toUpperCase();

    var saved = [];
    try { saved = JSON.parse(localStorage.getItem("renthub_disputes")) || []; } catch (e) {}

    saved.push({
      id: reference,
      userEmail: email,
      createdAt: new Date().toISOString(),
      status: "Under review",
      report: report
    });

    try {
      localStorage.setItem("renthub_disputes", JSON.stringify(saved));
    } catch (e) {
      byId("disputeSaveError").textContent = "We could not save your report. Please allow browser storage and try again.";
      return;
    }

    byId("disputeRef").textContent = reference;
    showScreen("disputeDoneScreen");
  });

  byId("reportAnother").addEventListener("click", function () {
    byId("disputeForm").reset();
    evidenceUploader.clear();
    screenshotUploader.clear();
    byId("otherBox").classList.add("hidden");
    byId("evidenceBox").classList.add("hidden");
    byId("notifyBox").classList.add("hidden");
    byId("disputeFormError").textContent = "";
    report = null;
    showScreen("disputeFormScreen");
  });

})();