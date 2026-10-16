
"use strict";


const API_BASE_URL="http://localhost:5000/api";
const USE_MOCK_DATA=true;
const MOCK_DATA_URL="../data/booking.json";
const STORAGE_KEY="renthub_owner_booking_updates";

const $=selector=>document.querySelector(selector);
const $$=selector=>document.querySelectorAll(selector);

const state={
  bookings:[],
  filter:"all",
  search:"",
  pendingAction:null,
  previousFocus:null,
  loading:false
};

const FILTERS=[
  {key:"all",label:"All"},
  {key:"requests",label:"Requests"},
  {key:"active",label:"Active"},
  {key:"upcoming",label:"Upcoming"},
  {key:"completed",label:"Completed"}
];

const ALLOWED_STATUSES=[
  "pending",
  "active",
  "upcoming",
  "completed",
  "declined",
  "cancelled"
];

// =====================================================
// HELPERS
// =====================================================

function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
}

function formatMoney(amount,currency="NGN"){
  return new Intl.NumberFormat("en-NG",{
    style:"currency",
    currency,
    minimumFractionDigits:0,
    maximumFractionDigits:0
  }).format(Number(amount)||0).replace("NGN","₦");
}

function formatDate(dateString){
  const date=new Date(`${dateString}T12:00:00`);

  if(Number.isNaN(date.getTime())){
    return dateString||"Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US",{
    month:"short",
    day:"numeric",
    year:"numeric"
  }).format(date);
}

function formatDateRange(start,end){
  if(!start)return "Date unavailable";
  if(!end||start===end)return formatDate(start);

  const first=new Date(`${start}T12:00:00`);
  const last=new Date(`${end}T12:00:00`);

  if(Number.isNaN(first.getTime())||Number.isNaN(last.getTime())){
    return `${start} - ${end}`;
  }

  const sameYear=first.getFullYear()===last.getFullYear();
  const sameMonth=sameYear&&first.getMonth()===last.getMonth();

  if(sameMonth){
    const month=new Intl.DateTimeFormat("en-US",{month:"short"}).format(first);
    return `${month} ${first.getDate()} - ${month} ${last.getDate()}, ${last.getFullYear()}`;
  }

  if(sameYear){
    const startPart=new Intl.DateTimeFormat("en-US",{
      month:"short",
      day:"numeric"
    }).format(first);

    return `${startPart} - ${formatDate(end)}`;
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function resolveImage(source){
  if(typeof source!=="string"||!source.trim())return "";

  try{
    return new URL(source,document.baseURI).href;
  }catch(error){
    console.error("Invalid booking image path:",source,error);
    return "";
  }
}

const FALLBACK_IMAGE=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="14" fill="#F2F7FB"/>
  <rect x="22" y="33" width="76" height="55" rx="7" fill="none" stroke="#224F78" stroke-width="4"/>
  <circle cx="45" cy="51" r="7" fill="#224F78"/>
  <path d="M29 79L48 61L62 72L77 56L91 79" fill="none" stroke="#224F78" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`)}`;

function showNotice(message,isError=false){
  const element=$("#bookingNotice");
  if(!element)return;

  element.textContent=message;
  element.className=`mb-4 rounded-xl px-4 py-3 text-sm ${isError?"bg-red-50 text-red-700":"bg-green-50 text-green-800"}`;
}

function hideNotice(){
  const element=$("#bookingNotice");
  if(element)element.classList.add("hidden");
}

function setLoading(loading){
  state.loading=loading;

  $("#loadingState")?.classList.toggle("hidden",!loading);

  if(loading){
    $("#bookingsPanel")?.classList.add("hidden");
    $("#emptyState")?.classList.add("hidden");
  }
}

// =====================================================
// BACKEND API
// =====================================================

async function apiRequest(endpoint,options={}){
  const token=localStorage.getItem("ownerToken");

  const headers={
    Accept:"application/json",
    ...options.headers
  };

  if(token){
    headers.Authorization=`Bearer ${token}`;
  }

  if(options.body&&!(options.body instanceof FormData)){
    headers["Content-Type"]="application/json";
  }

  const response=await fetch(`${API_BASE_URL}${endpoint}`,{
    ...options,
    headers
  });

  if(!response.ok){
    const details=await response.json().catch(()=>({}));
    throw new Error(details.message||`Request failed (${response.status})`);
  }

  if(response.status===204)return null;

  return response.json();
}

// =====================================================
// MOCK DATA PERSISTENCE
// =====================================================

function getSavedUpdates(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    const updates=raw?JSON.parse(raw):{};

    return updates&&typeof updates==="object"&&!Array.isArray(updates)
      ?updates
      :{};
  }catch(error){
    console.warn("Could not read saved booking updates:",error);
    return {};
  }
}

function saveBookingUpdate(id,status){
  const updates=getSavedUpdates();

  updates[id]={
    status,
    updatedAt:new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY,JSON.stringify(updates));
}

// =====================================================
// LOAD BOOKINGS
// =====================================================

async function getBookings(){
  let result;

  if(USE_MOCK_DATA){
    const response=await fetch(MOCK_DATA_URL,{cache:"no-store"});

    if(!response.ok){
      throw new Error(`Cannot load bookings.json (${response.status}).`);
    }

    result=await response.json();
  }else{
    // Proposed backend route: GET /owner/bookings
    result=await apiRequest("/owner/bookings");
  }

  const bookings=Array.isArray(result)?result:result?.bookings;

  if(!Array.isArray(bookings)){
    throw new Error("Invalid booking data. Expected a bookings array.");
  }

  const validBookings=bookings.map(booking=>({
    ...booking,
    status:String(booking.status||"pending").toLowerCase()
  }));

  if(!USE_MOCK_DATA)return validBookings;

  const updates=getSavedUpdates();

  return validBookings.map(booking=>{
    const savedStatus=updates[booking.id]?.status;

    return ALLOWED_STATUSES.includes(savedStatus)
      ?{...booking,status:savedStatus}
      :booking;
  });
}

// =====================================================
// FILTERS AND COUNTS
// =====================================================

function matchesFilter(booking,filter){
  switch(filter){
    case "requests":
      return booking.status==="pending";

    case "active":
      return booking.status==="active";

    case "upcoming":
      return booking.status==="upcoming";

    case "completed":
      return booking.status==="completed";

    default:
      return booking.status!=="declined"&&booking.status!=="cancelled";
  }
}

function getFilterCount(filter){
  return state.bookings.filter(booking=>matchesFilter(booking,filter)).length;
}

function renderTabs(){
  $$(".booking-tab").forEach(button=>{
    const filter=button.dataset.filter;
    const config=FILTERS.find(item=>item.key===filter);

    if(!config)return;

    const active=state.filter===filter;

    button.textContent=`${config.label} (${getFilterCount(filter)})`;
    button.setAttribute("aria-selected",String(active));

    button.classList.toggle("bg-[#285F92]",active);
    button.classList.toggle("text-white",active);

    button.classList.toggle("bg-[#F2F5F8]",!active);
    button.classList.toggle("lg:bg-white",!active);
    button.classList.toggle("text-[#285F92]",!active);
  });
}

function getVisibleBookings(){
  return state.bookings.filter(booking=>{
    if(!matchesFilter(booking,state.filter))return false;

    if(!state.search)return true;

    const searchable=[
      booking.equipmentName,
      booking.category,
      booking.location,
      booking.id,
      booking.renter?.name
    ].join(" ").toLowerCase();

    return searchable.includes(state.search);
  });
}

// =====================================================
// STATUS BADGES
// =====================================================

function getStatusClasses(status){
  switch(status){
    case "pending":
      return "bg-[#FFF0C6] text-[#ED8B00]";

    case "active":
      return "bg-[#E6FAEF] text-[#008A51]";

    case "upcoming":
      return "bg-[#E6F1FC] text-[#285F92]";

    case "completed":
      return "bg-[#E6FAEF] text-[#008A51]";

    case "declined":
    case "cancelled":
      return "bg-red-50 text-red-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getStatusLabel(status){
  return status.charAt(0).toUpperCase()+status.slice(1);
}

// =====================================================
// BOOKING CARD
// =====================================================

function createBookingCard(booking){
  const pending=booking.status==="pending";
  const image=resolveImage(booking.image)||FALLBACK_IMAGE;
  const statusClasses=getStatusClasses(booking.status);

  return `
    <article class="rounded-[20px] border border-[#CEC8D8] bg-white px-4 py-5 sm:px-5 lg:rounded-2xl lg:border-[#E7E7E7] lg:px-5 lg:py-4" data-booking-id="${escapeHTML(booking.id)}">
      <div class="flex items-center gap-4">
        <img src="${escapeHTML(image)}" data-fallback="${escapeHTML(FALLBACK_IMAGE)}" alt="${escapeHTML(booking.equipmentName)}" class="h-[76px] w-[76px] shrink-0 object-contain sm:h-[90px] sm:w-[90px] lg:h-[52px] lg:w-[52px]">
        <div class="min-w-0 flex-1">
          <h2 class="text-[19px] font-medium leading-snug text-[#224F78] sm:text-[21px] lg:text-[17px] lg:text-[#303030]">${escapeHTML(booking.equipmentName)}</h2>
          <p class="mt-2 text-[14px] text-[#444444] sm:text-[15px] lg:mt-1 lg:text-[13px]">${escapeHTML(formatDateRange(booking.startDate,booking.endDate))}</p>
          <span class="mt-3 inline-flex rounded-full px-4 py-1.5 text-[14px] font-medium lg:mt-2 lg:px-3 lg:py-1 lg:text-xs ${statusClasses}">${escapeHTML(getStatusLabel(booking.status))}</span>
        </div>
        <p class="shrink-0 self-center text-[19px] font-medium text-[#303030] sm:text-[22px] lg:self-start lg:text-[15px]">${escapeHTML(formatMoney(booking.amount,booking.currency))}</p>
      </div>
      ${pending?`
        <div class="mt-5 grid grid-cols-2 gap-3 lg:mt-[-36px] lg:ml-auto lg:max-w-[280px]">
          <button type="button" data-action="accept" data-id="${escapeHTML(booking.id)}" class="min-h-[48px] rounded-full bg-[#285F92] px-4 py-2.5 text-[17px] font-medium text-white transition hover:bg-[#224F78] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285F92] lg:min-h-[42px] lg:text-[15px]">Accept</button>
          <button type="button" data-action="decline" data-id="${escapeHTML(booking.id)}" class="min-h-[48px] rounded-full border border-[#285F92] bg-white px-4 py-2.5 text-[17px] font-medium text-[#285F92] transition hover:bg-[#F2F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285F92] lg:min-h-[42px] lg:text-[15px]">Decline</button>
        </div>
      `:""}
    </article>
  `;
}

// =====================================================
// RENDER BOOKINGS
// =====================================================

function renderBookings(){
  if(state.loading)return;

  const container=$("#bookingsList");
  const panel=$("#bookingsPanel");
  const empty=$("#emptyState");

  if(!container||!panel||!empty)return;

  const bookings=getVisibleBookings();

  if(!bookings.length){
    container.replaceChildren();
    panel.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  container.innerHTML=bookings.map(createBookingCard).join("");

  panel.classList.remove("hidden");
  empty.classList.add("hidden");
}

function renderAll(){
  renderTabs();
  renderBookings();
}

// =====================================================
// CONFIRMATION MODAL
// =====================================================

function openConfirmation(id,action){
  const booking=state.bookings.find(item=>item.id===id);

  if(!booking||booking.status!=="pending")return;
  if(!["accept","decline"].includes(action))return;

  state.pendingAction={id,action};
  state.previousFocus=document.activeElement;

  const accepting=action==="accept";

  $("#modalTitle").textContent=accepting
    ?"Accept Booking"
    :"Decline Booking";

  $("#modalDescription").textContent=accepting
    ?`Are you sure you want to accept the booking for ${booking.equipmentName}?`
    :`Are you sure you want to decline the booking for ${booking.equipmentName}?`;

  const confirmButton=$("#confirmAction");

  confirmButton.textContent=accepting?"Accept Booking":"Decline Booking";
  confirmButton.className=`rounded-xl px-5 py-2.5 text-sm font-medium text-white ${accepting?"bg-[#285F92]":"bg-red-600"}`;

  $("#confirmationModal").classList.remove("hidden");
  $("#confirmationModal").classList.add("flex");

  $("#cancelAction")?.focus();
}

function closeConfirmation(){
  const modal=$("#confirmationModal");

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  state.pendingAction=null;
  state.previousFocus?.focus?.();
}

// =====================================================
// ACCEPT / DECLINE
// =====================================================

async function updateBookingStatus(id,action){
  const booking=state.bookings.find(item=>item.id===id);

  if(!booking){
    throw new Error("Booking not found.");
  }

  if(booking.status!=="pending"){
    throw new Error("This booking has already been processed.");
  }

  // Accepted requests become upcoming bookings in this mock.
  // The backend can return another valid status when connected.
  const nextStatus=action==="accept"?"upcoming":"declined";

  if(USE_MOCK_DATA){
    saveBookingUpdate(id,nextStatus);
    booking.status=nextStatus;
    return booking;
  }

  // Proposed backend routes:
  // PATCH /owner/bookings/:id/accept
  // PATCH /owner/bookings/:id/decline

  const result=await apiRequest(
    `/owner/bookings/${encodeURIComponent(id)}/${action}`,
    {method:"PATCH"}
  );

  const updated=result?.booking??result;

  if(!updated||!ALLOWED_STATUSES.includes(updated.status)){
    throw new Error("Invalid booking response from backend.");
  }

  Object.assign(booking,updated);

  return booking;
}

async function confirmBookingAction(){
  if(!state.pendingAction)return;

  const {id,action}=state.pendingAction;
  const button=$("#confirmAction");

  button.disabled=true;
  button.textContent="Processing...";

  try{
    await updateBookingStatus(id,action);

    closeConfirmation();
    renderAll();

    showNotice(
      action==="accept"
        ?"Booking accepted successfully."
        :"Booking declined successfully."
    );
  }catch(error){
    console.error("Booking action failed:",error);
    closeConfirmation();
    showNotice(error.message,true);
  }finally{
    button.disabled=false;
  }
}

// =====================================================
// IMAGE ERROR HANDLING
// =====================================================

function handleImageError(event){
  const image=event.target;

  if(!(image instanceof HTMLImageElement))return;

  if(!image.closest("#bookingsList"))return;

  const fallback=image.dataset.fallback||FALLBACK_IMAGE;

  if(image.src===fallback)return;

  console.error("Booking image failed to load:",image.src);
  image.src=fallback;
}

// =====================================================
// EVENTS
// =====================================================

function bindEvents(){
  // Desktop and mobile search share the same state.
  ["#desktopSearch","#mobileSearch"].forEach(selector=>{
    $(selector)?.addEventListener("input",event=>{
      state.search=event.target.value.trim().toLowerCase();

      const otherSelector=selector==="#desktopSearch"
        ?"#mobileSearch"
        :"#desktopSearch";

      const other=$(otherSelector);

      if(other)other.value=event.target.value;

      renderBookings();
    });
  });

  // Booking tabs
  $("#bookingTabs")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-filter]");
    if(!button)return;

    state.filter=button.dataset.filter;
    renderAll();
  });

  // Accept and decline
  $("#bookingsList")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-action][data-id]");
    if(!button)return;

    openConfirmation(button.dataset.id,button.dataset.action);
  });

  // Modal controls
  $("#cancelAction")?.addEventListener("click",closeConfirmation);
  $("#confirmAction")?.addEventListener("click",confirmBookingAction);

  $("#confirmationModal")?.addEventListener("click",event=>{
    if(event.target===event.currentTarget){
      closeConfirmation();
    }
  });

  document.addEventListener("keydown",event=>{
    const modal=$("#confirmationModal");

    if(!modal||modal.classList.contains("hidden"))return;

    if(event.key==="Escape"){
      closeConfirmation();
      return;
    }

    if(event.key!=="Tab")return;

    const controls=[
      $("#cancelAction"),
      $("#confirmAction")
    ].filter(element=>element&&!element.disabled);

    if(!controls.length)return;

    const first=controls[0];
    const last=controls[controls.length-1];

    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("error",handleImageError,true);

  // Logout: change this route if your login page is elsewhere.
  $("#desktopLogout")?.addEventListener("click",()=>{
    localStorage.removeItem("ownerToken");
    window.location.href="../../onboarding/index.html";
  });
}

// =====================================================
// INITIALIZATION
// =====================================================

async function initialize(){
  bindEvents();
  hideNotice();
  setLoading(true);

  try{
    state.bookings=await getBookings();

    setLoading(false);
    renderAll();

    console.log("RentHub bookings loaded:",state.bookings.length);
  }catch(error){
    console.error("Failed to load bookings:",error);

    setLoading(false);
    showNotice(error.message,true);

    $("#emptyState")?.classList.remove("hidden");
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initialize,{once:true});
}else{
  initialize();
}
