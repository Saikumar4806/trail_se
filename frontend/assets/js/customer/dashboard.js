const API_URL = "http://localhost:5000/api/subscriptions/user";
const PAUSE_API_BASE_URL = "http://localhost:5000/api/subscriptions";

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toISOString().split("T")[0];
};

const formatPrice = (priceValue) => {
  const numericPrice = Number(priceValue);
  if (Number.isNaN(numericPrice)) return "N/A";
  return `Rs. ${numericPrice.toFixed(2)}`;
};

const getStatusLabel = (subscription) => {
  if (Number(subscription.is_paused_today) === 1) {
    return "Paused for today";
  }

  return subscription.status || "N/A";
};

const renderSubscriptions = (subscriptions) => {
  const container = document.getElementById("subscriptionsContainer");
  if (!container) return;

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    container.innerHTML = "<p>No subscriptions found.</p>";
    return;
  }

  container.innerHTML = subscriptions
    .map((subscription) => {
      const status = (subscription.status || "active").toLowerCase();
      const safeStatusClass = ["active", "paused", "cancelled"].includes(status)
        ? status
        : "active";

      const isPausedToday = Number(subscription.is_paused_today) === 1;

      return `
        <div class="subscription-card" data-subscription-id="${subscription.subscription_id}">
          <div class="subscription-header">
            <h4>${subscription.plan_type || "N/A"}</h4>
            <span class="subscription-status ${safeStatusClass}">${subscription.status || "N/A"}</span>
          </div>
          <div class="subscription-details">
            <p><strong>Plan Type:</strong> ${subscription.plan_type || "N/A"}</p>
            <p><strong>Start Date:</strong> ${formatDate(subscription.start_date)}</p>
            <p><strong>End Date:</strong> ${formatDate(subscription.end_date)}</p>
            <p><strong>Status:</strong> ${getStatusLabel(subscription)}</p>
            <p><strong>Pause Count:</strong> ${Number(subscription.pause_count ?? 0)}</p>
            <p><strong>Total Price:</strong> ${formatPrice(subscription.total_price)}</p>
          </div>
          <div class="subscription-actions">
            <button class="pause-btn" data-subscription-id="${subscription.subscription_id}" ${isPausedToday ? "disabled" : ""}>
              ${isPausedToday ? "Paused for today" : "Pause"}
            </button>
            <button class="edit-btn" data-subscription-id="${subscription.subscription_id}">Edit</button>
            <button class="track-btn" onclick="window.location.href='./tracking.html?subscription_id=${subscription.subscription_id}'">🗺️ Track</button>
          </div>
        </div>
      `;
    })
    .join("");
};

const fetchAndRenderSubscriptions = async (userId) => {
  const response = await fetch(`${API_URL}?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch subscriptions");
  }

  renderSubscriptions(result.data || []);
};

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

  const subscriptionsContainer = document.getElementById("subscriptionsContainer");
  if (subscriptionsContainer) {
    subscriptionsContainer.addEventListener("click", async (event) => {
      const pauseBtn = event.target.closest(".pause-btn");
      if (!pauseBtn || pauseBtn.disabled) return;

      const subscriptionId = Number(pauseBtn.getAttribute("data-subscription-id"));
      if (!subscriptionId || Number.isNaN(subscriptionId)) return;

      const originalText = pauseBtn.textContent;

      try {
        pauseBtn.disabled = true;
        pauseBtn.textContent = "Pausing...";

        const response = await fetch(`${PAUSE_API_BASE_URL}/${subscriptionId}/pause`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to pause subscription");
        }

        await fetchAndRenderSubscriptions(user.id);
      } catch (error) {
        console.error("Pause subscription error:", error);
        alert(error.message || "Failed to pause subscription for today.");
        pauseBtn.disabled = false;
        pauseBtn.textContent = originalText;
      }
    });
  }

  try {
    await fetchAndRenderSubscriptions(user.id);
  } catch (err) {
    console.error("Subscriptions fetch error:", err);
    renderSubscriptions([]);
  }
});
