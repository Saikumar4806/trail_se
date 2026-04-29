// Delivery Partner Profile Management
const PROFILE_API_BASE = "http://localhost:5000/api/auth/profile";

document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  const statusMessage = document.getElementById("statusMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = JSON.parse(sessionStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/\s+/g, "_")
    : null;

  if (!user || !user.id || normalizedRole !== "delivery_partner") {
    alert("Unauthorized access. Please login as a Delivery Partner.");
    window.location.href = "../start/login.html";
    return;
  }

  // Load profile data
  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profileEmail").value = user.email || "";
  document.getElementById("profilePhone").value = user.phone || "";

  // Handle Logout
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "../start/login.html";
  });

  // Cancel button - reset form to original values
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("profileName").value = user.name || "";
      document.getElementById("profileEmail").value = user.email || "";
      document.getElementById("profilePhone").value = user.phone || "";
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      statusMessage.textContent = "";
      statusMessage.className = "status-message";
      statusMessage.style.display = "none";
    });
  }

  // Handle Form Submission
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    const payload = { name, email, phone };
    if (newPassword) {
      if (!currentPassword) {
        showStatus("Current password is required to change password", "error");
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      const response = await fetch(`${PROFILE_API_BASE}/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id)
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showStatus("Profile updated successfully!", "success");
        // Update local storage
        const updatedUser = { ...user, ...result.data };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Clear password fields
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
      } else {
        showStatus(result.message || "Failed to update profile", "error");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      showStatus("Network error. Please try again.", "error");
    }
  });

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 5000);
  }
});
