let selectedLat = null;
let selectedLng = null;
let marker = null;

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

// ──── Helper: check if point is inside boundary ────
function isInsideBoundary(lat, lng) {
  const point = L.latLng(lat, lng);
  return boundaryPolygon.getBounds().contains(point) && isPointInPolygon(point, UOH_BOUNDARY);
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

// ──── Coords & Marker ────
function updateCoords(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
  document.getElementById('latDisplay').textContent = lat.toFixed(6);
  document.getElementById('lngDisplay').textContent = lng.toFixed(6);
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

// ──── Map Click (restricted to boundary) ────
map.on('click', function (e) {
  if (!isInsideBoundary(e.latlng.lat, e.latlng.lng)) {
    showToast('⚠️ Please select a location within University of Hyderabad campus!');
    return;
  }
  placeMarker(e.latlng.lat, e.latlng.lng);
  showToast('Location selected');
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

      map.setView([lat, lng], 17);
      placeMarker(lat, lng);
      showToast('Current location detected');
    },
    function () {
      showToast('Unable to detect location. Click on the map instead.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Start centered on campus (don't auto-locate since user may not be on campus)
map.setView(UOH_CENTER, UOH_ZOOM);

document.getElementById('locateMeBtn').addEventListener('click', locateUser);

document.getElementById('saveLocationBtn').addEventListener('click', function () {
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

document.getElementById('cancelMapBtn').addEventListener('click', function () {
  window.close();
});
