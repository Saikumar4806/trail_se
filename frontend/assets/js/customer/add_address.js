window.setupAddressModal = function setupAddressModal(state) {
	const addAddressBtn = document.getElementById('addAddressBtn');
	const addressModal = document.getElementById('addressModal');
	const closeAddressModal = document.getElementById('closeAddressModal');
	const cancelAddressBtn = document.getElementById('cancelAddressBtn');
	const addressForm = document.getElementById('addressForm');
	const selectMapBtn = document.getElementById('selectMapBtn');
	const saveAddressBtn = addressForm?.querySelector('.save-btn');

	if (!addAddressBtn || !addressModal || !addressForm) return;

	let selectedLatitude = null;
	let selectedLongitude = null;

	function closeModal() {
		addressModal.style.display = 'none';
	}

	function syncSaveAddressButton() {
		if (!saveAddressBtn) return;
		saveAddressBtn.textContent = state.pendingAddress ? 'Update Address' : 'Save Address';
	}

	function hydrateFormFromPendingAddress() {
		if (!state.pendingAddress) {
			selectedLatitude = null;
			selectedLongitude = null;
			if (selectMapBtn) {
				selectMapBtn.textContent = 'Select on Map';
				selectMapBtn.classList.remove('map-btn-selected');
			}
			return;
		}

		const address = state.pendingAddress;
		const street = document.getElementById('addressStreet');
		const area = document.getElementById('addressArea');
		const city = document.getElementById('addressCity');
		const addrState = document.getElementById('addressState');
		const pincode = document.getElementById('addressPincode');
		const landmark = document.getElementById('addressLandmark');
		const addressType = document.getElementById('addressType');
		const defaultAddress = document.getElementById('defaultAddress');

		if (street) street.value = address.street || '';
		if (area) area.value = address.area || '';
		if (city) city.value = address.city || '';
		if (addrState) addrState.value = address.state || '';
		if (pincode) pincode.value = address.pincode || '';
		if (landmark) landmark.value = address.landmark || '';
		if (addressType) addressType.value = address.address_type || '';
		if (defaultAddress) defaultAddress.checked = Boolean(address.is_default);

		selectedLatitude = address.latitude || null;
		selectedLongitude = address.longitude || null;

		if (selectMapBtn) {
			if (selectedLatitude !== null && selectedLongitude !== null) {
				selectMapBtn.textContent = `📍 Location Selected (${Number(selectedLatitude).toFixed(4)}, ${Number(selectedLongitude).toFixed(4)})`;
				selectMapBtn.classList.add('map-btn-selected');
			} else {
				selectMapBtn.textContent = 'Select on Map';
				selectMapBtn.classList.remove('map-btn-selected');
			}
		}
	}

	window.addEventListener('message', (event) => {
		if (event.data && event.data.type === 'MAP_LOCATION_SELECTED') {
			selectedLatitude = event.data.latitude;
			selectedLongitude = event.data.longitude;

			if (selectMapBtn) {
				selectMapBtn.textContent = `📍 Location Selected (${selectedLatitude.toFixed(4)}, ${selectedLongitude.toFixed(4)})`;
				selectMapBtn.classList.add('map-btn-selected');
			}
		}
	});

	addAddressBtn.addEventListener('click', () => {
		hydrateFormFromPendingAddress();
		syncSaveAddressButton();
		addressModal.style.display = 'flex';
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

	addressForm.addEventListener('submit', (event) => {
		event.preventDefault();

		const user = JSON.parse(localStorage.getItem('user') || 'null');
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
		if (!addressType) { alert('Please select an address type.'); return; }

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
				latitude: selectedLatitude,
				longitude: selectedLongitude,
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

	syncSaveAddressButton();
};
