// Time Slots Management
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
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
  const slotForm = document.getElementById('slotForm');
  const saveSlotBtn = document.getElementById('saveSlotBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const slotFormMessage = document.getElementById('slotFormMessage');
  const slotsTableBody = document.getElementById('slotsTableBody');
  const logoutBtn = document.getElementById('logoutBtn');

  // Check user authentication
  const user = getStoredUser();
  if (!user || normalizeRole(user.role) !== 'admin') {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
    return;
  }

  // Load time slots on page load
  const loadSlots = async () => {
    try {
      // TODO: Replace with actual API call
      // const res = await fetch('http://localhost:5000/api/time-slots');
      // const data = await res.json();
      // if (data.success) { renderSlots(data.data); }
      
      // For now, show placeholder message
      slotsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No time slots to display. Add a new slot to get started.</td></tr>';
    } catch (error) {
      console.error('Error loading slots:', error);
      slotsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading time slots.</td></tr>';
    }
  };

  const renderSlots = (slots) => {
    if (slots.length === 0) {
      slotsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No time slots found.</td></tr>';
      return;
    }

    slotsTableBody.innerHTML = slots.map(slot => `
      <tr>
        <td>${slot.id}</td>
        <td>${slot.name}</td>
        <td>${slot.start_time}</td>
        <td>${slot.end_time}</td>
        <td>${slot.days || 'All'}</td>
        <td>${slot.capacity}</td>
        <td><span class="status-badge ${slot.status}">${slot.status}</span></td>
        <td>
          <button class="btn-edit btn-sm" onclick="editSlot(${slot.id})">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteSlot(${slot.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  };

  // Handle form submission
  slotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const slotId = document.getElementById('slotId').value;
    const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
    const selectedDays = Array.from(checkboxes).map(cb => cb.value);
    
    const formData = {
      name: document.getElementById('slotName').value,
      start_time: document.getElementById('slotStartTime').value,
      end_time: document.getElementById('slotEndTime').value,
      days: selectedDays.join(','),
      capacity: document.getElementById('slotCapacity').value,
      status: document.getElementById('slotStatus').value,
    };

    try {
      // TODO: Replace with actual API call
      // const endpoint = slotId ? `/api/time-slots/${slotId}` : '/api/time-slots';
      // const method = slotId ? 'PUT' : 'POST';
      // const res = await fetch(`http://localhost:5000${endpoint}`, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // const data = await res.json();
      
      slotFormMessage.className = 'form-message success';
      slotFormMessage.textContent = 'Time slot saved successfully!';
      slotForm.reset();
      document.getElementById('slotId').value = '';
      
      loadSlots();
    } catch (error) {
      slotFormMessage.className = 'form-message error';
      slotFormMessage.textContent = `Error: ${error.message}`;
    }
  });

  // Cancel edit
  cancelEditBtn.addEventListener('click', () => {
    slotForm.reset();
    document.getElementById('slotId').value = '';
    cancelEditBtn.style.display = 'none';
    saveSlotBtn.textContent = 'Save Slot';
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
  });

  // Initial load
  loadSlots();
});

// Global functions for edit/delete
function editSlot(id) {
  // TODO: Fetch slot details and populate form
  console.log('Edit slot:', id);
}

function deleteSlot(id) {
  // TODO: Delete slot
  if (confirm('Are you sure you want to delete this time slot?')) {
    console.log('Delete slot:', id);
  }
}
