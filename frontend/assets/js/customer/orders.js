const API_URL = "http://localhost:5000/api/orders/user";
let allOrders = [];

// Format date to readable format
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Format slot to readable format
const formatSlot = (slot) => {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
};

// Format price
const formatPrice = (price) => {
  return `Rs. ${Number(price).toFixed(2)}`;
};

// Get status display
const getStatusDisplay = (status) => {
  const statusMap = {
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered'
  };
  return statusMap[status] || status;
};

// Render orders table
const renderOrders = (orders) => {
  const tableBody = document.getElementById('ordersTableBody');
  const noOrdersMessage = document.getElementById('noOrdersMessage');

  if (!orders || orders.length === 0) {
    tableBody.innerHTML = '';
    noOrdersMessage.style.display = 'block';
    return;
  }

  noOrdersMessage.style.display = 'none';

  tableBody.innerHTML = orders.map((order) => `
    <tr>
      <td><strong>#${order.order_id}</strong></td>
      <td>#${order.subscription_id}</td>
      <td>${formatDate(order.order_date)}</td>
      <td>${formatDate(order.delivery_date)}</td>
      <td>${formatSlot(order.delivery_slot)}</td>
      <td>${formatPrice(order.total_amount)}</td>
      <td><span class="status-badge ${order.status}">${getStatusDisplay(order.status)}</span></td>
      <td>
        <div class="action-cell">
          <button class="view-btn" onclick="viewOrderDetails(${order.order_id})">View</button>
        </div>
      </td>
    </tr>
  `).join('');
};

// View order details
const viewOrderDetails = (orderId) => {
  const order = allOrders.find((o) => o.order_id === orderId);
  if (order) {
    alert(`Order #${order.order_id}\nDate: ${formatDate(order.order_date)}\nAmount: ${formatPrice(order.total_amount)}\nStatus: ${getStatusDisplay(order.status)}`);
  }
};

const fetchUserOrders = async (userId) => {
  const response = await fetch(`${API_URL}?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch orders");
  }

  return Array.isArray(result.data) ? result.data : [];
};

// Filter orders
const filterOrders = () => {
  const statusFilter = document.getElementById('statusFilter').value;
  let filtered = allOrders;

  if (statusFilter) {
    filtered = allOrders.filter(order => order.status === statusFilter);
  }

  renderOrders(filtered);
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user'));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, '_')
    : null;

  if (!user || normalizedRole !== 'customer') {
    alert('Unauthorized access. Please login as a Customer.');
    window.location.href = '../../pages/start/login.html';
    return;
  }

  document.getElementById('welcomeText').textContent = `Order History - ${user.name}`;

  try {
    allOrders = await fetchUserOrders(user.id);
    renderOrders(allOrders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    allOrders = [];
    renderOrders(allOrders);
  }

  // Setup filter listener
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterOrders);
  }

  // Handle logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
  });
});
