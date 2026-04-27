const SALARY_API_BASE_URL = "http://localhost:5000/api/admin/salaries";

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
  const analyticsMonth = document.getElementById("analyticsMonth");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const downloadFinanceReportBtn = document.getElementById("downloadFinanceReportBtn");
  const analyticsMessage = document.getElementById("analyticsMessage");
  const financeTableBody = document.getElementById("financeTableBody");
  const logoutBtn = document.getElementById("logoutBtn");

  const statSubscriptionRevenue = document.getElementById("statSubscriptionRevenue");
  const statSalaryExpense = document.getElementById("statSalaryExpense");
  const statGrossProfit = document.getElementById("statGrossProfit");
  const statProfitMargin = document.getElementById("statProfitMargin");
  const statPayoutRatio = document.getElementById("statPayoutRatio");
  const statRevenuePerDelivery = document.getElementById("statRevenuePerDelivery");
  const statCostPerDelivery = document.getElementById("statCostPerDelivery");
  const statTotalDeliveries = document.getElementById("statTotalDeliveries");

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

  analyticsMonth.value = new Date().toISOString().slice(0, 7);
  let latestResult = null;

  const showMessage = (text, type = "info") => {
    analyticsMessage.className = `form-message ${type}`;
    analyticsMessage.textContent = text;
  };

  const clearMessage = () => {
    analyticsMessage.className = "form-message";
    analyticsMessage.textContent = "";
  };

  const renderTopPayouts = (salaries) => {
    const topRows = [...salaries]
      .sort((a, b) => Number(b.net_salary || 0) - Number(a.net_salary || 0))
      .slice(0, 10);

    if (!topRows.length) {
      financeTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center">No payout data found for this month.</td></tr>';
      return;
    }

    financeTableBody.innerHTML = topRows
      .map(
        (row) => `
      <tr>
        <td>${row.partner_id}</td>
        <td>${row.partner_name}</td>
        <td>${formatNumber(row.total_deliveries)}</td>
        <td>${formatMoney(row.net_salary)}</td>
        <td><span class="status-badge ${row.status}">${row.status}</span></td>
      </tr>
    `
      )
      .join("");
  };

  const updateFinanceStats = (finance, summary) => {
    statSubscriptionRevenue.textContent = formatMoney(finance.subscriptionRevenue);
    statSalaryExpense.textContent = formatMoney(finance.salaryExpense);
    statGrossProfit.textContent = formatMoney(finance.grossProfit);
    statProfitMargin.textContent = `${Number(finance.profitMargin || 0).toFixed(2)}%`;
    statPayoutRatio.textContent = `${Number(finance.payoutRatio || 0).toFixed(2)}%`;
    statRevenuePerDelivery.textContent = formatMoney(finance.avgRevenuePerDelivery);
    statCostPerDelivery.textContent = formatMoney(finance.costPerDelivery);
    statTotalDeliveries.textContent = formatNumber(summary.totalDeliveries);
  };

  const analyzeFinance = async () => {
    const month = analyticsMonth.value;
    if (!month) {
      showMessage("Please select a month.", "error");
      return;
    }

    try {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Analyzing...";
      clearMessage();

      const response = await fetch(
        `${SALARY_API_BASE_URL}/overview?${new URLSearchParams({ month }).toString()}`,
        { method: "GET", headers: adminHeaders() }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load profit analytics.");
      }

      latestResult = data.data;
      updateFinanceStats(data.data.finance, data.data.summary);
      renderTopPayouts(Array.isArray(data.data.salaries) ? data.data.salaries : []);
      showMessage(`Profit analytics loaded for ${month}.`, "success");
    } catch (error) {
      console.error("Profit analytics error:", error);
      showMessage(error.message || "Failed to load profit analytics.", "error");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analyze Profit";
    }
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  downloadFinanceReportBtn.addEventListener("click", () => {
    if (!latestResult) {
      showMessage("No analytics data available. Please analyze first.", "error");
      return;
    }

    const month = analyticsMonth.value;
    const rows = [
      ["Metric", "Value"],
      ["Month", month],
      ["Subscription Revenue", latestResult.finance.subscriptionRevenue],
      ["Delivery Operating Cost", latestResult.finance.salaryExpense],
      ["Gross Profit", latestResult.finance.grossProfit],
      ["Profit Margin (%)", latestResult.finance.profitMargin],
      ["Payout Ratio (%)", latestResult.finance.payoutRatio],
      ["Revenue Per Delivery", latestResult.finance.avgRevenuePerDelivery],
      ["Salary Cost Per Delivery", latestResult.finance.costPerDelivery],
      ["Total Deliveries", latestResult.summary.totalDeliveries],
      ["Total Delivery Partners", latestResult.summary.totalPartners],
    ];

    downloadCsv(`profit-analytics-${month}.csv`, rows);
    showMessage("Finance report downloaded.", "success");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  analyzeBtn.addEventListener("click", analyzeFinance);
  await analyzeFinance();
});
