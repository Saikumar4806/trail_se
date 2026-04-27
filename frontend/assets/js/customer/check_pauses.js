// Demo data based on subscription_pauses table structure
const demoPauses = [
  {
    pause_id: 1,
    subscription_id: 101,
    pause_date: "2026-04-15",
    resume_date: "2026-04-20",
    reason: "On vacation",
    created_at: "2026-04-14T10:30:00Z"
  },
  {
    pause_id: 2,
    subscription_id: 101,
    pause_date: "2026-03-20",
    resume_date: "2026-03-25",
    reason: "Home renovation",
    created_at: "2026-03-19T08:15:00Z"
  },
  {
    pause_id: 3,
    subscription_id: 101,
    pause_date: "2026-02-10",
    resume_date: "2026-02-15",
    reason: "Medical reason",
    created_at: "2026-02-09T14:45:00Z"
  },
  {
    pause_id: 4,
    subscription_id: 101,
    pause_date: "2026-05-01",
    resume_date: null,
    reason: "Out of station",
    created_at: "2026-04-28T09:20:00Z"
  },
  {
    pause_id: 5,
    subscription_id: 101,
    pause_date: "2026-01-05",
    resume_date: "2026-01-12",
    reason: "Temporary hold",
    created_at: "2026-01-04T11:00:00Z"
  }
];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
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

const loadPauses = () => {
  const pausesTableBody = document.getElementById("pausesTableBody");
  const noPausesMessage = document.getElementById("noPausesMessage");

  if (!demoPauses || demoPauses.length === 0) {
    pausesTableBody.innerHTML = "";
    noPausesMessage.style.display = "block";
    updateStats([]);
    return;
  }

  noPausesMessage.style.display = "none";

  // Sort pauses by pause_date in descending order
  const sortedPauses = [...demoPauses].sort((a, b) => {
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

  updateStats(sortedPauses);
};

const updateStats = (pauses) => {
  // Total pauses
  const totalPausesEl = document.getElementById("totalPauses");
  totalPausesEl.textContent = pauses.length;

  // Active pauses
  const activePausesEl = document.getElementById("activePauses");
  const activePauses = pauses.filter((p) => getPauseStatus(p.pause_date, p.resume_date) === "Active");
  activePausesEl.textContent = activePauses.length;

  // Resumed pauses
  const resumedPausesEl = document.getElementById("resumedPauses");
  const resumedPauses = pauses.filter((p) => getPauseStatus(p.pause_date, p.resume_date) === "Resumed");
  resumedPausesEl.textContent = resumedPauses.length;

  // Total days paused
  const totalDaysPausedEl = document.getElementById("totalDaysPaused");
  const totalDays = pauses.reduce((sum, p) => {
    return sum + calculateDaysPaused(p.pause_date, p.resume_date);
  }, 0);
  totalDaysPausedEl.textContent = totalDays;
};

const setupLogout = () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
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
