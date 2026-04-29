const ADDRESSES_API_BASE = "http://localhost:5000/api/addresses";

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "null");
  const normalizedRole = user?.role
    ? String(user.role).toLowerCase().replace(/\s+/g, "_")
    : "";

  if (!user || !user.id || normalizedRole !== "customer") {
    alert("Unauthorized access. Please login as a Customer.");
    window.location.href = "../start/login.html";
    return;
  }

  const ui = {
    addAddressBtn: document.getElementById("addAddressBtn"),
    addressMessage: document.getElementById("addressMessage"),
    addressModal: document.getElementById("addressModal"),
    addressModalTitle: document.getElementById("addressModalTitle"),
    closeAddressModal: document.getElementById("closeAddressModal"),
    cancelAddressBtn: document.getElementById("cancelAddressBtn"),
    addressForm: document.getElementById("addressForm"),
    saveAddressBtn: document.getElementById("saveAddressBtn"),
    selectMapBtn: document.getElementById("selectMapBtn"),
    tableBody: document.getElementById("addressesTableBody"),
    street: document.getElementById("addressStreet"),
    area: document.getElementById("addressArea"),
    city: document.getElementById("addressCity"),
    state: document.getElementById("addressState"),
    pincode: document.getElementById("addressPincode"),
    landmark: document.getElementById("addressLandmark"),
    addressType: document.getElementById("addressType"),
    defaultAddress: document.getElementById("defaultAddress"),
  };

  const state = {
    editingAddress: null,
    selectedLatitude: null,
    selectedLongitude: null,
    addresses: [],
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const showMessage = (message, type) => {
    if (!ui.addressMessage) return;
    ui.addressMessage.textContent = message;
    ui.addressMessage.classList.remove("show", "success", "error");
    ui.addressMessage.classList.add("show", type);

    window.setTimeout(() => {
      ui.addressMessage.classList.remove("show");
    }, 3000);
  };

  const setMapButtonText = () => {
    if (!ui.selectMapBtn) return;

    if (
      Number.isFinite(state.selectedLatitude)
      && Number.isFinite(state.selectedLongitude)
    ) {
      ui.selectMapBtn.textContent = `📍 Location Selected (${Number(state.selectedLatitude).toFixed(4)}, ${Number(state.selectedLongitude).toFixed(4)})`;
      ui.selectMapBtn.classList.add("map-btn-selected");
      return;
    }

    ui.selectMapBtn.textContent = "Select on Map";
    ui.selectMapBtn.classList.remove("map-btn-selected");
  };

  const closeModal = () => {
    if (ui.addressModal) {
      ui.addressModal.style.display = "none";
    }
  };

  const openModal = (address = null) => {
    state.editingAddress = address;

    ui.addressForm.reset();

    if (address) {
      ui.addressModalTitle.textContent = "Update Address";
      ui.saveAddressBtn.textContent = "Update Address";
      ui.street.value = address.street || "";
      ui.area.value = address.area || "";
      ui.city.value = address.city || "";
      ui.state.value = address.state || "";
      ui.pincode.value = address.pincode || "";
      ui.landmark.value = address.landmark || "";
      ui.addressType.value = address.address_type || "";
      ui.defaultAddress.checked = Number(address.is_default) === 1;
      state.selectedLatitude = Number(address.latitude);
      state.selectedLongitude = Number(address.longitude);
    } else {
      ui.addressModalTitle.textContent = "Add New Address";
      ui.saveAddressBtn.textContent = "Save Address";
      state.selectedLatitude = null;
      state.selectedLongitude = null;
    }

    setMapButtonText();
    ui.addressModal.style.display = "flex";
  };

  const renderAddresses = () => {
    if (!ui.tableBody) return;

    if (!state.addresses.length) {
      ui.tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-cell">No addresses found. Add a new address.</td>
        </tr>
      `;
      return;
    }

    ui.tableBody.innerHTML = state.addresses
      .map((address) => {
        const addressId = Number(address.address_id);
        return `
          <tr>
            <td>${escapeHtml(address.address_type || "-")}</td>
            <td>${escapeHtml(address.street || "-")}</td>
            <td>${escapeHtml(address.area || "-")}</td>
            <td>${escapeHtml(address.city || "-")}</td>
            <td>${escapeHtml(address.state || "-")}</td>
            <td>${escapeHtml(address.pincode || "-")}</td>
            <td>${Number(address.is_default) === 1 ? "Yes" : "No"}</td>
            <td>
              <div class="action-buttons">
                <button type="button" class="table-btn update-btn" data-address-id="${addressId}">Update</button>
                <button type="button" class="table-btn delete-btn" data-address-id="${addressId}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const loadAddresses = async () => {
    if (ui.tableBody) {
      ui.tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-cell">Loading addresses...</td>
        </tr>
      `;
    }

    try {
      const response = await fetch(`${ADDRESSES_API_BASE}/${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch addresses");
      }

      state.addresses = Array.isArray(result.data) ? result.data : [];
      renderAddresses();
    } catch (error) {
      console.error("Load addresses error:", error);
      if (ui.tableBody) {
        ui.tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="error-cell">${escapeHtml(error.message || "Failed to load addresses")}</td>
          </tr>
        `;
      }
    }
  };

  const validateForm = () => {
    if (!ui.street.value.trim()) return "Street address is required.";
    if (!ui.city.value.trim()) return "City is required.";
    if (!ui.state.value.trim()) return "State is required.";
    if (!ui.pincode.value.trim()) return "Pincode is required.";
    if (!/^\d{6}$/.test(ui.pincode.value.trim())) return "Pincode must be 6 digits.";
    if (!ui.addressType.value) return "Address type is required.";

    if (
      !Number.isFinite(state.selectedLatitude)
      || !Number.isFinite(state.selectedLongitude)
    ) {
      return "Please select your location on map.";
    }

    return "";
  };

  const buildPayload = () => ({
    user_id: Number(user.id),
    street: ui.street.value.trim(),
    area: ui.area.value.trim() || null,
    city: ui.city.value.trim(),
    state: ui.state.value.trim(),
    pincode: ui.pincode.value.trim(),
    landmark: ui.landmark.value.trim() || null,
    latitude: Number(state.selectedLatitude),
    longitude: Number(state.selectedLongitude),
    address_type: ui.addressType.value,
    is_default: ui.defaultAddress.checked,
  });

  const submitAddress = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    const payload = buildPayload();
    const isUpdate = Boolean(state.editingAddress && state.editingAddress.address_id);

    try {
      ui.saveAddressBtn.disabled = true;
      ui.saveAddressBtn.textContent = isUpdate ? "Updating..." : "Saving...";

      const endpoint = isUpdate
        ? `${ADDRESSES_API_BASE}/${state.editingAddress.address_id}`
        : ADDRESSES_API_BASE;

      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save address");
      }

      closeModal();
      await loadAddresses();
      showMessage(
        result.message || (isUpdate ? "Address updated successfully." : "Address added successfully."),
        "success"
      );
    } catch (error) {
      console.error("Save address error:", error);
      showMessage(error.message || "Failed to save address.", "error");
    } finally {
      ui.saveAddressBtn.disabled = false;
      ui.saveAddressBtn.textContent = state.editingAddress ? "Update Address" : "Save Address";
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const hasConfirmed = await window.swalConfirm("Are you sure you want to delete this address?");
    if (!hasConfirmed) return;

    try {
      const response = await fetch(`${ADDRESSES_API_BASE}/${addressId}?user_id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete address");
      }

      await loadAddresses();
      showMessage(result.message || "Address deleted successfully.", "success");
    } catch (error) {
      console.error("Delete address error:", error);
      showMessage(error.message || "Failed to delete address.", "error");
    }
  };

  ui.addAddressBtn?.addEventListener("click", () => openModal());
  ui.closeAddressModal?.addEventListener("click", closeModal);
  ui.cancelAddressBtn?.addEventListener("click", closeModal);
  ui.addressForm?.addEventListener("submit", submitAddress);

  ui.addressModal?.addEventListener("click", (event) => {
    if (event.target === ui.addressModal) {
      closeModal();
    }
  });

  ui.selectMapBtn?.addEventListener("click", () => {
    const mapUrl = "./map.html";
    const popupWidth = 800;
    const popupHeight = 600;
    const left = (screen.width - popupWidth) / 2;
    const top = (screen.height - popupHeight) / 2;

    window.open(
      mapUrl,
      "SelectLocation",
      `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=no`
    );
  });

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "MAP_LOCATION_SELECTED") {
      state.selectedLatitude = Number(event.data.latitude);
      state.selectedLongitude = Number(event.data.longitude);
      setMapButtonText();
    }
  });

  ui.tableBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-address-id]");
    if (!actionBtn) return;

    const addressId = Number.parseInt(actionBtn.getAttribute("data-address-id"), 10);
    if (!Number.isInteger(addressId) || addressId <= 0) return;

    if (actionBtn.classList.contains("update-btn")) {
      const selectedAddress = state.addresses.find(
        (address) => Number(address.address_id) === addressId
      );
      if (selectedAddress) {
        openModal(selectedAddress);
      }
      return;
    }

    if (actionBtn.classList.contains("delete-btn")) {
      handleDeleteAddress(addressId);
    }
  });

  loadAddresses();
});


