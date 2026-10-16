
"use strict";

const API_BASE_URL="http://localhost:5000/api";
const USE_MOCK_DATA=true;
const MOCK_DATA_URL="../data/payout.json";
const $=selector=>document.querySelector(selector);

const state={
  data:null,
  search:"",
  expanded:{recent:false,upcoming:false}
};

const moneyFormatter=new Intl.NumberFormat("en-NG",{
  style:"currency",
  currency:"NGN",
  maximumFractionDigits:0
});

function money(value){
  return moneyFormatter.format(Number(value)||0);
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
  return Number.isNaN(date.getTime())
    ?String(value)
    :date.toLocaleDateString("en-US",{
      month:"short",
      day:"numeric",
      year:"numeric"
    });
}

function showNotice(message,isError=false){
  const notice=$("#notice");
  notice.textContent=message;
  notice.className=`mb-4 rounded-lg px-3 py-2 text-sm ${isError?"bg-red-50 text-red-700":"bg-blue-50 text-[#224F78]"}`;
}

function statusClass(status){
  const value=String(status).toLowerCase();

  if(["completed","confirmed"].includes(value)){
    return "bg-[#E6F8ED] text-[#008A50]";
  }

  if(value==="cancelled"){
    return "bg-[#FCE8E8] text-[#D62F27]";
  }

  if(value==="pending"){
    return "bg-[#FFF0C8] text-[#D88700]";
  }

  return "bg-gray-100 text-gray-600";
}

// Backend placeholder. Confirm routes with the backend developer.
async function apiRequest(endpoint,options={}){
  const token=localStorage.getItem("ownerToken");
  const headers={
    Accept:"application/json",
    ...options.headers
  };

  if(token)headers.Authorization=`Bearer ${token}`;

  if(options.body&&!(options.body instanceof FormData)){
    headers["Content-Type"]="application/json";
  }

  const response=await fetch(`${API_BASE_URL}${endpoint}`,{
    ...options,
    headers
  });

  if(!response.ok){
    const errorData=await response.json().catch(()=>({}));
    throw new Error(errorData.message||`Request failed (${response.status})`);
  }

  if(response.status===204)return null;
  return response.json();
}

// Placeholder: GET /owner/payouts
async function getPayoutData(){
  let result;

  if(USE_MOCK_DATA){
    const response=await fetch(MOCK_DATA_URL,{cache:"no-store"});
    if(!response.ok){
      throw new Error(`Cannot load payouts.json (${response.status}).`);
    }
    result=await response.json();
  }else{
    result=await apiRequest("/owner/payouts");
  }

  const data=result?.payouts??result;

  if(
    !data?.summary||
    !data?.schedule||
    !Array.isArray(data.transactions)||
    !Array.isArray(data.recentPayouts)||
    !Array.isArray(data.upcomingPayouts)
  ){
    throw new Error("Invalid payouts data. Check payouts.json.");
  }

  return data;
}

function matchesSearch(item){
  if(!state.search)return true;

  return Object.values(item).some(value=>
    String(value??"").toLowerCase().includes(state.search)
  );
}

function filtered(items){
  return items.filter(matchesSearch);
}

function renderSummary(){
  const {summary,schedule}=state.data;

  $("#totalPayouts").textContent=money(summary.totalPayouts);
  $("#pendingPayouts").textContent=money(summary.pendingPayouts);
  $("#nextPayoutDate").textContent=formatDate(summary.nextPayoutDate);

  $("#scheduleFrequency").textContent=schedule.frequency;
  $("#scheduleThreshold").textContent=money(schedule.threshold);
  $("#scheduleFee").textContent=`${schedule.feePercentage}%`;
}

function renderTransactions(){
  const items=filtered(state.data.transactions);

  $("#transactionsBody").innerHTML=items.length
    ?items.map(item=>`
      <tr class="border-t border-[#E0E3E8]">
        <td class="px-4 py-3 font-medium text-[#27303D]">${escapeHTML(item.title)}</td>
        <td class="px-3 py-3 whitespace-nowrap text-[#667085]">${escapeHTML(formatDate(item.date))}</td>
        <td class="px-3 py-3 whitespace-nowrap text-right font-medium">${escapeHTML(money(item.amount))}</td>
        <td class="px-3 py-3">
          <span class="inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusClass(item.status)}">${escapeHTML(item.status)}</span>
        </td>
      </tr>
    `).join("")
    :`<tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">No transactions found.</td></tr>`;
}

function payoutCard(item){
  const image=escapeHTML(item.image);

  return `
    <article class="flex min-w-0 items-center gap-3 rounded-2xl border border-[#F0DFC7] bg-white p-3">
      <img src="${image}" alt="${escapeHTML(item.imageAlt||"Equipment")}" class="h-14 w-14 shrink-0 rounded-lg object-contain" onerror="this.style.visibility='hidden'">
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-medium leading-snug text-[#303030] sm:text-base">${escapeHTML(item.title)}</h3>
        <p class="mt-1 text-xs text-[#667085] sm:text-sm">${escapeHTML(formatDate(item.date))}</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span class="rounded-full px-2 py-1 text-[11px] ${statusClass(item.status)}">${escapeHTML(item.status)}</span>
        <span class="whitespace-nowrap text-sm font-medium">${escapeHTML(money(item.amount))}</span>
      </div>
    </article>
  `;
}

function renderPayoutList(type){
  const isRecent=type==="recent";
  const allItems=isRecent?state.data.recentPayouts:state.data.upcomingPayouts;
  const items=filtered(allItems);
  const visible=state.expanded[type]?items:items.slice(0,2);
  const target=isRecent?"#recentPayoutsList":"#upcomingPayoutsList";

  $(target).innerHTML=visible.length
    ?visible.map(payoutCard).join("")
    :`<p class="py-5 text-center text-sm text-gray-500">No payouts found.</p>`;

  const button=document.querySelector(`[data-view-all="${type}"]`);
  button.textContent=state.expanded[type]?"Show less":"View all";
  button.disabled=items.length<=2;
  button.classList.toggle("opacity-40",items.length<=2);
}

function renderAll(){
  renderSummary();
  renderTransactions();
  renderPayoutList("recent");
  renderPayoutList("upcoming");
}

function exportCSV(){
  if(!state.data)return;

  const rows=[
    ["Transaction","Date","Amount (NGN)","Status"],
    ...filtered(state.data.transactions).map(item=>[
      item.title,
      item.date,
      item.amount,
      item.status
    ])
  ];

  const csv=rows.map(row=>
    row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(",")
  ).join("\r\n");

  const blob=new Blob(["\uFEFF",csv],{
    type:"text/csv;charset=utf-8;"
  });

  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");

  link.href=url;
  link.download="renthub-payouts.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

let previouslyFocused=null;

function openManualPayout(){
  previouslyFocused=document.activeElement;
  $("#manualPayoutMessage").classList.add("hidden");
  $("#manualPayoutModal").classList.remove("hidden");
  $("#manualPayoutModal").classList.add("flex");
  $("#payoutAmount").focus();
}

function closeManualPayout(){
  $("#manualPayoutModal").classList.add("hidden");
  $("#manualPayoutModal").classList.remove("flex");
  previouslyFocused?.focus?.();
}

function showPayoutMessage(message,isError=false){
  const element=$("#manualPayoutMessage");
  element.textContent=message;
  element.className=`text-sm ${isError?"text-red-700":"text-[#224F78]"}`;
}

async function submitManualPayout(event){
  event.preventDefault();

  const amount=Number($("#payoutAmount").value);
  const submitButton=$("#submitManualPayout");

  if(!Number.isSafeInteger(amount)||amount<=0){
    showPayoutMessage("Enter a valid whole-number payout amount.",true);
    return;
  }

  if(USE_MOCK_DATA){
    showPayoutMessage("Demo mode: payout requests are not submitted. Connect the backend to enable this feature.");
    return;
  }

  try{
    submitButton.disabled=true;
    submitButton.textContent="Submitting...";

    // Placeholder: POST /owner/payouts/manual
    const result=await apiRequest("/owner/payouts/manual",{
      method:"POST",
      body:JSON.stringify({amount})
    });

    showPayoutMessage(result?.message||"Payout request submitted for processing.");

    state.data=await getPayoutData();
    renderAll();
    $("#manualPayoutForm").reset();
  }catch(error){
    showPayoutMessage(error.message,true);
  }finally{
    submitButton.disabled=false;
    submitButton.textContent="Request Payout";
  }
}

function bindEvents(){
  $("#searchInput").addEventListener("input",event=>{
    state.search=event.target.value.trim().toLowerCase();

    if(state.data){
      renderTransactions();
      renderPayoutList("recent");
      renderPayoutList("upcoming");
    }
  });

  $("#exportButton").addEventListener("click",exportCSV);
  $("#manualPayoutButton").addEventListener("click",openManualPayout);
  $("#closeManualPayout").addEventListener("click",closeManualPayout);
  $("#manualPayoutForm").addEventListener("submit",submitManualPayout);

  document.querySelectorAll("[data-view-all]").forEach(button=>{
    button.addEventListener("click",()=>{
      const type=button.dataset.viewAll;
      state.expanded[type]=!state.expanded[type];
      renderPayoutList(type);
    });
  });

  $("#manualPayoutModal").addEventListener("click",event=>{
    if(event.target===event.currentTarget)closeManualPayout();
  });

  document.addEventListener("keydown",event=>{
    if($("#manualPayoutModal").classList.contains("hidden"))return;

    if(event.key==="Escape"){
      closeManualPayout();
    }

    if(event.key==="Tab"){
      const controls=[
        $("#closeManualPayout"),
        $("#payoutAmount"),
        $("#submitManualPayout")
      ].filter(element=>!element.disabled);

      const first=controls[0];
      const last=controls[controls.length-1];

      if(event.shiftKey&&document.activeElement===first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey&&document.activeElement===last){
        event.preventDefault();
        first.focus();
      }
    }
  });

  $("#logoutButton").addEventListener("click",()=>{
    localStorage.removeItem("ownerToken");
    // Update this route to match your actual login page.
    window.location.href="../../onboarding/index.html";
  });
}

async function initialize(){
  bindEvents();

  try{
    state.data=await getPayoutData();
    renderAll();
  }catch(error){
    console.error("Payouts loading error:",error);
    showNotice(error.message,true);
  }
}

document.addEventListener("DOMContentLoaded",initialize);
