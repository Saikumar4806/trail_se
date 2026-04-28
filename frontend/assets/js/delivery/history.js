// Delivery Partner History Management
const HISTORY_API = "http://localhost:5000/api/orders/partner";

document.addEventListener("DOMContentLoaded", async () => {
  const historyContainer = document.getElementById("historyContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = JSON.parse(sessionStorage.getItem("user"));

  if (!user || user.role !== "delivery_partner") {
    window.location.href = "../start/login.html";
    return;
  }

  // Handle Logout
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../start/login.html";
  });

  try {
    const response = await fetch(`${HISTORY_API}?partner_id=${user.id}`);
    const result = await response.json();

    if (response.ok && result.success) {
      renderHistory(result.data);
    } else {
      historyContainer.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Error loading history: ${result.message}</td></tr>`;
    }
  } catch (err) {
    console.error("History fetch error:", err);
    historyContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Network error. Please try again later.</td></tr>';
  }

  function renderHistory(orders) {
    if (!orders || orders.length === 0) {
      historyContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">No delivery history found.</td></tr>';
      return;
    }

    historyContainer.innerHTML = orders.map(order => `
      <tr>
        <td><strong>#${order.order_id}</strong></td>
        <td>${order.customer_name}</td>
        <td>${order.address}</td>
        <td>${new Date(order.delivery_date).toLocaleDateString()}</td>
        <td>${order.delivery_slot}</td>
        <td><span class="status-delivered">${order.status.toUpperCase()}</span></td>
      </tr>
    `).join('');
  }
});
