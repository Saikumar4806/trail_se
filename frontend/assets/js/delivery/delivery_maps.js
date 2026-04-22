// Demo deliveries data for today
const demoDeliveries = [
  {
    id: 1,
    orderId: 'ORD-001',
    customerName: 'Rajesh Kumar',
    address: '123 Main Street, Downtown',
    slot: 'Morning (8-10 AM)',
    amount: 450.00,
    status: 'pending'
  },
  {
    id: 2,
    orderId: 'ORD-002',
    customerName: 'Priya Singh',
    address: '456 Park Avenue, Midtown',
    slot: 'Morning (8-10 AM)',
    amount: 320.00,
    status: 'pending'
  },
  {
    id: 3,
    orderId: 'ORD-003',
    customerName: 'Amit Patel',
    address: '789 Oak Road, Uptown',
    slot: 'Morning (8-10 AM)',
    amount: 550.00,
    status: 'pending'
  },
  {
    id: 4,
    orderId: 'ORD-004',
    customerName: 'Neha Sharma',
    address: '321 Elm Street, Riverside',
    slot: 'Evening (4-6 PM)',
    amount: 280.00,
    status: 'pending'
  },
  {
    id: 5,
    orderId: 'ORD-005',
    customerName: 'Vikram Reddy',
    address: '654 Pine Avenue, Hillside',
    slot: 'Evening (4-6 PM)',
    amount: 600.00,
    status: 'pending'
  },
  {
    id: 6,
    orderId: 'ORD-006',
    customerName: 'Anjali Verma',
    address: '987 Maple Lane, Lakeside',
    slot: 'Evening (4-6 PM)',
    amount: 420.00,
    status: 'pending'
  }
];

let deliveries = [...demoDeliveries];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user'));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, '_')
    : null;

  if (!user || normalizedRole !== 'delivery_partner') {
    alert('Unauthorized access. Please login as a Delivery Partner.');
    window.location.href = '../../pages/start/login.html';
    return;
  }

  document.getElementById('welcomeText').textContent = `Delivery Route - ${user.name}`;

  // Initialize page
  initializeDeliveryMap();
  renderDeliveries();

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '../delivery/dashboard.html';
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderDeliveries();
    });
  });
}

function initializeDeliveryMap() {
  // Map initialization (styling only, no actual map logic)
  const mapContainer = document.getElementById('mapContainer');
  mapContainer.style.backgroundColor = '#f0f0f0';
  mapContainer.style.display = 'flex';
  mapContainer.style.alignItems = 'center';
  mapContainer.style.justifyContent = 'center';
}

function renderDeliveries() {
  const tableBody = document.getElementById('deliveriesTableBody');
  
  // Filter deliveries based on current filter
  const filteredDeliveries = currentFilter === 'all' 
    ? deliveries 
    : deliveries.filter(d => d.status === currentFilter);

  if (filteredDeliveries.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="no-data">No deliveries found for this filter</td></tr>';
    updateSummary();
    return;
  }

  tableBody.innerHTML = filteredDeliveries.map((delivery, index) => `
    <tr class="delivery-row ${delivery.status}">
      <td>${index + 1}</td>
      <td class="order-id">${delivery.orderId}</td>
      <td class="customer-name">${delivery.customerName}</td>
      <td class="address">${delivery.address}</td>
      <td class="slot">${delivery.slot}</td>
      <td class="amount">₹${delivery.amount.toFixed(2)}</td>
      <td>
        <span class="status-badge ${delivery.status}">
          ${delivery.status === 'pending' ? '⏳ Pending' : '✅ Delivered'}
        </span>
      </td>
      <td class="action-cell">
        ${delivery.status === 'pending' 
          ? `<button class="done-btn" onclick="markDeliveryDone(${delivery.id})">Mark Done</button>`
          : '<span class="done-label">Done</span>'
        }
      </td>
    </tr>
  `).join('');

  updateSummary();
}

function markDeliveryDone(deliveryId) {
  // Find and update the delivery status
  const delivery = deliveries.find(d => d.id === deliveryId);
  if (delivery) {
    delivery.status = 'delivered';
    renderDeliveries();
    
    // Show success notification
    showNotification(`✅ Order ${delivery.orderId} marked as delivered!`);
  }
}

function updateSummary() {
  const totalCount = deliveries.length;
  const completedCount = deliveries.filter(d => d.status === 'delivered').length;
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const totalAmount = deliveries.reduce((sum, d) => sum + d.amount, 0);

  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('completedCount').textContent = completedCount;
  document.getElementById('pendingCount').textContent = pendingCount;
  document.getElementById('totalAmount').textContent = `₹${totalAmount.toFixed(2)}`;
}

function showNotification(message) {
  // Create notification element
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

  // Add animation if not already in document
  if (!document.querySelector('style[data-notification]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notification', 'true');
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
  }

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
