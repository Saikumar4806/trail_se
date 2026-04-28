// Subscription Rates Management
const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || 'null');
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) =>
  String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();

document.addEventListener('DOMContentLoaded', async () => {
  const rateForm = document.getElementById('rateForm');
  const saveRateBtn = document.getElementById('saveRateBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const rateFormMessage = document.getElementById('rateFormMessage');
  const ratesTableBody = document.getElementById('ratesTableBody');
  const logoutBtn = document.getElementById('logoutBtn');

  // Check user authentication
  const user = getStoredUser();
  if (!user || normalizeRole(user.role) !== 'admin') {
    sessionStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
    return;
  }

  // Load subscription rates on page load
  const loadRates = async () => {
    try {
      // TODO: Replace with actual API call
      // const res = await fetch('http://localhost:5000/api/subscription-rates');
      // const data = await res.json();
      // if (data.success) { renderRates(data.data); }
      
      // For now, show placeholder message
      ratesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No subscription rates to display. Add a new plan to get started.</td></tr>';
    } catch (error) {
      console.error('Error loading rates:', error);
      ratesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading subscription rates.</td></tr>';
    }
  };

  const renderRates = (rates) => {
    if (rates.length === 0) {
      ratesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No subscription rates found.</td></tr>';
      return;
    }

    ratesTableBody.innerHTML = rates.map(rate => `
      <tr>
        <td>${rate.id}</td>
        <td>${rate.plan_name}</td>
        <td>${rate.frequency}</td>
        <td>₹${parseFloat(rate.price).toFixed(2)}</td>
        <td>${rate.delivery_days}</td>
        <td>${rate.description || '-'}</td>
        <td><span class="status-badge ${rate.status}">${rate.status}</span></td>
        <td>
          <button class="btn-edit btn-sm" onclick="editRate(${rate.id})">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteRate(${rate.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  };

  // Handle form submission
  rateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rateId = document.getElementById('rateId').value;
    const formData = {
      plan_name: document.getElementById('ratePlanName').value,
      description: document.getElementById('ratePlanDescription').value,
      frequency: document.getElementById('rateFrequency').value,
      price: document.getElementById('ratePrice').value,
      delivery_days: document.getElementById('rateDeliveryDays').value,
      status: document.getElementById('rateStatus').value,
    };

    try {
      // TODO: Replace with actual API call
      // const endpoint = rateId ? `/api/subscription-rates/${rateId}` : '/api/subscription-rates';
      // const method = rateId ? 'PUT' : 'POST';
      // const res = await fetch(`http://localhost:5000${endpoint}`, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // const data = await res.json();
      
      rateFormMessage.className = 'form-message success';
      rateFormMessage.textContent = 'Subscription rate saved successfully!';
      rateForm.reset();
      document.getElementById('rateId').value = '';
      
      loadRates();
    } catch (error) {
      rateFormMessage.className = 'form-message error';
      rateFormMessage.textContent = `Error: ${error.message}`;
    }
  });

  // Cancel edit
  cancelEditBtn.addEventListener('click', () => {
    rateForm.reset();
    document.getElementById('rateId').value = '';
    cancelEditBtn.style.display = 'none';
    saveRateBtn.textContent = 'Save Rate';
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
  });

  // Initial load
  loadRates();
});

// Global functions for edit/delete
function editRate(id) {
  // TODO: Fetch rate details and populate form
  console.log('Edit rate:', id);
}

function deleteRate(id) {
  // TODO: Delete rate
  if (confirm('Are you sure you want to delete this subscription rate?')) {
    console.log('Delete rate:', id);
  }
}

