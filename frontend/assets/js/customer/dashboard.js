const API_URL = "http://localhost:5000/api/subscriptions/user";
const PAUSE_API_BASE_URL = "http://localhost:5000/api/subscriptions";

let pauseDeadlineIntervalId = null;

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
    return "Tomorrow's order paused";
  }

  return subscription.status || "N/A";
};

const formatCountdownTime = (milliseconds) => {
  const clampedMs = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(clampedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getMillisecondsUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

const updatePauseDeadlineTimer = () => {
  const timerCard = document.getElementById("pauseDeadlineCard");
  const timerValue = document.getElementById("pauseDeadlineTime");
  if (!timerCard || !timerValue) return;

  const remainingMs = getMillisecondsUntilMidnight();
  const oneHourMs = 60 * 60 * 1000;

  timerValue.textContent = formatCountdownTime(remainingMs);
  timerCard.classList.toggle("urgent", remainingMs <= oneHourMs);
};

const startPauseDeadlineTimer = () => {
  updatePauseDeadlineTimer();

  if (pauseDeadlineIntervalId) {
    clearInterval(pauseDeadlineIntervalId);
  }

  pauseDeadlineIntervalId = setInterval(updatePauseDeadlineTimer, 1000);
};

window.addEventListener("beforeunload", () => {
  if (pauseDeadlineIntervalId) {
    clearInterval(pauseDeadlineIntervalId);
    pauseDeadlineIntervalId = null;
  }
});

const renderSubscriptions = (subscriptions) => {
  const container = document.getElementById("subscriptionsContainer");
  if (!container) return;

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    container.innerHTML = "<p>No subscriptions found.</p>";
    return;
  }

  container.innerHTML = subscriptions
    .map((subscription) => {
      const isPausedForTomorrow = Number(subscription.is_paused_today) === 1;
      const isCancelled = (subscription.status || "").toLowerCase() === "cancelled";
      const displayStatus = isPausedForTomorrow
        ? "Tomorrow paused"
        : (subscription.status || "N/A");

      const normalizedStatus = (isPausedForTomorrow
        ? "paused"
        : (subscription.status || "active")
      ).toLowerCase();

      const safeStatusClass = ["active", "paused", "cancelled"].includes(normalizedStatus)
        ? normalizedStatus
        : "active";

      const pauseAction = isPausedForTomorrow ? "unpause" : "pause";
      const pauseButtonClass = isPausedForTomorrow ? "unpause-btn" : "pause-btn";
      const isPauseDisabled = isCancelled;
      const pauseButtonLabel = isCancelled
        ? "Cancelled"
        : (isPausedForTomorrow ? "Unpause Tomorrow" : "Pause Tomorrow");

      return `
        <div class="subscription-card" data-subscription-id="${subscription.subscription_id}">
          <div class="subscription-header">
            <h4>${subscription.plan_type || "N/A"}</h4>
            <span class="subscription-status ${safeStatusClass}">${displayStatus}</span>
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
            <button class="${pauseButtonClass}" data-action="${pauseAction}" data-subscription-id="${subscription.subscription_id}" ${isPauseDisabled ? "disabled" : ""}>
              ${pauseButtonLabel}
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

  startPauseDeadlineTimer();

  const subscriptionsContainer = document.getElementById("subscriptionsContainer");
  if (subscriptionsContainer) {
    subscriptionsContainer.addEventListener("click", async (event) => {
      const actionBtn = event.target.closest(".pause-btn, .unpause-btn");
      if (!actionBtn || actionBtn.disabled) return;

      const subscriptionId = Number(actionBtn.getAttribute("data-subscription-id"));
      if (!subscriptionId || Number.isNaN(subscriptionId)) return;

      const actionType = actionBtn.getAttribute("data-action") || "pause";
      const endpointAction = actionType === "unpause" ? "unpause" : "pause";
      const loadingText = actionType === "unpause" ? "Unpausing..." : "Pausing...";
      const genericFailureText = actionType === "unpause"
        ? "Failed to unpause tomorrow's order."
        : "Failed to pause tomorrow's order.";

      const originalText = actionBtn.textContent;

      try {
        actionBtn.disabled = true;
        actionBtn.textContent = loadingText;

        const response = await fetch(`${PAUSE_API_BASE_URL}/${subscriptionId}/${endpointAction}`, {
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
        alert(error.message || genericFailureText);
        actionBtn.disabled = false;
        actionBtn.textContent = originalText;
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
