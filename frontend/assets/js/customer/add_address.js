const ADDRESSES_API_BASE = 'http://localhost:5000/api/addresses';

window.setupAddressModal = function setupAddressModal(state) {
	const addAddressBtn = document.getElementById('addAddressBtn');
	const addressModal = document.getElementById('addressModal');
	const closeAddressModal = document.getElementById('closeAddressModal');
	const cancelAddressBtn = document.getElementById('cancelAddressBtn');
	const addressForm = document.getElementById('addressForm');
	const selectMapBtn = document.getElementById('selectMapBtn');
	const saveAddressBtn = addressForm?.querySelector('.save-btn');
	const newAddressModeBtn = document.getElementById('newAddressModeBtn');
	const existingAddressModeBtn = document.getElementById('existingAddressModeBtn');
	const newAddressSection = document.getElementById('newAddressSection');
	const existingAddressSection = document.getElementById('existingAddressSection');
	const existingAddressesBody = document.getElementById('existingAddressesBody');
	const pincodeInput = document.getElementById('addressPincode');
	const pincodeError = document.getElementById('addressPincodeError');

	if (!addAddressBtn || !addressModal || !addressForm) return;

	let selectedLatitude = null;
	let selectedLongitude = null;
	let currentMode = 'new';
	let existingAddresses = [];
	let selectedExistingAddressId = null;

	const escapeHtml = (value) => String(value || '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

	function closeModal() {
		addressModal.style.display = 'none';
	}

	function clearPincodeError() {
		if (pincodeError) pincodeError.textContent = '';
	}

	function showPincodeError(message) {
		if (pincodeError) pincodeError.textContent = message;
	}

	function syncSaveAddressButton() {
		if (!saveAddressBtn) return;
		saveAddressBtn.textContent = state.pendingAddress ? 'Update Address' : 'Save Address';
	}

	function setMapButtonState() {
		if (!selectMapBtn) return;

		if (selectedLatitude !== null && selectedLongitude !== null) {
			selectMapBtn.textContent = `📍 Location Selected (${Number(selectedLatitude).toFixed(4)}, ${Number(selectedLongitude).toFixed(4)})`;
			selectMapBtn.classList.add('map-btn-selected');
			return;
		}

		selectMapBtn.textContent = 'Select on Map';
		selectMapBtn.classList.remove('map-btn-selected');
	}

	function setMode(mode) {
		currentMode = mode;
		const isNewMode = mode === 'new';

		if (newAddressModeBtn) newAddressModeBtn.classList.toggle('active', isNewMode);
		if (existingAddressModeBtn) existingAddressModeBtn.classList.toggle('active', !isNewMode);
		if (newAddressSection) newAddressSection.style.display = isNewMode ? 'block' : 'none';
		if (existingAddressSection) existingAddressSection.style.display = isNewMode ? 'none' : 'block';

		if (!isNewMode) {
			loadExistingAddresses();
		}
	}

	function hydrateNewAddressFormFromPendingAddress() {
		const street = document.getElementById('addressStreet');
		const area = document.getElementById('addressArea');
		const city = document.getElementById('addressCity');
		const addrState = document.getElementById('addressState');
		const pincode = document.getElementById('addressPincode');
		const landmark = document.getElementById('addressLandmark');
		const addressType = document.getElementById('addressType');
		const defaultAddress = document.getElementById('defaultAddress');

		if (!state.pendingAddress || state.pendingAddress.address_id) {
			if (street) street.value = '';
			if (area) area.value = '';
			if (city) city.value = '';
			if (addrState) addrState.value = '';
			if (pincode) pincode.value = '';
			clearPincodeError();
			if (landmark) landmark.value = '';
			if (addressType) addressType.value = '';
			if (defaultAddress) defaultAddress.checked = false;
			selectedLatitude = null;
			selectedLongitude = null;
			setMapButtonState();
			return;
		}

		const address = state.pendingAddress;

		if (street) street.value = address.street || '';
		if (area) area.value = address.area || '';
		if (city) city.value = address.city || '';
		if (addrState) addrState.value = address.state || '';
		if (pincode) pincode.value = address.pincode || '';
		clearPincodeError();
		if (landmark) landmark.value = address.landmark || '';
		if (addressType) addressType.value = address.address_type || '';
		if (defaultAddress) defaultAddress.checked = Boolean(address.is_default);

		selectedLatitude = address.latitude ?? null;
		selectedLongitude = address.longitude ?? null;
		setMapButtonState();
	}

	function renderExistingAddresses() {
		if (!existingAddressesBody) return;

		if (!existingAddresses.length) {
			existingAddressesBody.innerHTML = `
				<tr>
					<td colspan="7" class="existing-address-empty">No existing addresses found.</td>
				</tr>
			`;
			return;
		}

		existingAddressesBody.innerHTML = existingAddresses.map((address) => {
			const addressId = Number(address.address_id);
			const isSelected = addressId === Number(selectedExistingAddressId);
			return `
				<tr>
					<td>${escapeHtml(address.address_type || '-')}</td>
					<td>${escapeHtml(address.street || '-')}</td>
					<td>${escapeHtml(address.area || '-')}</td>
					<td>${escapeHtml(address.city || '-')}</td>
					<td>${escapeHtml(address.state || '-')}</td>
					<td>${escapeHtml(address.pincode || '-')}</td>
					<td>
						<button type="button" class="select-existing-address-btn ${isSelected ? 'selected' : ''}" data-address-id="${addressId}">
							${isSelected ? 'Selected' : 'Select'}
						</button>
					</td>
				</tr>
			`;
		}).join('');
	}

	async function loadExistingAddresses() {
		if (!existingAddressesBody) return;

		const user = JSON.parse(sessionStorage.getItem('user') || 'null');
		if (!user || !user.id) {
			existingAddressesBody.innerHTML = `
				<tr>
					<td colspan="7" class="existing-address-empty">Please login again to load addresses.</td>
				</tr>
			`;
			return;
		}

		existingAddressesBody.innerHTML = `
			<tr>
				<td colspan="7" class="existing-address-empty">Loading addresses...</td>
			</tr>
		`;

		try {
			const response = await fetch(`${ADDRESSES_API_BASE}/${encodeURIComponent(user.id)}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.message || 'Failed to load addresses');
			}

			existingAddresses = Array.isArray(result.data) ? result.data : [];
			renderExistingAddresses();
		} catch (error) {
			console.error('Load existing addresses error:', error);
			existingAddressesBody.innerHTML = `
				<tr>
					<td colspan="7" class="existing-address-empty">${escapeHtml(error.message || 'Failed to load addresses.')}</td>
				</tr>
			`;
		}
	}

	window.addEventListener('message', (event) => {
		if (event.data && event.data.type === 'MAP_LOCATION_SELECTED') {
			selectedLatitude = event.data.latitude;
			selectedLongitude = event.data.longitude;
			setMapButtonState();
		}
	});

	addAddressBtn.addEventListener('click', () => {
		const hasExistingPendingAddress = Boolean(state.pendingAddress && state.pendingAddress.address_id);
		selectedExistingAddressId = hasExistingPendingAddress ? Number(state.pendingAddress.address_id) : null;
		setMode(hasExistingPendingAddress ? 'existing' : 'new');
		hydrateNewAddressFormFromPendingAddress();
		syncSaveAddressButton();
		addressModal.style.display = 'flex';
	});

	newAddressModeBtn?.addEventListener('click', () => {
		setMode('new');
		hydrateNewAddressFormFromPendingAddress();
	});

	existingAddressModeBtn?.addEventListener('click', () => {
		setMode('existing');
	});

	closeAddressModal?.addEventListener('click', closeModal);
	cancelAddressBtn?.addEventListener('click', closeModal);

	addressModal.addEventListener('click', (event) => {
		if (event.target === addressModal) {
			closeModal();
		}
	});

	selectMapBtn?.addEventListener('click', () => {
		const mapUrl = './map.html';
		const popupWidth = 800;
		const popupHeight = 600;
		const left = (screen.width - popupWidth) / 2;
		const top = (screen.height - popupHeight) / 2;

		window.open(
			mapUrl,
			'SelectLocation',
			`width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=no`
		);
	});

	existingAddressesBody?.addEventListener('click', (event) => {
		const selectBtn = event.target.closest('.select-existing-address-btn');
		if (!selectBtn) return;

		const addressId = Number.parseInt(selectBtn.getAttribute('data-address-id'), 10);
		if (!Number.isInteger(addressId) || addressId <= 0) return;

		const selectedAddress = existingAddresses.find((address) => Number(address.address_id) === addressId);
		if (!selectedAddress) return;

		selectedExistingAddressId = addressId;
		renderExistingAddresses();

		const user = JSON.parse(sessionStorage.getItem('user') || 'null');
		state.pendingAddress = {
			address_id: Number(selectedAddress.address_id),
			user_id: Number(user?.id || 0),
			street: selectedAddress.street,
			area: selectedAddress.area,
			city: selectedAddress.city,
			state: selectedAddress.state,
			pincode: selectedAddress.pincode,
			landmark: selectedAddress.landmark,
			latitude: selectedAddress.latitude,
			longitude: selectedAddress.longitude,
			address_type: selectedAddress.address_type,
			is_default: Number(selectedAddress.is_default) === 1,
		};

		alert('✅ Success: Address is selected successfully.');
		syncSaveAddressButton();
		closeModal();
	});

	addressForm.addEventListener('submit', (event) => {
		event.preventDefault();
		clearPincodeError();

		if (currentMode !== 'new') {
			return;
		}

		const user = JSON.parse(sessionStorage.getItem('user') || 'null');
		if (!user || !user.id) {
			alert('User not found. Please login again.');
			window.location.href = '../../pages/start/login.html';
			return;
		}

		const street = document.getElementById('addressStreet')?.value.trim();
		const area = document.getElementById('addressArea')?.value.trim();
		const city = document.getElementById('addressCity')?.value.trim();
		const addrState = document.getElementById('addressState')?.value.trim();
		const pincode = document.getElementById('addressPincode')?.value.trim();
		const landmark = document.getElementById('addressLandmark')?.value.trim();
		const addressType = document.getElementById('addressType')?.value;
		const isDefault = document.getElementById('defaultAddress')?.checked || false;

		if (!street) { alert('Please enter a street address.'); return; }
		if (!city) { alert('Please enter a city.'); return; }
		if (!addrState) { alert('Please enter a state.'); return; }
		if (!pincode) { alert('Please enter a pincode.'); return; }
		if (!/^\d{6}$/.test(pincode)) {
			showPincodeError('Pincode must be exactly 6 digits.');
			return;
		}
		if (!addressType) { alert('Please select an address type.'); return; }
		if (selectedLatitude === null || selectedLongitude === null) {
			alert('Please select a location on the map.');
			return;
		}

		const saveBtn = addressForm.querySelector('.save-btn');
		const originalText = saveBtn ? saveBtn.textContent : '';

		try {
			if (saveBtn) {
				saveBtn.textContent = 'Saving...';
				saveBtn.disabled = true;
			}

			state.pendingAddress = {
				user_id: Number(user.id),
				street,
				area: area || null,
				city,
				state: addrState,
				pincode,
				landmark: landmark || null,
				latitude: Number(selectedLatitude),
				longitude: Number(selectedLongitude),
				address_type: addressType,
				is_default: isDefault,
			};

			alert('Address saved for checkout. It will be added after payment is completed.');
			syncSaveAddressButton();
			closeModal();
		} catch (error) {
			console.error('Save address error:', error);
			alert(error.message || 'Failed to save address details. Please try again.');
		} finally {
			if (saveBtn) {
				saveBtn.textContent = originalText;
				saveBtn.disabled = false;
			}
		}
	});

	pincodeInput?.addEventListener('input', () => {
		clearPincodeError();
	});

	syncSaveAddressButton();
};

