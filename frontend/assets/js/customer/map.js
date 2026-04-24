let selectedLat = null;
let selectedLng = null;
let marker = null;
const BOUNDARY_EDGE_TOLERANCE = 0.00015;

const latDisplayEl = document.getElementById('latDisplay');
const lngDisplayEl = document.getElementById('lngDisplay');
const latInputEl = document.getElementById('latInput');
const lngInputEl = document.getElementById('lngInput');
const setPointBtn = document.getElementById('setPointBtn');
const locateMeBtn = document.getElementById('locateMeBtn');
const saveLocationBtn = document.getElementById('saveLocationBtn');
const cancelMapBtn = document.getElementById('cancelMapBtn');

// ──── University of Hyderabad Campus Boundary ────
const UOH_CENTER = [17.4565, 78.3247];
const UOH_ZOOM = 15;

// Campus boundary polygon (approximate perimeter)
const UOH_BOUNDARY = [
  [17.4680, 78.3100],
  [17.4700, 78.3200],
  [17.4690, 78.3320],
  [17.4650, 78.3400],
  [17.4580, 78.3430],
  [17.4480, 78.3420],
  [17.4400, 78.3380],
  [17.4380, 78.3300],
  [17.4390, 78.3200],
  [17.4420, 78.3120],
  [17.4500, 78.3080],
  [17.4600, 78.3070],
];

const map = L.map('map', {
  maxBounds: L.latLngBounds(UOH_BOUNDARY).pad(0.1),
  maxBoundsViscosity: 1.0,
}).setView(UOH_CENTER, UOH_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Draw campus boundary on map
const boundaryPolygon = L.polygon(UOH_BOUNDARY, {
  color: '#2ecc71',
  weight: 3,
  fillColor: '#2ecc71',
  fillOpacity: 0.08,
  dashArray: '8, 6',
}).addTo(map);

boundaryPolygon.bindPopup('<strong>University of Hyderabad Campus</strong><br>Delivery area boundary');
boundaryPolygon.on('click', function (e) {
  selectPoint(e.latlng.lat, e.latlng.lng, 'Location selected');
});

// ──── Helper: check if point is inside boundary ────
function isInsideBoundary(lat, lng) {
  const point = L.latLng(lat, lng);
  if (!boundaryPolygon.getBounds().contains(point)) {
    return false;
  }

  return isPointInPolygon(point, UOH_BOUNDARY)
    || isPointOnPolygonEdge(point, UOH_BOUNDARY, BOUNDARY_EDGE_TOLERANCE);
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  const x = point.lat, y = point.lng;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointOnPolygonEdge(point, polygon, tolerance) {
  const px = point.lat;
  const py = point.lng;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x1 = polygon[j][0];
    const y1 = polygon[j][1];
    const x2 = polygon[i][0];
    const y2 = polygon[i][1];
    const distance = distancePointToSegment(px, py, x1, y1, x2, y2);
    if (distance <= tolerance) {
      return true;
    }
  }

  return false;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const sx = x1 + t * dx;
  const sy = y1 + t * dy;
  return Math.hypot(px - sx, py - sy);
}

// ──── Coords & Marker ────
function updateCoords(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
  const latText = lat.toFixed(6);
  const lngText = lng.toFixed(6);
  latDisplayEl.textContent = latText;
  lngDisplayEl.textContent = lngText;
  if (latInputEl) latInputEl.value = latText;
  if (lngInputEl) lngInputEl.value = lngText;
}

function placeMarker(lat, lng) {
  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    marker.on('dragend', function (e) {
      const pos = e.target.getLatLng();
      if (!isInsideBoundary(pos.lat, pos.lng)) {
        showToast('⚠️ Location must be within University of Hyderabad campus!');
        // Snap back to previous position
        marker.setLatLng([selectedLat, selectedLng]);
        return;
      }
      updateCoords(pos.lat, pos.lng);
      showToast('Location updated');
    });
  }

  updateCoords(lat, lng);
}

function showToast(message) {
  const toast = document.getElementById('mapToast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}

function selectPoint(lat, lng, successMessage) {
  if (!isValidCoordinate(lat, lng)) {
    showToast('⚠️ Enter valid latitude and longitude values');
    return false;
  }

  if (!isInsideBoundary(lat, lng)) {
    showToast('⚠️ Location must be within University of Hyderabad campus!');
    return false;
  }

  placeMarker(lat, lng);
  map.setView([lat, lng], 17);
  if (successMessage) {
    showToast(successMessage);
  }
  return true;
}

function setManualPoint() {
  const lat = Number.parseFloat(latInputEl.value);
  const lng = Number.parseFloat(lngInputEl.value);
  selectPoint(lat, lng, 'Location selected');
}

// ──── Map Click (restricted to boundary) ────
map.on('click', function (e) {
  selectPoint(e.latlng.lat, e.latlng.lng, 'Location selected');
});

// ──── Locate User ────
function locateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser');
    return;
  }

  showToast('Detecting your location...');

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (!isInsideBoundary(lat, lng)) {
        showToast('⚠️ Your location is outside the campus. Please select manually on the map.');
        map.setView(UOH_CENTER, UOH_ZOOM);
        return;
      }

      selectPoint(lat, lng, 'Current location detected');
    },
    function () {
      showToast('Unable to detect location. Click on the map instead.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Start centered on campus (don't auto-locate since user may not be on campus)
map.setView(UOH_CENTER, UOH_ZOOM);

locateMeBtn.addEventListener('click', locateUser);

if (setPointBtn) {
  setPointBtn.addEventListener('click', setManualPoint);
}

[latInputEl, lngInputEl].forEach((input) => {
  if (!input) return;
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      setManualPoint();
    }
  });
});

saveLocationBtn.addEventListener('click', function () {
  if (selectedLat === null || selectedLng === null) {
    showToast('Please select a location on the map first');
    return;
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(
      {
        type: 'MAP_LOCATION_SELECTED',
        latitude: selectedLat,
        longitude: selectedLng,
      },
      '*'
    );
  }

  window.close();
});

cancelMapBtn.addEventListener('click', function () {
  window.close();
});
