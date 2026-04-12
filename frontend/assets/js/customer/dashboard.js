const API_URL = "http://localhost:5000/api/dashboard/customer";

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, "_")
    : null;

  if (!user || normalizedRole !== "customer") {
    alert("Unauthorized access. Please login as a Customer.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  document.getElementById("welcomeText").textContent = `Welcome, ${user.name}`;

  // Handle logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../../pages/start/login.html";
  });

  // Handle Add Subscription button
  const addSubscriptionBtn = document.getElementById("addSubscriptionBtn");
  if (addSubscriptionBtn) {
    addSubscriptionBtn.addEventListener("click", () => {
      window.location.href = "./addSubscription.html";
    });
  }

  // Handle Edit buttons on subscription cards
  const editBtns = document.querySelectorAll(".edit-btn");
  editBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const subscriptionCard = e.target.closest(".subscription-card");
      const subscriptionName = subscriptionCard.querySelector(".subscription-header h4").textContent;
      alert(`Edit subscription: ${subscriptionName}\nFeature coming soon!`);
      // TODO: Implement edit subscription form/modal
    });
  });

  // Handle Cancel buttons on subscription cards
  const cancelBtns = document.querySelectorAll(".cancel-btn");
  cancelBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const subscriptionCard = e.target.closest(".subscription-card");
      const subscriptionName = subscriptionCard.querySelector(".subscription-header h4").textContent;
      
      if (confirm(`Are you sure you want to cancel this subscription: ${subscriptionName}?`)) {
        alert(`Subscription "${subscriptionName}" cancelled!\nFeature coming soon!`);
        // TODO: Implement cancel subscription API call
      }
    });
  });

  // Fetch dashboard data from API (optional, can be used later)
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("Dashboard data:", result.data);
      // TODO: Update subscription list with actual data from API
    }
  } catch (err) {
    console.error("Dashboard error:", err);
    // Demo data will be shown by default
  }
});
