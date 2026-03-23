const API_URL = "http://localhost:5000/api/dashboard/partner";

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
      document.getElementById("statAssigned").textContent = result.data.stats.assignedDeliveries;
      document.getElementById("statCompleted").textContent = result.data.stats.completedToday;
    } else {
      document.getElementById("dashboardMessage").textContent = "Failed to load dashboard data.";
    }
  } catch (err) {
    console.error("Dashboard error:", err);
    document.getElementById("dashboardMessage").textContent = "Cannot connect to server.";
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });
});
