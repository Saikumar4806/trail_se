// Salary Calculation Management
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
  const salaryMonth = document.getElementById('salaryMonth');
  const salaryPartner = document.getElementById('salaryPartner');
  const calculateBtn = document.getElementById('calculateBtn');
  const generateReportBtn = document.getElementById('generateReportBtn');
  const approveAllBtn = document.getElementById('approveAllBtn');
  const payAllBtn = document.getElementById('payAllBtn');
  const downloadPayslipsBtn = document.getElementById('downloadPayslipsBtn');
  
  const filterMessage = document.getElementById('filterMessage');
  const paymentMessage = document.getElementById('paymentMessage');
  const salaryTableBody = document.getElementById('salaryTableBody');
  
  const statTotalPartners = document.getElementById('statTotalPartners');
  const statTotalDeliveries = document.getElementById('statTotalDeliveries');
  const statTotalSalary = document.getElementById('statTotalSalary');
  const statAverageSalary = document.getElementById('statAverageSalary');
  
  const logoutBtn = document.getElementById('logoutBtn');

  // Check user authentication
  const user = getStoredUser();
  if (!user || normalizeRole(user.role) !== 'admin') {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
    return;
  }

  // Set current month
  const today = new Date();
  const currentMonth = today.toISOString().substring(0, 7);
  salaryMonth.value = currentMonth;

  // Load delivery partners for dropdown
  const loadPartnersList = async () => {
    try {
      // TODO: Replace with actual API call
      // const res = await fetch('http://localhost:5000/api/delivery-partners');
      // const data = await res.json();
      // if (data.success) {
      //   const options = data.data.map(p => `<option value="${p.id}">${p.name}</option>`);
      //   salaryPartner.innerHTML = '<option value="">All Partners</option>' + options.join('');
      // }
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  // Calculate salaries for selected month/partner
  const calculateSalaries = async () => {
    const month = salaryMonth.value;
    const partnerId = salaryPartner.value;

    if (!month) {
      filterMessage.className = 'form-message error';
      filterMessage.textContent = 'Please select a month.';
      return;
    }

    try {
      // TODO: Replace with actual API call
      // const res = await fetch(`http://localhost:5000/api/salaries/calculate?month=${month}&partner_id=${partnerId || ''}`);
      // const data = await res.json();
      
      // Update stats
      statTotalPartners.textContent = '5'; // Placeholder
      statTotalDeliveries.textContent = '150'; // Placeholder
      statTotalSalary.textContent = '₹15,000.00'; // Placeholder
      statAverageSalary.textContent = '₹3,000.00'; // Placeholder

      // Render salary table
      renderSalaryTable([
        {
          partner_id: 1,
          partner_name: 'Partner 1',
          total_deliveries: 30,
          base_rate: 100,
          base_salary: 3000,
          bonus: 500,
          deductions: 200,
          net_salary: 3300,
          status: 'pending'
        }
      ]);

      filterMessage.className = 'form-message success';
      filterMessage.textContent = `Salaries calculated for ${month}`;
    } catch (error) {
      filterMessage.className = 'form-message error';
      filterMessage.textContent = `Error: ${error.message}`;
    }
  };

  const renderSalaryTable = (salaries) => {
    if (salaries.length === 0) {
      salaryTableBody.innerHTML = '<tr><td colspan="10" class="text-center">No salary data available.</td></tr>';
      return;
    }

    salaryTableBody.innerHTML = salaries.map(salary => `
      <tr>
        <td>${salary.partner_id}</td>
        <td>${salary.partner_name}</td>
        <td>${salary.total_deliveries}</td>
        <td>₹${salary.base_rate}</td>
        <td>₹${parseFloat(salary.base_salary).toFixed(2)}</td>
        <td>₹${parseFloat(salary.bonus).toFixed(2)}</td>
        <td>₹${parseFloat(salary.deductions).toFixed(2)}</td>
        <td><strong>₹${parseFloat(salary.net_salary).toFixed(2)}</strong></td>
        <td><span class="status-badge ${salary.status}">${salary.status}</span></td>
        <td>
          <button class="btn-edit btn-sm" onclick="editSalary(${salary.partner_id})">Edit</button>
          <button class="btn-secondary btn-sm" onclick="viewPayslip(${salary.partner_id})">View</button>
        </td>
      </tr>
    `).join('');
  };

  // Event listeners
  calculateBtn.addEventListener('click', calculateSalaries);

  generateReportBtn.addEventListener('click', async () => {
    try {
      // TODO: Generate and download salary report
      filterMessage.className = 'form-message success';
      filterMessage.textContent = 'Report generated successfully!';
    } catch (error) {
      filterMessage.className = 'form-message error';
      filterMessage.textContent = `Error: ${error.message}`;
    }
  });

  approveAllBtn.addEventListener('click', async () => {
    try {
      // TODO: Approve all salaries for selected month
      paymentMessage.className = 'form-message success';
      paymentMessage.textContent = 'All salaries approved!';
    } catch (error) {
      paymentMessage.className = 'form-message error';
      paymentMessage.textContent = `Error: ${error.message}`;
    }
  });

  payAllBtn.addEventListener('click', async () => {
    try {
      // TODO: Mark all salaries as paid
      paymentMessage.className = 'form-message success';
      paymentMessage.textContent = 'All salaries marked as paid!';
    } catch (error) {
      paymentMessage.className = 'form-message error';
      paymentMessage.textContent = `Error: ${error.message}`;
    }
  });

  downloadPayslipsBtn.addEventListener('click', async () => {
    try {
      // TODO: Download payslips as PDF/Excel
      paymentMessage.className = 'form-message success';
      paymentMessage.textContent = 'Payslips downloaded successfully!';
    } catch (error) {
      paymentMessage.className = 'form-message error';
      paymentMessage.textContent = `Error: ${error.message}`;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../../pages/start/login.html';
  });

  // Initial load
  loadPartnersList();
});

// Global functions
function editSalary(partnerId) {
  // TODO: Edit salary details and deductions
  console.log('Edit salary for partner:', partnerId);
}

function viewPayslip(partnerId) {
  // TODO: View/print payslip
  console.log('View payslip for partner:', partnerId);
}
