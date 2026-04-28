const API_URL = "http://localhost:5000/api/dashboard/admin";
const GENERATE_DEMO_ORDERS_URL = "http://localhost:5000/api/admin/orders/generate-today-demo-orders";

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(sessionStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, "_")
    : null;

  if (!user || normalizedRole !== "admin") {
    alert("Unauthorized access. Please login as an Admin.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  document.getElementById("welcomeText").textContent = `Admin Dashboard - ${user.name}`;

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      document.getElementById("dashboardMessage").textContent = result.data.message;
      document.getElementById("statUsers").textContent = result.data.stats.totalUsers;
      document.getElementById("statPartners").textContent = result.data.stats.activePartners;
      document.getElementById("statOrders").textContent = result.data.stats.todaysOrders;
    } else {
      document.getElementById("dashboardMessage").textContent = "Failed to load dashboard data.";
    }
  } catch (err) {
    console.error("Dashboard error:", err);
    document.getElementById("dashboardMessage").textContent = "Cannot connect to server.";
  }

  const generateDemoOrdersBtn = document.getElementById("generateDemoOrdersBtn");
  const generateDemoOrdersMsg = document.getElementById("generateDemoOrdersMsg");

  if (generateDemoOrdersBtn && generateDemoOrdersMsg) {
    generateDemoOrdersBtn.addEventListener("click", async () => {
      const originalText = generateDemoOrdersBtn.textContent;
      generateDemoOrdersBtn.disabled = true;
      generateDemoOrdersBtn.textContent = "Generating...";
      generateDemoOrdersMsg.textContent = "";
      generateDemoOrdersMsg.className = "form-message";

      try {
        const response = await fetch(GENERATE_DEMO_ORDERS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to generate today demo orders.");
        }

        const insertedCount = Number(result.data?.insertedCount ?? 0);
        generateDemoOrdersMsg.textContent = `Generated ${insertedCount} demo orders for today.`;
        generateDemoOrdersMsg.className = "form-message success-msg";
      } catch (error) {
        console.error("Generate demo orders error:", error);
        generateDemoOrdersMsg.textContent = error.message || "Failed to generate today demo orders.";
        generateDemoOrdersMsg.className = "form-message error-msg";
      } finally {
        generateDemoOrdersBtn.disabled = false;
        generateDemoOrdersBtn.textContent = originalText;
      }
    });
  }

  const viewOrdersBtn = document.getElementById("viewOrdersBtn");
  if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener("click", () => {
      window.location.href = "orders.html";
    });
  }


  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });
});

