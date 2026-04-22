const API_URL = "http://localhost:5000/api/dashboard/partner";

// Sample demo orders for demonstration
const demoOrders = [
  {
    id: 1,
    customerName: "Rajesh Kumar",
    address: "123 Main Street, Downtown",
    slot: "Morning",
    status: "pending"
  },
  {
    id: 2,
    customerName: "Priya Singh",
    address: "456 Park Avenue, Midtown",
    slot: "Evening",
    status: "pending"
  },
  {
    id: 3,
    customerName: "Amit Patel",
    address: "789 Oak Road, Uptown",
    slot: "Morning",
    status: "pending"
  }
];

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, "_")
    : null;

  if (!user || normalizedRole !== "delivery_partner") {
    alert("Unauthorized access. Please login as a Delivery Partner.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  document.getElementById("welcomeText").textContent = `Delivery Partner: ${user.name}`;

  // Initialize dashboard
  initializeDashboard();

  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  // Start Delivery button - Navigate to delivery maps
  document.getElementById("startDeliveryBtn").addEventListener("click", () => {
    window.location.href = "../delivery/delivery_maps.html";
  });
});

function initializeDashboard() {
  // Display demo data
  const totalOrders = demoOrders.length;
  const completedOrders = demoOrders.filter(o => o.status === "delivered").length;
  const todayEarnings = completedOrders * 50; // ₹50 per delivery
  const totalEarnings = 2500; // Demo total

  document.getElementById("todayOrders").textContent = totalOrders;
  document.getElementById("completedOrders").textContent = completedOrders;
  document.getElementById("todayEarnings").textContent = `₹${todayEarnings.toFixed(2)}`;
  document.getElementById("totalEarnings").textContent = `₹${totalEarnings.toFixed(2)}`;
  document.getElementById("totalOrderCount").textContent = totalOrders;

  // Load orders
  renderOrders(demoOrders);

  // Try to fetch real data from backend
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (response.ok && result.success && result.data.orders && result.data.orders.length > 0) {
      // Update with real data if available
      const orders = result.data.orders;
      const stats = result.data.stats;
      
      document.getElementById("todayOrders").textContent = stats.assignedDeliveries || orders.length;
      document.getElementById("completedOrders").textContent = stats.completedToday || 0;
      document.getElementById("todayEarnings").textContent = `₹${(stats.todayEarnings || 0).toFixed(2)}`;
      document.getElementById("totalEarnings").textContent = `₹${(stats.totalEarnings || 0).toFixed(2)}`;
      document.getElementById("totalOrderCount").textContent = orders.length;

      renderOrders(orders);
    }
  } catch (err) {
    console.log("Using demo data (server not available)");
  }
}

function renderOrders(orders) {
  const container = document.getElementById("ordersContainer");

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="no-orders">📭 No orders assigned for today</div>';
    return;
  }

  container.innerHTML = orders.map((order) => {
    const statusClass = getStatusClass(order.status);
    const isDelivered = order.status === "delivered";

    return `
      <div class="order-item">
        <div class="order-info">
          <div class="order-id">📦 Order #${order.id}</div>
          <div class="order-customer">👤 ${order.customerName || 'Customer'}</div>
          <div class="order-address">📍 ${order.address || 'Address not provided'}</div>
          <span class="order-slot">🕐 ${order.slot || 'Morning'}</span>
        </div>
        <div class="order-status">
          <span class="status-badge ${statusClass}">${order.status ? order.status.toUpperCase() : 'PENDING'}</span>
          ${isDelivered 
            ? '<span class="delivery-complete">✅ Completed</span>'
            : `<button class="mark-delivered-btn" onclick="markOrderDelivered(${order.id}, this)">Mark Delivered</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function getStatusClass(status) {
  if (!status) return 'status-pending';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'delivered') return 'status-delivered';
  if (lowerStatus === 'in-transit' || lowerStatus === 'in_transit') return 'status-in-transit';
  return 'status-pending';
}

function markOrderDelivered(orderId, buttonElement) {
  // Find the order item
  const orderItem = buttonElement.closest('.order-item');
  const statusBadge = orderItem.querySelector('.status-badge');
  
  // Update status badge
  statusBadge.textContent = 'DELIVERED';
  statusBadge.className = 'status-badge status-delivered';
  
  // Replace button with completion message
  buttonElement.outerHTML = '<span class="delivery-complete">✅ Completed</span>';

  // Update completed count
  const currentCompleted = parseInt(document.getElementById("completedOrders").textContent);
  document.getElementById("completedOrders").textContent = currentCompleted + 1;

  // Update earnings (₹50 per delivery)
  const currentEarnings = parseFloat(document.getElementById("todayEarnings").textContent.replace('₹', ''));
  document.getElementById("todayEarnings").textContent = `₹${(currentEarnings + 50).toFixed(2)}`;

  // Show success message
  showNotification(`✅ Order #${orderId} marked as delivered!`);
}

function showNotification(message) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(46, 204, 113, 0.3);
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(400px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
