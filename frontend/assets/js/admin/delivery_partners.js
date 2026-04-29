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
  const partnersTableBody = document.getElementById("partnersTableBody");
  const partnerMessage = document.getElementById("partnerMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  const adminUser = getStoredUser();
  if (!adminUser || normalizeRole(adminUser.role) !== "admin") {
    sessionStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  let allPartners = [];

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
    if (!partnerMessage) {
      return;
    }

    if (!message) {
      partnerMessage.className = "form-message";
      partnerMessage.textContent = "";
      return;
    }

    partnerMessage.className = `form-message ${type}`;
    partnerMessage.textContent = message;
  };

  const renderPartners = (partners) => {
    if (!partners.length) {
      partnersTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">No delivery partners found.</td></tr>';
      return;
    }

    partnersTableBody.innerHTML = partners
      .map((partner) => {
        const status = sanitizeStatus(partner.status);
        const nextStatus = status === "active" ? "blocked" : "active";
        const actionLabel = nextStatus === "blocked" ? "Block" : "Unblock";
        const actionClass = nextStatus === "blocked" ? "btn-danger" : "btn-primary";

        return `
          <tr>
            <td>${partner.id}</td>
            <td>${escapeHtml(partner.name)}</td>
            <td>${escapeHtml(partner.email)}</td>
            <td>${escapeHtml(partner.phone || "-")}</td>
            <td><span class="status-badge ${status}">${status}</span></td>
            <td>
              <button
                class="${actionClass} btn-sm"
                onclick="changePartnerStatus(${Number(partner.id)}, '${nextStatus}')"
              >
                ${actionLabel}
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const loadPartners = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/users/delivery-partners`, {
        method: "GET",
        headers: getAdminHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load delivery partners");
      }

      allPartners = Array.isArray(data.data) ? data.data : [];
      renderPartners(allPartners);
      showMessage("");
    } catch (error) {
      console.error("Error loading delivery partners:", error);
      partnersTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">Error loading delivery partners.</td></tr>';
      showMessage(error.message || "Error loading delivery partners.", "error");
    }
  };

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  window.changePartnerStatus = async (userId, nextStatus) => {
    const action = nextStatus === "blocked" ? "block" : "unblock";
    const confirmed = await window.swalConfirm(`Are you sure you want to ${action} this delivery partner?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/users/${userId}/status`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update delivery partner status");
      }

      showMessage(data.message || "Delivery partner status updated.", "success");
      await loadPartners();
    } catch (error) {
      console.error("Error updating delivery partner status:", error);
      showMessage(error.message || "Error updating delivery partner status.", "error");
    }
  };

  await loadPartners();
});


