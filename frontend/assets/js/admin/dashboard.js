const API_URL = "http://localhost:5000/api/dashboard/admin";

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));

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


  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });
});
