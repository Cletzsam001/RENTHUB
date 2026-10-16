const RENTHUB_EQUIPMENT_API = "https://rentit-5zbv.onrender.com";

async function loadRentHubItems() {
  const response = await fetch(`${RENTHUB_EQUIPMENT_API}/equipment/getall`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Equipment request failed (${response.status}).`);
  }

  const result = await response.json();
  const equipment = Array.isArray(result) ? result : result.equipment;

  if (!Array.isArray(equipment)) {
    throw new Error("The Equipment API did not return an equipment array.");
  }

  return equipment
    .filter((item) =>
      ["published", "approved"].includes(String(item.status || "").toLowerCase()) &&
      item.availability !== false
    )
    .map((item) => [
      String(item.name || item.title || "Unnamed equipment"),
      String(item.category?.name || item.category || "General"),
      String(item.location || "Nigeria"),
      Number(item.pricePerDay ?? item.price ?? 0),
      "📦",
      Array.isArray(item.images) ? item.images[0] || "" : item.image || "",
      Number(item.rentalDeposit || 0),
      String(item._id || item.id || ""),
      String(item.description || "")
    ]);
}

window.RentHubItemsReady = loadRentHubItems().then((items) => {
  window.RentHubItems = items;
  return items;
});

window.RentHubItems = [];
window.getRentHubItemImage = (name) =>
  window.RentHubItems.find(([itemName]) => itemName === name)?.[5] || "";