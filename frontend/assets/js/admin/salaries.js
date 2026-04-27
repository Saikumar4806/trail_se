const SALARY_API_BASE_URL = "http://localhost:5000/api/admin/salaries";
const ADMIN_API_BASE_URL = "http://localhost:5000/api/admin";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

document.addEventListener("DOMContentLoaded", async () => {
  const salaryMonth = document.getElementById("salaryMonth");
  const salaryPartner = document.getElementById("salaryPartner");
  const calculateBtn = document.getElementById("calculateBtn");
  const generateReportBtn = document.getElementById("generateReportBtn");
  const approveAllBtn = document.getElementById("approveAllBtn");
  const payAllBtn = document.getElementById("payAllBtn");
  const downloadPayslipsBtn = document.getElementById("downloadPayslipsBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const filterMessage = document.getElementById("filterMessage");
  const paymentMessage = document.getElementById("paymentMessage");
  const salaryTableBody = document.getElementById("salaryTableBody");

  const statTotalPartners = document.getElementById("statTotalPartners");
  const statTotalDeliveries = document.getElementById("statTotalDeliveries");
  const statTotalSalary = document.getElementById("statTotalSalary");
  const statAverageSalary = document.getElementById("statAverageSalary");

  const adminUser = getStoredUser();
  if (!adminUser || normalizeRole(adminUser.role) !== "admin") {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  const adminHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-id": String(adminUser.id),
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  salaryMonth.value = currentMonth;

  let latestSalaries = [];

  const showMessage = (el, text, type = "info") => {
    el.className = `form-message ${type}`;
    el.textContent = text;
  };

  const clearMessage = (el) => {
    el.className = "form-message";
    el.textContent = "";
  };

  const renderSalaryTable = (salaries) => {
    if (!salaries.length) {
      salaryTableBody.innerHTML =
        '<tr><td colspan="10" class="text-center">No delivery partner salary data for this month.</td></tr>';
      return;
    }

    salaryTableBody.innerHTML = salaries
      .map(
        (salary) => `
      <tr>
        <td>${salary.partner_id}</td>
        <td>${salary.partner_name}</td>
        <td>${formatNumber(salary.total_deliveries)}</td>
        <td>${formatMoney(salary.base_rate)}</td>
        <td>${formatMoney(salary.base_salary)}</td>
        <td>${formatMoney(salary.bonus)}</td>
        <td>${formatMoney(salary.deductions)}</td>
        <td><strong>${formatMoney(salary.net_salary)}</strong></td>
        <td><span class="status-badge ${salary.status}">${salary.status}</span></td>
        <td>
          <button class="btn-edit btn-sm" onclick="editSalary(${salary.partner_id})">Edit</button>
          <button class="btn-secondary btn-sm" onclick="viewPayslip(${salary.partner_id})">View</button>
        </td>
      </tr>
    `
      )
      .join("");
  };

  const updateStats = (summary) => {
    statTotalPartners.textContent = formatNumber(summary.totalPartners);
    statTotalDeliveries.textContent = formatNumber(summary.totalDeliveries);
    statTotalSalary.textContent = formatMoney(summary.totalSalary);
    statAverageSalary.textContent = formatMoney(summary.averageSalary);
  };

  const loadPartnersList = async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/users/delivery-partners`, {
        method: "GET",
        headers: adminHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load delivery partners.");
      }

      const options = (Array.isArray(data.data) ? data.data : [])
        .map((p) => `<option value="${p.id}">${p.name} (#${p.id})</option>`)
        .join("");
      salaryPartner.innerHTML = '<option value="">All Partners</option>' + options;
    } catch (error) {
      console.error("Error loading partners list:", error);
      showMessage(filterMessage, error.message || "Failed to load delivery partners.", "error");
    }
  };

  const calculateSalaries = async () => {
    const month = salaryMonth.value;
    const partnerId = salaryPartner.value;

    if (!month) {
      showMessage(filterMessage, "Please select a month.", "error");
      return;
    }

    try {
      calculateBtn.disabled = true;
      calculateBtn.textContent = "Calculating...";
      clearMessage(filterMessage);

      const params = new URLSearchParams({ month });
      if (partnerId) params.set("partner_id", partnerId);

      const response = await fetch(`${SALARY_API_BASE_URL}/overview?${params.toString()}`, {
        method: "GET",
        headers: adminHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to calculate salaries.");
      }

      latestSalaries = Array.isArray(data.data.salaries) ? data.data.salaries : [];
      renderSalaryTable(latestSalaries);
      updateStats(data.data.summary);
      showMessage(filterMessage, `Salary calculation completed for ${month}.`, "success");
    } catch (error) {
      console.error("Calculate salaries error:", error);
      showMessage(filterMessage, error.message || "Failed to calculate salaries.", "error");
    } finally {
      calculateBtn.disabled = false;
      calculateBtn.textContent = "Calculate Salaries";
    }
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  generateReportBtn.addEventListener("click", () => {
    if (!latestSalaries.length) {
      showMessage(filterMessage, "No salary data available. Please calculate first.", "error");
      return;
    }
    const month = salaryMonth.value;
    const rows = [
      [
        "Partner ID",
        "Partner Name",
        "Total Deliveries",
        "Base Rate",
        "Base Salary",
        "Bonus",
        "Deductions",
        "Net Salary",
        "Status",
      ],
      ...latestSalaries.map((s) => [
        s.partner_id,
        s.partner_name,
        s.total_deliveries,
        s.base_rate,
        s.base_salary,
        s.bonus,
        s.deductions,
        s.net_salary,
        s.status,
      ]),
    ];
    downloadCsv(`salary-report-${month}.csv`, rows);
    showMessage(filterMessage, "Salary report downloaded.", "success");
  });

  approveAllBtn.addEventListener("click", async () => {
    try {
      const month = salaryMonth.value;
      const response = await fetch(`${SALARY_API_BASE_URL}/approve-all`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ month }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to approve salaries.");
      }
      showMessage(paymentMessage, data.message || "Salaries approved.", "success");
      await calculateSalaries();
    } catch (error) {
      console.error("Approve all salaries error:", error);
      showMessage(paymentMessage, error.message || "Failed to approve salaries.", "error");
    }
  });

  payAllBtn.addEventListener("click", async () => {
    try {
      const month = salaryMonth.value;
      const response = await fetch(`${SALARY_API_BASE_URL}/pay-all`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ month }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to mark salaries as paid.");
      }
      showMessage(paymentMessage, data.message || "Salaries marked as paid.", "success");
      await calculateSalaries();
    } catch (error) {
      console.error("Mark salaries paid error:", error);
      showMessage(paymentMessage, error.message || "Failed to mark salaries paid.", "error");
    }
  });

  downloadPayslipsBtn.addEventListener("click", () => {
    if (!latestSalaries.length) {
      showMessage(paymentMessage, "No salary data available. Please calculate first.", "error");
      return;
    }
    const month = salaryMonth.value;
    const rows = [
      ["Partner", "Month", "Deliveries", "Net Salary", "Status"],
      ...latestSalaries.map((s) => [
        `${s.partner_name} (#${s.partner_id})`,
        month,
        s.total_deliveries,
        s.net_salary,
        s.status,
      ]),
    ];
    downloadCsv(`payslips-${month}.csv`, rows);
    showMessage(paymentMessage, "Payslips file downloaded.", "success");
  });

  window.editSalary = async (partnerId) => {
    const salary = latestSalaries.find((row) => Number(row.partner_id) === Number(partnerId));
    if (!salary) return;

    const bonusInput = window.prompt("Enter bonus amount:", String(salary.bonus ?? 0));
    if (bonusInput === null) return;
    const deductionInput = window.prompt("Enter deduction amount:", String(salary.deductions ?? 0));
    if (deductionInput === null) return;

    const bonus = Number(bonusInput);
    const deductions = Number(deductionInput);
    if (Number.isNaN(bonus) || Number.isNaN(deductions) || bonus < 0 || deductions < 0) {
      showMessage(paymentMessage, "Bonus and deductions must be valid positive numbers.", "error");
      return;
    }

    try {
      const response = await fetch(`${SALARY_API_BASE_URL}/${partnerId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({
          month: salaryMonth.value,
          bonus,
          deductions,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update salary.");
      }
      showMessage(paymentMessage, data.message || "Salary updated.", "success");
      await calculateSalaries();
    } catch (error) {
      console.error("Edit salary error:", error);
      showMessage(paymentMessage, error.message || "Failed to update salary.", "error");
    }
  };

  window.viewPayslip = (partnerId) => {
    const salary = latestSalaries.find((row) => Number(row.partner_id) === Number(partnerId));
    if (!salary) return;
    const month = salaryMonth.value;
    const lines = [
      `Payslip - ${month}`,
      `Partner: ${salary.partner_name} (#${salary.partner_id})`,
      `Total Deliveries: ${salary.total_deliveries}`,
      `Base Salary: ${formatMoney(salary.base_salary)}`,
      `Bonus: ${formatMoney(salary.bonus)}`,
      `Deductions: ${formatMoney(salary.deductions)}`,
      `Net Salary: ${formatMoney(salary.net_salary)}`,
      `Status: ${salary.status}`,
    ];
    window.alert(lines.join("\n"));
  };

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  await loadPartnersList();
  await calculateSalaries();
});
