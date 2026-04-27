const API_BASE = "http://localhost:5000/api";

// ──── UoH campus center (demo starting point for delivery partner) ────
const UOH_CENTER = [17.4565, 78.3247];
const DEFAULT_ZOOM = 15;

let map;
let partnerMarker = null;
let customerMarker = null;
let routePolyline = null;
let routeCoords = [];
let demoInterval = null;
let demoIndex = 0;
let orderData = null;

// ─────────── Init ───────────
document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const normalizedRole =
    user && user.role ? String(user.role).toLowerCase().replace(/ /g, "_") : null;

  if (!user || normalizedRole !== "customer") {
    alert("Unauthorized access. Please login as a Customer.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  document.getElementById("welcomeText").textContent = `Track Delivery - ${user.name}`;

  // Handle logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  // Get subscription_id from URL
  const params = new URLSearchParams(window.location.search);
  const subscriptionId = params.get("subscription_id");

  if (!subscriptionId) {
    setStatus("No subscription ID", "");
    return;
  }

  initMap();
  await loadTrackingData(subscriptionId);
  setupDemoButton();
});

// ─────────── Map ───────────
function initMap() {
  map = L.map("map").setView(UOH_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
}

// ─────────── Custom Markers ───────────
function createPartnerIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="delivery-partner-marker">🛵</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

function createCustomerIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="customer-marker"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

// ─────────── Load Tracking Data ───────────
async function loadTrackingData(subscriptionId) {
  try {
    const res = await fetch(`${API_BASE}/orders/track?subscription_id=${subscriptionId}`);
    const data = await res.json();

    if (!data.success || !data.data) {
      setStatus("No order found", "");
      document.getElementById("infoDetails").innerHTML =
        '<p style="color:#999;text-align:center;padding:20px;">No active order found for this subscription.</p>';
      return;
    }

    orderData = data.data;

    // Update info panel
    document.getElementById("orderIdDisplay").textContent = `#${orderData.order_id}`;
    document.getElementById("addressDisplay").textContent = `${orderData.street}, ${orderData.area}`;
    document.getElementById("amountDisplay").textContent = `₹${parseFloat(orderData.total_amount).toFixed(2)}`;
    document.getElementById("slotDisplay").textContent =
      orderData.delivery_slot === "morning" ? "🌅 Morning" : "🌆 Evening";

    const isDelivered = orderData.status === "delivered";
    setStatus(isDelivered ? "Delivered" : "Out for Delivery", isDelivered ? "delivered" : "in-transit");

    // Place customer marker
    const custLat = parseFloat(orderData.customer_lat);
    const custLng = parseFloat(orderData.customer_lng);

    customerMarker = L.marker([custLat, custLng], {
      icon: createCustomerIcon(),
    }).addTo(map);
    customerMarker.bindPopup(
      `<div class="route-popup"><strong>📍 Delivery Address</strong><br>${orderData.street}, ${orderData.area}</div>`
    );

    // ── Use delivery partner's saved location, or show a status message ──
    const partnerLat = orderData.partner_lat != null ? parseFloat(orderData.partner_lat) : null;
    const partnerLng = orderData.partner_lng != null ? parseFloat(orderData.partner_lng) : null;

    if (partnerLat === null || partnerLng === null || isNaN(partnerLat) || isNaN(partnerLng)) {
      // Partner hasn't set their location yet — show a friendly message
      const pendingMessages = [
        "🚀 Delivery is about to start — hang tight!",
        "🛵 Your rider is getting ready to head out.",
        "⏳ Riders are currently busy with other deliveries.",
        "📦 Delivery preparation is in progress.",
        "🗺️ Your delivery partner is being assigned.",
      ];
      const msg = pendingMessages[Math.floor(Math.random() * pendingMessages.length)];

      document.getElementById("infoDetails").innerHTML += `
        <div class="info-row" style="margin-top:12px;">
          <span class="info-value" style="color:#f39c12;font-style:italic;">${msg}</span>
        </div>`;

      // Keep demo button disabled and show placeholder on map
      map.setView([custLat, custLng], DEFAULT_ZOOM);
      setStatus("Awaiting Partner", "in-transit");
      return;
    }

    // Place partner at their saved location
    partnerMarker = L.marker([partnerLat, partnerLng], {
      icon: createPartnerIcon(),
      zIndexOffset: 1000,
    }).addTo(map);
    partnerMarker.bindPopup(
      `<div class="route-popup"><strong>🛵 Delivery Partner</strong><br>En route to your address</div>`
    );

    // Fetch OSRM route from partner's saved location → customer
    await fetchAndDrawRoute([partnerLat, partnerLng], [custLat, custLng]);

    // Fit map to show both markers
    const bounds = L.latLngBounds([
      [partnerLat, partnerLng],
      [custLat, custLng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });

    // Enable demo button
    document.getElementById("demoBtn").disabled = false;
  } catch (err) {
    console.error("Error loading tracking data:", err);
    setStatus("Error", "");
  }
}

// ─────────── Route Drawing ───────────
async function fetchAndDrawRoute(start, end) {
  // OSRM expects lng,lat
  const coordsStr = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      routeCoords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);

      routePolyline = L.polyline(routeCoords, {
        color: "#667eea",
        weight: 5,
        opacity: 0.8,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      return;
    }
  } catch (err) {
    console.warn("OSRM route failed:", err);
  }

  // Fallback: straight line
  routeCoords = [start, end];
  routePolyline = L.polyline(routeCoords, {
    color: "#667eea",
    weight: 4,
    opacity: 0.7,
    dashArray: "8, 6",
  }).addTo(map);
}

// ─────────── Demo Animation ───────────
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

function startDemo() {
  if (routeCoords.length < 2) return;

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "⏹️ Stop Demo";
  demoBtn.classList.add("stop");

  const progressContainer = document.getElementById("progressContainer");
  progressContainer.style.display = "block";

  setStatus("Demo Active", "demo-active");

  demoIndex = 0;
  const totalSteps = routeCoords.length;

  // Task 3: Slowed — move every 1200ms with smaller step size
  const stepSize = Math.max(1, Math.floor(totalSteps / 80));

  demoInterval = setInterval(() => {
    if (demoIndex >= totalSteps) {
      // Arrived at destination
      completeDemo();
      return;
    }

    const pos = routeCoords[demoIndex];
    partnerMarker.setLatLng(pos);

    // Update progress
    const progress = Math.round((demoIndex / (totalSteps - 1)) * 100);
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${progress}%`;

    // Trim the route polyline to show remaining path
    const remaining = routeCoords.slice(demoIndex);
    if (routePolyline) {
      routePolyline.setLatLngs(remaining);
    }

    // Keep map centered on partner
    map.panTo(pos, { animate: true, duration: 0.4 });

    demoIndex += stepSize;
  }, 1200); // Slowed from 500ms
}

function completeDemo() {
  stopDemo();

  // Snap partner to final position
  const finalPos = routeCoords[routeCoords.length - 1];
  partnerMarker.setLatLng(finalPos);

  // Clear remaining route
  if (routePolyline) {
    routePolyline.setLatLngs([]);
  }

  // Update progress to 100%
  document.getElementById("progressBar").style.width = "100%";
  document.getElementById("progressText").textContent = "100%";

  setStatus("Delivered", "delivered");

  // Show completion notification
  showNotification("✅ Delivery completed! The partner has arrived.", "success");

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "🔄 Replay Demo";
  demoBtn.classList.remove("stop");

  // Allow replay
  demoBtn.addEventListener(
    "click",
    () => {
      resetDemo();
    },
    { once: true }
  );
}

function stopDemo() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  const demoBtn = document.getElementById("demoBtn");
  demoBtn.textContent = "🚀 Start Demo";
  demoBtn.classList.remove("stop");

  setStatus(orderData?.status === "delivered" ? "Delivered" : "Out for Delivery",
    orderData?.status === "delivered" ? "delivered" : "in-transit");
}

function resetDemo() {
  // Reset partner to start position
  if (routeCoords.length > 0) {
    partnerMarker.setLatLng(routeCoords[0]);

    // Redraw full route
    if (routePolyline) {
      routePolyline.setLatLngs(routeCoords);
    }

    // Reset progress
    document.getElementById("progressBar").style.width = "0%";
    document.getElementById("progressText").textContent = "0%";

    // Fit bounds
    const bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding: [60, 60] });
  }

  demoIndex = 0;
  startDemo();
}

// ─────────── Helpers ───────────
function setStatus(text, className) {
  const statusEl = document.getElementById("trackingStatus");
  statusEl.textContent = text;
  statusEl.className = "tracking-status";
  if (className) statusEl.classList.add(className);
}

// Task 6: Notifications on left side
function showNotification(message, type = "success") {
  const colors = {
    success: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
    error:   "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
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
  }, 3500);
}
