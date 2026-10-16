
"use strict";

const API_BASE_URL="http://localhost:5000/api";
const USE_MOCK_DATA=true;
const JSON_URL="../data/finance.json";
const $=selector=>document.querySelector(selector);

const state={
  finance:null,
  property:"all",
  search:""
};

const currency=new Intl.NumberFormat("en-NG",{
  style:"currency",
  currency:"NGN",
  maximumFractionDigits:0
});

function money(value){
  return currency.format(Number(value)||0);
}

function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
}

function formatDate(value){
  if(!value)return "—";
  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))return String(value);
  return date.toLocaleDateString("en-US",{
    month:"2-digit",
    day:"2-digit",
    year:"numeric"
  });
}

function showNotice(message,isError=false){
  const node=$("#notice");
  if(!node)return;
  node.textContent=message;
  node.className=`mb-4 rounded-lg px-3 py-2 text-sm ${isError?"bg-red-50 text-red-700":"bg-blue-50 text-[#224F78]"}`;
  node.classList.remove("hidden");
}

function clearNotice(){
  $("#notice")?.classList.add("hidden");
}

// BACKEND PLACEHOLDER: GET /owner/finance
async function apiRequest(endpoint,options={}){
  const headers={
    Accept:"application/json",
    ...options.headers
  };

  const token=localStorage.getItem("ownerToken");
  if(token)headers.Authorization=`Bearer ${token}`;

  if(options.body&&!(options.body instanceof FormData)){
    headers["Content-Type"]="application/json";
  }

  const response=await fetch(`${API_BASE_URL}${endpoint}`,{
    ...options,
    headers
  });

  if(!response.ok){
    throw new Error(`API request failed (${response.status})`);
  }

  if(response.status===204)return null;
  return response.json();
}

async function getFinanceData(){
  let result;

  if(USE_MOCK_DATA){
    const response=await fetch(JSON_URL,{cache:"no-store"});
    if(!response.ok){
      throw new Error(`Unable to load finance.json (${response.status}).`);
    }
    result=await response.json();
  }else{
    result=await apiRequest("/owner/finance");
  }

  const finance=result?.finance??result;

  if(
    !finance?.summary||
    !Array.isArray(finance.properties)||
    !Array.isArray(finance.rentActions)||
    !Array.isArray(finance.depositRows)||
    !Array.isArray(finance.rentCollections)||
    !Array.isArray(finance.deposits)||
    !Array.isArray(finance.recentActivity)
  ){
    throw new Error("Invalid finance data structure. Check finance.json.");
  }

  return finance;
}

function filterProperty(items){
  return items.filter(item=>
    state.property==="all"||
    item.propertyId==="all"||
    item.propertyId===state.property
  );
}

function matchesSearch(item){
  if(!state.search)return true;
  return Object.values(item).some(value=>
    String(value??"").toLowerCase().includes(state.search)
  );
}

function filtered(items){
  return filterProperty(items).filter(matchesSearch);
}

function renderSummary(){
  const summary=state.finance.summary;

  $("#completedPayments").textContent=money(summary.completedPayments);
  $("#pendingPayments").textContent=money(summary.pendingPayments);
  $("#netOperatingIncome").textContent=money(summary.netOperatingIncome);

  const gross=summary.grossRent==null?"₦--,---.--":money(summary.grossRent);
  const expenses=summary.expenses==null?"₦--,---.--":money(summary.expenses);

  $("#noiBreakdown").textContent=`Gross Rent: ${gross} • Expenses: ${expenses}`;
}

function renderProperties(){
  const select=$("#propertyFilter");
  select.replaceChildren();

  const properties=state.finance.properties;
  const hasAll=properties.some(property=>property.id==="all");

  if(!hasAll){
    const option=document.createElement("option");
    option.value="all";
    option.textContent="All properties";
    select.appendChild(option);
  }

  properties.forEach(property=>{
    const option=document.createElement("option");
    option.value=property.id;
    option.textContent=property.name;
    select.appendChild(option);
  });

  select.value=state.property;
}

// DESKTOP RENT COLLECTION ACTION TABLE
function renderDesktopRent(){
  const items=filtered(state.finance.rentActions);

  $("#desktopRentActions").innerHTML=items.length
    ?items.map(item=>`
      <tr class="border-t border-[#E0E3E8]">
        <td class="px-4 py-3 text-[#27303D]">${escapeHTML(item.title)}</td>
        <td class="px-4 py-3 text-right">
          <button type="button" data-kind="rent-action" data-id="${escapeHTML(item.id)}" class="text-[#245B90] hover:underline">${escapeHTML(item.description)}</button>
        </td>
      </tr>
    `).join("")
    :`<tr><td colspan="2" class="px-4 py-5 text-center text-gray-500">No actions found.</td></tr>`;
}

// DESKTOP DEPOSITS ACTION TABLE
function renderDesktopDeposits(){
  const items=filtered(state.finance.depositRows);

  $("#desktopDepositRows").innerHTML=items.length
    ?items.map(item=>`
      <tr class="border-t border-[#E0E3E8]">
        <td class="px-4 py-3 text-[#27303D]">${escapeHTML(item.title)}</td>
        <td class="px-4 py-3 text-right">
          <button type="button" data-kind="deposit-action" data-id="${escapeHTML(item.id)}" class="text-[#245B90] hover:underline">${escapeHTML(item.description)}</button>
        </td>
      </tr>
    `).join("")
    :`<tr><td colspan="2" class="px-4 py-5 text-center text-gray-500">No actions found.</td></tr>`;
}

// MOBILE RENT COLLECTION TRANSACTIONS
function renderMobileRent(){
  const items=filtered(state.finance.rentCollections);

  $("#mobileRentRows").innerHTML=items.length
    ?items.map(item=>`
      <tr class="border-b border-[#BEBEBE]">
        <td class="px-1 py-3">${escapeHTML(formatDate(item.date))}</td>
        <td class="px-1 py-3 whitespace-nowrap">${escapeHTML(money(item.amount))}</td>
        <td class="px-1 py-3">${escapeHTML(item.status)}</td>
        <td class="px-1 py-2 text-center">
          <button type="button" data-kind="rent" data-id="${escapeHTML(item.id)}" class="w-full rounded-full bg-[#BDBDBD] px-1 py-3 text-[11px] font-medium text-black hover:bg-[#A8A8A8] min-[390px]:text-xs sm:text-sm">View Details</button>
        </td>
      </tr>
    `).join("")
    :`<tr><td colspan="4" class="py-6 text-center text-gray-500">No rent collections found.</td></tr>`;
}

// MOBILE DEPOSIT TRANSACTIONS
function renderMobileDeposits(){
  const items=filtered(state.finance.deposits);

  $("#mobileDepositRows").innerHTML=items.length
    ?items.map(item=>`
      <tr class="border-b border-[#BEBEBE]">
        <td class="px-1 py-3">${escapeHTML(item.name)}</td>
        <td class="px-1 py-3 whitespace-nowrap">${escapeHTML(money(item.amount))}</td>
        <td class="px-1 py-3">${escapeHTML(item.status)}</td>
        <td class="px-1 py-2 text-center">
          <button type="button" data-kind="deposit" data-id="${escapeHTML(item.id)}" class="w-full rounded-full bg-[#BDBDBD] px-1 py-3 text-[11px] font-medium text-black hover:bg-[#A8A8A8] min-[390px]:text-xs sm:text-sm">View Details</button>
        </td>
      </tr>
    `).join("")
    :`<tr><td colspan="4" class="py-6 text-center text-gray-500">No deposits found.</td></tr>`;
}

function activityIcon(name){
  const paths={
    history:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    receipt:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    refund:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2"/>'
  };

  if(name==="avatar"){
    return `<img src="../../assets/icons/profile.svg" alt="" class="h-full w-full rounded-full object-cover">`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.history}</svg>`;
}

// DESKTOP RECENT ACTIVITY
function renderActivity(){
  const items=filtered(state.finance.recentActivity);

  $("#activityList").innerHTML=items.length
    ?items.map(item=>`
      <button type="button" data-kind="activity" data-id="${escapeHTML(item.id)}" class="flex w-full items-center gap-3 rounded-xl border border-[#E0E3E8] bg-[#F7F9FC] px-3 py-3 text-left hover:bg-[#EDF3F8]">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E2E8F0] text-[#737F8D]">${activityIcon(item.icon)}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-[#18212F]">${escapeHTML(item.title)}</span>
          <span class="block truncate text-xs text-[#667085]">${escapeHTML(item.description)}</span>
        </span>
        <span class="text-xl text-[#98A2B3]" aria-hidden="true">›</span>
      </button>
    `).join("")
    :`<p class="py-5 text-center text-sm text-gray-500">No recent activity found.</p>`;
}

function renderAll(){
  renderSummary();
  renderDesktopRent();
  renderDesktopDeposits();
  renderMobileRent();
  renderMobileDeposits();
  renderActivity();
}

function getDetailItem(kind,id){
  const finance=state.finance;

  const collections={
    rent:finance.rentCollections,
    deposit:finance.deposits,
    "rent-action":finance.rentActions,
    "deposit-action":finance.depositRows,
    activity:finance.recentActivity
  };

  return collections[kind]?.find(item=>item.id===id)||null;
}

let previousFocus=null;

function openDetails(kind,id){
  const item=getDetailItem(kind,id);
  if(!item)return;

  previousFocus=document.activeElement;

  const title=item.title||item.name||"Transaction Details";
  $("#detailTitle").textContent=title;
  $("#detailBody").replaceChildren();

  const fields=Object.entries(item).filter(([key])=>
    !["id","propertyId","icon"].includes(key)
  );

  fields.forEach(([key,value])=>{
    const row=document.createElement("div");
    row.className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm";

    const label=document.createElement("span");
    label.className="capitalize text-gray-500";
    label.textContent=key.replace(/([A-Z])/g," $1");

    const text=document.createElement("span");
    text.className="text-right font-medium";
    text.textContent=key==="amount"?money(value):key==="date"?formatDate(value):String(value);

    row.append(label,text);
    $("#detailBody").appendChild(row);
  });

  const modal=$("#detailsModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  $("#closeDetails").focus();
}

function closeDetails(){
  const modal=$("#detailsModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  previousFocus?.focus?.();
}

function exportCSV(){
  if(!state.finance)return;

  const rows=[["Type","ID","Date or Name","Amount (NGN)","Status"]];

  filtered(state.finance.rentCollections).forEach(item=>{
    rows.push(["Rent",item.id,item.date,item.amount,item.status]);
  });

  filtered(state.finance.deposits).forEach(item=>{
    rows.push(["Deposit",item.id,item.name,item.amount,item.status]);
  });

  const csv=rows.map(row=>
    row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(",")
  ).join("\r\n");

  const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");

  link.href=url;
  link.download="renthub-finance.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function bindEvents(){
  $("#propertyFilter")?.addEventListener("change",event=>{
    state.property=event.target.value;
    renderAll();
  });

  $("#desktopSearch")?.addEventListener("input",event=>{
    state.search=event.target.value.trim().toLowerCase();
    renderDesktopRent();
    renderDesktopDeposits();
    renderMobileRent();
    renderMobileDeposits();
    renderActivity();
  });

  $("#exportButton")?.addEventListener("click",exportCSV);

  document.addEventListener("click",event=>{
    const target=event.target.closest("[data-kind][data-id]");
    if(!target||!state.finance)return;
    openDetails(target.dataset.kind,target.dataset.id);
  });

  $("#closeDetails")?.addEventListener("click",closeDetails);

  $("#detailsModal")?.addEventListener("click",event=>{
    if(event.target===event.currentTarget)closeDetails();
  });

  document.addEventListener("keydown",event=>{
    if($("#detailsModal").classList.contains("hidden"))return;

    if(event.key==="Escape")closeDetails();

    if(event.key==="Tab"){
      event.preventDefault();
      $("#closeDetails").focus();
    }
  });

  $("#logoutButton")?.addEventListener("click",()=>{
    localStorage.removeItem("ownerToken");
    // Replace with your actual login page when available.
    window.location.href="../../onboarding/index.html";
  });
}

async function initialize(){
  bindEvents();
  clearNotice();

  try{
    state.finance=await getFinanceData();
    renderProperties();
    renderAll();
  }catch(error){
    console.error("Finance loading error:",error);
    showNotice(error.message,true);
  }
}

document.addEventListener("DOMContentLoaded",initialize);
