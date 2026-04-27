const API_BASE = "http://localhost:5000/api";

// ──── UoH campus center (demo starting point for delivery partner) ────
const UOH_CENTER = [17.4565, 78.3247];
const DEFAULT_ZOOM = 15;

let map;
let partnerMarker = null;
let customerMarker = null;
let routePolyline = null;
let routeCoords = [];
let orderData = null;
let trackingInterval = null;

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

  // Poll for updates every 1 second for smooth live tracking sync
  trackingInterval = setInterval(() => {
    loadTrackingData(subscriptionId, true);
  }, 1000);
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
async function loadTrackingData(subscriptionId, isPolling = false) {
  try {
    const res = await fetch(`${API_BASE}/orders/track?subscription_id=${subscriptionId}`);
    const data = await res.json();

    if (!data.success || !data.data) {
      if (!isPolling) {
        setStatus("No order found", "");
        document.getElementById("infoDetails").innerHTML =
          '<p style="color:#999;text-align:center;padding:20px;">No active order found for this subscription.</p>';
      }
      return;
    }

    const previousStatus = orderData ? orderData.status : null;
    orderData = data.data;

    // Update info panel
    document.getElementById("orderIdDisplay").textContent = `#${orderData.order_id}`;
    document.getElementById("addressDisplay").textContent = `${orderData.street}, ${orderData.area}`;
    document.getElementById("amountDisplay").textContent = `₹${parseFloat(orderData.total_amount).toFixed(2)}`;
    document.getElementById("slotDisplay").textContent =
      orderData.delivery_slot === "morning" ? "🌅 Morning" : "🌆 Evening";

    const isDelivered = orderData.status === "delivered";
    setStatus(isDelivered ? "Delivered" : "Out for Delivery", isDelivered ? "delivered" : "in-transit");

    // Check if status just changed to delivered
    if (isPolling && previousStatus === "out_for_delivery" && isDelivered) {
      showNotification("✅ Delivery completed! The partner has arrived.", "success");
      if (trackingInterval) clearInterval(trackingInterval);
      if (routePolyline) {
        routePolyline.setLatLngs([]);
      }
    }

    // Place or update customer marker
    const custLat = parseFloat(orderData.customer_lat);
    const custLng = parseFloat(orderData.customer_lng);

    if (customerMarker) {
      customerMarker.setLatLng([custLat, custLng]);
    } else {
      customerMarker = L.marker([custLat, custLng], {
        icon: createCustomerIcon(),
      }).addTo(map);
      customerMarker.bindPopup(
        `<div class="route-popup"><strong>📍 Delivery Address</strong><br>${orderData.street}, ${orderData.area}</div>`
      );
    }

    // ── Use delivery partner's saved location, or show a status message ──
    const partnerLat = orderData.partner_lat != null ? parseFloat(orderData.partner_lat) : null;
    const partnerLng = orderData.partner_lng != null ? parseFloat(orderData.partner_lng) : null;

    if (partnerLat === null || partnerLng === null || isNaN(partnerLat) || isNaN(partnerLng)) {
      if (!isPolling) {
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

        map.setView([custLat, custLng], DEFAULT_ZOOM);
        setStatus("Awaiting Partner", "in-transit");
      }
      return;
    }

    // Place or update partner at their saved location
    if (partnerMarker) {
      partnerMarker.setLatLng([partnerLat, partnerLng]);
      // Pan to follow partner during polling if not delivered
      if (isPolling && !isDelivered) {
        map.panTo([partnerLat, partnerLng], { animate: true, duration: 1.0 });
      }
    } else {
      partnerMarker = L.marker([partnerLat, partnerLng], {
        icon: createPartnerIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
      partnerMarker.bindPopup(
        `<div class="route-popup"><strong>🛵 Delivery Partner</strong><br>En route to your address</div>`
      );

      // Only fit bounds on first load
      const bounds = L.latLngBounds([
        [partnerLat, partnerLng],
        [custLat, custLng],
      ]);
      map.fitBounds(bounds, { padding: [60, 60] });
    }

    // Optional: Draw a straight line or OSRM route if not delivered
    if (!isDelivered) {
      // For simplicity during polling, we can draw a simple line, or skip if we want to avoid OSRM rate limits.
      // We will re-fetch route only if it's the initial load.
      if (!isPolling) {
        await fetchAndDrawRoute([partnerLat, partnerLng], [custLat, custLng]);
      } else {
        // Shrink route polyline — show only remaining road ahead
        if (routePolyline && routeCoords.length >= 2) {
          let closestIdx = 0;
          let minDist = Infinity;
          routeCoords.forEach((coord, i) => {
            const d = Math.hypot(coord[0] - partnerLat, coord[1] - partnerLng);
            if (d < minDist) { minDist = d; closestIdx = i; }
          });
          const remaining = routeCoords.slice(closestIdx);
          routePolyline.setLatLngs(remaining);
        }
      }
    }

  } catch (err) {
    console.error("Error loading tracking data:", err);
    if (!isPolling) setStatus("Error", "");
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
