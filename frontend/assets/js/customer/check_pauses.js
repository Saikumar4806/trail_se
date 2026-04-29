const API_BASE_URL = "http://localhost:5000/api/subscriptions";

// Map plan types to maximum pauses allowed
const getPausesByPlan = (planType) => {
  const pauseLimits = {
    "weekly": 1,
    "1_month": 4,
    "3_months": 15,
    "yearly": 50
  };
  
  const normalizedPlan = planType ? String(planType).toLowerCase().replace(/ /g, "_") : "weekly";
  return pauseLimits[normalizedPlan] || 1;
};

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
};

const getSubscriptionIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("subscription_id"));
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const calculateDaysPaused = (pauseDate, resumeDate) => {
  if (!pauseDate) return 0;

  const start = new Date(pauseDate);
  const end = resumeDate ? new Date(resumeDate) : new Date();

  if (isNaN(start.getTime())) return 0;
  if (resumeDate && isNaN(end.getTime())) return 0;

  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const getPauseStatus = (pauseDate, resumeDate) => {
  if (!pauseDate) return "Unknown";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(pauseDate);
  start.setHours(0, 0, 0, 0);

  if (resumeDate) {
    const end = new Date(resumeDate);
    end.setHours(0, 0, 0, 0);

    if (today > end) {
      return "Resumed";
    }
  }

  if (today >= start) {
    return "Active";
  }

  return "Upcoming";
};

const loadPauses = async () => {
  const subscriptionId = getSubscriptionIdFromUrl();
  const pausesTableBody = document.getElementById("pausesTableBody");
  const noPausesMessage = document.getElementById("noPausesMessage");

  if (!subscriptionId || isNaN(subscriptionId)) {
    pausesTableBody.innerHTML = "";
    noPausesMessage.style.display = "block";
    noPausesMessage.innerHTML = "<p>No pauses till now</p>";
    updateStats([], 0, 0);
    return;
  }

  try {
    // Fetch pauses
    const pausesResponse = await fetch(`${API_BASE_URL}/${subscriptionId}/pauses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const pausesResult = await pausesResponse.json();

    if (!pausesResponse.ok || !pausesResult.success) {
      throw new Error(pausesResult.message || "Failed to fetch pauses");
    }

    // Fetch subscription details
    const user = getStoredUser();
    const subsResponse = await fetch(`${API_BASE_URL}/user?user_id=${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const subsResult = await subsResponse.json();
    
    if (!subsResponse.ok || !subsResult.success) {
      throw new Error(subsResult.message || "Failed to fetch subscription details");
    }

    const subscriptions = subsResult.data || [];
    const currentSubscription = subscriptions.find(s => s.subscription_id === subscriptionId);

    if (!currentSubscription) {
      throw new Error("Subscription not found");
    }

    const pauses = pausesResult.data || [];
    const pauseCount = Number(currentSubscription.pause_count || 0);
    const planType = currentSubscription.plan_type;

    if (!pauses || pauses.length === 0) {
      pausesTableBody.innerHTML = "";
      noPausesMessage.style.display = "block";
      noPausesMessage.innerHTML = "<p>No pauses till now</p>";
      updateStats([], pauseCount, planType);
      return;
    }

    noPausesMessage.style.display = "none";

    // Sort pauses by pause_date in descending order
    const sortedPauses = [...pauses].sort((a, b) => {
      return new Date(b.pause_date) - new Date(a.pause_date);
    });

    pausesTableBody.innerHTML = sortedPauses.map((pause) => {
      const daysPaused = calculateDaysPaused(pause.pause_date, pause.resume_date);
      const status = getPauseStatus(pause.pause_date, pause.resume_date);
      const statusClass = status === "Active" ? "active" : "resumed";

      return `
        <tr>
          <td>#${pause.pause_id}</td>
          <td class="pause-date">${formatDate(pause.pause_date)}</td>
          <td class="resume-date ${status === "Active" ? "active" : ""}">
            ${pause.resume_date ? formatDate(pause.resume_date) : "Ongoing"}
          </td>
          <td class="days-paused">${daysPaused} days</td>
          <td class="pause-reason">${pause.reason || "N/A"}</td>
          <td>
            <span class="pause-status ${statusClass}">
              ${status}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    updateStats(sortedPauses, pauseCount, planType);
  } catch (error) {
    console.error("Load pauses error:", error);
    pausesTableBody.innerHTML = "";
    noPausesMessage.style.display = "block";
    noPausesMessage.innerHTML = "<p>Failed to load pauses. Please try again.</p>";
    updateStats([], 0, 0);
  }
};

const updateStats = (pauses, pauseCount, planType) => {
  // Calculate max pauses based on plan
  const maxPauses = getPausesByPlan(planType);
  const pausesDone = Number(pauseCount || 0);
  const pausesLeft = Math.max(0, maxPauses - pausesDone);

  // How many you can do (based on plan)
  const canDoEl = document.getElementById("totalPauses");
  canDoEl.textContent = maxPauses;

  // How many you did (pause_count from subscription)
  const didEl = document.getElementById("completedPauses");
  didEl.textContent = pausesDone;

  // How many left (can do - did)
  const leftEl = document.getElementById("remainingPauses");
  leftEl.textContent = pausesLeft;
};

const setupLogout = () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("user");
      window.location.href = "../../pages/start/login.html";
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const user = getStoredUser();

  // Check if user is logged in
  if (!user) {
    window.location.href = "../../pages/start/login.html";
    return;
  }

  // Load and display pauses
  loadPauses();

  // Setup logout button
  setupLogout();
});

