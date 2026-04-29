const ADMIN_API_BASE_URL = "http://localhost:5000/api/admin";

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

document.addEventListener("DOMContentLoaded", async () => {
  const usersTableBody = document.getElementById("usersTableBody");
  const filterStatus = document.getElementById("filterStatus");
  const usersMessage = document.getElementById("usersMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  const adminUser = getStoredUser();
  if (!adminUser || normalizeRole(adminUser.role) !== "admin") {
    sessionStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  let allCustomers = [];

  const getAdminHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-id": String(adminUser.id),
  });

  const sanitizeStatus = (value) =>
    String(value || "active").toLowerCase() === "blocked" ? "blocked" : "active";

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const showMessage = (message, type = "info") => {
    if (!usersMessage) {
      return;
    }

    if (!message) {
      usersMessage.className = "form-message";
      usersMessage.textContent = "";
      return;
    }

    usersMessage.className = `form-message ${type}`;
    usersMessage.textContent = message;
  };

  const renderCustomers = (customers) => {
    if (!customers.length) {
      usersTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">No customers found.</td></tr>';
      return;
    }

    usersTableBody.innerHTML = customers
      .map((customer) => {
        const status = sanitizeStatus(customer.status);
        const nextStatus = status === "active" ? "blocked" : "active";
        const actionLabel = nextStatus === "blocked" ? "Block" : "Unblock";
        const actionClass = nextStatus === "blocked" ? "btn-danger" : "btn-primary";

        return `
          <tr>
            <td>${customer.id}</td>
            <td>${escapeHtml(customer.name)}</td>
            <td>${escapeHtml(customer.email)}</td>
            <td>${escapeHtml(customer.phone || "-")}</td>
            <td><span class="status-badge ${status}">${status}</span></td>
            <td>
              <button
                class="${actionClass} btn-sm"
                onclick="changeCustomerStatus(${Number(customer.id)}, '${nextStatus}')"
              >
                ${actionLabel}
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const applyFilters = () => {
    const statusFilter = filterStatus.value;
    const filteredCustomers = statusFilter
      ? allCustomers.filter((customer) => sanitizeStatus(customer.status) === statusFilter)
      : allCustomers;

    renderCustomers(filteredCustomers);
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/users/customers`, {
        method: "GET",
        headers: getAdminHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load customers");
      }

      allCustomers = Array.isArray(data.data) ? data.data : [];
      applyFilters();
      showMessage("");
    } catch (error) {
      console.error("Error loading customers:", error);
      usersTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">Error loading customers.</td></tr>';
      showMessage(error.message || "Error loading customers.", "error");
    }
  };

  filterStatus.addEventListener("change", applyFilters);

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  window.changeCustomerStatus = async (userId, nextStatus) => {
    const action = nextStatus === "blocked" ? "block" : "unblock";
    const confirmed = await window.swalConfirm(`Are you sure you want to ${action} this customer?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/users/${userId}/status`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer status");
      }

      showMessage(data.message || "Customer status updated.", "success");
      await loadCustomers();
    } catch (error) {
      console.error("Error updating customer status:", error);
      showMessage(error.message || "Error updating customer status.", "error");
    }
  };

  await loadCustomers();
});


