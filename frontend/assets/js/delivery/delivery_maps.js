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

function clearMap() {
  markersLayer.clearLayers();
  routePolylines.forEach((pl) => map.removeLayer(pl));
  routePolylines = [];
}

// Dot marker icon with configurable color
function createDotIcon(color = "#e74c3c") {
  return L.divIcon({
    className: "dot-marker",
    html: `<div class="dot-pin" style="background:${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

// Special icon for partner's location
function createPartnerIcon() {
  return L.divIcon({
    className: "dot-marker",
    html: `<div class="partner-pin"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

// ─────────── OSRM Trip API (nearest neighbor optimization) ───────────
async function fetchOSRMTrip(waypoints) {
  // waypoints: array of [lat, lng]
  // OSRM expects lng,lat order
  const coordsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
  const url = `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?overview=full&geometries=geojson&source=first&roundtrip=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.trips && data.trips.length > 0) {
      // GeoJSON coordinates are [lng, lat], convert to [lat, lng] for Leaflet
      const routeCoords = data.trips[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      // Return optimized waypoint order + route coordinates
      const waypointOrder = data.waypoints.map((wp) => wp.waypoint_index);
      return { routeCoords, waypointOrder };
    }
  } catch (err) {
    console.warn("OSRM trip failed, trying route API:", err);
  }

  // Fallback to basic route API
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

async function plotRoute(orders) {
  clearMap();

  if (!orders || orders.length === 0) {
    if (partnerMarker) partnerMarker.addTo(markersLayer);
    document.getElementById("mapStatus").textContent = "No Route Loaded";
    document.getElementById("mapStatus").classList.remove("active-status");
    return;
  }

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

  // Add delivery point markers with color based on status (Task 3)
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

  // Build waypoints for OSRM: partner location (if set) + all delivery points
  const waypoints = [];
  if (partnerLat !== null && partnerLng !== null) {
    waypoints.push([partnerLat, partnerLng]);
  }
  orders.forEach((o) => {
    waypoints.push([parseFloat(o.latitude), parseFloat(o.longitude)]);
  });

  // Fetch optimized route from OSRM Trip API (Task 2)
  if (waypoints.length >= 2) {
    const result = await fetchOSRMTrip(waypoints);
    if (result && result.routeCoords) {
      const polyline = L.polyline(result.routeCoords, {
        color: ROUTE_COLOR,
        weight: 5,
        opacity: 0.85,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);
      routePolylines.push(polyline);
    } else {
      // Ultimate fallback: straight lines
      const polyline = L.polyline(allLatLngs, {
        color: ROUTE_COLOR,
        weight: 4,
        opacity: 0.7,
        dashArray: "8, 6",
      }).addTo(map);
      routePolylines.push(polyline);
    }
  }

  // Fit map to show all points
  if (allLatLngs.length > 0) {
    const bounds = L.latLngBounds(allLatLngs);
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  document.getElementById("mapStatus").textContent = `Route Active: ${orders.length} stops`;
  document.getElementById("mapStatus").classList.add("active-status");
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
    (position) => {
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

// ─────────── API ───────────
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
        ${
          d.status === "out_for_delivery"
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

// ─────────── Mark Delivered (Task 4: persists to DB) ───────────
async function markDeliveryDone(orderId) {
  const delivery = deliveries.find((d) => d.order_id === orderId);
  if (!delivery) return;

  // Disable button to prevent double-click
  const btn = document.querySelector(`button[onclick="markDeliveryDone(${orderId})"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    // Call API to persist the status change (Task 4)
    const res = await fetch(`${API_BASE}/orders/${orderId}/deliver`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!data.success) {
      showNotification("❌ " + (data.message || "Failed to update status."), "error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Mark Done";
      }
      return;
    }

    // Update local state
    delivery.status = "delivered";
    renderDeliveries();
    await plotRoute(deliveries);
    showNotification(`✅ Order #${orderId} marked as delivered!`, "success");
  } catch (err) {
    console.error("Error marking delivery done:", err);
    showNotification("❌ Network error. Could not update status.", "error");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Mark Done";
    }
  }
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

// ─────────── Notifications ───────────
function showNotification(message, type = "success") {
  const colors = {
    success: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
    error: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
    warning: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
    info: "linear-gradient(135deg, #3498db 0%, #2980b9 100%)",
  };

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 350px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  if (!document.querySelector("style[data-notification]")) {
    const style = document.createElement("style");
    style.setAttribute("data-notification", "true");
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(400px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
