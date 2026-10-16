
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menu = document.getElementById("menu");

function setSidebar(open){
  if(!sidebar) return;
  sidebar.classList.toggle("open", open);
  overlay?.classList.toggle("open", open);
  document.body.classList.toggle("overflow-hidden", open);
}
menu?.addEventListener("click",()=>setSidebar(true));
overlay?.addEventListener("click",()=>setSidebar(false));
const primaryNav = document.querySelector("#sidebar > .nav");
const equipmentListingsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Equipment / Listings");
if(equipmentListingsLink){
  equipmentListingsLink.href = "equipment-listings.html";
  const isEquipmentPage = window.location.pathname.endsWith("equipment-listings.html") || window.location.pathname.endsWith("equipment-details.html");
  if(isEquipmentPage){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    equipmentListingsLink.classList.add("active");
  }
}
const disputesLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Disputes");
if(disputesLink){
  disputesLink.href = "disputes.html";
  if(window.location.pathname.endsWith("disputes.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    disputesLink.classList.add("active");
  }
}
const settingsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Settings");
if(settingsLink){
  settingsLink.href = "settings.html";
  if(window.location.pathname.endsWith("settings.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    settingsLink.classList.add("active");
  }
}
const auditLogsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Audit Logs");
if(auditLogsLink){
  auditLogsLink.href = "audit-logs.html";
  if(window.location.pathname.endsWith("audit-logs.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    auditLogsLink.classList.add("active");
  }
}
const supportTicketsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Support Tickets");
if(supportTicketsLink){
  supportTicketsLink.href = "support-tickets.html";
  if(window.location.pathname.endsWith("support-tickets.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    supportTicketsLink.classList.add("active");
  }
}
const reportsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Reports");
if(reportsLink){
  reportsLink.href = "reports.html";
  if(window.location.pathname.endsWith("reports.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    reportsLink.classList.add("active");
  }
}
const reviewsLink = [...(primaryNav?.querySelectorAll("a") ?? [])]
  .find(link=>link.textContent.trim() === "Reviews");
if(reviewsLink){
  reviewsLink.href = "reviews.html";
  if(window.location.pathname.endsWith("reviews.html")){
    primaryNav?.querySelectorAll("a.active").forEach(link=>link.classList.remove("active"));
    reviewsLink.classList.add("active");
  }
}
document.querySelectorAll('.panel-title a[href="kyc-review.html"]').forEach(link=>{
  if(link.textContent.trim() === "View all") link.href = "disputes.html";
});
document.querySelectorAll(".nav a").forEach(a=>{
  a.addEventListener("click",()=>setSidebar(false));
});
const settingsStorageKey = "renthub.platform-settings";
const readSettings = () => {
  try{
    const saved = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  }catch{
    return {};
  }
};
const savedSettings = readSettings();
document.querySelectorAll("[data-settings-tab]").forEach(tab=>{
  tab.addEventListener("click",()=>{
    const selectedSection = tab.dataset.settingsTab;
    document.querySelectorAll("[data-settings-tab]").forEach(button=>{
      const selected = button === tab;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-settings-panel]").forEach(panel=>{
      panel.hidden = panel.dataset.settingsPanel !== selectedSection;
    });
  });
});
document.querySelectorAll("[data-setting]").forEach(control=>{
  const value = savedSettings[control.closest("[data-settings-form]")?.dataset.settingsForm]?.[control.dataset.setting];
  if(value === undefined) return;
  if(control.type === "checkbox") control.checked = Boolean(value);
  else control.value = String(value);
});
document.querySelectorAll("[data-settings-form]").forEach(form=>{
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const currentSettings = readSettings();
    const sectionSettings = {};
    form.querySelectorAll("[data-setting]").forEach(control=>{
      sectionSettings[control.dataset.setting] = control.type === "checkbox" ? control.checked : control.value;
    });
    currentSettings[form.dataset.settingsForm] = sectionSettings;
    const feedback = form.querySelector("[data-settings-feedback]");
    try{
      localStorage.setItem(settingsStorageKey, JSON.stringify(currentSettings));
      if(feedback) feedback.textContent = "Changes saved.";
    }catch{
      if(feedback) feedback.textContent = "Could not save changes.";
    }
  });
});
const equipmentDetailView = document.querySelector("[data-equipment-detail]");
if(equipmentDetailView){
  const detailParams = new URLSearchParams(window.location.search);
  const setDetailText = (selector, value) => {
    const element = equipmentDetailView.querySelector(selector);
    if(element && value) element.textContent = value;
  };
  setDetailText("[data-detail-name]", detailParams.get("name"));
  setDetailText("[data-detail-owner]", detailParams.get("owner"));
  setDetailText("[data-detail-owner-initials]", detailParams.get("owner")?.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase());
  setDetailText("[data-detail-category]", detailParams.get("category"));
  const statusKey = detailParams.get("statusKey");
  let currentStatus = detailParams.get("status") || "Pending";
  try{
    const savedStatuses = JSON.parse(localStorage.getItem("renthub.table-statuses") || "{}");
    if(statusKey && savedStatuses[statusKey]?.status) currentStatus = savedStatuses[statusKey].status;
  }catch{}
  const statusBadge = equipmentDetailView.querySelector("[data-detail-status]");
  const statusColors = {Pending:"yellow",Approved:"green",Rejected:"red",Suspended:"red"};
  const decisionButtons = equipmentDetailView.querySelectorAll("[data-listing-decision]");
  const suspendButton = equipmentDetailView.querySelector("[data-listing-suspend]");
  const rejectionDialog = document.querySelector("[data-equipment-rejection-dialog]");
  const rejectionForm = rejectionDialog?.querySelector("[data-equipment-rejection-form]");
  const rejectionResultDialog = document.querySelector("[data-equipment-rejection-result-dialog]");
  const approvalDialog = document.querySelector("[data-equipment-approval-dialog]");
  const approvalForm = approvalDialog?.querySelector("[data-equipment-approval-form]");
  const approvalResultDialog = document.querySelector("[data-equipment-approval-result-dialog]");
  const renderListingStatus = status=>{
    if(!statusBadge) return;
    statusBadge.className = `badge ${statusColors[status] || "yellow"}`;
    statusBadge.textContent = status;
  };
  const renderListingActions = status=>{
    const isActionLocked = status === "Approved" || status === "Suspended";
    decisionButtons.forEach(button=>button.hidden = isActionLocked);
    if(suspendButton){
      suspendButton.hidden = !isActionLocked;
      suspendButton.textContent = status === "Suspended" ? "Reactivate equipment" : "Suspend equipment";
    }
  };
  const saveListingStatus = (status, rejectionDetails = {})=>{
    currentStatus = status;
    renderListingStatus(currentStatus);
    renderListingActions(currentStatus);
    if(statusKey){
      try{
        const savedStatuses = JSON.parse(localStorage.getItem("renthub.table-statuses") || "{}");
        savedStatuses[statusKey] = {status:currentStatus,previousStatus:"",...rejectionDetails};
        localStorage.setItem("renthub.table-statuses",JSON.stringify(savedStatuses));
      }catch{}
    }
    const feedback = equipmentDetailView.querySelector("[data-listing-feedback]");
    if(feedback) feedback.textContent = `Listing ${currentStatus.toLowerCase()}.`;
  };
  renderListingStatus(currentStatus);
  renderListingActions(currentStatus);
  equipmentDetailView.querySelectorAll("[data-detail-thumbnail]").forEach(thumbnail=>{
    thumbnail.addEventListener("click",()=>{
      const mainImage = equipmentDetailView.querySelector("[data-detail-main-image]");
      if(mainImage){
        mainImage.src = thumbnail.dataset.detailThumbnail;
        mainImage.alt = thumbnail.querySelector("img")?.alt || "Equipment photo";
        mainImage.classList.toggle("rotate-sideways",thumbnail.dataset.detailOrientation === "landscape");
      }
      equipmentDetailView.querySelectorAll("[data-detail-thumbnail]").forEach(item=>item.classList.toggle("active",item===thumbnail));
    });
  });
  equipmentDetailView.querySelectorAll("[data-listing-decision]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(button.dataset.listingDecision === "Rejected" && rejectionDialog){
        const mainImage = equipmentDetailView.querySelector("[data-detail-main-image]");
        const rejectionImage = rejectionDialog.querySelector("[data-rejection-image]");
        if(rejectionImage && mainImage){
          rejectionImage.src = mainImage.currentSrc || mainImage.src;
          rejectionImage.alt = mainImage.alt;
        }
        rejectionDialog.querySelector("[data-rejection-name]").textContent = equipmentDetailView.querySelector("[data-detail-name]")?.textContent.trim() ?? "Equipment listing";
        rejectionDialog.querySelector("[data-rejection-price]").textContent = equipmentDetailView.querySelector("[data-detail-price]")?.textContent.trim() ?? "";
        rejectionDialog.querySelector("[data-rejection-location]").textContent = equipmentDetailView.querySelector("[data-detail-location]")?.textContent.trim() ?? "";
        rejectionForm?.reset();
        rejectionDialog.showModal();
        return;
      }
      if(button.dataset.listingDecision === "Approved" && approvalDialog){
        const mainImage = equipmentDetailView.querySelector("[data-detail-main-image]");
        const approvalImage = approvalDialog.querySelector("[data-approval-image]");
        if(approvalImage && mainImage){
          approvalImage.src = mainImage.currentSrc || mainImage.src;
          approvalImage.alt = mainImage.alt;
        }
        approvalDialog.querySelector("[data-approval-name]").textContent = equipmentDetailView.querySelector("[data-detail-name]")?.textContent.trim() ?? "Equipment listing";
        approvalDialog.querySelector("[data-approval-price]").textContent = equipmentDetailView.querySelector("[data-detail-price]")?.textContent.trim() ?? "";
        approvalDialog.querySelector("[data-approval-location]").textContent = equipmentDetailView.querySelector("[data-detail-location]")?.textContent.trim() ?? "";
        approvalForm?.reset();
        approvalDialog.showModal();
        return;
      }
      saveListingStatus(button.dataset.listingDecision);
    });
  });
  suspendButton?.addEventListener("click",()=>saveListingStatus(currentStatus === "Suspended" ? "Approved" : "Suspended"));
  rejectionForm?.addEventListener("submit",event=>{
    event.preventDefault();
    const formData = new FormData(rejectionForm);
    const rejectionReason = String(formData.get("reason") || "");
    const rejectionNote = String(formData.get("note") || "").trim();
    saveListingStatus("Rejected",{
      rejectionReason,
      rejectionNote
    });
    const resultMessage = rejectionResultDialog?.querySelector("[data-equipment-rejection-result-message]");
    const message = `The equipment listing was rejected. Reason: ${rejectionReason}.`;
    if(resultMessage) resultMessage.textContent = rejectionNote ? `${message} Note: ${rejectionNote}` : message;
    rejectionDialog.close();
    rejectionResultDialog?.showModal();
  });
  rejectionDialog?.querySelector("[data-rejection-cancel]").addEventListener("click",()=>rejectionDialog.close());
  rejectionResultDialog?.querySelector("[data-equipment-rejection-retry]").addEventListener("click",()=>{
    rejectionResultDialog.close();
    rejectionDialog.showModal();
  });
  approvalForm?.addEventListener("submit",event=>{
    event.preventDefault();
    const approvalNote = String(new FormData(approvalForm).get("note") || "").trim();
    saveListingStatus("Approved",{approvalNote});
    approvalDialog.close();
    approvalResultDialog?.showModal();
  });
  approvalDialog?.querySelector("[data-approval-cancel]").addEventListener("click",()=>approvalDialog.close());
  approvalResultDialog?.querySelector("[data-approval-view-equipment]").addEventListener("click",()=>{
    detailParams.set("status","Approved");
    window.location.href = `equipment-details.html?${detailParams}`;
  });
}
document.querySelector("[data-settings-export]")?.addEventListener("click",()=>{
  const downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(readSettings(), null, 2)],{type:"application/json"}));
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = "renthub-settings.json";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),0);
});
const reportPeriodData = {
  "7":{label:"Last 7 days",revenue:"₦48.2M",rentals:"6,421",users:"1,204",average:"₦38,500",bars:[58,76,66,88,80,95,100],categories:{cameras:"34%",laptops:"26%",drones:"18%",lighting:"12%"}},
  "30":{label:"30 days",revenue:"₦184.6M",rentals:"25,091",users:"4,870",average:"₦42,300",bars:[62,70,68,82,91,86,100],categories:{cameras:"31%",laptops:"28%",drones:"19%",lighting:"14%"}},
  "90":{label:"90 days",revenue:"₦512.8M",rentals:"71,204",users:"12,482",average:"₦44,100",bars:[56,65,74,82,78,92,100],categories:{cameras:"29%",laptops:"30%",drones:"20%",lighting:"15%"}}
};
let selectedReportPeriod = "7";
const updateReport = period=>{
  const report = reportPeriodData[period];
  if(!report) return;
  selectedReportPeriod = period;
  document.querySelectorAll("[data-report-period]").forEach(button=>{
    const selected = button.dataset.reportPeriod === period;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  Object.entries({revenue:report.revenue,rentals:report.rentals,users:report.users,average:report.average}).forEach(([metric,value])=>{
    const element = document.querySelector(`[data-report-metric="${metric}"]`);
    if(element) element.textContent = value;
  });
  report.bars.forEach((height,index)=>{
    const bar = document.querySelector(`[data-report-bar="${index}"]`);
    if(bar) bar.style.height = `${height}%`;
  });
  Object.entries(report.categories).forEach(([category,value])=>{
    const element = document.querySelector(`[data-report-category="${category}"]`);
    if(element) element.textContent = value;
  });
};
document.querySelectorAll("[data-report-period]").forEach(button=>{
  button.addEventListener("click",()=>updateReport(button.dataset.reportPeriod));
});
document.querySelector("[data-reports-export]")?.addEventListener("click",()=>{
  const report = reportPeriodData[selectedReportPeriod];
  const rows = [
    ["Period",report.label],
    ["Revenue",report.revenue],
    ["Rentals",report.rentals],
    ["New Users",report.users],
    ["Average Rental Value",report.average],
    ...Object.entries(report.categories).map(([category,value])=>[category,value])
  ];
  const csv = rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const downloadUrl = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = `renthub-report-${selectedReportPeriod}-days.csv`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),0);
});
document.addEventListener("click",event=>{
  document.querySelectorAll("details.status-actions[open], details.equipment-filter[open]").forEach(popup=>{
    if(!popup.contains(event.target)) popup.open = false;
  });
});
const dashboardStatRoutes = {
  "Total Users":{href:"users.html?filter=all", label:"View all users"},
  "Verified Users":{href:"users.html?search=verified", label:"View verified users"},
  "Active Rentals":{href:"rentals.html?filter=active", label:"View active rentals"},
  "Active Listings":{href:"equipment-listings.html?filter=approved", label:"View approved listings"}
};
document.querySelectorAll(".stat").forEach(stat=>{
  const label = stat.querySelector(".stat-label")?.textContent.trim();
  const route = dashboardStatRoutes[label];
  const arrow = stat.querySelector(".stat-arrow");
  if(!route || !arrow) return;
  const link = document.createElement("a");
  link.className = arrow.className;
  link.href = route.href;
  link.setAttribute("aria-label", route.label);
  link.textContent = arrow.textContent.trim();
  arrow.replaceWith(link);
});

function initTableInteractions(){
  const search = document.querySelector("[data-table-search]");
  let rows = [...document.querySelectorAll("[data-row]")];
  const pageParams = new URLSearchParams(window.location.search);
  const filterTabs = [...document.querySelectorAll("[data-tab-group] .tab[data-table-filter]")];
  const requestedFilterTab = filterTabs.find(tab=>tab.dataset.tableFilter === pageParams.get("filter"));
  requestedFilterTab && filterTabs.forEach(tab=>tab.classList.toggle("active", tab === requestedFilterTab));
  if(search && pageParams.has("search")) search.value = pageParams.get("search") ?? "";
  const activeTab = requestedFilterTab ?? document.querySelector("[data-tab-group] .tab.active[data-table-filter]");
  let activeTableFilter = activeTab?.dataset.tableFilter ?? "all";
  const filterColumn = Number(activeTab?.closest("[data-tab-group]")?.dataset.filterColumn);
  const categoryFilter = document.querySelector("[data-category-filter]");
  const categoryColumn = Number(categoryFilter?.dataset.filterColumn);
  const updateTabCounts = () => {
    document.querySelectorAll("[data-tab-group]").forEach(group=>{
      if(group.hasAttribute("data-static-counts")) return;
      const column = Number(group.dataset.filterColumn);
      group.querySelectorAll(".tab[data-table-filter]").forEach(tab=>{
        const filter = tab.dataset.tableFilter;
        const label = tab.dataset.countLabel ?? tab.textContent.trim().replace(/\s[\d,]+$/, "");
        tab.dataset.countLabel = label;
        let countElement = tab.querySelector("[data-filter-count]");
        if(!countElement){
          tab.replaceChildren(document.createTextNode(`${label} `));
          countElement = document.createElement("span");
          countElement.dataset.filterCount = "";
          tab.append(countElement);
        }
        const count = filter === "all" ? rows.length : rows.filter(row=>{
          const text = Number.isInteger(column)
            ? row.cells[column]?.textContent.trim().toLowerCase() ?? ""
            : row.textContent.trim().toLowerCase();
          return text.includes(filter);
        }).length;
        countElement.textContent = count.toLocaleString();
      });
    });
  };
  const applyTableFilters = () => {
    const query = search?.value.trim().toLowerCase() ?? "";
    const category = categoryFilter?.value ?? "";
    rows.forEach(row=>{
      const filterText = Number.isInteger(filterColumn)
        ? row.cells[filterColumn]?.textContent.trim().toLowerCase() ?? ""
        : [...row.cells].map(cell=>cell.textContent.trim().toLowerCase()).join(" ");
      const matchesFilter = activeTableFilter === "all" || filterText.includes(activeTableFilter);
      const matchesCategory = !category || row.cells[categoryColumn]?.textContent.trim() === category;
      const rowText = row.textContent.toLowerCase();
      const matchesSearch = rowText.includes(query);
      row.style.display = matchesFilter && matchesCategory && matchesSearch ? "" : "none";
    });
    updateTabCounts();
  };
  search?.addEventListener("input",applyTableFilters);
  categoryFilter?.addEventListener("change",applyTableFilters);
  document.querySelectorAll("[data-tab-group]").forEach(group=>{
    group.querySelectorAll(".tab").forEach(tab=>{
      tab.addEventListener("click",()=>{
        group.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
        tab.classList.add("active");
        if(tab.dataset.tableFilter){
          activeTableFilter = tab.dataset.tableFilter;
          applyTableFilters();
        }
      });
    });
  });
  applyTableFilters();
  const pageTitle = document.querySelector(".page-head h1")?.textContent.trim();
  document.querySelector("[data-export-visible]")?.addEventListener("click",()=>{
    const table = document.querySelector(".data-table");
    if(!table) return;
    const csvValue = value=>`"${value.replace(/"/g, '""')}"`;
    const visibleRows = rows.filter(row=>row.style.display !== "none");
    const csv = [table.tHead.rows[0], ...visibleRows]
      .map(row=>[...row.cells].slice(0, -1).map(cell=>csvValue(cell.textContent.trim())).join(","))
      .join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = document.querySelector("[data-export-visible]").dataset.exportFilename || "equipment-listings.csv";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),0);
  });
  document.querySelector("[data-reset-equipment-filters]")?.addEventListener("click",event=>{
    if(search) search.value = "";
    if(categoryFilter) categoryFilter.value = "";
    document.querySelector('[data-tab-group] .tab[data-table-filter="all"]')?.click();
    event.currentTarget.closest("details")?.removeAttribute("open");
    applyTableFilters();
  });
  const createDocumentViewIcon = () => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("viewBox", "0 0 18 18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    [
      "M12.375 14.625C12.9963 14.625 13.5 14.1213 13.5 13.5C13.5 12.8787 12.9963 12.375 12.375 12.375C11.7537 12.375 11.25 12.8787 11.25 13.5C11.25 14.1213 11.7537 14.625 12.375 14.625Z",
      "M16.7496 13.2069C16.402 12.3215 15.8023 11.5575 15.0246 11.0097C14.247 10.4618 13.3258 10.1542 12.375 10.125C11.4242 10.1542 10.503 10.4618 9.72535 11.0097C8.94774 11.5575 8.34799 12.3215 8.00044 13.2069L7.875 13.5L8.00044 13.7936C8.34808 14.679 8.94787 15.4428 9.72547 15.9906C10.5031 16.5383 11.4243 16.8458 12.375 16.875C13.3257 16.8458 14.2469 16.5383 15.0245 15.9906C15.8021 15.4428 16.4019 14.679 16.7496 13.7936L16.875 13.5L16.7496 13.2069ZM12.375 15.75C11.93 15.75 11.495 15.618 11.125 15.3708C10.755 15.1236 10.4666 14.7722 10.2963 14.361C10.126 13.9499 10.0814 13.4975 10.1682 13.061C10.255 12.6246 10.4693 12.2237 10.784 11.909C11.0987 11.5943 11.4996 11.38 11.936 11.2932C12.3725 11.2064 12.8249 11.251 13.236 11.4213C13.6472 11.5916 13.9986 11.88 14.2458 12.25C14.493 12.62 14.625 13.055 14.625 13.5C14.6243 14.0965 14.387 14.6684 13.9652 15.0902C13.5434 15.512 12.9715 15.7493 12.375 15.75ZM3.9375 9.5625H6.75V10.6875H3.9375V9.5625ZM3.9375 6.75H10.6875V7.875H3.9375V6.75ZM3.9375 3.9375H10.6875V5.0625H3.9375V3.9375Z",
      "M12.375 1.125H2.25C1.95191 1.12589 1.66627 1.2447 1.45549 1.45549C1.2447 1.66627 1.12589 1.95191 1.125 2.25V15.75C1.12589 16.0481 1.2447 16.3337 1.45549 16.5445C1.66627 16.7553 1.95191 16.8741 2.25 16.875H6.75V15.75H2.25V2.25H12.375V8.4375H13.5V2.25C13.4991 1.95191 13.3803 1.66627 13.1695 1.45549C12.9587 1.2447 12.6731 1.12589 12.375 1.125Z"
    ].forEach(pathData=>{
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", "#1F4E79");
      icon.append(path);
    });
    return icon;
  };
  const createUserProfileIcon = () => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("viewBox", "0 0 18 18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M9 9C11.07 9 12.75 7.32 12.75 5.25C12.75 3.18 11.07 1.5 9 1.5C6.93 1.5 5.25 3.18 5.25 5.25C5.25 7.32 6.93 9 9 9ZM9 3C10.2375 3 11.25 4.0125 11.25 5.25C11.25 6.4875 10.2375 7.5 9 7.5C7.7625 7.5 6.75 6.4875 6.75 5.25C6.75 4.0125 7.7625 3 9 3ZM3 16.5H15C15.4125 16.5 15.75 16.1625 15.75 15.75V15C15.75 12.105 13.395 9.75 10.5 9.75H7.5C4.605 9.75 2.25 12.105 2.25 15V15.75C2.25 16.1625 2.5875 16.5 3 16.5ZM7.5 11.25H10.5C12.57 11.25 14.25 12.93 14.25 15H3.75C3.75 12.93 5.43 11.25 7.5 11.25Z");
    path.setAttribute("fill", "#1F4E79");
    icon.append(path);
    return icon;
  };
  const createVerifyIcon = () => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "13");
    icon.setAttribute("viewBox", "0 0 18 13");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5.45801 13.0078L0 7.54102L0.791016 6.75L5.45801 11.4082L16.875 0L17.666 0.791016L5.45801 13.0078Z");
    path.setAttribute("fill", "#1F4E79");
    icon.append(path);
    return icon;
  };
  const createResubmissionIcon = () => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("viewBox", "0 0 18 18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M3.18945 3V6.75H6.75045M3.80295 6C4.49824 4.79584 5.59018 3.87055 6.89211 3.38229C8.19405 2.89403 9.62515 2.87311 10.9408 3.32312C12.2564 3.77313 13.3749 4.66612 14.1051 5.84945C14.8353 7.03278 15.1318 8.43298 14.944 9.81071C14.7562 11.1884 14.0956 12.4582 13.0753 13.4029C12.055 14.3475 10.7383 14.9085 9.35022 14.9899C7.96213 15.0713 6.58885 14.6681 5.46513 13.8491C4.34142 13.0302 3.53702 11.8463 3.18945 10.5");
    path.setAttribute("stroke", "#1F4E79");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    icon.append(path);
    return icon;
  };
  const createRejectIcon = () => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("viewBox", "0 0 18 18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M13.5 4.5L4.5 13.5M13.5 13.5L4.5 4.5");
    path.setAttribute("stroke", "#1F4E79");
    path.setAttribute("stroke-width", "1.125");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    icon.append(path);
    return icon;
  };
  const createUserActionIcon = actionName => {
    const definitions = {
      "view-profile":{width:19,height:19,viewBox:"0 0 19 19",paths:[
        {d:"M1.25 15.25C1.25 14.1891 1.67143 13.1717 2.42157 12.4216C3.17172 11.6714 4.18913 11.25 5.25 11.25H13.25C14.3109 11.25 15.3283 11.6714 16.0784 12.4216C16.8286 13.1717 17.25 14.1891 17.25 15.25C17.25 15.7804 17.0393 16.2891 16.6642 16.6642C16.2891 17.0393 15.7804 17.25 15.25 17.25H3.25C2.71957 17.25 2.21086 17.0393 1.83579 16.6642C1.46071 16.2891 1.25 15.7804 1.25 15.25Z",stroke:"#13314C","stroke-width":"2.5","stroke-linejoin":"round"},
        {d:"M9.25 7.25C10.9069 7.25 12.25 5.90685 12.25 4.25C12.25 2.59315 10.9069 1.25 9.25 1.25C7.59315 1.25 6.25 2.59315 6.25 4.25C6.25 5.90685 7.59315 7.25 9.25 7.25Z",stroke:"#13314C","stroke-width":"2.5"}
      ]},
      "suspend-account":{width:19,height:18,viewBox:"0 0 19 18",paths:[
        {d:"M18.089 13.948c.354.64.34 1.416-.038 2.042A2.102 2.102 0 0116.249 17H3.095c-.74 0-1.424-.384-1.801-1.01a2.036 2.036 0 01-.038-2.042L7.832 2.076A2.1 2.1 0 019.672 1a2.1 2.1 0 011.84 1.076l6.577 11.872z",stroke:"#666"},
        {tag:"rect",x:"9.172",y:"5",width:"1",height:"7",rx:".472",stroke:"#666"},
        {tag:"rect",x:"9.022",y:"13",width:"1.3",height:"1.3",rx:".65",fill:"#666",stroke:"none"}
      ]},
      "reactivate-account":{width:20,height:20,viewBox:"0 0 20 20",paths:[
        {d:"M18.75 9.75312C18.7493 11.9217 17.9655 14.0171 16.543 15.6539C15.1204 17.2906 13.1547 18.3587 11.0074 18.6617C8.86014 18.9647 6.67565 18.4822 4.85576 17.3029C3.03587 16.1236 1.70298 14.3269 1.10223 12.2432C0.501493 10.1595 0.673306 7.92896 1.58607 5.96184C2.49884 3.99472 4.09117 2.42332 6.0702 1.53666C8.04922 0.650004 10.2818 0.507719 12.3574 1.13598C14.433 1.76424 16.2119 3.12079 17.367 4.95612M18.457 0.754121L18.284 2.80812C18.16 4.28712 18.098 5.02612 17.616 5.44212C17.134 5.85812 16.423 5.78512 15.001 5.63912L12.957 5.42912",stroke:"#12B76A","stroke-width":"1.5","stroke-linecap":"round","stroke-linejoin":"round"}
      ]},
      "delete-account":{width:13,height:16,viewBox:"0 0 13 16",paths:[
        {d:"M13 3.00065H12V14.5007C12 14.709 11.9609 14.9043 11.8828 15.0866C11.8047 15.2689 11.6979 15.4277 11.5625 15.5632C11.4271 15.6986 11.2682 15.8053 11.0859 15.8835C10.9036 15.9616 10.7083 16.0007 10.5 16.0007H2.5C2.29167 16.0007 2.09635 15.9616 1.91406 15.8835C1.73177 15.8053 1.57292 15.6986 1.4375 15.5632C1.30208 15.4277 1.19531 15.2689 1.11719 15.0866C1.03906 14.9043 1 14.709 1 14.5007V3.00065H0V2.00065H4V1.00065C4 0.860026 4.02604 0.729818 4.07812 0.610026C4.13021 0.490234 4.20052 0.386068 4.28906 0.297526C4.3776 0.208984 4.48438 0.136068 4.60938 0.078776C4.73438 0.0214844 4.86458 -0.00455729 5 0.000651042H8C8.14062 0.000651042 8.27083 0.0266927 8.39062 0.078776C8.51042 0.130859 8.61458 0.201172 8.70312 0.289714C8.79167 0.378255 8.86458 0.485026 8.92188 0.610026C8.97917 0.735026 9.00521 0.865234 9 1.00065V2.00065H13V3.00065ZM5 2.00065H8V1.00065H5V2.00065ZM11 3.00065H2V14.5007C2 14.6361 2.04948 14.7533 2.14844 14.8522C2.2474 14.9512 2.36458 15.0007 2.5 15.0007H10.5C10.6354 15.0007 10.7526 14.9512 10.8516 14.8522C10.9505 14.9512 11 14.6361 11 14.5007V3.00065ZM5 13.0007H4V5.00065H5V13.0007ZM7 13.0007H6V5.00065H7V13.0007ZM9 13.0007H8V5.00065H9V13.0007Z",fill:"#B42318"}
      ]}
    };
    const definition = definitions[actionName];
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", String(definition.width));
    icon.setAttribute("height", String(definition.height));
    icon.setAttribute("viewBox", definition.viewBox);
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.classList.add("user-action-icon");
    definition.paths.forEach(pathDefinition=>{
      const shape = document.createElementNS("http://www.w3.org/2000/svg", pathDefinition.tag ?? "path");
      Object.entries(pathDefinition).filter(([key])=>key !== "tag").forEach(([key,value])=>shape.setAttribute(key,value));
      icon.append(shape);
    });
    return icon;
  };
  const createEquipmentActionIcon = actionName => {
    const paths = {
      "listing-details":["M1.66602 6.66732C1.66602 6.4463 1.75381 6.23434 1.91009 6.07806C2.06637 5.92178 2.27834 5.83398 2.49935 5.83398H17.4993C17.7204 5.83398 17.9323 5.92178 18.0886 6.07806C18.2449 6.23434 18.3327 6.4463 18.3327 6.66732C18.3327 6.88833 18.2449 7.10029 18.0886 7.25657C17.9323 7.41285 17.7204 7.50065 17.4993 7.50065H2.49935C2.27834 7.50065 2.06637 7.41285 1.91009 7.25657C1.75381 7.10029 1.66602 6.88833 1.66602 6.66732ZM1.66602 10.0007C1.66602 9.77964 1.75381 9.56768 1.91009 9.4114C2.06637 9.25512 2.27834 9.16732 2.49935 9.16732H17.4993C17.7204 9.16732 17.9323 9.25512 18.0886 9.4114C18.2449 9.56768 18.3327 9.77964 18.3327 10.0007C18.3327 10.2217 18.2449 10.4336 18.0886 10.5899C17.9323 10.7462 17.7204 10.834 17.4993 10.834H2.49935C2.27834 10.834 2.06637 10.7462 1.91009 10.5899C1.75381 10.4336 1.66602 10.2217 1.66602 10.0007ZM2.49935 12.5007C2.27834 12.5007 2.06637 12.5884 1.91009 12.7447C1.75381 12.901 1.66602 13.113 1.66602 13.334C1.66602 13.555 1.75381 13.767 1.91009 13.9232C2.06637 14.0795 2.27834 14.1673 2.49935 14.1673H12.4993C12.7204 14.1673 12.9323 14.0795 13.0886 13.9232C13.2449 13.767 13.3327 13.555 13.3327 13.334C13.3327 13.113 13.2449 12.901 13.0886 12.7447C12.9323 12.5884 12.7204 12.5007 12.4993 12.5007H2.49935Z", "#303030"],
      "accept-listing":["M17.5 5C17.6326 5 17.7598 5.05268 17.8536 5.14645C17.9473 5.24021 18 5.36739 18 5.5C18 5.63261 17.9473 5.75979 17.8536 5.85355C17.7598 5.94732 17.6326 6 17.5 6H2.5C2.36739 6 2.24021 5.94732 2.14645 5.85355C2.05268 5.75979 2 5.63261 2 5.5C2 5.36739 2.05268 5.24021 2.14645 5.14645C2.24021 5.05268 2.36739 5 2.5 5H17.5ZM17.5 8C17.6326 8 17.7598 8.05268 17.8536 8.14645C17.9473 8.24021 18 8.36739 18 8.5C18 8.63261 17.9473 8.75979 17.8536 8.85355C17.7598 8.94732 17.6326 9 17.5 9H2.5C2.36739 9 2.24021 8.94732 2.14645 8.85355C2.05268 8.75979 2 8.63261 2 8.5C2 8.36739 2.05268 8.24021 2.14645 8.14645C2.24021 8.05268 2.36739 8 2.5 8H17.5ZM9 14.5C9 14.332 9.00733 14.1653 9.022 14H2.5C2.36739 14 2.24021 14.0527 2.14645 14.1464C2.05268 14.2402 2 14.3674 2 14.5C2 14.6326 2.05268 14.7598 2.14645 14.8536C2.24021 14.9473 2.36739 15 2.5 15H9.022C9.00772 14.8337 9.00038 14.6669 9 14.5ZM9.6 12C9.784 11.6413 10.003 11.308 10.257 11H2.5C2.36739 11 2.24021 11.0527 2.14645 11.1464C2.05268 11.2402 2 11.3674 2 11.5C2 11.6326 2.05268 11.7598 2.14645 11.8536C2.24021 11.9473 2.36739 12 2.5 12H9.6ZM14.5 10C15.6935 10 16.8381 10.4741 17.682 11.318C18.5259 12.1619 19 13.3065 19 14.5C19 15.6935 18.5259 16.8381 17.682 17.682C16.8381 18.5259 15.6935 19 14.5 19C13.3065 19 12.1619 18.5259 11.318 17.682C10.4741 16.8381 10 15.6935 10 14.5C10 13.3065 10.4741 12.1619 11.318 11.318C12.1619 10.4741 13.3065 10 14.5 10ZM13.379 15.769L12.38 14.542L12.317 14.478C12.222 14.3974 12.1004 14.3552 11.9759 14.3595C11.8514 14.3639 11.733 14.4146 11.644 14.5017C11.5549 14.5888 11.5015 14.7059 11.4943 14.8303C11.4871 14.9547 11.5266 15.0772 11.605 15.174L12.945 16.819L13.011 16.886C13.1051 16.9651 13.225 17.0068 13.3478 17.0031C13.4707 16.9994 13.5879 16.9506 13.677 16.866L17.189 13.225L17.249 13.157C17.3232 13.0562 17.3568 12.9312 17.3433 12.8067C17.3298 12.6822 17.2701 12.5674 17.1759 12.4848C17.0818 12.4023 16.9602 12.358 16.835 12.3609C16.7099 12.3637 16.5903 12.4133 16.5 12.5L13.379 15.769Z", "#12B76A"],
      "reject-listing":["M17.5 5C17.6326 5 17.7598 5.05268 17.8536 5.14645C17.9473 5.24021 18 5.36739 18 5.5C18 5.63261 17.9473 5.75979 17.8536 5.85355C17.7598 5.94732 17.6326 6 17.5 6H2.5C2.36739 6 2.24021 5.94732 2.14645 5.85355C2.05268 5.75979 2 5.63261 2 5.5C2 5.36739 2.05268 5.24021 2.14645 5.14645C2.24021 5.05268 2.36739 5 2.5 5H17.5ZM17.5 8C17.6326 8 17.7598 8.05268 17.8536 8.14645C17.9473 8.24021 18 8.36739 18 8.5C18 8.63261 17.9473 8.75979 17.8536 8.85355C17.7598 8.94732 17.6326 9 17.5 9H2.5C2.36739 9 2.24021 8.94732 2.14645 8.85355C2.05268 8.75979 2 8.63261 2 8.5C2 8.36739 2.05268 8.24021 2.14645 8.14645C2.24021 8.05268 2.36739 8 2.5 8H17.5ZM10.257 11C10.0023 11.3084 9.78198 11.6438 9.6 12H2.5C2.36739 12 2.24021 11.9473 2.14645 11.8536C2.05268 11.7598 2 11.6326 2 11.5C2 11.3674 2.05268 11.2402 2.14645 11.1464C2.24021 11.0527 2.36739 11 2.5 11H10.257ZM9 14.5C9 14.668 9.00733 14.8347 9.022 15H2.5C2.36739 15 2.24021 14.9473 2.14645 14.8536C2.05268 14.7598 2 14.6326 2 14.5C2 14.3674 2.05268 14.2402 2.14645 14.1464C2.24021 14.0527 2.36739 14 2.5 14H9.022C9.00772 14.1663 9.00038 14.3331 9 14.5ZM14.5 19C15.6935 19 16.8381 18.5259 17.682 17.682C18.5259 16.8381 19 15.6935 19 14.5C19 13.3065 18.5259 12.1619 17.682 11.318C16.8381 10.4741 15.6935 10 14.5 10C13.3065 10 12.1619 10.4741 11.318 11.318C10.4741 12.1619 10 13.3065 10 14.5C10 15.6935 10.4741 16.8381 11.318 17.682C12.1619 18.5259 13.3065 19 14.5 19ZM15.646 16.354L14.5 15.207L13.354 16.354C13.2601 16.4479 13.1328 16.5006 13 16.5006C12.8672 16.5006 12.7399 16.4479 12.646 16.354C12.5521 16.2601 12.4994 16.1328 12.4994 16C12.4994 15.8672 12.5521 15.7399 12.646 15.646L13.793 14.5L12.646 13.354C12.5521 13.2601 12.4994 13.1328 12.4994 13C12.4994 12.8672 12.5521 12.7399 12.646 12.646C12.7399 12.5521 12.8672 12.4994 13 12.4994C13.1328 12.4994 13.2601 12.5521 13.354 12.646L14.5 13.793L15.646 12.646C15.6925 12.5995 15.7477 12.5626 15.8084 12.5375C15.8692 12.5123 15.9343 12.4994 16 12.4994C16.0657 12.4994 16.1308 12.5123 16.1916 12.5375C16.2523 12.5626 16.3075 12.5995 16.354 12.646C16.4005 12.6925 16.4374 12.7477 16.4625 12.8084C16.4877 12.8692 16.5006 12.9343 16.5006 13C16.5006 13.0657 16.4877 13.1308 16.4625 13.1916C16.4374 13.2523 16.4005 13.3075 16.354 13.354L15.207 14.5L16.354 15.646C16.4005 15.6925 16.4374 15.7477 16.4625 15.8084C16.4877 15.8692 16.5006 15.9343 16.5006 16C16.5006 16.0657 16.4877 16.1308 16.4625 16.1916C16.4374 16.2523 16.4005 16.3075 16.354 16.354C16.3075 16.4005 16.2523 16.4374 16.1916 16.4625C16.1308 16.4877 16.0657 16.5006 16 16.5006C15.9343 16.5006 15.8692 16.4877 15.8084 16.4625C15.7477 16.4374 15.6925 16.4005 15.646 16.354Z", "#F04438"]
    };
    const [pathData, color] = paths[actionName];
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    icon.setAttribute("viewBox", "0 0 20 20");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.classList.add("equipment-action-icon", actionName);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", color);
    icon.append(path);
    return icon;
  };
  const openListingDetails = row => {
    const equipmentName = row.cells[0]?.querySelector(".equipment-name");
    const title = equipmentName
      ? [...equipmentName.childNodes].filter(node=>node.nodeType === Node.TEXT_NODE).map(node=>node.textContent.trim()).join(" ")
      : row.cells[0]?.textContent.trim();
    const detailParams = new URLSearchParams({
      name:title || "Equipment listing",
      owner:[...(row.cells[1]?.querySelector(".user-cell")?.childNodes ?? [])]
        .filter(node=>node.nodeType === Node.TEXT_NODE)
        .map(node=>node.textContent.trim())
        .filter(Boolean)
        .join(" ") || row.cells[1]?.textContent.trim() || "Not provided",
      category:row.cells[2]?.textContent.trim() ?? "Not provided",
      submitted:row.cells[3]?.textContent.trim() ?? "Not provided",
      status:row.cells[4]?.querySelector(".badge")?.textContent.trim() ?? "Pending",
      statusKey:rowStatusKey(row)
    });
    window.location.href = `equipment-details.html?${detailParams}`;
  };
  const openRentalDetails = row => {
    const dialog = document.querySelector("[data-rental-details-dialog]");
    const values = {
      user:row.querySelector(".user-cell span:last-child")?.textContent.trim() ?? "Not provided",
      reference:row.cells[1]?.textContent.trim() ?? "Not provided",
      equipment:row.cells[2]?.textContent.trim() ?? "Not provided",
      status:row.cells[3]?.textContent.trim() ?? "Not provided",
      startDate:row.dataset.startDate ?? "Not provided"
    };
    Object.entries(values).forEach(([key,value])=>{
      dialog.querySelector(`[data-rental-detail="${key}"]`).textContent = value;
    });
    dialog.showModal();
  };
  const createRentalActionIcon = actionName => {
    const definitions = {
      "rental-details":{width:14,height:11,viewBox:"0 0 14 11",fill:"#000000",paths:[
        "M4.9996 5.09375C4.9996 5.55788 5.18398 6.003 5.51217 6.33119C5.84035 6.65938 6.28547 6.84375 6.7496 6.84375C7.21373 6.84375 7.65885 6.65938 7.98704 6.33119C8.31523 6.003 8.4996 5.55788 8.4996 5.09375C8.4996 4.62962 8.31523 4.1845 7.98704 3.85631C7.65885 3.52812 7.21373 3.34375 6.7496 3.34375C6.28547 3.34375 5.84035 3.52812 5.51217 3.85631C5.18398 4.1845 4.9996 4.62962 4.9996 5.09375ZM13.534 4.69063C12.0527 1.57031 9.81366 0 6.8121 0C3.80898 0 1.57148 1.57031 0.090227 4.69219C0.0308135 4.818 0 4.9554 0 5.09453C0 5.23366 0.0308135 5.37107 0.090227 5.49687C1.57148 8.61719 3.81054 10.1875 6.8121 10.1875C9.81523 10.1875 12.0527 8.61719 13.534 5.49531C13.6543 5.24219 13.6543 4.94844 13.534 4.69063ZM6.7496 7.84375C5.23085 7.84375 3.9996 6.6125 3.9996 5.09375C3.9996 3.575 5.23085 2.34375 6.7496 2.34375C8.26835 2.34375 9.4996 3.575 9.4996 5.09375C9.4996 6.6125 8.26835 7.84375 6.7496 7.84375Z"
      ]},
      "rental-complete":{width:14,height:11,viewBox:"0 0 14 11",fill:"#027A48",paths:[
        "M13.3651 0.51041C13.5115 0.665745 13.6258 0.848399 13.7016 1.04794C13.7774 1.24748 13.8131 1.46 13.8068 1.67335C13.8004 1.8867 13.7521 2.09671 13.6645 2.29139C13.577 2.48606 13.452 2.66157 13.2966 2.80791L5.87108 9.80541C5.56078 10.0978 5.14803 10.2565 4.7218 10.2473C4.29557 10.2381 3.89002 10.0618 3.59258 9.75641L0.460579 6.53891C0.159956 6.23007 -0.00566559 5.81445 0.00014804 5.38349C0.00596167 4.95253 0.182735 4.54153 0.491579 4.24091C0.800424 3.94029 1.21604 3.77467 1.647 3.78048C2.07796 3.78629 2.48896 3.96307 2.78958 4.27191L4.80608 6.34341L11.0686 0.44241C11.3822 0.146842 11.8004 -0.0120399 12.2312 0.000712419C12.6619 0.0134647 13.07 0.196807 13.3656 0.51041"
      ]},
      "rental-cancel":{width:13,height:13,viewBox:"0 0 13 13",fill:"#B42318",paths:[
        "M6.8125 6.10156L12.2031 11.5L11.5 12.2031L6.10156 6.8125L0.703125 12.2031L0 11.5L5.39062 6.10156L0 0.703125L0.703125 0L6.10156 5.39062L11.5 0L12.2031 0.703125L6.8125 6.10156Z"
      ]}
    };
    const definition = definitions[actionName];
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", String(definition.width));
    icon.setAttribute("height", String(definition.height));
    icon.setAttribute("viewBox", definition.viewBox);
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.classList.add("rental-action-icon");
    definition.paths.forEach(pathData=>{
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", definition.fill);
      icon.append(path);
    });
    return icon;
  };
  const statusActionConfig = {
    "Admin Roles":{statusColumn:3, actionColumn:5, label:"Admin actions", statuses:{Active:"green", Suspended:"red"}, actions:[
      {label:"Suspend admin", icon:"suspend-account"},
      {label:"Reactivate admin", icon:"reactivate-account"}
    ]},
    Users:{statusColumn:3, actionColumn:5, label:"User actions", statuses:{Active:"green", Suspended:"red"}, actions:[
      {label:"View profile", icon:"view-profile"},
      {label:"Suspend account", icon:"suspend-account"},
      {label:"Reactivate account", icon:"reactivate-account"},
      {label:"Delete account", icon:"delete-account"}
    ]},
    KYC:{statusColumn:3, actionColumn:4, label:"KYC actions", statuses:{Verified:"green", Rejected:"red", Resubmit:"resubmission"}, actions:[
      {label:"View document", icon:"document-view"},
      {label:"View user profile", icon:"user-profile"},
      {label:"Verify identity", icon:"verify", status:"Verified"},
      {label:"Request resubmission", icon:"resubmission", status:"Resubmit"},
      {label:"Reject", icon:"reject", status:"Rejected"}
    ]},
    Rentals:{statusColumn:3, actionColumn:4, label:"Rental actions", statuses:{Active:"yellow", Completed:"green", Cancelled:"red"}, actions:[
      {label:"View rental details", icon:"rental-details"},
      {label:"Mark as completed", icon:"rental-complete", status:"Completed"},
      {label:"Cancel rental", icon:"rental-cancel", status:"Cancelled"}
    ]},
    "Equipment/Listings":{statusColumn:4, actionColumn:5, label:"Listing actions", statuses:{Approved:"green", Rejected:"red"}, actions:[
      {label:"View details", icon:"listing-details"},
      {label:"Accept listing", icon:"accept-listing", status:"Approved"},
      {label:"Reject listing", icon:"reject-listing", status:"Rejected"}
    ]},
    Disputes:{statusColumn:4, actionColumn:6, label:"Dispute actions", statuses:{Open:"open", "Under Review":"yellow", Resolved:"green"}, actions:[
      {label:"Mark open", status:"Open"},
      {label:"Mark under review", status:"Under Review"},
      {label:"Resolve dispute", status:"Resolved"}
    ]},
    "Support Tickets":{statusColumn:4, actionColumn:5, label:"Support ticket actions", statuses:{Open:"green", "Under review":"yellow", Closed:"red"}, actions:[
      {label:"Mark open", status:"Open"},
      {label:"Mark under review", status:"Under review"},
      {label:"Close ticket", status:"Closed"}
    ]},
    Deposits:{statusColumn:4, actionColumn:6, label:"Deposit actions", statuses:{Held:"yellow", Released:"green", Deducted:"red"}, actions:[
      {label:"Place on hold", status:"Held"},
      {label:"Release deposit", status:"Released"},
      {label:"Deduct deposit", status:"Deducted"}
    ]}
  }[pageTitle];
  const tableStatusStorageKey = "renthub.table-statuses";
  const legacyUserStatusStorageKey = "renthub.user-account-statuses";
  const readStoredStatuses = key => {
    try{
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    }catch{
      return {};
    }
  };
  const rowIdentity = row => [...row.cells]
    .filter((_, index)=>index !== statusActionConfig.statusColumn && index !== statusActionConfig.actionColumn)
    .map(cell=>cell.textContent.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  const rowStatusKey = row => {
    const identity = rowIdentity(row);
    const duplicateIndex = rows.slice(0, rows.indexOf(row)).filter(candidate=>rowIdentity(candidate) === identity).length;
    return `${pageTitle}:${identity}:${duplicateIndex}`;
  };
  const persistRowStatus = (row, status) => {
    try{
      const savedStatuses = readStoredStatuses(tableStatusStorageKey);
      savedStatuses[rowStatusKey(row)] = {status, previousStatus:row.dataset.previousAccountStatus || ""};
      localStorage.setItem(tableStatusStorageKey, JSON.stringify(savedStatuses));
    }catch{}
  };
  if(statusActionConfig){
    const savedStatuses = readStoredStatuses(tableStatusStorageKey);
    if(pageTitle === "Users"){
      const legacyStatuses = readStoredStatuses(legacyUserStatusStorageKey);
      rows.forEach(row=>{
        const identity = row.cells[1]?.textContent.trim().toLowerCase();
        const legacyStatus = identity && legacyStatuses[identity];
        const key = rowStatusKey(row);
        if(legacyStatus && !savedStatuses[key]){
          savedStatuses[key] = legacyStatus;
        }
      });
      try{
        localStorage.setItem(tableStatusStorageKey, JSON.stringify(savedStatuses));
      }catch{}
    }
    rows.forEach(row=>{
      const saved = savedStatuses[rowStatusKey(row)];
      if(!saved || !statusActionConfig.statuses[saved.status]) return;
      const badge = row.cells[statusActionConfig.statusColumn]?.querySelector(".badge");
      if(!badge) return;
      badge.className = `badge ${statusActionConfig.statuses[saved.status]}`;
      badge.textContent = saved.status;
      if(pageTitle === "Users" && saved.previousStatus) row.dataset.previousAccountStatus = saved.previousStatus;
    });
    applyTableFilters();
  }
  const profileDialog = document.querySelector("[data-profile-dialog]");
  const documentDialog = document.querySelector("[data-document-dialog]");
  const verificationDialog = document.querySelector("[data-verification-dialog]");
  const rejectionDialog = document.querySelector("[data-rejection-dialog]");
  const resubmissionDialog = document.querySelector("[data-resubmission-dialog]");
  const userProfileDialog = document.querySelector("[data-user-profile-dialog]");
  let activeKycRow = null;
  const showVerificationConfirmation = row => {
    const name = row.querySelector(".user-cell span:last-child")?.textContent.trim() ?? "the user";
    const role = row.dataset.role?.trim().toLowerCase();
    const rolePhrase = role === "owner" ? "an Owner" : role === "renter" ? "a Renter" : "a user";
    verificationDialog.querySelector("[data-verification-message]").textContent = `You have verified ${name} as ${rolePhrase}.`;
    verificationDialog.showModal();
  };
  const showResubmissionConfirmation = row => {
    const name = row.querySelector(".user-cell span:last-child")?.textContent.trim() ?? "the user";
    resubmissionDialog.querySelector("[data-resubmission-message]").textContent = `You have requested a new document submission from ${name}.`;
    resubmissionDialog.showModal();
  };
  const openKycProfile = row => {
    const name = row.querySelector(".user-cell span:last-child")?.textContent.trim() ?? "User";
    const initials = row.querySelector(".initial")?.textContent.trim() ?? "";
    const documentType = row.cells[1]?.textContent.trim() ?? "Identity document";
    const statusBadge = row.cells[3]?.querySelector(".badge");
    const status = statusBadge?.textContent.trim() ?? "Not provided";
    const role = row.dataset.role?.trim().toLowerCase();
    const nameParts = name.split(/\s+/);
    const documentName = row.dataset.documentName || `${documentType} document`;
    const avatar = profileDialog.querySelector("[data-profile-avatar]");

    profileDialog.querySelector("[data-profile-name]").textContent = name;
    avatar.replaceChildren();
    if(row.dataset.avatarUrl){
      const image = document.createElement("img");
      image.src = row.dataset.avatarUrl;
      image.alt = "";
      avatar.append(image);
    }else{
      avatar.textContent = initials || nameParts.map(part=>part[0]).join("").slice(0, 2).toUpperCase();
    }
    const profileRole = profileDialog.querySelector("[data-profile-role]");
    profileRole.textContent = role === "owner" || role === "renter" ? role[0].toUpperCase() + role.slice(1) : "Role not provided";
    profileDialog.querySelector("[data-profile-verified-icon]").hidden = status !== "Verified";
    profileDialog.querySelector("[data-profile-joined]").textContent = row.dataset.joined || "Not provided";
    profileDialog.querySelector("[data-profile-document-name]").textContent = row.dataset.documentName || `${documentName} · no file linked`;
    profileDialog.querySelector("[data-profile-email]").textContent = row.dataset.email || "Not provided";
    profileDialog.querySelector("[data-profile-phone]").textContent = row.dataset.phone || "Not provided";
    profileDialog.querySelector("[data-profile-location]").textContent = row.dataset.location || "Not provided";
    profileDialog.querySelector("[data-profile-open-document]").disabled = !row.dataset.documentUrl;
    activeKycRow = row;
    profileDialog.showModal();
  };
  const openUserProfile = row => {
    if(!userProfileDialog) return;
    userProfileDialog.querySelector("[data-user-profile-name]").textContent = row.querySelector(".user-cell span:last-child")?.textContent.trim() ?? "User";
    userProfileDialog.querySelector("[data-user-profile-contact]").textContent = row.cells[1]?.textContent.trim() ?? "Not provided";
    userProfileDialog.querySelector("[data-user-profile-role]").textContent = row.cells[2]?.textContent.trim() ?? "Not provided";
    userProfileDialog.querySelector("[data-user-profile-status]").textContent = row.cells[3]?.textContent.trim() ?? "Not provided";
    userProfileDialog.querySelector("[data-user-profile-joined]").textContent = row.cells[4]?.textContent.trim() ?? "Not provided";
    userProfileDialog.showModal();
  };
  const openKycDocument = row => {
    const documentType = row.cells[1]?.textContent.trim() ?? "Identity document";
    const documentName = row.dataset.documentName || `${documentType} document`;
    const documentUrl = row.dataset.documentUrl;
    const preview = documentDialog.querySelector("[data-document-preview]");
    const originalLink = documentDialog.querySelector("[data-document-original]");
    documentDialog.querySelector("[data-document-title]").textContent = documentName;
    preview.replaceChildren();
    originalLink.hidden = !documentUrl;
    originalLink.href = documentUrl || "";
    if(documentUrl){
      const frame = document.createElement("iframe");
      frame.src = documentUrl;
      frame.title = `${documentName} preview`;
      preview.append(frame);
    }else{
      const message = document.createElement("p");
      message.className = "document-empty";
      message.textContent = "No uploaded file is linked to this identity record.";
      preview.append(message);
    }
    documentDialog.showModal();
  };
  document.querySelectorAll("[data-dialog-close]").forEach(button=>{
    button.addEventListener("click",()=>button.closest("dialog")?.close());
  });
  [profileDialog, documentDialog].forEach(dialog=>{
    dialog?.addEventListener("click",event=>{
      if(event.target === dialog) dialog.close();
    });
  });
  userProfileDialog?.addEventListener("click",event=>{
    if(event.target === userProfileDialog) userProfileDialog.close();
  });
  const listingDetailsDialog = document.querySelector("[data-listing-details-dialog]");
  listingDetailsDialog?.querySelector("[data-listing-details-close]").addEventListener("click",()=>listingDetailsDialog.close());
  listingDetailsDialog?.addEventListener("click",event=>{
    if(event.target === listingDetailsDialog) listingDetailsDialog.close();
  });
  const rentalDetailsDialog = document.querySelector("[data-rental-details-dialog]");
  rentalDetailsDialog?.querySelector("[data-rental-details-close]").addEventListener("click",()=>rentalDetailsDialog.close());
  rentalDetailsDialog?.addEventListener("click",event=>{
    if(event.target === rentalDetailsDialog) rentalDetailsDialog.close();
  });
  profileDialog?.querySelector("[data-profile-open-document]").addEventListener("click",()=>{
    if(activeKycRow?.dataset.documentUrl){
      profileDialog.close();
      openKycDocument(activeKycRow);
    }
  });
  profileDialog?.querySelectorAll("[data-profile-status-action]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(!activeKycRow) return;
      const row = activeKycRow;
      const status = button.dataset.profileStatusAction;
      profileDialog.close();
      setKycRowStatus(row, status);
    });
  });
  verificationDialog?.querySelector("[data-verification-back]").addEventListener("click",()=>verificationDialog.close());
  rejectionDialog?.querySelector("[data-rejection-back]").addEventListener("click",()=>rejectionDialog.close());
  resubmissionDialog?.querySelector("[data-resubmission-back]").addEventListener("click",()=>resubmissionDialog.close());
  const setKycRowStatus = (row, status) => {
    const badge = row?.cells[statusActionConfig?.statusColumn]?.querySelector(".badge");
    const badgeColor = statusActionConfig?.statuses[status];
    if(!badge || !badgeColor) return;
    badge.className = `badge ${badgeColor}`;
    badge.textContent = status;
    if(pageTitle === "Users"){
      const suspended = status === "Suspended";
      const suspendAction = row.querySelector('[data-row-action="Suspend account"]');
      const reactivateAction = row.querySelector('[data-row-action="Reactivate account"]');
      if(suspendAction) suspendAction.disabled = suspended;
      if(reactivateAction) reactivateAction.disabled = !suspended;
    }
    if(pageTitle === "Admin Roles"){
      const suspended = status === "Suspended";
      const suspendAction = row.querySelector('[data-row-action="Suspend admin"]');
      const reactivateAction = row.querySelector('[data-row-action="Reactivate admin"]');
      if(suspendAction) suspendAction.disabled = suspended;
      if(reactivateAction) reactivateAction.disabled = !suspended;
    }
    if(pageTitle === "Rentals"){
      const canChangeStatus = status === "Active";
      const completeAction = row.querySelector('[data-row-action="Mark as completed"]');
      const cancelAction = row.querySelector('[data-row-action="Cancel rental"]');
      if(completeAction) completeAction.disabled = !canChangeStatus;
      if(cancelAction) cancelAction.disabled = !canChangeStatus;
    }
    persistRowStatus(row, status);
    applyTableFilters();
    if(pageTitle === "KYC" && status === "Verified") showVerificationConfirmation(row);
    if(pageTitle === "KYC" && status === "Rejected") rejectionDialog.showModal();
    if(pageTitle === "KYC" && status === "Resubmit") showResubmissionConfirmation(row);
  };
  if(statusActionConfig){
    rows.forEach(row=>{
      const statusCell = row.cells[statusActionConfig.statusColumn];
      const actionCell = row.cells[statusActionConfig.actionColumn];
      if(!statusCell || !actionCell) return;
      const actions = document.createElement("details");
      actions.className = "status-actions";
      const trigger = document.createElement("summary");
      trigger.setAttribute("aria-label", statusActionConfig.label);
      trigger.textContent = "...";
      actions.append(trigger);
      const options = document.createElement("div");
      options.className = "status-menu";
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", statusActionConfig.label);
      const menuActions = statusActionConfig.actions ?? Object.keys(statusActionConfig.statuses).map(status=>({label:status, status}));
      menuActions.forEach(action=>{
        const option = document.createElement("button");
        option.type = "button";
        option.dataset.rowAction = action.label;
        if(action.status) option.dataset.rowStatus = action.status;
        if(pageTitle === "Users" && (action.label === "Suspend account" || action.label === "Reactivate account")){
          const currentStatus = statusCell.querySelector(".badge")?.textContent.trim();
          option.disabled = action.label === "Suspend account" ? currentStatus === "Suspended" : currentStatus !== "Suspended";
        }
        if(pageTitle === "Admin Roles" && (action.label === "Suspend admin" || action.label === "Reactivate admin")){
          const currentStatus = statusCell.querySelector(".badge")?.textContent.trim();
          option.disabled = action.label === "Suspend admin" ? currentStatus === "Suspended" : currentStatus !== "Suspended";
        }
        if(pageTitle === "Rentals" && (action.label === "Mark as completed" || action.label === "Cancel rental")){
          option.disabled = statusCell.querySelector(".badge")?.textContent.trim() !== "Active";
        }
        if(action.icon){
          option.classList.add("has-icon");
          if(action.icon === "accept-listing") option.classList.add("accept-listing-action");
          if(action.icon === "reject-listing") option.classList.add("reject-listing-action");
          const icon = ["view-profile", "suspend-account", "reactivate-account", "delete-account"].includes(action.icon) ? createUserActionIcon(action.icon)
            : ["rental-details", "rental-complete", "rental-cancel"].includes(action.icon) ? createRentalActionIcon(action.icon)
            : action.icon.startsWith("listing-") || action.icon.endsWith("-listing") ? createEquipmentActionIcon(action.icon)
            : action.icon === "document-view" ? createDocumentViewIcon()
            : action.icon === "user-profile" ? createUserProfileIcon()
            : action.icon === "resubmission" ? createResubmissionIcon()
            : action.icon === "reject" ? createRejectIcon()
            : createVerifyIcon();
          option.append(icon, document.createTextNode(action.label));
        }else{
          option.textContent = action.label;
        }
        options.append(option);
      });
      actions.append(options);
      actions.addEventListener("toggle",()=>{
        if(!actions.open){
          actions.classList.remove("opens-upward");
          return;
        }
        const tableBounds = actions.closest(".table-card")?.getBoundingClientRect();
        const triggerBounds = trigger.getBoundingClientRect();
        const menuHeight = options.getBoundingClientRect().height;
        actions.classList.toggle("opens-upward", Boolean(tableBounds && tableBounds.bottom - triggerBounds.bottom < menuHeight + 8));
      });
      actionCell.replaceChildren(actions);
    });
    document.addEventListener("click",event=>{
      const option = event.target.closest("[data-row-action]");
      if(!option) return;
      const row = option.closest("[data-row]");
      const actionName = option.dataset.rowAction;
      if(actionName === "View profile" && pageTitle === "Users" && row) openUserProfile(row);
      if(actionName === "Suspend account" && pageTitle === "Users" && row){
        const currentStatus = row.cells[statusActionConfig.statusColumn]?.querySelector(".badge")?.textContent.trim();
        if(currentStatus && currentStatus !== "Suspended") row.dataset.previousAccountStatus = currentStatus;
        setKycRowStatus(row, "Suspended");
      }
      if(actionName === "Reactivate account" && pageTitle === "Users" && row){
        const previousStatus = row.dataset.previousAccountStatus || "Active";
        delete row.dataset.previousAccountStatus;
        setKycRowStatus(row, previousStatus);
      }
      if(actionName === "Suspend admin" && pageTitle === "Admin Roles" && row){
        const currentStatus = row.cells[statusActionConfig.statusColumn]?.querySelector(".badge")?.textContent.trim();
        if(currentStatus && currentStatus !== "Suspended") row.dataset.previousAccountStatus = currentStatus;
        setKycRowStatus(row, "Suspended");
      }
      if(actionName === "Reactivate admin" && pageTitle === "Admin Roles" && row){
        const previousStatus = row.dataset.previousAccountStatus || "Active";
        delete row.dataset.previousAccountStatus;
        setKycRowStatus(row, previousStatus);
      }
      if(actionName === "Delete account" && pageTitle === "Users" && row && window.confirm("Delete this account from the current user list?")){
        row.remove();
        rows = rows.filter(tableRow=>tableRow.isConnected);
      }
      if(actionName === "View rental details" && pageTitle === "Rentals" && row){
        openRentalDetails(row);
      }
      if(option.dataset.rowAction === "View user profile" && row) openKycProfile(row);
      if(option.dataset.rowAction === "View document" && row) openKycDocument(row);
      if(option.dataset.rowAction === "View details" && pageTitle === "Equipment/Listings" && row) openListingDetails(row);
      const status = option.dataset.rowStatus;
      if(status){
        const row = option.closest("[data-row]");
        setKycRowStatus(row, status);
      }
      const actions = option.closest("details");
      if(actions) actions.open = false;
      applyTableFilters();
    });
  }
  document.querySelectorAll("[data-filter]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const input=document.querySelector("[data-table-search]");
      if(input){input.focus(); input.placeholder="Type a value to filter...";}
    });
  });
}

const parseRecordDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const loadTableRows = async fileName => {
  const response = await fetch(fileName);
  if(!response.ok) throw new Error(`Could not load ${fileName}`);
  const markup = await response.text();
  const sourceDocument = new DOMParser().parseFromString(markup, "text/html");
  return [...sourceDocument.querySelectorAll("tr[data-row]")];
};

const getDateWindowCounts = (rows, dateColumn, predicate, periodDays, dateAttribute) => {
  const datedRows = rows.map(row=>({
    row,
    date:parseRecordDate(dateAttribute ? row.dataset[dateAttribute] : row.cells[dateColumn]?.textContent.trim())
  })).filter(item=>item.date);
  if(!datedRows.length || !periodDays) return {current:0, previous:null};
  const end = new Date(Math.max(...datedRows.map(item=>item.date.getTime())));
  const start = new Date(end);
  start.setDate(start.getDate() - periodDays + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - periodDays + 1);
  const countBetween = (rangeStart, rangeEnd) => datedRows.filter(({row, date})=>
    predicate(row) && date >= rangeStart && date <= rangeEnd
  ).length;
  return {current:countBetween(start, end), previous:countBetween(previousStart, previousEnd)};
};

const formatPeriodChange = (element, current, previous) => {
  element.classList.remove("negative", "neutral");
  if(previous === null){
    element.textContent = "N/A";
    element.title = "No previous-period data is available for comparison.";
    element.classList.add("neutral");
    return;
  }
  if(previous === 0){
    element.textContent = "N/A";
    element.title = "No records in the previous period; percentage change cannot be calculated.";
    element.classList.add("neutral");
    return;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  element.textContent = `${change > 0 ? "+" : ""}${change}%`;
  element.title = `${current.toLocaleString()} in the selected period vs ${previous.toLocaleString()} in the previous period.`;
  element.classList.toggle("negative", change < 0);
  element.classList.toggle("positive", change > 0);
};

async function initDashboardMetrics(){
  const periodSelect = document.querySelector("[data-dashboard-period]");
  if(!periodSelect) return;
  const [users, rentals, listings, payments, kyc, disputes] = await Promise.all([
    loadTableRows("users.html"),
    loadTableRows("rentals.html"),
    loadTableRows("equipment-listings.html"),
    loadTableRows("payments.html"),
    loadTableRows("kyc-review.html"),
    loadTableRows("disputes.html")
  ]);
  const metrics = [
    {label:"Total Users", rows:users, dateColumn:4, predicate:()=>true},
    {label:"Verified Users", rows:users, dateColumn:4, predicate:row=>row.cells[3]?.textContent.trim().toLowerCase() === "verified"},
    {label:"Active Listings", rows:listings, dateColumn:3, predicate:row=>row.cells[4]?.textContent.trim().toLowerCase() === "approved"},
    {label:"Active Rentals", rows:rentals, dateColumn:null, dateAttribute:"startDate", predicate:row=>row.cells[3]?.textContent.trim().toLowerCase() === "active"}
  ];
  const amountFromRow = row=>Number(row.cells[2]?.textContent.replace(/[^\d.]/g, "") ?? 0);
  const paymentRecords = payments.map(row=>({
    date:parseRecordDate(row.cells[5]?.textContent.trim()),
    amount:amountFromRow(row),
    successful:row.cells[4]?.textContent.trim().toLowerCase() === "successful"
  })).filter(record=>record.date);
  const pendingKyc = kyc.filter(row=>row.cells[3]?.textContent.trim().toLowerCase() === "under review").length;
  const pendingKycValue = [...document.querySelectorAll(".mini-card")]
    .find(card=>card.querySelector(".mini-label")?.textContent.trim() === "Pending KYC")
    ?.querySelector(".mini-value");
  if(pendingKycValue) pendingKycValue.textContent = pendingKyc.toLocaleString();
  let savedDisputeStatuses = {};
  try{
    const storedStatuses = JSON.parse(localStorage.getItem("renthub.table-statuses") || "{}");
    if(storedStatuses && typeof storedStatuses === "object" && !Array.isArray(storedStatuses)) savedDisputeStatuses = storedStatuses;
  }catch{}
  const disputeIdentity = row=>[...row.cells]
    .filter((_, index)=>index !== 4 && index !== 6)
    .map(cell=>cell.textContent.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  const disputeCounts = {Open:0, "Under Review":0, Resolved:0};
  disputes.forEach((row,index)=>{
    const identity = disputeIdentity(row);
    const duplicateIndex = disputes.slice(0,index).filter(candidate=>disputeIdentity(candidate) === identity).length;
    const saved = savedDisputeStatuses[`Disputes:${identity}:${duplicateIndex}`];
    const status = saved?.status || row.cells[4]?.querySelector(".badge")?.textContent.trim();
    if(Object.hasOwn(disputeCounts,status)) disputeCounts[status]++;
  });
  const disputeTotal = document.querySelector(".dispute-total");
  if(disputeTotal){
    disputeTotal.textContent = disputes.length.toLocaleString();
    disputeTotal.removeAttribute("title");
  }
  const disputeRows = [...document.querySelectorAll(".dispute-row")];
  disputeRows.forEach((row,index)=>{
    const label = row.querySelector(".dispute-left");
    if(index === 0 && label){
      const labelNode = [...label.childNodes].find(node=>node.nodeType === Node.TEXT_NODE);
      if(labelNode) labelNode.textContent = "Open";
    }
    const status = label?.textContent.trim();
    const count = row.querySelector("span:last-child");
    if(count && Object.hasOwn(disputeCounts,status)){
      count.textContent = disputeCounts[status].toLocaleString();
      count.removeAttribute("title");
    }
  });
  const pendingPayoutValue = [...document.querySelectorAll(".mini-card")]
    .find(card=>card.querySelector(".mini-label")?.textContent.trim() === "Pending Payouts")
    ?.querySelector(".mini-value");
  if(pendingPayoutValue){
    pendingPayoutValue.textContent = "N/A";
    pendingPayoutValue.title = "No payout records are available in the local data.";
  }

  const periodDays = () => periodSelect.value === "all" ? null : Number(periodSelect.value);
  const updateMetrics = () => {
    const days = periodDays();
    metrics.forEach(metric=>{
      const stat = [...document.querySelectorAll(".stat")]
        .find(item=>item.querySelector(".stat-label")?.textContent.trim() === metric.label);
      if(!stat) return;
      const total = metric.rows.filter(metric.predicate).length;
      const value = stat.querySelector(".stat-value");
      const growth = stat.querySelector(".stat-growth");
      if(value) value.textContent = total.toLocaleString();
      if(growth){
        const change = getDateWindowCounts(metric.rows, metric.dateColumn, metric.predicate, days, metric.dateAttribute);
        formatPeriodChange(growth, change.current, change.previous);
      }
    });
    updateTransactionVolume(days);
  };
  const updateTransactionVolume = days=>{
    if(!paymentRecords.length) return;
    const maxDate = new Date(Math.max(...paymentRecords.map(record=>record.date.getTime())));
    const minDate = new Date(Math.min(...paymentRecords.map(record=>record.date.getTime())));
    const startDate = days ? new Date(maxDate) : minDate;
    if(days) startDate.setDate(startDate.getDate() - days + 1);
    const previousEnd = new Date(startDate);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    if(days) previousStart.setDate(previousStart.getDate() - days + 1);
    const successfulInRange = (start, end)=>paymentRecords.filter(record=>
      record.successful && record.date >= start && record.date <= end
    );
    const currentPayments = successfulInRange(startDate, maxDate);
    const previousPayments = days ? successfulInRange(previousStart, previousEnd) : null;
    const currentTotal = currentPayments.reduce((sum, record)=>sum + record.amount, 0);
    const previousTotal = previousPayments?.reduce((sum, record)=>sum + record.amount, 0) ?? null;
    const volume = document.querySelector(".volume-value");
    const volumeText = [...(volume?.childNodes ?? [])].find(node=>node.nodeType === Node.TEXT_NODE);
    if(volumeText) volumeText.textContent = `${new Intl.NumberFormat("en-NG", {style:"currency", currency:"NGN", maximumFractionDigits:0}).format(currentTotal)} `;
    const volumeChange = volume?.querySelector(".volume-meta");
    if(volumeChange){
      volumeChange.textContent = "";
      if(previousTotal === null){
        volumeChange.textContent = "N/A";
        volumeChange.classList.add("neutral");
        volumeChange.title = "No previous-period data is available for comparison.";
      }else{
        formatPeriodChange(volumeChange, currentTotal, previousTotal);
      }
    }
    const chart = document.querySelector(".chart");
    const area = chart?.querySelector("polygon");
    const line = chart?.querySelector("polyline");
    const labels = chart?.nextElementSibling?.querySelectorAll("span");
    if(!chart || !area || !line || !labels?.length) return;
    const rangeStart = days ? startDate : minDate;
    const rangeDays = Math.max(1, Math.floor((maxDate - rangeStart) / 86400000) + 1);
    const bucketCount = Math.min(labels.length, rangeDays);
    const buckets = Array.from({length:bucketCount},(_,index)=>{
      const bucketStart = new Date(rangeStart);
      bucketStart.setDate(bucketStart.getDate() + Math.floor(rangeDays * index / bucketCount));
      const bucketEnd = new Date(rangeStart);
      bucketEnd.setDate(bucketEnd.getDate() + Math.floor(rangeDays * (index + 1) / bucketCount) - 1);
      return {start:bucketStart, end:bucketEnd, total:0};
    });
    currentPayments.forEach(record=>{
      const index = Math.min(buckets.length - 1, Math.floor(((record.date - rangeStart) / 86400000) / rangeDays * buckets.length));
      buckets[index].total += record.amount;
    });
    const maxTotal = Math.max(1, ...buckets.map(bucket=>bucket.total));
    const points = buckets.map((bucket,index)=>`${40 + 460 * index / Math.max(1, buckets.length - 1)},${160 - bucket.total / maxTotal * 110}`);
    line.setAttribute("points", points.join(" "));
    area.setAttribute("points", `${points.join(" ")} 500,170 40,170`);
    labels.forEach((label,index)=>{
      label.hidden = index >= buckets.length;
      if(!label.hidden) label.textContent = new Intl.DateTimeFormat("en", {month:"short", day:"numeric"}).format(buckets[index].end);
    });
  };
  periodSelect.addEventListener("change",updateMetrics);
  updateMetrics();
}

document.addEventListener("DOMContentLoaded",initTableInteractions);
document.addEventListener("DOMContentLoaded",initDashboardMetrics);
