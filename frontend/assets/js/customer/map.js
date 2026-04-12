let selectedLat = null;
let selectedLng = null;
let marker = null;

const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 16;

const map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	maxZoom: 19,
}).addTo(map);

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
	setTimeout(() => toast.classList.remove('show'), 2200);
}

map.on('click', function (e) {
	placeMarker(e.latlng.lat, e.latlng.lng);
	showToast('Location selected');
});

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
			map.setView([lat, lng], LOCATED_ZOOM);
			placeMarker(lat, lng);
			showToast('Current location detected');
		},
		function () {
			showToast('Unable to detect location. Click on the map instead.');
		},
		{ enableHighAccuracy: true, timeout: 10000 }
	);
}

locateUser();

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
