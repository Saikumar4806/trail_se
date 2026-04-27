const API_BASE = "http://localhost:5000/api";

// ──── University of Hyderabad defaults ────
const DEFAULT_LAT = 17.4565;
const DEFAULT_LNG = 78.3247;
const DEFAULT_ZOOM = 15;
const ROUTE_ZOOM = 15;

const ROUTE_COLOR = "#3498db";
const DELIVERED_COLOR = "#2ecc71";
const PENDING_COLOR = "#e74c3c";

let map;
let markersLayer;
let routePolylines = [];
let deliveries = [];
let currentFilter = "all";

// Partner's own location
let partnerLat = null;
let partnerLng = null;
let partnerMarker = null;

// ── Demo state ──
let demoInterval = null;
let demoIndex = 0;
let demoRouteCoords = [];
let demoMarker = null;             // moving scooter marker during demo
let demoStopIndices = [];          // indices in demoRouteCoords closest to each pending delivery
let demoDeliveryOrder = [];        // ordered list of pending deliveries for the demo
let demoPolyline = null;           // the live shrinking polyline

// ─────────── Init ───────────
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const normalizedRole =
    user && user.role ? String(user.role).toLowerCase().replace(/ /g, "_") : null;

  if (!user || normalizedRole !== "delivery_partner") {
    alert("Unauthorized access. Please login as a Delivery Partner.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  document.getElementById("welcomeText").textContent = `Delivery Route - ${user.name}`;

  // Set default date to today
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("routeDate").value = today;

  initMap();
  setupEventListeners();
});

// ─────────── Map ───────────
function initMap() {
  map = L.map("map").setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function clearMap(forceClearDemo = false) {
  markersLayer.clearLayers();
  routePolylines.forEach((pl) => map.removeLayer(pl));
  routePolylines = [];
  // Only clear demo marker/polyline on full reset (not during active demo)
  if (forceClearDemo || !demoInterval) {
    if (demoPolyline) { map.removeLayer(demoPolyline); demoPolyline = null; }
    if (demoMarker)   { map.removeLayer(demoMarker);   demoMarker = null; }
  }
}

// ─────────── Marker icons ───────────
function createDotIcon(color = "#e74c3c") {
  return L.divIcon({
    className: "dot-marker",
    html: `<div class="dot-pin" style="background:${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

function createPartnerIcon() {
  return L.divIcon({
    className: "dot-marker",
    html: `<div class="partner-pin"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

function createScooterIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="delivery-partner-marker">🛵</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

// ─────────── OSRM Trip API ───────────
async function fetchOSRMTrip(waypoints) {
  const coordsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
  const url = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?overview=full&geometries=geojson&source=first&roundtrip=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.trips && data.trips.length > 0) {
      const routeCoords = data.trips[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      const waypointOrder = data.waypoints.map((wp) => wp.waypoint_index);
      return { routeCoords, waypointOrder };
    }
  } catch (err) {
    console.warn("OSRM trip failed, trying route API:", err);
  }
  return await fetchOSRMRouteFallback(waypoints);
}

async function fetchOSRMRouteFallback(waypoints) {
  const coordsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const routeCoords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      return { routeCoords, waypointOrder: null };
    }
  } catch (err) {
    console.warn("OSRM routing failed completely:", err);
  }
  return null;
}

// ─────────── Plot Route ───────────
// Task 1: only route through out_for_delivery orders; delivered ones still shown green but not in path
async function plotRoute(orders) {
  clearMap();
  stopDemo();

  const allLatLngs = [];

  // Add partner starting point marker if set
  if (partnerLat !== null && partnerLng !== null) {
    const pm = L.marker([partnerLat, partnerLng], {
      icon: createPartnerIcon(),
      zIndexOffset: 1000,
    }).addTo(markersLayer);
    pm.bindPopup(`<div class="route-popup"><strong>📍 Your Location</strong><br>Starting point</div>`);
    partnerMarker = pm;
    allLatLngs.push([partnerLat, partnerLng]);
  }

  if (!orders || orders.length === 0) {
    if (partnerMarker) partnerMarker.addTo(markersLayer);
    document.getElementById("mapStatus").textContent = "No Route Loaded";
    document.getElementById("mapStatus").classList.remove("active-status");
    hideDemoControls();
    return;
  }

  // Add ALL delivery markers (both pending and delivered) for visibility
  orders.forEach((order, index) => {
    const lat = parseFloat(order.latitude);
    const lng = parseFloat(order.longitude);
    allLatLngs.push([lat, lng]);

    const isDelivered = order.status === "delivered";
    const markerColor = isDelivered ? DELIVERED_COLOR : PENDING_COLOR;

    const marker = L.marker([lat, lng], {
      icon: createDotIcon(markerColor),
    }).addTo(markersLayer);

    marker.bindPopup(`
      <div class="route-popup">
        <strong>Stop #${index + 1}</strong><br>
        <b>Order:</b> #${order.order_id}<br>
        <b>Customer:</b> ${order.customer_name}<br>
        <b>Address:</b> ${order.street}, ${order.area}<br>
        <b>Amount:</b> ₹${parseFloat(order.total_amount).toFixed(2)}<br>
        <b>Status:</b> ${isDelivered ? "✅ Delivered" : "⏳ Pending"}
      </div>
    `);
  });

  // Task 1: OSRM route only for pending (out_for_delivery) stops
  const pendingOrders = orders.filter((o) => o.status === "out_for_delivery");
  const waypoints = [];
  if (partnerLat !== null && partnerLng !== null) {
    waypoints.push([partnerLat, partnerLng]);
  }
  pendingOrders.forEach((o) => {
    waypoints.push([parseFloat(o.latitude), parseFloat(o.longitude)]);
  });

  let routeResult = null;
  if (waypoints.length >= 2) {
    routeResult = await fetchOSRMTrip(waypoints);
    if (routeResult && routeResult.routeCoords) {
      const polyline = L.polyline(routeResult.routeCoords, {
        color: ROUTE_COLOR,
        weight: 5,
        opacity: 0.85,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);
      routePolylines.push(polyline);
      // Store route for demo
      demoRouteCoords = routeResult.routeCoords;
      demoDeliveryOrder = pendingOrders;
      computeStopIndices();
    } else {
      // Straight-line fallback
      const polyline = L.polyline(waypoints, {
        color: ROUTE_COLOR,
        weight: 4,
        opacity: 0.7,
        dashArray: "8, 6",
      }).addTo(map);
      routePolylines.push(polyline);
      demoRouteCoords = waypoints;
      demoDeliveryOrder = pendingOrders;
      computeStopIndices();
    }
  } else {
    demoRouteCoords = [];
    demoDeliveryOrder = [];
    demoStopIndices = [];
  }

  // Fit map to all markers
  if (allLatLngs.length > 0) {
    const bounds = L.latLngBounds(allLatLngs);
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  document.getElementById("mapStatus").textContent = `Route Active: ${pendingOrders.length} pending, ${orders.length - pendingOrders.length} delivered`;
  document.getElementById("mapStatus").classList.add("active-status");

  // Show demo panel if there are pending stops and partner location is set
  if (pendingOrders.length > 0 && partnerLat !== null && demoRouteCoords.length >= 2) {
    showDemoControls();
  } else {
    hideDemoControls();
  }
}

// ─────────── Stop Index Computation ───────────
// For each pending delivery, find the closest point in demoRouteCoords
function computeStopIndices() {
  demoStopIndices = [];
  demoDeliveryOrder.forEach((order) => {
    const lat = parseFloat(order.latitude);
    const lng = parseFloat(order.longitude);
    let closest = 0;
    let minDist = Infinity;
    demoRouteCoords.forEach((coord, i) => {
      const d = Math.hypot(coord[0] - lat, coord[1] - lng);
      if (d < minDist) { minDist = d; closest = i; }
    });
    demoStopIndices.push(closest);
  });
}

// ─────────── Demo UI Helpers ───────────
function showDemoControls() {
  document.getElementById("demoControls").style.display = "flex";
  document.getElementById("demoBtn").disabled = false;
}

function hideDemoControls() {
  document.getElementById("demoControls").style.display = "none";
}

// ─────────── Demo Animation ───────────
// Task 2 & 3 & 4: Demo button, slowed animation (1200ms), stops at each delivery, Mark Done updates DB

function setupDemoButton() {
  const demoBtn = document.getElementById("demoBtn");
  demoBtn.addEventListener("click", () => {
    if (demoInterval) {
      stopDemo();
    } else {
      startDemo();
    }
  });
}

function syncLocationToServer(lat, lng) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.id) {
      fetch(`${API_BASE}/delivery/set-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: user.id, lat: lat, lng: lng }),
      }).catch(() => {});
    }
  } catch (err) { /* ignore silently */ }
}

function startDemo() {
  if (demoRouteCoords.length < 2) return;

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "⏹️ Stop Demo";
  demoBtn.classList.add("stop");

  document.getElementById("progressContainer").style.display = "block";

  // Place scooter marker at start
  if (demoMarker) map.removeLayer(demoMarker);
  demoMarker = L.marker(demoRouteCoords[0], {
    icon: createScooterIcon(),
    zIndexOffset: 2000,
  }).addTo(map);
  demoMarker.bindPopup(`<div class="route-popup"><strong>🛵 You (Demo)</strong></div>`);

  // Draw a separate demo polyline (shrinks as scooter moves)
  if (demoPolyline) map.removeLayer(demoPolyline);
  demoPolyline = L.polyline(demoRouteCoords, {
    color: "#667eea",
    weight: 5,
    opacity: 0.85,
    dashArray: null,
  }).addTo(map);

  // Sync initial position immediately so customer map picks it up
  syncLocationToServer(demoRouteCoords[0][0], demoRouteCoords[0][1]);

  demoIndex = 0;
  const totalSteps = demoRouteCoords.length;
  const stepSize = Math.max(1, Math.floor(totalSteps / 80));

  demoInterval = setInterval(async () => {
    if (demoIndex >= totalSteps) {
      finishDemo();
      return;
    }

    const pos = demoRouteCoords[demoIndex];
    demoMarker.setLatLng(pos);

    // Shrink demo polyline
    const remaining = demoRouteCoords.slice(demoIndex);
    if (demoPolyline) demoPolyline.setLatLngs(remaining);

    // Update progress bar
    const progress = Math.round((demoIndex / (totalSteps - 1)) * 100);
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${progress}%`;

    // Pan map to follow scooter
    map.panTo(pos, { animate: true, duration: 0.4 });

    // Check if we've reached a delivery stop
    for (let s = 0; s < demoStopIndices.length; s++) {
      if (Math.abs(demoIndex - demoStopIndices[s]) <= stepSize) {
        const order = demoDeliveryOrder[s];
        if (order && order.status === "out_for_delivery") {
          clearInterval(demoInterval);
          demoInterval = null;
          // Sync position at the stop so customer sees partner arrived
          syncLocationToServer(pos[0], pos[1]);
          promptMarkDone(order, s);
          return;
        }
      }
    }

    demoIndex += stepSize;

    // Sync live location to backend on every tick for real-time customer tracking
    syncLocationToServer(pos[0], pos[1]);
  }, 1200);
}

async function promptMarkDone(order, stopIdx) {
  showNotification(`📍 Reached Stop: ${order.customer_name}. Click "Mark Done" in the table below.`, "info");
  // Re-enable the table mark done button visually by scrolling to it
  const btn = document.querySelector(`button[onclick="markDeliveryDone(${order.order_id})"]`);
  if (btn) {
    btn.style.animation = "pulse-btn 1s ease 3";
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // No polling needed; when the user clicks 'Mark Done', markDeliveryDone() 
  // will be called, which handles route recalculation and demo resumption.
}

function startDemoFrom(fromIndex) {
  if (demoRouteCoords.length < 2) return;
  demoIndex = fromIndex;

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "⏹️ Stop Demo";
  demoBtn.classList.add("stop");

  document.getElementById("progressContainer").style.display = "block";

  // Re-create scooter marker if it was cleared (e.g. by plotRoute -> clearMap)
  if (!demoMarker) {
    demoMarker = L.marker(demoRouteCoords[fromIndex], {
      icon: createScooterIcon(),
      zIndexOffset: 2000,
    }).addTo(map);
    demoMarker.bindPopup(`<div class="route-popup"><strong>🛵 You (Demo)</strong></div>`);
  }

  // Re-create demo polyline if it was cleared
  if (!demoPolyline) {
    demoPolyline = L.polyline(demoRouteCoords.slice(fromIndex), {
      color: "#667eea",
      weight: 5,
      opacity: 0.85,
      dashArray: null,
    }).addTo(map);
  }

  const totalSteps = demoRouteCoords.length;
  const stepSize = Math.max(1, Math.floor(totalSteps / 80));

  demoInterval = setInterval(async () => {
    if (demoIndex >= totalSteps) {
      finishDemo();
      return;
    }

    const pos = demoRouteCoords[demoIndex];
    demoMarker.setLatLng(pos);

    const remaining = demoRouteCoords.slice(demoIndex);
    if (demoPolyline) demoPolyline.setLatLngs(remaining);

    const progress = Math.round((demoIndex / (totalSteps - 1)) * 100);
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${progress}%`;

    map.panTo(pos, { animate: true, duration: 0.4 });

    for (let s = 0; s < demoStopIndices.length; s++) {
      if (Math.abs(demoIndex - demoStopIndices[s]) <= stepSize) {
        const order = demoDeliveryOrder[s];
        if (order && order.status === "out_for_delivery") {
          clearInterval(demoInterval);
          demoInterval = null;
          promptMarkDone(order, s);
          return;
        }
      }
    }

    demoIndex += stepSize;

    // Sync live location to backend on every tick for real-time customer tracking
    syncLocationToServer(pos[0], pos[1]);
  }, 1200);
}

function finishDemo() {
  stopDemo();

  // Snap scooter to last point
  if (demoMarker && demoRouteCoords.length > 0) {
    demoMarker.setLatLng(demoRouteCoords[demoRouteCoords.length - 1]);
  }
  if (demoPolyline) demoPolyline.setLatLngs([]);

  document.getElementById("progressBar").style.width = "100%";
  document.getElementById("progressText").textContent = "100%";

  showNotification("✅ Demo complete! All stops visited.", "success");

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "🔄 Replay Demo";
  demoBtn.classList.remove("stop");

  demoBtn.addEventListener("click", replayDemo, { once: true });
}

function stopDemo() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "🚀 Start Demo";
  demoBtn.classList.remove("stop");
}

// Task 4: Replay resets all delivered orders back to out_for_delivery in DB
async function replayDemo() {
  const user = JSON.parse(localStorage.getItem("user"));
  const date = document.getElementById("routeDate").value;
  const slot = document.getElementById("routeSlot").value;

  // Reset all delivered orders in current route back to out_for_delivery
  const deliveredOrders = deliveries.filter((d) => d.status === "delivered");
  for (const order of deliveredOrders) {
    try {
      await fetch(`${API_BASE}/orders/${order.order_id}/reset-for-demo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      order.status = "out_for_delivery";
    } catch (err) {
      console.warn("Could not reset order:", order.order_id, err);
    }
  }

  // Rebuild demo state
  demoDeliveryOrder = deliveries.filter((d) => d.status === "out_for_delivery");
  computeStopIndices();

  // Reset progress UI
  document.getElementById("progressBar").style.width = "0%";
  document.getElementById("progressText").textContent = "0%";

  // Force-clear any leftover demo markers before re-plotting
  clearMap(true);

  renderDeliveries();
  await plotRoute(deliveries);
  showNotification("🔄 Demo reset. Orders restored to out-for-delivery.", "info");
}

// ─────────── Set My Location ───────────
function setMyLocation() {
  const btn = document.getElementById("setLocationBtn");

  if (!navigator.geolocation) {
    showNotification("⚠️ Geolocation is not supported by your browser.", "warning");
    return;
  }

  btn.disabled = true;
  btn.textContent = "📡 Detecting...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      partnerLat = position.coords.latitude;
      partnerLng = position.coords.longitude;

      if (partnerMarker) {
        markersLayer.removeLayer(partnerMarker);
      }
      partnerMarker = L.marker([partnerLat, partnerLng], {
        icon: createPartnerIcon(),
        zIndexOffset: 1000,
      }).addTo(markersLayer);
      partnerMarker.bindPopup(`<div class="route-popup"><strong>📍 Your Location</strong><br>Starting point</div>`);

      map.setView([partnerLat, partnerLng], ROUTE_ZOOM);

      // Persist location to DB so customers can see it on the tracking demo
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        await fetch(`${API_BASE}/delivery/set-location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partner_id: user.id, lat: partnerLat, lng: partnerLng }),
        });
      } catch (err) {
        console.warn("Could not save location to server:", err);
      }

      showNotification("✅ Location set! Now click 'Load My Route'.", "success");

      btn.disabled = false;
      btn.textContent = "📡 Location Set ✓";
    },
    () => {
      showNotification("❌ Unable to detect location. Please allow location access.", "error");
      btn.disabled = false;
      btn.textContent = "📡 Set My Location";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ─────────── Load Route API ───────────
async function loadMyRoute() {
  const user = JSON.parse(localStorage.getItem("user"));
  const date = document.getElementById("routeDate").value;
  const slot = document.getElementById("routeSlot").value;

  if (!date) {
    showNotification("⚠️ Please select a date first.", "warning");
    return;
  }

  const loadBtn = document.getElementById("loadRouteBtn");
  loadBtn.disabled = true;
  loadBtn.textContent = "⏳ Loading...";

  try {
    const res = await fetch(
      `${API_BASE}/delivery/my-route?partner_id=${user.id}&date=${date}`
    );
    const data = await res.json();

    if (!data.success) {
      showNotification("❌ " + (data.message || "Failed to load route."), "error");
      deliveries = [];
    } else {
      deliveries = (data.data || []).filter((o) => o.delivery_slot === slot);

      if (deliveries.length === 0) {
        showNotification("ℹ️ No deliveries assigned for this date & slot.", "info");
      } else {
        showNotification(`✅ Loaded ${deliveries.length} deliveries!`, "success");
      }
    }

    await plotRoute(deliveries);
    renderDeliveries();
    setupDemoButton();
  } catch (err) {
    console.error("Error loading route:", err);
    showNotification("❌ Network error. Is the server running?", "error");
    deliveries = [];
    await plotRoute([]);
    renderDeliveries();
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = "📍 Load My Route";
  }
}

// ─────────── Table ───────────
function renderDeliveries() {
  const tableBody = document.getElementById("deliveriesTableBody");

  const filtered =
    currentFilter === "all"
      ? deliveries
      : deliveries.filter((d) => d.status === currentFilter);

  if (filtered.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8" class="no-data">No deliveries found</td></tr>';
    updateSummary();
    return;
  }

  tableBody.innerHTML = filtered
    .map(
      (d, index) => `
    <tr class="delivery-row ${d.status}">
      <td><span class="stop-number">${index + 1}</span></td>
      <td class="order-id">#${d.order_id}</td>
      <td class="customer-name">${d.customer_name}</td>
      <td class="address">${d.street}, ${d.area}</td>
      <td><span class="slot">${d.delivery_slot === "morning" ? "🌅 Morning" : "🌆 Evening"}</span></td>
      <td class="amount">₹${parseFloat(d.total_amount).toFixed(2)}</td>
      <td>
        <span class="status-badge ${d.status}">
          ${d.status === "out_for_delivery" ? "⏳ Pending" : "✅ Delivered"}
        </span>
      </td>
      <td class="action-cell">
        ${d.status === "out_for_delivery"
          ? `<button class="done-btn" onclick="markDeliveryDone(${d.order_id})">Mark Done</button>`
          : '<span class="done-label">Done</span>'
        }
      </td>
    </tr>
  `
    )
    .join("");

  updateSummary();
}

// ─────────── Mark Delivered ───────────
// Task 4: persists to DB; customer tracking will reflect this without auto-update
async function markDeliveryDone(orderId) {
  const delivery = deliveries.find((d) => d.order_id === orderId);
  if (!delivery) return;

  const btn = document.querySelector(`button[onclick="markDeliveryDone(${orderId})"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/deliver`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!data.success) {
      showNotification("❌ " + (data.message || "Failed to update status."), "error");
      if (btn) { btn.disabled = false; btn.textContent = "Mark Done"; }
      return;
    }

    // Update local state
    delivery.status = "delivered";
    // Also update demoDeliveryOrder so demo doesn't re-stop at this delivery
    const demoEntry = demoDeliveryOrder.find((d) => d.order_id === orderId);
    if (demoEntry) demoEntry.status = "delivered";

    renderDeliveries();

    // Update partner location to the current scooter position before replotting
    if (demoMarker) {
      const currentPos = demoMarker.getLatLng();
      partnerLat = currentPos.lat;
      partnerLng = currentPos.lng;
    }

    // Always replot to generate a new route excluding the delivered order
    await plotRoute(deliveries);

    // If there is still a route left, resume demo from the beginning of the new route
    if (demoRouteCoords.length >= 2) {
      startDemoFrom(0);
    }

    showNotification(`✅ Order #${orderId} marked as delivered!`, "success");
  } catch (err) {
    console.error("Error marking delivery done:", err);
    showNotification("❌ Network error. Could not update status.", "error");
    if (btn) { btn.disabled = false; btn.textContent = "Mark Done"; }
  }
}

// Lightweight: redraw only the delivery dot markers without clearing demo state
function refreshDeliveryMarkers() {
  markersLayer.clearLayers();

  // Re-add partner marker
  if (partnerLat !== null && partnerMarker) {
    partnerMarker = L.marker([partnerLat, partnerLng], {
      icon: createPartnerIcon(),
      zIndexOffset: 1000,
    }).addTo(markersLayer);
    partnerMarker.bindPopup(`<div class="route-popup"><strong>📍 Your Location</strong><br>Starting point</div>`);
  }

  // Re-add all delivery dots with updated colors
  deliveries.forEach((order, index) => {
    const lat = parseFloat(order.latitude);
    const lng = parseFloat(order.longitude);
    const isDelivered = order.status === "delivered";
    const marker = L.marker([lat, lng], {
      icon: createDotIcon(isDelivered ? DELIVERED_COLOR : PENDING_COLOR),
    }).addTo(markersLayer);
    marker.bindPopup(`
      <div class="route-popup">
        <strong>Stop #${index + 1}</strong><br>
        <b>Order:</b> #${order.order_id}<br>
        <b>Customer:</b> ${order.customer_name}<br>
        <b>Status:</b> ${isDelivered ? "✅ Delivered" : "⏳ Pending"}
      </div>
    `);
  });
}

function updateSummary() {
  const total = deliveries.length;
  const completed = deliveries.filter((d) => d.status === "delivered").length;
  const pending = deliveries.filter((d) => d.status === "out_for_delivery").length;
  const amount = deliveries.reduce((s, d) => s + parseFloat(d.total_amount || 0), 0);

  document.getElementById("totalCount").textContent = total;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("totalAmount").textContent = `₹${amount.toFixed(2)}`;
}

// ─────────── Events ───────────
function setupEventListeners() {
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "../delivery/dashboard.html";
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  document.getElementById("setLocationBtn").addEventListener("click", setMyLocation);
  document.getElementById("loadRouteBtn").addEventListener("click", loadMyRoute);

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      renderDeliveries();
    });
  });
}

// ─────────── Notifications (Task 6: left side) ───────────
function showNotification(message, type = "success") {
  const colors = {
    success: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
    error:   "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
    warning: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
    info:    "linear-gradient(135deg, #3498db 0%, #2980b9 100%)",
  };

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    left: 20px;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    font-weight: 600;
    z-index: 10000;
    animation: slideInLeft 0.3s ease;
    max-width: 350px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  if (!document.querySelector("style[data-notification]")) {
    const style = document.createElement("style");
    style.setAttribute("data-notification", "true");
    style.textContent = `
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-400px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    notification.style.animation = "slideInLeft 0.3s ease reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
